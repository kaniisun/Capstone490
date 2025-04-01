import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../../supabaseClient";
import { useAuth } from "../../../contexts/AuthContext";
import "./VerifySuccess.css";
import { updateVerificationStatus } from "../../../utils/supabaseHelpers";

function VerifySuccess() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userData, setUserData] = useState({ firstName: "", lastName: "" });
  const [verificationComplete, setVerificationComplete] = useState(false);
  const navigate = useNavigate();
  const { refreshSession, checkEmailVerification } = useAuth();

  useEffect(() => {
    // Function to handle the verification success
    const handleVerification = async () => {
      try {
        setLoading(true);

        // Get the current authenticated user
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError) {
          throw userError;
        }

        if (!user) {
          // Try to get session from URL
          const hashParams = new URLSearchParams(
            window.location.hash.substr(1)
          );
          const accessToken = hashParams.get("access_token");

          if (accessToken) {
            // Set the session with the access token
            const { data, error: sessionError } =
              await supabase.auth.setSession({
                access_token: accessToken,
                refresh_token: hashParams.get("refresh_token"),
              });

            if (sessionError) throw sessionError;

            if (data?.user) {
              // Successfully got the user with the access token
              // Continue with this user
              console.log("User retrieved from URL hash params");
            } else {
              setError(
                "Unable to retrieve user information. Please try logging in."
              );
              setLoading(false);
              return;
            }
          } else {
            setError("User not found. Please try signing up again.");
            setLoading(false);
            return;
          }
        }

        // Get the user again after potentially setting the session
        const {
          data: { user: currentUser },
        } = await supabase.auth.getUser();

        if (!currentUser) {
          setError(
            "Unable to retrieve user information. Please try logging in."
          );
          setLoading(false);
          return;
        }

        // Check if email is verified
        if (!currentUser.email_confirmed_at) {
          setError(
            "Your email doesn't appear to be verified yet. Please check your inbox and click the verification link."
          );
          setLoading(false);
          return;
        }

        // Explicitly update verification status in Supabase
        try {
          const result = await updateVerificationStatus();
          if (!result.success) {
            console.warn(
              "Note: Could not update verification status in Supabase database:",
              result.error
            );
            // Continue anyway since the user is verified in Auth
          }
        } catch (verificationErr) {
          console.warn("Error updating verification status:", verificationErr);
          // Continue anyway
        }

        // Try to get the user data from session storage first
        let storedUserData = null;
        try {
          storedUserData = JSON.parse(
            sessionStorage.getItem("pendingUserData")
          );
        } catch (e) {
          // Session storage data might not be available
        }

        // Use data from user metadata as fallback
        const firstName =
          storedUserData?.firstName ||
          currentUser.user_metadata?.firstName ||
          "";
        const lastName =
          storedUserData?.lastName || currentUser.user_metadata?.lastName || "";

        // Save the user data to state
        setUserData({
          firstName,
          lastName,
        });

        // Check if user data is already in the database
        const { data: existingUser, error: checkError } = await supabase
          .from("users")
          .select("*")
          .eq("userID", currentUser.id)
          .single();

        if (checkError && checkError.code !== "PGRST116") {
          // PGRST116 means no rows returned
          throw checkError;
        }

        // If user doesn't exist in the users table yet, create them
        if (!existingUser) {
          // Insert the user data into the users table
          const { error: insertError } = await supabase.from("users").insert({
            userID: currentUser.id,
            email: currentUser.email,
            firstName: firstName,
            lastName: lastName,
            created_at: new Date().toISOString(),
            accountStatus: "active", // Set account to active on email verification
          });

          if (insertError) {
            throw insertError;
          }

          // Clear the pending user data from session storage
          sessionStorage.removeItem("pendingUserData");
        } else if (existingUser.accountStatus !== "active") {
          // If user exists but is not active, update their status
          const { error: updateError } = await supabase
            .from("users")
            .update({ accountStatus: "active" })
            .eq("userID", currentUser.id);

          if (updateError) {
            console.error("Error updating account status:", updateError);
          }
        }

        // Store user info in localStorage for the app
        localStorage.setItem("userName", firstName || "");
        localStorage.setItem("userEmail", currentUser.email);
        localStorage.setItem("userId", currentUser.id);
        localStorage.setItem("isLoggedIn", "true");

        // Make sure email verification status is set
        await checkEmailVerification();

        // Initialize the session timeout
        refreshSession();

        setVerificationComplete(true);
        setLoading(false);
      } catch (err) {
        console.error("Verification error:", err);
        setError(err.message);
        setLoading(false);
      }
    };

    handleVerification();
  }, [refreshSession, checkEmailVerification, navigate]);

  const handleStartExploring = () => {
    navigate("/home"); // Navigate to home page instead of root
  };

  // Automatically redirect after a short delay when verification is complete
  useEffect(() => {
    if (verificationComplete) {
      // Show the success message for 3 seconds before redirecting
      const redirectTimer = setTimeout(() => {
        navigate("/home"); // Redirect to home page instead of root
      }, 3000);

      return () => clearTimeout(redirectTimer);
    }
  }, [verificationComplete, navigate]);

  return (
    <div className="verification-success-container">
      {loading ? (
        <div className="loading">
          <h2>Finalizing your account...</h2>
          <div className="spinner"></div>
        </div>
      ) : error ? (
        <div className="error-message">
          <h2>Verification Error</h2>
          <p>{error}</p>
          <button onClick={() => navigate("/register")}>Try Again</button>
        </div>
      ) : (
        <div className="success-message">
          <h1>Verification Successful!</h1>
          <p>Your email has been verified and your account is now active.</p>
          <p>
            Welcome{userData.firstName ? ` ${userData.firstName}` : ""} to the
            Spartan Marketplace!
          </p>
          <p className="redirect-message">
            You will be automatically redirected to the home page in a few
            seconds...
          </p>
          <button
            className="start-exploring-btn"
            onClick={handleStartExploring}
          >
            Start Exploring Now
          </button>
        </div>
      )}
    </div>
  );
}

export default VerifySuccess;
