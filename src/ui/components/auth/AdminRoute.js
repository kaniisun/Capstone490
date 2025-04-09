import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../../contexts/AuthContext";
import { supabase } from "../../../supabaseClient";
import {
  CircularProgress,
  Box,
  Typography,
  Alert,
  Button,
} from "@mui/material";

// AdminRoute component that handles authentication and admin status checks with enhanced security
const AdminRoute = ({ children }) => {
  const {
    isAuthenticated,
    isEmailVerified,
    isAdmin,
    user,
    userRole,
    refreshUserData,
    loading,
  } = useAuth();
  const [verifyingAdmin, setVerifyingAdmin] = useState(true);
  const [adminVerified, setAdminVerified] = useState(false);
  const [error, setError] = useState(null);
  const [debugInfo, setDebugInfo] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const navigate = useNavigate();
  const location = useLocation();

  // Function to handle retrying admin verification
  const handleRetry = async () => {
    setError(null);
    setVerifyingAdmin(true);
    setRetryCount((prev) => prev + 1);

    // First try to refresh user data from context
    try {
      const result = await refreshUserData();
      console.log("User data refresh result:", result);
    } catch (err) {
      console.error("Error refreshing user data:", err);
    }

    // Then try verification again - the useEffect will handle this
  };

  // Double-check admin status directly with the database for additional security
  useEffect(() => {
    const verifyAdminStatus = async () => {
      // Skip verification if we don't have the prerequisites
      if (!isAuthenticated || !isEmailVerified || loading) {
        console.log("Prerequisites not met for admin verification:", {
          isAuthenticated,
          isEmailVerified,
          loading,
        });
        setVerifyingAdmin(false);
        return;
      }

      // Save debug info about current state
      const debug = {
        userInfo: user
          ? {
              id: user.id,
              email: user.email,
              metadata: user.user_metadata || {},
            }
          : null,
        contextIsAdmin: isAdmin,
        contextUserRole: userRole,
        retryAttempt: retryCount,
      };
      setDebugInfo(debug);
      console.log("Admin verification state:", debug);

      // Only proceed with database check if we have user and admin flag is true
      if (isAdmin && user) {
        try {
          console.log(
            `Verifying admin role for user ${user.id} (${user.email})`
          );

          // Directly query database to verify admin status
          // Using destructuring syntax properly to avoid "body stream already read" error
          const { data, error } = await supabase
            .from("users")
            .select("role, userID, email")
            .eq("userID", user.id)
            .single();

          if (error) {
            console.error("Error verifying admin status:", error);
            setDebugInfo((prev) => ({ ...prev, dbError: error }));
            setError("Failed to verify admin status. Please try again later.");
            setAdminVerified(false);
            setVerifyingAdmin(false);
            return;
          }

          // Log what we found
          console.log("Database verification result:", data);
          setDebugInfo((prev) => ({ ...prev, dbData: data }));

          // Verify that the user's role in the database is actually 'admin'
          const isActuallyAdmin = data && data.role === "admin";
          setAdminVerified(isActuallyAdmin);

          if (!isActuallyAdmin) {
            console.error(
              "User claimed to be admin but database verification failed",
              { expected: "admin", found: data?.role }
            );
            setError(
              "Your admin privileges could not be verified. Database shows your role as: " +
                (data?.role || "undefined")
            );
          } else {
            console.log("Successfully verified admin status for user", user.id);
            // Clear any previous errors on success
            setError(null);
          }
        } catch (err) {
          console.error("Exception during admin verification:", err);
          setDebugInfo((prev) => ({ ...prev, exception: err.message }));
          setError(`Failed to verify admin status: ${err.message}`);
          setAdminVerified(false);
        } finally {
          setVerifyingAdmin(false);
        }
      } else {
        // User is not an admin according to context
        console.log(
          "Admin verification skipped - user is not an admin according to AuthContext"
        );
        setVerifyingAdmin(false);
        setAdminVerified(false);
        if (user && !isAdmin) {
          setError("You don't have admin privileges.");
        }
      }
    };

    verifyAdminStatus();
  }, [
    loading,
    isAuthenticated,
    isEmailVerified,
    isAdmin,
    user,
    userRole,
    retryCount,
    refreshUserData,
  ]);

  // Handle navigation based on authentication and admin status
  useEffect(() => {
    if (!loading && !verifyingAdmin) {
      if (!isAuthenticated) {
        // Store the attempted URL to redirect back after login
        sessionStorage.setItem("redirectAfterAuth", location.pathname);
        navigate("/login", { replace: true });
      } else if (!isEmailVerified) {
        navigate("/verify-email", { replace: true });
      } else if (!isAdmin || !adminVerified) {
        // Only redirect after a delay to allow user to see error message
        if (error) {
          setTimeout(() => {
            navigate("/home", { replace: true });
          }, 5000);
        } else {
          navigate("/home", { replace: true });
        }
      }
    }
  }, [
    loading,
    verifyingAdmin,
    isAuthenticated,
    isEmailVerified,
    isAdmin,
    adminVerified,
    navigate,
    location,
    error,
  ]);

  // Show enhanced loading state
  if (loading || verifyingAdmin) {
    return (
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "60vh",
          p: 3,
        }}
      >
        <CircularProgress size={40} />
        <Typography variant="h6" sx={{ mt: 2 }}>
          Verifying admin credentials...
        </Typography>
      </Box>
    );
  }

  // Show error state if admin verification failed
  if (error) {
    return (
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "60vh",
          p: 3,
        }}
      >
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
        <Box sx={{ mb: 2, mt: 2 }}>
          <Button
            variant="contained"
            color="primary"
            onClick={handleRetry}
            sx={{ mr: 2 }}
          >
            Retry Verification
          </Button>
          <Button variant="outlined" onClick={() => navigate("/home")}>
            Return to Home
          </Button>
        </Box>
        <Typography variant="body2" sx={{ mt: 2, color: "text.secondary" }}>
          You will be redirected to home in 5 seconds...
        </Typography>
        {debugInfo && (
          <Box
            sx={{
              mt: 3,
              p: 2,
              border: "1px dashed grey",
              borderRadius: 1,
              maxWidth: "100%",
              overflow: "auto",
            }}
          >
            <Typography
              variant="caption"
              sx={{ fontFamily: "monospace", whiteSpace: "pre-wrap" }}
            >
              Debug Info: {JSON.stringify(debugInfo, null, 2)}
            </Typography>
          </Box>
        )}
      </Box>
    );
  }

  // Only render children if authenticated, email verified, and user is admin
  return isAuthenticated && isEmailVerified && isAdmin && adminVerified
    ? children
    : null;
};

export default AdminRoute;
