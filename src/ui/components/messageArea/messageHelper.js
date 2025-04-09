/**
 * Message helper functions to prevent duplicate messages
 */

// In-memory cache to prevent multiple messages in the same session
const sentMessages = new Set();

// In-memory cache for deleted messages
const deletedMessageIds = new Set();

/**
 * Clear all prevention flags for a specific product
 * @param {string} senderId - ID of the sender
 * @param {string} receiverId - ID of the receiver
 * @param {object} product - Product details
 * @returns {boolean} - True if clearing was successful
 */
export const clearPreventionFlags = (senderId, receiverId, product) => {
  if (!senderId || !receiverId || !product) return false;

  try {
    // Handle different product ID formats
    const productId =
      product.productID ||
      product.id ||
      (typeof product === "string" ? product : null);
    if (!productId) {
      console.error("No product ID found in product object:", product);
      return false;
    }

    // Create the key
    const key = `${senderId}_${receiverId}_${productId}`;

    console.log(`🧹 Starting cleanup for ${key}...`);

    // Clear from localStorage - also try with different formats
    localStorage.removeItem(key);
    localStorage.removeItem(`${receiverId}_${productId}`); // API optimizer format
    localStorage.removeItem(`${senderId}_${receiverId}_${productId}`);
    localStorage.removeItem(
      `product_msg_${senderId}_${receiverId}_${productId}`
    );

    // Also try to find and remove any other similar keys containing both IDs
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const currentKey = localStorage.key(i);
      if (
        currentKey &&
        ((currentKey.includes(senderId) && currentKey.includes(receiverId)) ||
          currentKey.includes(productId))
      ) {
        keysToRemove.push(currentKey);
      }
    }

    keysToRemove.forEach((k) => {
      console.log(`Removing related localStorage key: ${k}`);
      localStorage.removeItem(k);
    });

    // Clear from memory cache
    sentMessages.delete(key);

    // Clear in-memory ref that tracks message sending
    if (window.initialMessageRef) window.initialMessageRef = false;

    // Clear from window.__sentProductMessages
    if (window.__sentProductMessages) {
      const productMsgKey = `product_msg_${senderId}_${receiverId}_${productId}`;
      window.__sentProductMessages.delete(productMsgKey);
      // Also try other formats
      window.__sentProductMessages.delete(key);
      window.__sentProductMessages.delete(`${receiverId}:${productId}`);
    }

    // Clear from window.__processedMessages
    if (window.__processedMessages) {
      // Try different key formats that might be used
      window.__processedMessages.delete(
        `${senderId}_${receiverId}_Hi, I'm interested in your`
      );
      window.__processedMessages.delete(
        `${senderId}_${receiverId}_${productId}`
      );

      // Also search and clear any keys containing both IDs
      const processedKeysToDelete = [];
      window.__processedMessages.forEach((key) => {
        if (key.includes(senderId) && key.includes(receiverId)) {
          processedKeysToDelete.push(key);
        }
      });

      processedKeysToDelete.forEach((k) => {
        console.log(`Removing processed message key: ${k}`);
        window.__processedMessages.delete(k);
      });
    }

    // Clear from window.__fetchingMessages
    if (window.__fetchingMessages) {
      const fetchKey = `messages_${senderId}_${receiverId}`;
      if (window.__fetchingMessages[fetchKey]) {
        delete window.__fetchingMessages[fetchKey];
      }
    }

    // Clear from window.__initialMessageFetch
    if (window.__initialMessageFetch) {
      const initialFetchKey = `initialFetch_${senderId}_${receiverId}`;
      if (window.__initialMessageFetch[initialFetchKey]) {
        delete window.__initialMessageFetch[initialFetchKey];
      }
    }

    // Also clear the API optimizer flags
    if (localStorage.getItem("optimizer_initiated_convs")) {
      try {
        localStorage.removeItem("optimizer_initiated_convs");
      } catch (e) {
        console.error("Error clearing optimizer flags:", e);
      }
    }

    // Also clear session storage flags
    const sessionKeysToClear = [`cleanup_done_${senderId}_${productId}`];
    sessionKeysToClear.forEach((k) => {
      if (sessionStorage.getItem(k)) {
        sessionStorage.removeItem(k);
        console.log(`Cleared session storage key: ${k}`);
      }
    });

    // Also clear prevention flags in api-optimizer.js
    if (window.initiatedConversations) {
      const conversationKey = `${receiverId}:${productId}`;
      window.initiatedConversations.delete(conversationKey);
    }

    console.log(`✅ Cleared prevention flags for: ${key} and related keys`);
    return true;
  } catch (err) {
    console.error("Error clearing prevention flags:", err);
    return false;
  }
};

