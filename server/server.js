const express = require("express");
const cors = require("cors");
const { OpenAI } = require("openai");
const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

// Import utility modules
const {
  normalizeTerms,
  extractPriceFilter,
  formatPriceFilter,
} = require("./utils/search-utils");
const {
  extractSearchTerms,
  isProductSearchQuery,
} = require("./utils/term-utils");
const {
  verifySearchMatch,
  determineSearchResponse,
} = require("./utils/verification");
const { searchProducts } = require("./utils/product-search");

// Global product term mappings are now moved to term-utils.js

const app = express();
app.use(cors());
app.use(express.json());

// Configuration constants
const STRICT_MODE = true; // Set to true to prevent ANY hallucination possibility
const ENABLE_VERIFICATION = true; // Enable verification

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Initialize Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Add a simple test endpoint
app.get("/api/test", (req, res) => {
  res.json({
    message: "Server is working!",
    timestamp: new Date().toISOString(),
  });
});

// Add a database diagnostic endpoint
app.get("/api/db-test", async (req, res) => {
  try {
    // Test basic connection with a count query
    const { count, error: countError } = await supabase
      .from("products")
      .select("*", { count: "exact", head: true });

    if (countError) {
      return res.status(500).json({
        success: false,
        message: "Database connection error",
        error: countError,
      });
    }

    // Get a few sample products
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .limit(3);

    if (error) {
      return res.status(500).json({
        success: false,
        message: "Failed to fetch sample products",
        error: error,
      });
    }

    res.json({
      success: true,
      message: "Database connection successful",
      totalProducts: count,
      sampleProducts: data || [],
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error testing database connection",
      error: error.message,
    });
  }
});

/**
 * Get AI response from OpenAI
 */
async function getAIResponse(messages) {
  try {
    // Validate input
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return {
        role: "assistant",
        content: "I'm sorry, there was an issue with the message format.",
      };
    }

    // Validate API key
    if (!process.env.OPENAI_API_KEY) {
      return {
        role: "assistant",
        content:
          "I'm sorry, there's a configuration issue with the AI service.",
      };
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: messages,
      temperature: 0.7,
    });

    if (!completion || !completion.choices || !completion.choices[0]) {
      throw new Error("Invalid response structure from OpenAI API");
    }

    return completion.choices[0].message;
  } catch (error) {
    return {
      role: "assistant",
      content:
        "I'm sorry, I'm having trouble processing your request right now. Please try again later.",
    };
  }
}

