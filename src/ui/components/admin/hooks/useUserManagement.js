import { useState } from "react";
import { supabase } from "../../../../supabaseClient";
import API_CONFIG from "../../../../config/api.js";

export const useUserManagement = (
  setSnackbar,
  fetchAdminData,
  users,
  setUsers
) => {
  // Edit user dialog state
  const [editUserDialogOpen, setEditUserDialogOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [editedUser, setEditedUser] = useState({
    firstName: "",
    lastName: "",
    email: "",
    role: "",
    accountStatus: "",
  });

  // Open the edit user dialog
  const handleOpenEditUserDialog = (user) => {
    setCurrentUser(user);
    setEditedUser({
      firstName: user.firstName || "",
      lastName: user.lastName || "",
      email: user.email || "",
      role: user.role || "user",
      accountStatus: user.accountStatus || "active",
    });
    setEditUserDialogOpen(true);
  };

  // Close the edit user dialog
  const handleCloseEditUserDialog = () => {
    setEditUserDialogOpen(false);
    setCurrentUser(null);
    setEditedUser({
      firstName: "",
      lastName: "",
      email: "",
      role: "",
      accountStatus: "",
    });
  };

  // Handle changes to the edited user data
  const handleEditUserInputChange = (e) => {
    const { name, value } = e.target;
    setEditedUser((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Helper function to handle API calls with fallback
  const apiCall = async (endpoint, data) => {
    // Try through the proxy first (default)
    try {
      console.log(`Attempting API call to ${endpoint} via proxy...`);
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${
            (await supabase.auth.getSession()).data.session?.access_token || ""
          }`,
        },
        body: JSON.stringify(data),
      });

      // Always read the response body as text first to avoid "body stream already read" errors
      const responseText = await response.text();

      // Try to parse the response as JSON
      let result;
      try {
        result = JSON.parse(responseText);
      } catch (parseError) {
        // If parsing fails, check if we got HTML instead of JSON
        if (
          responseText.includes("<!DOCTYPE html>") ||
          responseText.includes("<html>")
        ) {
          console.warn(
            `Received HTML response instead of JSON from ${endpoint}`
          );
          throw new Error("Received HTML response instead of JSON");
        }
        // Otherwise, it's some other parsing error
        throw new Error(`Failed to parse response: ${parseError.message}`);
      }

      // Check for errors in the parsed response
      if (!response.ok) {
        throw new Error(`API call failed with status: ${response.status}`);
      }

      return result;
    } catch (error) {
      console.warn(`Proxy API call to ${endpoint} failed:`, error.message);
      console.warn("Attempting direct API call to backend server...");

      // Try direct call to the backend as fallback
      try {
        const directUrl = API_CONFIG.getUrl(endpoint);
        console.log(`Trying direct API call to ${directUrl}...`);

        const directResponse = await fetch(directUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${
              (await supabase.auth.getSession()).data.session?.access_token ||
              ""
            }`,
          },
          body: JSON.stringify(data),
        });

        // Always read the response body as text first
        const directResponseText = await directResponse.text();

        // Try to parse the response as JSON
        let directResult;
        try {
          directResult = JSON.parse(directResponseText);
        } catch (parseError) {
          console.error(
            `Failed to parse direct response: ${parseError.message}`
          );
          throw new Error(
            `Failed to parse direct response: ${parseError.message}`
          );
        }

        // Check for errors in the parsed response
        if (!directResponse.ok) {
          throw new Error(
            `Direct API call failed with status: ${directResponse.status}`
          );
        }

        console.log(`Direct API call succeeded:`, directResult);
        return directResult;
      } catch (directError) {
        console.error(
          `Direct API call to ${endpoint} also failed:`,
          directError.message
        );
        throw directError;
      }
    }
  };

  // Save the edited user
  const handleSaveEditedUser = async () => {
    if (!currentUser || !currentUser.userID) {
      setSnackbar({
        open: true,
        message: "Error: User ID not found",
        severity: "error",
      });
      return;
    }

    try {
      // Check if account status is being changed
      const statusChanged =
        currentUser.accountStatus !== editedUser.accountStatus;

      // Check if role is being changed
      const roleChanged = currentUser.role !== editedUser.role;

      // Update user info through API for fields like firstName, lastName, email
      const { error: updateError } = await supabase
        .from("users")
        .update({
          firstName: editedUser.firstName,
          lastName: editedUser.lastName,
          email: editedUser.email,
          modified_at: new Date().toISOString(),
        })
        .eq("userID", currentUser.userID);

      if (updateError) throw updateError;

      // If account status changed, use the API to enforce it (bypass RLS)
      if (statusChanged) {
        const statusResult = await apiCall("/api/enforce-account-status", {
          userId: currentUser.userID,
          accountStatus: editedUser.accountStatus,
        });

        if (statusResult.error) {
          console.warn("Status update warning:", statusResult.error);
        }
      }

      // If role changed, use the API to update it (bypass RLS)
      if (roleChanged) {
        const isAdmin = editedUser.role === "admin";
        const roleResult = await apiCall("/api/update-user-role", {
          userId: currentUser.userID,
          role: editedUser.role,
          isAdmin,
        });

        if (roleResult.error) {
          console.warn("Role update warning:", roleResult.error);
        }
      }

      // Update local state
      const updatedUsers = users.map((user) =>
        user.userID === currentUser.userID
          ? {
              ...user,
              firstName: editedUser.firstName,
              lastName: editedUser.lastName,
              email: editedUser.email,
              role: roleChanged ? editedUser.role : user.role,
              accountStatus: statusChanged
                ? editedUser.accountStatus
                : user.accountStatus,
              modified_at: new Date().toISOString(),
            }
          : user
      );

      setUsers(updatedUsers);

      // Show success message
      setSnackbar({
        open: true,
        message: "User updated successfully",
        severity: "success",
      });

      // Close the dialog
      handleCloseEditUserDialog();
    } catch (error) {
      console.error("Error updating user:", error);
      setSnackbar({
        open: true,
        message: `Error updating user: ${error.message}`,
        severity: "error",
      });
    }
  };

  // Soft delete a user (set accountStatus to inactive)
  const handleSoftDeleteUser = async (user) => {
    if (!user || !user.userID) return;

    try {
      // Use the API to soft delete the user (bypasses RLS)
      const result = await apiCall("/api/soft-delete", {
        userId: user.userID,
      });

      if (!result.success) {
        throw new Error(result.error || "Failed to soft delete user");
      }

      // Update local state
      const updatedUsers = users.map((u) =>
        u.userID === user.userID
          ? {
              ...u,
              accountStatus: "inactive",
              modified_at: new Date().toISOString(),
            }
          : u
      );

      setUsers(updatedUsers);

      // Show success message
      setSnackbar({
        open: true,
        message: `User ${user.firstName} ${user.lastName} has been soft deleted`,
        severity: "success",
      });
    } catch (error) {
      console.error("Error soft deleting user:", error);
      setSnackbar({
        open: true,
        message: `Error soft deleting user: ${error.message}`,
        severity: "error",
      });
    }
  };

  // Reinstate a user (set accountStatus to active)
  const handleReinstateUser = async (user) => {
    if (!user || !user.userID) return;

    try {
      // Use the API to reinstate the user (bypasses RLS)
      const result = await apiCall("/api/reinstate", {
        userId: user.userID,
      });

      if (!result.success) {
        throw new Error(result.error || "Failed to reinstate user");
      }

      // Update local state
      const updatedUsers = users.map((u) =>
        u.userID === user.userID
          ? {
              ...u,
              accountStatus: "active",
              modified_at: new Date().toISOString(),
            }
          : u
      );

      setUsers(updatedUsers);

      // Show success message
      setSnackbar({
        open: true,
        message: `User ${user.firstName} ${user.lastName} has been reinstated`,
        severity: "success",
      });
    } catch (error) {
      console.error("Error reinstating user:", error);
      setSnackbar({
        open: true,
        message: `Error reinstating user: ${error.message}`,
        severity: "error",
      });
    }
  };

  // Promote user to admin (set role to admin)
  const handlePromoteToAdmin = async (user) => {
    if (!user || !user.userID) return;

    try {
      // Check if user is already an admin
      if (user.role === "admin") {
        setSnackbar({
          open: true,
          message: `${user.firstName} ${user.lastName} is already an admin`,
          severity: "info",
        });
        return;
      }

      // Use the API to promote the user to admin (bypasses RLS)
      const result = await apiCall("/api/make-admin", {
        userId: user.userID,
      });

      if (!result.success) {
        throw new Error(result.error || "Failed to promote user to admin");
      }

      // Update local state
      const updatedUsers = users.map((u) =>
        u.userID === user.userID
          ? {
              ...u,
              role: "admin",
              modified_at: new Date().toISOString(),
            }
          : u
      );

      setUsers(updatedUsers);

      // Show success message
      setSnackbar({
        open: true,
        message: `${user.firstName} ${user.lastName} has been promoted to admin`,
        severity: "success",
      });
    } catch (error) {
      console.error("Error promoting user to admin:", error);
      setSnackbar({
        open: true,
        message: `Error promoting user to admin: ${error.message}`,
        severity: "error",
      });
    }
  };

  // Revoke admin privileges (set role to user)
  const handleRevokeAdminPrivileges = async (user) => {
    if (!user || !user.userID) return;

    try {
      // Check if user is already a regular user
      if (user.role !== "admin") {
        setSnackbar({
          open: true,
          message: `${user.firstName} ${user.lastName} is not an admin`,
          severity: "info",
        });
        return;
      }

      // Use the API to update the user role (bypasses RLS)
      const result = await apiCall("/api/update-user-role", {
        userId: user.userID,
        role: "user",
        isAdmin: false,
      });

      if (result.error) {
        throw new Error(result.error);
      }

      // Update local state
      const updatedUsers = users.map((u) =>
        u.userID === user.userID
          ? {
              ...u,
              role: "user",
              modified_at: new Date().toISOString(),
            }
          : u
      );

      setUsers(updatedUsers);

      // Show success message
      setSnackbar({
        open: true,
        message: `Admin privileges have been revoked from ${user.firstName} ${user.lastName}`,
        severity: "success",
      });
    } catch (error) {
      console.error("Error revoking admin privileges:", error);
      setSnackbar({
        open: true,
        message: `Error revoking admin privileges: ${error.message}`,
        severity: "error",
      });
    }
  };

  // For backward compatibility with existing code
  const handleSuspendUser = handleSoftDeleteUser;
  const handleUnsuspendUser = handleReinstateUser;

  return {
    // Dialog state
    editUserDialogOpen,
    currentUser,
    editedUser,

    // Dialog handlers
    handleOpenEditUserDialog,
    handleCloseEditUserDialog,
    handleEditUserInputChange,
    handleSaveEditedUser,

    // User management actions
    handleSoftDeleteUser,
    handleReinstateUser,
    handlePromoteToAdmin,
    handleRevokeAdminPrivileges,

    // Backward compatibility
    handleSuspendUser,
    handleUnsuspendUser,
  };
};
