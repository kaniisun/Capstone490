import React from "react";
import {
  IconButton,
  Tooltip,
  Typography,
  Box,
  Paper,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";

const ReportedMessageItem = ({ report, onDismissReport, onDeleteMessage }) => {
  // Extract data from the report
  const message = report.messages || {};
  const formattedDate = message.created_at
    ? new Date(message.created_at).toLocaleString()
    : "Date unavailable";

  return (
    <Paper
      elevation={2}
      sx={{
        mb: 2,
        p: 2,
        bgcolor: "error.lightest",
        borderLeft: 3,
        borderColor: "error.main",
      }}
    >
      <Box sx={{ mb: 2 }}>
        <Typography variant="subtitle1" fontWeight="medium" gutterBottom>
          Report #{report.report_id}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Reported by: {report.reporter_id || "Unknown"}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Reason: {report.reason || "No reason provided"}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Date Reported: {new Date(report.created_at).toLocaleString()}
        </Typography>
      </Box>

      <Paper sx={{ p: 2, mb: 2, bgcolor: "background.paper" }}>
        <Typography variant="subtitle2" gutterBottom>
          Message Content:
        </Typography>
        <Typography variant="body1" paragraph sx={{ wordBreak: "break-word" }}>
          {message.content || "Message content unavailable"}
        </Typography>
        <Box sx={{ display: "flex", justifyContent: "space-between" }}>
          <Typography variant="body2" color="text.secondary">
            Message ID: {message.message_id || "Unknown"}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Sent: {formattedDate}
          </Typography>
        </Box>
        <Typography variant="body2" color="text.secondary">
          Sender ID: {message.sender_id || "Unknown"}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Conversation ID: {message.conversation_id || "Unknown"}
        </Typography>
      </Paper>

      <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1 }}>
        <Tooltip title="Dismiss Report (No Action Needed)">
          <IconButton
            onClick={() => onDismissReport(report.report_id)}
            color="primary"
            aria-label="dismiss report"
          >
            <CheckCircleIcon />
          </IconButton>
        </Tooltip>
        <Tooltip title="Delete Message">
          <IconButton
            onClick={() =>
              onDeleteMessage(message.message_id, report.report_id)
            }
            color="error"
            aria-label="delete message"
          >
            <DeleteIcon />
          </IconButton>
        </Tooltip>
      </Box>
    </Paper>
  );
};

export default ReportedMessageItem;
