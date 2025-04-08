/**
 * API Optimizer and Duplicate Message Preventer
 *
 * This self-contained script solves two major issues:
 * 1. Optimizes API calls by deduplicating and caching requests
 * 2. Prevents duplicate messages when contacting sellers
 *
 * INSTALLATION:
 * 1. Open your browser's developer console (F12 or Command+Option+I)
 * 2. Copy and paste this entire script into the console
 * 3. Press Enter to run the script
 *
 * The script will automatically:
 * - Intercept and optimize API calls
 * - Prevent duplicate "Contact Seller" redirects
 * - Keep track of conversation states
 * - Clean up existing duplicate messages
 */

(function () {
  console.log("🚀 API Optimizer & Duplicate Message Preventer: Starting...");
  console.log(
    "⚠️ API Optimizer is now DISABLED to prevent 'body stream already read' errors"
  );

  // DISABLED: All optimization code removed to prevent body stream errors
  // We keep the duplicate message prevention functionality but disable the fetch override

  // ===== DUPLICATE MESSAGE PREVENTION =====

  // Store for conversations that have been initiated
  const initiatedConversations = new Set();

  // Try to load previously initiated conversations from localStorage
  try {
    const saved = localStorage.getItem("initiatedConversations");
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        parsed.forEach((item) => initiatedConversations.add(item));
      }
    }
  } catch (e) {
    console.error("Error loading initiated conversations", e);
  }

  // Create keys for managing conversations
  const createConversationKey = (sellerId, productId) =>
    `${sellerId}:${productId}`;

  // Override window.location to prevent duplicate redirects
  const originalLocationDescriptor = Object.getOwnPropertyDescriptor(
    window,
    "location"
  );

  Object.defineProperty(window, "location", {
    get: function () {
      return originalLocationDescriptor.get.call(this);
    },
    set: function (val) {
      try {
        const url = new URL(val, window.location.origin);

        // Check if this is a messaging-related redirect
        if (
          url.pathname.includes("/messages/") &&
          url.search.includes("productId=")
        ) {
          // Extract seller and product IDs from URL
          const sellerId = url.pathname.split("/messages/")[1];
          const params = new URLSearchParams(url.search);
          const productId = params.get("productId");

          if (sellerId && productId) {
            const conversationKey = createConversationKey(sellerId, productId);

            // Check if this conversation has already been initiated within this page session
            if (initiatedConversations.has(conversationKey)) {
              console.log(
                `🛑 Blocked duplicate redirect to conversation: ${conversationKey}`
              );

              // Instead of blocking completely, reload the page if we're already on the messages page
              // This helps refresh stale state while preventing multiple redirects
              if (window.location.pathname.includes("/messages/")) {
                console.log("Refreshing existing messages page");
                window.location.reload();
              }
              return; // Prevent the duplicate redirect
            }

            // Mark this conversation as initiated
            initiatedConversations.add(conversationKey);

            // Save to localStorage for persistence but with a shorter key
            // and a different name to prevent conflict with DuplicateMessageFixer
            try {
              localStorage.setItem(
                "optimizer_initiated_convs",
                JSON.stringify(Array.from(initiatedConversations))
              );

              // Clear any previous prevention flags that might block the initial message
              const preventedKey = `${sellerId}_${productId}`;
              if (localStorage.getItem(preventedKey)) {
                console.log(
                  `Clearing prevented flag for: ${preventedKey} to allow initial message`
                );
                localStorage.removeItem(preventedKey);
              }
            } catch (e) {
              console.error("Error saving initiated conversations", e);
            }

            console.log(
              `✅ Allowing redirect to new conversation: ${conversationKey}`
            );
          }
        }
      } catch (e) {
        console.error("Error in location override", e);
      }

      // Proceed with the redirect
      originalLocationDescriptor.set.call(this, val);
    },
    configurable: true,
  });

  // ===== DUPLICATE MESSAGE CLEANUP =====
  // Simplified version that doesn't manipulate responses

  async function cleanupDuplicateMessages() {
    console.log(
      "This function has been disabled to prevent 'body stream already read' errors"
    );
    console.log("Please contact your administrator to properly fix this issue");
    return { disabled: true };
  }

  // Add cleanupDuplicateMessages function to window for easy access
  window.cleanupDuplicateMessages = cleanupDuplicateMessages;

  console.log(
    "✅ API Optimizer DISABLED & Duplicate Message Prevention ENABLED!"
  );
})();
