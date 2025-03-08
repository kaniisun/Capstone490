import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../../supabaseClient";
import { useAuth } from "../../../contexts/AuthContext";
import "./VerifySuccess.css";

function VerifySuccess() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userData, setUserData] = useState({ firstName: "", lastName: "" });
  const navigate = useNavigate();
  const { refreshSession } = useAuth();

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
          setError("User not found. Please try signing up again.");
          setLoading(false);
          return;
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
          storedUserData?.firstName || user.user_metadata?.firstName || "";
        const lastName =
          storedUserData?.lastName || user.user_metadata?.lastName || "";

        // Save the user data to state
        setUserData({
          firstName,
          lastName,
        });

        // Check if user data is already in the database
        const { data: existingUser, error: checkError } = await supabase
          .from("users")
          .select("*")
          .eq("userID", user.id)
          .single();

        if (checkError && checkError.code !== "PGRST116") {
          // PGRST116 means no rows returned
          throw checkError;
        }

        // If user doesn't exist in the users table yet, create them
        if (!existingUser) {
          // Insert the user data into the users table
          const { error: insertError } = await supabase.from("users").insert({
            userID: user.id,
            email: user.email,
            firstName: firstName,
            lastName: lastName,
            created_at: new Date().toISOString(),
          });

          if (insertError) {
            throw insertError;
          }

          // Clear the pending user data from session storage
          sessionStorage.removeItem("pendingUserData");
        }

        // Store user info in localStorage for the app
        localStorage.setItem("userName", firstName || "");
        localStorage.setItem("userEmail", user.email);
        localStorage.setItem("userId", user.id);
        localStorage.setItem("isLoggedIn", "true");

        // Initialize the session timeout
        refreshSession();

        setLoading(false);
      } catch (err) {
        console.error("Verification error:", err);
        setError(err.message);
        setLoading(false);
      }
    };

    handleVerification();
  }, [refreshSession]);

  const handleStartExploring = () => {
    navigate("/"); // Navigate to homepage
  };

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
          <button
            className="start-exploring-btn"
            onClick={handleStartExploring}
          >
            Start Exploring
          </button>
        </div>
      )}
    </div>
  );
}

export default VerifySuccess;
