import React, { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "../../../supabaseClient";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../../contexts/AuthContext";
import "./openboard.css";
import {
  Snackbar,
  Alert,
  Paper,
  Typography,
  Button,
  Card,
  CardContent,
  CardActions,
  IconButton,
  TextField,
  Divider,
  Box,
  Avatar,
  Tooltip,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  ThemeProvider,
  createTheme,
  Menu,
  MenuItem,
  ListItemIcon,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Breadcrumbs,
  Link,
  DialogContentText,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  CircularProgress,
  ListItemButton,
} from "@mui/material";
import ThumbUpIcon from "@mui/icons-material/ThumbUp";
import ThumbDownIcon from "@mui/icons-material/ThumbDown";
import CommentIcon from "@mui/icons-material/Comment";
import DeleteIcon from "@mui/icons-material/Delete";
import FlagIcon from "@mui/icons-material/Flag";
import AddIcon from "@mui/icons-material/Add";
import CloseIcon from "@mui/icons-material/Close";
import SortIcon from "@mui/icons-material/Sort";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import MessageIcon from "@mui/icons-material/Message";
import ShareIcon from "@mui/icons-material/Share";
import BookmarkIcon from "@mui/icons-material/Bookmark";
import MoreHorizIcon from "@mui/icons-material/MoreHoriz";
import ImageIcon from "@mui/icons-material/Image";
import LinkIcon from "@mui/icons-material/Link";
import axios from "axios";

// Create UNCG theme
const uncgTheme = createTheme({
  palette: {
    primary: {
      main: "#0F2044", // UNCG Navy
    },
    secondary: {
      main: "#FFB71B", // UNCG Gold
    },
    background: {
      default: "#F8F9FA", // Lighter background like Reddit
      paper: "#FFFFFF",
    },
    text: {
      primary: "#0F2044",
      secondary: "#767676",
    },
    error: {
      main: "#a00c30",
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h6: {
      fontWeight: 600,
    },
    fontSize: 14,
  },
  shape: {
    borderRadius: 4,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: "none",
          fontSize: "14px",
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 4,
          boxShadow: "0 1px 2px rgba(0, 0, 0, 0.05)",
        },
      },
    },
  },
});

