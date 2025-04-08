import React, { useState, useEffect } from "react";
import {
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  Alert,
  Box,
  Snackbar,
  CircularProgress,
  Divider,
  InputAdornment,
  IconButton,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
} from "@mui/material";
import { supabase } from "../../../supabaseClient";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ErrorIcon from "@mui/icons-material/Error";
import HelpIcon from "@mui/icons-material/Help";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import DnsIcon from "@mui/icons-material/Dns";
import API_CONFIG from "../../../config/api.js";

const AdminSetup = () => {
  // Form state
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    firstName: "",
    lastName: "",
  });

  // Email validation state
  const [emailChecked, setEmailChecked] = useState(false);
  const [emailExists, setEmailExists] = useState(false);
  const [checkingEmail, setCheckingEmail] = useState(false);

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });

  // Connection check state
  const [connectionStatus, setConnectionStatus] = useState({
    supabase: "unknown",
    database: "unknown",
    auth: "unknown",
    server: "unknown",
    checking: false,
  });

  // Check connections
  const checkConnections = async () => {
    setConnectionStatus((prev) => ({ ...prev, checking: true }));

    try {
      // Use the diagnostics endpoint for a comprehensive check
      const diagnosticsResponse = await fetch("/api/diagnostics", {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });

      if (!diagnosticsResponse.ok) {
        throw new Error("Diagnostics request failed");
      }

      const diagnostics = await diagnosticsResponse.json();

      // Update connection status based on diagnostic results
      setConnectionStatus((prev) => ({
        ...prev,
        database: diagnostics.tests.users.success ? "success" : "error",
        supabase:
          diagnostics.tests.users.success || diagnostics.tests.products.success
            ? "success"
            : "error",
        auth: diagnostics.tests.auth.success ? "success" : "error",
        server: "success", // Server is working if we got a response
        diagnosticsData: diagnostics, // Store full diagnostics data for debugging
      }));
    } catch (error) {
      console.error("Connection check error:", error);

      // Fallback to direct checks if the diagnostics endpoint fails
      try {
        // Check database connection - fix the count query
        const {
          data,
          count,
          error: dbError,
        } = await supabase
          .from("users")
          .select("*", { count: "exact", head: true });

        setConnectionStatus((prev) => ({
          ...prev,
          database: dbError ? "error" : "success",
          supabase: dbError ? "error" : "success",
        }));

        // Check auth connection
        const { data: authData, error: authError } =
          await supabase.auth.getSession();
        setConnectionStatus((prev) => ({
          ...prev,
          auth: authError ? "error" : "success",
        }));

        // Check server connection
        try {
          const serverResponse = await fetch("/api/health-check", {
            method: "GET",
            headers: { "Content-Type": "application/json" },
          });

          setConnectionStatus((prev) => ({
            ...prev,
            server: serverResponse.ok ? "success" : "error",
          }));
        } catch (serverError) {
          setConnectionStatus((prev) => ({ ...prev, server: "error" }));
          console.error("Server connection error:", serverError);
        }
      } catch (fallbackError) {
        setConnectionStatus({
          supabase: "error",
          database: "error",
          auth: "error",
          server: "unknown",
          checking: false,
        });
        console.error("Fallback connection check error:", fallbackError);
      }
    } finally {
      setConnectionStatus((prev) => ({ ...prev, checking: false }));
    }
  };

  // Run initial connection check
  useEffect(() => {
    checkConnections();
  }, []);

  // Check if email exists
  const checkEmail = async () => {
    if (!formData.email || !isValidEmail(formData.email)) {
      setSnackbar({
        open: true,
        message: "Please enter a valid email address",
        severity: "error",
      });
      return;
    }

    setCheckingEmail(true);
    try {
      const { data, error } = await supabase
        .from("users")
        .select("userID, email, firstName, lastName")
        .eq("email", formData.email)
        .single();

      if (error && error.code !== "PGRST116") {
        throw error;
      }

      setEmailChecked(true);

      if (data) {
        setEmailExists(true);
        setFormData((prev) => ({
          ...prev,
          firstName: data.firstName || "",
          lastName: data.lastName || "",
        }));
        setSnackbar({
          open: true,
          message: `User found: ${data.firstName} ${data.lastName}. This user will be promoted to admin.`,
          severity: "info",
        });
      } else {
        setEmailExists(false);
        setSnackbar({
          open: true,
          message: "Email not found. A new admin account will be created.",
          severity: "info",
        });
      }
    } catch (error) {
      console.error("Error checking email:", error);
      setSnackbar({
        open: true,
        message: `Error checking email: ${error.message}`,
        severity: "error",
      });
    } finally {
      setCheckingEmail(false);
    }
  };

  // Validate email format
  const isValidEmail = (email) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  // Form handlers
  const handleChange = (e) => {
    const { name, value } = e.target;

    // Reset email check when email changes
    if (name === "email" && emailChecked) {
      setEmailChecked(false);
      setEmailExists(false);
    }

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Helper function to handle API calls with fallback
  const apiCall = async (endpoint, data) => {
    // Try through the proxy first (default)
    try {
      console.log(`Attempting API call to ${endpoint} via proxy...`);
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      // If we get HTML back instead of JSON, throw an error
      const contentType = response.headers.get("content-type") || "";
      if (contentType.includes("text/html")) {
        console.warn(`Received HTML response instead of JSON from ${endpoint}`);
        throw new Error("Received HTML response instead of JSON");
      }

      if (!response.ok) {
        throw new Error(`API call failed with status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.warn(`Proxy API call to ${endpoint} failed:`, error.message);
      console.warn("Attempting direct API call to backend server...");

      // Try direct call to the backend as fallback
      try {
        const directUrl = API_CONFIG.getUrl(endpoint);
        console.log(`Trying direct API call to ${directUrl}...`);

        const directResponse = await fetch(directUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(data),
        });

        if (!directResponse.ok) {
          throw new Error(
            `Direct API call failed with status: ${directResponse.status}`
          );
        }

        const result = await directResponse.json();
        console.log(`Direct API call succeeded:`, result);
        return result;
      } catch (directError) {
        console.error(
          `Direct API call to ${endpoint} also failed:`,
          directError.message
        );
        throw directError;
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    // Validate form
    if (!formData.email || !isValidEmail(formData.email)) {
      setError("Please enter a valid email address");
      setLoading(false);
      return;
    }

    // Password is required for new users
    if (!emailExists && !formData.password) {
      setError("Password is required for new accounts");
      setLoading(false);
      return;
    }

    try {
      // 1. Check if the user already exists in the users table
      const { data: existingUsers, error: checkError } = await supabase
        .from("users")
        .select("userID, email, role")
        .eq("email", formData.email)
        .single();

      if (checkError && checkError.code !== "PGRST116") {
        // PGRST116 is the error code for "no rows returned" which is expected if user doesn't exist
        throw checkError;
      }

      if (existingUsers) {
        // User already exists, update their role to admin
        const { error: updateError } = await supabase
          .from("users")
          .update({
            role: "admin",
            modified_at: new Date().toISOString(),
          })
          .eq("userID", existingUsers.userID);

        if (updateError) throw updateError;

        // Update the user metadata in Supabase Auth
        const apiResult = await apiCall("/api/update-user-role", {
          userId: existingUsers.userID,
          role: "admin",
          isAdmin: true,
        });

        if (apiResult.error) {
          console.warn("API warning:", apiResult.error);
        }

        // Show success message for update
        setSuccess(
          `Existing user (${formData.email}) has been updated to admin role`
        );
        setFormData({
          email: "",
          password: "",
          firstName: "",
          lastName: "",
        });
        setEmailChecked(false);
        setEmailExists(false);

        setSnackbar({
          open: true,
          message: "User updated to admin role successfully!",
          severity: "success",
        });
      } else {
        // User doesn't exist, create new admin account
        // 1. Create the user in Supabase Auth
        const { data: authData, error: authError } = await supabase.auth.signUp(
          {
            email: formData.email,
            password: formData.password,
            options: {
              data: {
                firstName: formData.firstName,
                lastName: formData.lastName,
                isAdmin: true,
                role: "admin",
              },
            },
          }
        );

        if (authError) throw authError;

        // 2. Add the user to our users table with admin role
        const { error: dbError } = await supabase.from("users").insert([
          {
            userID: authData.user.id,
            email: formData.email,
            firstName: formData.firstName,
            lastName: formData.lastName,
            role: "admin",
            accountStatus: "active",
          },
        ]);

        if (dbError) throw dbError;

        // 3. Update the user metadata via the API
        const apiResult = await apiCall("/api/update-user-role", {
          userId: authData.user.id,
          role: "admin",
          isAdmin: true,
        });

        if (apiResult.error) {
          console.warn("API warning:", apiResult.error);
        }

        // 4. Show success message and reset form
        setSuccess(
          `Admin account created for ${formData.firstName} ${formData.lastName} (${formData.email})`
        );
        setFormData({
          email: "",
          password: "",
          firstName: "",
          lastName: "",
        });
        setEmailChecked(false);
        setEmailExists(false);

        setSnackbar({
          open: true,
          message: "Admin account created successfully!",
          severity: "success",
        });
      }
    } catch (error) {
      console.error("Error creating/updating admin account:", error);
      setError(error.message);
      setSnackbar({
        open: true,
        message: `Error: ${error.message}`,
        severity: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbar((prev) => ({
      ...prev,
      open: false,
    }));
  };

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Admin Account Setup
        </Typography>

        <Divider sx={{ my: 2 }} />

        <Accordion sx={{ mb: 3 }}>
          <AccordionSummary
            expandIcon={<ExpandMoreIcon />}
            aria-controls="connection-status-content"
            id="connection-status-header"
          >
            <Box sx={{ display: "flex", alignItems: "center" }}>
              <DnsIcon sx={{ mr: 1 }} />
              <Typography>Connection Status</Typography>
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                Check your connection status to make sure everything is working
                properly:
              </Typography>

              <Box
                sx={{ display: "flex", flexDirection: "column", gap: 1, mb: 2 }}
              >
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <Typography variant="body2" sx={{ minWidth: 120 }}>
                    Supabase:
                  </Typography>
                  {connectionStatus.checking ? (
                    <CircularProgress size={20} />
                  ) : (
                    <Chip
                      size="small"
                      icon={
                        connectionStatus.supabase === "success" ? (
                          <CheckCircleIcon />
                        ) : (
                          <ErrorIcon />
                        )
                      }
                      label={
                        connectionStatus.supabase === "success"
                          ? "Connected"
                          : connectionStatus.supabase === "error"
                          ? "Error"
                          : "Unknown"
                      }
                      color={
                        connectionStatus.supabase === "success"
                          ? "success"
                          : connectionStatus.supabase === "error"
                          ? "error"
                          : "default"
                      }
                    />
                  )}
                </Box>

                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <Typography variant="body2" sx={{ minWidth: 120 }}>
                    Database:
                  </Typography>
                  {connectionStatus.checking ? (
                    <CircularProgress size={20} />
                  ) : (
                    <Chip
                      size="small"
                      icon={
                        connectionStatus.database === "success" ? (
                          <CheckCircleIcon />
                        ) : (
                          <ErrorIcon />
                        )
                      }
                      label={
                        connectionStatus.database === "success"
                          ? "Connected"
                          : connectionStatus.database === "error"
                          ? "Error"
                          : "Unknown"
                      }
                      color={
                        connectionStatus.database === "success"
                          ? "success"
                          : connectionStatus.database === "error"
                          ? "error"
                          : "default"
                      }
                    />
                  )}
                </Box>

                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <Typography variant="body2" sx={{ minWidth: 120 }}>
                    Auth:
                  </Typography>
                  {connectionStatus.checking ? (
                    <CircularProgress size={20} />
                  ) : (
                    <Chip
                      size="small"
                      icon={
                        connectionStatus.auth === "success" ? (
                          <CheckCircleIcon />
                        ) : (
                          <ErrorIcon />
                        )
                      }
                      label={
                        connectionStatus.auth === "success"
                          ? "Connected"
                          : connectionStatus.auth === "error"
                          ? "Error"
                          : "Unknown"
                      }
                      color={
                        connectionStatus.auth === "success"
                          ? "success"
                          : connectionStatus.auth === "error"
                          ? "error"
                          : "default"
                      }
                    />
                  )}
                </Box>

                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <Typography variant="body2" sx={{ minWidth: 120 }}>
                    API Server:
                  </Typography>
                  {connectionStatus.checking ? (
                    <CircularProgress size={20} />
                  ) : (
                    <Chip
                      size="small"
                      icon={
                        connectionStatus.server === "success" ? (
                          <CheckCircleIcon />
                        ) : (
                          <ErrorIcon />
                        )
                      }
                      label={
                        connectionStatus.server === "success"
                          ? "Connected"
                          : connectionStatus.server === "error"
                          ? "Error"
                          : "Unknown"
                      }
                      color={
                        connectionStatus.server === "success"
                          ? "success"
                          : connectionStatus.server === "error"
                          ? "error"
                          : "default"
                      }
                    />
                  )}
                </Box>
              </Box>

              <Button
                variant="outlined"
                size="small"
                onClick={checkConnections}
                disabled={connectionStatus.checking}
                startIcon={
                  connectionStatus.checking ? (
                    <CircularProgress size={16} />
                  ) : (
                    <DnsIcon />
                  )
                }
              >
                {connectionStatus.checking
                  ? "Checking..."
                  : "Recheck Connections"}
              </Button>

              {connectionStatus.database === "error" && (
                <Alert severity="warning" sx={{ mt: 2 }}>
                  Database connection failed. Make sure your Supabase project is
                  running and that your environment variables are correctly set.
                  {connectionStatus.diagnosticsData?.tests?.users?.error && (
                    <Box sx={{ mt: 1, fontSize: "0.85rem" }}>
                      <strong>Error:</strong>{" "}
                      {connectionStatus.diagnosticsData.tests.users.error}
                    </Box>
                  )}
                </Alert>
              )}

              {connectionStatus.server === "error" && (
                <Alert severity="warning" sx={{ mt: 2 }}>
                  API server connection failed. Make sure your backend server is
                  running on the correct port and that your proxy settings are
                  configured correctly.
                </Alert>
              )}

              {connectionStatus.auth === "error" && (
                <Alert severity="warning" sx={{ mt: 2 }}>
                  Authentication connection failed. Check your Supabase service
                  role key and permissions.
                  {connectionStatus.diagnosticsData?.tests?.auth?.error && (
                    <Box sx={{ mt: 1, fontSize: "0.85rem" }}>
                      <strong>Error:</strong>{" "}
                      {connectionStatus.diagnosticsData.tests.auth.error}
                    </Box>
                  )}
                </Alert>
              )}

              <Box sx={{ mt: 2, fontSize: "0.8rem", color: "text.secondary" }}>
                <Typography variant="subtitle2" gutterBottom>
                  Troubleshooting Tips:
                </Typography>
                <ul style={{ margin: 0, paddingLeft: "1.5rem" }}>
                  <li>Ensure Supabase URL is correct in .env files</li>
                  <li>Check that your API keys have proper permissions</li>
                  <li>
                    Verify proxy configuration in package.json is set to
                    "http://localhost:3001"
                  </li>
                  <li>
                    For count queries, always use select('*', {"{ "}count:
                    'exact', head: true{"}"}) format
                  </li>
                  <li>
                    Make sure both frontend and backend servers are running
                  </li>
                </ul>
              </Box>
            </Box>
          </AccordionDetails>
        </Accordion>

        <Alert severity="info" sx={{ mb: 3 }}>
          This page allows you to create administrator accounts or promote
          existing users to admin. If the email you enter already exists in the
          system, that user will be promoted to an admin role. If not, a new
          admin account will be created.
        </Alert>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" sx={{ mb: 3 }}>
            {success}
          </Alert>
        )}

        <Box component="form" onSubmit={handleSubmit} noValidate>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Account Information
          </Typography>

          <TextField
            margin="normal"
            required
            fullWidth
            id="email"
            label="Email Address"
            name="email"
            autoComplete="email"
            value={formData.email}
            onChange={handleChange}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  {emailChecked && emailExists && (
                    <CheckCircleIcon color="success" />
                  )}
                  {emailChecked && !emailExists && (
                    <ErrorIcon color="warning" />
                  )}
                  <IconButton
                    edge="end"
                    onClick={checkEmail}
                    disabled={!formData.email || checkingEmail}
                    title="Check if email exists"
                  >
                    {checkingEmail ? (
                      <CircularProgress size={20} />
                    ) : (
                      <HelpIcon />
                    )}
                  </IconButton>
                </InputAdornment>
              ),
            }}
            sx={{ mb: 2 }}
          />

          <TextField
            margin="normal"
            required={!emailExists}
            fullWidth
            name="password"
            label={
              emailExists
                ? "Password (not needed for existing users)"
                : "Password"
            }
            type="password"
            id="password"
            autoComplete="new-password"
            value={formData.password}
            onChange={handleChange}
            disabled={emailExists}
            sx={{ mb: 2 }}
            helperText={
              emailExists
                ? "Password not required when promoting existing users"
                : ""
            }
          />

          <Typography variant="h6" sx={{ mb: 2, mt: 3 }}>
            Personal Information
          </Typography>

          <Box sx={{ display: "flex", gap: 2 }}>
            <TextField
              margin="normal"
              required
              fullWidth
              id="firstName"
              label="First Name"
              name="firstName"
              autoComplete="given-name"
              value={formData.firstName}
              onChange={handleChange}
              disabled={emailExists && formData.firstName}
            />

            <TextField
              margin="normal"
              required
              fullWidth
              id="lastName"
              label="Last Name"
              name="lastName"
              autoComplete="family-name"
              value={formData.lastName}
              onChange={handleChange}
              disabled={emailExists && formData.lastName}
            />
          </Box>

          <Button
            type="submit"
            fullWidth
            variant="contained"
            color="primary"
            size="large"
            disabled={loading}
            sx={{ mt: 4, mb: 2, py: 1.5 }}
          >
            {loading ? (
              <CircularProgress size={24} color="inherit" />
            ) : (
              "Create or Promote Admin"
            )}
          </Button>
        </Box>
      </Paper>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbar.severity}
          variant="filled"
          sx={{ width: "100%" }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default AdminSetup;
