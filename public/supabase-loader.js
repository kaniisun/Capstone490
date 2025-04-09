/**
 * SUPABASE LOADER SCRIPT
 *
 * This script loads the Supabase client from CDN and makes it globally available
 * for other scripts like direct-send.js that need to access the database directly.
 */

(function () {
  console.log("🔌 Supabase Loader Starting...");

  // Skip creating dummy client if we're in product inquiry context
  const isProductInquiryContext =
    window.location.href.includes("/message/") ||
    window.location.href.includes("/messaging/") ||
    window.location.href.includes("productId=") ||
    window.location.href.includes("/product/");

  if (isProductInquiryContext) {
    console.log("Skipping dummy client creation in product inquiry context");
    return;
  }

  // First check if Supabase is already available
  if (window.supabase && typeof window.supabase.from === "function") {
    console.log("✅ Supabase client already available");
    return;
  }

  // Check if we have URL and key in localStorage for development environment
  let supabaseUrl = null;
  let supabaseKey = null;

  // Try to find credentials in meta tags
  const urlMeta = document.querySelector('meta[name="supabase-url"]');
  const keyMeta = document.querySelector('meta[name="supabase-key"]');

  if (urlMeta && keyMeta) {
    supabaseUrl = urlMeta.content;
    supabaseKey = keyMeta.content;
    console.log("Found Supabase credentials in meta tags");
  } else {
    // Try to extract from localStorage
    try {
      // Check for React environment variables stored in localStorage
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        const value = localStorage.getItem(key);

        if (
          value &&
          (value.includes("supabase.co") ||
            key.includes("supabase") ||
            key.includes("REACT_APP"))
        ) {
          console.log(`Checking localStorage key: ${key}`);

          // Try to parse as JSON
          try {
            const parsed = JSON.parse(value);
            if (parsed.url && parsed.url.includes("supabase.co")) {
              supabaseUrl = parsed.url;
              console.log(`Found Supabase URL in localStorage: ${supabaseUrl}`);
            }
            if (parsed.key && parsed.key.startsWith("eyJ")) {
              supabaseKey = parsed.key;
              console.log(`Found Supabase key in localStorage`);
            }

            // Check for nested objects too
            if (parsed.supabase) {
              if (parsed.supabase.url) supabaseUrl = parsed.supabase.url;
              if (parsed.supabase.key) supabaseKey = parsed.supabase.key;
            }
          } catch (e) {
            // If not JSON, try to extract directly
            if (value.includes("supabase.co")) {
              const urlMatch = value.match(
                /https:\/\/[a-z0-9-]+\.supabase\.co/
              );
              if (urlMatch) {
                supabaseUrl = urlMatch[0];
                console.log(`Extracted Supabase URL from text: ${supabaseUrl}`);
              }
            }

            // Look for anon key pattern
            if (value.includes("eyJ")) {
              const keyMatch = value.match(
                /eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/
              );
              if (keyMatch) {
                supabaseKey = keyMatch[0];
                console.log(`Extracted Supabase key from text`);
              }
            }
          }
        }
      }

      // Fall back to default environment variables if detected
      if (!supabaseUrl && window.ENV && window.ENV.REACT_APP_SUPABASE_URL) {
        supabaseUrl = window.ENV.REACT_APP_SUPABASE_URL;
      }
      if (!supabaseKey && window.ENV && window.ENV.REACT_APP_SUPABASE_KEY) {
        supabaseKey = window.ENV.REACT_APP_SUPABASE_KEY;
      }
    } catch (e) {
      console.warn(
        "Error extracting Supabase credentials from localStorage:",
        e
      );
    }
  }

  // If we found credentials, proceed with loading Supabase
  if (supabaseUrl && supabaseKey) {
    // Load the Supabase JavaScript client from CDN
    loadSupabaseFromCDN(supabaseUrl, supabaseKey);
  } else {
    console.warn(
      "⚠️ Could not find Supabase credentials, trying to create a dummy client"
    );
    createDummyClient();
  }

  function loadSupabaseFromCDN(url, key) {
    console.log("Loading Supabase from CDN with found credentials");

    // Add Supabase script
    const script = document.createElement("script");
    script.src = "https://unpkg.com/@supabase/supabase-js@2";
    script.async = true;

    script.onload = function () {
      console.log("📦 Supabase library loaded from CDN");

      // Create client after script loads
      try {
        if (typeof supabaseClient !== "undefined") {
          window.supabase = supabaseClient.createClient(url, key);
          console.log(
            "✅ Created Supabase client with supabaseClient.createClient"
          );
        } else if (
          typeof supabase !== "undefined" &&
          typeof supabase.createClient === "function"
        ) {
          window.supabase = supabase.createClient(url, key);
          console.log("✅ Created Supabase client with supabase.createClient");
        } else {
          // Try to find the createClient function
          let found = false;
          Object.keys(window).forEach((key) => {
            const obj = window[key];
            if (!found && obj && typeof obj.createClient === "function") {
              window.supabase = obj.createClient(url, key);
              console.log(
                `✅ Created Supabase client with ${key}.createClient`
              );
              found = true;
            }
          });

          if (!found) {
            console.error(
              "❌ Could not find createClient function after loading Supabase"
            );
            createDummyClient();
          }
        }

        // Show success indicator
        showStatusIndicator("Supabase Active", "green");
      } catch (e) {
        console.error("❌ Error creating Supabase client:", e);
        createDummyClient();
      }
    };

    script.onerror = function () {
      console.error("❌ Failed to load Supabase from CDN");
      createDummyClient();
    };

    document.head.appendChild(script);
  }

  function createDummyClient() {
    console.log("Creating a dummy Supabase client for compatibility");

    // Create a minimal compatible implementation
    window.supabase = {
      from: (tableName) => ({
        insert: async (data) => {
          console.log(`[DUMMY CLIENT] Would insert into ${tableName}:`, data);
          showStatusIndicator("No Supabase Connection", "red");

          // Return success to avoid breaking code
          return { data: [{ id: "dummy-id", ...data }], error: null };
        },
        select: async (columns) => {
          console.log(
            `[DUMMY CLIENT] Would select ${columns || "*"} from ${tableName}`
          );
          return {
            eq: async () => ({ data: [], error: null }),
            data: [],
            error: null,
          };
        },
        delete: async () => {
          console.log(`[DUMMY CLIENT] Would delete from ${tableName}`);
          return {
            eq: async () => ({ data: null, error: null }),
            data: null,
            error: null,
          };
        },
      }),
      auth: {
        getUser: async () => ({ data: { user: null }, error: null }),
      },
      rpc: (func) => ({
        execute: async (args) => {
          console.log(`[DUMMY CLIENT] Would execute RPC ${func} with:`, args);
          return { data: null, error: null };
        },
      }),
    };

    // Show dummy client indicator
    showStatusIndicator("Using Dummy Supabase Client", "orange");
  }

  function showStatusIndicator(text, color) {
    // Don't create UI elements, just log to console
    console.log(`[Supabase Loader] ${text} (${color})`);

    // Log to console with appropriate styling
    const style =
      color === "green"
        ? "color: green; font-weight: bold;"
        : color === "red"
        ? "color: red; font-weight: bold;"
        : "color: orange; font-weight: bold;";

    console.log(`%c[Supabase Status] ${text}`, style);
  }
})();
