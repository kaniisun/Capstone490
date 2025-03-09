//login.js
//This is the login component that allows the user to sign in to their account

import React, { useState, useEffect } from "react";
import { supabase } from "../../../supabaseClient";
import { useNavigate, Link as RouterLink } from "react-router-dom";
import { useAuth } from "../../../contexts/AuthContext";
import {
  Alert,
  Box,
  Button,
  CardContent,
  CircularProgress,
  Container,
  Divider,
  Grid,
  IconButton,
  InputAdornment,
  Link,
  Paper,
  TextField,
  Typography,
  useTheme,
} from "@mui/material";
import {
  Login as LoginIcon,
  Email,
  Lock,
  Visibility,
  VisibilityOff,
} from "@mui/icons-material";

//This is the login component that allows the user to sign in to their account
function Login() {
  const theme = useTheme();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const { isAuthenticated, refreshSession } = useAuth();

  // Redirect if already logged in
  useEffect(() => {
    if (isAuthenticated) {
      navigate("/home");
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

  // Toggle password visibility
  const handleClickShowPassword = () => {
    setShowPassword(!showPassword);
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

      // Check if the user's account is active in the database
      const { data: userRecord, error: userRecordError } = await supabase
        .from("users")
        .select("accountStatus")
        .eq("userID", authData.user.id)
        .single();

      if (userRecordError) {
        setError("Error fetching user account status. Please try again.");
        setLoading(false);
        return;
      }

      // If account is not active, check if email is verified
      if (userRecord.accountStatus !== "active") {
        // Check if email is verified in Supabase Auth
        if (!authData.user.email_confirmed_at) {
          // Store email in session storage for verification page
          sessionStorage.setItem("verificationEmail", email);
          // Redirect to verify email page
          navigate("/verify-email");
          setLoading(false);
          return;
        } else {
          // Email is verified but account status wasn't updated, update it now
          const { error: updateError } = await supabase
            .from("users")
            .update({ accountStatus: "active" })
            .eq("userID", authData.user.id);

          if (updateError) {
            console.error("Error updating account status:", updateError);
          }
        }
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

      // Wait a short moment to ensure auth state is fully updated
      setTimeout(() => {
        // Check if there's a stored redirect path
        const redirectPath = sessionStorage.getItem("redirectAfterAuth");
        // Clear the stored path
        sessionStorage.removeItem("redirectAfterAuth");
        // Navigate to the stored path or home
        navigate(redirectPath || "/home", { replace: true });
      }, 300);
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
    <Container maxWidth="sm" sx={{ py: 8 }}>
      <Paper
        elevation={6}
        sx={{
          borderRadius: 2,
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <Box
          sx={{
            backgroundColor: theme.palette.primary.main,
            color: "white",
            p: 3,
            textAlign: "center",
          }}
        >
          <LoginIcon fontSize="large" sx={{ mb: 1 }} />
          <Typography variant="h4" component="h1" fontWeight="bold">
            Welcome Back
          </Typography>
          <Typography variant="body1" sx={{ mt: 1, opacity: 0.9 }}>
            Sign in to your Spartan Marketplace account
          </Typography>
        </Box>

        {/* Form */}
        <CardContent sx={{ p: 4 }}>
          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit} noValidate>
            <Grid container spacing={2}>
              {/* Email Field */}
              <Grid item xs={12}>
                <TextField
                  required
                  fullWidth
                  id="email"
                  label="UNCG Email"
                  name="email"
                  autoComplete="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Email color="primary" />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>

              {/* Password Field */}
              <Grid item xs={12}>
                <TextField
                  required
                  fullWidth
                  name="password"
                  label="Password"
                  type={showPassword ? "text" : "password"}
                  id="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Lock color="primary" />
                      </InputAdornment>
                    ),
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          aria-label="toggle password visibility"
                          onClick={handleClickShowPassword}
                          edge="end"
                        >
                          {showPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
            </Grid>

            {/* Forgot Password Link */}
            <Box sx={{ textAlign: "right", mt: 1 }}>
              <Link
                component={RouterLink}
                to="/reset-password"
                variant="body2"
                color="primary"
              >
                Forgot password?
              </Link>
            </Box>

            {/* Submit Button */}
            <Button
              type="submit"
              fullWidth
              variant="contained"
              disabled={loading}
              size="large"
              sx={{
                mt: 3,
                mb: 2,
                py: 1.5,
                position: "relative",
              }}
            >
              {loading ? (
                <>
                  <CircularProgress
                    size={24}
                    sx={{
                      position: "absolute",
                      color: theme.palette.secondary.main,
                    }}
                  />
                  <span style={{ visibility: "hidden" }}>Sign In</span>
                </>
              ) : (
                "Sign In"
              )}
            </Button>

            {/* Divider */}
            <Divider sx={{ my: 2 }}>
              <Typography variant="body2" color="text.secondary">
                OR
              </Typography>
            </Divider>

            {/* Registration Link */}
            <Box sx={{ textAlign: "center" }}>
              <Typography variant="body2">
                Don't have an account?{" "}
                <Link
                  component={RouterLink}
                  to="/register"
                  variant="body2"
                  color="primary"
                  sx={{ fontWeight: "medium" }}
                >
                  Sign up now
                </Link>
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Paper>
    </Container>
  );
}

export default Login;
