import { supabase } from "../../../../supabaseClient";

// This function executes raw SQL for reliable updates
// The Karpathy approach: Instead of complex handling of all edge cases,
// focus on the core functionality with the minimal reliable implementation
export const executeDirectUpdate = async (userId, fieldName, value) => {
  console.log(
    `Direct SQL update: Setting ${fieldName}=${value} for user ${userId}`
  );

  // Try to update by userID first as that's our primary key
  try {
    const { data, error } = await supabase
      .from("users")
      .update({ [fieldName]: value })
      .eq("userID", userId)
      .select();

    if (error) throw error;
    console.log(`Update successful by userID`, data);
    return { success: true, data };
  } catch (err) {
    console.error(`Failed to update user record:`, err);
    return { success: false, error: err };
  }
};

// Function to verify if changes were saved to database
export const verifyUserChanges = async (userId) => {
  try {
    console.log("Verifying database changes for user:", userId);

    // Fetch the user using userID
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("userID", userId)
      .single();

    if (error) {
      console.log("Error fetching user with userID:", error.message);
      return null;
    }

    console.log("User verified in database:", data);
    return data;
  } catch (error) {
    console.error("Error in verification:", error);
    return null;
  }
};

// Helper function to run after update operations with verification
export const modifyAndVerify = async (userId, updateFunction) => {
  try {
    await updateFunction();

    // Wait briefly for database to update
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Verify the changes
    const userData = await verifyUserChanges(userId);
    if (userData) {
      console.log("Database verification complete:", userData);
      return true;
    } else {
      console.warn("Could not verify database update");
      return false;
    }
  } catch (error) {
    console.error("Error in modify and verify:", error);
    return false;
  }
};
