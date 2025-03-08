//login.js
//This is the login component that allows the user to sign in to their account

import React, { useState, useEffect } from "react";
import { supabase } from "../../../supabaseClient";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../../contexts/AuthContext";
import "./Login.css";

//This is the login component that allows the user to sign in to their account
function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { isAuthenticated, refreshSession } = useAuth();

  // Redirect if already logged in
  useEffect(() => {
    if (isAuthenticated) {
      navigate("/");
    }
  }, [isAuthenticated, navigate]);

  // Function to clear any existing auth data
  const clearExistingAuthData = () => {
    localStorage.removeItem("userName");
    localStorage.removeItem("userEmail");
    localStorage.removeItem("userId");
    localStorage.removeItem("isLoggedIn");
    localStorage.removeItem("sessionExpiration");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // Clear any existing auth data before login attempt
      clearExistingAuthData();

      // First sign out to ensure we're starting fresh
      await supabase.auth.signOut();

      // Validate email format
      if (!email.includes("@")) {
        setError("Please enter a valid email address");
        setLoading(false);
        return;
      }

      // Sign in with Supabase
      const { data: authData, error: authError } =
        await supabase.auth.signInWithPassword({
          email,
          password,
        });

      if (authError) {
        // Network error handling
        if (
          authError.message.includes("fetch") ||
          authError.message.includes("network")
        ) {
          throw new Error(
            "Network connection error. Please check your internet connection and try again."
          );
        }

        // Handle specific auth errors
        if (authError.message.includes("Invalid login")) {
          setError("Incorrect email or password");
        } else {
          setError(authError.message);
        }
        setLoading(false);
        return;
      }

      if (!authData || !authData.user) {
        throw new Error("Failed to authenticate. Please try again later.");
      }

      // Get user profile
      const { data: profile, error: profileError } = await supabase
        .from("users")
        .select("firstName")
        .eq("userID", authData.user.id)
        .single();

      if (profileError) {
        setError("Error fetching user profile. Please try again.");
        setLoading(false);
        return;
      }

      // Store user info
      localStorage.setItem("userName", profile.firstName);
      localStorage.setItem("userEmail", email);
      localStorage.setItem("userId", authData.user.id);
      localStorage.setItem("isLoggedIn", "true");

      // Initialize the session timeout
      refreshSession();

      // Navigate to home page
      navigate("/");
    } catch (err) {
      console.error("Login error:", err);
      setError(
        err.message || "An unexpected error occurred. Please try again later."
      );
      setLoading(false);
    }
  };

  //Render the login form
  return (
    <form className="form" onSubmit={handleSubmit}>
      <p className="form-title">Sign in to your account</p>
      <div className="input-container">
        <input
          type="email"
          placeholder="Enter your UNCG email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          disabled={loading}
        />
      </div>
      <div className="input-container">
        <input
          type="password"
          placeholder="Enter password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          disabled={loading}
          minLength={6}
        />
      </div>
      {error && <p className="error-message">{error}</p>}
      <button type="submit" className="submit" disabled={loading}>
        {loading ? "Signing in..." : "Sign in"}
      </button>
      <p className="signup-link">
        No account?
        <Link to="/register"> Sign up</Link>
      </p>
    </form>
  );
}

export default Login;
