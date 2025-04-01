import React, { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "../../../supabaseClient";
//import { useAuth } from '../../../contexts/AuthContext';
import "./openboard.css";
import { Snackbar, Alert } from "@mui/material";

const OpenBoard = () => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [userID, setUserID] = useState(localStorage.getItem("userId"));
  const [replyingTo, setReplyingTo] = useState(null);
  const [selectedContent, setSelectedContent] = useState("Message");
  const [contents, setContents] = useState([]);
  const messagesEndRef = useRef(null);
  //const { user } = useAuth();
  const [usernames, setUsernames] = useState({});

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

  // Modify fetchContents to get unique content titles with their original creators
  const fetchContents = useCallback(async () => {
    const { data, error } = await supabase
      .from("open_board")
      .select("title, creator_id, created_at")
      .neq("title", "Message")
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error fetching contents:", error);
    } else if (data) {
      // Get unique contents with their original creator (first creator)
      const uniqueContents = data.reduce((acc, curr) => {
        if (!acc.find((item) => item.title === curr.title)) {
          acc.push(curr);
        }
        return acc;
      }, []);
      setContents(uniqueContents);
      // Fetch usernames for content creators
      const userIds = uniqueContents.map((content) => content.creator_id);
      fetchUsernames(userIds);
    }
  }, [fetchUsernames]);

  useEffect(() => {
    fetchContents();
  }, [fetchContents]);

  // Modify fetchMessages to handle the general Message content
  const fetchMessages = useCallback(async () => {
    try {
      let query = supabase
        .from("open_board")
        .select("*")
        .order("created_at", { ascending: true });

      if (selectedContent === "Message") {
        // For general Message content, only show messages with title 'Message'
        query = query.eq("title", "Message");
      } else {
        // For user-created content, show messages with matching title
        query = query.eq("title", selectedContent);
      }

      // Only show active messages, hiding flagged content
      query = query.not("status", "eq", "flagged");

      const { data, error } = await query;

      if (error) {
        console.error("Error fetching messages:", error.message);
      } else if (data) {
        setMessages(data);
        // Fetch usernames for all messages
        const userIds = data.map((msg) => msg.creator_id);
        fetchUsernames(userIds);
      }
    } catch (err) {
      console.error("Exception in fetchMessages:", err);
    }
  }, [selectedContent, fetchUsernames]);

  useEffect(() => {
    fetchMessages();

    const messageChannel = supabase
      .channel("open_board")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "open_board" },
        (payload) => {
          console.log("New message received via realtime:", payload.new);
          if (
            selectedContent === "Message" ||
            payload.new.title === selectedContent
          ) {
            setMessages((prevMessages) => {
              const messageExists = prevMessages.some(
                (msg) => msg.open_board_id === payload.new.open_board_id
              );
              if (messageExists) {
                return prevMessages;
              }
              return [...prevMessages, payload.new];
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(messageChannel);
    };
  }, [fetchMessages, selectedContent]);

  // Handle content change
  const handleContentChange = (e) => {
    setSelectedContent(e.target.value);
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
        setContents((prev) => [
          ...prev,
          {
            title: contentName,
            creator_id: userID,
            created_at: data[0].created_at,
          },
        ]);
        setSelectedContent(contentName);
      }
    } catch (err) {
      console.error("Exception in createNewContent:", err);
      alert("Error creating content");
    }
  };

  // Format date and time
  const formatDateTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  // Handle reply
  const handleReply = (message) => {
    setReplyingTo(message);
    setNewMessage("");
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
        title: selectedContent,
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
    const content = contents.find((c) => c.title === contentName);

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
      const content = contents.find((c) => c.title === contentToDelete);
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
      setContents((prev) =>
        prev.filter((content) => content.title !== contentToDelete)
      );
      if (selectedContent === contentToDelete) {
        setSelectedContent("Message");
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

  return (
    <div className="openboard-chat">
      <div className="openboard-sidebar">
        <div className="openboard-sidebar-header">
          <h3>Community Posts</h3>
          <button
            className="openboard-create-content-btn"
            onClick={createNewContent}
          >
            New Board
          </button>
        </div>
        <div className="openboard-contents-list">
          {/* Always show the general Message content first */}
          <div
            className={`openboard-content-item ${
              selectedContent === "Message" ? "active" : ""
            }`}
            onClick={() => setSelectedContent("Message")}
          >
            <div className="openboard-content-info">
              <span className="openboard-content-name">Community Board</span>
              <span className="openboard-content-meta">General Chat Area</span>
            </div>
          </div>
          {/* Show user-created content */}
          {contents.map((content) => (
            <div
              key={content.title}
              className={`openboard-content-item ${
                selectedContent === content.title ? "active" : ""
              }`}
              onClick={() => setSelectedContent(content.title)}
            >
              <div className="openboard-content-info">
                <span className="openboard-content-name">{content.title}</span>
                <div className="openboard-content-meta">
                  <div className="openboard-content-creator">
                    Created by:{" "}
                    {usernames[content.creator_id] || "Unknown User"}
                  </div>
                  <div className="openboard-content-timestamp">
                    {formatDateTime(content.created_at)}
                  </div>
                </div>
              </div>
              {content.creator_id === userID && (
                <button
                  className="openboard-delete-content"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteContent(content.title);
                  }}
                >
                  ×
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="openboard-messages-container">
        <div className="openboard-header">
          <h3>{selectedContent}</h3>
        </div>

        <div className="openboard-messages">
          {messages.length === 0 ? (
            <div className="openboard-no-messages">No messages yet</div>
          ) : (
            messages.map((message) => (
              <div
                key={message.open_board_id}
                className={`openboard-message ${
                  message.creator_id === userID ? "sent" : "received"
                }`}
              >
                <div className="openboard-message-content">
                  <span className="openboard-message-sender">
                    {message.creator_id === userID
                      ? "You"
                      : usernames[message.creator_id] || "Unknown User"}
                  </span>
                  {message.reply_to && (
                    <div className="openboard-reply-reference">
                      Replying to:{" "}
                      <span className="reply-content">
                        {
                          messages.find(
                            (m) => m.open_board_id === message.reply_to
                          )?.content
                        }
                      </span>
                    </div>
                  )}
                  <p>{message.content}</p>
                </div>
                <span className="openboard-message-timestamp">
                  {formatDateTime(message.created_at)}
                </span>
                <div className="openboard-message-buttons">
                  <button
                    className="openboard-message-reply-btn"
                    onClick={() => handleReply(message)}
                  >
                    Reply
                  </button>
                  {message.creator_id === userID ? (
                    <button
                      className="openboard-message-delete-msg-btn"
                      onClick={() => deleteMessage(message.open_board_id)}
                    >
                      Delete
                    </button>
                  ) : (
                    <button
                      className="openboard-message-report-msg-btn"
                      onClick={() => openReportPopup(message)}
                    >
                      Report
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="openboard-message-input">
          {replyingTo && (
            <div className="openboard-reply-indicator">
              <span>Replying to: {replyingTo.content}</span>
              <button onClick={cancelReply}>×</button>
            </div>
          )}
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type your message..."
          />
          <button onClick={sendMessage}>Send</button>
        </div>
      </div>

      {showReportPopup && (
        <div className="report-popup-overlay">
          <div className="report-popup">
            <h3>Report Message</h3>
            <p>Select reason(s) for reporting:</p>
            <div className="report-reasons">
              {reportReasons.map((reason) => (
                <label key={reason}>
                  <input
                    type="checkbox"
                    checked={selectedReasons.includes(reason)}
                    onChange={() => toggleReason(reason)}
                  />
                  {reason}
                </label>
              ))}
            </div>
            <div className="report-popup-buttons">
              <button
                className="cancel-report"
                onClick={() => setShowReportPopup(false)}
              >
                Cancel
              </button>
              <button className="confirm-report" onClick={reportMessage}>
                Report
              </button>
            </div>
          </div>
        </div>
      )}

      {showDeleteConfirm && (
        <div className="report-popup-overlay">
          <div className="report-popup">
            <h3>Delete Content</h3>
            <p>
              Are you sure you want to delete this post? This action cannot be
              undone.
            </p>
            <div className="report-popup-buttons">
              <button
                className="cancel-report"
                onClick={() => setShowDeleteConfirm(false)}
              >
                Cancel
              </button>
              <button className="confirm-report" onClick={handleConfirmDelete}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Snackbar at the end of the return */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={5000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbar.severity}
          variant="filled"
          sx={{
            width: "100%",
            borderRadius: 1,
            ...(snackbar.severity === "success" && {
              bgcolor: "#0f2044", // UNCG Blue for success alerts
            }),
          }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </div>
  );
};

export default OpenBoard;
