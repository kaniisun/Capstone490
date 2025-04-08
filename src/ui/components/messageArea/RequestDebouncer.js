import { useEffect } from "react";

// Track active requests to prevent duplicates
const activeRequests = new Map();
const completedRequests = new Map();

// Set an expiration time for cached responses (5 seconds)
const CACHE_EXPIRATION = 5000;

/**
 * Utility to intercept and optimize Supabase API requests
 * This will prevent duplicate API calls and implement request caching
 */
const setupRequestOptimization = () => {
  if (window.__requestsOptimized) return;
  window.__requestsOptimized = true;

  console.log("🔄 Setting up API request optimization...");

  // Keep original fetch reference
  const originalFetch = window.fetch;

  // Override fetch to deduplicate and cache requests
  window.fetch = function (resource, options) {
    // Only intercept Supabase API calls
    if (typeof resource === "string" && resource.includes("supabase.co")) {
      const requestKey = generateRequestKey(resource, options);

      // Check if this exact request is already in flight
      if (activeRequests.has(requestKey)) {
        console.log(
          "🔄 Deduplicating identical request:",
          getEndpointName(resource)
        );
        return activeRequests.get(requestKey);
      }

      // Check if we have a cached response for this request
      const cachedResponse = completedRequests.get(requestKey);
      if (
        cachedResponse &&
        Date.now() - cachedResponse.timestamp < CACHE_EXPIRATION
      ) {
        console.log("📦 Using cached response for:", getEndpointName(resource));
        // Return a clone of the cached response
        return Promise.resolve(cachedResponse.response.clone());
      }

      // Make actual API call
      const fetchPromise = originalFetch
        .apply(this, arguments)
        .then((response) => {
          // Cache successful responses
          if (response.ok) {
            // Clone the response before storing it (responses can only be consumed once)
            const clonedResponse = response.clone();
            completedRequests.set(requestKey, {
              response: clonedResponse,
              timestamp: Date.now(),
            });
          }

          // Remove from active requests
          activeRequests.delete(requestKey);

          return response;
        })
        .catch((error) => {
          // Remove from active requests on error
          activeRequests.delete(requestKey);
          throw error;
        });

      // Store the promise for deduplication
      activeRequests.set(requestKey, fetchPromise);

      return fetchPromise;
    }

    // Pass through non-Supabase requests
    return originalFetch.apply(this, arguments);
  };

  // Set up supabase request optimization
  if (window.supabase) {
    const originalSelect = window.supabase.from;

    // Override supabase data methods to implement shared caching
    window.supabase.from = function (table) {
      const result = originalSelect.apply(this, arguments);

      // Add debug info to track request sources
      const stack = new Error().stack;
      console.log(
        `📊 Supabase request for ${table} initiated from:`,
        stack.split("\n")[2].trim()
      );

      return result;
    };
  }

  // Clean up cache periodically
  setInterval(() => {
    const now = Date.now();
    completedRequests.forEach((value, key) => {
      if (now - value.timestamp > CACHE_EXPIRATION) {
        completedRequests.delete(key);
      }
    });
  }, 30000); // Clean every 30 seconds

  console.log("✅ API request optimization complete");
};

// Helper to generate a unique key for a request
const generateRequestKey = (url, options) => {
  const body = options?.body ? JSON.stringify(options.body) : "";
  return `${url}|${body}`;
};

// Extract endpoint name for logging
const getEndpointName = (url) => {
  try {
    return url.split("/").pop().split("?")[0];
  } catch (e) {
    return url;
  }
};

/**
 * Component that optimizes API requests when mounted
 */
const RequestDebouncer = () => {
  useEffect(() => {
    setupRequestOptimization();
  }, []);

  return null;
};

export default RequestDebouncer;
