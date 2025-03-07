//ChatModel.js

//ChatModel.js is the core of the chatbot. It is responsible for processing the user's query and returning a response.

//ChatModel is a class that contains the logic for the chatbot.
export class ChatModel {
  constructor() {
    this.apiKey = process.env.REACT_APP_COHERE_API_KEY;
    this.conversation = [];
  }

  // Sets up the AI model
  async initialize() {
    try {
      // Test the API connection
      const response = await fetch("https://api.cohere.ai/v1/generate", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
          "Cohere-Version": "2022-12-06",
        },
        body: JSON.stringify({
          model: "command",
          prompt: "Test connection",
          max_tokens: 10,
        }),
      });

      if (!response.ok) {
        console.error("Cohere API test failed:", await response.text());
        return false;
      }

      console.log("Cohere API connected successfully");
      return true;
    } catch (error) {
      console.error("Cohere initialization error:", error);
      return false;
    }
  }

  // Use Cohere API; Takes user input and extracts meaning
  async processQuery(query) {
    try {
      console.log("Processing query with Cohere:", query);

      // Define your marketplace categories
      const categories = [
        "Textbooks",
        "Electronics",
        "Furniture",
        "Clothing",
        "Miscellaneous",
      ];

      // Create a prompt that extracts structured data from the query
      const prompt = `
You are a shopping assistant for a college marketplace with the following categories: ${categories.join(
        ", "
      )}.

Extract search parameters from this query: "${query}"

Format your response as valid JSON with these fields:
{
  "category": "One of [${categories.join(", ")}] or null if unclear",
  "priceRange": "low" for cheap/affordable, "high" for expensive/premium, or null,
  "condition": "New", "Used", or null,
  "sortBy": "price_asc", "price_desc", or null,
  "keywords": [important non-category words from the query],
  "response": "A natural, helpful response to acknowledge the request"
}
      `;

      // Call Cohere API
      const response = await fetch("https://api.cohere.ai/v1/generate", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
          "Cohere-Version": "2022-12-06",
        },
        body: JSON.stringify({
          model: "command",
          prompt: prompt,
          max_tokens: 500,
          temperature: 0.3, // Lower temperature for more consistent outputs
          format: "json", // Request JSON format
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Cohere API error:", errorText);
        throw new Error(`Cohere API error: ${response.status}`);
      }

      const data = await response.json();
      console.log("Cohere raw response:", data);

      // Extract the generated content
      let generatedText = data.generations[0].text;

      // Parse the JSON from the response
      let parsedResponse;
      try {
        // Find JSON in the response (it might be surrounded by text)
        const jsonMatch = generatedText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          parsedResponse = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error("No JSON found in response");
        }
      } catch (parseError) {
        console.error("Error parsing JSON from Cohere:", parseError);
        // Fallback to basic response
        parsedResponse = {
          category: null,
          priceRange: null,
          condition: null,
          sortBy: null,
          keywords: query.split(" ").filter((w) => w.length > 3),
          response: "I'll help you search for that.",
        };
      }

      console.log("Parsed search parameters:", parsedResponse);

      // Save to conversation history 
      this.conversation.push(
        { role: "user", content: query },
        { role: "assistant", content: parsedResponse.response }
      );

      return {
        aiMessage: parsedResponse.response,
        searchParams: {
          category: parsedResponse.category,
          priceRange: parsedResponse.priceRange,
          condition: parsedResponse.condition,
          sortBy: parsedResponse.sortBy,
          keywords: parsedResponse.keywords,
        },
      };
    } catch (error) {
      console.error("Cohere processing error:", error);

      // Fallback response if Cohere is not available
      return {
        aiMessage: "I'll help you find that.",
        searchParams: {
          category: null,
          priceRange: null,
          condition: null,
          sortBy: null,
          keywords: query.split(" ").filter((w) => w.length > 3),
        },
      };
    }
  }

  // Returns conversation history
  getConversation() {
    return this.conversation;
  }

  // Tells if the model is ready to handle queries
  isReady() {
    return !!this.apiKey;
  }
}
