import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "../../../contexts/AuthContext";
import EmailVerificationCheck from "../auth/EmailVerificationCheck";
import AppRoutes from "./AppRoutes";

function AppInitializer() {
  const location = useLocation();
  const { loading } = useAuth();
  const [appReady, setAppReady] = useState(false);

  // Wait for auth to be established before rendering app
  useEffect(() => {
    // Give auth system time to initialize before rendering routes
    if (!loading) {
      setAppReady(true);
    }
  }, [loading]);

  if (!appReady) {
    return <div className="auth-loading">Initializing app...</div>;
  }

  return (
    <EmailVerificationCheck location={location}>
      <AppRoutes />
    </EmailVerificationCheck>
  );
}

export default AppInitializer;
