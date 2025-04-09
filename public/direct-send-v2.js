/**
 * DIRECT PRODUCT INQUIRY SENDER
 *
 * This script bypasses all React components and directly sends a product
 * inquiry through Supabase. Use this when other methods fail.
 *
 * HOW TO USE:
 * 1. Open your browser console (F12 or Command+Option+I)
 * 2. Copy and paste this entire script
 * 3. Press Enter to run it
 * 4. The script will automatically send inquiries for products in the URL
 */

(function () {
  console.log("🚀 Starting Direct Product Inquiry Sender...");

  let supabaseClient = null;
  let currentUserId = null;
  let sentMessages = new Set(); // Track sent messages to prevent duplicates
  let debugLog = [];

  // Create UI - DISABLED VERSION (NO UI ELEMENTS)
  function initializeUI() {
    console.log(
      "Direct Message Sender UI disabled - running in background mode only"
    );

    // DO NOT CREATE ANY UI ELEMENTS
    // Skip UI creation entirely and just initialize required functionality

    // First check if Supabase is already available directly
    if (window.supabase && typeof window.supabase.from === "function") {
      console.log("Supabase client already available in window");
      supabaseClient = window.supabase;
      initializeWithClient();
    } else {
      // Try to find it with our helper function
      findSupabaseClient().then((client) => {
        if (client) {
          supabaseClient = client;
          console.log("Supabase client found via search function ✓");
          initializeWithClient();
        } else {
          console.log("Error: Supabase client not found initially, will retry");

          // Set up a retry mechanism
          let retryCount = 0;
          const maxRetries = 5;
          const retryInterval = setInterval(() => {
            retryCount++;
            console.log(
              `Retry attempt ${retryCount} to find Supabase client...`
            );

            if (window.supabase && typeof window.supabase.from === "function") {
              supabaseClient = window.supabase;
              console.log("Supabase client found on retry ✓");
              clearInterval(retryInterval);
              initializeWithClient();
            } else if (retryCount >= maxRetries) {
              console.log(
                "Max retries reached, giving up on finding Supabase client"
              );
              clearInterval(retryInterval);
            }
          }, 1000);
        }
      });
    }
  }

  // Initialize with the Supabase client
  function initializeWithClient() {
    // Get current user
    getCurrentUserId().then((userId) => {
      if (userId) {
        currentUserId = userId;
        console.log(`User authenticated: ${userId}`);
      } else {
        console.log("Error: Not logged in");
      }
    });
  }

  // Helper function to safely get DOM elements without causing errors
  function safeGetElement(id) {
    try {
      const element = document.getElementById(id);
      return element; // Returns null if element doesn't exist
    } catch (e) {
      console.log(`Error accessing element #${id}: ${e.message}`);
      return null;
    }
  }

  // Helper function to safely add event listeners
  function safeAddEventListener(element, event, handler) {
    if (element && typeof element.addEventListener === "function") {
      element.addEventListener(event, handler);
      return true;
    }
    return false;
  }

  // Update status message - DISABLED VERSION
  function updateStatus(message, isError = false) {
    // Log to console instead of UI
    if (isError) {
      console.error(`[DirectSender] ${message}`);
    } else {
      console.log(`[DirectSender] ${message}`);
    }

    // Still add to debug log for internal tracking
    addToLog(message, isError ? "error" : "info");
  }

  // Add message to debug log - DISABLED VERSION
  function addToLog(message, type = "info") {
    const timestamp = new Date().toLocaleTimeString();
    debugLog.push({ message, type, timestamp });

    // Log to console instead of UI
    if (type === "error") {
      console.error(`[DirectSender] ${message}`);
    } else if (type === "success") {
      console.log(`[DirectSender] ${message}`);
    } else {
      console.log(`[DirectSender] ${message}`);
    }
  }

  // Create product inquiry message
  function createProductInquiryMessage(message, productDetails) {
    // If no product details provided, return the original message
    if (!productDetails) return message;

    // Extract product information
    const productId = productDetails.id || productDetails.productID;
    const name = productDetails.name || productDetails.title || "this product";
    const price = productDetails.price
      ? `$${productDetails.price}`
      : "listed price";
    const image =
      productDetails.image || productDetails.imageUrl || productDetails.img;

    // Create message with product information
    let formattedMessage = `Hi, I'm interested in your ${name} listed for ${price}. Is this still available?`;

    // Add image if available
    if (image) {
      formattedMessage += `\n\n<div style="margin-top:10px; margin-bottom:10px; max-width:250px;">
        <img src="${image}" alt="${name}" style="max-width:100%; border-radius:8px; border:1px solid #eee;" />
      </div>\n\nLooking forward to your response!`;
    }

    return formattedMessage;
  }

  // Handle send message button click
  async function handleSendMessage() {
    // This function has been disabled since UI is no longer available
    console.log("Manual message sending via UI is disabled");
    return;
  }

  // Send a message (core functionality without UI)
  async function sendMessage(
    receiverId,
    message,
    productId = null,
    productDetails = null
  ) {
    if (!supabaseClient) {
      return { error: { message: "Supabase client not found" } };
    }

    if (!currentUserId) {
      return { error: { message: "Not logged in" } };
    }

    try {
      // Try to determine the correct field names by examining the client
      let contentField = "content";
      let senderField = "sender_id";
      let receiverField = "receiver_id";
      let timestampField = "created_at";
      let productIdField = "product_id";
      let statusField = "status";
      let readField = "read";

      // Check if we have a message table definition by examining a test record
      try {
        const testQuery = await supabaseClient
          .from("messages")
          .select("*")
          .limit(1);

        if (!testQuery.error && testQuery.data && testQuery.data.length > 0) {
          const sampleMessage = testQuery.data[0];
          addToLog("Got sample message to determine field names", "info");

          // Check field names from sample message
          if ("message" in sampleMessage) contentField = "message";
          if ("content" in sampleMessage) contentField = "content";
          if ("text" in sampleMessage) contentField = "text";

          if ("sender_id" in sampleMessage) senderField = "sender_id";
          if ("senderId" in sampleMessage) senderField = "senderId";
          if ("from" in sampleMessage) senderField = "from";

          if ("receiver_id" in sampleMessage) receiverField = "receiver_id";
          if ("receiverId" in sampleMessage) receiverField = "receiverId";
          if ("to" in sampleMessage) receiverField = "to";

          if ("created_at" in sampleMessage) timestampField = "created_at";
          if ("timestamp" in sampleMessage) timestampField = "timestamp";
          if ("date" in sampleMessage) timestampField = "date";

          if ("product_id" in sampleMessage) productIdField = "product_id";
          if ("productId" in sampleMessage) productIdField = "productId";

          if ("status" in sampleMessage) statusField = "status";
          if ("read" in sampleMessage) readField = "read";

          addToLog(
            `Using field names: content=${contentField}, sender=${senderField}, receiver=${receiverField}`,
            "info"
          );
        }
      } catch (e) {
        addToLog(`Error detecting field names: ${e.message}`, "error");
        // Continue with defaults
      }

      // Create message data with detected field names
      const messageData = {
        [senderField]: currentUserId,
        [receiverField]: receiverId,
        [contentField]: message,
        [timestampField]: new Date().toISOString(),
        [readField]: false,
      };

      // Add status if the field exists
      messageData[statusField] = "active";

      // Add product_id if provided
      if (productId) {
        messageData[productIdField] = productId;
      }

      // Include product details as metadata if available and the field exists
      if (productDetails) {
        try {
          // Check if we can add product details
          if ("metadata" in messageData || "meta" in messageData) {
            const metaField = "metadata" in messageData ? "metadata" : "meta";
            messageData[metaField] = {
              product: {
                id: productId,
                name: productDetails.name || productDetails.title,
                price: productDetails.price,
                image: productDetails.image || productDetails.imageUrl,
              },
            };
          }
        } catch (e) {
          // Skip metadata if there's an error
        }
      }

      addToLog(`Sending message: ${JSON.stringify(messageData)}`, "info");

      // Insert into messages table
      const result = await supabaseClient
        .from("messages")
        .insert(messageData)
        .select();

      if (result.error) {
        addToLog(`Error from Supabase: ${result.error.message}`, "error");

        // Try alternative message structure
        if (
          result.error.message.includes("violates not-null constraint") ||
          result.error.message.includes("invalid input syntax")
        ) {
          addToLog("Trying alternative message format", "info");

          // Try a simpler format
          const alternativeMessage = {
            sender_id: currentUserId,
            receiver_id: receiverId,
            content: message,
            created_at: new Date().toISOString(),
            status: "active",
          };

          if (productId) {
            alternativeMessage.product_id = productId;
          }

          const retryResult = await supabaseClient
            .from("messages")
            .insert(alternativeMessage)
            .select();

          return retryResult;
        }
      }

      return result;
    } catch (err) {
      addToLog(`Exception sending message: ${err.message}`, "error");
      return { error: { message: err.message } };
    }
  }

  // Find Supabase client
  async function findSupabaseClient() {
    // Check common variable names
    const commonNames = [
      "supabaseClient",
      "supabase",
      "_supabase",
      "supabaseInstance",
    ];

    for (const name of commonNames) {
      if (window[name] && typeof window[name].from === "function") {
        addToLog(`Found Supabase client in window.${name}`, "success");
        return window[name];
      }
    }

    // Try to find the createClient function in the global scope
    addToLog("Checking for createClient function...", "info");
    let createClientFn = null;

    // Look for the createClient function in the global scope
    if (typeof createClient === "function") {
      createClientFn = createClient;
      addToLog("Found global createClient function", "success");
    } else if (typeof window.supabase?.createClient === "function") {
      // Check if supabase exists in window before accessing it
      createClientFn = window.supabase.createClient;
      addToLog("Found supabase.createClient function", "success");
    } else {
      // Search for it in other global objects
      for (const key in window) {
        try {
          if (window[key] && typeof window[key].createClient === "function") {
            createClientFn = window[key].createClient;
            addToLog(`Found createClient in window.${key}`, "success");
            break;
          }
        } catch (e) {
          // Skip any properties that can't be accessed
          continue;
        }
      }
    }

    // If we found createClient, try to create a new client
    if (createClientFn) {
      try {
        // Look for URL and key in meta tags or localStorage
        const { url, key } = await findSupabaseCredentials();

        if (url && key) {
          addToLog(`Creating new Supabase client with URL: ${url}`, "info");
          const newClient = createClientFn(url, key);

          if (newClient && typeof newClient.from === "function") {
            addToLog("Successfully created new Supabase client", "success");

            // Make it globally available
            window.supabase = newClient;
            return newClient;
          }
        }
      } catch (err) {
        addToLog(`Error creating client: ${err.message}`, "error");
      }
    }

    // No dummy client fallback - just return null if we can't find a real client
    addToLog("Could not find or create a Supabase client", "error");
    return null;
  }

  // Find Supabase credentials in various locations
  async function findSupabaseCredentials() {
    let url = null;
    let key = null;

    // Safely look in meta tags
    try {
      const urlMeta = document.querySelector('meta[name="supabase-url"]');
      const keyMeta = document.querySelector('meta[name="supabase-key"]');

      if (urlMeta && urlMeta.content && keyMeta && keyMeta.content) {
        url = urlMeta.content;
        key = keyMeta.content;
        addToLog("Found Supabase credentials in meta tags", "success");
        return { url, key };
      }
    } catch (e) {
      addToLog(`Error checking meta tags: ${e.message}`, "error");
      // Continue to next method
    }

    // Look in localStorage
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const lsKey = localStorage.key(i);
        if (
          lsKey &&
          (lsKey.includes("supabase") || lsKey.includes("REACT_APP"))
        ) {
          const value = localStorage.getItem(lsKey);

          try {
            // Try to parse JSON
            const parsed = JSON.parse(value);

            // Check various properties that might contain the URL and key
            if (!url) {
              url =
                parsed.url ||
                parsed.supabaseUrl ||
                parsed.SUPABASE_URL ||
                parsed.REACT_APP_SUPABASE_URL;
            }

            if (!key) {
              key =
                parsed.key ||
                parsed.anonKey ||
                parsed.supabaseKey ||
                parsed.SUPABASE_KEY ||
                parsed.REACT_APP_SUPABASE_KEY;
            }
          } catch (e) {
            // Not JSON, try regex
            if (!url && value && value.includes("supabase.co")) {
              const match = value.match(/https:\/\/[a-z0-9-]+\.supabase\.co/);
              if (match) url = match[0];
            }

            if (!key && value && value.includes("eyJ")) {
              const match = value.match(
                /eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/
              );
              if (match) key = match[0];
            }
          }

          if (url && key) {
            addToLog(
              `Found credentials in localStorage key: ${lsKey}`,
              "success"
            );
            return { url, key };
          }
        }
      }
    } catch (e) {
      addToLog(`Error searching localStorage: ${e.message}`, "error");
    }

    return { url, key };
  }

  // Get current user ID
  async function getCurrentUserId() {
    if (!supabaseClient) return null;

    try {
      // Try multiple methods to get user ID

      // Method 1: Modern Supabase v2 getSession
      if (
        supabaseClient.auth &&
        typeof supabaseClient.auth.getSession === "function"
      ) {
        const { data, error } = await supabaseClient.auth.getSession();
        if (!error && data?.session?.user?.id) {
          addToLog(
            `Found user ID via auth.getSession: ${data.session.user.id}`,
            "success"
          );
          return data.session.user.id;
        }
      }

      // Method 2: Older Supabase v1 user
      if (
        supabaseClient.auth &&
        typeof supabaseClient.auth.user === "function"
      ) {
        const { data: user } = await supabaseClient.auth.user();
        if (user && user.id) {
          addToLog(`Found user ID via auth.user: ${user.id}`, "success");
          return user.id;
        }
      }

      // Method 3: Direct localStorage approach
      addToLog("Trying localStorage for user ID", "info");

      // Try direct localStorage access
      const userId = localStorage.getItem("userId");
      if (userId) {
        addToLog(`Found user ID in localStorage: ${userId}`, "success");
        return userId;
      }

      // Try Supabase token
      const supabaseAuth = localStorage.getItem("supabase.auth.token");
      if (supabaseAuth) {
        try {
          const authData = JSON.parse(supabaseAuth);
          if (authData.user && authData.user.id) {
            addToLog(
              `Found user ID in supabase.auth.token: ${authData.user.id}`,
              "success"
            );
            return authData.user.id;
          }
        } catch (e) {
          addToLog(`Error parsing supabase.auth.token: ${e.message}`, "error");
        }
      }

      // Method 4: Search all localStorage for any user ID
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (
          key.includes("user") ||
          key.includes("auth") ||
          key.includes("supabase")
        ) {
          try {
            const value = localStorage.getItem(key);
            const parsed = JSON.parse(value);

            // Look for common patterns of user ID storage
            const possibleIds = [
              parsed?.user?.id,
              parsed?.id,
              parsed?.data?.user?.id,
              parsed?.session?.user?.id,
              parsed?.currentUser?.id,
            ];

            for (const possibleId of possibleIds) {
              if (
                possibleId &&
                typeof possibleId === "string" &&
                possibleId.length > 10
              ) {
                addToLog(
                  `Found potential user ID in ${key}: ${possibleId}`,
                  "success"
                );
                return possibleId;
              }
            }
          } catch (e) {
            // Not JSON or other error, continue
          }
        }
      }

      addToLog("Failed to get user ID by any method", "error");
      return null;
    } catch (err) {
      addToLog(`Exception getting user: ${err.message}`, "error");
      return null;
    }
  }

  // Initialize when DOM is ready
  if (
    document.readyState === "complete" ||
    document.readyState === "interactive"
  ) {
    setTimeout(initializeUI, 0);
  } else {
    document.addEventListener("DOMContentLoaded", initializeUI);
  }

  // Make sendMessage globally available through a convenient function
  window.sendProductInquiry = function (
    productDetails,
    receiverId,
    customMessage
  ) {
    if (!productDetails) {
      console.error("Product details are required");
      return;
    }

    if (!receiverId) {
      console.error("Receiver ID is required");
      return;
    }

    // Format the message
    const message =
      customMessage || createProductInquiryMessage("", productDetails);
    const productId = productDetails.id || productDetails.productID;

    // Send the message
    return sendMessage(receiverId, message, productId, productDetails);
  };

  // Also export the raw sendMessage function
  window.direct_send = {
    sendMessage: sendMessage,
    supabaseClient: () => supabaseClient,
    getCurrentUserId: getCurrentUserId,
  };

  console.log("✅ Direct Product Inquiry Sender installed!");
  console.log(
    "You can also use window.sendProductInquiry(productDetails, receiverId) to send messages manually."
  );
})();
