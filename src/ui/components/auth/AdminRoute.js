import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../../contexts/AuthContext";
import { supabase } from "../../../supabaseClient";
import { CircularProgress, Box, Typography, Alert } from "@mui/material";

// AdminRoute component that handles authentication and admin status checks with enhanced security
const AdminRoute = ({ children }) => {
  const { isAuthenticated, isEmailVerified, isAdmin, user, loading } =
    useAuth();
  const [verifyingAdmin, setVerifyingAdmin] = useState(true);
  const [adminVerified, setAdminVerified] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();

  // Double-check admin status directly with the database for additional security
  useEffect(() => {
    const verifyAdminStatus = async () => {
      if (!loading && isAuthenticated && isEmailVerified && isAdmin && user) {
        try {
          // Directly query database to verify admin status
          const { data, error } = await supabase
            .from("users")
            .select("role")
            .eq("userID", user.id)
            .single();

          if (error) throw error;

          // Verify that the user's role in the database is actually 'admin'
          const isActuallyAdmin = data && data.role === "admin";
          setAdminVerified(isActuallyAdmin);

          if (!isActuallyAdmin) {
            console.error(
              "User claimed to be admin but database verification failed"
            );
            setError("Your admin privileges could not be verified.");
          }
        } catch (err) {
          console.error("Error verifying admin status:", err);
          setError("Failed to verify admin status. Please try again later.");
          setAdminVerified(false);
        } finally {
          setVerifyingAdmin(false);
        }
      } else {
        setVerifyingAdmin(false);
        setAdminVerified(false);
      }
    };

    verifyAdminStatus();
  }, [loading, isAuthenticated, isEmailVerified, isAdmin, user]);

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
        // Redirect non-admin users to home with a delay for better UX
        setTimeout(() => {
          navigate("/home", { replace: true });
        }, 1500);
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
        <Typography variant="body1">Redirecting to home...</Typography>
      </Box>
    );
  }

  // Only render children if authenticated, email verified, and user is admin
  return isAuthenticated && isEmailVerified && isAdmin && adminVerified
    ? children
    : null;
};

export default AdminRoute;