/**
 * Resets all message prevention mechanisms
 * This allows previously prevented duplicate messages to be sent again
 *
 * Can be used in two ways:
 * 1. With no parameters: Resets ALL prevention state (global reset)
 * 2. With specific parameters: Resets prevention for a specific product conversation
 *
 * @param {string} senderId - The sender ID (optional for targeted reset)
 * @param {string} receiverId - The receiver ID (optional for targeted reset)
 * @param {Object} productDetails - Product details (optional for targeted reset)
 */
export const resetAllMessagePrevention = (
  senderId,
  receiverId,
  productDetails
) => {
  console.log("Resetting message prevention state");

  // If all three parameters are provided, do a targeted reset
  if (senderId && receiverId && productDetails) {
    console.log(
      `Targeted reset for conversation: ${senderId} -> ${receiverId} about product ${
        productDetails.id || productDetails.productID
      }`
    );

    // Clear any prevention flags in localStorage
    const storageKey = getPreventionKey(senderId, receiverId, productDetails);
    localStorage.removeItem(storageKey);

    // Also clear any in-memory prevention flags
    if (window.__sentProductMessages) {
      const productMsgKey = `product_msg_${senderId}_${receiverId}_${
        productDetails.id || productDetails.productID
      }`;
      window.__sentProductMessages.delete(productMsgKey);
    }

    // Also reset the product-specific session if it exists
    const productSessionId = `${
      productDetails.id || productDetails.productID
    }_${receiverId}`;
    if (
      window.__sessionsByProduct &&
      window.__sessionsByProduct[productSessionId]
    ) {
      window.__sessionsByProduct[productSessionId] = {
        initialMessageSent: false,
        processedMessageIds: new Set(),
        fetchingMessages: false,
        activeChannel: null,
        messagesLoaded: false,
      };
    }

    return;
  }

  // GLOBAL RESET - only if no parameters were provided
  // This resets ALL prevention mechanisms

  // Clear all message prevention flags from localStorage
  // Loop through all localStorage items and remove those that look like prevention flags
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith("msg_prevent_")) {
      localStorage.removeItem(key);
    }
  }

  // Clear global window variables used for tracking
  if (window.__sentProductMessages) {
    window.__sentProductMessages.clear();
  }

  if (window.__processedMessageIds) {
    window.__processedMessageIds.clear();
  }

  if (window.__sessionsByProduct) {
    window.__sessionsByProduct = {};
  }

  console.log("All message prevention state has been reset");
};

/**
 * Check if this exact product message has been sent already
 * @param {string} senderId - ID of the sender
 * @param {string} receiverId - ID of the receiver
 * @param {object} product - Product details
 * @returns {boolean} - True if this message should be prevented
 */
export const shouldPreventMessage = (senderId, receiverId, product) => {
  if (!senderId || !receiverId || !product) return true;

  // Handle different product ID formats (some use id, some use productID)
  const productId =
    product.productID ||
    product.id ||
    (typeof product === "string" ? product : null);
  if (!productId) {
    console.error("No product ID found in product object:", product);
    return true; // Prevent if we can't identify the product
  }

  // Create a unique key for this conversation using the helper function
  const key = getPreventionKey(senderId, receiverId, product);

  // Check localStorage first (persists across reloads)
  if (localStorage.getItem(key)) {
    console.log("Preventing duplicate message (localStorage):", key);
    return true;
  }

  // Check in-memory cache (prevents duplicates within the same session)
  if (sentMessages.has(key)) {
    console.log("Preventing duplicate message (memory):", key);
    return true;
  }

  // If we're here, this is a new message that should be sent
  console.log("New message allowed:", key);
  return false;
};

/**
 * Mark a message as sent to prevent duplicates
 * @param {string} senderId - ID of the sender
 * @param {string} receiverId - ID of the receiver
 * @param {object} product - Product details
 */
export const markMessageSent = (senderId, receiverId, product) => {
  if (!senderId || !receiverId || !product) return;

  // Handle different product ID formats (some use id, some use productID)
  const productId =
    product.productID ||
    product.id ||
    (typeof product === "string" ? product : null);
  if (!productId) {
    console.error("No product ID found in product object:", product);
    return; // Skip if we can't identify the product
  }

  // Create a unique key for this conversation using the helper function
  const key = getPreventionKey(senderId, receiverId, product);

  // Store in localStorage (persists across reloads)
  localStorage.setItem(key, "sent");

  // Store in memory (prevents duplicates within the same session)
  sentMessages.add(key);

  console.log("Marked message as sent:", key);
};

