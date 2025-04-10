/**
 * API Configuration
 * Central management of API endpoints and base URLs for different environments
 */

// Determine environment
const ENV = process.env.REACT_APP_ENV || process.env.NODE_ENV || "development";
const DEBUG = process.env.REACT_APP_DEBUG === "true" || false;

// Base URL configurations for different environments
const BASE_URLS = {
  development: process.env.REACT_APP_API_URL || "http://localhost:3001",
  test: process.env.REACT_APP_API_URL || "http://localhost:3001",
  production:
    process.env.REACT_APP_API_URL ||  "https://marketplace-backend-8tag.onrender.com",
};

// Get the appropriate base URL for the current environment
const BASE_URL =
  process.env.REACT_APP_API_URL || BASE_URLS[ENV] || BASE_URLS.development;

// API endpoint paths (without base URL)
const ENDPOINTS = {
  CHAT: "/api/chat",
  ANALYZE_IMAGE: "/api/vision/analyze", // Updated path to match server route
  LISTINGS: "/api/products",
  USER: "/api/user",
  MODERATE_PRODUCTS: "/api/moderate-products",
  MODERATE_PRODUCT: "/api/moderate-product",
};

// OpenAI configuration
// See latest model documentation: https://platform.openai.com/docs/models/gpt-4
const OPENAI_CONFIG = {
  MODEL_VERSION: process.env.REACT_APP_OPENAI_MODEL_VERSION || "gpt-4-turbo",
};

/**
 * Logs debug information if debug mode is enabled
 * @param {string} message - Debug message
 * @param {any} data - Optional data to log
 */
const logDebug = (message, data) => {
  if (!DEBUG) return;
  if (data) {
    console.log(`[API Config] ${message}`, data);
  } else {
    console.log(`[API Config] ${message}`);
  }
};

// Log configuration on initialization
logDebug("API Configuration", {
  environment: ENV,
  baseUrl: BASE_URL,
  debugMode: DEBUG,
  openaiModel: OPENAI_CONFIG.MODEL_VERSION,
});

/**
 * Gets the full URL for an API endpoint
 * @param {string} endpoint - The endpoint path or full URL
 * @returns {string} Full URL
 */
const getUrl = (endpoint) => {
  // If the endpoint is already a full URL, return it as is
  if (endpoint.startsWith("http://") || endpoint.startsWith("https://")) {
    return endpoint;
  }

  // If BASE_URL is undefined or null, log a warning and use a fallback
  if (!BASE_URL) {
    console.warn(
      "API base URL is undefined, using fallback URL: http://localhost:3001"
    );
    return `http://localhost:3001${endpoint}`;
  }

  // Otherwise, prepend the base URL
  const url = `${BASE_URL}${endpoint}`;
  logDebug(`Resolved API URL: ${url}`);
  return url;
};

// Export the API configuration
export default {
  ENV,
  DEBUG,
  BASE_URL,
  ENDPOINTS,
  OPENAI_CONFIG,
  getUrl,
};
