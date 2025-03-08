//signup.js
//This is the signup component that allows the user to sign up for an account with email verification

import React, { useState, useEffect } from "react";
import { supabase } from "../../../supabaseClient";
import { testSupabaseConnection } from "../../../supabaseClient";
import { Link } from "react-router-dom";
import "./SignUp.css"; // We'll add the CSS here

//This is the signup component that allows the user to sign up for an account
function SignUp() {
  // State for form fields
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState(null);
  const [verificationSent, setVerificationSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState("unknown");

  // Check connection status on component mount
  useEffect(() => {
    const checkConnection = async () => {
      const result = await testSupabaseConnection();
      setConnectionStatus(result.success ? "connected" : "error");

      if (!result.success) {
        console.error("Connection error during component mount:", result.error);
      }
    };

    checkConnection();
  }, []);

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setVerificationSent(false);
    setLoading(true);

    // Validate email (must end with @uncg.edu)
    if (!email.endsWith("@uncg.edu")) {
      setError("Only @uncg.edu email addresses are allowed.");
      setLoading(false);
      return;
    }

    // Validate passwords match
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      setLoading(false);
      return;
    }

    // Test connection before proceeding
    try {
      const connectionTest = await testSupabaseConnection();
      if (!connectionTest.success) {
        setError(
          "Unable to connect to the server. Please check your internet connection and try again later."
        );
        setLoading(false);
        return;
      }
    } catch (err) {
      console.error("Connection test failed:", err);
      setError(
        "Unable to establish a connection to our servers. Please try again later."
      );
      setLoading(false);
      return;
    }

    try {
      console.log("Attempting to sign up user with email:", email);

      // Sign up user with Supabase Auth and enable email confirmation
      const result = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            firstName,
            lastName,
          },
          emailRedirectTo: window.location.origin + "/verify-success",
        },
      });

      const { data, error: authError } = result;

      if (authError) {
        console.error("Supabase auth error:", authError);

        // Handle email duplication errors specially
        if (
          authError.message &&
          authError.message.includes("already registered")
        ) {
          setError(
            "This email is already registered. Please use a different email or try to log in."
          );
          setLoading(false);
          return;
        }

        throw authError;
      }

      console.log("Sign up response received:", data);

      if (!data || !data.user) {
        console.error("No user data received from signup");
        throw new Error(
          "Failed to create user account. Please try again later."
        );
      }

      // Store user data in sessionStorage for later insertion after verification
      sessionStorage.setItem(
        "pendingUserData",
        JSON.stringify({
          email,
          firstName,
          lastName,
        })
      );

      // We don't insert the user data into the users table yet
      // This will happen after email verification

      setVerificationSent(true);
      // Clear form after sending verification
      setFirstName("");
      setLastName("");
      setEmail("");
      setPassword("");
      setConfirmPassword("");
    } catch (err) {
      console.error("Registration error:", err);

      // Handle different types of errors with more specific messages
      if (!err) {
        setError("An unknown error occurred. Please try again later.");
      } else if (typeof err.message !== "string") {
        setError("Unexpected error format. Please try again later.");
      } else if (
        err.message.includes("fetch") ||
        err.message.includes("network") ||
        err.message.includes("Failed to fetch")
      ) {
        setError(
          "Connection issue: Please check your internet connection and try again. If the problem persists, please try again later."
        );
      } else if (err.message.includes("CORS")) {
        setError(
          "Browser security error: Please try using a different browser or try again later."
        );
      } else if (err.message.includes("timeout")) {
        setError(
          "Request timeout: The server took too long to respond. Please try again later."
        );
      } else {
        setError(
          err.message || "An unexpected error occurred. Please try again later."
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="form" onSubmit={handleSubmit}>
      <p className="title">Register</p>
      <p className="message">Signup now and get full access to our app.</p>

      {connectionStatus === "error" && (
        <div className="connection-error">
          Server connection issues detected. Registration may not work properly.
        </div>
      )}

      <div className="flex">
        <label>
          <input
            required
            placeholder=""
            type="text"
            className="input"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            disabled={loading}
          />
          <span>Firstname</span>
        </label>
        <label>
          <input
            required
            placeholder=""
            type="text"
            className="input"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            disabled={loading}
          />
          <span>Lastname</span>
        </label>
      </div>
      <label>
        <input
          required
          placeholder=""
          type="email"
          className="input"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={loading}
        />
        <span>Email</span>
      </label>
      <label>
        <input
          required
          placeholder=""
          type="password"
          className="input"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={loading}
          minLength={6}
        />
        <span>Password</span>
      </label>
      <label>
        <input
          required
          placeholder=""
          type="password"
          className="input"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          disabled={loading}
          minLength={6}
        />
        <span>Confirm password</span>
      </label>
      <button className="submit" type="submit" disabled={loading}>
        {loading ? "Processing..." : "Submit"}
      </button>
      <p className="signin">
        Already have an account? <Link to="/login">Sign in</Link>
      </p>
      {error && <div className="error-message">{error}</div>}
      {verificationSent && (
        <div className="verification-message">
          <p style={{ color: "green" }}>
            A verification email has been sent to your email.
          </p>
          <p>
            Please check your inbox and click the verification link to complete
            your registration.
          </p>
        </div>
      )}
    </form>
  );
}

export default SignUp;
