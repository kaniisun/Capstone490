// src/config/api.js
const API_CONFIG = {
  BASE_URL:
    process.env.NODE_ENV === "development"
      ? "http://localhost:3001"
      : "https://marketplace-backend-8tag.onrender.com",

  ENDPOINTS: {
    CHAT: "/api/chat",
    ANALYZE_IMAGE: "/api/analyze-image",
    TEST_VISION: "/api/test-vision",
    MODERATE_PRODUCTS: "/api/moderate-products",
    MODERATE_PRODUCT: "/api/moderate-product",
    DELETE_PRODUCT: "/api/delete-product",
    UPDATE_USER_ROLE: "/api/update-user-role",
    ENFORCE_ACCOUNT_STATUS: "/api/enforce-account-status",
    MAKE_ADMIN: "/api/make-admin",
    SOFT_DELETE: "/api/soft-delete",
    REINSTATE: "/api/reinstate",
    TEST: "/api/test",
    HEALTH_CHECK: "/api/health-check",
    DB_TEST: "/api/db-test",
    DIAGNOSTICS: "/api/diagnostics",
    DEBUG_PRODUCTS: "/api/debug-products",
    DIAGNOSE_PRODUCTS: "/api/diagnose-products",
  },

  // Helper function to get full URL for an endpoint
  getUrl: function (endpoint) {
  // Ensure proper URL joining for all platforms
  let base = this.BASE_URL;
  let path = endpoint;
  
  // Remove trailing slashes from base
  base = base.replace(/\/+$/, '');
  
  // Remove leading slashes from path
  path = path.replace(/^\/+/, '');
  
  // Join with a single slash
  return `${base}/${path}`;
},

  // Default fetch options to be used across all API calls
  defaultFetchOptions: {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
  },

  // Configuration options
  TIMEOUT: 10000,
  WITH_CREDENTIALS: true,
};

// Temporary debug logging - remove after confirming fix works
console.log("[API Config] Environment:", process.env.NODE_ENV);
console.log("[API Config] Base URL:", API_CONFIG.BASE_URL);
console.log("[API Config] Test URL:", API_CONFIG.getUrl("/api/test"));
console.log("[API Config] Chat URL:", API_CONFIG.getUrl(API_CONFIG.ENDPOINTS.CHAT));

export default API_CONFIG;
