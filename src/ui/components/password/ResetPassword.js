import React, { useState } from "react";
import { supabase } from "../../../supabaseClient";
import { Link } from "react-router-dom";
import "./ResetPassword.css"; // We'll create this next

function ResetPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);

    // Validate that the email ends with @uncg.edu
    if (!email.endsWith("@uncg.edu")) {
      setError("Please enter a valid @uncg.edu email address.");
      setLoading(false);
      return;
    }

    try {
      // Send password reset email via Supabase
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + "/update-password",
      });

      if (error) {
        throw error;
      }

      // Success message
      setMessage("Password reset instructions have been sent to your email.");
      setEmail("");
    } catch (err) {
      console.error("Password reset error:", err);
      setError(
        err.message || "Failed to send reset instructions. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="reset-password-container">
      <form className="reset-form" onSubmit={handleSubmit}>
        <h2 className="reset-title">Reset Your Password</h2>
        <p className="reset-message">
          Enter your UNCG email address and we'll send you instructions to reset
          your password.
        </p>

        <div className="input-field">
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your @uncg.edu email"
            required
            disabled={loading}
          />
        </div>

        {error && <div className="error-message">{error}</div>}
        {message && <div className="success-message">{message}</div>}

        <button type="submit" className="reset-button" disabled={loading}>
          {loading ? "Sending..." : "Send Reset Instructions"}
        </button>

        <div className="links">
          <Link to="/login" className="back-link">
            Back to Login
          </Link>
        </div>
      </form>
    </div>
  );
}

export default ResetPassword;
