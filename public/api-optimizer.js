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

  // REMOVED: Previous unsafe window.location override that caused TypeError
  // We now use the event-based approach below instead

  // SAFER APPROACH: Use click event listeners instead of redefining window.location
  document.addEventListener("click", function (e) {
    // Find if the click is on a link or inside a link
    let target = e.target;
    while (target && target.tagName !== "A") {
      if (target === document.body) return; // Not a link click
      target = target.parentElement;
    }

    if (!target || !target.href) return; // Not a link or no href

    try {
      const url = new URL(target.href);

      // Check if this is a messaging-related link
      if (
        url.pathname.includes("/messaging/") ||
        url.pathname.includes("/messages/")
      ) {
        // Extract seller and product IDs from URL
        const pathParts = url.pathname.split("/");
        const sellerId = pathParts[pathParts.length - 1]; // Last part of the path
        const params = new URLSearchParams(url.search);
        const productId = params.get("productId");

        if (sellerId && productId) {
          const conversationKey = createConversationKey(sellerId, productId);

          // Check if this conversation has already been initiated
          if (initiatedConversations.has(conversationKey)) {
            console.log(
              `🛑 Preventing duplicate navigation to: ${conversationKey}`
            );
            e.preventDefault();

            // Instead of blocking completely, reload if we're already on a messages page
            if (
              window.location.pathname.includes("/messages/") ||
              window.location.pathname.includes("/messaging/")
            ) {
              console.log("Refreshing existing messages page");
              window.location.reload();
            }
            return;
          }

          // Mark this conversation as initiated
          initiatedConversations.add(conversationKey);

          // Save to localStorage
          try {
            localStorage.setItem(
              "optimizer_initiated_convs",
              JSON.stringify(Array.from(initiatedConversations))
            );

            // Clear any previous prevention flags
            const preventedKey = `${sellerId}_${productId}`;
            if (localStorage.getItem(preventedKey)) {
              localStorage.removeItem(preventedKey);
            }
          } catch (e) {
            console.error("Error saving initiated conversations", e);
          }

          console.log(
            `✅ Allowing navigation to conversation: ${conversationKey}`
          );
        }
      }
    } catch (e) {
      console.error("Error in click handler", e);
    }
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
