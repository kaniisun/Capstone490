import { createClient } from "@supabase/supabase-js";

// Initialize the Supabase client
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseKey = process.env.REACT_APP_SUPABASE_KEY;

// Create a single instance of the Supabase client
export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true, // Default is true - keeps user logged in across page refreshes
    autoRefreshToken: true, // Default is true - refresh access token before it expires
  },
});

// Export as default for backward compatibility
export default supabase;