/**
 * Extract product details from conversation
 */
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

  // Extract product details from messages
  userMessages.forEach((content) => {
    // Extract title
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

// Main chat endpoint
app.post("/api/chat", async (req, res) => {
  try {
    const { messages, userId } = req.body;

    // Process the user's intent - searching or listing
    const userMessage = messages[messages.length - 1].content.toLowerCase();

    // Check if query contains a price filter
    const priceFilter = extractPriceFilter(userMessage);

    // Create system message with context - enhanced with stricter instructions
    const systemMessage = {
      role: "system",
      content: `You are a helpful assistant for a student marketplace. 
      You can help users search for products or list items for sale.
      When users want to search, extract key details and respond with relevant listings.
      When users want to list an item, collect all necessary information like title, description, price, condition.
      
      VERIFICATION SYSTEM:
      1. You must ONLY discuss products that are specifically found in the database.
      2. Every product mentioned MUST have a verification code [VPxxx].
      3. Never make up or hallucinate products that don't have verification codes.
      4. If you're uncertain about a product, DO NOT mention it.
      5. When referring to products, use EXACTLY the names provided in the verified data.
      
      RESPONSE FORMAT:
      - When showing products, always include their verification codes.
      - Always wrap product listings in the VERIFIED_PRODUCTS_START and VERIFIED_PRODUCTS_END markers.
      - For any product info that isn't explicitly verified, say "I don't have that information" rather than making it up.
      
      Remember: It's better to provide less information that is verified than more information that might be wrong.`,
    };

    // Prepare conversation history for OpenAI
    const conversationHistory = [
      systemMessage,
      ...messages.slice(-10), // Send only the last 10 messages for context
    ];

    // Determine if user is searching or listing
    let aiResponse;

    // Check if this is a product search query
    const isProductSearch = isProductSearchQuery(userMessage);

    if (isProductSearch) {
      try {
        // Get products from database using our universal search function
        let searchResults = await searchProducts(supabase, userMessage);

        // Check if query is specifically about a category
        const categoryMatch = userMessage.match(/show me (\w+)/i);
        // Also check for direct category mentions (from button clicks)
        let requestedCategory = null;

        if (categoryMatch && categoryMatch[1]) {
          requestedCategory = categoryMatch[1].toLowerCase();
        } else if (
          /^(electronics|furniture|textbooks|clothing|miscellaneous)$/i.test(
            userMessage.trim()
          )
        ) {
          // Direct category button click
          requestedCategory = userMessage.trim().toLowerCase();
        }

        if (requestedCategory) {
          // Filter results to only include products from that category
          const filteredResults = searchResults.filter(
            (product) =>
              product.category &&
              product.category.toLowerCase() === requestedCategory
          );

          // If no products found in requested category, show a helpful message
          if (filteredResults.length === 0) {
            aiResponse = {
              role: "assistant",
              content: `I couldn't find any ${requestedCategory} items currently available. Would you like to browse other categories instead? Try clicking one of the category buttons below.`,
            };
            return res.json({ message: aiResponse });
          }

          // Use the filtered results instead of all results
          searchResults = filteredResults;
        }

        // Get search terms
        const searchTerms = extractSearchTerms(userMessage);

        // Determine response
        const determinedResponse = determineSearchResponse(
          searchResults,
          userMessage,
          searchTerms
        );

        if (!searchResults || searchResults.length === 0) {
          // No products found
          aiResponse = {
            role: "assistant",
            content:
              "I'm sorry, but I couldn't find any products matching your search criteria in our current inventory. Would you like to try a different search term or browse other categories instead?",
          };
        } else {
          try {
            // Format product data with verification codes
            const formattedResults = searchResults.map((item) => {
              // Get image URL if available
              let imageUrl = item.image || "";

              // If the image is a storage path, construct the full URL
              if (imageUrl && !imageUrl.startsWith("http")) {
                const imagePath = imageUrl.startsWith("/")
                  ? imageUrl.substring(1)
                  : imageUrl;

                // Use the exact Supabase URL format
                imageUrl = `https://vfjcutqzhhcvqjqjzwaf.supabase.co/storage/v1/object/public/product-images/${imagePath}`;
              }

              // Add verification code to product
              const verificationCode = `VP${item.productID}`; // Verified Product + ID

              // Return a clean, formatted object
              return {
                id: item.productID,
                productID: item.productID,
                name: item.name || "",
                price: item.price || 0,
                description: item.description || "",
                image: imageUrl,
                condition: item.condition || "",
                category: item.category || "",
                status: item.status || "available",
                is_bundle: item.is_bundle || false,
                flag: item.flag || false,
                created_at: item.created_at || "",
                modified_at: item.modified_at || "",
                userID: item.userID || "",
                _vcode: verificationCode, // Add verification code
              };
            });

            // Use the deterministic response template
            const responseTemplate = determinedResponse.responseText;

           

            aiResponse = {
              role: "assistant",
              content: `VERIFIED_PRODUCTS_START${JSON.stringify(
                formattedResults
              )}VERIFIED_PRODUCTS_END

${responseTemplate}

Let me know if you'd like more information about any of these items or if you'd like to refine your search.${
                priceFilter ? ` You can also try different price ranges.` : ""
              }`,
            };
          } catch (formattingError) {
            aiResponse = {
              role: "assistant",
              content:
                "I'm sorry, but I encountered an error while formatting the search results. Please try again later.",
            };
          }
        }
      } catch (searchError) {
        aiResponse = {
          role: "assistant",
          content:
            "I'm sorry, but I encountered an error while searching for products. Please try again later.",
        };
      }
    } else if (
      userMessage.includes("sell") ||
      userMessage.includes("list") ||
      userMessage.includes("listing")
    ) {
      // User wants to list an item
      try {
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
      } catch (listingError) {
        aiResponse = {
          role: "assistant",
          content:
            "I'm sorry, but I encountered an error while processing your listing request. Please try again later.",
        };
      }
    } else {
      // General conversation
      try {
        // Use a more restrictive system prompt for general conversations too
        const generalSystemMessage = {
          role: "system",
          content: `You are a helpful assistant for a student marketplace.
          Provide general help and information, but never make claims about specific products
          unless they've been explicitly provided to you from the database.
          Our marketplace has categories: electronics, furniture, clothing, textbooks, and miscellaneous.
          Never hallucinate or make up products that aren't in the database.`,
        };

        const conversationWithRestrictions = [
          generalSystemMessage,
          ...messages.slice(-10),
        ];

        aiResponse = await getAIResponse(conversationWithRestrictions);
      } catch (conversationError) {
        aiResponse = {
          role: "assistant",
          content:
            "I'm sorry, but I encountered an error while processing your request. Please try again later.",
        };
      }
    }

    res.json({ message: aiResponse });
  } catch (error) {
    res
      .status(500)
      .json({ error: "An error occurred while processing your request" });
  }
});

// Start the server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  // Server is now running
});
