import { useState } from "react";
import { supabase } from "../../../../supabaseClient";

export const useContentModeration = (
  setSnackbar,
  fetchAdminData,
  posts,
  setPosts
) => {
  // State for private messages
  const [privateMessages, setPrivateMessages] = useState([]);

  // Flag a post
  const handleFlagPost = async (post) => {
    if (!post || !post.open_board_id) return;

    try {
      // Update post status in database
      const { error } = await supabase
        .from("open_board")
        .update({
          status: "flagged",
          updated_at: new Date().toISOString(),
        })
        .eq("open_board_id", post.open_board_id);

      if (error) throw error;

      // Update local state
      const updatedPosts = posts.map((p) =>
        p.open_board_id === post.open_board_id
          ? { ...p, status: "flagged", updated_at: new Date().toISOString() }
          : p
      );

      setPosts(updatedPosts);

      // Show success message
      setSnackbar({
        open: true,
        message: "Post has been flagged and hidden from users",
        severity: "success",
      });
    } catch (error) {
      console.error("Error flagging post:", error);
      setSnackbar({
        open: true,
        message: `Error flagging post: ${error.message}`,
        severity: "error",
      });
    }
  };

  // Unflag a post
  const handleUnflagPost = async (post) => {
    if (!post || !post.open_board_id) return;

    try {
      // Update post status in database
      const { error } = await supabase
        .from("open_board")
        .update({
          status: "active",
          updated_at: new Date().toISOString(),
        })
        .eq("open_board_id", post.open_board_id);

      if (error) throw error;

      // Update local state
      const updatedPosts = posts.map((p) =>
        p.open_board_id === post.open_board_id
          ? { ...p, status: "active", updated_at: new Date().toISOString() }
          : p
      );

      setPosts(updatedPosts);

      // Show success message
      setSnackbar({
        open: true,
        message: "Post has been approved and restored to active status",
        severity: "success",
      });
    } catch (error) {
      console.error("Error unflagging post:", error);
      setSnackbar({
        open: true,
        message: `Error restoring post: ${error.message}`,
        severity: "error",
      });
    }
  };

  // Flag a private message
  const handleFlagPrivateMessage = async (message) => {
    if (!message || !message.id) return;

    try {
      // Update message status in database (matching the post flagging logic)
      const { error } = await supabase
        .from("messages")
        .update({
          status: "flagged",
          updated_at: new Date().toISOString(),
        })
        .eq("id", message.id);

      if (error) throw error;

      // Update local state (matching the post flagging logic)
      const updatedMessages = privateMessages.map((m) =>
        m.id === message.id
          ? { ...m, status: "flagged", updated_at: new Date().toISOString() }
          : m
      );

      setPrivateMessages(updatedMessages);

      // Fetch fresh data to ensure updates are reflected
      await fetchPrivateMessages(true);

      // Show success message
      setSnackbar({
        open: true,
        message: "Message has been flagged and hidden from users",
        severity: "success",
      });

      return true;
    } catch (error) {
      setSnackbar({
        open: true,
        message: `Error flagging message: ${error.message}`,
        severity: "error",
      });
      return false;
    }
  };

  // Unflag a private message
  const handleUnflagPrivateMessage = async (message) => {
    if (!message || !message.id) return;

    try {
      // Update message status in database (matching the post unflagging logic)
      const { error } = await supabase
        .from("messages")
        .update({
          status: "active",
          updated_at: new Date().toISOString(),
        })
        .eq("id", message.id);

      if (error) throw error;

      // Update local state (matching the post unflagging logic)
      const updatedMessages = privateMessages.map((m) =>
        m.id === message.id
          ? { ...m, status: "active", updated_at: new Date().toISOString() }
          : m
      );

      setPrivateMessages(updatedMessages);

      // Fetch fresh data to ensure updates are reflected
      await fetchPrivateMessages(true);

      // Show success message
      setSnackbar({
        open: true,
        message: "Message has been approved and restored to active status",
        severity: "success",
      });

      return true;
    } catch (error) {
      setSnackbar({
        open: true,
        message: `Error restoring message: ${error.message}`,
        severity: "error",
      });
      return false;
    }
  };

  // Fetch private messages for moderation
  const fetchPrivateMessages = async (forceRefresh = false) => {
    // Return cached messages if we already have data and not forcing refresh
    if (privateMessages.length > 0 && !forceRefresh) {
      return privateMessages;
    }

    try {
      // Get all messages including flagged ones for admin view
      const { data, error } = await supabase
        .from("messages")
        .select(
          `
          id,
          content,
          created_at,
          updated_at,
          sender_id,
          receiver_id,
          status,
          reply_to,
          sender:sender_id(userID, firstName, lastName),
          receiver:receiver_id(userID, firstName, lastName)
        `
        )
        .order("created_at", { ascending: false });

      if (error) {
        throw error;
      }

      // Process private messages to extract user IDs from objects
      const processedMessages =
        data?.map((message) => {
          try {
            // Create a new object to avoid modifying the original
            let processedMessage = { ...message };

            // Handle sender data
            if (message.sender && typeof message.sender === "object") {
              processedMessage.original_sender = message.sender;
              processedMessage.sender_id = message.sender.userID;
            }

            // Handle receiver data
            if (message.receiver && typeof message.receiver === "object") {
              processedMessage.original_receiver = message.receiver;
              processedMessage.receiver_id = message.receiver.userID;
            }

            // Remove the nested objects to avoid React rendering issues
            delete processedMessage.sender;
            delete processedMessage.receiver;

            // Ensure status is defined properly
            if (!processedMessage.status) {
              processedMessage.status = "active"; // Default status if none set
            }

            return processedMessage;
          } catch (err) {
            // Return the original message as fallback
            return {
              ...message,
              status: message.status || "active", // Ensure status exists
            };
          }
        }) || [];

      if (processedMessages.length > 0) {
        setPrivateMessages(processedMessages);
        return processedMessages;
      } else {
        return [];
      }
    } catch (err) {
      return privateMessages; // Return cached data on error
    }
  };

  // Delete a private message
  const handleDeletePrivateMessage = async (message) => {
    if (!message || !message.id) return false;

    try {
      // Direct delete
      const { error } = await supabase
        .from("messages")
        .delete()
        .eq("id", message.id);

      if (error) {
        throw error;
      }

      // Update local state
      if (privateMessages.length > 0) {
        setPrivateMessages((prev) =>
          prev.filter((msg) => msg.id !== message.id)
        );
      }

      // Force reload data
      await fetchPrivateMessages(true);

      // Show success message
      setSnackbar({
        open: true,
        message: "Message has been permanently deleted",
        severity: "success",
      });

      return true;
    } catch (error) {
      setSnackbar({
        open: true,
        message: `Error deleting message: ${error.message}`,
        severity: "error",
      });
      return false;
    }
  };

  return {
    handleFlagPost,
    handleUnflagPost,
    handleFlagPrivateMessage,
    handleUnflagPrivateMessage,
    privateMessages,
    setPrivateMessages,
    fetchPrivateMessages,
    handleDeletePrivateMessage,
  };
};
