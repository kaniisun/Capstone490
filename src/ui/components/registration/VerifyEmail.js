import React, { useState, useEffect } from "react";
import { supabase } from "../../../supabaseClient";
import { Link } from "react-router-dom";
import "./VerifyEmail.css";

/**
 * Component displayed when a user needs to verify their email
 * Shows instructions and provides option to resend verification email
 */
function VerifyEmail() {
  const [resendStatus, setResendStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");

  // Retrieve email from session storage on component mount
  useEffect(() => {
    const storedEmail = sessionStorage.getItem("verificationEmail");
    if (storedEmail) {
      setEmail(storedEmail);
    }
  }, []);

  // Handler for resending verification email
  const handleResendVerification = async (e) => {
    e.preventDefault();

    if (!email || !email.includes("@")) {
      setResendStatus("Please enter a valid email address");
      return;
    }

    setLoading(true);
    setResendStatus("");

    try {
      // Request Supabase to resend verification email
      const { error } = await supabase.auth.resend({
        type: "signup",
        email,
        options: {
          emailRedirectTo: window.location.origin + "/verify-success",
        },
      });

      if (error) {
        throw error;
      }

      setResendStatus("Verification email sent! Please check your inbox.");
    } catch (error) {
      console.error("Error resending verification email:", error.message);
      setResendStatus(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="verify-email-container">
      <div className="verify-email-card">
        <h1>Verify Your Email</h1>

        <div className="verify-email-info">
          <p>A verification email has been sent to your email address.</p>
          <p>
            Please check your inbox and click the verification link to activate
            your account.
          </p>
          <p>If you don't see the email, check your spam/junk folder.</p>
        </div>

        <div className="resend-form">
          <h3>Didn't receive an email?</h3>
          <form onSubmit={handleResendVerification}>
            <div className="input-group">
              <label htmlFor="email">Your Email Address</label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                required
              />
            </div>

            <button type="submit" className="resend-button" disabled={loading}>
              {loading ? "Sending..." : "Resend Verification Email"}
            </button>

            {resendStatus && (
              <div
                className={
                  resendStatus.includes("Error")
                    ? "error-message"
                    : "success-message"
                }
              >
                {resendStatus}
              </div>
            )}
          </form>
        </div>

        <div className="verify-email-footer">
          <Link to="/login" className="back-to-login">
            Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
}

export default VerifyEmail;
