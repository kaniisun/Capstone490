const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

// Create a Supabase client with the service role key
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

const handler = async (req, res) => {
  // Only allow POST method
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { userId, role, isAdmin } = req.body;

    if (!userId) {
      return res.status(400).json({ error: "User ID is required" });
    }

    console.log(
      `Server API: Updating user ${userId} to role ${role}, isAdmin: ${isAdmin}`
    );

    // Get the user data first to confirm they exist
    const { data: userData, error: userError } =
      await supabaseAdmin.auth.admin.getUserById(userId);

    if (userError || !userData) {
      console.error("Error getting user:", userError);
      return res
        .status(404)
        .json({ error: "User not found", details: userError?.message });
    }

    // Update the user's metadata with admin role using the service role key
    const { data, error } = await supabaseAdmin.auth.admin.updateUserById(
      userId,
      {
        user_metadata: {
          role: role,
          isAdmin: isAdmin,
        },
      }
    );

    if (error) {
      console.error("Error updating user role in Supabase Auth:", error);
      return res
        .status(500)
        .json({ error: "Failed to update user role", details: error.message });
    }

    console.log("Successfully updated user role in Supabase Auth:", data);
    return res
      .status(200)
      .json({ success: true, message: `User role updated to ${role}` });
  } catch (err) {
    console.error("Server error when updating user role:", err);
    return res
      .status(500)
      .json({ error: "Server error", details: err.message });
  }
};

module.exports = handler;
