import React, { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "../../../supabaseClient";
import "./messages.css";
import { Snackbar, Alert } from "@mui/material";

const MessageArea = ({ user, receiver, onCloseChat }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [userID, setUserID] = useState(localStorage.getItem("userId"));
  const [replyingTo, setReplyingTo] = useState(null);
  const messagesEndRef = useRef(null);

  const [showReportPopup, setShowReportPopup] = useState(false);
  const [selectedReasons, setSelectedReasons] = useState([]);
  const [messageToReport, setMessageToReport] = useState(null);

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

  // Fetch messages with proper filtering
  const fetchMessages = useCallback(async () => {
    if (!receiver || !userID) return;

    try {
      // Query with explicit status filtering
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .or(
          `and(sender_id.eq.${userID},receiver_id.eq.${receiver.userID}),and(sender_id.eq.${receiver.userID},receiver_id.eq.${userID})`
        )
        .or("status.eq.active,status.is.null")
        .not("status", "eq", "flagged")
        .order("created_at", { ascending: true });

      if (error) {
        alert(`Error fetching messages: ${error.message}`);
        return;
      }

      // Double-check that we're not including any flagged messages
      const filteredMessages =
        data?.filter((msg) => msg.status !== "flagged") || [];

      setMessages(filteredMessages);
    } catch (err) {
      // Silent failure with empty array
      setMessages([]);
    }
  }, [receiver, userID]);

  useEffect(() => {
    if (!receiver || !userID) return;
    fetchMessages(); // get existing messages

    const messageChannel = supabase
      .channel("chat")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload) => {
          // Only add messages that aren't flagged
          if (payload.new.status === "flagged") {
            return;
          }

          if (
            (payload.new.sender_id === userID &&
              payload.new.receiver_id === receiver.userID) ||
            (payload.new.sender_id === receiver.userID &&
              payload.new.receiver_id === userID)
          ) {
            // Check if message already exists to prevent duplicates
            setMessages((prevMessages) => {
              const messageExists = prevMessages.some(
                (msg) => msg.id === payload.new.id
              );
              if (messageExists) {
                return prevMessages;
              }
              return [...prevMessages, payload.new];
            });
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "messages" },
        (payload) => {
          // If a message was flagged, remove it from the UI
          if (payload.new.status === "flagged") {
            setMessages((prevMessages) =>
              prevMessages.filter((msg) => msg.id !== payload.new.id)
            );
            return;
          }

          // For other updates, refresh the message data
          if (
            (payload.new.sender_id === userID &&
              payload.new.receiver_id === receiver.userID) ||
            (payload.new.sender_id === receiver.userID &&
              payload.new.receiver_id === userID)
          ) {
            // Update the message if it exists
            setMessages((prevMessages) =>
              prevMessages.map((msg) =>
                msg.id === payload.new.id ? payload.new : msg
              )
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(messageChannel);
    };
  }, [receiver, userID, fetchMessages]);

  // Format date and time
  const formatDateTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  // Handle reply
  const handleReply = (message) => {
    setReplyingTo(message);
    // Don't add @ mention, just set empty input
    setNewMessage("");
  };

  // Cancel reply
  const cancelReply = () => {
    setReplyingTo(null);
    setNewMessage("");
  };

  // Modified sendMessage function to explicitly include status
  const sendMessage = async () => {
    if (!newMessage.trim() || !receiver || !userID) {
      return;
    }

    try {
      const messageData = {
        sender_id: userID,
        receiver_id: receiver.userID,
        content: newMessage.trim(),
        status: "active", // Explicitly set status to active
        created_at: new Date().toISOString(),
      };

      // Only add reply_to if we're replying to a message
      if (replyingTo) {
        messageData.reply_to = replyingTo.id;
      }

      const { error } = await supabase.from("messages").insert([messageData]);

      if (error) {
        alert(`Failed to send message: ${error.message}`);
        return;
      }

      // Clear input and reply state immediately
      setNewMessage("");
      setReplyingTo(null);
    } catch (err) {
      alert(`Error sending message: ${err.message}`);
    }
  };

  // Modify the handleKeyPress function to prevent double sending
  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey && newMessage.trim()) {
      e.preventDefault();
      sendMessage();
    }
  };

  // delete message
  const deleteMessage = async (messageId) => {
    const { error } = await supabase
      .from("messages")
      .delete()
      .eq("id", messageId);

    if (!error) {
      setMessages((prevMessages) =>
        prevMessages.filter((msg) => msg.id !== messageId)
      );
    }
  };

  // open report
  const openReportPopup = (message) => {
    setMessageToReport(message);
    setShowReportPopup(true);
    setSelectedReasons([]);
  };

  // handle reasons
  const toggleReason = (reason) => {
    setSelectedReasons((prev) =>
      prev.includes(reason)
        ? prev.filter((r) => r !== reason)
        : [...prev, reason]
    );
  };

  // Handle closing the snackbar
  const handleCloseSnackbar = (event, reason) => {
    if (reason === "clickaway") {
      return;
    }
    setSnackbar({ ...snackbar, open: false });
  };

  // report message stored in Supabase
  const reportMessage = async () => {
    if (!messageToReport || selectedReasons.length === 0) {
      setSnackbar({
        open: true,
        message: "Please select at least one reason before reporting.",
        severity: "warning",
      });
      return;
    }

    try {
      // Generate a smaller integer ID that fits in PostgreSQL int4 range
      // Use the current timestamp divided by 1000 and take a modulo to ensure it fits
      const messageIdentifier = Math.floor(Date.now() / 1000) % 2147483647;

      console.log("Reporting message with:");
      console.log("- Message ID:", messageToReport.id);
      console.log("- Reporter ID:", userID);
      console.log("- Reported User ID:", messageToReport.sender_id);
      console.log("- Numeric Identifier:", messageIdentifier);
      console.log("- Selected Reasons:", selectedReasons);

      // Create a report entry in the unified reports table
      const reportData = {
        reporter_id: userID,
        reported_id: messageToReport.sender_id,
        reported_item_id: messageIdentifier, // Using a smaller integer value
        report_type: "message",
        status: "open",
        report: `${selectedReasons.join(", ")} | Message ID: ${
          messageToReport.id
        }`, // Include UUID in report text
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      console.log("Report data being sent:", reportData);

      const { data, error: reportError } = await supabase
        .from("reports")
        .insert([reportData])
        .select(); // Return the inserted data

      if (reportError) {
        console.error("Error inserting report:", reportError);
        throw reportError;
      }

      console.log("Report successfully created:", data);

      // Show success message with Snackbar instead of alert
      setSnackbar({
        open: true,
        message:
          "Message reported successfully. An admin will review your report.",
        severity: "success",
      });

      setShowReportPopup(false);
      setMessageToReport(null);
      setSelectedReasons([]);
    } catch (error) {
      console.error("Full error object:", error);

      // Show error message with Snackbar instead of alert
      setSnackbar({
        open: true,
        message: `Error reporting message: ${error.message}`,
        severity: "error",
      });
    }
  };

  // auto-scroll function
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // scroll to bottom of messages when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Add this function to help test message filtering
  const flagMessage = async (messageId) => {
    try {
      const { error } = await supabase
        .from("messages")
        .update({
          status: "flagged",
          updated_at: new Date().toISOString(),
        })
        .eq("id", messageId);

      if (error) {
        alert(`Error flagging message: ${error.message}`);
      } else {
        // Remove the message from the UI
        setMessages((prev) => prev.filter((msg) => msg.id !== messageId));
      }
    } catch (err) {
      alert(`Error during flag operation: ${err.message}`);
    }
  };

  return (
    // display chatroom and messages
    <div className="message-area-chat">
      {receiver ? (
        <>
          <div className="message-area-header">
            <h3>Chatting with {receiver.firstName}</h3>
            <button className="close-chat-btn" onClick={onCloseChat}>
              ❌
            </button>
          </div>
          <div className="message-area-messages">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`message-area-message ${
                  msg.sender_id === userID ? "sent" : "received"
                }`}
              >
                <div className="message-content">
                  <span className="message-sender">
                    {msg.sender_id === userID
                      ? "you"
                      : receiver.firstName.toLowerCase()}
                  </span>
                  {msg.reply_to && (
                    <div className="reply-reference">
                      replying to:{" "}
                      {messages
                        .find((m) => m.id === msg.reply_to)
                        ?.content.substring(0, 50)}
                      ...
                    </div>
                  )}
                  <p>{msg.content}</p>
                  <span className="message-timestamp">
                    {formatDateTime(msg.created_at)}
                  </span>
                </div>
                <div className="message-buttons">
                  <button
                    className="message-area-reply-btn"
                    onClick={() => handleReply(msg)}
                  >
                    ↩️ Reply
                  </button>
                  {msg.sender_id === userID && (
                    <button
                      className="message-area-delete-msg-btn"
                      onClick={() => deleteMessage(msg.id)}
                    >
                      🗑️ Delete
                    </button>
                  )}
                  {msg.sender_id !== userID && (
                    <button
                      className="message-area-report-msg-btn"
                      onClick={() => openReportPopup(msg)}
                    >
                      🚨 Report
                    </button>
                  )}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
          <div className="message-area-message-input">
            {replyingTo && (
              <div className="reply-indicator">
                <span>
                  Replying to: {replyingTo.content.substring(0, 30)}...
                </span>
                <button onClick={cancelReply}>✕</button>
              </div>
            )}
            <input
              type="text"
              placeholder="Type your message..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
            />
            <button onClick={sendMessage} disabled={!newMessage.trim()}>
              Send
            </button>
          </div>
        </>
      ) : (
        <p>Select a user to start chatting.</p>
      )}

      {/* Report Message  */}
      {showReportPopup && (
        <div className="report-popup-overlay">
          <div className="report-popup">
            <h3>Are you sure you want to report this message?</h3>
            <p>{messageToReport?.content}</p>

            <div className="report-reasons">
              {reportReasons.map((reason) => (
                <label key={reason}>
                  <input
                    type="checkbox"
                    value={reason}
                    checked={selectedReasons.includes(reason)}
                    onChange={() => toggleReason(reason)}
                  />
                  {reason}
                </label>
              ))}
            </div>

            <div className="report-popup-buttons">
              <button className="confirm-report" onClick={reportMessage}>
                Report
              </button>
              <button
                className="cancel-report"
                onClick={() => setShowReportPopup(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Snackbar component at the end of the return */}
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

export default MessageArea;
