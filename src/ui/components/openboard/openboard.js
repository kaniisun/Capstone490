// @ts-nocheck
import React, { useState, useEffect, useCallback, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { supabase } from "../../../supabaseClient";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../../contexts/AuthContext";
import { fetchCommunities } from "../../../store/communityThunks";
import { setCurrentCommunity } from "../../../store/communitySlice";
import "./openboard.css";
import {
  Button,
  Typography,
  Box,
  Avatar,
  TextField,
  List,
  ListItem,
  Divider,
  Paper,
  IconButton,
  Card,
  CardContent,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  ListItemText,
  ListItemButton,
  ListItemIcon,
  ToggleButtonGroup,
  ToggleButton,
  Menu,
  CircularProgress,
  Container,
  createTheme,
  ThemeProvider,
  Slide,
  useTheme,
  Chip,
  InputAdornment,
  Tabs,
  Tab,
  Alert,
  Snackbar,
  Fab,
} from "@mui/material";
import ThumbUpIcon from "@mui/icons-material/ThumbUp";
import ThumbDownIcon from "@mui/icons-material/ThumbDown";
import MessageIcon from "@mui/icons-material/Message";
import SendIcon from "@mui/icons-material/Send";
import ReplyIcon from "@mui/icons-material/Reply";
import AddIcon from "@mui/icons-material/Add";
import ShareIcon from "@mui/icons-material/Share";
import BookmarkIcon from "@mui/icons-material/Bookmark";
import DeleteIcon from "@mui/icons-material/Delete";
import FlagIcon from "@mui/icons-material/Flag";
import FolderIcon from "@mui/icons-material/Folder";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import MoreVertIcon from "@mui/icons-material/MoreVert";
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
  // Redux setup
  const dispatch = useDispatch();
  const {
    list: communitiesList,
    currentCommunity,
    loading: communitiesLoading,
  } = useSelector(
    (state) =>
      state.communities || { list: [], currentCommunity: "all", loading: false }
  );

  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [userID, setUserID] = useState(localStorage.getItem("userId"));
  const [replyingTo, setReplyingTo] = useState(null);

  // Use the Redux community state
  const [communities, setCommunities] = useState([]);
  const [selectedCommunity, setSelectedCommunity] = useState("all");
  const [communityDetails, setCommunityDetails] = useState({});

  const messagesEndRef = useRef(null);
  const { user, isAdmin } = useAuth(); // Add isAdmin from the auth context
  const [usernames, setUsernames] = useState({});
  const [votes, setVotes] = useState({}); // Track votes for each message
  const [refreshMessages, setRefreshMessages] = useState(0);

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

  const [selectedSort, setSelectedSort] = useState("new"); // Default to "new" instead of "hot"

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
  const [replyCommentText, setReplyCommentText] = useState(""); // New state for reply text
  const [replyingToComment, setReplyingToComment] = useState(null);
  const [replyingToCommentId, setReplyingToCommentId] = useState(null);
  const [commentVotes, setCommentVotes] = useState({});

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
  const [newPostCommunity, setNewPostCommunity] = useState("");
  const [createPostLoading, setCreatePostLoading] = useState(false);
  const [openNewCommunityDialog, setOpenNewCommunityDialog] = useState(false);
  const [openThreadDialog, setOpenThreadDialog] = useState(false);
  const [selectedThread, setSelectedThread] = useState(null);
  const [threadComments, setThreadComments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [auth, setAuth] = useState({ currentUser: { id: userID } });

  // Voting system state variables
  const [threadVotes, setThreadVotes] = useState({});
  const [loadingVotes, setLoadingVotes] = useState(false);

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

  // Update local state when Redux state changes
  useEffect(() => {
    if (communitiesList.length > 0) {
      setCommunities(communitiesList);

      // Create details mapping for communities
      const details = {};
      communitiesList.forEach((community) => {
        if (community.name !== "all") {
          details[community.name] = {
            community_id: community.community_id,
            creator_id: community.creator_id,
            created_at: community.created_at,
            description: community.description,
          };
        }
      });

      // Add details for "all" view
      details["all"] = {
        description: "A combined view of posts from all communities",
        isView: true,
      };
      setCommunityDetails(details);
    }
  }, [communitiesList]);

  // Update local state when Redux current community changes
  useEffect(() => {
    if (currentCommunity && currentCommunity !== selectedCommunity) {
      setSelectedCommunity(currentCommunity);
    }
  }, [currentCommunity]);

  // Update Redux when local state changes
  useEffect(() => {
    if (selectedCommunity !== currentCommunity) {
      dispatch(setCurrentCommunity(selectedCommunity));
    }
  }, [selectedCommunity, dispatch, currentCommunity]);

  // Fetch communities on component mount
  useEffect(() => {
    // Fetch communities on component mount
    const loadCommunities = async () => {
      await dispatch(fetchCommunities());
    };
    loadCommunities();
  }, [dispatch]);

  // Function to fetch votes for threads
  const fetchThreadVotes = useCallback(
    async (threadIds) => {
      if (!auth.currentUser || !threadIds.length) return;

      try {
        setLoadingVotes(true);
        console.log("Fetching votes for threads:", threadIds);

        const { data, error } = await supabase
          .from("user_votes")
          .select("target_id, vote_value")
          .eq("user_id", auth.currentUser.id)
          .eq("target_type", "thread")
          .in("target_id", threadIds.map(String));

        if (error) {
          console.error("Error fetching thread vote data:", error);
          return;
        }

        // Convert to object for easier lookup
        const votes = {};
        data.forEach((vote) => {
          votes[vote.target_id] = vote.vote_value;
        });

        console.log("Retrieved thread votes:", votes);
        setThreadVotes(votes);
      } catch (err) {
        console.error("Exception in fetchThreadVotes:", err);
      } finally {
        setLoadingVotes(false);
      }
    },
    [auth.currentUser]
  );

  // Function to fetch votes for comments
  const fetchCommentVotes = useCallback(
    async (commentIds) => {
      if (!auth.currentUser || !commentIds.length) return;

      try {
        console.log("Fetching votes for comments:", commentIds);

        const { data, error } = await supabase
          .from("user_votes")
          .select("target_id, vote_value")
          .eq("user_id", auth.currentUser.id)
          .eq("target_type", "comment")
          .in("target_id", commentIds.map(String));

        if (error) {
          console.error("Error fetching comment vote data:", error);
          return;
        }

        // Convert to object for easier lookup
        const votes = {};
        data.forEach((vote) => {
          votes[vote.target_id] = vote.vote_value;
        });

        console.log("Retrieved comment votes:", votes);
        setCommentVotes(votes);
      } catch (err) {
        console.error("Exception in fetchCommentVotes:", err);
      }
    },
    [auth.currentUser]
  );

  // Function to handle thread votes
  const handleThreadVote = async (threadId, voteValue) => {
    if (!auth.currentUser) {
      setOpenLoginDialog(true);
      return;
    }

    try {
      // Determine the new vote value based on current vote
      const currentVote = threadVotes[threadId] || 0;
      let newVoteValue;

      // If clicking the same vote button, toggle it off
      if (currentVote === voteValue) {
        newVoteValue = 0;
      }
      // If clicking a different vote button, switch to that vote
      else {
        newVoteValue = voteValue;
      }

      console.log(
        `Voting on thread ${threadId}: ${currentVote} -> ${newVoteValue}`
      );

      // Calculate vote difference for score update
      const scoreDiff = newVoteValue - currentVote;

      // Find the current thread to get its current score
      const currentThread = messages.find(
        (msg) => msg.open_board_id === threadId
      );
      if (!currentThread) {
        console.error("Thread not found in local state");
        return;
      }

      // Get current score, defaulting to 0 if undefined
      const currentScore = currentThread.score || 0;

      // Calculate new score, but don't let it go below 0 (Reddit style)
      let newScore = currentScore + scoreDiff;
      if (newScore < 0) {
        // Adjust the score difference to ensure we don't go below 0
        const adjustedScoreDiff = -currentScore;
        newScore = 0;
        console.log(
          `Score would go negative. Adjusting to 0. Original diff: ${scoreDiff}, Adjusted diff: ${adjustedScoreDiff}`
        );
      }

      console.log(
        `Updating score: ${currentScore} + ${scoreDiff} = ${newScore}`
      );

      // Optimistically update UI
      setThreadVotes((prev) => ({
        ...prev,
        [threadId]: newVoteValue,
      }));

      // Find the thread to update its score
      setMessages((prev) =>
        prev.map((msg) => {
          if (msg.open_board_id === threadId) {
            return {
              ...msg,
              score: newScore, // Store score (never below 0)
            };
          }
          return msg;
        })
      );

      // Update in the database (upsert pattern)
      const { error: voteError } = await supabase.from("user_votes").upsert(
        {
          user_id: auth.currentUser.id,
          target_type: "thread",
          target_id: threadId.toString(),
          vote_value: newVoteValue,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "user_id,target_type,target_id",
        }
      );

      if (voteError) {
        console.error("Error saving thread vote:", voteError);
        // Revert optimistic updates and show error
        handleVoteError(threadId, currentVote, scoreDiff);
        return;
      }

      // Update the thread's score in the database with direct value
      const { error: updateError } = await supabase
        .from("open_board")
        .update({ score: newScore })
        .eq("open_board_id", threadId);

      if (updateError) {
        console.error("Error updating thread score:", updateError);
        // Revert optimistic updates and show error
        handleVoteError(threadId, currentVote, scoreDiff);
        return;
      }

      // Success notification
      setSnackbar({
        open: true,
        message: "Vote saved successfully!",
        severity: "success",
      });
    } catch (err) {
      console.error("Exception in handleThreadVote:", err);
      setSnackbar({
        open: true,
        message: "An error occurred. Please try again.",
        severity: "error",
      });
    }
  };

  // Helper function to handle vote errors and revert optimistic updates
  const handleVoteError = (threadId, originalVote, scoreDiff) => {
    // Revert the optimistic vote update
    setThreadVotes((prev) => ({
      ...prev,
      [threadId]: originalVote,
    }));

    // Revert the score update
    setMessages((prev) =>
      prev.map((msg) => {
        if (msg.open_board_id === threadId) {
          return {
            ...msg,
            score: (msg.score || 0) - scoreDiff,
          };
        }
        return msg;
      })
    );

    // Show error notification
    setSnackbar({
      open: true,
      message: "Failed to save your vote. Please try again.",
      severity: "error",
    });
  };

  // Function to handle comment votes
  const handleCommentVote = async (commentId, voteValue) => {
    if (!auth.currentUser) {
      setOpenLoginDialog(true);
      return;
    }

    try {
      // Determine the new vote value based on current vote
      const currentVote = commentVotes[commentId] || 0;
      let newVoteValue;

      // If clicking the same vote button, toggle it off
      if (currentVote === voteValue) {
        newVoteValue = 0;
      }
      // If clicking a different vote button, switch to that vote
      else {
        newVoteValue = voteValue;
      }

      console.log(
        `Voting on comment ${commentId}: ${currentVote} -> ${newVoteValue}`
      );

      // Calculate vote difference for score update
      const scoreDiff = newVoteValue - currentVote;

      // Find the current comment to get its current score
      let currentComment = null;

      // More robust recursive function to find and update a comment in a nested structure
      const findAndUpdateComment = (commentsArray, commentId, updateFn) => {
        if (
          !commentsArray ||
          !Array.isArray(commentsArray) ||
          commentsArray.length === 0
        )
          return false;

        for (let i = 0; i < commentsArray.length; i++) {
          const comment = commentsArray[i];
          if (comment.comment_id === commentId) {
            // Found the comment - apply the update function and return true
            updateFn(comment);
            return true;
          }

          // Check for replies in commentReplies structure
          const replies = commentReplies[comment.comment_id] || [];
          if (replies.length > 0) {
            const found = findAndUpdateComment(replies, commentId, updateFn);
            if (found) return true;
          }
        }
        return false;
      };

      // First try to find the comment in thread comments
      let commentFound = false;

      // Look in expandedThreadComments first
      commentFound = findAndUpdateComment(
        expandedThreadComments,
        commentId,
        (comment) => {
          currentComment = comment;
        }
      );

      // If not found in expandedThreadComments, look in threadComments
      if (!commentFound) {
        commentFound = findAndUpdateComment(
          threadComments,
          commentId,
          (comment) => {
            currentComment = comment;
          }
        );
      }

      // Fallback to direct find if not found in nested structures
      if (!currentComment) {
        currentComment =
          threadComments.find((c) => c.comment_id === commentId) ||
          (commentReplies &&
            Object.values(commentReplies)
              .flat()
              .find((c) => c.comment_id === commentId));
      }

      if (!currentComment) {
        console.error(`Comment ${commentId} not found in any state`);
        setSnackbar({
          open: true,
          message: "Error: Comment not found",
          severity: "error",
        });
        return;
      }

      // Get current score, defaulting to 0 if undefined
      const currentScore = currentComment.score || 0;

      // Calculate new score with Reddit style (never below 0)
      let newScore = currentScore + scoreDiff;
      if (newScore < 0) {
        console.log(`Comment score would go negative. Adjusting to 0.`);
        newScore = 0;
      }

      console.log(
        `Updating comment score: ${currentScore} + ${scoreDiff} = ${newScore}`
      );

      // Optimistically update UI - update vote state
      setCommentVotes((prev) => ({
        ...prev,
        [commentId]: newVoteValue,
      }));

      // Make a direct update to the comment's score for immediate UI feedback
      currentComment.score = newScore;

      // Update in the database (upsert pattern)
      const { error: voteError } = await supabase.from("user_votes").upsert(
        {
          user_id: auth.currentUser.id,
          target_type: "comment",
          target_id: commentId.toString(),
          vote_value: newVoteValue,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "user_id,target_type,target_id",
        }
      );

      if (voteError) {
        console.error("Error saving comment vote:", voteError);
        // Revert the optimistic update
        setCommentVotes((prev) => ({
          ...prev,
          [commentId]: currentVote,
        }));

        // Revert the score
        currentComment.score = currentScore;

        // Show error notification
        setSnackbar({
          open: true,
          message: "Failed to save your vote. Please try again.",
          severity: "error",
        });
        return;
      }

      // Update the comment's score in the database with direct value
      const { error: updateError } = await supabase
        .from("board_comments")
        .update({ score: newScore })
        .eq("comment_id", commentId);

      if (updateError) {
        console.error("Error updating comment score:", updateError);
        // Revert the optimistic update
        setCommentVotes((prev) => ({
          ...prev,
          [commentId]: currentVote,
        }));

        // Revert the score
        currentComment.score = currentScore;

        // Show error notification
        setSnackbar({
          open: true,
          message: "Failed to update comment score. Please try again.",
          severity: "error",
        });
        return;
      }

      // Force a refresh of state to ensure UI updates
      // Create new references for React to detect changes
      if (expandedThreadComments.length > 0) {
        setExpandedThreadComments([...expandedThreadComments]);
      }

      if (threadComments.length > 0) {
        setThreadComments([...threadComments]);
      }

      // Also update commentReplies if needed
      if (Object.keys(commentReplies).length > 0) {
        setCommentReplies({ ...commentReplies });
      }

      console.log(`Comment vote and score updated successfully`);

      // Success notification
      setSnackbar({
        open: true,
        message: "Vote saved successfully!",
        severity: "success",
      });
    } catch (error) {
      console.error("Error voting on comment:", error);
      setSnackbar({
        open: true,
        message: "Error recording your vote. Please try again.",
        severity: "error",
      });
    }
  };

  // state to track which posts this user has already saved
  const [savedPosts, setSavedPosts] = useState(new Set());
  // state to track which communities contain at least one saved post
  const [savedCommunities, setSavedCommunities] = useState(new Set());

  useEffect(() => {
    if (!user) return;

    async function loadSaved() {
      // 1) Pull this user's saved post IDs
      const { data: spRows, error: spErr } = await supabase
        .from("saved_posts")
        .select("post_id")
        .eq("user_id", user.id);

      if (spErr) {
        console.error("Could not load saved posts", spErr);
        return;
      }

      const postIds = spRows.map((r) => r.post_id);
      setSavedPosts(new Set(postIds));

      // 2) If none, clear communities
      if (postIds.length === 0) {
        setSavedCommunities(new Set());
        return;
      }

      // 3) Otherwise fetch those posts' community IDs
      const { data: obRows, error: obErr } = await supabase
        .from("open_board")
        .select("community")
        .in("open_board_id", postIds);

      if (obErr) {
        console.error("Could not load saved post communities", obErr);
        setSavedCommunities(new Set());
        return;
      }

      const commIds = obRows.map((r) => r.community);
      setSavedCommunities(new Set(commIds));
    }

    loadSaved();
  }, [user]);

  //Order post
  // inside OpenBoard, before your return:
  const sortedCommunities = React.useMemo(() => {
    // pull out the "all" view
    const allView = communities.find((c) => c.name === "all");
    // everything else
    const others = communities.filter((c) => c.name !== "all");

    // sort the rest: saved first, then by name
    others.sort((a, b) => {
      const aSaved = savedCommunities.has(a.community_id);
      const bSaved = savedCommunities.has(b.community_id);
      if (aSaved === bSaved) {
        return a.name.localeCompare(b.name);
      }
      return aSaved ? -1 : 1;
    });

    // put "all" at the front
    return allView ? [allView, ...others] : others;
  }, [communities, savedCommunities]);

  // Save post
  const handleSavePost = useCallback(
    async (postId) => {
      if (!auth.currentUser) {
        setOpenLoginDialog(true);
        return;
      }

      const isSaved = savedPosts.has(postId);
      if (isSaved) {
        await supabase
          .from("saved_posts")
          .delete()
          .match({ user_id: auth.currentUser.id, post_id: postId });
        savedPosts.delete(postId);
      } else {
        await supabase
          .from("saved_posts")
          .upsert({ user_id: auth.currentUser.id, post_id: postId });
        savedPosts.add(postId);
      }

      // force re‑render with the updated Set
      setSavedPosts(new Set(savedPosts));
    },
    [auth.currentUser, savedPosts]
  );

  // Modify fetchMessages to fetch posts by community
  const fetchMessages = useCallback(async () => {
    try {
      setLoading(true); // Show loading state
      let query = supabase
        .from("open_board")
        .select("*, comment_count, score") // Also request score field
        .in("status", ["active", "deleted"]) // Include deleted posts
        .order("created_at", { ascending: false }); // Newest first

      // Filter by community if a specific one is selected
      if (selectedCommunity !== "all") {
        // Find the community ID from the selected community name
        const communityObj = communities.find(
          (c) => c.name === selectedCommunity
        );
        if (communityObj && communityObj.community_id) {
          // Filter by community ID
          query = query.eq("community", communityObj.community_id);
        }
      }

      // Apply sorting if needed
      if (selectedSort === "top") {
        query = query
          .order("score", { ascending: false })
          .order("created_at", { ascending: false });
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error fetching posts:", error.message);
      } else if (data) {
        console.log(
          "Fetched posts with comment counts and scores:",
          data.map((post) => ({
            id: post.open_board_id,
            title: post.title,
            comment_count: post.comment_count || 0,
            score: post.score || 0,
          }))
        );
        if (selectedSort === "saved") {
          // only keep posts the user has bookmarked
          data = data.filter(post => savedPosts.has(post.open_board_id));
        }

        setMessages(data);

        // Fetch votes for the current user
        if (auth.currentUser && data.length > 0) {
          const threadIds = data.map((post) => post.open_board_id);
          fetchThreadVotes(threadIds);
        }

        // Fetch usernames for all posts
        const userIds = data.map((post) => post.creator_id).filter(Boolean);
        fetchUsernames(userIds);
      }
      setLoading(false); // Hide loading state
    } catch (err) {
      console.error("Exception in fetchMessages:", err);
      setLoading(false); // Hide loading state in case of error
    }
  }, [
    selectedCommunity,
    communities,
    fetchUsernames,
    selectedSort,
    fetchThreadVotes,
    auth.currentUser,
  ]);

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

  // Handle content change - update to use Redux
  const handleContentChange = (e) => {
    setSelectedCommunity(e.target.value);
    dispatch(setCurrentCommunity(e.target.value));
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

  // Delete message (soft delete implementation)
  const deleteMessage = async (messageId) => {
    try {
      // Check if user is the author or an admin
      const message = messages.find((msg) => msg.open_board_id === messageId);

      if (!message) {
        setSnackbar({
          open: true,
          message: "Post not found",
          severity: "error",
        });
        return;
      }

      const isAuthor = message.creator_id === userID;

      if (!isAuthor && !isAdmin) {
        setSnackbar({
          open: true,
          message: "You can only delete your own posts",
          severity: "error",
        });
        return;
      }

      // Implement soft deletion by updating status to 'deleted'
      const { error } = await supabase
        .from("open_board")
        .update({
          status: "deleted",
          content: "[deleted]",
          title: message.title, // Keep the original title
        })
        .eq("open_board_id", messageId);

      if (error) {
        console.error("Error deleting post:", error);
        setSnackbar({
          open: true,
          message: "Failed to delete post",
          severity: "error",
        });
      } else {
        // Update message in the UI to show [deleted]
        setMessages((prevMessages) =>
          prevMessages.map((msg) =>
            msg.open_board_id === messageId
              ? { ...msg, status: "deleted", content: "[deleted]" }
              : msg
          )
        );
        setSnackbar({
          open: true,
          message: "Post deleted successfully",
          severity: "success",
        });
      }
    } catch (err) {
      console.error("Exception in deleteMessage:", err);
      setSnackbar({
        open: true,
        message: "Error deleting post",
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
      // Always return a non-negative count
      return Math.max(0, message.comment_count);
    }

    // Fallback to counting replies in the messages array
    return messages.filter((msg) => msg.reply_to === messageId).length;
  };

  const handleSortChange = (sort) => {
    setSelectedSort(sort);
  
    if (messages.length > 0) {
      let sortedMessages = [...messages];
  
      if (sort === "top") {
        // Sort by score (highest first)
        sortedMessages.sort((a, b) => (b.score || 0) - (a.score || 0));
      }
      else if (sort === "new") {
        // Sort by created_at (newest first)
        sortedMessages.sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
      }
      else if (sort === "saved") {
        // Filter down to only the posts this user has saved
        sortedMessages = sortedMessages.filter(m =>
          savedPosts.has(m.open_board_id)
        );
      }
  
      setMessages(sortedMessages);
    }
  };
  
  // Function to sort comments
  const sortComments = (sortType) => {
    if (expandedThreadComments.length > 0) {
      let sortedComments = [...expandedThreadComments];

      if (sortType === "top") {
        // Sort by score (highest first)
        sortedComments.sort((a, b) => (b.score || 0) - (a.score || 0));
      } else if (sortType === "new") {
        // Sort by created_at (newest first)
        sortedComments.sort(
          (a, b) => new Date(b.created_at) - new Date(a.created_at)
        );
      }

      setExpandedThreadComments(sortedComments);
    }
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
      console.log(`Fetching thread comments for post ${threadId}`);

      // Fetch comments for this thread
      const { data, error } = await supabase
        .from("board_comments")
        .select("*, score") // Also request score field
        .eq("post_id", threadId)
        .order("created_at", { ascending: true });

      if (error) {
        console.error("Error fetching comments:", error);
        setExpandedThreadComments([]);
      } else {
        console.log(`Fetched ${data?.length || 0} comments for thread`);
        setExpandedThreadComments(data || []);

        // Fetch usernames for comment authors
        const userIds = data.map((comment) => comment.user_id).filter(Boolean);
        fetchUsernames(userIds);

        // Fetch votes for comments
        if (auth.currentUser && data.length > 0) {
          const commentIds = data.map((comment) => comment.comment_id);
          fetchCommentVotes(commentIds);
        }

        // Fetch replies for each comment - use comment_id, not id
        const commentIds = data.map((comment) => comment.comment_id);
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
      console.log(
        `Fetching replies for ${commentIds.length} comments:`,
        commentIds
      );

      const { data, error } = await supabase
        .from("board_comments")
        .select("*, score") // Also request score field
        .in("reply_to", commentIds)
        .order("created_at", { ascending: true });

      if (error) {
        console.error("Error fetching comment replies:", error);
        return;
      }

      if (data && data.length > 0) {
        console.log(`Found ${data.length} replies to comments:`, data);

        // Organize replies by parent comment
        const replies = {};
        data.forEach((reply) => {
          console.log(`Processing reply to comment ${reply.reply_to}:`, reply);
          if (!replies[reply.reply_to]) {
            replies[reply.reply_to] = [];
          }
          replies[reply.reply_to].push(reply);
        });

        console.log("Organized comment replies:", replies);
        setCommentReplies((prevReplies) => {
          const updatedReplies = { ...prevReplies, ...replies };
          console.log("Updated commentReplies state:", updatedReplies);
          return updatedReplies;
        });

        // Fetch usernames for reply authors
        const replyUserIds = data.map((reply) => reply.user_id).filter(Boolean);
        fetchUsernames(replyUserIds);

        // Fetch votes for replies
        if (auth.currentUser && data.length > 0) {
          const replyIds = data.map((reply) => reply.comment_id);
          fetchCommentVotes(replyIds);
        }

        // Recursively fetch replies to these replies - use comment_id, not id
        const replyIds = data.map((reply) => reply.comment_id);
        await fetchCommentReplies(replyIds);
      } else {
        console.log("No replies found for these comments");
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
      // First insert the new comment
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
        // Clear the comment input
        setNewComment("");

        // Get the current post to get its comment count
        const { data: postData, error: postError } = await supabase
          .from("open_board")
          .select("comment_count")
          .eq("open_board_id", threadId)
          .single();

        if (postError) {
          console.error(
            "Error fetching post for comment count update:",
            postError
          );
        } else {
          // Calculate new comment count
          const currentCount = postData.comment_count || 0;
          const newCount = currentCount + 1;

          // Update the comment count in the database
          const { error: updateError } = await supabase
            .from("open_board")
            .update({ comment_count: newCount })
            .eq("open_board_id", threadId);

          if (updateError) {
            console.error("Error updating comment count:", updateError);
          } else {
            console.log(
              `Updated comment count for post ${threadId} to ${newCount}`
            );
          }
        }

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

    if (!replyCommentText.trim()) {
      return;
    }

    try {
      console.log(
        `Submitting reply to comment ${commentId} in thread ${threadId}`
      );

      const commentData = {
        post_id: threadId,
        user_id: auth.currentUser.id,
        content: replyCommentText,
        created_at: new Date().toISOString(),
        reply_to: commentId, // This makes it a reply to a specific comment
      };

      console.log("Comment data being submitted:", commentData);

      // Insert the comment reply
      const { data, error } = await supabase
        .from("board_comments")
        .insert([commentData]);

      if (error) {
        console.error("Error submitting reply:", error);
        console.error("Error details:", JSON.stringify(error));
        setErrorMessage(`Error posting reply: ${error.message}`);
        setOpenErrorDialog(true);
      } else {
        console.log("Reply submitted successfully:", data);
        setReplyCommentText("");
        setReplyingToCommentId(null);

        // Get the current post to get its comment count
        const { data: postData, error: postError } = await supabase
          .from("open_board")
          .select("comment_count")
          .eq("open_board_id", threadId)
          .single();

        if (postError) {
          console.error(
            "Error fetching post for comment count update:",
            postError
          );
        } else {
          // Calculate new comment count
          const currentCount = postData.comment_count || 0;
          const newCount = currentCount + 1;

          // Update the comment count in the database
          const { error: updateError } = await supabase
            .from("open_board")
            .update({ comment_count: newCount })
            .eq("open_board_id", threadId);

          if (updateError) {
            console.error("Error updating comment count:", updateError);
          } else {
            console.log(
              `Updated comment count for post ${threadId} to ${newCount}`
            );
          }
        }

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
    console.log(`Rendering comment at depth ${depth}:`, comment);
    console.log(`Current commentReplies state:`, commentReplies);

    const replies = commentReplies[comment.comment_id] || [];
    console.log(
      `Found ${replies.length} replies for comment ${comment.comment_id}:`,
      replies
    );

    // Get current vote for this comment
    const userVote = commentVotes[comment.comment_id] || 0;

    return (
      <Box
        key={comment.comment_id}
        sx={{
          mt: depth === 0 ? 2 : 1,
          ml: depth > 0 ? `${depth * 20}px` : 0,
          position: "relative",
          "&::before":
            depth > 0
              ? {
                  content: '""',
                  position: "absolute",
                  left: "-12px",
                  top: 0,
                  bottom: 0,
                  width: "2px",
                  bgcolor: "rgba(0, 0, 0, 0.1)",
                  borderRadius: "2px",
                }
              : {},
        }}
      >
        <Paper
          elevation={0}
          sx={{
            p: 2,
            bgcolor: depth % 2 === 0 ? "rgba(0,0,0,0.02)" : "rgba(0,0,0,0.01)",
            borderRadius: 1,
            position: "relative",
            "&:hover": {
              bgcolor:
                depth % 2 === 0 ? "rgba(0,0,0,0.04)" : "rgba(0,0,0,0.03)",
            },
          }}
        >
          {/* Comment metadata */}
          <Typography
            variant="caption"
            sx={{ display: "block", mb: 1, color: "text.secondary" }}
          >
            <Box
              component="span"
              sx={{ fontWeight: "medium", color: "primary.main" }}
            >
              u/{usernames[comment.user_id] || "Anonymous"}
            </Box>
            {" • "}
            {formatDateTime(comment.created_at)}
          </Typography>

          {/* Comment content */}
          <Typography
            variant="body2"
            sx={{
              whiteSpace: "pre-wrap",
              mb: 1,
              color: "text.primary",
              wordBreak: "break-word",
            }}
          >
            {comment.content}
          </Typography>

          {/* Comment actions */}
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              mt: 1,
              gap: 2,
              overflow: "hidden",
              flexWrap: "nowrap", // Prevent buttons from wrapping
            }}
          >
            {/* Voting controls */}
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                mr: 0, // Reset right margin
                flexShrink: 0,
                justifyContent: "flex-start",
              }}
            >
              <IconButton
                size="small"
                onClick={() => handleCommentVote(comment.comment_id, 1)}
                color={
                  commentVotes[comment.comment_id] === 1 ? "primary" : "default"
                }
                sx={{
                  p: 0.5,
                  ...(commentVotes[comment.comment_id] === 1 && {
                    bgcolor: "rgba(15, 32, 68, 0.08)",
                  }),
                }}
              >
                <ArrowUpwardIcon fontSize="small" />
              </IconButton>

              <Typography
                variant="body2"
                sx={{
                  mx: 0.5,
                  fontWeight: "medium",
                  color:
                    commentVotes[comment.comment_id] === 1
                      ? "primary.main"
                      : commentVotes[comment.comment_id] === -1
                      ? "error.main"
                      : "text.primary",
                }}
              >
                {comment.score || 0}
              </Typography>

              <IconButton
                size="small"
                onClick={() => handleCommentVote(comment.comment_id, -1)}
                color={
                  commentVotes[comment.comment_id] === -1 ? "error" : "default"
                }
                sx={{
                  p: 0.5,
                  ...(commentVotes[comment.comment_id] === -1 && {
                    bgcolor: "rgba(160, 12, 48, 0.08)",
                  }),
                }}
              >
                <ArrowDownwardIcon fontSize="small" />
              </IconButton>
            </Box>

            {/* Reply button */}
            <Button
              size="small"
              startIcon={<ReplyIcon fontSize="small" />}
              onClick={() => setReplyingToCommentId(comment.comment_id)}
              sx={{
                minWidth: "auto",
                maxWidth: "fit-content",
                flexShrink: 0,
                px: 1,
                ml: 8, // Increase left margin to move it further right
                color: "text.secondary",
                fontSize: "0.8rem",
                textTransform: "none",
                "&:hover": {
                  backgroundColor: "rgba(0, 0, 0, 0.04)",
                  width: "auto",
                },
              }}
            >
              Reply
            </Button>

            {/* Delete button - only shown for the creator or admin */}
            {auth.currentUser &&
              (comment.user_id === auth.currentUser.id || isAdmin) && (
                <Button
                  startIcon={<DeleteIcon fontSize="small" />}
                  size="small"
                  color="error"
                  sx={{
                    textTransform: "none",
                    minWidth: "auto",
                    maxWidth: "fit-content",
                    flexShrink: 0,
                    px: 1,
                    fontSize: "0.8rem",
                    "&:hover": {
                      backgroundColor: "rgba(255, 0, 0, 0.04)",
                      width: "auto",
                    },
                  }}
                  onClick={() => {
                    setCommentToDelete(comment.comment_id);
                    setOpenDeleteCommentDialog(true);
                  }}
                >
                  Delete
                </Button>
              )}

            {/* More options for the comment */}
            <IconButton
              size="small"
              sx={{
                ml: "auto",
                p: 0.5,
                width: "32px",
                height: "32px",
                flexShrink: 0,
                flexGrow: 0,
                boxSizing: "border-box",
                borderRadius: "50%",
                "&:hover": {
                  backgroundColor: "rgba(0, 0, 0, 0.04)",
                  maxWidth: "32px",
                },
              }}
              onClick={(e) => {
                e.stopPropagation();
                handleCommentMenuOpen(e, comment.comment_id);
              }}
            >
              <MoreVertIcon fontSize="small" />
            </IconButton>
          </Box>

          {/* Menu for additional comment actions */}
          <Menu
            anchorEl={commentMenuAnchorEl}
            open={
              Boolean(commentMenuAnchorEl) &&
              activeCommentId === comment.comment_id
            }
            onClose={handleCommentMenuClose}
            anchorOrigin={{
              vertical: "bottom",
              horizontal: "right",
            }}
            transformOrigin={{
              vertical: "top",
              horizontal: "right",
            }}
            sx={{
              "& .MuiPaper-root": {
                width: "auto",
                minWidth: "150px",
                maxWidth: "200px",
              },
            }}
          >
            {auth.currentUser && comment.user_id !== auth.currentUser.id && (
              <MenuItem
                onClick={() => {
                  setCommentToReport(comment);
                  setOpenReportCommentDialog(true);
                  handleCommentMenuClose();
                }}
              >
                <ListItemIcon>
                  <FlagIcon fontSize="small" color="error" />
                </ListItemIcon>
                <ListItemText>Report</ListItemText>
              </MenuItem>
            )}
          </Menu>

          {/* Reply form */}
          {replyingToCommentId === comment.comment_id && (
            <Box
              sx={{
                mt: 2,
                pl: 2,
                borderLeft: "2px solid",
                borderColor: "primary.main",
              }}
            >
              <TextField
                fullWidth
                size="small"
                multiline
                rows={3}
                placeholder="Write your reply..."
                value={replyCommentText}
                onChange={(e) => setReplyCommentText(e.target.value)}
                sx={{
                  mb: 1,
                  bgcolor: "background.paper",
                  "& .MuiOutlinedInput-root": {
                    "&:hover fieldset": {
                      borderColor: "primary.main",
                    },
                  },
                }}
              />
              <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1 }}>
                <Button
                  size="small"
                  onClick={() => {
                    setReplyingToCommentId(null);
                    setReplyCommentText("");
                  }}
                  sx={{ color: "text.secondary" }}
                >
                  Cancel
                </Button>
                <Button
                  size="small"
                  variant="contained"
                  disableElevation
                  disabled={!replyCommentText.trim()}
                  onClick={() =>
                    submitCommentReply(comment.comment_id, threadId)
                  }
                  sx={{
                    bgcolor: "primary.main",
                    "&:hover": {
                      bgcolor: "primary.dark",
                    },
                  }}
                >
                  Reply
                </Button>
              </Box>
            </Box>
          )}
        </Paper>

        {/* Render all replies recursively */}
        {replies.length > 0 && (
          <Box sx={{ position: "relative" }}>
            {replies.map((reply) => renderComment(reply, depth + 1, threadId))}
          </Box>
        )}
      </Box>
    );
  };

  // Function to open thread view with comments
  const openThread = async (thread) => {
    setSelectedThread(thread);

    try {
      console.log(`Opening thread view for post ${thread.open_board_id}`);

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
        console.log(`Fetched ${data.length} comments for thread`);
        setThreadComments(data || []);

        // Fetch usernames for comment authors
        const userIds = data.map((comment) => comment.user_id).filter(Boolean);
        fetchUsernames(userIds);

        // Also fetch replies for nested display
        const commentIds = data.map((comment) => comment.comment_id);
        if (commentIds.length > 0) {
          console.log(`Fetching replies for ${commentIds.length} comments`);
          // Get replies to show nested comments
          const { data: repliesData, error: repliesError } = await supabase
            .from("board_comments")
            .select("*")
            .in("reply_to", commentIds)
            .order("created_at", { ascending: true });

          if (!repliesError && repliesData && repliesData.length > 0) {
            console.log(
              `Found ${repliesData.length} replies to comments:`,
              repliesData
            );

            // Add replies to commentReplies state
            const replies = {};
            repliesData.forEach((reply) => {
              console.log(
                `Processing reply to comment ${reply.reply_to}:`,
                reply
              );
              if (!replies[reply.reply_to]) {
                replies[reply.reply_to] = [];
              }
              replies[reply.reply_to].push(reply);
            });

            console.log("Organized comment replies:", replies);
            setCommentReplies((prevReplies) => {
              const updatedReplies = { ...prevReplies, ...replies };
              console.log("Updated commentReplies state:", updatedReplies);
              return updatedReplies;
            });

            // Fetch usernames for reply authors
            const replyUserIds = repliesData
              .map((reply) => reply.user_id)
              .filter(Boolean);
            fetchUsernames(replyUserIds);
          } else {
            console.log("No replies found for these comments");
          }
        }
      }

      setOpenThreadDialog(true);
    } catch (err) {
      console.error("Exception in openThread:", err);
      setThreadComments([]);
      setOpenThreadDialog(true);
    }
  };

  // Function to add a new post
  const addMessage = async (title, content) => {
    try {
      if (!title.trim()) {
        setSnackbar({
          open: true,
          message: "Please enter a title for your post",
          severity: "error",
        });
        return;
      }

      if (!content.trim()) {
        setSnackbar({
          open: true,
          message: "Please enter some content for your post",
          severity: "error",
        });
        return;
      }

      if (!newPostCommunity) {
        setSnackbar({
          open: true,
          message: "Please select a community for your post",
          severity: "error",
        });
        return;
      }

      setCreatePostLoading(true);

      // Find the community ID from the selected community name
      const communityObj = communities.find((c) => c.name === newPostCommunity);
      const communityId = communityObj ? communityObj.community_id : null;

      if (!communityId) {
        setSnackbar({
          open: true,
          message: "Invalid community selected",
          severity: "error",
        });
        setCreatePostLoading(false);
        return;
      }

      const { data, error } = await supabase.from("open_board").insert([
        {
          title: title,
          content: content,
          creator_id: user.id,
          community: communityId, // Use community ID, not name
          status: "active",
          created_at: new Date().toISOString(),
        },
      ]);

      if (error) {
        console.error("Error creating post:", error);
        setSnackbar({
          open: true,
          message: "Error creating post: " + error.message,
          severity: "error",
        });
      } else {
        console.log("New post created:", data);
        // Clear form and close dialog
        setNewPostTitle("");
        setNewPostContent("");
        setNewPostCommunity("");
        setOpenNewPostDialog(false);
        // Refresh the feed
        fetchMessages();
        setSnackbar({
          open: true,
          message: "Post created successfully!",
          severity: "success",
        });
      }
      setCreatePostLoading(false);
    } catch (error) {
      console.error("Exception in addMessage:", error);
      setSnackbar({
        open: true,
        message: "Error creating post: " + error.message,
        severity: "error",
      });
      setCreatePostLoading(false);
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
          reported_item_id: messageToReport.open_board_id,
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
      // Check if user is the author or an admin
      const message = messages.find(
        (msg) => msg.open_board_id === messageToDelete
      );

      if (!message) {
        setErrorMessage("Post not found");
        setOpenErrorDialog(true);
        return;
      }

      const isAuthor = message.creator_id === userID;

      if (!isAuthor && !isAdmin) {
        setErrorMessage("You can only delete your own posts");
        setOpenErrorDialog(true);
        return;
      }

      // Implement soft deletion by updating status to 'deleted'
      const { error } = await supabase
        .from("open_board")
        .update({
          status: "deleted",
          content: "[deleted]",
          title: message.title, // Keep the original title
        })
        .eq("open_board_id", messageToDelete);

      if (error) {
        console.error("Error deleting post:", error);
        setErrorMessage(`Error deleting post: ${error.message}`);
        setOpenErrorDialog(true);
      } else {
        setOpenDeleteDialog(false);

        // Update messages in UI to show [deleted]
        setMessages((prev) =>
          prev.map((m) =>
            m.open_board_id === messageToDelete
              ? { ...m, status: "deleted", content: "[deleted]" }
              : m
          )
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

  // Add a function to handle opening the New Post dialog
  const handleOpenNewPostDialog = () => {
    // If a specific community is selected, use it for the new post
    if (selectedCommunity && selectedCommunity !== "all") {
      setNewPostCommunity(selectedCommunity);
    } else {
      // Default to first available community if none selected
      const firstCommunity = communities.length > 0 ? communities[0].name : "";
      setNewPostCommunity(firstCommunity);
    }
    setOpenNewPostDialog(true);
  };

  // Helper function to get community name from ID
  const getCommunityName = (communityId) => {
    if (!communityId) return "Unknown";

    // Find the community object with matching community_id
    const community = communities.find((c) => c.community_id === communityId);

    // Return the name if found, otherwise just return the ID
    return community ? community.name : communityId;
  };

  // Add back the internal NewCommunityDialog component
  const NewCommunityDialog = () => {
    // Use local state to avoid re-rendering the entire parent component on every keystroke
    const [localName, setLocalName] = useState("");
    const [localDescription, setLocalDescription] = useState("");
    const [localError, setLocalError] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Initialize local state when dialog opens
    useEffect(() => {
      if (openNewCommunityDialog) {
        setLocalName("");
        setLocalDescription("");
        setLocalError("");
      }
    }, [openNewCommunityDialog]);

    const handleClose = () => {
      setOpenNewCommunityDialog(false);
    };

    // Handle creating community with local state
    const handleCreateCommunity = async () => {
      // Validate
      if (!localName.trim()) {
        setLocalError("Please provide a name for your community");
        return;
      }

      setIsSubmitting(true);

      try {
        // Check if a community with this name already exists
        const { data: existingCommunities, error: checkError } = await supabase
          .from("communities")
          .select("community_id")
          .eq("name", localName.trim());

        if (checkError) {
          console.error("Error checking existing communities:", checkError);
          setLocalError(`Error: ${checkError.message}`);
          setIsSubmitting(false);
          return;
        }

        if (existingCommunities && existingCommunities.length > 0) {
          setLocalError("A community with this name already exists");
          setIsSubmitting(false);
          return;
        }

        // Insert the new community
        const { data, error } = await supabase
          .from("communities")
          .insert([
            {
              name: localName.trim(),
              description:
                localDescription.trim() || `Welcome to ${localName.trim()}!`,
              creator_id: userID,
              created_at: new Date().toISOString(),
              status: "active",
            },
          ])
          .select();

        if (error) {
          console.error("Error creating community:", error);
          setLocalError(`Error creating community: ${error.message}`);
        } else {
          // Close dialog
          setOpenNewCommunityDialog(false);

          // Success message
          setSnackbar({
            open: true,
            message: "Community created successfully!",
            severity: "success",
          });

          // Important: Add a small delay to ensure database has updated
          setTimeout(async () => {
            // First fetch the updated communities
            try {
              const { data: refreshedCommunities, error: refreshError } =
                await supabase
                  .from("communities")
                  .select("*")
                  .order("created_at", { ascending: true });

              if (!refreshError && refreshedCommunities) {
                // Process the communities
                const processedCommunities = refreshedCommunities.map(
                  (item) => ({
                    name: item.name,
                    community_id: item.community_id,
                    creator_id: item.creator_id,
                    created_at: item.created_at,
                    description: item.description,
                  })
                );

                // Add "all" as a special view
                const allCommunities = [
                  {
                    name: "all",
                    description: "All posts from all communities",
                    isDefault: true,
                    isView: true,
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

                // Add details for "all" view
                details["all"] = {
                  description: "A combined view of posts from all communities",
                  isView: true,
                };
                setCommunityDetails(details);

                // Navigate to the new community
                if (data && data[0]) {
                  console.log("Setting community to:", data[0].name);
                  setSelectedCommunity(data[0].name);
                }
              }
            } catch (err) {
              console.error("Error refreshing communities:", err);
            }
          }, 500);
        }
      } catch (err) {
        console.error("Exception in handleCreateCommunity:", err);
        setLocalError(`An unexpected error occurred: ${err.message}`);
      } finally {
        setIsSubmitting(false);
      }
    };

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
            disabled={isSubmitting || !localName.trim()}
            startIcon={
              isSubmitting ? (
                <CircularProgress size={16} color="inherit" />
              ) : null
            }
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

  // Add state for dropdown menu
  const [menuAnchorEl, setMenuAnchorEl] = useState(null);
  const [activePostId, setActivePostId] = useState(null);
  const [commentMenuAnchorEl, setCommentMenuAnchorEl] = useState(null);
  const [activeCommentId, setActiveCommentId] = useState(null);
  const [commentToDelete, setCommentToDelete] = useState(null);
  const [openDeleteCommentDialog, setOpenDeleteCommentDialog] = useState(false);
  const [commentToReport, setCommentToReport] = useState(null);
  const [openReportCommentDialog, setOpenReportCommentDialog] = useState(false);

  // Function to handle opening the post action menu
  const handleMenuOpen = (event, postId) => {
    setMenuAnchorEl(event.currentTarget);
    setActivePostId(postId);
  };

  // Function to handle closing the post action menu
  const handleMenuClose = () => {
    setMenuAnchorEl(null);
    setActivePostId(null);
  };

  // Function to handle opening the comment action menu
  const handleCommentMenuOpen = (event, commentId) => {
    setCommentMenuAnchorEl(event.currentTarget);
    setActiveCommentId(commentId);
  };

  // Function to handle closing the comment action menu
  const handleCommentMenuClose = () => {
    setCommentMenuAnchorEl(null);
    setActiveCommentId(null);
  };

  // Function to handle comment deletion
  const handleDeleteComment = async (commentId) => {
    if (!auth.currentUser || !commentId) {
      return;
    }

    try {
      const { error } = await supabase
        .from("comments")
        .update({ status: "deleted", content: "[deleted]" })
        .eq("comment_id", commentId)
        .eq("user_id", auth.currentUser.id);

      if (error) throw error;

      // Update local state to reflect the deletion
      setComments((prevComments) =>
        prevComments.map((comment) =>
          comment.comment_id === commentId
            ? { ...comment, status: "deleted", content: "[deleted]" }
            : comment
        )
      );

      // Also update expandedThreadComments if we're in that view
      setExpandedThreadComments((prev) =>
        prev.map((comment) =>
          comment.comment_id === commentId
            ? { ...comment, status: "deleted", content: "[deleted]" }
            : comment
        )
      );

      // Close the dialog
      setOpenDeleteCommentDialog(false);

      // Show success message
      setSnackbar({
        open: true,
        message: "Comment deleted successfully",
        severity: "success",
      });
    } catch (error) {
      console.error("Error deleting comment:", error);
      setSnackbar({
        open: true,
        message: "Failed to delete comment. Please try again.",
        severity: "error",
      });
    }
  };

  // Function to handle comment reporting
  const handleReportComment = async (comment) => {
    if (!auth.currentUser || !comment) {
      setOpenLoginDialog(true);
      return;
    }

    try {
      const { error } = await supabase.from("reports").insert({
        user_id: auth.currentUser.id,
        target_id: comment.comment_id,
        target_type: "comment",
        reason: reportReason,
        status: "pending",
      });

      if (error) throw error;

      // Close the dialog and reset reason
      setOpenReportCommentDialog(false);
      setReportReason("");

      // Show success message
      setSnackbar({
        open: true,
        message: "Report submitted successfully",
        severity: "success",
      });
    } catch (error) {
      console.error("Error reporting comment:", error);
      setSnackbar({
        open: true,
        message: "Failed to submit report. Please try again.",
        severity: "error",
      });
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
              Are you sure you want to delete this post? The content will be
              hidden and replaced with "[deleted]", but the post will remain
              visible.
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
          fullWidth
          maxWidth="md"
        >
          <DialogTitle>
            <Typography variant="h6" fontWeight="medium">
              Create a new post
            </Typography>
          </DialogTitle>
          <DialogContent>
            <TextField
              autoFocus
              margin="dense"
              label="Title"
              fullWidth
              variant="outlined"
              value={newPostTitle}
              onChange={(e) => setNewPostTitle(e.target.value)}
              sx={{ mb: 2 }}
            />
            <TextField
              margin="dense"
              label="Content"
              fullWidth
              multiline
              rows={6}
              variant="outlined"
              value={newPostContent}
              onChange={(e) => setNewPostContent(e.target.value)}
            />
            <FormControl fullWidth sx={{ mb: 3, mt: 2 }}>
              <InputLabel id="post-community-select-label">
                Community
              </InputLabel>
              <Select
                labelId="post-community-select-label"
                value={newPostCommunity}
                onChange={(e) => setNewPostCommunity(e.target.value)}
                label="Community"
                sx={{ borderRadius: 1 }}
              >
                {communities.map((community) => (
                  <MenuItem key={community.community_id} value={community.name}>
                    <ListItemIcon>
                      <FolderIcon fontSize="small" />
                    </ListItemIcon>
                    s/{community.name}
                  </MenuItem>
                ))}
              </Select>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ mt: 1 }}
              >
                Posts must be created in a specific community
              </Typography>
            </FormControl>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button
              onClick={() => setOpenNewPostDialog(false)}
              color="inherit"
              sx={{
                borderRadius: 28,
                px: 2,
                mr: 1,
                height: "36px",
                textTransform: "none",
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={() => addMessage(newPostTitle, newPostContent)}
              variant="contained"
              disabled={createPostLoading}
              startIcon={
                createPostLoading ? (
                  <CircularProgress size={16} color="inherit" />
                ) : (
                  <SendIcon />
                )
              }
              sx={{
                borderRadius: 28,
                px: 2,
                height: "36px",
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
                  <Box sx={{ display: "flex", alignItems: "center", mb: 0.5 }}>
                    <Typography
                      variant="caption"
                      sx={{
                        color: "primary.main",
                        fontWeight: "bold",
                        mr: 1,
                      }}
                    >
                      s/{getCommunityName(selectedThread.community)}
                    </Typography>
                  </Box>
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
                  sx={{
                    whiteSpace: "pre-wrap",
                    mb: 3,
                    ...(selectedThread.status === "deleted" && {
                      fontStyle: "italic",
                      color: "text.disabled",
                    }),
                  }}
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
                      sx={{
                        borderRadius: 28,
                        px: 2,
                        height: "36px",
                        textTransform: "none",
                        boxShadow: 2,
                        "&:hover": {
                          boxShadow: 3,
                        },
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

                {/* Comments list */}
                {threadComments.length > 0 ? (
                  (() => {
                    console.log("Rendering thread comments:", threadComments);
                    return (
                      <Box>
                        {threadComments
                          .filter((comment) => !comment.reply_to) // Only top-level comments
                          .map((comment) => {
                            console.log("Rendering comment:", comment);
                            return renderComment(
                              comment,
                              0,
                              selectedThread.open_board_id
                            );
                          })}
                      </Box>
                    );
                  })()
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
                <Button
                  onClick={() => setOpenThreadDialog(false)}
                  sx={{
                    borderRadius: 28,
                    px: 2,
                    height: "36px",
                    textTransform: "none",
                  }}
                >
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
                height: "36px",
                textTransform: "none",
                "&:hover": {
                  boxShadow: 1,
                },
              }}
            >
              Create Community
            </Button>

            <List sx={{ mb: 2 }}>
              {sortedCommunities.map((community) => (
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
                            fontStyle:
                              community.name === "all" ? "italic" : "normal", // Italicize "all" to indicate it's special
                          }}
                        >
                          s/{community.name}
                          {community.name === "all" && (
                            <Typography
                              component="span"
                              variant="caption"
                              sx={{
                                ml: 1,
                                color: "text.secondary",
                                fontSize: "0.75rem",
                                display: "inline-block",
                              }}
                            >
                              (view)
                            </Typography>
                          )}
                          {savedCommunities.has(community.community_id) && (
                            <BookmarkIcon
                              fontSize="small"
                              sx={{ ml: 1, color: "secondary.main" }}
                            />
                          )}
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
                  alignItems: "flex-start", // Change to flex-start for proper alignment with description
                  mb: 1,
                }}
              >
                <Box>
                  <Typography
                    variant="h5"
                    component="h1"
                    sx={{ fontWeight: "bold" }}
                  >
                    {selectedCommunity === "all"
                      ? "All Communities"
                      : `s/${selectedCommunity}`}
                  </Typography>

                  {selectedCommunity === "all" && (
                    <Typography
                      variant="body2"
                      sx={{ color: "text.secondary", mt: 0.5 }}
                    >
                      s/all is a view that displays posts from all communities.
                    </Typography>
                  )}

                  {selectedCommunity !== "all" &&
                    communityDetails[selectedCommunity] && (
                      <Typography
                        variant="body2"
                        sx={{ mt: 0.5, color: "text.secondary" }}
                      >
                        {communityDetails[selectedCommunity].description}
                      </Typography>
                    )}
                </Box>

                <Button
                  variant="contained"
                  color="primary"
                  size="medium"
                  startIcon={<AddIcon />}
                  onClick={() => handleOpenNewPostDialog()}
                  disabled={selectedCommunity === "all"}
                  sx={{
                    borderRadius: 28,
                    px: 1.5,
                    width: "auto",
                    minWidth: "100px",
                    maxWidth: "130px",
                    height: "36px",
                    textTransform: "none",
                    boxShadow: 2,
                    mt: 0.5, // Add margin top to align with heading
                    transition: "all 0.2s ease-in-out",
                    bgcolor: "#0F2044", // UNCG Navy for consistency
                    "&:hover": {
                      boxShadow: 3,
                      bgcolor: "#1a305e", // Slightly lighter on hover
                    },
                  }}
                >
                  New Post
                </Button>
              </Box>

              {selectedCommunity === "all" && (
                <Typography
                  variant="caption"
                  sx={{ color: "text.secondary", mb: 1, display: "block" }}
                >
                  To create a new post, select a specific community.
                </Typography>
              )}
            </Paper>

            {/* Posts Feed with Inline Thread Expansion */}
            <Box sx={{ mb: 4 }}>
              {/* Sort controls */}
              <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 2 }}>
                <ToggleButtonGroup
                  value={selectedSort}
                  exclusive
                  onChange={(e, newSort) => {
                    if (newSort !== null) {
                      handleSortChange(newSort);
                    }
                  }}
                  size="small"
                  aria-label="sort posts"
                >
                  <ToggleButton value="new" aria-label="sort by new">
                    New
                  </ToggleButton>
                  <ToggleButton value="top" aria-label="sort by top">
                    Top
                  </ToggleButton>
                  <ToggleButton value="saved">
    <BookmarkIcon fontSize="small" sx={{ mr: .5 }}/></ToggleButton>
                </ToggleButtonGroup>
              </Box>

              {loading ? (
                <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
                  <CircularProgress />
                </Box>
              ) : messages.length > 0 ? (
                messages.map((message) => (
                  <Box
                    key={message.open_board_id}
                    sx={{ mb: 3, position: "relative" }}
                  >
                    {savedPosts.has(message.open_board_id) && (
                      <Box
                        sx={{
                          position: "absolute",
                          top: 0,
                          right: 0,
                          bgcolor: "primary.main",
                          color: "white",
                          px: 1.5,
                          py: 0.5,
                          borderBottomLeftRadius: 4,
                          zIndex: 2,
                          fontSize: "0.75rem",
                          fontWeight: "bold",
                        }}
                      >
                        Saved
                      </Box>
                    )}
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
                                setSelectedCommunity(
                                  getCommunityName(message.community)
                                )
                              }
                              sx={{
                                mr: 1,
                                fontWeight: "bold",
                                color: "primary.main",
                              }}
                            >
                              s/{getCommunityName(message.community)}
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
                                ...(message.status === "deleted" && {
                                  fontStyle: "italic",
                                  color: "text.disabled",
                                }),
                              }}
                            >
                              {message.content}
                            </Typography>
                          )}

                          {/* Action Buttons */}
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              mt: 1,
                              width: "100%",
                              overflow: "hidden",
                              gap: 2, // Increase gap between buttons
                              flexWrap: "nowrap", // Prevent buttons from wrapping
                            }}
                          >
                            {/* Voting controls */}
                            <Box
                              sx={{
                                display: "flex",
                                alignItems: "center",
                                mr: 0, // Reset right margin
                                flexShrink: 0,
                                justifyContent: "flex-start",
                              }}
                            >
                              <IconButton
                                size="small"
                                onClick={() =>
                                  handleThreadVote(message.open_board_id, 1)
                                }
                                color={
                                  threadVotes[message.open_board_id] === 1
                                    ? "primary"
                                    : "default"
                                }
                                sx={{
                                  p: 0.5,
                                  ...(threadVotes[message.open_board_id] ===
                                    1 && {
                                    bgcolor: "rgba(15, 32, 68, 0.08)",
                                  }),
                                }}
                              >
                                <ArrowUpwardIcon fontSize="small" />
                              </IconButton>

                              <Typography
                                variant="body2"
                                sx={{
                                  mx: 0.5,
                                  fontWeight: "medium",
                                  color:
                                    threadVotes[message.open_board_id] === 1
                                      ? "primary.main"
                                      : threadVotes[message.open_board_id] ===
                                        -1
                                      ? "error.main"
                                      : "text.primary",
                                }}
                              >
                                {message.score || 0}
                              </Typography>

                              <IconButton
                                size="small"
                                onClick={() =>
                                  handleThreadVote(message.open_board_id, -1)
                                }
                                color={
                                  threadVotes[message.open_board_id] === -1
                                    ? "error"
                                    : "default"
                                }
                                sx={{
                                  p: 0.5,
                                  ...(threadVotes[message.open_board_id] ===
                                    -1 && {
                                    bgcolor: "rgba(160, 12, 48, 0.08)",
                                  }),
                                }}
                              >
                                <ArrowDownwardIcon fontSize="small" />
                              </IconButton>
                            </Box>

                            {/* Comments button */}
                            <Button
                              startIcon={<MessageIcon />}
                              size="small"
                              sx={{
                                textTransform: "none",
                                color: "text.secondary",
                                minWidth: "auto",
                                maxWidth: "fit-content",
                                flexShrink: 0,
                                px: 1,
                                ml: 8, // Increase left margin even more to move it further right
                                "&:hover": {
                                  backgroundColor: "rgba(0, 0, 0, 0.04)",
                                  width: "auto",
                                },
                              }}
                              onClick={() => toggleThreadExpansion(message)}
                            >
                              {getCommentCount(message.open_board_id)} Comments
                            </Button>

                            {/* Share button */}
                            <Button
                              startIcon={<ShareIcon />}
                              size="small"
                              sx={{
                                textTransform: "none",
                                color: "text.secondary",
                                minWidth: "auto",
                                maxWidth: "fit-content",
                                flexShrink: 0,
                                px: 1,
                                "&:hover": {
                                  backgroundColor: "rgba(0, 0, 0, 0.04)",
                                  width: "auto",
                                },
                              }}
                              onClick={() => {
                                /* Share functionality */
                              }}
                            >
                              Share
                            </Button>

                            {/* Delete button - only shown for the creator or admin */}
                            {auth.currentUser &&
                              (message.creator_id === auth.currentUser.id ||
                                isAdmin) && (
                                <Button
                                  startIcon={<DeleteIcon />}
                                  size="small"
                                  color="error"
                                  sx={{
                                    textTransform: "none",
                                    minWidth: "auto",
                                    maxWidth: "fit-content",
                                    flexShrink: 0,
                                    px: 1,
                                    "&:hover": {
                                      backgroundColor: "rgba(255, 0, 0, 0.04)",
                                      width: "auto",
                                    },
                                  }}
                                  onClick={() => {
                                    setMessageToDelete(message.open_board_id);
                                    setOpenDeleteDialog(true);
                                  }}
                                >
                                  Delete
                                </Button>
                              )}

                            {/* More options menu button */}
                            <IconButton
                              size="small"
                              sx={{
                                ml: "auto",
                                p: 0.5,
                                width: "32px",
                                height: "32px",
                                flexShrink: 0,
                                flexGrow: 0,
                                boxSizing: "border-box",
                                borderRadius: "50%",
                                "&:hover": {
                                  backgroundColor: "rgba(0, 0, 0, 0.04)",
                                  maxWidth: "32px",
                                },
                              }}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleMenuOpen(e, message.open_board_id);
                              }}
                            >
                              <MoreVertIcon fontSize="small" />
                            </IconButton>
                          </Box>

                          {/* Menu for additional actions */}
                          <Menu
                            anchorEl={menuAnchorEl}
                            open={
                              Boolean(menuAnchorEl) &&
                              activePostId === message.open_board_id
                            }
                            onClose={handleMenuClose}
                            anchorOrigin={{
                              vertical: "bottom",
                              horizontal: "right",
                            }}
                            transformOrigin={{
                              vertical: "top",
                              horizontal: "right",
                            }}
                            sx={{
                              "& .MuiPaper-root": {
                                width: "auto",
                                minWidth: "150px",
                                maxWidth: "200px",
                              },
                            }}
                          >
                            <MenuItem
                              onClick={() => {
                                handleSavePost(message.open_board_id);
                                handleMenuClose();
                              }}
                            >
                              <ListItemIcon>
                                <BookmarkIcon fontSize="small" />
                              </ListItemIcon>
                              <ListItemText>
                                {savedPosts.has(message.open_board_id)
                                  ? "Unsave"
                                  : "Save"}
                              </ListItemText>
                            </MenuItem>

                            {auth.currentUser &&
                              message.creator_id !== auth.currentUser.id && (
                                <MenuItem
                                  onClick={() => {
                                    setMessageToReport(message);
                                    setOpenReportDialog(true);
                                    handleMenuClose();
                                  }}
                                >
                                  <ListItemIcon>
                                    <FlagIcon fontSize="small" color="error" />
                                  </ListItemIcon>
                                  <ListItemText>Report</ListItemText>
                                </MenuItem>
                              )}
                          </Menu>
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
                        {/* Community info for context */}
                        <Box
                          sx={{ display: "flex", alignItems: "center", mb: 1 }}
                        >
                          <Typography
                            variant="caption"
                            sx={{
                              color: "primary.main",
                              fontWeight: "bold",
                              mr: 1,
                            }}
                          >
                            s/{getCommunityName(message.community)}
                          </Typography>
                        </Box>

                        {/* Full post content when expanded */}
                        <Typography
                          variant="body1"
                          sx={{
                            whiteSpace: "pre-wrap",
                            mb: 3,
                            ...(message.status === "deleted" && {
                              fontStyle: "italic",
                              color: "text.disabled",
                            }),
                          }}
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
                                px: 2,
                                height: "36px",
                                textTransform: "none",
                                boxShadow: 2,
                                "&:hover": {
                                  boxShadow: 3,
                                },
                              }}
                            >
                              Comment
                            </Button>
                            <Box>
                              <Button
                                size="small"
                                onClick={() => setExpandedThreadId(null)}
                                sx={{
                                  borderRadius: 28,
                                  marginTop: 1,
                                  px: 2,
                                  height: "36px",
                                  textTransform: "none",
                                  boxShadow: 2,
                                  "&:hover": {
                                    boxShadow: 3,
                                    backgroundColor: "#0f2044",
                                    color: "#ffffff",
                                  }, }}
                              >
                                Close
                              </Button>
                            </Box>
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
                              sx={{
                                mt: 1,
                                borderRadius: 28,
                                px: 2,
                                height: "36px",
                                textTransform: "none",
                              }}
                            >
                              Log In
                            </Button>
                          </Box>
                        )}

                        {/* Comments section */}
                        <Box
                          sx={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            mb: 2,
                          }}
                        >
                          <Typography
                            variant="h6"
                            sx={{ fontWeight: "medium" }}
                          >
                            Comments
                          </Typography>

                          {expandedThreadComments.length > 1 && (
                            <ToggleButtonGroup
                              size="small"
                              value={null}
                              exclusive
                              onChange={(e, value) => {
                                if (value) sortComments(value);
                              }}
                              aria-label="sort comments"
                            >
                              <ToggleButton
                                value="new"
                                aria-label="sort by new"
                                size="small"
                              >
                                New
                              </ToggleButton>
                              <ToggleButton
                                value="top"
                                aria-label="sort by top"
                                size="small"
                              >
                                
                              </ToggleButton>

                              <ToggleButton 
                                value="saved" 
                                aria-label="show saved">
                                <BookmarkIcon fontSize="small" />
                             </ToggleButton>
                            </ToggleButtonGroup>
                          )}
                        </Box>

                        {expandedThreadComments.length > 0 ? (
                          (() => {
                            console.log(
                              "Rendering expanded thread comments:",
                              expandedThreadComments
                            );
                            return (
                              <Box>
                                {expandedThreadComments
                                  .filter((comment) => !comment.reply_to) // Only top-level comments
                                  .map((comment) => {
                                    console.log(
                                      "Rendering expanded comment:",
                                      comment
                                    );
                                    return renderComment(
                                      comment,
                                      0,
                                      message.open_board_id
                                    );
                                  })}
                              </Box>
                            );
                          })()
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
                  <Typography
                    variant="body1"
                    color="textSecondary"
                    sx={{ mb: 2 }}
                  >
                    {selectedCommunity === "all"
                      ? "No posts available in any community yet. s/all shows posts from all communities."
                      : `This is a brand new community! No posts in s/${selectedCommunity} yet.`}
                  </Typography>

                  {selectedCommunity !== "all" && (
                    <Typography
                      variant="body2"
                      color="textSecondary"
                      sx={{ mb: 3 }}
                    >
                      Be the first to create a post and start the conversation!
                    </Typography>
                  )}

                  <Button
                    variant="contained"
                    color="primary"
                    startIcon={<AddIcon />}
                    onClick={() => handleOpenNewPostDialog()}
                    disabled={selectedCommunity === "all"}
                    sx={{
                      mt: 2,
                      borderRadius: 28,
                      px: 2,
                      height: "36px",
                      textTransform: "none",
                      boxShadow: 2,
                      transition: "all 0.2s ease-in-out",
                      bgcolor: "#0F2044", // UNCG Navy for consistency
                      "&:hover": {
                        boxShadow: 3,
                        bgcolor: "#1a305e", // Slightly lighter on hover
                      },
                    }}
                  >
                    Create First Post
                  </Button>
                  {selectedCommunity === "all" && (
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ display: "block", mt: 1 }}
                    >
                      Select a specific community to create a post
                    </Typography>
                  )}
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
                  backgroundColor: "#0f2044",
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
                height: "36px",
                borderRadius: 28,
                px: 2,
                textTransform: "none",
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
                height: "36px",
                borderRadius: 28,
                px: 2,
                textTransform: "none",
                boxShadow: 2,
                "&:hover": {
                  bgcolor: "primary.dark",
                  boxShadow: 3,
                },
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
          {moreOptionsMessage &&
            (moreOptionsMessage.creator_id === userID || isAdmin) && (
              <MenuItem
                onClick={handleDeleteClick}
                sx={{ color: "error.main" }}
              >
                <ListItemIcon>
                  <DeleteIcon fontSize="small" sx={{ color: "error.main" }} />
                </ListItemIcon>
                Delete
              </MenuItem>
            )}
        </Menu>

        {/* Delete Comment Dialog */}
        <Dialog
          open={openDeleteCommentDialog}
          onClose={() => setOpenDeleteCommentDialog(false)}
          maxWidth="xs"
          fullWidth
        >
          <DialogTitle>Delete Comment</DialogTitle>
          <DialogContent>
            <DialogContentText>
              Are you sure you want to delete this comment? This action cannot
              be undone.
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button
              onClick={() => setOpenDeleteCommentDialog(false)}
              color="primary"
            >
              Cancel
            </Button>
            <Button
              onClick={() => handleDeleteComment(commentToDelete)}
              color="error"
              variant="contained"
            >
              Delete
            </Button>
          </DialogActions>
        </Dialog>

        {/* Report Comment Dialog */}
        <Dialog
          open={openReportCommentDialog}
          onClose={() => setOpenReportCommentDialog(false)}
          maxWidth="xs"
          fullWidth
        >
          <DialogTitle>Report Comment</DialogTitle>
          <DialogContent>
            <DialogContentText sx={{ mb: 2 }}>
              Please select a reason for reporting this comment:
            </DialogContentText>
            <FormControl fullWidth>
              <Select
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
                displayEmpty
              >
                <MenuItem value="" disabled>
                  Select a reason
                </MenuItem>
                <MenuItem value="spam">Spam</MenuItem>
                <MenuItem value="harassment">Harassment</MenuItem>
                <MenuItem value="misinformation">Misinformation</MenuItem>
                <MenuItem value="hate_speech">Hate speech</MenuItem>
                <MenuItem value="other">Other</MenuItem>
              </Select>
            </FormControl>
          </DialogContent>
          <DialogActions>
            <Button
              onClick={() => setOpenReportCommentDialog(false)}
              color="primary"
            >
              Cancel
            </Button>
            <Button
              onClick={() => handleReportComment(commentToReport)}
              color="primary"
              variant="contained"
              disabled={!reportReason}
            >
              Submit Report
            </Button>
          </DialogActions>
        </Dialog>

        {/* Floating Action Button for New Post on mobile */}
        <Fab
          color="primary"
          aria-label="add"
          onClick={() => handleOpenNewPostDialog()}
          disabled={selectedCommunity === "all"}
          sx={{
            position: "fixed",
            bottom: 24,
            right: 24,
            display: { xs: "flex", sm: "none" }, // Only show on mobile
            alignItems: "center",
            justifyContent: "flex-start",
            bgcolor: "#0F2044", // UNCG Navy
            color: "white",
            transition: "all 0.2s ease-in-out",
            "&:hover": {
              bgcolor: "#1a305e", // Slightly lighter on hover
              transform: "translateY(-2px)",
              boxShadow:
                "0px 5px 8px -1px rgba(0,0,0,0.2), 0px 8px 12px 0px rgba(0,0,0,0.14), 0px 3px 20px 0px rgba(0,0,0,0.12)",
            },
            zIndex: 1300, // Ensure it's above other elements
            "& .MuiSvgIcon-root": {
              marginRight: "8px",
            },
            px: 3,
            py: 1.5,
            borderRadius: 28,
            minWidth: "140px",
            boxShadow:
              "0px 3px 5px -1px rgba(0,0,0,0.2), 0px 6px 10px 0px rgba(0,0,0,0.14), 0px 1px 18px 0px rgba(0,0,0,0.12)",
          }}
        >
          <AddIcon />
          <Typography
            variant="button"
            sx={{ ml: 1, fontSize: "0.9rem", fontWeight: 500 }}
          >
            New Post
          </Typography>
        </Fab>
      </Box>
    </ThemeProvider>
  );
};

export default OpenBoard;
