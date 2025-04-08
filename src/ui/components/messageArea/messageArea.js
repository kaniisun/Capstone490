// Disable TypeScript checking for this file
// @ts-nocheck

import React, { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "../../../supabaseClient";
import "./messages.css";
import { Snackbar, Alert } from "@mui/material";
import {
  shouldPreventMessage,
  markMessageSent,
  trackDeletedMessage,
  isMessageDeleted,
  getDeletedMessageIds,
  resetAllMessagePrevention,
  createProductInquiryMessage,
} from "./messageHelper";
import DuplicateMessageFixer from "./DuplicateMessageFixer";
import CleanupButton from "./CleanupButton";
import RequestDebouncer from "./RequestDebouncer";
import { useSnackbar } from "notistack";

/**
 * @typedef {Object} CustomWindowProperties
 * @property {Object} __fetchingMessages - Tracks ongoing message fetches
 * @property {Object} __activeChannels - Tracks active subscription channels
 * @property {Set<string>} __processedMessageIds - Tracks processed message IDs
 * @property {Set<string>} __sentProductMessages - Tracks sent product messages
 * @property {Object} __initialMessageFetch - Tracks initial message fetches
 * @property {Object} __sessionsByProduct - Sessions organized by product ID
 */

/**
 * @typedef {Window & typeof globalThis & CustomWindowProperties} CustomWindow
 */

// @ts-ignore
/** @type {CustomWindow} */
const customWindow = window;

/**
 * MessageArea component for displaying and managing chat messages
 * @param {Object} props - Component props
 * @param {Object} props.user - Current user information
 * @param {Object} props.receiver - Receiver user information
 * @param {Function} props.onCloseChat - Function to close the chat
 * @param {Object} props.productDetails - Details about the product being discussed
 */
const MessageArea = ({ user, receiver, onCloseChat, productDetails }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [userID, setUserID] = useState(localStorage.getItem("userId"));
  const [replyingTo, setReplyingTo] = useState(null);
  const messagesEndRef = useRef(null);
  const initialMessageRef = useRef(false);
  const productSessionRef = useRef(null); // Track current product session

  // Add ref for last sender to handle message grouping
  // const lastSenderRef = useRef(null);
  // const lastMessageTimeRef = useRef(null);

  const [showReportPopup, setShowReportPopup] = useState(false);
  const [selectedReasons, setSelectedReasons] = useState([]);
  const [messageToReport, setMessageToReport] = useState(null);

  // Add snackbar state
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });

  // Add reset button state
  const [showReset, setShowReset] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const { enqueueSnackbar } = useSnackbar();

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

    // Initialize product-specific sessions if needed
    if (!customWindow.__sessionsByProduct) {
      customWindow.__sessionsByProduct = {};
    }

    // Create unique session ID for this product conversation
    if (productDetails && productDetails.id && receiver) {
      const productSessionId = `${productDetails.id}_${receiver.userID}`;
      productSessionRef.current = productSessionId;

      // Initialize this product session if it doesn't exist
      if (!customWindow.__sessionsByProduct[productSessionId]) {
        customWindow.__sessionsByProduct[productSessionId] = {
          initialMessageSent: false,
          processedMessageIds: new Set(),
          fetchingMessages: false,
          activeChannel: null,
          messagesLoaded: false,
        };

        console.log(`Created new session for product: ${productSessionId}`);
        setShowReset(false);
      } else {
        console.log(`Using existing session for product: ${productSessionId}`);
        setShowReset(true);
      }
    }
  }, [productDetails, receiver]);

  // Fetch messages with proper filtering
  const fetchMessages = useCallback(async () => {
    if (!receiver?.userID || !userID) return;

    // Get current product session if available
    const productSessionId = productSessionRef.current;
    const currentSession = productSessionId
      ? customWindow.__sessionsByProduct[productSessionId]
      : null;

    // Create a unique key for this conversation to track if it's already fetched
    const conversationKey = `messages_${userID}_${receiver.userID}`;

    // Check if we're already fetching or have recently fetched these messages
    // Use product-specific session if available
    if (currentSession) {
      if (currentSession.fetchingMessages) {
        console.log(
          "Already fetching messages for this product conversation, skipping duplicate fetch"
        );
        return;
      }

      // Mark this product session as fetching
      currentSession.fetchingMessages = true;
    } else if (
      customWindow.__fetchingMessages &&
      customWindow.__fetchingMessages[conversationKey]
    ) {
      console.log(
        "Already fetching messages for this conversation, skipping duplicate fetch"
      );
      return;
    } else {
      // Mark this conversation as being fetched (legacy approach)
      if (!customWindow.__fetchingMessages)
        customWindow.__fetchingMessages = {};
      customWindow.__fetchingMessages[conversationKey] = true;
    }

    try {
      console.log(
        `Fetching messages between ${userID} and ${receiver.userID}${
          productDetails ? ` for product ${productDetails.id}` : ""
        }`
      );

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
        console.error(`Error fetching messages: ${error.message}`);
        return;
      }

      // Double-check that we're not including any flagged messages
      let filteredMessages =
        data?.filter((msg) => msg.status !== "flagged") || [];

      // IMPORTANT: Also filter out messages that have been deleted
      const deletedIds = getDeletedMessageIds();
      if (deletedIds.size > 0) {
        const beforeCount = filteredMessages.length;
        filteredMessages = filteredMessages.filter(
          (msg) => !deletedIds.has(msg.id)
        );
        const removedCount = beforeCount - filteredMessages.length;

        if (removedCount > 0) {
          console.log(
            `Filtered out ${removedCount} previously deleted messages`
          );
        }
      }

      console.log(
        `Found ${filteredMessages.length} messages in conversation after filtering`
      );

      setMessages(filteredMessages);

      // Check if there are any messages matching our product inquiry
      // to prevent duplicate messages
      if (productDetails && filteredMessages.length > 0 && currentSession) {
        const productMessage = `Hi, I'm interested in your ${productDetails.name}`;
        const hasProductMessage = filteredMessages.some((msg) =>
          msg.content.includes(productMessage.substring(0, 25))
        );

        if (hasProductMessage) {
          // Update product-specific session
          currentSession.initialMessageSent = true;
          initialMessageRef.current = true;
          console.log(
            "Found existing product inquiry, preventing duplicate message"
          );
        }

        // Mark messages as loaded in this product session
        currentSession.messagesLoaded = true;
      }
    } catch (err) {
      console.error("Error in fetchMessages:", err);
      // Silent failure with empty array
      setMessages([]);
    } finally {
      // Clear fetch marker after a delay to prevent rapid refetching
      setTimeout(() => {
        if (currentSession) {
          currentSession.fetchingMessages = false;
        } else if (customWindow.__fetchingMessages) {
          delete customWindow.__fetchingMessages[conversationKey];
        }
      }, 2000);
    }
  }, [userID, receiver?.userID, productDetails]);

  /**
   * Initialize global variables used for tracking state across components
   */
  const setupGlobalVariables = () => {
    // Safe initialization of global tracking variables with ts-ignore comments
    // @ts-ignore - Allow custom window properties
    customWindow.__fetchingMessages = customWindow.__fetchingMessages || {};
    // @ts-ignore - Allow custom window properties
    customWindow.__activeChannels = customWindow.__activeChannels || {};
    // @ts-ignore - Allow custom window properties
    customWindow.__processedMessageIds =
      customWindow.__processedMessageIds || new Set();
    // @ts-ignore - Allow custom window properties
    customWindow.__sentProductMessages =
      customWindow.__sentProductMessages || new Set();
    // @ts-ignore - Allow custom window properties
    customWindow.__initialMessageFetch =
      customWindow.__initialMessageFetch || {};
    // @ts-ignore - Allow custom window properties
    customWindow.__sessionsByProduct = customWindow.__sessionsByProduct || {};
  };

  // Update setupRealTimeListener to ignore deleted messages
  /* Keeping this function commented in case it's needed in the future
  const setupRealTimeListener = useCallback(() => {
    if (!userID || !receiver?.userID) return;

    // Setup global variables on first run
    setupGlobalVariables();

    // Create unique channel key for this conversation
    const channelKey = `messages:${userID}:${receiver.userID}`;

    // Check if we're already subscribed to this channel
    if (
      customWindow.__activeChannels &&
      customWindow.__activeChannels[channelKey]
    ) {
      console.log(
        "Already subscribed to this channel, skipping duplicate subscription"
      );
      return;
    }

    console.log(
      `Setting up real-time listener for messages between ${userID} and ${receiver.userID}`
    );

    // Mark channel as active
    if (!customWindow.__activeChannels) customWindow.__activeChannels = {};
    customWindow.__activeChannels[channelKey] = true;

    const channel = supabase
      .channel("public:messages")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `receiver_id=eq.${userID}`,
        },
        (payload) => {
          console.log("New message received:", payload);

          // Skip processing if the message is from a different sender
          // than the one we're chatting with
          if (payload.new.sender_id !== receiver.userID) return;

          // Skip if the message was deleted (additional check)
          if (isMessageDeleted(payload.new.id)) {
            console.log("Ignoring deleted message:", payload.new.id);
            return;
          }

          // Add new message to the messages list
          setMessages((prevMessages) => [...prevMessages, payload.new]);
        }
      )
      .subscribe();

    // Cleanup function for useEffect
    return () => {
      console.log("Cleaning up real-time listener");
      channel.unsubscribe();
      if (customWindow.__activeChannels) {
        delete customWindow.__activeChannels[channelKey];
      }
    };
  }, [userID, receiver?.userID]);
  */

  // Make sure to call setupGlobalVariables on initial component load
  useEffect(() => {
    setupGlobalVariables();
  }, []);

  // Handle product details to send initial message
  useEffect(() => {
    const sendProductMessage = async () => {
      // Skip if we don't have all needed data
      if (!productDetails || !receiver || !userID) return;

      // Get current product session if available
      const productSessionId = productSessionRef.current;
      const currentSession = productSessionId
        ? customWindow.__sessionsByProduct[productSessionId]
        : null;

      // Skip if we already sent initial message during this session
      // Check product-specific session first
      if (currentSession && currentSession.initialMessageSent) {
        console.log("Initial message already sent for this product session");
        return;
      } else if (initialMessageRef.current) {
        console.log("Initial message already sent during this global session");
        return;
      }

      // Create a unique key for this specific product/seller combination
      const productMsgKey = `product_msg_${userID}_${receiver.userID}_${
        productDetails.id || productDetails.productID
      }`;

      // Check if we already sent this message (using window-level tracking)
      if (
        customWindow.__sentProductMessages &&
        customWindow.__sentProductMessages.has(productMsgKey)
      ) {
        console.log(
          "Initial message already processed on this page:",
          productMsgKey
        );

        // Update both global and product-specific session state
        initialMessageRef.current = true;
        if (currentSession) {
          currentSession.initialMessageSent = true;
        }
        return;
      }

      // Double-check if this specific message exists in the messages array already
      const productMessageStart = `Hi, I'm interested in your ${productDetails.name}`;
      const existingMessage = messages.some(
        (msg) =>
          msg.content.includes(productMessageStart) &&
          msg.sender_id === userID &&
          msg.receiver_id === receiver.userID
      );

      if (existingMessage) {
        console.log(
          "Found existing product message in messages array, skipping"
        );

        // Update both global and product-specific session state
        initialMessageRef.current = true;
        if (currentSession) {
          currentSession.initialMessageSent = true;
        }
        return;
      }

      // If we already have messages loaded but none are about this product,
      // then we likely need to send the product message
      let shouldSendMessage = messages.length === 0;

      // Even if we have messages, check if none are about this product
      if (messages.length > 0 && !existingMessage) {
        console.log(
          "Have existing messages but none about this product, will try to send"
        );
        shouldSendMessage = true;
      }

      // Additional check with our helper (but ignore its result if no messages exist)
      if (shouldPreventMessage(userID, receiver.userID, productDetails)) {
        console.log("Initial message prevented by messageHelper");

        // If we have no messages, override the prevention since we need at least one
        if (messages.length === 0) {
          console.log("But no messages exist, so overriding prevention");
          shouldSendMessage = true;
        } else {
          // If we do have messages, respect the prevention
          initialMessageRef.current = true;
          return;
        }
      }

      // We passed all checks, send the message if no messages exist or we explicitly set flag
      if (shouldSendMessage) {
        try {
          console.log("Sending initial product message");
          initialMessageRef.current = true; // Set this BEFORE the API call to prevent race conditions

          // Use the new function to create message with product image
          const initialMessage = createProductInquiryMessage(productDetails);

          const { error } = await supabase.from("messages").insert([
            {
              sender_id: userID,
              receiver_id: receiver.userID,
              content: initialMessage,
              status: "active",
              created_at: new Date().toISOString(),
            },
          ]);

          if (error) {
            if (
              error.message &&
              error.message.includes("Duplicate message detected")
            ) {
              console.log("Duplicate message prevented by database");
              // No need to show error to user, just continue as if successful
            } else {
              console.error("Error sending initial message:", error);
            }
            return;
          }

          // Mark as sent in both localStorage and memory
          markMessageSent(userID, receiver.userID, productDetails);

          // Add to window.__sentProductMessages
          if (!customWindow.__sentProductMessages)
            customWindow.__sentProductMessages = new Set();
          customWindow.__sentProductMessages.add(productMsgKey);

          // Update product-specific session state
          if (currentSession) {
            currentSession.initialMessageSent = true;
          }

          // Force a refresh of messages
          setTimeout(() => {
            fetchMessages();
          }, 1000);
        } catch (err) {
          console.error("Exception sending initial message:", err);
        }
      } else {
        console.log("Initial message not needed based on current state");
      }
    };

    // Only run when we have messages loaded
    if (messages.length >= 0) {
      // Add a small delay to ensure all initial messages are loaded
      setTimeout(() => {
        sendProductMessage();
      }, 1500);
    }
  }, [messages, productDetails, receiver, userID, fetchMessages]);

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
        if (
          error.message &&
          error.message.includes("Duplicate message detected")
        ) {
          console.log("Duplicate message prevented by database");
          // No need to show error to user, still clear the input
          setNewMessage("");
          setReplyingTo(null);
        } else {
          console.error(`Failed to send message: ${error.message}`);
          return;
        }
      } else {
        // Clear input and reply state immediately
        setNewMessage("");
        setReplyingTo(null);
      }
    } catch (err) {
      console.error(`Error sending message: ${err.message}`);
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
    try {
      console.log(`Attempting to delete message: ${messageId}`);

      // First delete from database
      const { error } = await supabase
        .from("messages")
        .delete()
        .eq("id", messageId);

      if (error) {
        console.error(`Error deleting message: ${error.message}`);
        setSnackbar({
          open: true,
          message: `Failed to delete message: ${error.message}`,
          severity: "error",
        });
        return;
      }

      // If successful, remove from UI
      setMessages((prevMessages) =>
        prevMessages.filter((msg) => msg.id !== messageId)
      );

      // IMPORTANT: Track this deleted message to prevent it from reappearing
      trackDeletedMessage(messageId);

      console.log(`Successfully deleted message ID: ${messageId}`);

      // Show success message
      setSnackbar({
        open: true,
        message: "Message deleted successfully",
        severity: "success",
      });
    } catch (err) {
      console.error(`Exception during message deletion: ${err.message}`);
      setSnackbar({
        open: true,
        message: `Error deleting message: ${err.message}`,
        severity: "error",
      });
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

  // report message
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

  // Load initial messages only once when the component mounts with valid IDs
  useEffect(() => {
    if (!userID || !receiver?.userID) return;

    // Only fetch messages if we haven't already
    const initialFetchKey = `initialFetch_${userID}_${receiver.userID}`;
    if (
      customWindow.__initialMessageFetch &&
      customWindow.__initialMessageFetch[initialFetchKey]
    ) {
      console.log("Initial messages already fetched for this conversation");
      return;
    }

    console.log("Performing initial message fetch");
    fetchMessages();

    // Mark this conversation as having been initially fetched
    if (!customWindow.__initialMessageFetch)
      customWindow.__initialMessageFetch = {};
    customWindow.__initialMessageFetch[initialFetchKey] = true;

    // Clean up tracking on component unmount
    return () => {
      if (customWindow.__initialMessageFetch) {
        delete customWindow.__initialMessageFetch[initialFetchKey];
      }
    };
  }, [userID, receiver?.userID, fetchMessages]);

  // Add reset session button for product-specific conversations
  const resetProductSession = () => {
    const productSessionId = productSessionRef.current;
    if (
      productSessionId &&
      customWindow.__sessionsByProduct[productSessionId]
    ) {
      console.log(`Resetting session for product: ${productSessionId}`);

      // Reset the session state
      customWindow.__sessionsByProduct[productSessionId] = {
        initialMessageSent: false,
        processedMessageIds: new Set(),
        fetchingMessages: false,
        activeChannel: null,
        messagesLoaded: false,
      };

      // Clear message prevention flags for this product
      if (productDetails && receiver) {
        resetAllMessagePrevention(userID, receiver.userID, productDetails);
      }

      // Reset refs and trigger fetch
      initialMessageRef.current = false;
      setMessages([]);
      setShowReset(false);
      fetchMessages();

      setSnackbar({
        open: true,
        message: "Product session has been reset",
        severity: "success",
      });
    }
  };

  // Handler for resetting message prevention for this product conversation
  const handleResetConversation = () => {
    if (!userID || !receiver?.userID || !productDetails) return;

    resetAllMessagePrevention(userID, receiver.userID, productDetails);

    // Reset window flags specific to this product
    if (customWindow.__sessionsByProduct) {
      const sessionKey = `${productDetails.id || ""}_${receiver.userID || ""}`;
      if (customWindow.__sessionsByProduct[sessionKey]) {
        delete customWindow.__sessionsByProduct[sessionKey];
      }
    }

    if (customWindow.__sentProductMessages) {
      const productKey = `${userID}_${receiver.userID}_${
        productDetails.id || productDetails.productID
      }`;
      customWindow.__sentProductMessages.delete(productKey);
    }

    setShowResetConfirm(true);

    // Refresh messages
    fetchMessages();

    enqueueSnackbar("Conversation reset successfully", {
      variant: "success",
      autoHideDuration: 3000,
    });
  };

  // Revert to original UI but keep Facebook-style message handling
  return (
    <div className="message-area-chat">
      <CleanupButton />
      <RequestDebouncer />
      {/* Test button for development removed from production */}
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
                  {/* Render message content with HTML support */}
                  {msg.content.includes("<div") ||
                  msg.content.includes("<img") ? (
                    <div
                      className="message-content-html"
                      dangerouslySetInnerHTML={{
                        __html: msg.content.replace(/\n/g, "<br/>"),
                      }}
                    />
                  ) : (
                    <p>{msg.content}</p>
                  )}

                  {/* Add product attachment rendering while keeping original UI */}
                  {msg.product_id &&
                    productDetails &&
                    (productDetails.id === msg.product_id ||
                      productDetails.productID === msg.product_id) && (
                      <div className="product-reference">
                        <div className="product-reference-name">
                          {productDetails.name}
                        </div>
                        {productDetails.image && (
                          <img
                            src={productDetails.image}
                            alt={productDetails.name}
                            className="product-reference-image"
                          />
                        )}
                        <div className="product-reference-price">
                          ${productDetails.price}
                        </div>
                      </div>
                    )}

                  <span className="message-timestamp">
                    {formatDateTime(msg.created_at)}
                  </span>
                </div>
                <div className="message-buttons">
                  <button
                    className="message-area-reply-btn"
                    onClick={() => handleReply(msg)}
                  >
                    Reply
                  </button>
                  {msg.sender_id === userID && (
                    <button
                      className="message-area-delete-msg-btn"
                      onClick={() => deleteMessage(msg.id)}
                    >
                      Delete
                    </button>
                  )}
                  {msg.sender_id !== userID && (
                    <button
                      className="message-area-report-msg-btn"
                      onClick={() => openReportPopup(msg)}
                    >
                      Report
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
            <div className="button-container">
              <button
                className="reset-button"
                onClick={handleResetConversation}
                title="Reset conversation state if messages aren't sending"
              >
                Reset
              </button>
              <button onClick={sendMessage} disabled={!newMessage.trim()}>
                Send
              </button>
            </div>
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

      {/* Render the request debouncer */}
      <RequestDebouncer />

      {/* Render the reset button for product sessions */}
      {showReset && productDetails && (
        <button className="reset-session-button" onClick={resetProductSession}>
          Reset Messages
        </button>
      )}

      {/* Render the Snackbar component */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbar.severity}
          sx={{ width: "100%" }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>

      {/* Render the DuplicateMessageFixer component */}
      <DuplicateMessageFixer userID={userID} productDetails={productDetails} />

      <Snackbar
        open={showResetConfirm}
        autoHideDuration={3000}
        onClose={() => setShowResetConfirm(false)}
        message="Conversation state has been reset"
      />
    </div>
  );
};

export default MessageArea;
