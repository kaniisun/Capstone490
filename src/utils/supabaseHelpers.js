import { supabase } from "../supabaseClient";

/**
 * Explicitly update the verification status in Supabase
 * This helps synchronize the dashboard status with the actual verification
 * @returns {Promise<{success: boolean, error: any}>} Result of the operation
 */
export async function updateVerificationStatus() {
  try {
    // Add rate limiting - only update once per hour
    const lastVerificationUpdate = localStorage.getItem(
      "lastVerificationUpdate"
    );
    const now = new Date().getTime();

    if (
      lastVerificationUpdate &&
      now - parseInt(lastVerificationUpdate, 10) < 3600000
    ) {
      // 1 hour
      console.log("Skipping verification update - updated recently");
      return { success: true, error: null };
    }

    // Get the current user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "No user found" };
    }

    // Update the user's metadata to include verification timestamps
    const { error } = await supabase.auth.updateUser({
      data: {
        email_verified: true,
        email_confirmed_at: user.email_confirmed_at || new Date().toISOString(),
        verified_at: new Date().toISOString(),
      },
    });

    if (error) {
      console.error("Error updating verification status:", error);
      return { success: false, error };
    }

    // Also update the users table in the database
    const { error: dbError } = await supabase
      .from("users")
      .update({
        email_verified: true,
        verified_at: new Date().toISOString(),
        accountStatus: "active",
      })
      .eq("userID", user.id);

    if (dbError) {
      console.error("Error updating user database record:", dbError);
      return { success: false, error: dbError };
    }

    // Store the last update time
    localStorage.setItem("lastVerificationUpdate", now.toString());

    return { success: true, error: null };
  } catch (err) {
    console.error("Unexpected error in verification update:", err);
    return { success: false, error: err };
  }
}

/**
 * Check if the current user's email is verified according to Supabase
 * @returns {Promise<boolean>} Whether the email is verified
 */
export async function isEmailVerified() {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return user && !!user.email_confirmed_at;
  } catch (err) {
    console.error("Error checking email verification:", err);
    return false;
  }
}

export default {
  updateVerificationStatus,
  isEmailVerified,
};