const OpenBoard = () => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [userID, setUserID] = useState(localStorage.getItem("userId"));
  const [replyingTo, setReplyingTo] = useState(null);

  // Community state (replacing selectedContent)
  const [communities, setCommunities] = useState([]);
  const [selectedCommunity, setSelectedCommunity] = useState("all");
  const [communityDetails, setCommunityDetails] = useState({});

  const messagesEndRef = useRef(null);
  const { user } = useAuth();
  const [usernames, setUsernames] = useState({});
  const [votes, setVotes] = useState({}); // Track votes for each message
  const [refreshMessages, setRefreshMessages] = useState(false);

  const [showReportPopup, setShowReportPopup] = useState(false);
  const [selectedReasons, setSelectedReasons] = useState([]);
  const [messageToReport, setMessageToReport] = useState(null);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [contentToDelete, setContentToDelete] = useState(null);

  // Add snackbar state
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });

  const [selectedSort, setSelectedSort] = useState("hot");

  const [reportData, setReportData] = useState({
    open: false,
    messageId: null,
  });
  const [activeMessage, setActiveMessage] = useState(null);
  const [replyInput, setReplyInput] = useState({
    open: false,
    messageId: null,
  });
  const [anchorEl, setAnchorEl] = useState(null);
  const [moreOptionsMessage, setMoreOptionsMessage] = useState(null);
  const [replyMessage, setReplyMessage] = useState("");

  const [threadView, setThreadView] = useState(null);
  const [comments, setComments] = useState([]);
  const [commentReplies, setCommentReplies] = useState({});
  const [newComment, setNewComment] = useState("");
  const [replyingToComment, setReplyingToComment] = useState(null);

  // Sidebar states
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [newCommunityDialog, setNewCommunityDialog] = useState(false);
  const [newCommunityName, setNewCommunityName] = useState("");
  const [newCommunityDescription, setNewCommunityDescription] = useState("");

  // Additional states needed for the component
  const [openLoginDialog, setOpenLoginDialog] = useState(false);
  const [openErrorDialog, setOpenErrorDialog] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [openReportDialog, setOpenReportDialog] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [messageToDelete, setMessageToDelete] = useState(null);
  const [openNewPostDialog, setOpenNewPostDialog] = useState(false);
  const [newPostTitle, setNewPostTitle] = useState("");
  const [newPostContent, setNewPostContent] = useState("");
  const [openNewCommunityDialog, setOpenNewCommunityDialog] = useState(false);
  const [openThreadDialog, setOpenThreadDialog] = useState(false);
  const [selectedThread, setSelectedThread] = useState(null);
  const [threadComments, setThreadComments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [auth, setAuth] = useState({ currentUser: { id: userID } });

  const navigate = useNavigate();

  // API configuration
  const apiUrl = process.env.REACT_APP_API_URL || "/api";
  const token = localStorage.getItem("token");

  const reportReasons = [
    "Spam",
    "Harassment",
    "Hate Speech",
    "Scam or Fraud",
    "Explicit Content",
    "Other",
  ];

  useEffect(() => {
    setUserID(localStorage.getItem("userId"));
  }, []);

  // Add function to fetch usernames
  const fetchUsernames = useCallback(async (userIds) => {
    // Get unique IDs using filter instead of Set
    const uniqueIds = userIds.filter(
      (id, index, self) => self.indexOf(id) === index
    );
    const { data, error } = await supabase
      .from("users")
      .select("userID, firstName")
      .in("userID", uniqueIds);

    if (error) {
      console.error("Error fetching usernames:", error);
    } else if (data) {
      const usernameMap = data.reduce((acc, user) => {
        acc[user.userID] = user.firstName;
        return acc;
      }, {});
      setUsernames((prev) => ({ ...prev, ...usernameMap }));
    }
  }, []);

  // Fetch communities from the communities table
  const fetchCommunities = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("communities")
        .select("*")
        .order("created_at", { ascending: true });

      if (error) {
        console.error("Error fetching communities:", error);
      } else if (data) {
        // Process the communities
        const processedCommunities = data.map((item) => ({
          name: item.name,
          community_id: item.community_id,
          creator_id: item.creator_id,
          created_at: item.created_at,
          description: item.description,
        }));

        // Add default "all" community
        const allCommunities = [
          {
            name: "all",
            description: "All posts from all communities",
            isDefault: true,
          },
          ...processedCommunities,
        ];

        setCommunities(allCommunities);

        // Create details mapping
        const details = {};
        processedCommunities.forEach((community) => {
          details[community.name] = {
            community_id: community.community_id,
            creator_id: community.creator_id,
            created_at: community.created_at,
            description: community.description,
          };
        });
        setCommunityDetails(details);

        // Fetch usernames for community creators
        const userIds = processedCommunities
          .map((community) => community.creator_id)
          .filter(Boolean);
        fetchUsernames(userIds);
      }
    } catch (err) {
      console.error("Exception in fetchCommunities:", err);
    }
  }, [fetchUsernames]);

  useEffect(() => {
    fetchCommunities();
  }, [fetchCommunities]);

  // Modify fetchMessages to fetch posts by community
  const fetchMessages = useCallback(async () => {
    try {
      let query = supabase
        .from("open_board")
        .select("*")
        .eq("status", "active") // Only show active posts
        .order("created_at", { ascending: false }); // Newest first

      // Temporarily comment out the community filtering until there are posts with community values
      /*
      if (selectedCommunity !== "all") {
        // Filter by community if a specific one is selected
        query = query.eq("community", selectedCommunity);
      } else {
        // For "all" view, only show posts from communities, not direct messages
        query = query.not("community", "is", null);
      }
      */

      const { data, error } = await query;

      if (error) {
        console.error("Error fetching posts:", error.message);
      } else if (data) {
        setMessages(data);

        // Initialize vote counts (just for UI, not persisted to database)
        const initialVotes = {};
        data.forEach((post) => {
          initialVotes[post.open_board_id] = initialVotes[
            post.open_board_id
          ] || {
            count: Math.floor(Math.random() * 50), // Random vote count for demo
            userVote: 0,
          };
        });
        setVotes(initialVotes);

        // Fetch usernames for all posts
        const userIds = data.map((post) => post.creator_id).filter(Boolean);
        fetchUsernames(userIds);
      }
    } catch (err) {
      console.error("Exception in fetchMessages:", err);
    }
  }, [selectedCommunity, fetchUsernames]);

  useEffect(() => {
    fetchMessages();

    const messageChannel = supabase
      .channel("open_board")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "open_board" },
        (payload) => {
          console.log("New post received via realtime:", payload.new);

          // Check if the post belongs to the selected community or 'all'
          const belongsToCommunity =
            selectedCommunity === "all" ||
            payload.new.community === selectedCommunity;

          if (belongsToCommunity && payload.new.status === "active") {
            setMessages((prevMessages) => {
              const messageExists = prevMessages.some(
                (msg) => msg.open_board_id === payload.new.open_board_id
              );
              if (messageExists) {
                return prevMessages;
              }

              // Initialize vote count for new message
              setVotes((prev) => ({
                ...prev,
                [payload.new.open_board_id]: {
                  count: Math.floor(Math.random() * 30),
                  userVote: 0,
                },
              }));

              return [payload.new, ...prevMessages];
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(messageChannel);
    };
  }, [fetchMessages, selectedCommunity, refreshMessages]);

  // Handle content change
  const handleContentChange = (e) => {
    setSelectedCommunity(e.target.value);
  };

  // Modify createNewContent to create a separate content entry
  const createNewContent = async () => {
    const contentName = prompt("Enter a title for your community post:");
    if (!contentName) return;

    // Prevent creating content with name 'Message'
    if (contentName === "Message") {
      alert("This name is reserved for the general chat area.");
      return;
    }

    try {
      // First create a content entry
      const { data, error: contentError } = await supabase
        .from("open_board")
        .insert([
          {
            title: contentName,
            content: "Board Created",
            creator_id: userID,
            status: "active",
          },
        ])
        .select();

      if (contentError) {
        console.error("Error creating content:", contentError);
        alert("Failed to create content");
        return;
      }

      if (data && data[0]) {
        // Then add the content to the UI
        setCommunities((prev) => [
          ...prev,
          {
            title: contentName,
            creator_id: userID,
            created_at: data[0].created_at,
          },
        ]);
        setSelectedCommunity(contentName);
      }
    } catch (err) {
      console.error("Exception in createNewContent:", err);
      alert("Error creating content");
    }
  };

  // Handle vote
  const handleVote = (messageId, voteType) => {
    setVotes((prev) => {
      const currentVote = prev[messageId] || { count: 0, userVote: 0 };
      let newCount = currentVote.count;
      let newUserVote = currentVote.userVote;

      // If user is clicking the same button they already voted on, remove their vote
      if (currentVote.userVote === voteType) {
        newCount = voteType === 1 ? newCount - 1 : newCount + 1;
        newUserVote = 0;
      }
      // If user is switching their vote
      else if (currentVote.userVote !== 0) {
        newCount = voteType === 1 ? newCount + 2 : newCount - 2;
        newUserVote = voteType;
      }
      // If user hasn't voted yet
      else {
        newCount = voteType === 1 ? newCount + 1 : newCount - 1;
        newUserVote = voteType;
      }

      return {
        ...prev,
        [messageId]: {
          count: newCount,
          userVote: newUserVote,
        },
      };
    });
  };

  // Format date and time
  const formatDateTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60 * 60)
    );

    if (diffInHours < 1) {
      return `${Math.floor(
        (now.getTime() - date.getTime()) / (1000 * 60)
      )} minutes ago`;
    } else if (diffInHours < 24) {
      return `${diffInHours} ${diffInHours === 1 ? "hour" : "hours"} ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  // Format timestamp to a human-readable string
  const formatTimestamp = (timestamp) => {
    if (!timestamp) return "Unknown time";

    const date = new Date(timestamp);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) {
      return "just now";
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return `${minutes} minute${minutes > 1 ? "s" : ""} ago`;
    } else if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600);
      return `${hours} hour${hours > 1 ? "s" : ""} ago`;
    } else if (diffInSeconds < 2592000) {
      const days = Math.floor(diffInSeconds / 86400);
      return `${days} day${days > 1 ? "s" : ""} ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  // Handle reply
  const handleReply = async (message) => {
    if (!replyMessage.trim()) return;

    try {
      // Create reply data
      const replyData = {
        title: selectedCommunity,
        content: replyMessage.trim(),
        creator_id: userID,
        reply_to: message.open_board_id,
        status: "active",
      };

      // Insert reply using Supabase
      const { data, error } = await supabase
        .from("open_board")
        .insert([replyData])
        .select();

      if (error) {
        console.error("Error posting reply:", error);
        setSnackbar({
          open: true,
          message: "Failed to post reply. Please try again.",
          severity: "error",
        });
        return;
      }

      if (data && data[0]) {
        // Add the new reply to the messages
        setMessages((prevMessages) => [...prevMessages, data[0]]);

        // Initialize vote count for new reply
        setVotes((prev) => ({
          ...prev,
          [data[0].open_board_id]: {
            count: Math.floor(Math.random() * 10),
            userVote: 0,
          },
        }));

        setReplyMessage("");
        setSnackbar({
          open: true,
          message: "Reply posted successfully!",
          severity: "success",
        });
      }
    } catch (err) {
      console.error("Exception in handleReply:", err);
      setSnackbar({
        open: true,
        message: "Error posting reply. Please try again.",
        severity: "error",
      });
    }
  };

  // Cancel reply
  const cancelReply = () => {
    setReplyingTo(null);
    setNewMessage("");
  };

  // Handle closing the snackbar
  const handleCloseSnackbar = (event, reason) => {
    if (reason === "clickaway") {
      return;
    }
    setSnackbar({ ...snackbar, open: false });
  };

  // Modify sendMessage to handle the general Message content
  const sendMessage = async () => {
    if (!newMessage.trim() || !userID) return;

    try {
      const messageData = {
        title: selectedCommunity,
        content: newMessage.trim(),
        creator_id: userID,
        status: "active",
      };

      if (replyingTo) {
        messageData.reply_to = replyingTo.open_board_id;
      }

      const { data, error } = await supabase
        .from("open_board")
        .insert([messageData])
        .select();

      if (error) {
        console.error("Supabase error:", error);
        setSnackbar({
          open: true,
          message: `Failed to send message: ${error.message}`,
          severity: "error",
        });
        return;
      }

      if (data && data[0]) {
        setMessages((prevMessages) => [...prevMessages, data[0]]);

        // Initialize vote count for new message
        setVotes((prev) => ({
          ...prev,
          [data[0].open_board_id]: {
            count: Math.floor(Math.random() * 10),
            userVote: 0,
          },
        }));
      }

      setNewMessage("");
      setReplyingTo(null);
    } catch (err) {
      console.error("Exception in sendMessage:", err);
      setSnackbar({
        open: true,
        message: `Error sending message: ${err.message}`,
        severity: "error",
      });
    }
  };

  // Handle key press
  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey && newMessage.trim()) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Delete message
  const deleteMessage = async (messageId) => {
    try {
      const { error } = await supabase
        .from("open_board")
        .delete()
        .eq("open_board_id", messageId)
        .eq("creator_id", userID); // Add creator check

      if (error) {
        console.error("Error deleting message:", error);
        setSnackbar({
          open: true,
          message: "Failed to delete message",
          severity: "error",
        });
      } else {
        setMessages((prevMessages) =>
          prevMessages.filter((msg) => msg.open_board_id !== messageId)
        );
        setSnackbar({
          open: true,
          message: "Message deleted successfully",
          severity: "success",
        });
      }
    } catch (err) {
      console.error("Exception in deleteMessage:", err);
      setSnackbar({
        open: true,
        message: "Error deleting message",
        severity: "error",
      });
    }
  };

  // Open report popup
  const openReportPopup = (message) => {
    setMessageToReport(message);
    setShowReportPopup(true);
    setSelectedReasons([]);
  };

  // Handle report reasons
  const toggleReason = (reason) => {
    setSelectedReasons((prev) =>
      prev.includes(reason)
        ? prev.filter((r) => r !== reason)
        : [...prev, reason]
    );
  };

  // Report message
  const reportMessage = async () => {
    if (!messageToReport || selectedReasons.length === 0) {
      setSnackbar({
        open: true,
        message: "Please select at least one reason before reporting.",
        severity: "warning",
      });
      return;
    }

    console.log("Reporting openboard post with user ID:", userID);

    // Create the report object with the fields for the unified reports table
    const reportData = {
      reporter_id: userID,
      reported_id: messageToReport.creator_id,
      reported_item_id: messageToReport.open_board_id,
      report_type: "post",
      status: "open",
      report: selectedReasons.join(", "),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    console.log("Report data being sent:", reportData);

    const { data, error } = await supabase
      .from("reports")
      .insert([reportData])
      .select(); // Return the inserted data to confirm

    if (error) {
      console.error("Error reporting post:", error.message, error);
      setSnackbar({
        open: true,
        message: `Error reporting post: ${error.message}`,
        severity: "error",
      });
    } else {
      console.log("Post reported successfully:", data);
      setSnackbar({
        open: true,
        message:
          "Post reported successfully! An admin will review your report.",
        severity: "success",
      });
      setShowReportPopup(false);
    }
  };

  // Auto-scroll function
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Modify deleteContent function
  const deleteContent = async (contentName) => {
    // Don't allow deletion of the general Message content
    if (contentName === "Message") {
      alert("This is a general chat area and cannot be deleted.");
      return;
    }

    // Find the content to check if user is the creator
    const content = communities.find((c) => c.title === contentName);

    // Only allow deletion if user is the creator
    if (content && content.creator_id === userID) {
      setContentToDelete(contentName);
      setShowDeleteConfirm(true);
    } else {
      alert("You can only delete content that you created.");
    }
  };

  // Modify deleteContent to only delete content entries
  const handleConfirmDelete = async () => {
    if (!contentToDelete) return;

    // Double check that it's not the Message content
    if (contentToDelete === "Message") {
      alert("This is a general chat area and cannot be deleted.");
      return;
    }

    try {
      // First check if user is still the creator
      const content = communities.find((c) => c.title === contentToDelete);
      if (!content || content.creator_id !== userID) {
        alert("You can only delete content that you created.");
        return;
      }

      // Delete the content entry and all its messages
      const { error: deleteError } = await supabase
        .from("open_board")
        .delete()
        .eq("title", contentToDelete);

      if (deleteError) {
        console.error("Error deleting content:", deleteError);
        alert("Failed to delete content");
        return;
      }

      // Update the UI
      setCommunities((prev) =>
        prev.filter((content) => content.title !== contentToDelete)
      );
      if (selectedCommunity === contentToDelete) {
        setSelectedCommunity("Message");
      }
      setMessages([]); // Clear messages if we're in the deleted content
    } catch (err) {
      console.error("Exception in deleteContent:", err);
      alert("Error deleting content");
    } finally {
      setShowDeleteConfirm(false);
      setContentToDelete(null);
    }
  };

  // Get counts of comments (replies) for each post
  const getCommentCount = (messageId) => {
    // Find the message with the given ID
    const message = messages.find((msg) => msg.open_board_id === messageId);

    // If the message has a comment_count field, use it
    if (message && message.comment_count !== undefined) {
      return message.comment_count;
    }

    // Fallback to counting replies in the messages array
    return messages.filter((msg) => msg.reply_to === messageId).length;
  };

  const handleSortChange = (sort) => {
    setSelectedSort(sort);
    // Here you would implement actual sorting logic
  };

  const openReplyInput = (messageId) => {
    setReplyInput({ open: true, messageId });
  };

  const closeReplyInput = () => {
    setReplyInput({ open: false, messageId: null });
    setReplyMessage("");
  };

  const openMoreOptions = (event, message) => {
    setMoreOptionsMessage(message);
    setAnchorEl(event.currentTarget);
  };

  const closeMoreOptions = () => {
    setMoreOptionsMessage(null);
    setAnchorEl(null);
  };

  const handleReportClick = () => {
    closeMoreOptions();
    openReportPopup(moreOptionsMessage);
  };

  const handleDeleteClick = () => {
    closeMoreOptions();
    deleteMessage(moreOptionsMessage.open_board_id);
  };

  // Add expandedThreadId to state
  const [expandedThreadId, setExpandedThreadId] = useState(null);
  const [expandedThreadComments, setExpandedThreadComments] = useState([]);
  const [replyingToCommentId, setReplyingToCommentId] = useState(null);

  // Function to toggle thread expansion
  const toggleThreadExpansion = async (thread) => {
    if (expandedThreadId === thread.open_board_id) {
      // If clicking on already expanded thread, collapse it
      setExpandedThreadId(null);
      setExpandedThreadComments([]);
      return;
    }

    // Otherwise, expand the thread and fetch comments
    setExpandedThreadId(thread.open_board_id);
    await fetchThreadComments(thread.open_board_id);
  };

  // Function to fetch thread comments
  const fetchThreadComments = async (threadId) => {
    try {
      // Fetch comments for this thread
      const { data, error } = await supabase
        .from("board_comments")
        .select("*")
        .eq("post_id", threadId)
        .order("created_at", { ascending: true });

      if (error) {
        console.error("Error fetching comments:", error);
        setExpandedThreadComments([]);
      } else {
        setExpandedThreadComments(data || []);

        // Fetch usernames for comment authors
        const userIds = data.map((comment) => comment.user_id).filter(Boolean);
        fetchUsernames(userIds);

        // Fetch replies for each comment
        const commentIds = data.map((comment) => comment.id);
        await fetchCommentReplies(commentIds);
      }
    } catch (err) {
      console.error("Exception in fetchThreadComments:", err);
      setExpandedThreadComments([]);
    }
  };

  // Function to fetch replies for a set of comments
  const fetchCommentReplies = async (commentIds) => {
    if (!commentIds || commentIds.length === 0) return;

    try {
      const { data, error } = await supabase
        .from("board_comments")
        .select("*")
        .in("reply_to", commentIds)
        .order("created_at", { ascending: true });

      if (error) {
        console.error("Error fetching comment replies:", error);
        return;
      }

      if (data && data.length > 0) {
        // Organize replies by parent comment
        const replies = {};
        data.forEach((reply) => {
          if (!replies[reply.reply_to]) {
            replies[reply.reply_to] = [];
          }
          replies[reply.reply_to].push(reply);
        });

        setCommentReplies(replies);

        // Fetch usernames for reply authors
        const replyUserIds = data.map((reply) => reply.user_id).filter(Boolean);
        fetchUsernames(replyUserIds);

        // Recursively fetch replies to these replies
        const replyIds = data.map((reply) => reply.id);
        await fetchCommentReplies(replyIds);
      }
    } catch (err) {
      console.error("Exception in fetchCommentReplies:", err);
    }
  };

  // Function to submit a comment to a thread
  const submitThreadComment = async (threadId) => {
    if (!auth.currentUser) {
      setOpenLoginDialog(true);
      return;
    }

    if (!newComment.trim()) {
      return;
    }

    try {
      const { data, error } = await supabase.from("board_comments").insert([
        {
          post_id: threadId,
          user_id: auth.currentUser.id,
          content: newComment,
          created_at: new Date().toISOString(),
          // No reply_to field means it's a top-level comment
        },
      ]);

      if (error) {
        console.error("Error submitting comment:", error);
        setErrorMessage(`Error posting comment: ${error.message}`);
        setOpenErrorDialog(true);
      } else {
        setNewComment("");

        // Refresh comments for this thread
        await fetchThreadComments(threadId);

        // Update comment count in UI without refreshing the page
        setMessages((prev) =>
          prev.map((msg) =>
            msg.open_board_id === threadId
              ? { ...msg, comment_count: (msg.comment_count || 0) + 1 }
              : msg
          )
        );

        setSnackbar({
          open: true,
          message: "Comment posted successfully!",
          severity: "success",
        });
      }
    } catch (err) {
      console.error("Exception in submitThreadComment:", err);
      setErrorMessage(`An unexpected error occurred: ${err.message}`);
      setOpenErrorDialog(true);
    }
  };

  // Function to submit a reply to a comment
  const submitCommentReply = async (commentId, threadId) => {
    if (!auth.currentUser) {
      setOpenLoginDialog(true);
      return;
    }

    if (!newComment.trim()) {
      return;
    }

    try {
      const { data, error } = await supabase.from("board_comments").insert([
        {
          post_id: threadId,
          user_id: auth.currentUser.id,
          content: newComment,
          created_at: new Date().toISOString(),
          reply_to: commentId, // This makes it a reply to a specific comment
        },
      ]);

      if (error) {
        console.error("Error submitting reply:", error);
        setErrorMessage(`Error posting reply: ${error.message}`);
        setOpenErrorDialog(true);
      } else {
        setNewComment("");
        setReplyingToCommentId(null);

        // Refresh comments for this thread
        await fetchThreadComments(threadId);

        // Update comment count in UI without refreshing the page
        setMessages((prev) =>
          prev.map((msg) =>
            msg.open_board_id === threadId
              ? { ...msg, comment_count: (msg.comment_count || 0) + 1 }
              : msg
          )
        );

        setSnackbar({
          open: true,
          message: "Reply posted successfully!",
          severity: "success",
        });
      }
    } catch (err) {
      console.error("Exception in submitCommentReply:", err);
      setErrorMessage(`An unexpected error occurred: ${err.message}`);
      setOpenErrorDialog(true);
    }
  };

  // Recursive function to render comments and their replies
  const renderComment = (comment, depth = 0, threadId) => {
    const replies = commentReplies[comment.id] || [];

    return (
      <Box
        key={comment.id}
        sx={{
          mt: 2,
          ml: depth * 2,
          pl: 2,
          borderLeft: depth > 0 ? `2px solid rgba(0,0,0,0.1)` : "none",
        }}
      >
        <Paper
          elevation={0}
          sx={{
            p: 2,
            backgroundColor:
              depth % 2 === 0 ? "rgba(0,0,0,0.02)" : "rgba(0,0,0,0.01)",
            borderRadius: 1,
          }}
        >
          {/* Comment metadata */}
          <Typography variant="caption" sx={{ display: "block", mb: 1 }}>
            u/{usernames[comment.user_id] || "Anonymous"} •{" "}
            {formatDateTime(comment.created_at)}
          </Typography>

          {/* Comment content */}
          <Typography variant="body2" sx={{ whiteSpace: "pre-wrap", mb: 1 }}>
            {comment.content}
          </Typography>

          {/* Comment actions */}
          <Box sx={{ display: "flex", gap: 2, mt: 1 }}>
            <Button
              size="small"
              startIcon={<ArrowUpwardIcon fontSize="small" />}
              sx={{
                minWidth: "auto",
                p: 0.5,
                color: "text.secondary",
                "&:hover": { backgroundColor: "transparent", color: "orange" },
              }}
            >
              Upvote
            </Button>

            <Button
              size="small"
              startIcon={<ArrowDownwardIcon fontSize="small" />}
              sx={{
                minWidth: "auto",
                p: 0.5,
                color: "text.secondary",
                "&:hover": { backgroundColor: "transparent", color: "#9494FF" },
              }}
            >
              Downvote
            </Button>

            <Button
              size="small"
              onClick={() => setReplyingToCommentId(comment.id)}
              sx={{
                minWidth: "auto",
                p: 0.5,
                color: "text.secondary",
                fontSize: "0.8rem",
                textTransform: "none",
                "&:hover": {
                  backgroundColor: "transparent",
                  color: "primary.main",
                },
              }}
            >
              Reply
            </Button>
          </Box>

          {/* Reply form */}
          {replyingToCommentId === comment.id && (
            <Box sx={{ mt: 2 }}>
              <TextField
                fullWidth
                size="small"
                multiline
                rows={3}
                placeholder="Write your reply..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                sx={{ mb: 1 }}
              />
              <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1 }}>
                <Button
                  size="small"
                  onClick={() => {
                    setReplyingToCommentId(null);
                    setNewComment("");
                  }}
                >
                  Cancel
                </Button>
                <Button
                  size="small"
                  variant="contained"
                  disableElevation
                  disabled={!newComment.trim()}
                  onClick={() => submitCommentReply(comment.id, threadId)}
                >
                  Reply
                </Button>
              </Box>
            </Box>
          )}
        </Paper>

        {/* Render all replies recursively */}
        {replies.length > 0 && (
          <Box>
            {replies.map((reply) => renderComment(reply, depth + 1, threadId))}
          </Box>
        )}
      </Box>
    );
  };

  // Function to create a new community
  const createNewCommunity = async () => {
    try {
      if (!auth.currentUser) {
        setOpenLoginDialog(true);
        return;
      }

      // We don't need to check newCommunityName here since we already check localName
      // in the handleCreateCommunity function before calling createNewCommunity

      // Check if a community with this name already exists
      const { data: existingCommunities, error: checkError } = await supabase
        .from("communities")
        .select("community_id")
        .eq("name", newCommunityName.trim());

      if (checkError) {
        console.error("Error checking existing communities:", checkError);
        setErrorMessage(`Error: ${checkError.message}`);
        setOpenErrorDialog(true);
        return;
      }

      if (existingCommunities && existingCommunities.length > 0) {
        setErrorMessage("A community with this name already exists");
        setOpenErrorDialog(true);
        return;
      }

      // Insert the new community
      const { data, error } = await supabase
        .from("communities")
        .insert([
          {
            name: newCommunityName.trim(),
            description:
              newCommunityDescription.trim() ||
              `Welcome to ${newCommunityName}!`,
            creator_id: auth.currentUser.id,
            created_at: new Date().toISOString(),
            status: "active",
          },
        ])
        .select();

      if (error) {
        console.error("Error creating community:", error);
        setErrorMessage(`Error creating community: ${error.message}`);
        setOpenErrorDialog(true);
      } else {
        setOpenNewCommunityDialog(false);
        setNewCommunityName("");
        setNewCommunityDescription("");
        setSnackbar({
          open: true,
          message: "Community created successfully!",
          severity: "success",
        });

        // Refresh the communities list
        fetchCommunities();

        // Select the newly created community
        if (data && data[0]) {
          setSelectedCommunity(data[0].name);
        }
      }
    } catch (err) {
      console.error("Exception in createNewCommunity:", err);
      setErrorMessage(`An unexpected error occurred: ${err.message}`);
      setOpenErrorDialog(true);
    }
  };

  // New Community Dialog Component
  const NewCommunityDialog = () => {
    // Use local state within the dialog component to avoid rerendering issues
    const [localName, setLocalName] = useState(newCommunityName);
    const [localDescription, setLocalDescription] = useState(
      newCommunityDescription
    );
    const [localError, setLocalError] = useState("");

    // Handle closing with cleanup
    const handleClose = () => {
      setLocalError("");
      setOpenNewCommunityDialog(false);
    };

    // Handle creating community with local state
    const handleCreateCommunity = () => {
      // Validate locally first
      if (!localName.trim()) {
        setLocalError("Please provide a name for your community");
        return;
      }

      // Clear any previous error
      setLocalError("");

      // Update parent state
      setNewCommunityName(localName);
      setNewCommunityDescription(localDescription);

      // Call create function
      createNewCommunity();
    };

    // Reset local state when dialog opens
    useEffect(() => {
      if (openNewCommunityDialog) {
        setLocalName(newCommunityName);
        setLocalDescription(newCommunityDescription);
        setLocalError(""); // Clear any previous error
      }
    }, [openNewCommunityDialog, newCommunityName, newCommunityDescription]);

    return (
      <Dialog
        open={openNewCommunityDialog}
        onClose={handleClose}
        maxWidth="sm"
        fullWidth
        disableRestoreFocus
      >
        <DialogTitle>Create New Spartan Community</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Create a new community for Spartan Marketplace users to share and
            discuss topics.
          </DialogContentText>

          {/* Community name with prefix outside the TextField */}
          <Box sx={{ display: "flex", alignItems: "center", mt: 2 }}>
            <Typography variant="body1" sx={{ mr: 1, color: "text.secondary" }}>
              s/
            </Typography>
            <TextField
              autoFocus
              fullWidth
              label="Community Name"
              value={localName}
              onChange={(e) => setLocalName(e.target.value)}
              helperText={localError || "Enter a name for your community"}
              size="medium"
              error={!!localError}
            />
          </Box>

          <TextField
            margin="dense"
            label="Description"
            type="text"
            fullWidth
            multiline
            rows={4}
            value={localDescription}
            onChange={(e) => setLocalDescription(e.target.value)}
            helperText="Tell people what this community is about"
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose} color="primary">
            Cancel
          </Button>
          <Button
            onClick={handleCreateCommunity}
            color="primary"
            variant="contained"
            disabled={!localName.trim()}
            sx={{
              borderRadius: 28,
              px: 3,
              textTransform: "none",
              boxShadow: 2,
              "&:hover": {
                boxShadow: 3,
              },
            }}
          >
            Create Community
          </Button>
        </DialogActions>
      </Dialog>
    );
  };

  // Function to open thread view with comments
  const openThread = async (thread) => {
    setSelectedThread(thread);

    try {
      // Fetch comments for this thread
      const { data, error } = await supabase
        .from("board_comments")
        .select("*")
        .eq("post_id", thread.open_board_id)
        .order("created_at", { ascending: true });

      if (error) {
        console.error("Error fetching comments:", error);
        setThreadComments([]);
      } else {
        setThreadComments(data || []);

        // Fetch usernames for comment authors
        const userIds = data.map((comment) => comment.user_id).filter(Boolean);
        fetchUsernames(userIds);
      }

      setOpenThreadDialog(true);
    } catch (err) {
      console.error("Exception in openThread:", err);
      setThreadComments([]);
      setOpenThreadDialog(true);
    }
  };

  // Function to add a new message or post
  const addMessage = async (title, content) => {
    try {
      if (!auth.currentUser) {
        setOpenLoginDialog(true);
        return;
      }

      if (!title || !content) {
        setErrorMessage("Please provide both title and content for your post");
        setOpenErrorDialog(true);
        return;
      }

      // Find community_id from the communities array based on selectedCommunity name
      let communityId = null;
      if (selectedCommunity !== "all") {
        const selectedCommunityObj = communities.find(
          (c) => c.name === selectedCommunity
        );
        if (selectedCommunityObj) {
          communityId = selectedCommunityObj.community_id;
        }
      }

      const { data, error } = await supabase.from("open_board").insert([
        {
          title: title,
          content: content,
          creator_id: auth.currentUser.id,
          created_at: new Date().toISOString(),
          status: "active",
          community: communityId, // Use the community_id, not the name
        },
      ]);

      if (error) {
        console.error("Error adding post:", error.message);
        setErrorMessage(`Error creating post: ${error.message}`);
        setOpenErrorDialog(true);
      } else {
        setNewPostTitle("");
        setNewPostContent("");
        setOpenNewPostDialog(false);
        setRefreshMessages((prev) => !prev);
      }
    } catch (err) {
      console.error("Exception in addMessage:", err);
      setErrorMessage(`An unexpected error occurred: ${err.message}`);
      setOpenErrorDialog(true);
    }
  };

  // Function to submit a report
  const submitReport = async () => {
    if (!reportReason.trim()) {
      setErrorMessage("Please provide a reason for reporting this post.");
      setOpenErrorDialog(true);
      return;
    }

    try {
      const { data, error } = await supabase.from("reports").insert([
        {
          reporter_id: userID,
          reported_id: messageToReport.creator_id,
          reported_item_id: messageToReport,
          report_type: "post",
          status: "open",
          report: reportReason,
          created_at: new Date().toISOString(),
        },
      ]);

      if (error) {
        console.error("Error submitting report:", error);
        setErrorMessage(`Error submitting report: ${error.message}`);
        setOpenErrorDialog(true);
      } else {
        setOpenReportDialog(false);
        setReportReason("");
        setSnackbar({
          open: true,
          message: "Report submitted successfully.",
          severity: "success",
        });
      }
    } catch (err) {
      console.error("Exception in submitReport:", err);
      setErrorMessage(`An unexpected error occurred: ${err.message}`);
      setOpenErrorDialog(true);
    }
  };

  // Function to confirm deletion of a post
  const confirmDelete = async () => {
    try {
      const { error } = await supabase
        .from("open_board")
        .delete()
        .eq("open_board_id", messageToDelete);

      if (error) {
        console.error("Error deleting post:", error);
        setErrorMessage(`Error deleting post: ${error.message}`);
        setOpenErrorDialog(true);
      } else {
        setOpenDeleteDialog(false);
        setMessages((prev) =>
          prev.filter((m) => m.open_board_id !== messageToDelete)
        );
        setSnackbar({
          open: true,
          message: "Post deleted successfully.",
          severity: "success",
        });
      }
    } catch (err) {
      console.error("Exception in confirmDelete:", err);
      setErrorMessage(`An unexpected error occurred: ${err.message}`);
      setOpenErrorDialog(true);
    }
  };

  return (
    <ThemeProvider theme={uncgTheme}>
      <Box className="openboard-container" sx={{ bgcolor: "#F8F9FA" }}>
        {/* Login Dialog */}
        <Dialog
          open={openLoginDialog}
          onClose={() => setOpenLoginDialog(false)}
        >
          <DialogTitle>Login Required</DialogTitle>
          <DialogContent>
            <DialogContentText>
              You need to be logged in to perform this action.
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenLoginDialog(false)} color="primary">
              Cancel
            </Button>
            <Button
              onClick={() => navigate("/auth")}
              color="primary"
              variant="contained"
            >
              Go to Login
            </Button>
          </DialogActions>
        </Dialog>

        {/* Error Dialog */}
        <Dialog
          open={openErrorDialog}
          onClose={() => setOpenErrorDialog(false)}
        >
          <DialogTitle>Error</DialogTitle>
          <DialogContent>
            <DialogContentText>{errorMessage}</DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenErrorDialog(false)} color="primary">
              Close
            </Button>
          </DialogActions>
        </Dialog>

        {/* Report Dialog */}
        <Dialog
          open={openReportDialog}
          onClose={() => setOpenReportDialog(false)}
        >
          <DialogTitle>Report Post</DialogTitle>
          <DialogContent>
            <DialogContentText>
              Please let us know why you're reporting this post:
            </DialogContentText>
            <TextField
              autoFocus
              margin="dense"
              label="Reason"
              type="text"
              fullWidth
              value={reportReason}
              onChange={(e) => setReportReason(e.target.value)}
              multiline
              rows={4}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenReportDialog(false)} color="primary">
              Cancel
            </Button>
            <Button onClick={submitReport} color="error" variant="contained">
              Submit Report
            </Button>
          </DialogActions>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog
          open={openDeleteDialog}
          onClose={() => setOpenDeleteDialog(false)}
        >
          <DialogTitle>Confirm Delete</DialogTitle>
          <DialogContent>
            <DialogContentText>
              Are you sure you want to delete this post? This action cannot be
              undone.
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenDeleteDialog(false)} color="primary">
              Cancel
            </Button>
            <Button onClick={confirmDelete} color="error" variant="contained">
              Delete
            </Button>
          </DialogActions>
        </Dialog>

        {/* New Post Dialog */}
        <Dialog
          open={openNewPostDialog}
          onClose={() => setOpenNewPostDialog(false)}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>Create New Post</DialogTitle>
          <DialogContent>
            <TextField
              autoFocus
              margin="dense"
              label="Title"
              type="text"
              fullWidth
              value={newPostTitle}
              onChange={(e) => setNewPostTitle(e.target.value)}
              sx={{ mb: 2 }}
            />
            <TextField
              margin="dense"
              label="Content"
              type="text"
              fullWidth
              multiline
              rows={6}
              value={newPostContent}
              onChange={(e) => setNewPostContent(e.target.value)}
            />
            <FormControl fullWidth margin="normal">
              <InputLabel id="community-select-label">Community</InputLabel>
              <Select
                labelId="community-select-label"
                value={selectedCommunity}
                onChange={(e) => setSelectedCommunity(e.target.value)}
                label="Community"
              >
                {communities.map((community) => (
                  <MenuItem key={community.name} value={community.name}>
                    s/{community.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenNewPostDialog(false)} color="primary">
              Cancel
            </Button>
            <Button
              onClick={() => addMessage(newPostTitle, newPostContent)}
              color="primary"
              variant="contained"
              sx={{
                borderRadius: 28,
                px: 1.5,
                width: "auto",
                minWidth: "100px",
                maxWidth: "130px",
                textTransform: "none",
                boxShadow: 2,
                "&:hover": {
                  boxShadow: 3,
                },
              }}
            >
              Post
            </Button>
          </DialogActions>
        </Dialog>

        {/* New Community Dialog */}
        <NewCommunityDialog />

        {/* Thread View Dialog */}
        <Dialog
          open={openThreadDialog}
          onClose={() => setOpenThreadDialog(false)}
          maxWidth="md"
          fullWidth
          PaperProps={{
            sx: { minHeight: "70vh" },
          }}
        >
          {selectedThread && (
            <>
              <DialogTitle>
                <Box component="div">
                  <Typography variant="h6">{selectedThread.title}</Typography>
                  <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                    Posted by u/
                    {usernames[selectedThread.creator_id] || "Anonymous"} •{" "}
                    {formatDateTime(selectedThread.created_at)}
                  </Typography>
                </Box>
              </DialogTitle>
              <DialogContent dividers>
                <Typography
                  variant="body1"
                  sx={{ whiteSpace: "pre-wrap", mb: 3 }}
                >
                  {selectedThread.content}
                </Typography>

                <Divider sx={{ my: 2 }} />

                <Typography variant="h6" sx={{ mb: 2 }}>
                  Comments
                </Typography>

                {/* Comment submission form */}
                {auth.currentUser ? (
                  <Box sx={{ mb: 3 }}>
                    <TextField
                      fullWidth
                      multiline
                      rows={3}
                      placeholder="What are your thoughts?"
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      sx={{ mb: 1 }}
                    />
                    <Button
                      variant="contained"
                      color="primary"
                      onClick={() =>
                        submitThreadComment(selectedThread.open_board_id)
                      }
                      disabled={!newComment.trim()}
                    >
                      Comment
                    </Button>
                  </Box>
                ) : (
                  <Box
                    sx={{
                      mb: 3,
                      p: 2,
                      bgcolor: "rgba(0,0,0,0.05)",
                      borderRadius: 1,
                    }}
                  >
                    <Typography>Log in to leave a comment</Typography>
                    <Button
                      variant="outlined"
                      color="primary"
                      size="small"
                      onClick={() => navigate("/auth")}
                      sx={{ mt: 1 }}
                    >
                      Log In
                    </Button>
                  </Box>
                )}

                {/* Comments list */}
                {threadComments.length > 0 ? (
                  threadComments.map((comment) => (
                    <Paper
                      key={comment.id}
                      elevation={0}
                      sx={{ p: 2, mb: 2, bgcolor: "rgba(0,0,0,0.02)" }}
                    >
                      <Typography
                        variant="caption"
                        sx={{ display: "block", mb: 1 }}
                      >
                        u/{usernames[comment.user_id] || "Anonymous"} •{" "}
                        {formatTimestamp(comment.created_at)}
                      </Typography>
                      <Typography variant="body2">{comment.content}</Typography>
                    </Paper>
                  ))
                ) : (
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ my: 2 }}
                  >
                    No comments yet. Be the first to share your thoughts!
                  </Typography>
                )}
              </DialogContent>
              <DialogActions>
                <Button onClick={() => setOpenThreadDialog(false)}>
                  Close
                </Button>
              </DialogActions>
            </>
          )}
        </Dialog>

        <Box sx={{ display: "flex", flexDirection: "row" }}>
          {/* Sidebar with Communities */}
          <Paper
            elevation={0}
            sx={{
              width: 240,
              p: 2,
              borderRight: "1px solid rgba(0,0,0,0.12)",
              height: "calc(100vh - 64px)",
              overflowY: "auto",
              position: "sticky",
              top: 0,
              display: { xs: "none", sm: "block" },
            }}
          >
            <Typography variant="h6" sx={{ mb: 2, fontWeight: "bold" }}>
              Spartan Communities
            </Typography>

            <Button
              fullWidth
              variant="outlined"
              color="primary"
              startIcon={<AddIcon />}
              onClick={() => setOpenNewCommunityDialog(true)}
              sx={{
                mb: 2,
                borderRadius: 28,
                textTransform: "none",
                "&:hover": {
                  boxShadow: 1,
                },
              }}
            >
              Create Community
            </Button>

            <List sx={{ mb: 2 }}>
              {communities.map((community) => (
                <ListItem key={community.name} disablePadding sx={{ mb: 0.5 }}>
                  <ListItemButton
                    onClick={() => setSelectedCommunity(community.name)}
                    selected={selectedCommunity === community.name}
                    sx={{
                      borderRadius: 1,
                      "&.Mui-selected": {
                        backgroundColor: "rgba(15, 32, 68, 0.08)",
                        "&:hover": {
                          backgroundColor: "rgba(15, 32, 68, 0.12)",
                        },
                      },
                    }}
                  >
                    <ListItemText
                      primary={
                        <Typography
                          variant="body2"
                          component="span"
                          sx={{
                            fontWeight:
                              selectedCommunity === community.name
                                ? "bold"
                                : "normal",
                          }}
                        >
                          s/{community.name}
                        </Typography>
                      }
                    />
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
          </Paper>

          {/* Main Content Area */}
          <Box
            sx={{
              flex: 1,
              maxWidth: "1000px",
              mx: "auto",
              p: { xs: 1, sm: 2 },
            }}
          >
            {/* Header with Community Info */}
            <Paper
              elevation={0}
              sx={{
                p: 2,
                mb: 2,
                borderBottom: "1px solid rgba(0,0,0,0.08)",
                display: "flex",
                flexDirection: "column",
              }}
            >
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <Typography
                  variant="h5"
                  component="h1"
                  sx={{ fontWeight: "bold" }}
                >
                  {selectedCommunity === "all"
                    ? "All Communities"
                    : `s/${selectedCommunity}`}
                </Typography>
                <Button
                  variant="contained"
                  color="primary"
                  size="medium"
                  startIcon={<AddIcon />}
                  onClick={() => setOpenNewPostDialog(true)}
                  sx={{
                    borderRadius: 28,
                    px: 1.5,
                    width: "auto",
                    minWidth: "100px",
                    maxWidth: "130px",
                    textTransform: "none",
                    boxShadow: 2,
                    "&:hover": {
                      boxShadow: 3,
                    },
                  }}
                >
                  New Post
                </Button>
              </Box>

              {selectedCommunity !== "all" &&
                communityDetails[selectedCommunity] && (
                  <Typography
                    variant="body2"
                    sx={{ mt: 1, color: "text.secondary" }}
                  >
                    {communityDetails[selectedCommunity].description}
                  </Typography>
                )}
            </Paper>

            {/* Posts Feed with Inline Thread Expansion */}
            <Box sx={{ mb: 4 }}>
              {loading ? (
                <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
                  <CircularProgress />
                </Box>
              ) : messages.length > 0 ? (
                messages.map((message) => (
                  <Box key={message.open_board_id} sx={{ mb: 3 }}>
                    {/* Post Card */}
                    <Card
                      sx={{
                        borderRadius: 1,
                        boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                        "&:hover": {
                          boxShadow: "0 1px 5px rgba(0,0,0,0.2)",
                        },
                        transition: "box-shadow 0.2s",
                        overflow: "visible",
                        mb: expandedThreadId === message.open_board_id ? 0 : 2,
                        borderBottomLeftRadius:
                          expandedThreadId === message.open_board_id ? 0 : 1,
                        borderBottomRightRadius:
                          expandedThreadId === message.open_board_id ? 0 : 1,
                      }}
                    >
                      <Box sx={{ display: "flex" }}>
                        {/* Voting Section */}
                        <Box
                          sx={{
                            width: 40,
                            backgroundColor: "rgba(0,0,0,0.02)",
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            pt: 2,
                          }}
                        >
                          <IconButton
                            size="small"
                            onClick={() => handleVote(message.open_board_id, 1)}
                            sx={{
                              color:
                                votes[message.open_board_id]?.userVote === 1
                                  ? "orange"
                                  : "inherit",
                            }}
                          >
                            <ArrowUpwardIcon fontSize="small" />
                          </IconButton>
                          <Typography
                            variant="body2"
                            sx={{ fontWeight: "medium", my: 0.5 }}
                          >
                            {votes[message.open_board_id]?.count || 0}
                          </Typography>
                          <IconButton
                            size="small"
                            onClick={() =>
                              handleVote(message.open_board_id, -1)
                            }
                            sx={{
                              color:
                                votes[message.open_board_id]?.userVote === -1
                                  ? "#9494FF"
                                  : "inherit",
                            }}
                          >
                            <ArrowDownwardIcon fontSize="small" />
                          </IconButton>
                        </Box>

                        {/* Content Section */}
                        <CardContent
                          sx={{
                            flex: 1,
                            "&:last-child": { pb: 2 },
                            pt: 1.5,
                            px: 2,
                          }}
                        >
                          {/* Community identifier and metadata */}
                          <Typography
                            variant="caption"
                            sx={{
                              color: "text.secondary",
                              display: "block",
                              mb: 0.5,
                            }}
                          >
                            <Link
                              component="button"
                              variant="caption"
                              underline="hover"
                              onClick={() =>
                                setSelectedCommunity(message.community)
                              }
                              sx={{
                                mr: 1,
                                fontWeight: "bold",
                                color: "primary.main",
                              }}
                            >
                              s/{message.community}
                            </Link>
                            Posted by u/
                            {usernames[message.creator_id] ||
                              "Anonymous"} •{" "}
                            {formatDateTime(message.created_at)}
                          </Typography>

                          {/* Post Title (clickable to toggle thread) */}
                          <Typography
                            variant="h6"
                            component="h2"
                            sx={{
                              fontSize: "1.1rem",
                              fontWeight: "bold",
                              mb: 1,
                              cursor: "pointer",
                              "&:hover": {
                                color: "primary.main",
                              },
                            }}
                            onClick={() => toggleThreadExpansion(message)}
                          >
                            {message.title}
                          </Typography>

                          {/* Post Content Preview - only show preview if thread is not expanded */}
                          {expandedThreadId !== message.open_board_id && (
                            <Typography
                              variant="body2"
                              sx={{
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                display: "-webkit-box",
                                WebkitLineClamp: 3,
                                WebkitBoxOrient: "vertical",
                                mb: 1,
                                whiteSpace: "pre-wrap",
                              }}
                            >
                              {message.content}
                            </Typography>
                          )}

                          {/* Action Buttons */}
                          <Box sx={{ display: "flex", gap: 1 }}>
                            <Button
                              startIcon={<MessageIcon />}
                              size="small"
                              sx={{
                                textTransform: "none",
                                color: "text.secondary",
                              }}
                              onClick={() => toggleThreadExpansion(message)}
                            >
                              {getCommentCount(message.open_board_id)} Comments
                            </Button>

                            <Button
                              startIcon={<ShareIcon />}
                              size="small"
                              sx={{
                                textTransform: "none",
                                color: "text.secondary",
                              }}
                              onClick={() => {
                                /* Share functionality */
                              }}
                            >
                              Share
                            </Button>

                            <Button
                              startIcon={<BookmarkIcon />}
                              size="small"
                              sx={{
                                textTransform: "none",
                                color: "text.secondary",
                              }}
                              onClick={() => {
                                /* Save functionality */
                              }}
                            >
                              Save
                            </Button>

                            {auth.currentUser &&
                              message.creator_id === auth.currentUser.id && (
                                <Button
                                  startIcon={<DeleteIcon />}
                                  size="small"
                                  color="error"
                                  sx={{ textTransform: "none", ml: "auto" }}
                                  onClick={() => {
                                    setMessageToDelete(message.open_board_id);
                                    setOpenDeleteDialog(true);
                                  }}
                                >
                                  Delete
                                </Button>
                              )}

                            {auth.currentUser &&
                              message.creator_id !== auth.currentUser.id && (
                                <Button
                                  startIcon={<FlagIcon />}
                                  size="small"
                                  color="error"
                                  sx={{ textTransform: "none", ml: "auto" }}
                                  onClick={() => {
                                    setMessageToReport(message.open_board_id);
                                    setOpenReportDialog(true);
                                  }}
                                >
                                  Report
                                </Button>
                              )}
                          </Box>
                        </CardContent>
                      </Box>
                    </Card>

                    {/* Expanded Thread View */}
                    {expandedThreadId === message.open_board_id && (
                      <Paper
                        elevation={0}
                        sx={{
                          p: 3,
                          mb: 2,
                          borderTopLeftRadius: 0,
                          borderTopRightRadius: 0,
                          borderTop: "none",
                          boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                          backgroundColor: "rgba(0,0,0,0.01)",
                        }}
                      >
                        {/* Full post content when expanded */}
                        <Typography
                          variant="body1"
                          sx={{ whiteSpace: "pre-wrap", mb: 3 }}
                        >
                          {message.content}
                        </Typography>

                        <Divider sx={{ my: 2 }} />

                        {/* Comment input form */}
                        {auth.currentUser ? (
                          <Box sx={{ mb: 3 }}>
                            <TextField
                              fullWidth
                              multiline
                              rows={3}
                              placeholder="What are your thoughts?"
                              value={newComment}
                              onChange={(e) => setNewComment(e.target.value)}
                              sx={{ mb: 1 }}
                            />
                            <Button
                              variant="contained"
                              color="primary"
                              disabled={!newComment.trim()}
                              onClick={() =>
                                submitThreadComment(message.open_board_id)
                              }
                              sx={{
                                borderRadius: 28,
                                px: 3,
                                textTransform: "none",
                              }}
                            >
                              Comment
                            </Button>
                          </Box>
                        ) : (
                          <Box
                            sx={{
                              mb: 3,
                              p: 2,
                              bgcolor: "rgba(0,0,0,0.05)",
                              borderRadius: 1,
                            }}
                          >
                            <Typography>Log in to leave a comment</Typography>
                            <Button
                              variant="outlined"
                              color="primary"
                              size="small"
                              onClick={() => navigate("/auth")}
                              sx={{ mt: 1 }}
                            >
                              Log In
                            </Button>
                          </Box>
                        )}

                        {/* Comments section */}
                        <Typography
                          variant="h6"
                          sx={{ mb: 2, fontWeight: "medium" }}
                        >
                          Comments
                        </Typography>

                        {expandedThreadComments.length > 0 ? (
                          <Box>
                            {expandedThreadComments
                              .filter((comment) => !comment.reply_to) // Only top-level comments
                              .map((comment) =>
                                renderComment(comment, 0, message.open_board_id)
                              )}
                          </Box>
                        ) : (
                          <Typography
                            variant="body2"
                            color="text.secondary"
                            sx={{ my: 2 }}
                          >
                            No comments yet. Be the first to share your
                            thoughts!
                          </Typography>
                        )}
                      </Paper>
                    )}
                  </Box>
                ))
              ) : (
                <Paper sx={{ p: 4, textAlign: "center" }}>
                  <Typography variant="body1" color="textSecondary">
                    {selectedCommunity === "all"
                      ? "No posts available in any community yet. Be the first to create a post!"
                      : `No posts in s/${selectedCommunity} yet. Be the first to create a post!`}
                  </Typography>
                  <Button
                    variant="contained"
                    color="primary"
                    startIcon={<AddIcon />}
                    onClick={() => setOpenNewPostDialog(true)}
                    sx={{
                      mt: 2,
                      borderRadius: 28,
                      px: 2,
                      textTransform: "none",
                      boxShadow: 2,
                      "&:hover": {
                        boxShadow: 3,
                      },
                    }}
                  >
                    Create Post
                  </Button>
                </Paper>
              )}
            </Box>
          </Box>
        </Box>

        {/* Add Snackbar at the end of the return */}
        <Snackbar
          open={snackbar.open}
          autoHideDuration={5000}
          onClose={handleCloseSnackbar}
          anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
        >
          <Alert
            onClose={handleCloseSnackbar}
            severity={
              snackbar.severity === "success"
                ? "success"
                : snackbar.severity === "error"
                ? "error"
                : snackbar.severity === "warning"
                ? "warning"
                : "info"
            }
            variant="filled"
            sx={{
              width: "100%",
              borderRadius: 1,
              ...(snackbar.severity === "success" && {
                bgcolor: "#FFB71B", // UNCG Gold for success alerts
                color: "#0F2044", // UNCG Navy for text
              }),
            }}
          >
            {snackbar.message}
          </Alert>
        </Snackbar>

        {/* Reply Dialog */}
        <Dialog
          open={replyInput.open}
          onClose={closeReplyInput}
          maxWidth="sm"
          fullWidth
          PaperProps={{
            sx: {
              borderRadius: 1,
              padding: 2,
            },
          }}
        >
          <DialogTitle sx={{ p: 2, pb: 1 }}>
            <Typography variant="h6">Reply to Post</Typography>
          </DialogTitle>
          <DialogContent sx={{ p: 2 }}>
            {replyInput.messageId && (
              <Box
                sx={{
                  mb: 2,
                  p: 1.5,
                  backgroundColor: "rgba(15, 32, 68, 0.04)",
                  borderRadius: 1,
                  borderLeft: "3px solid",
                  borderColor: "secondary.main",
                }}
              >
                <Typography variant="body2" sx={{ fontWeight: 500, mb: 0.5 }}>
                  Original Post:
                </Typography>
                <Typography variant="body2">
                  {
                    communities.find(
                      (m) => m.open_board_id === replyInput.messageId
                    )?.content
                  }
                </Typography>
              </Box>
            )}
            <TextField
              autoFocus
              multiline
              rows={4}
              fullWidth
              variant="outlined"
              placeholder="Type your reply here..."
              value={replyMessage}
              onChange={(e) => setReplyMessage(e.target.value)}
              InputProps={{
                sx: {
                  backgroundColor: "background.paper",
                  "&:hover .MuiOutlinedInput-notchedOutline": {
                    borderColor: "primary.main",
                  },
                },
              }}
            />
          </DialogContent>
          <DialogActions sx={{ p: 2, pt: 0 }}>
            <Button
              onClick={closeReplyInput}
              sx={{
                color: "text.secondary",
                "&:hover": { backgroundColor: "rgba(0,0,0,0.04)" },
              }}
            >
              Cancel
            </Button>
            <Button
              variant="contained"
              disableElevation
              onClick={() => {
                handleReply(
                  communities.find(
                    (m) => m.open_board_id === replyInput.messageId
                  )
                );
                closeReplyInput();
              }}
              disabled={replyMessage.trim() === ""}
              sx={{
                bgcolor: "primary.main",
                "&:hover": { bgcolor: "primary.dark" },
              }}
            >
              Reply
            </Button>
          </DialogActions>
        </Dialog>

        {/* Menu component */}
        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={closeMoreOptions}
          PaperProps={{
            elevation: 0,
            sx: {
              overflow: "visible",
              filter: "drop-shadow(0px 2px 8px rgba(0,0,0,0.1))",
              mt: 1.5,
              "& .MuiMenuItem-root": {
                fontSize: "14px",
                py: 1,
              },
            },
          }}
          transformOrigin={{ horizontal: "right", vertical: "top" }}
          anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
        >
          <MenuItem onClick={handleReportClick} sx={{ color: "text.primary" }}>
            <ListItemIcon>
              <FlagIcon fontSize="small" sx={{ color: "error.main" }} />
            </ListItemIcon>
            Report
          </MenuItem>
          {moreOptionsMessage && moreOptionsMessage.creator_id === userID && (
            <MenuItem onClick={handleDeleteClick} sx={{ color: "error.main" }}>
              <ListItemIcon>
                <DeleteIcon fontSize="small" sx={{ color: "error.main" }} />
              </ListItemIcon>
              Delete
            </MenuItem>
          )}
        </Menu>
      </Box>
    </ThemeProvider>
  );
};

export default OpenBoard;
