import { createClient } from "@supabase/supabase-js";

// Initialize the Supabase client
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseKey = process.env.REACT_APP_SUPABASE_KEY;

// Create a single instance of the Supabase client without forced content-type headers
export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true, // Default is true - keeps user logged in across page refreshes
    autoRefreshToken: true, // Default is true - refresh access token before it expires
  },
  // Removed global headers that were forcing all requests to be JSON
  // This allows file uploads to use the correct content type
});

// Make the Supabase client globally available for our scripts
// This allows direct-send-v2.js to access it
if (typeof window !== "undefined") {
  window.supabase = supabase;

  // Also set it in a special property that our connector can access
  if (window.__SUPABASE_CLIENT__ === undefined) {
    window.__SUPABASE_CLIENT__ = supabase;
  }

  console.log("Supabase client made globally available");
}

// Note: For local development, add a proxy in package.json:
// "proxy": "http://localhost:3001"
// This allows the React app to proxy API requests to our Express server

// Export as default for backward compatibility
export default supabase;
