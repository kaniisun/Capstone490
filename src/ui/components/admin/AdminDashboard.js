import React, { useState, useEffect } from "react";
import {
  Tabs,
  Tab,
  Box,
  Snackbar,
  Alert,
  CircularProgress,
  Typography,
} from "@mui/material";
import PeopleAltIcon from "@mui/icons-material/PeopleAlt";
import StorefrontIcon from "@mui/icons-material/Storefront";
import ReportIcon from "@mui/icons-material/Report";
import { supabase } from "../../../supabaseClient";

// Import our custom components
import TabPanel from "./components/TabPanel";
import UserManagementTab from "./components/UserManagementTab";
import ProductModerationTab from "./components/ProductModerationTab";
import ReportsTab from "./components/ReportsTab";
import EditUserDialog from "./components/EditUserDialog";

// Import our custom hooks
import { useAdminData } from "./hooks/useAdminData";
import { useUserManagement } from "./hooks/useUserManagement";

function AdminDashboard() {
  // State for snackbar feedback
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "info",
  });

  // Check current user role for debugging
  useEffect(() => {
    const checkUserRole = async () => {
      try {
        // Get the current session
        const sessionResult = await supabase.auth.getSession();
        const currentUser = sessionResult.data?.session?.user;

        if (currentUser) {
          console.log("Current user:", currentUser);

          try {
            // Check user's role in the users table - first with userID
            const { data: userData, error: userError } = await supabase
              .from("users")
              .select("role, userID, email")
              .eq("userID", currentUser.id)
              .single();

            if (userError) {
              console.error("Error fetching user role:", userError);

              // Try with id field as fallback
              const { data: userData2, error: userError2 } = await supabase
                .from("users")
                .select("role, userID, email")
                .eq("id", currentUser.id)
                .single();

              if (userError2) {
                console.error("Error fetching user with id field:", userError2);
              } else if (userData2) {
                console.log("User data found with id field:", userData2);
                console.log("User role:", userData2.role);
              }
            } else if (userData) {
              console.log("User data from users table:", userData);
              console.log("User role:", userData.role);
            }
          } catch (dbError) {
            console.error("Exception checking user role in database:", dbError);
          }
        } else {
          console.error("No user session found");
        }
      } catch (error) {
        console.error("Error checking user role:", error);
      }
    };

    checkUserRole();
  }, []);

  // Tab management
  const [tabValue, setTabValue] = useState(0);

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  // Data management
  const { users, setUsers, loading, error, fetchAdminData } =
    useAdminData(setSnackbar);

  // User management
  const {
    editUserDialogOpen,
    currentUser,
    editedUser,
    handleSoftDeleteUser,
    handleReinstateUser,
    handleOpenEditUserDialog,
    handleCloseEditUserDialog,
    handleEditUserInputChange,
    handleSaveEditedUser,
    handlePromoteToAdmin,
    handleRevokeAdminPrivileges,
  } = useUserManagement(setSnackbar, fetchAdminData, users, setUsers);

  // Snackbar handlers
  const handleCloseSnackbar = (event, reason) => {
    if (reason === "clickaway") {
      return;
    }
    setSnackbar({ ...snackbar, open: false });
  };

  // If loading, show loading indicator
  if (loading) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "calc(100vh - 64px)",
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  // If error, show error message
  if (error) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "calc(100vh - 64px)",
        }}
      >
        <Alert severity="error">Error loading admin data: {error}</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ width: "100%", bgcolor: "background.paper" }}>
      {/* Header */}
      <Box sx={{ p: 3, pb: 0 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Admin Dashboard
        </Typography>
        <Typography variant="body1" color="text.secondary" paragraph>
          Manage user accounts and moderate content on the platform
        </Typography>
      </Box>

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: "divider", px: 3, pt: 2 }}>
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          indicatorColor="primary"
          textColor="primary"
        >
          <Tab
            icon={<PeopleAltIcon />}
            iconPosition="start"
            label="User Management"
            id="tab-0"
            aria-controls="tabpanel-0"
            sx={{
              "&:hover": {
                backgroundColor: "#f5f5f5",
              },
            }}
          />

          <Tab
            icon={<StorefrontIcon />}
            iconPosition="start"
            label="Product Moderation"
            id="tab-1"
            aria-controls="tabpanel-1"
            sx={{
              "&:hover": {
                backgroundColor: "#f5f5f5",
              },
            }}
          />

          <Tab
            icon={<ReportIcon />}
            iconPosition="start"
            label="Reports"
            id="tab-2"
            aria-controls="tabpanel-2"
            sx={{
              "&:hover": {
                backgroundColor: "#f5f5f5",
              },
            }}
          />
        </Tabs>
      </Box>

      {/* Tab Panels */}
      <TabPanel value={tabValue} index={0}>
        <UserManagementTab
          users={users}
          onSoftDeleteUser={handleSoftDeleteUser}
          onReinstateUser={handleReinstateUser}
          onEditUser={handleOpenEditUserDialog}
          onPromoteToAdmin={handlePromoteToAdmin}
          onRevokeAdmin={handleRevokeAdminPrivileges}
        />
      </TabPanel>

      <TabPanel value={tabValue} index={1}>
        <ProductModerationTab setSnackbar={setSnackbar} />
      </TabPanel>

      <TabPanel value={tabValue} index={2}>
        <ReportsTab setSnackbar={setSnackbar} />
      </TabPanel>

      {/* Edit User Dialog */}
      <EditUserDialog
        open={editUserDialogOpen}
        onClose={handleCloseEditUserDialog}
        currentUser={currentUser}
        editedUser={editedUser}
        onInputChange={handleEditUserInputChange}
        onSave={handleSaveEditedUser}
      />

      {/* Snackbar for feedback */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbar.severity}
          sx={{ width: "100%" }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

export default AdminDashboard;
