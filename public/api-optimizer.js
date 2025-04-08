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

  // ===== REQUEST OPTIMIZATION =====

  // Storage for active and completed requests
  const activeRequests = new Map();
  const completedRequests = new Map();
  const CACHE_EXPIRATION_MS = 5000; // 5 seconds cache

  // Store the original fetch method
  const originalFetch = window.fetch;

  // Override fetch to optimize requests
  window.fetch = function optimizedFetch(resource, options) {
    // Generate unique request key
    const requestKey = generateRequestKey(resource, options);
    const endpointName = extractEndpointName(resource);

    // Skip optimization for specific non-supabase endpoints or non-GET requests
    if (
      !resource.toString().includes("supabase") ||
      (options && options.method && options.method !== "GET")
    ) {
      // For POST requests to Supabase, add extra debugging
      if (
        resource.toString().includes("supabase") &&
        options &&
        options.method === "POST"
      ) {
        // Log information about the POST request for debugging
        console.log(`📤 Supabase POST request to: ${endpointName}`);

        // If this is a messages POST that's failing, add extra handling
        if (endpointName === "messages" && options.body) {
          try {
            // Try to parse the body
            let bodyData = JSON.parse(options.body);

            // Ensure required fields are present
            if (Array.isArray(bodyData) && bodyData.length > 0) {
              const requiredFields = ["sender_id", "receiver_id", "content"];
              const missingFields = requiredFields.filter(
                (field) => !bodyData[0][field]
              );

              if (missingFields.length > 0) {
                console.warn(
                  `⚠️ Missing required fields in message POST: ${missingFields.join(
                    ", "
                  )}`
                );
              }

              // Check if it's marked as deleted
              if (bodyData[0].status === "deleted") {
                console.warn(
                  "⚠️ Attempting to send a message with 'deleted' status"
                );
              }
            }
          } catch (e) {
            console.error("Error analyzing message POST request:", e);
          }
        }
      }
      return originalFetch(resource, options);
    }

    // Check if there's an active request for the same endpoint
    if (activeRequests.has(requestKey)) {
      console.log(`🔄 Reusing active request for: ${endpointName}`);
      return activeRequests.get(requestKey);
    }

    // Check if there's a cached response that's still valid
    if (completedRequests.has(requestKey)) {
      const cachedData = completedRequests.get(requestKey);
      const isCacheValid =
        Date.now() - cachedData.timestamp < CACHE_EXPIRATION_MS;

      if (isCacheValid) {
        console.log(`📦 Using cached response for: ${endpointName}`);
        // Return a new Response object to prevent "body stream already read" errors
        return Promise.resolve(
          new Response(JSON.stringify(cachedData.data), {
            headers: { "Content-Type": "application/json" },
            status: 200,
            statusText: "OK",
          })
        );
      } else {
        // Remove expired cache
        completedRequests.delete(requestKey);
      }
    }

    // Execute the request and store it
    const fetchPromise = originalFetch(resource, options)
      .then(async (response) => {
        try {
          // Only clone and cache for successful responses
          if (response.ok) {
            // Clone the response before trying to read it
            const cloneForCache = response.clone();

            // Read the JSON data for caching
            const responseData = await cloneForCache.json();

            // Store the data not the response object itself
            completedRequests.set(requestKey, {
              data: responseData,
              timestamp: Date.now(),
            });

            console.log(`💾 Cached response data for: ${endpointName}`);
          }
        } catch (e) {
          console.log(
            `⚠️ Could not cache response for ${endpointName}: ${e.message}`
          );
        }

        // Remove from active requests
        activeRequests.delete(requestKey);

        // Always return the original response
        return response;
      })
      .catch((error) => {
        // Remove from active requests on error
        activeRequests.delete(requestKey);
        console.error(`❌ Error in request for ${endpointName}:`, error);
        throw error;
      });

    // Store the promise for deduplication
    activeRequests.set(requestKey, fetchPromise);
    console.log(`📤 Optimized request: ${endpointName}`);

    return fetchPromise;
  };

  // Clean up expired cache periodically
  setInterval(() => {
    const now = Date.now();
    for (const [key, cachedData] of completedRequests.entries()) {
      if (now - cachedData.timestamp > CACHE_EXPIRATION_MS) {
        completedRequests.delete(key);
      }
    }
  }, 30000); // Check every 30 seconds

  // Helper function to generate a unique key for a request
  function generateRequestKey(resource, options) {
    const resourceStr = resource.toString();
    const optionsStr = options ? JSON.stringify(options) : "";
    return `${resourceStr}:${optionsStr}`;
  }

  // Helper function to extract endpoint name for logging
  function extractEndpointName(resource) {
    const url = resource.toString();
    const parts = url.split("/");
    return parts[parts.length - 1].split("?")[0];
  }

  // ===== DUPLICATE MESSAGE PREVENTION =====

  // Store for conversations that have been initiated
  const initiatedConversations = new Set();

  // Direct message sending function that bypasses prevention mechanisms
  window.forceSendMessage = async (senderId, receiverId, productDetails) => {
    try {
      console.log("🔥 Force send message function called");

      if (!window.supabase) {
        console.error("Supabase client not found");
        return { error: "Supabase client not found" };
      }

      if (!senderId || !receiverId) {
        console.error("Missing sender or receiver ID");
        return { error: "Missing sender or receiver ID" };
      }

      if (
        !productDetails ||
        (!productDetails.name && !productDetails.productName)
      ) {
        console.error("Missing product details");
        return { error: "Missing product details" };
      }

      // Format the product details
      const productName =
        productDetails.name || productDetails.productName || "this product";
      const productPrice = productDetails.price || "";
      const productImage = productDetails.image || "";

      // Create the message content with image if available
      let messageContent;

      if (productImage) {
        messageContent = `Hi, I'm interested in your ${productName}${
          productPrice ? ` listed for $${productPrice}` : ""
        }. Is this still available?\n\n<div style="margin-top:10px; margin-bottom:10px; max-width:250px;"><img src="${productImage}" alt="${productName}" style="max-width:100%; border-radius:8px; border:1px solid #eee;" /></div>\n\nLooking forward to your response!`;
      } else {
        messageContent = `Hi, I'm interested in your ${productName}${
          productPrice ? ` listed for $${productPrice}` : ""
        }. Is this still available?`;
      }

      // Create the message object
      const messageData = {
        sender_id: senderId,
        receiver_id: receiverId,
        content: messageContent,
        status: "active",
        created_at: new Date().toISOString(),
      };

      console.log("Sending message:", messageData);

      // Send directly via Supabase
      const { data, error } = await window.supabase
        .from("messages")
        .insert([messageData]);

      if (error) {
        console.error("Error sending message:", error);
        return { error };
      }

      console.log("Message sent successfully:", data);
      return { data };
    } catch (e) {
      console.error("Exception in forceSendMessage:", e);
      return { error: e.message };
    }
  };

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

  // Restore initiated conversations from localStorage (but use our own key)
  try {
    const saved = localStorage.getItem("optimizer_initiated_convs");
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        parsed.forEach((item) => initiatedConversations.add(item));
      }
    }
  } catch (e) {
    console.error("Error restoring initiated conversations", e);
  }

  // ===== DUPLICATE MESSAGE CLEANUP =====

  async function cleanupDuplicateMessages() {
    try {
      console.log("🧹 Starting cleanup of duplicate messages...");

      // Get current user
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        console.log("❌ No authenticated user found. Please login first.");
        return;
      }

      const currentUserId = user.id;
      console.log(`👤 Found current user: ${currentUserId}`);

      // Get all messages sent by the current user
      const { data: messages, error } = await supabase
        .from("messages")
        .select("*")
        .eq("sender_id", currentUserId)
        .order("created_at", { ascending: true });

      if (error) {
        console.error("Error fetching messages:", error);
        return;
      }

      console.log(`📨 Found ${messages.length} messages sent by you`);

      // Group messages by conversation and content
      const messageGroups = {};

      messages.forEach((message) => {
        // Create a key that groups by receiver, product, and message content
        const groupKey = `${message.receiver_id}:${
          message.product_id || "no-product"
        }:${message.content}`;

        if (!messageGroups[groupKey]) {
          messageGroups[groupKey] = [];
        }

        messageGroups[groupKey].push(message);
      });

      // Find and delete duplicates (keeping the oldest message in each group)
      let deletedCount = 0;
      let processedGroups = 0;

      for (const groupKey in messageGroups) {
        const group = messageGroups[groupKey];
        processedGroups++;

        // If there are duplicates
        if (group.length > 1) {
          // Sort by created_at (ascending)
          group.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

          // Keep the oldest message, delete the rest
          const toDelete = group.slice(1);

          for (const message of toDelete) {
            const { error } = await supabase
              .from("messages")
              .delete()
              .eq("id", message.id);

            if (error) {
              console.error(`Error deleting message ${message.id}:`, error);
            } else {
              deletedCount++;
            }
          }
        }

        // Progress update for larger sets
        if (processedGroups % 10 === 0) {
          console.log(
            `Progress: ${processedGroups}/${
              Object.keys(messageGroups).length
            } groups processed`
          );
        }
      }

      console.log(
        `✅ Cleanup complete! Deleted ${deletedCount} duplicate messages.`
      );
      return { processed: processedGroups, deleted: deletedCount };
    } catch (error) {
      console.error("Cleanup failed:", error);
      return { error: error.message };
    }
  }

  // Add cleanupDuplicateMessages function to window for easy access
  window.cleanupDuplicateMessages = cleanupDuplicateMessages;

  console.log(
    "✅ API Optimizer & Duplicate Message Preventer: Successfully installed!"
  );
  console.log(
    "ℹ️ To clean up existing duplicate messages, run: window.cleanupDuplicateMessages()"
  );
})();
