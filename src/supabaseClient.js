import { createClient } from "@supabase/supabase-js";

// Supabase connection details
const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.REACT_APP_SUPABASE_KEY;

// Create the Supabase client with minimal configuration
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Immediately test the connection and log the result
console.log("Supabase client initialized, testing connection...");

// Export a function to test the connection
export const testSupabaseConnection = async () => {
  try {
    console.log("Testing Supabase connection...");
    // Try a simple query to test the connection
    const { data, error } = await supabase
      .from("users")
      .select("count", { count: "exact", head: true });

    if (error) {
      console.error("Supabase connection test failed:", error);
      return { success: false, error };
    }

    console.log("Supabase connection test successful");
    return { success: true, data };
  } catch (err) {
    console.error("Supabase connection test error:", err);
    return { success: false, error: err };
  }
};

// Test the connection immediately (for debugging purposes)
testSupabaseConnection().then((result) => {
  if (result.success) {
    console.log("✅ Initial connection to Supabase successful");
  } else {
    console.error("❌ Initial connection to Supabase failed:", result.error);
  }
});

// Export the supabase client
export { supabase };
