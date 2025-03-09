import React, { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../../contexts/AuthContext";

// Protected route component that handles authentication and verification checks
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, isEmailVerified, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!loading) {
      if (!isAuthenticated) {
        // Store the attempted URL to redirect back after login
        sessionStorage.setItem("redirectAfterAuth", location.pathname);
        navigate("/login", { replace: true });
      } else if (!isEmailVerified) {
        navigate("/verify-email", { replace: true });
      }
    }
  }, [loading, isAuthenticated, isEmailVerified, navigate, location]);

  // Show loading state while checking auth
  if (loading) {
    return <div className="auth-loading">Loading...</div>;
  }

  // Only render children if authenticated and email is verified
  return isAuthenticated && isEmailVerified ? children : null;
};

export default ProtectedRoute;
