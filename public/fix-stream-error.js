/**
 * FIX-STREAM-ERROR.JS
 *
 * This script fixes the "body stream already read" error that occurs when
 * multiple parts of the code try to read the same Supabase response.
 */

(function () {
  console.log("🔧 Starting fix for 'body stream already read' errors...");

  // Function to find the Supabase client
  function findSupabaseClient() {
    // Common variable names
    const possibleVars = ["supabase", "supabaseClient", "_supabase"];
    for (const name of possibleVars) {
      if (window[name] && typeof window[name].from === "function") {
        return window[name];
      }
    }
    return null;
  }

  // Find Supabase client
  const supabaseClient = findSupabaseClient();
  if (!supabaseClient) {
    console.error(
      "❌ Could not find Supabase client. Please run this on a page where Supabase is loaded."
    );
    return;
  }

  console.log("✅ Found Supabase client, applying fix...");

  // Store original fetch function
  const originalFetch = window.fetch;

  // Override fetch to ensure responses can be read multiple times
  window.fetch = async function (...args) {
    // Check if this is a Supabase call
    const url = args[0]?.toString() || "";
    const isSupabase = url.includes("supabase");

    // If not a Supabase call, use the original fetch
    if (!isSupabase) {
      return originalFetch.apply(this, args);
    }

    // For Supabase calls, we need to clone the response
    console.log(`🔄 Intercepting Supabase request to: ${url.split("?")[0]}`);

    try {
      const response = await originalFetch.apply(this, args);

      // Store original response methods
      const originalJson = response.json;
      const originalText = response.text;

      // Cache for the parsed data
      let jsonCache = null;
      let textCache = null;

      // Override json method to cache the result
      response.json = async function () {
        if (jsonCache) {
          console.log("📦 Returning cached JSON response");
          return jsonCache;
        }

        try {
          // Clone the response first
          const clone = response.clone();
          jsonCache = await originalJson.call(clone);
          return jsonCache;
        } catch (e) {
          console.error("❌ Error parsing JSON:", e);
          throw e;
        }
      };

      // Override text method to cache the result
      response.text = async function () {
        if (textCache) {
          console.log("📦 Returning cached text response");
          return textCache;
        }

        try {
          // Clone the response first
          const clone = response.clone();
          textCache = await originalText.call(clone);
          return textCache;
        } catch (e) {
          console.error("❌ Error getting response text:", e);
          throw e;
        }
      };

      return response;
    } catch (error) {
      console.error(`❌ Error in fetch override: ${error.message}`);
      throw error;
    }
  };

  // Patch Supabase's internal fetch handling for the count method
  // This is a common source of "body stream already read" errors
  try {
    const originalCount = supabaseClient.from().count;

    // Create a proxy to the count method
    supabaseClient.from = new Proxy(supabaseClient.from, {
      apply: function (target, thisArg, args) {
        const queryBuilder = target.apply(thisArg, args);

        // Override the count method
        const originalQueryCount = queryBuilder.count;
        queryBuilder.count = async function (
          columnName,
          { head = false } = {}
        ) {
          try {
            // Use the original count method
            const result = await originalQueryCount.call(this, columnName, {
              head,
            });

            // If we got an error about body stream, retry with a fresh query
            if (
              result.error &&
              result.error.message &&
              result.error.message.includes("body stream already read")
            ) {
              console.warn(
                "🔄 Detected 'body stream already read' error, retrying count query..."
              );

              // Create a fresh query and try again
              const freshQuery = supabaseClient.from(this.url.split("/").pop());
              return await originalQueryCount.call(freshQuery, columnName, {
                head,
              });
            }

            return result;
          } catch (e) {
            console.error("❌ Error in count method:", e);
            return { data: null, error: e };
          }
        };

        return queryBuilder;
      },
    });
  } catch (e) {
    console.warn("⚠️ Could not patch Supabase count method:", e);
  }

  console.log(
    "✅ Successfully applied fix for 'body stream already read' errors!"
  );

  // Add a visual indicator that the fix is active
  const fixIndicator = document.createElement("div");
  fixIndicator.style.position = "fixed";
  fixIndicator.style.bottom = "10px";
  fixIndicator.style.left = "10px";
  fixIndicator.style.background = "#4CAF50";
  fixIndicator.style.color = "white";
  fixIndicator.style.padding = "8px 12px";
  fixIndicator.style.borderRadius = "4px";
  fixIndicator.style.zIndex = "9999";
  fixIndicator.style.boxShadow = "0 2px 5px rgba(0,0,0,0.2)";
  fixIndicator.style.fontSize = "14px";
  fixIndicator.innerText = "Stream Error Fix Active ✓";
  document.body.appendChild(fixIndicator);

  // Remove indicator after 5 seconds
  setTimeout(() => {
    fixIndicator.style.opacity = "0";
    fixIndicator.style.transition = "opacity 0.5s ease";
    setTimeout(() => fixIndicator.remove(), 500);
  }, 5000);
})();
