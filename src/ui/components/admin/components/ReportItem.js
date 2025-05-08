import React from "react";
import {
  Box,
  Paper,
  Typography,
  Chip,
  Divider,
  Button,
  Tooltip,
} from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import BlockIcon from "@mui/icons-material/Block";

const ReportItem = ({ report, onDismiss, onBan }) => {
  const formatDate = (dateString) => {
    if (!dateString) return "Unknown date";
    return new Date(dateString).toLocaleString();
  };

  return (
    <Paper
      elevation={2}
      sx={{
        mb: 3,
        p: 2,
        borderLeft: 4,
        borderColor: "error.main",
        bgcolor: "background.paper",
      }}
    >
      {/* Report Header */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2 }}>
        <Typography variant="h6" component="div">
          Report #{report.report_id}
        </Typography>
        <Chip
          label={report.report_type === "post" ? "Post" : "Message"}
          color={report.report_type === "post" ? "primary" : "secondary"}
          size="small"
          sx={{ fontWeight: "medium" }}
        />
      </Box>

      {/* Report Details */}
      <Box sx={{ display: "flex", flexDirection: "column", gap: 1, mb: 2 }}>
        <Typography variant="body2" color="text.secondary">
          <Box component="span" sx={{ fontWeight: "bold", mr: 1 }}>
            Reported User:
          </Box>
          {report.reportedUserName}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          <Box component="span" sx={{ fontWeight: "bold", mr: 1 }}>
            Reported By:
          </Box>
          {report.reporterName}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          <Box component="span" sx={{ fontWeight: "bold", mr: 1 }}>
            Reason:
          </Box>
          {report.report || "No reason provided"}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          <Box component="span" sx={{ fontWeight: "bold", mr: 1 }}>
            Date:
          </Box>
          {formatDate(report.created_at)}
        </Typography>
      </Box>

      <Divider sx={{ my: 2 }} />

      {/* Content Preview */}
      <Box sx={{ mb: 2 }}>
        <Typography
          variant="subtitle2"
          gutterBottom
          sx={{ color: "text.primary", fontWeight: "bold" }}
        >
          Content Preview:
        </Typography>
        <Paper
          elevation={0}
          sx={{
            p: 2,
            bgcolor: "background.default",
            borderRadius: 1,
            maxHeight: "150px",
            overflow: "auto",
          }}
        >
          <Typography variant="body1" sx={{ wordBreak: "break-word" }}>
            {report.content || "Content unavailable"}
          </Typography>
        </Paper>

        {report.report_type === "post" && report.fullContent?.title && (
          <Typography variant="body2" sx={{ mt: 1, fontStyle: "italic" }}>
            Post Title: {report.fullContent.title}
          </Typography>
        )}
      </Box>

      {/* Actions */}
      <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 2 }}>
        <Tooltip title="Dismiss Report (No Action Needed)">
          <Button
            variant="outlined"
            color="primary"
            startIcon={<CheckCircleIcon />}
            onClick={() => onDismiss(report.report_id)}
          >
            Dismiss
          </Button>
        </Tooltip>
        <Tooltip title="Ban User & Remove Content">
          <Button
            variant="contained"
            color="error"
            startIcon={<BlockIcon />}
            onClick={() => onBan(report)}
          >
            Ban
          </Button>
        </Tooltip>
      </Box>
    </Paper>
  );
};

export default ReportItem;
