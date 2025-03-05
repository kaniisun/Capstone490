import React, { useState } from "react";
import { supabase } from "../../../supabaseClient";
import "./SignUp.css"; // We'll add the CSS here

function SignUp() {
  // State for form fields
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    // Validate email (must end with @uncg.edu)
    if (!email.endsWith("@uncg.edu")) {
      setError("Only @uncg.edu email addresses are allowed.");
      return;
    }

    // Validate passwords match
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    try {
      // Sign up user with Supabase Auth
      const { data, error: authError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (authError) {
        throw authError;
      }

      const user = data.user;

      // Insert user data into public.users table
      const { error: insertError } = await supabase.from("users").insert({
        userID: user.id, // Link to auth.users.id (UUID)
        email,
        firstName,
        lastName,
        created_at: new Date().toISOString(), 
      });
      

      if (insertError) {
        throw insertError;
      }

      setSuccess(true);
      // Clear form after success
      setFirstName("");
      setLastName("");
      setEmail("");
      setPassword("");
      setConfirmPassword("");
    } catch (err) {
      setError(err.message);
    }
  };
  

  return (
    <form className="form" onSubmit={handleSubmit}>
      <p className="title">Register</p>
      <p className="message">Signup now and get full access to our app.</p>
      <div className="flex">
        <label>
          <input
            required
            placeholder=""
            type="text"
            className="input"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
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
        />
        <span>Confirm password</span>
      </label>
      <button className="submit" type="submit">
        Submit
      </button>
      <p className="signin">
        Already have an account? <a href="#">Sign in</a>
      </p>
      {error && <p style={{ color: "red" }}>{error}</p>}
      {success && <p style={{ color: "green" }}>Registration successful!</p>}
    </form>
  );
}

export default SignUp;
