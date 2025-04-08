/**
 * SUPABASE CONNECTOR
 *
 * This script creates a connector between the React app's Supabase client
 * and makes it available globally for direct-send scripts.
 */

(function () {
  console.log("🌉 Supabase Connector - Creating bridge to React app");

  // Check if we're in the React app environment
  const isReactApp =
    typeof React !== "undefined" ||
    document.getElementById("root")?._reactRootContainer;

  if (isReactApp) {
    console.log("✓ React app detected");

    // Function to attach the Supabase client to window
    const makeSupabaseGlobal = (supabaseClient) => {
      if (supabaseClient && typeof supabaseClient.from === "function") {
        window.supabase = supabaseClient;
        console.log(
          "✅ Successfully attached Supabase client to window.supabase"
        );
      }
    };

    // Try to find existing Supabase client
    if (window.supabase && typeof window.supabase.from === "function") {
      console.log("✓ Supabase client already exists in window");
      return;
    }

    // Create a placeholder to prevent errors
    window.supabase = window.supabase || {};

    // Define a setter that will be triggered when the real client becomes available
    let realSupabaseClient = null;
    Object.defineProperty(window, "__SUPABASE_CLIENT__", {
      set: function (client) {
        console.log("✓ Supabase client received through setter");
        realSupabaseClient = client;
        makeSupabaseGlobal(client);
      },
      get: function () {
        return realSupabaseClient;
      },
    });

    console.log("🔄 Waiting for Supabase client from React app...");
  } else {
    console.log("⚠️ Not in a React app environment");
  }
})();
