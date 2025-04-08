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
  clearPreventionFlags,
} from "./messageHelper";
import { useSnackbar } from "notistack";

// Create a local reference to the deletedMessageIds from messageHelper
// to avoid the "not defined" errors
let localDeletedMessageIds = new Set();

// Initialize local tracking of deleted messages
const initializeLocalTracking = () => {
  console.log("Initializing local tracking for deleted messages");

  // Create a window-level tracking set if it doesn't exist
  if (!window.__deletedMessageIds) {
    window.__deletedMessageIds = new Set();
  }

  // Initialize from localStorage
  try {
    const storedDeletedMessages = localStorage.getItem("deletedMessages");
    if (storedDeletedMessages) {
      const deletedMessages = JSON.parse(storedDeletedMessages);
      localDeletedMessageIds = new Set(deletedMessages);

      // Also sync with window tracking
      deletedMessages.forEach((id) => {
        window.__deletedMessageIds.add(id);
      });

      console.log(
        `Loaded ${localDeletedMessageIds.size} deleted message IDs from localStorage`
      );
    } else {
      console.log("No deleted messages found in localStorage");
    }
  } catch (err) {
    console.error("Error initializing from localStorage:", err);
  }
};

// Add a helper function to save deleted message IDs to localStorage
const saveDeletedIdsToLocalStorage = () => {
  try {
    const allIds = new Set([
      ...Array.from(localDeletedMessageIds),
      ...Array.from(window.__deletedMessageIds || []),
    ]);

    localStorage.setItem("deletedMessages", JSON.stringify(Array.from(allIds)));
    console.log(`Saved ${allIds.size} deleted message IDs to localStorage`);
  } catch (err) {
    console.error("Error saving deleted IDs to localStorage:", err);
  }
};

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
  const [isLoading, setIsLoading] = useState(false); // Add loading state
  const inputRef = useRef(null); // Add reference to input element

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
    if (productDetails && receiver) {
      const productSessionId = `${
        productDetails.id || productDetails.productID
      }_${receiver.userID}`;
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

  // Fetch messages with proper filtering - updated for conversations table
  const fetchMessages = useCallback(async () => {
    if (!receiver?.userID || !userID) return;

    // Set loading state
    setIsLoading(true);

    try {
      console.log(`Fetching messages between ${userID} and ${receiver.userID}`);

      // Get the list of known deleted message IDs from localStorage and memory
      const deletedIds = new Set();

      // Add from window tracking
      if (window.__deletedMessageIds) {
        window.__deletedMessageIds.forEach((id) => deletedIds.add(id));
      }

      // Add from localStorage
      try {
        const storedDeletedMessages = localStorage.getItem("deletedMessages");
        if (storedDeletedMessages) {
          const deletedMessages = JSON.parse(storedDeletedMessages);
          deletedMessages.forEach((id) => deletedIds.add(id));
        }
      } catch (err) {
        console.error(
          "Error retrieving deleted messages from localStorage:",
          err
        );
      }

      console.log(
        `Found ${deletedIds.size} locally tracked deleted message IDs`
      );

      // First find the conversation between these users
      const { data: conversationData, error: conversationError } =
        await supabase
          .from("conversations")
          .select("conversation_id")
          .or(
            `and(participant1_id.eq.${userID},participant2_id.eq.${receiver.userID}),and(participant1_id.eq.${receiver.userID},participant2_id.eq.${userID})`
          )
          .limit(1);

      if (conversationError) {
        console.error(
          `Error finding conversation: ${conversationError.message}`
        );
        return;
      }

      // If no conversation exists yet, return empty array
      if (!conversationData || conversationData.length === 0) {
        console.log("No conversation found between these users");
        setMessages([]);
        setIsLoading(false);
        return;
      }

      const conversationId = conversationData[0].conversation_id;
      console.log(`Found conversation: ${conversationId}`);

      // Now query messages using the conversation_id
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .eq("is_deleted", false) // Filter out deleted messages at the database level
        .order("created_at", { ascending: true });

      if (error) {
        console.error(`Error fetching messages: ${error.message}`);
        return;
      }

      // Double check by filtering out any messages that are in our locally tracked deleted IDs
      const filteredMessages = data
        ? data.filter((msg) => !deletedIds.has(msg.id))
        : [];

      console.log(
        `Found ${filteredMessages.length} messages after filtering out deleted ones`
      );
      setMessages(filteredMessages);

      // Check if there are product inquiry messages
      if (productDetails) {
        const productMessage = `Hi, I'm interested in your ${productDetails.name}`;
        const hasProductMessage = filteredMessages.some((msg) =>
          msg.content.includes(productMessage.substring(0, 25))
        );

        if (hasProductMessage) {
          initialMessageRef.current = true;
          console.log("Found existing product inquiry, preventing duplicate");
        }
      }
    } catch (err) {
      console.error("Error in fetchMessages:", err);
      setMessages([]);
    } finally {
      // Clear loading state
      setIsLoading(false);

      // Focus the input field after loading
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
        }
      }, 300);
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

    // Initialize local tracking of deleted messages
    initializeLocalTracking();
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

  // Add effect to focus input field after navigation and message loading
  useEffect(() => {
    // Focus the input field after a short delay to ensure the component is fully rendered
    if (inputRef.current && !isLoading) {
      setTimeout(() => {
        inputRef.current.focus();
      }, 500);
    }
  }, [messages, isLoading]);

  // Make sure to call setupGlobalVariables on initial component load
  useEffect(() => {
    setupGlobalVariables();
    // Initialize tracking of deleted messages
    initializeLocalTracking();
  }, []);

  // Handle product details to send initial message
  useEffect(() => {
    const sendProductMessage = async () => {
      // Skip if we don't have all needed data
      if (!productDetails || !receiver || !userID) return;

      // Skip if we already sent initial message during this session
      if (initialMessageRef.current) {
        console.log("Initial message already sent during this session");
        return;
      }

      // Add transaction lock to prevent multiple simultaneous attempts
      const lockKey = `sending_product_message_${userID}_${receiver.userID}_${
        productDetails.id || productDetails.productID
      }`;
      if (localStorage.getItem(lockKey) === "true") {
        console.log(
          "Another process is already sending the product message, skipping"
        );
        return;
      }

      try {
        // Acquire lock
        localStorage.setItem(lockKey, "true");

        // Direct check if we're in a product context from URL
        const directProductContext = isProductContext();
        console.log("Product context from URL:", directProductContext);

        // Before trying to send a message, check if one already exists in the database
        // First, find the conversation if it exists
        const { data: existingConversation, error: convError } = await supabase
          .from("conversations")
          .select("conversation_id")
          .or(
            `and(participant1_id.eq.${userID},participant2_id.eq.${receiver.userID}),and(participant1_id.eq.${receiver.userID},participant2_id.eq.${userID})`
          )
          .limit(1);

        if (
          !convError &&
          existingConversation &&
          existingConversation.length > 0
        ) {
          // Check if the conversation already has a product message
          const conversationId = existingConversation[0].conversation_id;
          const { data: existingMessages, error: msgError } = await supabase
            .from("messages")
            .select("*")
            .eq("conversation_id", conversationId)
            .order("created_at", { ascending: false });

          if (!msgError && existingMessages && existingMessages.length > 0) {
            // Check if any are product inquiry messages
            const productMessageStart = `Hi, I'm interested in your ${productDetails.name}`;
            const hasProductMessage = existingMessages.some((msg) =>
              msg.content.includes(productMessageStart)
            );

            if (hasProductMessage) {
              console.log(
                "Found existing product message in database, marking as sent"
              );
              initialMessageRef.current = true;

              // Update the local messages array
              setMessages(existingMessages);

              // Release lock and exit early
              localStorage.removeItem(lockKey);
              return;
            }
          }
        }

        // Check if we already have a product message in the current messages
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
          initialMessageRef.current = true;
          localStorage.removeItem(lockKey);
          return;
        }

        // Send message if directly from product page context, regardless of message count
        const shouldSendMessage = directProductContext && !existingMessage;

        if (shouldSendMessage) {
          try {
            console.log("Sending initial product message");
            // Set this flag AFTER the successful message creation to prevent race conditions

            // Use the function to create message with product image
            const initialMessage = createProductInquiryMessage(productDetails);

            // First, find or create a conversation between these users
            let conversationId;

            // Check if a conversation already exists
            const { data: existingConversation, error: conversationError } =
              await supabase
                .from("conversations")
                .select("conversation_id")
                .or(
                  `and(participant1_id.eq.${userID},participant2_id.eq.${receiver.userID}),and(participant1_id.eq.${receiver.userID},participant2_id.eq.${userID})`
                )
                .limit(1);

            if (conversationError) {
              console.error(
                `Error finding conversation: ${conversationError.message}`
              );
              return;
            }

            if (existingConversation && existingConversation.length > 0) {
              // Use existing conversation
              conversationId = existingConversation[0].conversation_id;
              console.log(
                `Using existing conversation for product message: ${conversationId}`
              );

              // Update the last_message_at timestamp
              await supabase
                .from("conversations")
                .update({
                  last_message_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                })
                .eq("conversation_id", conversationId);
            } else {
              // Create a new conversation
              // Make sure participant1_id is always the smaller UUID for consistency
              const participant1 =
                userID < receiver.userID ? userID : receiver.userID;
              const participant2 =
                userID < receiver.userID ? receiver.userID : userID;

              const { data: newConversation, error: newConversationError } =
                await supabase
                  .from("conversations")
                  .insert({
                    participant1_id: participant1,
                    participant2_id: participant2,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                    last_message_at: new Date().toISOString(),
                  })
                  .select();

              if (newConversationError) {
                console.error(
                  `Error creating conversation: ${newConversationError.message}`
                );
                return;
              }

              conversationId = newConversation[0].conversation_id;
              console.log(
                `Created new conversation for product message: ${conversationId}`
              );
            }

            // Now, send the message with the conversation_id
            const messageData = {
              conversation_id: conversationId,
              sender_id: userID,
              receiver_id: receiver.userID,
              content: initialMessage,
              status: "active",
              created_at: new Date().toISOString(),
            };

            // Add product ID if available
            if (productDetails.id || productDetails.productID) {
              messageData.product_id =
                productDetails.id || productDetails.productID;
            }

            // Add setLoading indicator while we wait for the database
            setIsLoading(true);

            // Send the message to the database
            const { data, error } = await supabase
              .from("messages")
              .insert([messageData])
              .select();

            if (error) {
              console.error("Error sending initial message:", error);
              setIsLoading(false);
              localStorage.removeItem(lockKey);
              return;
            }

            // If we got back server data, add it to the messages array
            if (data && data.length > 0) {
              console.log("Successfully sent product message to database");
              // Only now set the initialMessageRef flag since we succeeded
              initialMessageRef.current = true;

              // Add the real message from the database to our state
              setMessages((prevMessages) => [...prevMessages, data[0]]);
              setIsLoading(false);
            } else {
              // If no data returned, fetch all messages to make sure we have the latest
              console.log(
                "No data returned from message insert, refreshing messages"
              );
              fetchMessages();
            }
          } catch (err) {
            console.error("Exception sending initial message:", err);
            // On error, reset the initialMessageRef so we can try again
            initialMessageRef.current = false;
            setIsLoading(false);
          }
        } else {
          console.log("Initial message not needed based on current state");
        }
      } finally {
        // Always release the lock when done
        localStorage.removeItem(lockKey);
      }
    };

    // Run immediately when product details are available
    if (productDetails && receiver && userID) {
      sendProductMessage();
    }
  }, [productDetails, receiver, userID, messages, fetchMessages]);

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

  // Modified sendMessage function to avoid temporary IDs
  const sendMessage = async () => {
    if (!newMessage.trim() || !receiver || !userID) {
      return;
    }

    try {
      const messageContent = newMessage.trim();

      // Show loading indicator while we process
      setIsLoading(true);

      // Clear input and reply state immediately to improve UI responsiveness
      const savedNewMessage = newMessage;
      const savedReplyTo = replyingTo;
      setNewMessage("");
      setReplyingTo(null);

      // First, find or create a conversation between these users
      let conversationId;

      // Check if a conversation already exists
      const { data: existingConversation, error: conversationError } =
        await supabase
          .from("conversations")
          .select("conversation_id")
          .or(
            `and(participant1_id.eq.${userID},participant2_id.eq.${receiver.userID}),and(participant1_id.eq.${receiver.userID},participant2_id.eq.${userID})`
          )
          .limit(1);

      if (conversationError) {
        console.error(
          `Error finding conversation: ${conversationError.message}`
        );
        setIsLoading(false);
        throw conversationError;
      }

      if (existingConversation && existingConversation.length > 0) {
        // Use existing conversation
        conversationId = existingConversation[0].conversation_id;
        console.log(`Using existing conversation: ${conversationId}`);

        // Update the last_message_at timestamp
        await supabase
          .from("conversations")
          .update({
            last_message_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("conversation_id", conversationId);
      } else {
        // Create a new conversation
        // Make sure participant1_id is always the smaller UUID for consistency
        const participant1 =
          userID < receiver.userID ? userID : receiver.userID;
        const participant2 =
          userID < receiver.userID ? receiver.userID : userID;

        const { data: newConversation, error: newConversationError } =
          await supabase
            .from("conversations")
            .insert({
              participant1_id: participant1,
              participant2_id: participant2,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              last_message_at: new Date().toISOString(),
            })
            .select();

        if (newConversationError) {
          console.error(
            `Error creating conversation: ${newConversationError.message}`
          );
          setIsLoading(false);
          throw newConversationError;
        }

        conversationId = newConversation[0].conversation_id;
        console.log(`Created new conversation: ${conversationId}`);
      }

      // Now insert the message with the conversation_id
      const messageData = {
        conversation_id: conversationId,
        sender_id: userID,
        receiver_id: receiver.userID,
        content: messageContent,
        status: "active",
        created_at: new Date().toISOString(),
      };

      if (savedReplyTo) {
        messageData.reply_to = savedReplyTo.id;
      }

      // Add product ID if we're in a product context
      if (productDetails && (productDetails.id || productDetails.productID)) {
        messageData.product_id = productDetails.id || productDetails.productID;
      }

      const { data, error } = await supabase
        .from("messages")
        .insert([messageData])
        .select();

      if (error) {
        if (
          error.message &&
          error.message.includes("Duplicate message detected")
        ) {
          console.log("Duplicate message prevented by database");
          // No need to show error to user
        } else {
          console.error(`Failed to send message: ${error.message}`);
          // Show error notification
          setSnackbar({
            open: true,
            message: `Error sending message: ${error.message}`,
            severity: "error",
          });
        }
      } else if (data && data.length > 0) {
        // Add the real message from the database to our state
        setMessages((prevMessages) => [...prevMessages, data[0]]);
      } else {
        // If no data returned, refresh all messages to ensure consistency
        fetchMessages();
      }
    } catch (err) {
      console.error(`Error sending message: ${err.message}`);
      setSnackbar({
        open: true,
        message: `Error sending message: ${err.message}`,
        severity: "error",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Modify the handleKeyPress function to prevent double sending
  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey && newMessage.trim()) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Simplified delete message function without temporary ID handling
  const deleteMessage = async (messageId) => {
    try {
      console.log(`Starting deletion for message ID: ${messageId}`);

      // Store message info before deleting (for product context checking)
      const messageToDelete = messages.find((msg) => msg.id === messageId);
      const isProductInquiry =
        messageToDelete &&
        productDetails &&
        messageToDelete.content.includes(
          `Hi, I'm interested in your ${productDetails.name}`
        );

      // Remove from UI immediately for better user experience
      setMessages((prevMessages) =>
        prevMessages.filter((msg) => msg.id !== messageId)
      );

      // Add to tracking regardless of deletion success (as a backup)
      try {
        if (!window.__deletedMessageIds) window.__deletedMessageIds = new Set();
        window.__deletedMessageIds.add(messageId);

        if (localDeletedMessageIds) {
          localDeletedMessageIds.add(messageId);
        }

        // Save to localStorage
        saveDeletedIdsToLocalStorage();

        // Use the helper function if available
        if (typeof trackDeletedMessage === "function") {
          trackDeletedMessage(messageId);
        }
      } catch (trackErr) {
        console.error("Error tracking deleted message:", trackErr);
      }

      // Attempt to set is_deleted=true which will trigger the database function to permanently delete
      let isDeleted = false;
      const maxRetries = 3;

      for (let attempt = 0; attempt < maxRetries && !isDeleted; attempt++) {
        try {
          console.log(
            `Deletion attempt ${attempt + 1} for message: ${messageId}`
          );

          // Use UPDATE instead of DELETE to trigger the permanent deletion function
          const { error } = await supabase
            .from("messages")
            .update({ is_deleted: true })
            .eq("id", messageId);

          if (error) {
            console.error(
              `Deletion error on attempt ${attempt + 1}:`,
              error.message
            );
            if (attempt === maxRetries - 1) {
              throw error; // Throw on last attempt
            }
          } else {
            console.log(
              `Successfully marked message ${messageId} as deleted on attempt ${
                attempt + 1
              }`
            );
            isDeleted = true;
          }
        } catch (innerErr) {
          console.error(
            `Exception during delete attempt ${attempt + 1}:`,
            innerErr
          );
          if (attempt === maxRetries - 1) {
            throw innerErr; // Re-throw on last attempt
          }
        }

        // Wait before retry if needed
        if (!isDeleted && attempt < maxRetries - 1) {
          await new Promise((resolve) => setTimeout(resolve, 500));
        }
      }

      // For product inquiry messages, refresh UI to update product context
      if (isProductInquiry) {
        console.log("Deleted a product inquiry message - refreshing UI");
        setTimeout(() => {
          fetchMessages();
        }, 300);
      }

      setSnackbar({
        open: true,
        message: isDeleted
          ? "Message deleted successfully"
          : "Message removed from view",
        severity: isDeleted ? "success" : "info",
      });
    } catch (err) {
      console.error(`Exception during message deletion:`, err);
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

    console.log("Performing initial message fetch");
    fetchMessages();

    // Manual focus after component mounts
    const focusInput = () => {
      if (inputRef.current) {
        console.log("Manually focusing input field");
        inputRef.current.focus();
      }
    };

    // Try focusing multiple times
    setTimeout(focusInput, 300);
    setTimeout(focusInput, 800);
    setTimeout(focusInput, 1500);
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

  // Function to check if there's a product inquiry message in the conversation
  const hasProductInquiryMessage = useCallback(() => {
    if (!productDetails || !messages || messages.length === 0) {
      // When there are no messages but we're coming from a product page,
      // we should still show the product header
      if (productDetails && isProductContext() && messages.length === 0) {
        return true;
      }
      return false;
    }

    const productName = productDetails.name;

    // Check more thoroughly for product-related messages
    return messages.some((msg) => {
      // Check for standard inquiry text
      if (
        msg.content.includes("I'm interested in your") &&
        msg.content.includes(productName)
      ) {
        return true;
      }

      // Check for product image
      if (msg.content.includes("<img") && msg.content.includes(productName)) {
        return true;
      }

      // Check for product mentions
      if (
        msg.content.includes(productName) &&
        (msg.content.includes("product") ||
          msg.content.includes("available") ||
          msg.content.includes("interested"))
      ) {
        return true;
      }

      // Check for explicit product ID reference
      if (
        msg.product_id &&
        (msg.product_id === productDetails.id ||
          msg.product_id === productDetails.productID)
      ) {
        return true;
      }

      return false;
    });
  }, [messages, productDetails]);

  // Enhanced function to check if we're coming from a product page
  const isProductContext = () => {
    // Cache check results to prevent re-running too often
    const cacheKey = "product_context_check";
    const lastCheckTime = parseInt(
      localStorage.getItem(`${cacheKey}_timestamp`) || "0",
      10
    );
    const now = Date.now();

    // If we've checked within the last 3 seconds, return the cached result
    if (now - lastCheckTime < 3000) {
      const cachedResult = localStorage.getItem(cacheKey);
      if (cachedResult !== null) {
        return cachedResult === "true";
      }
    }

    // Perform the actual check
    // Check URL search parameters
    const urlParams = new URLSearchParams(window.location.search);

    // Check for both common parameter names
    const hasProductId =
      urlParams.has("productId") ||
      urlParams.has("product_id") ||
      urlParams.has("product");

    // Also check for productName which is sometimes included
    const hasProductName =
      urlParams.has("productName") || urlParams.has("name");

    // Check if we have productDetails passed as a prop
    const hasProductDetailsProps =
      productDetails &&
      (productDetails.id || productDetails.productID) &&
      productDetails.name;

    // Also check localStorage for recent product context
    let hasStoredContext = false;
    try {
      const contextData = localStorage.getItem("lastProductContext");
      if (contextData) {
        const parsedData = JSON.parse(contextData);
        // Only consider context data from last 5 minutes
        if (
          parsedData &&
          parsedData.timestamp &&
          Date.now() - parsedData.timestamp < 5 * 60 * 1000
        ) {
          hasStoredContext = true;
        } else {
          // Clear outdated context data
          localStorage.removeItem("lastProductContext");
        }
      }
    } catch (err) {
      console.error("Error parsing stored product context:", err);
    }

    // Determine the final result
    const isProductCtx =
      hasProductId ||
      (hasProductDetailsProps && (hasProductName || hasStoredContext));

    // Store this result and timestamp for caching
    localStorage.setItem(cacheKey, isProductCtx.toString());
    localStorage.setItem(`${cacheKey}_timestamp`, now.toString());

    console.log(
      `Product context check: URL params: ${hasProductId}, Props: ${!!productDetails}, Stored context: ${hasStoredContext}, Result: ${isProductCtx}`
    );

    // If we determine we're in a product context, store this info temporarily
    if (
      isProductCtx &&
      (hasProductId || (hasProductDetailsProps && hasProductName))
    ) {
      localStorage.setItem(
        "lastProductContext",
        JSON.stringify({
          timestamp: Date.now(),
          productId:
            productDetails?.id ||
            productDetails?.productID ||
            urlParams.get("productId"),
          name: productDetails?.name || urlParams.get("productName"),
        })
      );
    }

    return isProductCtx;
  };

  // Add a function to permanently delete tracked messages from the database
  // using the trigger-based approach
  const attemptPermanentDeletion = useCallback(async () => {
    try {
      // Get deleted message IDs from both tracking systems
      const deletedIds = new Set([
        ...Array.from(localDeletedMessageIds || []),
        ...Array.from(window.__deletedMessageIds || []),
      ]);

      if (deletedIds.size === 0) {
        console.log("No messages to permanently delete");
        return;
      }

      console.log(
        `Attempting permanent deletion of ${deletedIds.size} tracked messages`
      );

      // Convert Set to Array for Supabase in() function and filter out invalid UUIDs
      const idsToDelete = Array.from(deletedIds).filter((id) => {
        // Simple UUID validation - must be string and match basic UUID format
        return (
          typeof id === "string" &&
          (id.match(
            /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
          ) ||
            // Also match raw UUIDs without dashes
            id.match(/^[0-9a-f]{32}$/i))
        );
      });

      if (idsToDelete.length === 0) {
        console.log("No valid UUIDs to delete after filtering");
        return;
      }

      console.log(`Found ${idsToDelete.length} valid UUIDs to delete`);

      // Don't attempt to delete more than 25 at once to avoid query limits
      const batchSize = 25;
      let totalDeleted = 0;

      // Process in smaller batches
      for (let i = 0; i < idsToDelete.length; i += batchSize) {
        const batch = idsToDelete.slice(i, i + batchSize);

        try {
          // Use UPDATE instead of DELETE to trigger the permanent deletion function
          const { error } = await supabase
            .from("messages")
            .update({ is_deleted: true })
            .in("id", batch);

          if (error) {
            console.error(`Batch deletion error:`, error.message);
          } else {
            console.log(
              `Successfully marked batch of ${batch.length} messages as deleted`
            );
            totalDeleted += batch.length;
          }
        } catch (err) {
          console.error(`Error processing batch:`, err);
        }
      }

      console.log(`Successfully processed ${totalDeleted} message deletions`);
      return totalDeleted > 0;
    } catch (err) {
      console.error(`Error in permanent deletion attempt:`, err);
      return false;
    }
  }, []);

  // Add useEffect to run permanent deletion periodically
  useEffect(() => {
    // Run an initial check after component mounts
    const initialTimer = setTimeout(() => {
      console.log("Running initial permanent deletion check");
      attemptPermanentDeletion();
    }, 5000); // 5 second delay on initial run

    // Set up periodic permanent deletion attempts
    const permanentDeletionInterval = setInterval(() => {
      console.log("Running scheduled permanent deletion check");
      attemptPermanentDeletion();
    }, 60000); // Try every minute

    // Clean up
    return () => {
      clearTimeout(initialTimer);
      clearInterval(permanentDeletionInterval);
    };
  }, [attemptPermanentDeletion]);

  // Add a function to help with message persistence monitoring
  const logMessageState = (message, messageArray = messages) => {
    console.log(`${message} - Current message count: ${messageArray.length}`);
    if (messageArray.length > 0) {
      console.log(
        `Last message: ${messageArray[
          messageArray.length - 1
        ].content.substring(0, 30)}...`
      );
    }
  };

  // Add effect to safeguard against disappearing messages
  useEffect(() => {
    // When messages change, log the count
    logMessageState("Messages array updated");

    // If we see an empty messages array but initialMessageRef says we sent something
    // This could be a race condition where re-fetching cleared the temporary message
    if (
      messages.length === 0 &&
      initialMessageRef.current &&
      isProductContext() &&
      productDetails
    ) {
      console.log(
        "Warning: Messages empty but initialMessageRef is true, possible race condition"
      );

      // Wait for any current operations and try to restore the initial message
      setTimeout(() => {
        // Only if still empty
        if (messages.length === 0) {
          console.log("Attempting to restore product message");
          initialMessageRef.current = false; // Reset so we can try again
          // This will trigger the sendProductMessage effect
        }
      }, 1000);
    }
  }, [messages, productDetails]);

  // Update fetchMessages with additional message persistence check
  useEffect(() => {
    // After initial fetch completes, check if product message should be there
    if (
      !isLoading &&
      productDetails &&
      receiver?.userID &&
      userID &&
      isProductContext()
    ) {
      // Check if messages are empty and we might need the product message
      if (messages.length === 0 && !initialMessageRef.current) {
        console.log(
          "After fetch: No messages but product context detected, initializing product message"
        );
        // The sendProductMessage effect will run after this
      }
    }
  }, [isLoading, messages, productDetails, receiver?.userID, userID]);

  // Periodically check if product message was actually sent to the database
  useEffect(() => {
    // Only run if we're in a product context and a message should have been sent
    if (!productDetails || !userID || !receiver?.userID || !isProductContext())
      return;

    // Add a verification counter to localStorage to prevent infinite loops
    const verificationCountKey = `verify_count_${userID}_${receiver.userID}_${
      productDetails.id || productDetails.productID
    }`;
    const currentCount = parseInt(
      localStorage.getItem(verificationCountKey) || "0",
      10
    );

    // If we've already checked too many times, don't continue this loop
    if (currentCount > 3) {
      console.log("Reached maximum verification attempts, stopping checks");
      return;
    }

    // Only set up verification for empty message arrays when we think a message was sent
    if (messages.length === 0 && initialMessageRef.current) {
      // Store this attempt
      localStorage.setItem(verificationCountKey, (currentCount + 1).toString());

      // Set up periodic check with a longer timeout (2.5 seconds)
      const checkTimer = setTimeout(async () => {
        console.log(
          `Running verification check for product message (attempt ${
            currentCount + 1
          })`
        );

        try {
          // First check if conversation exists
          const { data: conversationData, error: convError } = await supabase
            .from("conversations")
            .select("conversation_id")
            .or(
              `and(participant1_id.eq.${userID},participant2_id.eq.${receiver.userID}),and(participant1_id.eq.${receiver.userID},participant2_id.eq.${userID})`
            )
            .limit(1);

          if (convError) {
            console.error("Error checking conversation:", convError);
            return;
          }

          // If no conversation found, we should reset the flag but don't auto-send again
          if (!conversationData || conversationData.length === 0) {
            console.log(
              "No conversation found, resetting product message state"
            );
            initialMessageRef.current = false;
            return;
          }

          // We found a conversation, check if it has any messages
          const conversationId = conversationData[0].conversation_id;
          const { data: messageData, error: msgError } = await supabase
            .from("messages")
            .select("*") // Select all fields so we can add to messages if found
            .eq("conversation_id", conversationId)
            .order("created_at", { ascending: true });

          if (msgError) {
            console.error("Error checking messages:", msgError);
            return;
          }

          // If conversation exists with messages but our display is empty, just add them to state
          if (messageData && messageData.length > 0) {
            console.log(
              `Found ${messageData.length} messages in conversation that aren't displayed`
            );

            // Check if any are product inquiry messages
            const hasProductMessage = messageData.some((msg) =>
              msg.content.includes(
                `Hi, I'm interested in your ${productDetails.name}`
              )
            );

            if (hasProductMessage) {
              console.log(
                "Found existing product inquiry message in database, adding to UI"
              );
              initialMessageRef.current = true;

              // Update the messages state with what we found in the database
              setMessages(messageData);

              // Clear verification counter since we found messages
              localStorage.removeItem(verificationCountKey);
            } else if (currentCount >= 3) {
              // If we've already checked multiple times and found messages but no product message
              // We'll want to manually send it once
              console.log(
                "No product message found after multiple checks, manually triggering send"
              );
              initialMessageRef.current = false; // Reset so sendProductMessage can run
            }
          } else if (currentCount >= 3) {
            // If we've checked multiple times and still don't have messages, try sending once more
            console.log(
              "No messages found after multiple checks, resetting state for one final attempt"
            );
            initialMessageRef.current = false; // Reset so sendProductMessage will run once more
          }
        } catch (err) {
          console.error("Error in verification check:", err);
        }
      }, 2500); // Check after 2.5 seconds

      return () => clearTimeout(checkTimer);
    } else if (messages.length > 0) {
      // If we have messages, clear the verification counter
      localStorage.removeItem(verificationCountKey);
    }
  }, [
    productDetails,
    userID,
    receiver?.userID,
    messages.length,
    initialMessageRef.current,
    fetchMessages,
  ]);

  // Clean up the component by removing the CleanupButton and RequestDebouncer components
  // and simplify the UI by removing the reset button from message input
  return (
    <div className="message-area-chat">
      {receiver ? (
        <>
          <div className="message-area-header">
            <h3>Chatting with {receiver.firstName}</h3>
            <button className="close-chat-btn" onClick={onCloseChat}>
              ❌
            </button>
          </div>

          {/* Simple product header - only show if there's a product inquiry message about this product */}
          {productDetails &&
            productDetails.userID === receiver.userID &&
            (hasProductInquiryMessage() ||
              (isProductContext() && messages.length === 0)) && (
              <div className="product-conversation-header">
                {productDetails.image && (
                  <img
                    src={productDetails.image}
                    alt={productDetails.name}
                    className="product-header-image"
                  />
                )}
                <div className="product-header-info">
                  <span className="product-header-name">
                    {productDetails.name}
                  </span>
                  {productDetails.price && (
                    <span className="product-header-price">
                      ${productDetails.price}
                    </span>
                  )}
                </div>
              </div>
            )}
          <div className="message-area-messages">
            {isLoading && messages.length === 0 ? (
              <div className="message-loading">
                <div className="message-loading-spinner"></div>
                <p>Loading messages...</p>
              </div>
            ) : messages.length === 0 ? (
              <div className="no-messages">
                <p>No messages yet. Start the conversation!</p>
              </div>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`message-area-message ${
                    msg.sender_id === userID ? "sent" : "received"
                  }`}
                  data-temp={msg.is_temp === true ? "true" : "false"}
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
                    {/* Render message content with HTML support - but don't show product image if header is already shown */}
                    {msg.content.includes("<div") ||
                    msg.content.includes("<img") ? (
                      <div
                        className="message-content-html"
                        dangerouslySetInnerHTML={{
                          __html:
                            productDetails &&
                            hasProductInquiryMessage() &&
                            msg.content.includes(
                              `Hi, I'm interested in your ${productDetails.name}`
                            )
                              ? // Remove img tag but keep the rest of the message
                                msg.content
                                  .replace(
                                    /<div style="margin-top[^>]*>[\s\S]*?<\/div>/g,
                                    ""
                                  )
                                  .replace(/\n/g, "<br/>")
                              : // Keep original content for regular messages
                                msg.content.replace(/\n/g, "<br/>"),
                        }}
                      />
                    ) : (
                      <p>{msg.content}</p>
                    )}

                    {/* Only show product attachment if we're not showing the product header */}
                    {msg.product_id &&
                      productDetails &&
                      (productDetails.id === msg.product_id ||
                        productDetails.productID === msg.product_id) &&
                      !hasProductInquiryMessage() && (
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
              ))
            )}
            <div ref={messagesEndRef} />
          </div>
          <div className="message-area-message-input">
            {/* Show product info when sending initial message - only if we're just starting a conversation from a product page */}
            {productDetails &&
              productDetails.userID === receiver.userID &&
              messages.length === 0 &&
              isProductContext() &&
              !hasProductInquiryMessage() && (
                <div className="product-info-container">
                  <div className="product-info-header">
                    <h4>Sending message about:</h4>
                  </div>
                  <div className="product-info-content">
                    {productDetails.image && (
                      <img
                        src={productDetails.image}
                        alt={productDetails.name}
                        className="product-info-image"
                      />
                    )}
                    <div className="product-info-details">
                      <div className="product-info-name">
                        {productDetails.name}
                      </div>
                      <div className="product-info-price">
                        ${productDetails.price}
                      </div>
                    </div>
                  </div>
                </div>
              )}

            {replyingTo && (
              <div className="reply-indicator">
                <span>
                  Replying to: {replyingTo.content.substring(0, 30)}...
                </span>
                <button onClick={cancelReply}>✕</button>
              </div>
            )}

            <div
              className="message-input-wrapper"
              onClick={() => inputRef.current?.focus()}
              style={{ display: "flex", width: "100%" }}
            >
              <input
                type="text"
                placeholder={
                  productDetails &&
                  productDetails.userID === receiver.userID &&
                  messages.length === 0 &&
                  isProductContext() &&
                  !hasProductInquiryMessage()
                    ? `Send a message about ${productDetails.name}...`
                    : "Type your message..."
                }
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                ref={inputRef}
                autoFocus
                style={{
                  display: "block",
                  width: "100%",
                  position: "relative",
                  zIndex: 100,
                }}
              />
              <button
                onClick={sendMessage}
                disabled={!newMessage.trim()}
                className={
                  productDetails &&
                  productDetails.userID === receiver.userID &&
                  messages.length === 0 &&
                  isProductContext() &&
                  !hasProductInquiryMessage()
                    ? "product-message-button"
                    : ""
                }
              >
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
