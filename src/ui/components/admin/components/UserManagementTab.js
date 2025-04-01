import React, { useState } from "react";
import {
  Box,
  Paper,
  Typography,
  Alert,
  Button,
  List,
  TextField,
  InputAdornment,
  IconButton,
  FormControlLabel,
  Switch,
  Tab,
  Tabs,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import RefreshIcon from "@mui/icons-material/Refresh";
import ClearIcon from "@mui/icons-material/Clear";
import PersonIcon from "@mui/icons-material/Person";
import AdminPanelSettingsIcon from "@mui/icons-material/AdminPanelSettings";
import BlockIcon from "@mui/icons-material/Block";
import UserItem from "./UserItem";

const UserManagementTab = ({
  users,
  onSoftDeleteUser,
  onReinstateUser,
  onEditUser,
  onPromoteToAdmin,
  onRevokeAdmin,
}) => {
  // Local state for search filter
  const [searchQuery, setSearchQuery] = useState("");
  // State for filtering users
  const [filterValue, setFilterValue] = useState("active");

  // Filter users by status and role
  const activeUsers = users.filter((user) => user.accountStatus === "active");
  const inactiveUsers = users.filter(
    (user) =>
      user.accountStatus === "inactive" || user.accountStatus === "suspended"
  );
  const adminUsers = users.filter(
    (user) => user.role === "admin" && user.accountStatus === "active"
  );

  // Determine which users to display based on filter
  let displayUsers = [];
  switch (filterValue) {
    case "active":
      displayUsers = activeUsers;
      break;
    case "inactive":
      displayUsers = inactiveUsers;
      break;
    case "admin":
      displayUsers = adminUsers;
      break;
    default:
      displayUsers = users;
  }

  // Filter users based on search query
  const filteredUsers = displayUsers.filter((user) => {
    const searchLower = searchQuery.toLowerCase();
    return (
      user.firstName?.toLowerCase().includes(searchLower) ||
      user.lastName?.toLowerCase().includes(searchLower) ||
      user.email?.toLowerCase().includes(searchLower) ||
      user.role?.toLowerCase().includes(searchLower) ||
      user.accountStatus?.toLowerCase().includes(searchLower) ||
      String(user.userID).includes(searchQuery)
    );
  });

  // Clear search query
  const handleClearSearch = () => {
    setSearchQuery("");
  };

  // Handle filter change
  const handleFilterChange = (event, newValue) => {
    setFilterValue(newValue);
  };

  // For backward compatibility
  const onSuspendUser = onSoftDeleteUser;
  const onUnsuspendUser = onReinstateUser;

  return (
    <Box>
      <Box sx={{ mb: 2 }}>
        <Alert
          severity="info"
          sx={{ mb: 2 }}
          action={
            <Button
              color="inherit"
              size="small"
              startIcon={<RefreshIcon />}
              onClick={() => window.location.reload()}
            >
              Refresh
            </Button>
          }
        >
          <Typography variant="body2" component="div">
            Manage user accounts. You can edit user details, deactivate
            accounts, and manage admin privileges.
          </Typography>
        </Alert>

        <Alert severity="warning" sx={{ mb: 2 }}>
          <Typography variant="body2" component="div">
            <strong>Important:</strong> Deactivating a user will prevent them
            from accessing the platform until they are reactivated by an
            administrator. Admin users cannot be deactivated.
          </Typography>
        </Alert>
      </Box>

      {/* Filter Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 2 }}>
        <Tabs
          value={filterValue}
          onChange={handleFilterChange}
          aria-label="user filter tabs"
        >
          <Tab
            icon={<PersonIcon />}
            iconPosition="start"
            label={`Active (${activeUsers.length})`}
            value="active"
          />
          <Tab
            icon={<BlockIcon />}
            iconPosition="start"
            label={`Inactive (${inactiveUsers.length})`}
            value="inactive"
          />
          <Tab
            icon={<AdminPanelSettingsIcon />}
            iconPosition="start"
            label={`Admins (${adminUsers.length})`}
            value="admin"
          />
        </Tabs>
      </Box>

      {/* Search controls */}
      <Box
        sx={{
          mb: 2,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <TextField
          sx={{ flex: 1 }}
          variant="outlined"
          placeholder="Search users by name, email, role, or status..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
            endAdornment: searchQuery && (
              <InputAdornment position="end">
                <IconButton
                  aria-label="clear search"
                  onClick={handleClearSearch}
                  edge="end"
                  size="small"
                >
                  <ClearIcon />
                </IconButton>
              </InputAdornment>
            ),
          }}
        />
      </Box>

      {/* User list */}
      <Paper elevation={2}>
        <List sx={{ p: 0 }}>
          {filteredUsers.length === 0 ? (
            <Box sx={{ p: 3, textAlign: "center" }}>
              <Typography
                variant="body1"
                color="text.secondary"
                component="div"
              >
                {searchQuery
                  ? "No users found matching your search."
                  : filterValue === "active"
                  ? "No active users found."
                  : filterValue === "inactive"
                  ? "No inactive users found."
                  : filterValue === "admin"
                  ? "No admin users found."
                  : "No users found."}
              </Typography>
            </Box>
          ) : (
            filteredUsers.map((user) => (
              <UserItem
                key={user.userID}
                user={user}
                onSuspend={onSuspendUser}
                onUnsuspend={onUnsuspendUser}
                onEdit={onEditUser}
                onPromoteToAdmin={onPromoteToAdmin}
                onRevokeAdmin={onRevokeAdmin}
              />
            ))
          )}
        </List>
      </Paper>
    </Box>
  );
};

export default UserManagementTab;
