import React, { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "../../../supabaseClient";
import "./messages.css";

const MessageArea = ({ user, receiver, onCloseChat }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [userID, setUserID] = useState(localStorage.getItem("userId"));
  const [replyingTo, setReplyingTo] = useState(null);
  const messagesEndRef = useRef(null);

  const [showReportPopup, setShowReportPopup] = useState(false);
  const [selectedReasons, setSelectedReasons] = useState([]);
  const [messageToReport, setMessageToReport] = useState(null);

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

  // fetch messages
  const fetchMessages = useCallback(async () => {
    if (!receiver || !userID) return;

    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .or(
        `and(sender_id.eq.${userID},receiver_id.eq.${receiver.userID}),and(sender_id.eq.${receiver.userID},receiver_id.eq.${userID})`
      )

      .order("created_at", { ascending: true });

    console.log("Fetched Messages:", data);
    console.log("Error:", error);

    if (error) {
      console.error("Error fetching messages:", error.message);
    } else if (data) {
      setMessages(data);
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
          console.log("New message received via realtime:", payload.new);

          if (
            (payload.new.sender_id === userID &&
              payload.new.receiver_id === receiver.userID) ||
            (payload.new.sender_id === receiver.userID &&
              payload.new.receiver_id === userID)
          ) {
            // Check if message already exists to prevent duplicates
            setMessages((prevMessages) => {
              const messageExists = prevMessages.some(msg => msg.id === payload.new.id);
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
    setNewMessage('');
  };

  // Cancel reply
  const cancelReply = () => {
    setReplyingTo(null);
    setNewMessage("");
  };

  // Modified sendMessage function to prevent double sending
  const sendMessage = async () => {
    if (!newMessage.trim() || !receiver || !userID) {
      console.log("Validation failed:", {
        newMessage: newMessage.trim(),
        receiver: receiver,
        userID: userID
      });
      return;
    }

    try {
      const messageData = {
        sender_id: userID,
        receiver_id: receiver.userID,
        content: newMessage.trim(),
      };

      // Only add reply_to if we're replying to a message
      if (replyingTo) {
        messageData.reply_to = replyingTo.id;
      }

      const { error } = await supabase
        .from('messages')
        .insert([messageData]);

      if (error) {
        console.error("Supabase error:", error);
        alert(`Failed to send message: ${error.message}`);
        return;
      }

      // Clear input and reply state immediately
      setNewMessage("");
      setReplyingTo(null);
      
    } catch (err) {
      console.error("Exception in sendMessage:", err);
      alert(`Error sending message: ${err.message}`);
    }
  };

  // Modify the handleKeyPress function to prevent double sending
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey && newMessage.trim()) {
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

  // report message stored in Supabase
  const reportMessage = async () => {
    if (!messageToReport || selectedReasons.length === 0) {
      alert("Please select at least one reason before reporting.");
      return;
    }

    const { error } = await supabase.from("reported_messages").insert([
      {
        message_id: messageToReport.id,
        reported_by: userID,
        content: selectedReasons.join(", "),
      },
    ]);

    if (error) {
      console.error("Error reporting message:", error.message);
    } else {
      alert("Message reported successfully!");
      setShowReportPopup(false);
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

  return (
    // display chatroom and messages
    <div className="message-area-chat">
      {receiver ? (
        <>
          <div className="message-area-header">
            <h3>Chatting with {receiver.firstName}</h3>
            <button className="close-chat-btn" onClick={onCloseChat}>
              ❌ Close Chat
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
                    {msg.sender_id === userID ? 'you' : receiver.firstName.toLowerCase()}
                  </span>
                  {msg.reply_to && (
                    <div className="reply-reference">
                      replying to: {messages.find(m => m.id === msg.reply_to)?.content.substring(0, 50)}...
                    </div>
                  )}
                  <p>{msg.content}</p>
                  <span className="message-timestamp">{formatDateTime(msg.created_at)}</span>
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
                <span>Replying to: {replyingTo.content.substring(0, 30)}...</span>
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
            <button 
              onClick={sendMessage}
              disabled={!newMessage.trim()}
            >
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
    </div>
  );
};

export default MessageArea;
