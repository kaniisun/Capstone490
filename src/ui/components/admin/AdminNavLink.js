import React from "react";
import { Link as RouterLink } from "react-router-dom";
import { useAuth } from "../../../contexts/AuthContext";
import { Button, Badge, Tooltip } from "@mui/material";
import AdminPanelSettingsIcon from "@mui/icons-material/AdminPanelSettings";

const AdminNavLink = () => {
  const { isAdmin } = useAuth();

  // Only render the admin link if the user is an admin
  if (!isAdmin) return null;

  return (
    <Tooltip title="Admin Dashboard">
      <Button
        component={RouterLink}
        to="/admin"
        color="inherit"
        sx={{
          display: "flex",
          alignItems: "center",
          ml: 1,
          "&:hover": {
            backgroundColor: "rgba(255, 255, 255, 0.1)",
          },
        }}
        startIcon={<AdminPanelSettingsIcon />}
      >
        Admin
      </Button>
    </Tooltip>
  );
};

export default AdminNavLink;
