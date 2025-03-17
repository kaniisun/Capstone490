// supabase/functions/chat/index.js
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Configuration, OpenAIApi } from "https://esm.sh/openai@3.1.0";

// Initialize OpenAI
const configuration = new Configuration({
  apiKey: Deno.env.get("OPENAI_API_KEY"),
});
const openai = new OpenAIApi(configuration);

// CORS headers - IMPORTANT for local development
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { messages, userId } = await req.json();

    // Create Supabase client
    const supabaseUrl = Deno.env.get("DB_URL");
    const supabaseKey = Deno.env.get("DB_SERVICE_ROLE_KEY");
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Process the user's intent - searching or listing
    const userMessage = messages[messages.length - 1].content.toLowerCase();

    // Create system message with context
    const systemMessage = {
      role: "system",
      content: `You are a helpful assistant for a student marketplace. 
      You can help users search for products or list items for sale.
      When users want to search, extract key details and respond with relevant listings.
      When users want to list an item, collect all necessary information like title, description, price, condition.`,
    };

    // Prepare conversation history for OpenAI
    const conversationHistory = [
      systemMessage,
      ...messages.slice(-10), // Send only the last 10 messages for context
    ];

    // Determine if user is searching or listing
    let aiResponse;

    if (
      userMessage.includes("need") ||
      userMessage.includes("looking for") ||
      userMessage.includes("search")
    ) {
      // User is searching for products
      const searchResults = await searchProducts(supabase, userMessage);

      // Add search results to the AI context
      const searchContext = {
        role: "system",
        content: `Here are relevant products from the database: ${JSON.stringify(
          searchResults
        )}`,
      };

      // Get AI response with search results
      aiResponse = await getAIResponse([...conversationHistory, searchContext]);
    } else if (
      userMessage.includes("sell") ||
      userMessage.includes("list") ||
      userMessage.includes("listing")
    ) {
      // User wants to list an item
      aiResponse = await getAIResponse(conversationHistory);

      // Extract product details from conversation
      const extractedProduct = extractProductDetails(conversationHistory);

      if (extractedProduct.isComplete) {
        // Save the product to database
        const { data, error } = await supabase
          .from("products")
          .insert({
            userID: userId,
            name: extractedProduct.title,
            description: extractedProduct.description,
            price: extractedProduct.price,
            category: extractedProduct.category,
            condition: extractedProduct.condition,
            image: extractedProduct.imageUrl || "",
            status: "available",
            is_bundle: false,
            flag: false,
            created_at: new Date(),
            modified_at: new Date(),
          })
          .select();

        if (error) {
          console.error("Error creating listing:", error);
          // Update AI response to indicate error
          aiResponse.content +=
            "\n\nThere was an error creating your listing. Please try again.";
        } else {
          // Update AI response to confirm listing was created
          aiResponse.content +=
            "\n\nGreat! I've created your listing for: " +
            extractedProduct.title;
        }
      } else {
        // Product information is incomplete, ask for missing fields
        aiResponse.content +=
          "\n\nTo complete your listing, I still need: " +
          extractedProduct.missingFields.join(", ");
      }
    } else {
      // General conversation
      aiResponse = await getAIResponse(conversationHistory);
    }

    // Return successful response with CORS headers
    return new Response(JSON.stringify({ message: aiResponse }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);

    // Return error response with CORS headers
    return new Response(
      JSON.stringify({
        error: "An error occurred while processing your request",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

// Function to search products in Supabase
async function searchProducts(supabase, query) {
  // Extract key terms from the query
  const terms = query
    .split(" ")
    .filter((word) => word.length > 3) // Filter out short words
    .map((word) => word.toLowerCase());

  // Basic search implementation
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .filter("status", "eq", "available")
    .or(
      `name.ilike.%${terms.join("%")}%,description.ilike.%${terms.join("%")}%`
    );

  if (error) {
    console.error("Supabase search error:", error);
    return [];
  }

  return data || [];
}

// Function to get AI response
async function getAIResponse(messages) {
  try {
    const completion = await openai.createChatCompletion({
      model: "gpt-3.5-turbo",
      messages: messages,
      max_tokens: 500,
    });

    return {
      role: "assistant",
      content: completion.data.choices[0].message.content,
    };
  } catch (error) {
    console.error("OpenAI API error:", error);
    return {
      role: "assistant",
      content: "Sorry, I encountered an issue while processing your request.",
    };
  }
}

// Function to extract product details from conversation
function extractProductDetails(messages) {
  const requiredFields = [
    "title",
    "description",
    "price",
    "category",
    "condition",
  ];
  const product = {
    title: null,
    description: null,
    price: null,
    category: null,
    condition: null,
    imageUrl: "",
    isComplete: false,
    missingFields: [],
  };

  // Look through last few messages for product details
  const userMessages = messages
    .filter((msg) => msg.role === "user")
    .map((msg) => msg.content.toLowerCase());

  // Simple extraction logic - would be more robust with NLP/AI
  userMessages.forEach((content) => {
    // Extract title (anything after "title:", "selling", "listing" etc.)
    if (
      !product.title &&
      (content.includes("title:") ||
        content.includes("selling") ||
        content.includes("listing"))
    ) {
      const titleMatch = content.match(
        /(?:title:|selling|listing)\s+([^\.]+)/i
      );
      if (titleMatch && titleMatch[1]) product.title = titleMatch[1].trim();
    }

    // Extract price
    if (
      !product.price &&
      (content.includes("$") || content.includes("price:"))
    ) {
      const priceMatch = content.match(
        /\$\s*(\d+(?:\.\d{2})?)|price:\s*(\d+(?:\.\d{2})?)/i
      );
      if (priceMatch)
        product.price = parseFloat(priceMatch[1] || priceMatch[2]);
    }

    // Extract other fields
    if (!product.description && content.includes("description:")) {
      const descMatch = content.match(/description:\s+([^\.]+)/i);
      if (descMatch) product.description = descMatch[1].trim();
    }

    if (!product.category && content.includes("category:")) {
      const categoryMatch = content.match(/category:\s+([^\.]+)/i);
      if (categoryMatch) product.category = categoryMatch[1].trim();
    }

    if (!product.condition && content.includes("condition:")) {
      const conditionMatch = content.match(/condition:\s+([^\.]+)/i);
      if (conditionMatch) product.condition = conditionMatch[1].trim();
    }
  });

  // Check which fields are missing
  product.missingFields = requiredFields.filter((field) => !product[field]);
  product.isComplete = product.missingFields.length === 0;

  return product;
}
