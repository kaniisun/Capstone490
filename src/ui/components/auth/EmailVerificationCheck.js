import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../../supabaseClient";
import { useAuth } from "../../../contexts/AuthContext";

// Component to check email verification status on app initialization
function EmailVerificationCheck({ children, location }) {
  const { isAuthenticated, checkEmailVerification, refreshSession } = useAuth();
  const [checkedVerification, setCheckedVerification] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Function to handle direct verification
    const processVerification = async () => {
      try {
        console.log("Processing verification state");

        // Check for verified parameter in URL which indicates direct email verification
        const queryParams = new URLSearchParams(location.search);
        const verified = queryParams.get("verified");

        // Get hash params that might contain the auth token
        const hashParams = new URLSearchParams(
          window.location.hash.replace(/^#/, "")
        );
        const accessToken = hashParams.get("access_token");
        const refreshToken = hashParams.get("refresh_token");
        const type = hashParams.get("type");

        // Handle direct verification from email link
        if (verified === "true" && !checkedVerification) {
          console.log("Detected direct verification from email");

          // If this is a verification confirmation
          if (type === "signup" || type === "recovery") {
            console.log("Processing email verification confirmation");

            try {
              // If we have tokens in the URL, set them first
              if (accessToken && refreshToken) {
                console.log("Setting session from URL tokens");
                const { data: sessionData, error: sessionError } =
                  await supabase.auth.setSession({
                    access_token: accessToken,
                    refresh_token: refreshToken,
                  });

                if (sessionError) {
                  console.error("Error setting session:", sessionError);
                  throw sessionError;
                }

                if (sessionData?.user) {
                  // Store necessary user info in localStorage
                  localStorage.setItem("isLoggedIn", "true");
                  localStorage.setItem("userId", sessionData.user.id);
                  localStorage.setItem("userEmail", sessionData.user.email);

                  // Get user profile data
                  const { data: userData } = await supabase
                    .from("users")
                    .select("firstName")
                    .eq("userID", sessionData.user.id)
                    .single();

                  if (userData?.firstName) {
                    localStorage.setItem("userName", userData.firstName);
                  }

                  // Force refresh the session
                  await refreshSession();

                  // Update verification status
                  await checkEmailVerification();

                  // Clear URL parameters without refreshing
                  window.history.replaceState({}, document.title, "/home");

                  // Navigate to home
                  navigate("/home", { replace: true });
                  return;
                }
              }

              // If no tokens in URL, try to get current session
              const {
                data: { session },
              } = await supabase.auth.getSession();

              if (session?.user) {
                // Update verification status
                await checkEmailVerification();

                // Navigate to home
                navigate("/home", { replace: true });
              } else {
                // If no session, redirect to login
                navigate("/login", { replace: true });
              }
            } catch (verificationError) {
              console.error(
                "Error processing verification:",
                verificationError
              );
              navigate("/login", { replace: true });
            }
          }
          setCheckedVerification(true);
        }
        // Regular check for already authenticated users
        else if (isAuthenticated && !checkedVerification) {
          await checkEmailVerification();
          setCheckedVerification(true);
        }
      } catch (err) {
        console.error("Error in verification process:", err);
        navigate("/login", { replace: true });
      }
    };

    processVerification();
  }, [
    isAuthenticated,
    checkEmailVerification,
    checkedVerification,
    location,
    refreshSession,
    navigate,
  ]);

  return children;
}

export default EmailVerificationCheck;
