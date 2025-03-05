import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://vfjcutqzhhcvqjqjzwaf.supabase.co"; // Replace with your Project URL
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZmamN1dHF6aGhjdnFqcWp6d2FmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDA0MTEzOTcsImV4cCI6MjA1NTk4NzM5N30.qj8ZHoelOsaWJpskqYAdlcMegwl1T5mzeIefK7dNUbI"; // Replace with your Anon Key

// Create a single instance of the Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Export the single instance
export { supabase };
