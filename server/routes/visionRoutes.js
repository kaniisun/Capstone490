/**
 * Vision API Routes
 * Handles image analysis for product listings
 */

const express = require("express");
const router = express.Router();
const { OpenAI } = require("openai");
require("dotenv").config();

// Initialize OpenAI client with error handling
let openai;
try {
  openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
  console.log("OpenAI client initialized successfully");
} catch (error) {
  console.error("Failed to initialize OpenAI client:", error);
}

// Constants for request validation
const MAX_IMAGE_URL_LENGTH = 2000;
const MAX_IMAGE_SIZE_BYTES = 20 * 1024 * 1024; // 20MB max for base64

// OpenAI configuration constants
// See latest model documentation: https://platform.openai.com/docs/models/gpt-4
const OPENAI_MODEL_VERSION = process.env.OPENAI_MODEL_VERSION || "gpt-4-turbo";

/**
 * Middleware to validate request body
 */
const validateRequest = (req, res, next) => {
  const { image_url, image } = req.body;

  // Must provide either image_url or base64 image
  if (!image_url && !image) {
    return res.status(400).json({
      error: "Missing required parameters",
      message: "Either image_url or image must be provided",
    });
  }

  // If using URL, validate URL length
  if (image_url && typeof image_url === "string") {
    if (image_url.length > MAX_IMAGE_URL_LENGTH) {
      return res.status(400).json({
        error: "Invalid image URL",
        message: "Image URL is too long",
      });
    }
  }

  // If using base64, validate size
  if (image && typeof image === "string") {
    // Base64 string length in chars is roughly 4/3 of the decoded size in bytes
    const estimatedBytes = Math.ceil(image.length * 0.75);

    if (estimatedBytes > MAX_IMAGE_SIZE_BYTES) {
      return res.status(400).json({
        error: "Image too large",
        message: `Image exceeds maximum size of ${
          MAX_IMAGE_SIZE_BYTES / (1024 * 1024)
        }MB`,
      });
    }
  }

  next();
};

/**
 * Route handler for image analysis
 * Accepts either image_url or base64-encoded image
 */
router.post("/analyze", validateRequest, async (req, res) => {
  const startTime = Date.now();
  const { image_url, image } = req.body;

  try {
    // Check if OpenAI client is available
    if (!openai) {
      throw new Error("OpenAI client not initialized");
    }

    console.log("Vision API request received:", {
      hasImageUrl: !!image_url,
      hasImageData: !!image,
      timestamp: new Date().toISOString(),
    });

    // Prepare content for API call
    const content = [
      {
        type: "text",
        text: "Analyze this image and create a marketplace listing. Return a JSON object with these fields ONLY: name (short title), description (detailed but brief), price (numeric, USD), condition (one of: new, like_new, good, fair, poor), category (one of: electronics, furniture, textbooks, clothing, miscellaneous). IMPORTANT: Return ONLY the JSON object, no explanations or additional text.",
      },
    ];

    // Add image content - prefer URL if provided
    if (image_url) {
      content.push({
        type: "image_url",
        image_url: { url: image_url },
      });
    } else if (image) {
      content.push({
        type: "image_url",
        image_url: { url: `data:image/jpeg;base64,${image}` },
      });
    }

    // Make the OpenAI API call
    const result = await openai.chat.completions.create({
      model: OPENAI_MODEL_VERSION,
      messages: [
        {
          role: "user",
          content: content,
        },
      ],
      max_tokens: 500,
      temperature: 0.5,
      response_format: { type: "json_object" }, // Request direct JSON
    });

    // Check for valid response
    if (!result.choices || !result.choices[0] || !result.choices[0].message) {
      throw new Error("Invalid response from OpenAI");
    }

    // Log performance metrics
    const duration = Date.now() - startTime;
    console.log(`Vision API request completed in ${duration}ms`);

    // Extract the content from the response
    const responseContent = result.choices[0].message.content;

    try {
      // Try to parse as JSON
      const parsedData = JSON.parse(responseContent);

      // Validate minimum required fields
      if (
        !parsedData.name ||
        !parsedData.description ||
        parsedData.price === undefined
      ) {
        console.warn(
          "Missing required fields in Vision API response",
          parsedData
        );
      }

      // Return the product data
      return res.json(parsedData);
    } catch (parseError) {
      console.error("Error parsing OpenAI response as JSON:", parseError);
      console.error("Raw response:", responseContent);
      return res.status(500).json({
        error: "Invalid response format",
        message: "Could not parse product data from AI response",
      });
    }
  } catch (error) {
    console.error("Vision API error:", error);

    // Determine appropriate status code
    let statusCode = 500;
    let errorMessage = "Error processing image";

    if (error.message.includes("OpenAI API key")) {
      statusCode = 500;
      errorMessage = "API configuration error";
    } else if (error.message.includes("timeout")) {
      statusCode = 504;
      errorMessage = "Request timed out";
    } else if (error.message.includes("rate limit")) {
      statusCode = 429;
      errorMessage = "Rate limit exceeded";
    } else if (
      error.message.includes("model_not_found") ||
      error.message.includes("does not exist") ||
      error.message.includes("The model")
    ) {
      statusCode = 500;
      errorMessage =
        "The image processing model was recently updated. We're fixing it. Please try again later.";
      console.error(
        `Model error using '${OPENAI_MODEL_VERSION}':`,
        error.message
      );
    }

    return res.status(statusCode).json({
      error: "Vision API error",
      message: errorMessage,
      details:
        process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

module.exports = router;
