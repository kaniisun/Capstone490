/**
 * API Service
 * Handles API requests with retry logic, timeout handling, and error management
 */

import API_CONFIG from "../config/api.js";

// Default configuration
const DEFAULT_CONFIG = {
  maxRetries: 3, // Maximum number of retry attempts
  retryDelay: 1000, // Base delay between retries in ms
  timeout: 30000, // Request timeout in ms
  debug: false, // Debug mode for additional logging
};

/**
 * Makes an API request with retry logic
 *
 * @param {string} endpoint - API endpoint to call
 * @param {Object} options - Request options (method, headers, body)
 * @param {Object} config - Configuration for retry behavior
 * @returns {Promise<Object>} Promise resolving to API response
 */
export const makeRequest = async (endpoint, options = {}, config = {}) => {
  // Merge config with defaults
  const { maxRetries, retryDelay, timeout, debug } = {
    ...DEFAULT_CONFIG,
    ...config,
  };

  const url = endpoint.startsWith("http")
    ? endpoint
    : API_CONFIG.getUrl(endpoint);

  // Track retry attempts
  let attempts = 0;
  let lastError = null;

  if (debug) {
    console.log(`API Request: ${options.method || "GET"} ${url}`);
    if (options.body) {
      try {
        const bodyPreview =
          typeof options.body === "string"
            ? JSON.parse(options.body)
            : options.body;

        // Don't log sensitive data like full images
        const sanitizedBody = { ...bodyPreview };
        if (sanitizedBody.image && typeof sanitizedBody.image === "string") {
          sanitizedBody.image = `[Base64 image (${sanitizedBody.image.length} chars)]`;
        }
        console.log("Request body:", sanitizedBody);
      } catch (e) {
        console.log("Request body: [unparseable]");
      }
    }
  }

  // Retry loop
  while (attempts < maxRetries) {
    try {
      // Add AbortController for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      // Make the actual fetch request
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          ...options.headers,
        },
      }).finally(() => {
        clearTimeout(timeoutId);
      });

      // Check if response is OK (status 200-299)
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({
          message: `Server returned ${response.status} ${response.statusText}`,
        }));

        throw new Error(
          errorData.message ||
            `API Error: ${response.status} ${response.statusText}`
        );
      }

      // Parse response
      const data = await response.json();

      if (debug) {
        console.log(`API Success (${attempts + 1} attempts):`, url);
      }

      return data;
    } catch (error) {
      attempts++;
      lastError = error;

      // Log retry attempts
      if (debug) {
        console.warn(
          `API Request failed (attempt ${attempts}/${maxRetries}):`,
          error.message
        );
      }

      // Check if we should retry
      if (attempts >= maxRetries) {
        break;
      }

      // Handle specific errors
      if (error.name === "AbortError") {
        if (debug) console.warn("Request timed out, retrying...");
      } else if (error.message.includes("NetworkError")) {
        if (debug) console.warn("Network error, retrying...");
      }

      // Calculate exponential backoff delay
      const backoffDelay = retryDelay * Math.pow(2, attempts - 1);
      const jitter = Math.random() * 200; // Add randomness to prevent thundering herd
      const delay = backoffDelay + jitter;

      if (debug) {
        console.log(`Waiting ${Math.round(delay)}ms before retry...`);
      }

      // Wait before retry
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  // If we get here, all retries failed
  throw new Error(
    `API request failed after ${maxRetries} attempts: ${lastError?.message}`
  );
};

/**
 * Analyzes an image using the Vision API
 *
 * @param {string} base64Image - Base64 encoded image data
 * @param {string} accessToken - User's access token (optional)
 * @param {Object} config - Configuration options
 * @returns {Promise<Object>} Promise resolving to analysis results
 */
export const analyzeImage = async (base64Image, accessToken, config = {}) => {
  try {
    const endpoint = API_CONFIG.ENDPOINTS.ANALYZE_IMAGE;

    const options = {
      method: "POST",
      headers: {
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
      body: JSON.stringify({
        image: base64Image,
      }),
    };

    // Use enhanced config for image analysis (longer timeout)
    const imageConfig = {
      ...config,
      timeout: config.timeout || 60000, // Images may take longer to process
    };

    return await makeRequest(endpoint, options, imageConfig);
  } catch (error) {
    console.error("Image analysis API error:", error);

    // Check for common OpenAI API errors and provide more helpful messages
    if (
      error.message.includes("model_not_found") ||
      error.message.includes("does not exist") ||
      error.message.includes("The model")
    ) {
      console.error("OpenAI model error:", error.message);
      throw new Error(
        "The image processing model was recently updated. We're fixing it. Please try again later."
      );
    }

    throw new Error(`Failed to analyze image: ${error.message}`);
  }
};

/**
 * Submits a listing to the server
 *
 * @param {Object} listingData - Listing data to submit
 * @param {string} accessToken - User's access token
 * @param {Object} config - Configuration options
 * @returns {Promise<Object>} Promise resolving to the created listing
 */
export const submitListing = async (listingData, accessToken, config = {}) => {
  try {
    const endpoint = API_CONFIG.ENDPOINTS.LISTINGS;

    const options = {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(listingData),
    };

    return await makeRequest(endpoint, options, config);
  } catch (error) {
    console.error("Listing submission API error:", error);
    throw new Error(`Failed to submit listing: ${error.message}`);
  }
};

export default {
  makeRequest,
  analyzeImage,
  submitListing,
};
