import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Box,
  Typography,
  Alert,
  Paper,
  List,
  Divider,
  FormControlLabel,
  Switch,
  TextField,
  InputAdornment,
  IconButton,
  Button,
  Tabs,
  Tab,
  Card,
  CardContent,
  CircularProgress,
  Chip,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import ClearIcon from "@mui/icons-material/Clear";
import FlagIcon from "@mui/icons-material/Flag";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import ContentItem from "./ContentItem";
import { supabase } from "../../../../supabaseClient";

const ContentModerationTab = ({
  posts,
  privateMessages: initialPrivateMessages,
  handleFlagPost: onFlagPost,
  handleUnflagPost: onUnflagPost,
  handleFlagPrivateMessage: onFlagPrivateMessage,
  handleUnflagPrivateMessage: onUnflagPrivateMessage,
  handleDeletePrivateMessage: onDeletePrivateMessage,
  fetchPrivateMessages: fetchPrivateMessagesFromProps,
  setSnackbar,
}) => {
  const [contentType, setContentType] = useState("openBoard");
  const [showFlaggedPosts, setShowFlaggedPosts] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [privateMessages, setPrivateMessages] = useState(
    initialPrivateMessages || []
  );
  const [loading, setLoading] = useState(false);
  const [usernames, setUsernames] = useState({});
  const [error, setError] = useState(null);

  // Fetch usernames
  const fetchUsernames = useCallback(
    async (userIds) => {
      if (!userIds || userIds.length === 0) return;

      const { data, error } = await supabase
        .from("users")
        .select("userID, firstName, lastName")
        .in("userID", userIds);

      if (error) {
        console.error("Error fetching usernames:", error);
        if (setSnackbar) {
          setSnackbar({
            open: true,
            message: `Error fetching usernames: ${error.message}`,
            severity: "error",
          });
        }
      } else if (data) {
        const usernameMap = data.reduce((acc, user) => {
          acc[user.userID] = {
            firstName: user.firstName || "",
            lastName: user.lastName || "",
          };
          return acc;
        }, {});
        setUsernames((prev) => ({ ...prev, ...usernameMap }));
      }
    },
    [setSnackbar]
  );

  // Fetch private messages
  const fetchPrivateMessages = useCallback(async () => {
    if (contentType !== "privateMessages") return;

    setLoading(true);

    try {
      if (fetchPrivateMessagesFromProps) {
        try {
          const data = await fetchPrivateMessagesFromProps();

          if (data) {
            setPrivateMessages(data);

            // Get unique user IDs from messages and extract usernames from object fields
            const userIds = new Set();
            const usernamesMap = {};

            data.forEach((msg) => {
              try {
                // Handle regular IDs
                if (msg.sender_id && typeof msg.sender_id === "string") {
                  userIds.add(msg.sender_id);
                }
                if (msg.receiver_id && typeof msg.receiver_id === "string") {
                  userIds.add(msg.receiver_id);
                }

                // Extract usernames from object fields if present
                if (msg.original_sender) {
                  if (msg.original_sender.userID) {
                    usernamesMap[msg.original_sender.userID] = {
                      firstName: msg.original_sender.firstName || "",
                      lastName: msg.original_sender.lastName || "",
                    };
                  }
                }
                if (msg.original_receiver) {
                  if (msg.original_receiver.userID) {
                    usernamesMap[msg.original_receiver.userID] = {
                      firstName: msg.original_receiver.firstName || "",
                      lastName: msg.original_receiver.lastName || "",
                    };
                  }
                }
              } catch (err) {
                // Error processing message
              }
            });

            // Update usernames with any we found in the objects
            if (Object.keys(usernamesMap).length > 0) {
              setUsernames((prev) => ({ ...prev, ...usernamesMap }));
            }

            // Fetch additional usernames for any remaining IDs
            if (userIds.size > 0) {
              fetchUsernames(Array.from(userIds));
            }
          }
        } catch (innerErr) {
          if (setSnackbar) {
            setSnackbar({
              open: true,
              message: `Error fetching messages: ${innerErr.message}`,
              severity: "error",
            });
          }
        }
      } else {
        const { data, error } = await supabase
          .from("messages")
          .select("*")
          .order("created_at", { ascending: false });

        if (error) {
          if (setSnackbar) {
            setSnackbar({
              open: true,
              message: `Error fetching messages: ${error.message}`,
              severity: "error",
            });
          }
        } else if (data) {
          setPrivateMessages(data);

          // Get unique user IDs from messages
          const userIds = new Set();
          data.forEach((msg) => {
            if (msg.sender_id) userIds.add(msg.sender_id);
            if (msg.receiver_id) userIds.add(msg.receiver_id);
          });

          // Fetch usernames for these IDs
          fetchUsernames(Array.from(userIds));
        }
      }
    } catch (err) {
      if (setSnackbar) {
        setSnackbar({
          open: true,
          message: `Error: ${err.message}`,
          severity: "error",
        });
      }
    } finally {
      setLoading(false);
    }
  }, [contentType, fetchPrivateMessagesFromProps, setSnackbar, fetchUsernames]);

  // Load private messages when the tab is selected
  useEffect(() => {
    let isMounted = true;

    if (contentType === "privateMessages") {
      // Check if we already have messages before fetching
      if (privateMessages.length === 0) {
        fetchPrivateMessages().then((messages) => {
          if (isMounted) {
            // Messages loaded
          }
        });
      }
    }

    return () => {
      isMounted = false;
    };
  }, [contentType]); // Remove fetchPrivateMessages from dependencies to prevent fetch loops

  // Initialize with provided privateMessages if any
  useEffect(() => {
    // Keep track if component is mounted
    let isMounted = true;

    // Only run this effect if we don't already have messages and initialPrivateMessages has data
    if (
      privateMessages.length === 0 &&
      initialPrivateMessages &&
      initialPrivateMessages.length > 0
    ) {
      if (isMounted) {
        setPrivateMessages(initialPrivateMessages);

        // Get unique user IDs from messages
        const userIds = new Set();
        const usernamesMap = {};

        initialPrivateMessages.forEach((msg) => {
          try {
            // Handle regular IDs
            if (msg.sender_id && typeof msg.sender_id === "string") {
              userIds.add(msg.sender_id);
            }
            if (msg.receiver_id && typeof msg.receiver_id === "string") {
              userIds.add(msg.receiver_id);
            }

            // Extract usernames from object fields if present
            if (msg.original_sender) {
              if (msg.original_sender.userID) {
                usernamesMap[msg.original_sender.userID] = {
                  firstName: msg.original_sender.firstName || "",
                  lastName: msg.original_sender.lastName || "",
                };
              }
            }
            if (msg.original_receiver) {
              if (msg.original_receiver.userID) {
                usernamesMap[msg.original_receiver.userID] = {
                  firstName: msg.original_receiver.firstName || "",
                  lastName: msg.original_receiver.lastName || "",
                };
              }
            }
          } catch (err) {
            console.error("Error processing message for usernames:", err, msg);
          }
        });

        // Update usernames with any we found in the objects
        if (Object.keys(usernamesMap).length > 0) {
          setUsernames((prev) => ({ ...prev, ...usernamesMap }));
        }

        // Fetch additional usernames for any remaining IDs
        if (userIds.size > 0) {
          fetchUsernames(Array.from(userIds));
        }
      }
    }

    return () => {
      isMounted = false;
    };
  }, [initialPrivateMessages]); // Remove privateMessages and fetchUsernames from dependencies

  // Add a function to refresh private messages data
  const refreshPrivateMessages = async () => {
    try {
      // If we have a function to fetch messages from props, use it
      if (typeof fetchPrivateMessagesFromProps === "function") {
        const freshData = await fetchPrivateMessagesFromProps(true);
        if (freshData && freshData.length > 0) {
          setPrivateMessages(freshData);
        }
      } else {
        // Otherwise, use the local fetchPrivateMessages function
        fetchPrivateMessages();
      }
    } catch (err) {
      console.error("Error refreshing private messages:", err);
    }
  };

  // Flag a private message - use the hook function if provided, otherwise use local implementation
  const handleFlagPrivateMessage = async (message) => {
    if (!message || !message.id) return;

    // Use the hook version if provided
    if (typeof onFlagPrivateMessage === "function") {
      try {
        const success = await onFlagPrivateMessage(message);
        if (success) {
          // Update local state
          setPrivateMessages((prev) => {
            const updatedMessages = prev.map((msg) =>
              msg.id === message.id
                ? {
                    ...msg,
                    status: "flagged",
                    updated_at: new Date().toISOString(),
                  }
                : msg
            );
            return updatedMessages;
          });

          // Refresh the data to ensure changes are persisted
          await refreshPrivateMessages();

          // Stay on the private messages tab
          setContentType("privateMessages");

          // If we're not showing flagged posts, switch to them
          if (!showFlaggedPosts) {
            setShowFlaggedPosts(true);
          }

          // Show success message
          if (setSnackbar) {
            setSnackbar({
              open: true,
              message: "Message has been flagged and hidden from users",
              severity: "success",
            });
          } else {
            alert("Message has been flagged and hidden from users");
          }
        }
      } catch (error) {
        // Error with flag function
      }
    } else {
      // Fallback to local implementation
      try {
        // Update message status in database
        const { error } = await supabase
          .from("messages")
          .update({
            status: "flagged",
            updated_at: new Date().toISOString(),
          })
          .eq("id", message.id);

        if (error) throw error;

        // Update local state
        setPrivateMessages((prev) => {
          const updatedMessages = prev.map((msg) =>
            msg.id === message.id
              ? {
                  ...msg,
                  status: "flagged",
                  updated_at: new Date().toISOString(),
                }
              : msg
          );
          return updatedMessages;
        });

        // Refresh the data to ensure changes are persisted
        await refreshPrivateMessages();

        // Stay on the private messages tab
        setContentType("privateMessages");

        // If we're not showing flagged posts, switch to them
        if (!showFlaggedPosts) {
          setShowFlaggedPosts(true);
        }

        // Show success message
        if (setSnackbar) {
          setSnackbar({
            open: true,
            message: "Message has been flagged and hidden from users",
            severity: "success",
          });
        } else {
          alert("Message has been flagged and hidden from users");
        }
      } catch (error) {
        if (setSnackbar) {
          setSnackbar({
            open: true,
            message: `Error flagging message: ${error.message}`,
            severity: "error",
          });
        } else {
          alert(`Error flagging message: ${error.message}`);
        }
      }
    }
  };

  // Unflag a private message - use the hook function if provided, otherwise use local implementation
  const handleUnflagPrivateMessage = async (message) => {
    if (!message || !message.id) return;

    // Use the hook version if provided
    if (typeof onUnflagPrivateMessage === "function") {
      try {
        const success = await onUnflagPrivateMessage(message);
        if (success) {
          // Update local state
          setPrivateMessages((prev) => {
            const updatedMessages = prev.map((msg) =>
              msg.id === message.id
                ? {
                    ...msg,
                    status: "active",
                    updated_at: new Date().toISOString(),
                  }
                : msg
            );
            return updatedMessages;
          });

          // Refresh the data to ensure changes are persisted
          await refreshPrivateMessages();

          // Stay on the private messages tab
          setContentType("privateMessages");

          // If we're showing flagged posts, switch back to active
          if (showFlaggedPosts) {
            setShowFlaggedPosts(false);
          }

          // Show success message
          if (setSnackbar) {
            setSnackbar({
              open: true,
              message: "Message has been approved and restored",
              severity: "success",
            });
          }
        }
      } catch (error) {
        // Error with unflag function
      }
    } else {
      // Fallback to local implementation
      try {
        // Update message status in database
        const { error } = await supabase
          .from("messages")
          .update({
            status: "active",
            updated_at: new Date().toISOString(),
          })
          .eq("id", message.id);

        if (error) throw error;

        // Update local state
        setPrivateMessages((prev) => {
          const updatedMessages = prev.map((msg) =>
            msg.id === message.id
              ? {
                  ...msg,
                  status: "active",
                  updated_at: new Date().toISOString(),
                }
              : msg
          );
          return updatedMessages;
        });

        // Refresh the data to ensure changes are persisted
        await refreshPrivateMessages();

        // Stay on the private messages tab
        setContentType("privateMessages");

        // If we're showing flagged posts, switch back to active
        if (showFlaggedPosts) {
          setShowFlaggedPosts(false);
        }

        // Show success message
        if (setSnackbar) {
          setSnackbar({
            open: true,
            message: "Message has been approved and restored",
            severity: "success",
          });
        } else {
          alert("Message has been approved and restored");
        }
      } catch (error) {
        if (setSnackbar) {
          setSnackbar({
            open: true,
            message: `Error unflagging message: ${error.message}`,
            severity: "error",
          });
        } else {
          alert(`Error unflagging message: ${error.message}`);
        }
      }
    }
  };

  // Delete a private message - use the hook function if provided, otherwise use local implementation
  const handleDeletePrivateMessage = async (message) => {
    if (!message || !message.id) return;

    // Use the hook version if provided
    if (typeof onDeletePrivateMessage === "function") {
      try {
        const success = await onDeletePrivateMessage(message);
        if (success) {
          // Update local state by removing the message
          setPrivateMessages((prev) =>
            prev.filter((msg) => msg.id !== message.id)
          );

          // Refresh the data to ensure changes are persisted
          await refreshPrivateMessages();
        }
      } catch (error) {
        // Error with delete function
      }
    } else {
      // Fallback to local implementation
      try {
        // Delete the message from the database
        const { error } = await supabase
          .from("messages")
          .delete()
          .eq("id", message.id);

        if (error) throw error;

        // Update local state by removing the message
        setPrivateMessages((prev) =>
          prev.filter((msg) => msg.id !== message.id)
        );

        // Refresh the data to ensure changes are persisted
        await refreshPrivateMessages();

        // Show success message
        if (setSnackbar) {
          setSnackbar({
            open: true,
            message: "Message has been permanently deleted",
            severity: "success",
          });
        } else {
          alert("Message has been permanently deleted");
        }
      } catch (error) {
        if (setSnackbar) {
          setSnackbar({
            open: true,
            message: `Error deleting message: ${error.message}`,
            severity: "error",
          });
        } else {
          alert(`Error deleting message: ${error.message}`);
        }
      }
    }
  };

  // Toggle flagged posts visibility
  const handleToggleFlaggedPosts = () => {
    setShowFlaggedPosts(!showFlaggedPosts);

    // Ensure we stay on the current content type
    if (contentType !== "openBoard" && contentType !== "privateMessages") {
      setContentType("privateMessages"); // Default to private messages if unknown type
    }
  };

  // Clear search query
  const handleClearSearch = () => {
    setSearchQuery("");
  };

  // Format date for display
  const formatDateTime = (dateString) => {
    if (!dateString) return "Unknown date";
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  // Safely get items from content arrays
  const safeGetItems = (items, defaultValue = []) => {
    try {
      if (!items) return defaultValue;
      if (!Array.isArray(items)) {
        return defaultValue;
      }
      return items;
    } catch (err) {
      return defaultValue;
    }
  };

  // Filter active and flagged content based on content type
  const activeContent = useMemo(() => {
    try {
      if (contentType === "openBoard") {
        return safeGetItems(posts).filter((post) => post.status === "active");
      } else {
        // Count how many messages are in each status category
        const allMessages = safeGetItems(privateMessages);
        const active = allMessages.filter(
          (msg) => msg.status === "active" || !msg.status
        );

        return active;
      }
    } catch (err) {
      setError("Error loading content. Please try refreshing the page.");
      return [];
    }
  }, [contentType, posts, privateMessages]);

  const flaggedContent = useMemo(() => {
    try {
      if (contentType === "openBoard") {
        return safeGetItems(posts).filter((post) => post.status === "flagged");
      } else {
        // Filter flagged messages
        const allMessages = safeGetItems(privateMessages);
        const flagged = allMessages.filter(
          (message) => message.status === "flagged"
        );

        return flagged;
      }
    } catch (err) {
      setError(
        "Error loading flagged content. Please try refreshing the page."
      );
      return [];
    }
  }, [contentType, posts, privateMessages]);

  // Determine which content to display
  const displayedContent = showFlaggedPosts ? flaggedContent : activeContent;

  // Filter content based on search query
  const filteredContent = displayedContent.filter((item) => {
    const searchLower = searchQuery.toLowerCase();

    if (contentType === "openBoard") {
      // For open board posts
      return (
        item.title?.toLowerCase().includes(searchLower) ||
        item.content?.toLowerCase().includes(searchLower) ||
        String(item.creator_id?.firstName || "")
          .toLowerCase()
          .includes(searchLower) ||
        String(item.creator_id?.lastName || "")
          .toLowerCase()
          .includes(searchLower)
      );
    } else {
      // For private messages
      return (
        item.content?.toLowerCase().includes(searchLower) ||
        formatUserDisplay(item.sender_id, usernames)
          .toLowerCase()
          .includes(searchLower) ||
        formatUserDisplay(item.receiver_id, usernames)
          .toLowerCase()
          .includes(searchLower)
      );
    }
  });

  // Format user display to show full name
  const formatUserDisplay = (userId, usernames) => {
    if (typeof userId === "object" && userId.firstName) {
      // Handle original_sender/original_receiver objects
      return (
        `${userId.firstName || ""} ${userId.lastName || ""}`.trim() || "Unknown"
      );
    } else if (typeof userId === "string" && usernames[userId]) {
      // Handle user IDs with lookup in usernames map
      const user = usernames[userId];
      if (typeof user === "object") {
        return (
          `${user.firstName || ""} ${user.lastName || ""}`.trim() || "Unknown"
        );
      } else {
        return user || "Unknown";
      }
    } else {
      // Fallback for any other case - show friendly message instead of ID
      return "Unknown User";
    }
  };

  // Add effect to automatically show flagged posts after flagging, and active posts after unflagging
  useEffect(() => {
    // When a user flags a message and the flagged posts are not being shown,
    // automatically switch to show flagged posts
    const handleMessageFlagged = (messagesData) => {
      if (messagesData && Array.isArray(messagesData)) {
        const hasFlaggedMessages = messagesData.some(
          (msg) => msg.status === "flagged"
        );

        if (
          hasFlaggedMessages &&
          contentType === "privateMessages" &&
          !showFlaggedPosts
        ) {
          // If there are flagged messages but we're not showing them, update the UI
          setShowFlaggedPosts(true);
        }
      }
    };

    // Check the private messages for any flagged messages
    handleMessageFlagged(privateMessages);
  }, [privateMessages, contentType, showFlaggedPosts]);

  return (
    <Box>
      <Alert severity="info" sx={{ mb: 3 }}>
        <Typography variant="body2" component="div">
          Moderate community content. Flag inappropriate content for review or
          restore flagged content.
        </Typography>
      </Alert>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          <Typography variant="body2" component="div">
            {error}
          </Typography>
        </Alert>
      )}

      {/* Content type selector */}
      <Box sx={{ mb: 3, borderBottom: 1, borderColor: "divider" }}>
        <Tabs
          value={contentType}
          onChange={(e, newValue) => setContentType(newValue)}
          indicatorColor="primary"
          textColor="primary"
        >
          <Tab label="Community Board Posts" value="openBoard" />
          <Tab label="Private Messages" value="privateMessages" />
        </Tabs>
      </Box>

      {/* Search and filter controls */}
      <Box
        sx={{
          mb: 2,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 2,
        }}
      >
        <TextField
          sx={{ flex: 1 }}
          variant="outlined"
          placeholder={
            contentType === "openBoard"
              ? "Search posts by title, content or user..."
              : "Search messages by content or user..."
          }
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

        <FormControlLabel
          control={
            <Switch
              checked={showFlaggedPosts}
              onChange={handleToggleFlaggedPosts}
              color="warning"
            />
          }
          label={
            <Typography variant="body2" component="span">
              {showFlaggedPosts
                ? `Flagged ${
                    contentType === "openBoard" ? "Posts" : "Messages"
                  } (${flaggedContent.length})`
                : `Active ${
                    contentType === "openBoard" ? "Posts" : "Messages"
                  } (${activeContent.length})`}
            </Typography>
          }
        />
      </Box>

      {flaggedContent.length > 0 && showFlaggedPosts && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          <Typography variant="body2" component="div">
            Showing {flaggedContent.length} flagged{" "}
            {contentType === "openBoard" ? "posts" : "messages"} that need
            review.
          </Typography>
        </Alert>
      )}

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", my: 3 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Paper elevation={2}>
          <List sx={{ p: 0 }}>
            {filteredContent.length === 0 ? (
              <Box sx={{ p: 3, textAlign: "center" }}>
                <Typography
                  variant="body1"
                  color="text.secondary"
                  component="div"
                >
                  {searchQuery
                    ? "No content found matching your search."
                    : showFlaggedPosts
                    ? `No flagged ${
                        contentType === "openBoard" ? "posts" : "messages"
                      } found.`
                    : `No active ${
                        contentType === "openBoard" ? "posts" : "messages"
                      } found.`}
                </Typography>
              </Box>
            ) : contentType === "openBoard" ? (
              // Display Open Board Posts
              filteredContent.map((post) => (
                <ContentItem
                  key={post.open_board_id}
                  item={post}
                  isFlagged={post.status === "flagged"}
                  onFlag={onFlagPost}
                  onUnflag={onUnflagPost}
                />
              ))
            ) : (
              // Display Private Messages
              filteredContent.map((message) => (
                <Card
                  key={message.id}
                  sx={{
                    mb: 3,
                    borderRadius: 1,
                    bgcolor:
                      message.status === "flagged"
                        ? "rgba(255, 235, 235, 0.1)"
                        : "background.paper",
                  }}
                >
                  <CardContent sx={{ pb: 2 }}>
                    <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
                      <Typography
                        variant="h6"
                        component="div"
                        sx={{ flexGrow: 1 }}
                      >
                        Private Message
                        <Chip
                          label={
                            message.status === "flagged" ? "Flagged" : "Active"
                          }
                          color={
                            message.status === "flagged" ? "warning" : "success"
                          }
                          size="small"
                          variant={
                            message.status === "flagged" ? "filled" : "outlined"
                          }
                          sx={{ ml: 1, height: 20, fontSize: "0.75rem" }}
                        />
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {formatDateTime(message.created_at)}
                      </Typography>
                    </Box>

                    <Box
                      sx={{ display: "flex", flexDirection: "column", mb: 1 }}
                    >
                      <Typography variant="body2" component="div">
                        <Box
                          component="span"
                          sx={{
                            fontWeight: "bold",
                            color: "text.primary",
                            mr: 0.5,
                            display: "inline-block",
                            width: "3.5rem",
                          }}
                        >
                          From:
                        </Box>
                        <Box component="span" sx={{ fontWeight: "medium" }}>
                          {/* Try to get names directly from original_sender if available */}
                          {message.original_sender
                            ? `${message.original_sender.firstName || ""} ${
                                message.original_sender.lastName || ""
                              }`.trim() || "Unknown User"
                            : formatUserDisplay(message.sender_id, usernames)}
                        </Box>
                      </Typography>

                      <Typography variant="body2" component="div">
                        <Box
                          component="span"
                          sx={{
                            fontWeight: "bold",
                            color: "text.primary",
                            mr: 0.5,
                            display: "inline-block",
                            width: "3.5rem",
                          }}
                        >
                          To:
                        </Box>
                        <Box component="span" sx={{ fontWeight: "medium" }}>
                          {/* Try to get names directly from original_receiver if available */}
                          {message.original_receiver
                            ? `${message.original_receiver.firstName || ""} ${
                                message.original_receiver.lastName || ""
                              }`.trim() || "Unknown User"
                            : formatUserDisplay(message.receiver_id, usernames)}
                        </Box>
                      </Typography>
                    </Box>

                    <Divider sx={{ my: 1.5 }} />

                    <Typography
                      variant="body1"
                      component="div"
                      sx={{ py: 1.5 }}
                    >
                      {message.content || "No content"}
                    </Typography>

                    {message.reply_to && (
                      <Box
                        sx={{
                          mt: 1,
                          p: 1,
                          backgroundColor: "background.default",
                          borderRadius: 1,
                        }}
                      >
                        <Typography variant="caption" color="text.secondary">
                          Replying to previous message
                        </Typography>
                      </Box>
                    )}
                  </CardContent>

                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "flex-end",
                      gap: 1,
                      px: 2,
                      pb: 2,
                    }}
                  >
                    <Button
                      variant="outlined"
                      color="warning"
                      size="small"
                      startIcon={<FlagIcon sx={{ fontSize: "0.9rem" }} />}
                      onClick={() => handleFlagPrivateMessage(message)}
                      sx={{
                        display: message.status === "flagged" ? "none" : "flex",
                        fontSize: "0.75rem",
                        py: 0.5,
                        px: 1,
                        minWidth: "60px",
                        maxWidth: "80px",
                      }}
                    >
                      Flag
                    </Button>

                    <Button
                      variant="outlined"
                      color="success"
                      size="small"
                      startIcon={
                        <CheckCircleOutlineIcon sx={{ fontSize: "0.9rem" }} />
                      }
                      onClick={() => handleUnflagPrivateMessage(message)}
                      sx={{
                        display: message.status !== "flagged" ? "none" : "flex",
                        fontSize: "0.75rem",
                        py: 0.5,
                        px: 1,
                        minWidth: "80px",
                        maxWidth: "100px",
                      }}
                    >
                      Approve
                    </Button>
                    <Button
                      variant="outlined"
                      color="error"
                      size="small"
                      onClick={() => handleDeletePrivateMessage(message)}
                      sx={{
                        fontSize: "0.75rem",
                        py: 0.5,
                        px: 1,
                        minWidth: "60px",
                        maxWidth: "80px",
                      }}
                    >
                      Delete
                    </Button>
                  </Box>
                </Card>
              ))
            )}
          </List>
        </Paper>
      )}
    </Box>
  );
};

export default ContentModerationTab;