/**
 * Track a deleted message to ensure it doesn't reappear
 * @param {string} messageId - The ID of the message that was deleted
 */
export const trackDeletedMessage = (messageId) => {
  if (!messageId) return;

  try {
    // Add to in-memory set
    deletedMessageIds.add(messageId);

    // Store in localStorage for persistence across page reloads
    const storedDeletedMessages = localStorage.getItem("deletedMessages");
    let deletedMessages = [];

    if (storedDeletedMessages) {
      deletedMessages = JSON.parse(storedDeletedMessages);
    }

    if (!deletedMessages.includes(messageId)) {
      deletedMessages.push(messageId);
      localStorage.setItem("deletedMessages", JSON.stringify(deletedMessages));
    }

    // Also update window-level tracking for cross-component access
    if (!window.__deletedMessageIds) window.__deletedMessageIds = new Set();
    window.__deletedMessageIds.add(messageId);

    console.log(`Message ${messageId} marked as permanently deleted`);
  } catch (err) {
    console.error("Error tracking deleted message:", err);
  }
};

/**
 * Check if a message has been deleted
 * @param {string} messageId - The ID of the message to check
 * @returns {boolean} - True if the message has been deleted
 */
export const isMessageDeleted = (messageId) => {
  if (!messageId) return false;

  try {
    // Check in-memory cache first
    if (deletedMessageIds.has(messageId)) return true;

    // Then check window-level tracking
    if (window.__deletedMessageIds && window.__deletedMessageIds.has(messageId))
      return true;

    // Finally check localStorage
    const storedDeletedMessages = localStorage.getItem("deletedMessages");
    if (storedDeletedMessages) {
      const deletedMessages = JSON.parse(storedDeletedMessages);
      return deletedMessages.includes(messageId);
    }
  } catch (err) {
    console.error("Error checking if message is deleted:", err);
  }

  return false;
};

/**
 * Get all deleted message IDs from localStorage and memory
 * @returns {Set<string>} - A Set containing all deleted message IDs
 */
export const getDeletedMessageIds = () => {
  const combinedSet = new Set(deletedMessageIds);

  // Add window-level tracking
  if (window.__deletedMessageIds) {
    for (const id of window.__deletedMessageIds) {
      combinedSet.add(id);
    }
  }

  // Add from localStorage
  try {
    const storedDeletedMessages = localStorage.getItem("deletedMessages");
    if (storedDeletedMessages) {
      const deletedMessages = JSON.parse(storedDeletedMessages);
      for (const id of deletedMessages) {
        combinedSet.add(id);
      }
    }
  } catch (err) {
    console.error("Error getting deleted messages from localStorage:", err);
  }

  return combinedSet;
};

/**
 * Creates a product inquiry message with proper formatting
 * @param {Object} productDetails - The product being inquired about
 * @returns {string} - Formatted message with product details
 */
export const createProductInquiryMessage = (productDetails) => {
  if (!productDetails) return "Hi, I'm interested in your product";

  // Get product information
  const productName = productDetails.name || "product";
  const productPrice = productDetails.price
    ? `$${productDetails.price}`
    : "listed price";
  const productImage = productDetails.image;

  // Basic message text with price
  const messageText = `Hi, I'm interested in your ${productName} listed for ${productPrice}. Is it still available?`;

  // If there's no image, just return the text
  if (!productImage) {
    return messageText;
  }

  // For messages that will go through dangerouslySetInnerHTML,
  // create a properly formatted HTML message including the product image
  const htmlMessage = `
    ${messageText}
    <div style="margin-top: 10px; margin-bottom: 10px;">
      <img src="${productImage}" alt="${productName}" style="max-width: 200px; border-radius: 6px; border: 1px solid #eee;" />
    </div>
    <div>Looking forward to your response!</div>
  `;

  return htmlMessage;
};

/**
 * Helper function to get a unique key for a message combination
 * @param {string} senderId - The ID of the message sender
 * @param {string} receiverId - The ID of the message receiver
 * @param {Object} product - Details about the product (optional)
 * @returns {string} - A unique key for this message combination
 */
export const getPreventionKey = (senderId, receiverId, product) => {
  if (!product) return `${senderId}_${receiverId}`;

  const productId =
    product.productID ||
    product.id ||
    (typeof product === "string" ? product : null);
  if (!productId) return `${senderId}_${receiverId}`;

  return `${senderId}_${receiverId}_${productId}`;
};
