import React from "react";
import { Paper, Typography, Box } from "@mui/material";

const StatsCard = ({
  title,
  value,
  secondaryValue,
  secondaryLabel,
  icon,
  color = "primary",
}) => {
  return (
    <Paper
      elevation={3}
      sx={{
        p: 2,
        height: "100%",
        display: "flex",
        flexDirection: "column",
        borderTop: 3,
        borderColor: `${color}.main`,
      }}
    >
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
        }}
      >
        <Box>
          <Typography variant="h6" component="h3" gutterBottom>
            {title}
          </Typography>
          <Typography variant="h4" component="div" sx={{ fontWeight: "bold" }}>
            {value}
          </Typography>
          {secondaryValue !== undefined && (
            <Box sx={{ display: "flex", alignItems: "center", mt: 1 }}>
              <Typography variant="body2" color="text.secondary">
                {secondaryLabel}: {secondaryValue}
              </Typography>
            </Box>
          )}
        </Box>
        {icon && (
          <Box
            sx={{
              backgroundColor: `${color}.light`,
              borderRadius: "50%",
              p: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {icon}
          </Box>
        )}
      </Box>
    </Paper>
  );
};

export default StatsCard;
