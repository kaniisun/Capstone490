import React from "react";
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Paper,
  Alert,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Box,
  Button,
} from "@mui/material";
import {
  Block as BlockIcon,
  CheckCircle as CheckCircleIcon,
} from "@mui/icons-material";

const OverviewTab = ({
  analytics,
  showDatabaseHelp,
  checkSupabaseEnv,
  fetchAdminData,
  setLoading,
}) => {
  return (
    <>
      <Grid container spacing={3}>
        <Grid item xs={12} sm={6} md={3} key="analytics-users">
          <Card>
            <CardContent>
              <Typography
                color="text.secondary"
                gutterBottom
                key="total-users-label"
              >
                Total Users
              </Typography>
              <Typography variant="h5" component="div" key="total-users-value">
                {analytics.totalUsers}
              </Typography>
              {analytics.suspendedUsers > 0 && (
                <Typography
                  key="suspended-users-count"
                  variant="caption"
                  color="warning.main"
                >
                  ({analytics.suspendedUsers} suspended)
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3} key="analytics-listings">
          <Card>
            <CardContent>
              <Typography
                color="text.secondary"
                gutterBottom
                key="total-listings-label"
              >
                Total Listings
              </Typography>
              <Typography
                variant="h5"
                component="div"
                key="total-listings-value"
              >
                {analytics.totalListings}
              </Typography>
              {analytics.suspendedListings > 0 && (
                <Typography
                  key="suspended-listings-count"
                  variant="caption"
                  color="warning.main"
                >
                  ({analytics.suspendedListings} suspended)
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3} key="analytics-active-listings">
          <Card>
            <CardContent>
              <Typography
                color="text.secondary"
                gutterBottom
                key="active-listings-label"
              >
                Active Listings
              </Typography>
              <Typography
                variant="h5"
                component="div"
                key="active-listings-value"
              >
                {analytics.activeListings}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3} key="analytics-reports">
          <Card>
            <CardContent>
              <Typography
                color="text.secondary"
                gutterBottom
                key="reports-label"
              >
                Reports
              </Typography>
              <Typography variant="h5" component="div" key="reports-value">
                {analytics.totalReports}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3} key="analytics-community-posts">
          <Card>
            <CardContent>
              <Typography
                color="text.secondary"
                gutterBottom
                key="community-posts-label"
              >
                Community Posts
              </Typography>
              <Typography
                variant="h5"
                component="div"
                key="community-posts-value"
              >
                {analytics.openboardPostCount}
              </Typography>
              {analytics.suspendedPostCount > 0 && (
                <Typography
                  key="suspended-posts-count"
                  variant="caption"
                  color="warning.main"
                >
                  ({analytics.suspendedPostCount} suspended)
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Suspension Guide */}
      <Paper sx={{ mt: 3, p: 3, bgcolor: "rgba(255, 235, 205, 0.2)" }}>
        <Typography variant="h6" gutterBottom key="suspension-guide-heading">
          User Suspension Guide
        </Typography>

        <Typography variant="body1" paragraph key="suspension-guide-intro">
          When you suspend a user, the following happens:
        </Typography>

        <Grid container spacing={2}>
          <Grid item xs={12} md={6} key="suspension-guide-left">
            <List>
              <ListItem key="suspension-item-1">
                <ListItemIcon>
                  <BlockIcon color="warning" />
                </ListItemIcon>
                <ListItemText
                  primary="The user's account status is set to 'suspended'"
                  secondary="This is stored in the Supabase database"
                />
              </ListItem>
              <ListItem key="suspension-item-2">
                <ListItemIcon>
                  <BlockIcon color="warning" />
                </ListItemIcon>
                <ListItemText
                  primary="All of the user's product listings are hidden"
                  secondary="They're marked as 'suspended' but the previous status is saved"
                />
              </ListItem>
              <ListItem key="suspension-item-3">
                <ListItemIcon>
                  <BlockIcon color="warning" />
                </ListItemIcon>
                <ListItemText
                  primary="All of the user's community posts are hidden"
                  secondary="They're marked as 'suspended' but the previous status is saved"
                />
              </ListItem>
            </List>
          </Grid>
          <Grid item xs={12} md={6} key="suspension-guide-right">
            <List>
              <ListItem key="reinstate-item-1">
                <ListItemIcon>
                  <CheckCircleIcon color="success" />
                </ListItemIcon>
                <ListItemText
                  primary="When reinstating a user, all content is restored"
                  secondary="Previous status values are used to restore posts/listings"
                />
              </ListItem>
              <ListItem key="reinstate-item-2">
                <ListItemIcon>
                  <CheckCircleIcon color="success" />
                </ListItemIcon>
                <ListItemText
                  primary="In the Content Moderation tab, you can view suspended content"
                  secondary="Use the 'Show Suspended Content' button to view hidden items"
                />
              </ListItem>
              <ListItem key="reinstate-item-3">
                <ListItemIcon>
                  <CheckCircleIcon color="success" />
                </ListItemIcon>
                <ListItemText
                  primary="No content is permanently deleted during suspension"
                  secondary="This allows for easy reversal if a suspension was in error"
                />
              </ListItem>
            </List>
          </Grid>
        </Grid>
      </Paper>

      {/* Database Diagnostic Section */}
      {(analytics.totalUsers === 0 || analytics.totalListings === 0) && (
        <Paper sx={{ mt: 3, p: 3, bgcolor: "rgba(255, 0, 0, 0.05)" }}>
          <Typography variant="h6" gutterBottom>
            Database Connection Diagnostics
          </Typography>

          <Alert severity="warning" sx={{ mb: 2 }}>
            {analytics.totalUsers === 0 && analytics.totalListings === 0
              ? "No users or listings found in the database. This might indicate a connection issue."
              : analytics.totalUsers === 0
              ? "No users found in the database. This might indicate an issue with the users table."
              : "No listings found in the database. This might indicate an issue with the products table."}
          </Alert>

          <Typography variant="body1" paragraph>
            Please check the following:
          </Typography>

          <ul>
            <li key="diag-check-1">
              Verify that your Supabase project is running and accessible
            </li>
            <li key="diag-check-2">
              Check that the environment variables (REACT_APP_SUPABASE_URL and
              REACT_APP_SUPABASE_KEY) are correctly set
            </li>
            <li key="diag-check-3">
              Confirm that the "users" and "products" tables exist in your
              Supabase database
            </li>
            <li key="diag-check-4">
              Ensure the tables have the correct column names (userID,
              firstName, lastName, etc. for users; id, title, price, status,
              etc. for products)
            </li>
            <li key="diag-check-5">
              Check browser console for detailed error messages
            </li>
          </ul>

          <Box sx={{ mt: 2, display: "flex", gap: 2 }}>
            <Button
              variant="contained"
              color="primary"
              onClick={() => {
                setLoading(true);
                fetchAdminData();
              }}
            >
              Retry Connection
            </Button>

            <Button variant="outlined" onClick={() => showDatabaseHelp()}>
              Show Technical Details
            </Button>

            <Button
              variant="outlined"
              color="info"
              onClick={() => checkSupabaseEnv()}
            >
              Check Environment
            </Button>
          </Box>
        </Paper>
      )}
    </>
  );
};

export default OverviewTab;
