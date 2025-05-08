import React, { useState, useEffect } from "react";
import {
  Box,
  Alert,
  Typography,
  CircularProgress,
  TextField,
  InputAdornment,
  IconButton,
  Tabs,
  Tab,
  Button,
  Badge,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Avatar,
  Paper,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import ClearIcon from "@mui/icons-material/Clear";
import RefreshIcon from "@mui/icons-material/Refresh";
import BlockIcon from "@mui/icons-material/Block";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import PersonOffIcon from "@mui/icons-material/PersonOff";
import ReportItem from "./ReportItem";
import { useReportManagement } from "../hooks/useReportManagement";

const ReportsTab = ({ setSnackbar }) => {
  // Use the report management hook
  const {
    reports,
    loading,
    error,
    fetchReports,
    dismissReport,
    banUserAndHandleContent,
  } = useReportManagement(setSnackbar);

  // State
  const [filteredReports, setFilteredReports] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [tabValue, setTabValue] = useState("all");

  // Ban confirmation dialog state
  const [banDialogOpen, setBanDialogOpen] = useState(false);
  const [reportToBan, setReportToBan] = useState(null);

  // Fetch reports on component mount
  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  // Filter reports when search query or tab changes
  useEffect(() => {
    let filtered = [...reports];

    // Filter by tab
    if (tabValue === "posts") {
      filtered = filtered.filter((report) => report.report_type === "post");
    } else if (tabValue === "messages") {
      filtered = filtered.filter((report) => report.report_type === "message");
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (report) =>
          report.content?.toLowerCase().includes(query) ||
          report.reportedUserName?.toLowerCase().includes(query) ||
          report.reporterName?.toLowerCase().includes(query) ||
          report.report?.toLowerCase().includes(query)
      );
    }

    setFilteredReports(filtered);
  }, [reports, searchQuery, tabValue]);

  // Handle tab change
  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  // Clear search
  const handleCloseSearch = () => {
    setSearchQuery("");
  };

  // Handle report dismissal
  const handleDismiss = async (reportId) => {
    if (await dismissReport(reportId)) {
      // Success is handled in the hook
    }
  };

  // Open ban confirmation dialog
  const openBanDialog = (report) => {
    setReportToBan(report);
    setBanDialogOpen(true);
  };

  // Close ban confirmation dialog
  const closeBanDialog = () => {
    setBanDialogOpen(false);
    setReportToBan(null);
  };

  // Handle ban confirmation
  const confirmBan = async () => {
    if (reportToBan && (await banUserAndHandleContent(reportToBan))) {
      // Success is handled in the hook
      closeBanDialog();
    }
  };

  // Get counts for the tabs
  const counts = {
    all: reports.length,
    posts: reports.filter((report) => report.report_type === "post").length,
    messages: reports.filter((report) => report.report_type === "message")
      .length,
  };

  return (
    <Box>
      {/* Info alert with refresh button */}
      <Box sx={{ mb: 2 }}>
        <Alert
          severity="info"
          sx={{ mb: 2 }}
          action={
            <Button
              color="inherit"
              startIcon={<RefreshIcon />}
              onClick={fetchReports}
              disabled={loading}
            >
              Refresh
            </Button>
          }
        >
          <Typography variant="body2" component="div">
            Review reported content from across the platform. Choose to Dismiss
            reports or Ban users and remove content.
          </Typography>
        </Alert>
      </Box>

      {/* Content Reports Header */}
      <Typography variant="h6" component="h2" sx={{ mb: 2 }}>
        Content Reports
      </Typography>

      {/* Tabs and Search */}
      <Box sx={{ mb: 3 }}>
        <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 2 }}>
          <Tabs value={tabValue} onChange={handleTabChange}>
            <Tab
              label={
                <Box sx={{ display: "flex", alignItems: "center" }}>
                  <Typography component="span" variant="body2" sx={{ mr: 1.5 }}>
                    All Reports
                  </Typography>
                  <Badge
                    badgeContent={counts.all}
                    color="error"
                    sx={{
                      "& .MuiBadge-badge": {
                        fontSize: "0.65rem",
                        height: "16px",
                        minWidth: "16px",
                        padding: "0 4px",
                      },
                    }}
                  />
                </Box>
              }
              value="all"
            />
            <Tab
              label={
                <Box sx={{ display: "flex", alignItems: "center" }}>
                  <Typography component="span" variant="body2" sx={{ mr: 1.5 }}>
                    Posts
                  </Typography>
                  <Badge
                    badgeContent={counts.posts}
                    color="error"
                    sx={{
                      "& .MuiBadge-badge": {
                        fontSize: "0.65rem",
                        height: "16px",
                        minWidth: "16px",
                        padding: "0 4px",
                      },
                    }}
                  />
                </Box>
              }
              value="posts"
            />
            <Tab
              label={
                <Box sx={{ display: "flex", alignItems: "center" }}>
                  <Typography component="span" variant="body2" sx={{ mr: 1.5 }}>
                    Messages
                  </Typography>
                  <Badge
                    badgeContent={counts.messages}
                    color="error"
                    sx={{
                      "& .MuiBadge-badge": {
                        fontSize: "0.65rem",
                        height: "16px",
                        minWidth: "16px",
                        padding: "0 4px",
                      },
                    }}
                  />
                </Box>
              }
              value="messages"
            />
          </Tabs>
        </Box>

        <TextField
          fullWidth
          placeholder="Search by content, user, or reason..."
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
                <IconButton onClick={handleCloseSearch} edge="end" size="small">
                  <ClearIcon />
                </IconButton>
              </InputAdornment>
            ),
          }}
          variant="outlined"
          size="small"
          sx={{ mb: 2 }}
        />
      </Box>

      {/* Error message */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Report Content */}
      <Paper elevation={2} sx={{ p: 2, mb: 4 }}>
        {/* Loading indicator */}
        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", my: 3 }}>
            <CircularProgress />
          </Box>
        ) : filteredReports.length === 0 ? (
          <Alert severity="info">
            <Typography>
              {searchQuery
                ? "No reports match your search criteria."
                : "No reports found. All clear!"}
            </Typography>
          </Alert>
        ) : (
          <Box>
            {filteredReports.map((report) => (
              <ReportItem
                key={report.report_id}
                report={report}
                onDismiss={handleDismiss}
                onBan={openBanDialog}
              />
            ))}
          </Box>
        )}
      </Paper>

      {/* Ban confirmation dialog */}
      <Dialog
        open={banDialogOpen}
        onClose={closeBanDialog}
        aria-labelledby="ban-dialog-title"
        aria-describedby="ban-dialog-description"
        PaperProps={{
          sx: {
            borderTop: "4px solid #f44336",
            borderRadius: "8px",
            maxWidth: "500px",
            width: "100%",
          },
        }}
      >
        <DialogTitle
          id="ban-dialog-title"
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1.5,
            color: "#f44336",
            pb: 1,
          }}
        >
          <WarningAmberIcon color="error" />
          Ban User and Remove Content
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2, my: 1 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
              <Avatar sx={{ bgcolor: "#f44336" }}>
                <PersonOffIcon />
              </Avatar>
              <Typography variant="subtitle1" fontWeight={500}>
                {reportToBan?.reportedUserName || "User"}
              </Typography>
            </Box>

            <DialogContentText id="ban-dialog-description">
              You are about to:
            </DialogContentText>

            <Box component="ul" sx={{ pl: 2, mt: 0 }}>
              <Typography component="li" variant="body2" sx={{ mb: 0.5 }}>
                Ban user <strong>{reportToBan?.reportedUserName}</strong>{" "}
                (account will be suspended)
              </Typography>
              <Typography component="li" variant="body2">
                {reportToBan?.report_type === "post"
                  ? "Delete this post permanently"
                  : "Flag this message as inappropriate"}
              </Typography>
            </Box>

            <Alert severity="warning" sx={{ mt: 1 }}>
              This action cannot be undone directly. To restore user access,
              you'll need to manually reactivate their account from the User
              Management tab.
            </Alert>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={closeBanDialog}
            color="inherit"
            variant="outlined"
            sx={{ borderRadius: "8px" }}
          >
            Cancel
          </Button>
          <Button
            onClick={confirmBan}
            color="error"
            variant="contained"
            startIcon={<BlockIcon />}
            sx={{ borderRadius: "8px" }}
          >
            Ban User
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ReportsTab;
