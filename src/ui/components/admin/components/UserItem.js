import React from "react";
import {
  ListItem,
  ListItemText,
  Typography,
  Box,
  Button,
  Chip,
  Divider,
  Avatar,
  IconButton,
  Tooltip,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import BlockIcon from "@mui/icons-material/Block";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import AdminPanelSettingsIcon from "@mui/icons-material/AdminPanelSettings";
import PersonIcon from "@mui/icons-material/Person";
import SecurityIcon from "@mui/icons-material/Security";
import NoEncryptionIcon from "@mui/icons-material/NoEncryption";

// Function to get initials from name
const getInitials = (firstName, lastName) => {
  return `${firstName?.charAt(0) || ""}${
    lastName?.charAt(0) || ""
  }`.toUpperCase();
};

// Format date function
const formatDate = (dateString) => {
  if (!dateString) return "Unknown date";

  try {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch (error) {
    console.error("Error formatting date:", error);
    return "Invalid date";
  }
};

const UserItem = ({
  user,
  onSuspend,
  onUnsuspend,
  onEdit,
  onPromoteToAdmin,
  onRevokeAdmin,
}) => {
  const isAdmin = user.role === "admin";
  const isInactive = user.accountStatus === "inactive";
  const isSuspended = user.accountStatus === "suspended"; // For backward compatibility

  // Determine actual status for display
  const isUserInactive = isInactive || isSuspended;

  // Format the date
  const formattedDate = formatDate(user.created_at);

  return (
    <>
      <ListItem
        sx={{
          py: 2,
          backgroundColor: isUserInactive ? "rgba(0, 0, 0, 0.04)" : "inherit",
        }}
      >
        <Avatar
          sx={{
            bgcolor: isAdmin ? "primary.main" : "secondary.main",
            mr: 2,
          }}
        >
          {getInitials(user.firstName, user.lastName)}
        </Avatar>

        <ListItemText
          primary={
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Typography variant="h6" component="span">
                {user.firstName} {user.lastName}
              </Typography>

              {isAdmin && (
                <Chip
                  icon={<AdminPanelSettingsIcon />}
                  label="Admin"
                  color="primary"
                  size="small"
                />
              )}

              {!isAdmin && (
                <Chip
                  icon={<PersonIcon />}
                  label="User"
                  variant="outlined"
                  size="small"
                />
              )}

              {isUserInactive && (
                <Chip label="Inactive" color="error" size="small" />
              )}
            </Box>
          }
          secondary={
            <Box sx={{ mt: 0.5 }}>
              <Typography
                variant="body2"
                color="text.secondary"
                component="span"
              >
                {user.email}
              </Typography>
              <Box component="span" sx={{ display: "block" }}>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  component="span"
                >
                  User since {formattedDate}
                </Typography>
              </Box>
              <Box component="span" sx={{ display: "block" }}>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  component="span"
                >
                  Account Status: {user.accountStatus}
                </Typography>
              </Box>
            </Box>
          }
        />

        <Box
          sx={{ display: "flex", flexDirection: "column", gap: 1, ml: "auto" }}
        >
          <Box sx={{ display: "flex", gap: 1, justifyContent: "flex-end" }}>
            <Button
              variant="outlined"
              color="primary"
              size="small"
              startIcon={<EditIcon />}
              onClick={() => onEdit(user)}
            >
              Edit
            </Button>

            {isUserInactive ? (
              <Button
                variant="outlined"
                color="success"
                size="small"
                startIcon={<CheckCircleOutlineIcon />}
                onClick={() => onUnsuspend(user)}
              >
                Activate
              </Button>
            ) : (
              <Button
                variant="outlined"
                color="error"
                size="small"
                startIcon={<BlockIcon />}
                onClick={() => onSuspend(user)}
                disabled={isAdmin} // Prevent suspending admin users
              >
                Deactivate
              </Button>
            )}
          </Box>

          <Box sx={{ display: "flex", gap: 1, justifyContent: "flex-end" }}>
            {isAdmin ? (
              <Tooltip title="Revoke admin privileges">
                <Button
                  variant="outlined"
                  color="warning"
                  size="small"
                  startIcon={<NoEncryptionIcon />}
                  onClick={() => onRevokeAdmin(user)}
                  disabled={isUserInactive}
                >
                  Revoke Admin
                </Button>
              </Tooltip>
            ) : (
              <Tooltip title="Promote to admin">
                <Button
                  variant="outlined"
                  color="info"
                  size="small"
                  startIcon={<SecurityIcon />}
                  onClick={() => onPromoteToAdmin(user)}
                  disabled={isUserInactive}
                >
                  Make Admin
                </Button>
              </Tooltip>
            )}
          </Box>
        </Box>
      </ListItem>
      <Divider />
    </>
  );
};

export default UserItem;
