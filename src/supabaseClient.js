import { createClient } from "@supabase/supabase-js";

// Supabase connection details
const SUPABASE_URL = "https://vfjcutqzhhcvqjqjzwaf.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZmamN1dHF6aGhjdnFqcWp6d2FmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDA0MTEzOTcsImV4cCI6MjA1NTk4NzM5N30.qj8ZHoelOsaWJpskqYAdlcMegwl1T5mzeIefK7dNUbI";

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
