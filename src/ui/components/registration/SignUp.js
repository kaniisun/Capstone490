//signup.js
//This is the signup component that allows the user to sign up for an account with email verification

import React, { useState, useEffect } from "react";
import { supabase } from "../../../supabaseClient";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  CircularProgress,
  Container,
  Divider,
  FormControlLabel,
  Grid,
  IconButton,
  InputAdornment,
  Link,
  Paper,
  Stack,
  TextField,
  Typography,
  useTheme,
} from "@mui/material";
import {
  School,
  Person,
  Email,
  Lock,
  Visibility,
  VisibilityOff,
  CheckCircleOutline,
} from "@mui/icons-material";

//This is the signup component that allows the user to sign up for an account
function SignUp() {
  const theme = useTheme();

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
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const navigate = useNavigate();

  // Function to test connection to Supabase
  const testConnection = async () => {
    try {
      const { data, error } = await supabase
        .from("users")
        .select("count", { count: "exact", head: true });

      if (error) {
        return { success: false, error };
      }
      return { success: true, data };
    } catch (err) {
      return { success: false, error: err };
    }
  };

  // Check connection status on component mount
  useEffect(() => {
    const checkConnection = async () => {
      const result = await testConnection();
      setConnectionStatus(result.success ? "connected" : "error");

      if (!result.success) {
        console.error("Connection error during component mount:", result.error);
      }
    };

    checkConnection();
  }, []);

  // Toggle password visibility
  const handleClickShowPassword = () => {
    setShowPassword(!showPassword);
  };

  // Toggle confirm password visibility
  const handleClickShowConfirmPassword = () => {
    setShowConfirmPassword(!showConfirmPassword);
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setVerificationSent(false);
    setLoading(true);

    // Validate terms acceptance
    if (!acceptTerms) {
      setError("You must accept the terms and conditions to register.");
      setLoading(false);
      return;
    }

    // Validate first and last name
    if (!firstName.trim() || !lastName.trim()) {
      setError("First and last name are required.");
      setLoading(false);
      return;
    }

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
      const connectionTest = await testConnection();
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

    // Check if email is already registered in the users table
    try {
      const { data: existingUser, error: checkError } = await supabase
        .from("users")
        .select("userID, accountStatus")
        .eq("email", email)
        .maybeSingle();

      if (checkError && checkError.code !== "PGRST116") {
        throw checkError;
      }

      // If user exists and is active, prevent re-registration
      if (existingUser && existingUser.accountStatus === "active") {
        setError(
          "This email is already registered and verified. Please log in instead."
        );
        setLoading(false);
        return;
      }

      // Continue with registration if user doesn't exist or is nonactive
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
          // Use absolute URL for redirect to avoid issues with URL construction
          emailRedirectTo: `${window.location.origin}/?verified=true`,
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

      // Store the email in session storage for the verification page
      sessionStorage.setItem("verificationEmail", email);

      // Instead of showing verification message in place, redirect to verification page
      navigate("/verify-email");
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
          <School fontSize="large" sx={{ mb: 1 }} />
          <Typography variant="h4" component="h1" fontWeight="bold">
            Join Spartan Marketplace
          </Typography>
          <Typography variant="body1" sx={{ mt: 1, opacity: 0.9 }}>
            Create your account with your UNCG email
          </Typography>
        </Box>

        {/* Form */}
        <CardContent sx={{ p: 4 }}>
          {connectionStatus === "error" && (
            <Alert severity="error" sx={{ mb: 3 }}>
              Server connection issues detected. Registration may not work
              properly.
            </Alert>
          )}

          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit} noValidate>
            <Grid container spacing={2}>
              {/* First Name */}
              <Grid item xs={12} sm={6}>
                <TextField
                  autoComplete="given-name"
                  required
                  fullWidth
                  id="firstName"
                  label="First Name"
                  name="firstName"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  disabled={loading}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Person color="primary" />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>

              {/* Last Name */}
              <Grid item xs={12} sm={6}>
                <TextField
                  required
                  fullWidth
                  id="lastName"
                  label="Last Name"
                  name="lastName"
                  autoComplete="family-name"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  disabled={loading}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Person color="primary" />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>

              {/* Email */}
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
                  helperText="Only @uncg.edu email addresses are allowed"
                />
              </Grid>

              {/* Password */}
              <Grid item xs={12}>
                <TextField
                  required
                  fullWidth
                  name="password"
                  label="Password"
                  type={showPassword ? "text" : "password"}
                  id="password"
                  autoComplete="new-password"
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
                  helperText="Password must be at least 6 characters"
                />
              </Grid>

              {/* Confirm Password */}
              <Grid item xs={12}>
                <TextField
                  required
                  fullWidth
                  name="confirmPassword"
                  label="Confirm Password"
                  type={showConfirmPassword ? "text" : "password"}
                  id="confirmPassword"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
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
                          onClick={handleClickShowConfirmPassword}
                          edge="end"
                        >
                          {showConfirmPassword ? (
                            <VisibilityOff />
                          ) : (
                            <Visibility />
                          )}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>

              {/* Terms and Conditions */}
              <Grid item xs={12}>
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    position: "relative", // Ensure positioning context
                    "&:hover": { backgroundColor: "transparent" }, // Prevent any hover effects
                  }}
                >
                  {/* Custom styled checkbox with no Material-UI hover behaviors */}
                  <input
                    type="checkbox"
                    id="terms-checkbox"
                    checked={acceptTerms}
                    onChange={(e) => setAcceptTerms(e.target.checked)}
                    style={{
                      marginRight: "8px",
                      cursor: "pointer",
                    }}
                  />
                  <Typography
                    variant="body2"
                    component="label"
                    htmlFor="terms-checkbox"
                    sx={{
                      cursor: "pointer",
                      userSelect: "none", // Prevent text selection
                      "&:hover": { backgroundColor: "transparent" },
                    }}
                  >
                    I agree to the{" "}
                    <Link component={RouterLink} to="/terms" color="primary">
                      Terms of Service
                    </Link>{" "}
                    and{" "}
                    <Link component={RouterLink} to="/privacy" color="primary">
                      Privacy Policy
                    </Link>
                  </Typography>
                </Box>
              </Grid>
            </Grid>

            {/* Submit Button */}
            <Button
              type="submit"
              fullWidth
              variant="contained"
              disabled={loading || !acceptTerms}
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
                  <span style={{ visibility: "hidden" }}>Register</span>
                </>
              ) : (
                "Register"
              )}
            </Button>

            {/* Login Link */}
            <Box sx={{ textAlign: "center", mt: 2 }}>
              <Typography variant="body2">
                Already have an account?{" "}
                <Link
                  component={RouterLink}
                  to="/login"
                  variant="body2"
                  color="primary"
                >
                  Sign in
                </Link>
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Paper>

      {/* Verification Message - should normally not be shown since we redirect */}
      {verificationSent && (
        <Alert
          severity="success"
          sx={{ mt: 3 }}
          icon={<CheckCircleOutline fontSize="inherit" />}
        >
          <Typography variant="subtitle1" fontWeight="bold">
            Verification Email Sent
          </Typography>
          <Typography variant="body2">
            Please check your inbox and click the verification link to complete
            your registration.
          </Typography>
        </Alert>
      )}
    </Container>
  );
}

export default SignUp;
