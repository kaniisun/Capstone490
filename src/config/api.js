// src/config/api.js
const API_CONFIG = {
  BASE_URL:
    process.env.NODE_ENV === "development"
      ? "http://localhost:3001"
      : "https://marketplace-backend-8tag.onrender.com",

  ENDPOINTS: {
    CHAT: "/api/chat",
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
    return `${this.BASE_URL}${endpoint}`;
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

export default API_CONFIG;
