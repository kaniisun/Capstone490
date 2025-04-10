/**
 * Vision API Controller
 * Handles image analysis requests with robust error handling and retry logic
 */

const { OpenAI } = require("openai");
require("dotenv").config();

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// OpenAI configuration constants
// See latest model documentation: https://platform.openai.com/docs/models/gpt-4
const OPENAI_MODEL_VERSION = process.env.OPENAI_MODEL_VERSION || "gpt-4-turbo";

// Default fallback response when analysis fails
const DEFAULT_FALLBACK = {
  name: "Unknown Product",
  description: "Please provide a description for this product.",
  price: 0,
  condition: "used",
  category: "miscellaneous",
  error: "Failed to analyze image. Please review and edit the details.",
};

// Valid response properties - used for validation
const REQUIRED_PROPERTIES = [
  "name",
  "description",
  "price",
  "condition",
  "category",
];
const VALID_CONDITIONS = ["new", "like_new", "good", "fair", "poor"];
const VALID_CATEGORIES = [
  "electronics",
  "furniture",
  "textbooks",
  "clothing",
  "miscellaneous",
];

/**
 * Analyzes an image and generates product details
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} JSON response with product details or error
 */
exports.analyzeImage = async (req, res) => {
  const startTime = Date.now();
  const debug = process.env.DEBUG === "true";

  try {
    // Validate input
    const { image } = req.body;

    if (!image) {
      return res.status(400).json({
        error: "No image data provided",
        message: "Image data is required",
      });
    }

    if (typeof image !== "string") {
      return res.status(400).json({
        error: "Invalid image format",
        message: "Image must be a base64-encoded string",
      });
    }

    if (debug) {
      console.log(
        `Image analysis request received - payload size: ${image.length} chars`
      );
    }

    // Analyze image with retry logic
    const productData = await analyzeImageWithRetry(image, {
      maxRetries: 3,
      debug,
    });

    // Additional logging for debug mode
    if (debug) {
      console.log(`Image analysis completed in ${Date.now() - startTime}ms`);
      console.log(
        "Generated product data:",
        JSON.stringify(productData, null, 2)
      );
    }

    return res.json(productData);
  } catch (error) {
    console.error("Error in image analysis:", error);

    // Provide a user-friendly error response with fallback data
    return res.status(500).json({
      error: "Failed to analyze image",
      message: error.message,
      fallback: DEFAULT_FALLBACK,
    });
  }
};

/**
 * Performs image analysis with retry logic
 *
 * @param {string} base64Image - Base64-encoded image data
 * @param {Object} options - Options for retry behavior
 * @returns {Promise<Object>} Promise resolving to product data
 */
async function analyzeImageWithRetry(base64Image, options = {}) {
  const { maxRetries = 3, retryDelay = 1000, debug = false } = options;
  let attempts = 0;
  let lastError = null;

  // Retry loop
  while (attempts < maxRetries) {
    try {
      if (debug && attempts > 0) {
        console.log(`Vision API attempt ${attempts + 1}/${maxRetries}`);
      }

      // Call OpenAI Vision API
      const result = await openai.chat.completions.create({
        model: OPENAI_MODEL_VERSION, // Use configurable model version
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Analyze this image and create a marketplace listing. Return a JSON object with these fields ONLY:
                - name: short title (max 50 chars)
                - description: detailed but concise (max 500 chars)
                - price: numeric value in USD (no currency symbol)
                - condition: one of [new, like_new, good, fair, poor]
                - category: one of [electronics, furniture, textbooks, clothing, miscellaneous]
                
                IMPORTANT: Return ONLY the JSON object, no explanations or additional text.`,
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:image/jpeg;base64,${base64Image}`,
                },
              },
            ],
          },
        ],
        max_tokens: 1000,
        temperature: 0.5,
        response_format: { type: "json_object" },
      });

      const content = result.choices[0]?.message?.content;

      if (!content) {
        throw new Error("Vision API returned empty response");
      }

      // Parse and validate the response
      const productData = parseAndValidateResponse(content);
      return productData;
    } catch (error) {
      lastError = error;
      attempts++;

      // Handle model not found errors
      if (
        error.message.includes("model_not_found") ||
        error.message.includes("does not exist") ||
        error.message.includes("The model")
      ) {
        console.error(
          `Model error using '${OPENAI_MODEL_VERSION}':`,
          error.message
        );
        // Don't retry model errors as they'll likely fail again
        break;
      }

      // If we've reached max retries, throw the error
      if (attempts >= maxRetries) {
        console.error(`Vision API failed after ${maxRetries} attempts:`, error);
        break;
      }

      // Otherwise wait and retry
      const delay = retryDelay * Math.pow(2, attempts - 1); // Exponential backoff
      if (debug) {
        console.log(`Retrying after ${delay}ms...`);
      }
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  // If we get here with lastError, we've exhausted retries
  if (lastError) {
    if (
      lastError.message.includes("model_not_found") ||
      lastError.message.includes("does not exist") ||
      lastError.message.includes("The model")
    ) {
      throw new Error(
        "The image processing model was recently updated. We're fixing it. Please try again later."
      );
    }
    throw lastError;
  }

  // This should never happen (we should either return or throw before here)
  throw new Error("Failed to analyze image after multiple attempts");
}

/**
 * Parses and validates a Vision API response
 *
 * @param {string} responseContent - JSON response from Vision API
 * @returns {Object} Validated product data object
 */
function parseAndValidateResponse(responseContent) {
  let productData;

  // Parse the JSON response
  try {
    productData =
      typeof responseContent === "string"
        ? JSON.parse(responseContent)
        : responseContent;
  } catch (error) {
    console.error("Error parsing Vision API response:", error);
    throw new Error("Invalid response format from Vision API");
  }

  // Validate the parsed data
  if (!productData || typeof productData !== "object") {
    throw new Error("Invalid response format: not an object");
  }

  // Check for required properties
  const missingProps = REQUIRED_PROPERTIES.filter((prop) => !productData[prop]);
  if (missingProps.length > 0) {
    throw new Error(
      `Invalid response: missing required properties: ${missingProps.join(
        ", "
      )}`
    );
  }

  // Sanitize and validate each field
  const sanitized = {
    name: String(productData.name || "")
      .trim()
      .substring(0, 100),
    description: String(productData.description || "")
      .trim()
      .substring(0, 2000),
    price: parseFloat(productData.price) || 0,
    condition: VALID_CONDITIONS.includes(productData.condition)
      ? productData.condition
      : "used",
    category: VALID_CATEGORIES.includes(productData.category)
      ? productData.category
      : "miscellaneous",
  };

  // Ensure price is positive and not NaN
  if (isNaN(sanitized.price) || sanitized.price < 0) {
    sanitized.price = 0;
  }

  // Ensure name and description are not empty
  if (!sanitized.name) {
    sanitized.name = DEFAULT_FALLBACK.name;
  }

  if (!sanitized.description) {
    sanitized.description = DEFAULT_FALLBACK.description;
  }

  return sanitized;
}

// Export parsing and validation function for testing
exports.parseAndValidateResponse = parseAndValidateResponse;

// Export retry function for testing
exports.analyzeImageWithRetry = analyzeImageWithRetry;

// Export default fallback for testing
exports.DEFAULT_FALLBACK = DEFAULT_FALLBACK;
