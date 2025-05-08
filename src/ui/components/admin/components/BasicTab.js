import React from "react";
import { Box, Alert, Typography } from "@mui/material";

const BasicTab = ({ title, infoMessage, keyPrefix }) => {
  return (
    <Box sx={{ mb: 2 }}>
      <Alert severity="info" sx={{ mb: 2 }} key={`${keyPrefix}-info-alert`}>
        <Typography variant="body2">
          {infoMessage || "This feature is under development."}
        </Typography>
      </Alert>
    </Box>
  );
};

export default BasicTab;
