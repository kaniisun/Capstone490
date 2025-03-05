import React, { useState } from "react";
import { supabase } from "../../../supabaseClient";
import { useNavigate, Link } from "react-router-dom";
import "./Login.css";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // Sign in with Supabase
      const { data: authData, error: authError } =
        await supabase.auth.signInWithPassword({
          email,
          password,
        });

      if (authError) {
        setError("Incorrect email or password");
        setLoading(false);
        return;
      }

      // Get user profile
      const { data: profile, error: profileError } = await supabase
        .from("users")
        .select("firstName")
        .eq("userID", authData.user.id)
        .single();

      if (profileError) {
        setError("Error fetching user profile");
        setLoading(false);
        return;
      }

      // Store user info
      localStorage.setItem("userName", profile.firstName);
      localStorage.setItem("userEmail", email);
      localStorage.setItem("userId", authData.user.id);
      localStorage.setItem("isLoggedIn", "true");

      // Navigate to home page
      navigate("/");
      window.location.reload();
    } catch (error) {
      setError("An unexpected error occurred");
      setLoading(false);
    }
  };

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
        />
      </div>
      <div className="input-container">
        <input
          type="password"
          placeholder="Enter password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
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
