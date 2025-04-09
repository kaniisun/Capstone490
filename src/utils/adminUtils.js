/**
 * Admin Utilities - Helper functions for admin management
 */
import { supabase } from "../supabaseClient";

/**
 * Verifies if a user has admin privileges in the database
 * @param {string} userId - The user ID to check
 * @returns {Promise<{isAdmin: boolean, role: string|null, error: string|null}>}
 */
export const verifyAdminStatus = async (userId) => {
  if (!userId) {
    return { isAdmin: false, role: null, error: "No user ID provided" };
  }

  try {
    console.log(`Verifying admin status for user ${userId}`);

    // First try with userID field
    const { data: userData, error } = await supabase
      .from("users")
      .select("role, userID, email")
      .eq("userID", userId)
      .single();

    if (error) {
      console.error("Error verifying admin status in database:", error);

      // Try with id field as fallback
      const { data: userData2, error: error2 } = await supabase
        .from("users")
        .select("role, userID, email")
        .eq("id", userId)
        .single();

      if (error2) {
        return {
          isAdmin: false,
          role: null,
          error: "User not found in database with either userID or id",
        };
      }

      // Use data from second attempt
      const isAdmin = userData2.role === "admin";
      return { isAdmin, role: userData2.role, error: null };
    }

    // User found with userID field
    const isAdmin = userData.role === "admin";
    return { isAdmin, role: userData.role, error: null };
  } catch (err) {
    console.error("Exception verifying admin status:", err);
    return { isAdmin: false, role: null, error: err.message };
  }
};

/**
 * Sets a user's role to admin in the database and updates auth metadata
 * @param {string} userId - The user ID to promote to admin
 * @returns {Promise<{success: boolean, error: string|null, details: object|null}>}
 */
export const setAdminRole = async (userId) => {
  if (!userId) {
    return { success: false, error: "No user ID provided" };
  }

  try {
    console.log(`Setting admin role for user ${userId}`);

    // Update users table first with userID
    const { data, error } = await supabase
      .from("users")
      .update({
        role: "admin",
        modified_at: new Date().toISOString(),
      })
      .eq("userID", userId)
      .select();

    // If failed, try with id field
    if (error) {
      console.log("Failed to update with userID, trying with id field", error);

      const { data: data2, error: error2 } = await supabase
        .from("users")
        .update({
          role: "admin",
          modified_at: new Date().toISOString(),
        })
        .eq("id", userId)
        .select();

      if (error2) {
        return {
          success: false,
          error: "Failed to update user in database",
          details: { userIDError: error, idError: error2 },
        };
      }

      // Update auth metadata
      try {
        const { error: metadataError } =
          await supabase.auth.admin.updateUserById(userId, {
            user_metadata: { role: "admin", isAdmin: true },
            app_metadata: { role: "admin", isAdmin: true },
          });

        if (metadataError) {
          console.warn("Admin metadata update failed:", metadataError);
        }
      } catch (metadataErr) {
        console.warn("Exception updating metadata:", metadataErr);
      }

      return {
        success: true,
        data: data2,
        details: { method: "id_field" },
      };
    }

    // Update auth metadata if userID update succeeded
    try {
      const { error: metadataError } = await supabase.auth.admin.updateUserById(
        userId,
        {
          user_metadata: { role: "admin", isAdmin: true },
          app_metadata: { role: "admin", isAdmin: true },
        }
      );

      if (metadataError) {
        console.warn("Admin metadata update failed:", metadataError);
      }
    } catch (metadataErr) {
      console.warn("Exception updating metadata:", metadataErr);
    }

    return {
      success: true,
      data: data,
      details: { method: "userID_field" },
    };
  } catch (err) {
    console.error("Exception setting admin role:", err);
    return { success: false, error: err.message };
  }
};

export default {
  verifyAdminStatus,
  setAdminRole,
};
