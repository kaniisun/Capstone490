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

// Note: For local development, add a proxy in package.json:
// "proxy": "http://localhost:3001"
// This allows the React app to proxy API requests to our Express server

// Export as default for backward compatibility
export default supabase;
