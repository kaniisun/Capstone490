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
  console.log(
    "🚀 Direct Product Inquiry Sender is disabled. To enable it, edit public/direct-send.js"
  );

  // Return early - prevents UI from being created
  return;

  // Original code below is preserved but won't execute

  let supabaseClient = null;
  let currentUserId = null;
  let sentMessages = new Set(); // Track sent messages to prevent duplicates
  let debugLog = [];

  // Create UI
  function initializeUI() {
    // Create container
    const container = document.createElement("div");
    container.id = "direct-message-sender";
    container.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      width: 300px;
      background: white;
      border: 1px solid #ccc;
      border-radius: 8px;
      padding: 15px;
      box-shadow: 0 0 10px rgba(0,0,0,0.2);
      z-index: 10000;
      font-family: Arial, sans-serif;
      max-height: 80vh;
      display: flex;
      flex-direction: column;
    `;

    // Create header
    const header = document.createElement("div");
    header.innerHTML =
      '<h3 style="margin: 0 0 10px 0; color: #333;">Direct Message Sender</h3>';
    container.appendChild(header);

    // Create status display
    const status = document.createElement("div");
    status.id = "direct-sender-status";
    status.style.cssText = "margin-bottom: 10px; font-size: 12px; color: #666;";
    container.appendChild(status);

    // User ID display
    const userIdDisplay = document.createElement("div");
    userIdDisplay.id = "user-id-display";
    userIdDisplay.style.cssText =
      "margin-bottom: 10px; padding: 5px; background: #f5f5f5; border-radius: 4px; font-size: 11px; word-break: break-all;";
    userIdDisplay.innerHTML =
      '<strong>User ID:</strong> <span id="current-user-id">Detecting...</span>';
    container.appendChild(userIdDisplay);

    // Create input fields
    const fields = [
      { id: "receiver-id", label: "Receiver ID" },
      {
        id: "message-text",
        label:
          "Message Text (Optional - product info will be added automatically)",
      },
      { id: "product-id", label: "Product ID (required for product info)" },
    ];

    fields.forEach((field) => {
      const wrapper = document.createElement("div");
      wrapper.style.cssText = "margin-bottom: 10px;";

      const label = document.createElement("label");
      label.style.cssText =
        "display: block; margin-bottom: 5px; font-size: 12px;";
      label.innerText = field.label;

      const input = document.createElement("input");
      input.id = field.id;
      input.style.cssText =
        "width: 100%; padding: 5px; box-sizing: border-box;";

      wrapper.appendChild(label);
      wrapper.appendChild(input);
      container.appendChild(wrapper);
    });

    // Add product image URL field
    const imageWrapper = document.createElement("div");
    imageWrapper.style.cssText = "margin-bottom: 10px;";

    const imageLabel = document.createElement("label");
    imageLabel.style.cssText =
      "display: block; margin-bottom: 5px; font-size: 12px;";
    imageLabel.innerText = "Product Image URL (Optional)";

    const imageInput = document.createElement("input");
    imageInput.id = "product-image";
    imageInput.style.cssText =
      "width: 100%; padding: 5px; box-sizing: border-box;";
    imageInput.placeholder = "https://example.com/image.jpg";

    // Create image preview
    const imagePreview = document.createElement("div");
    imagePreview.id = "image-preview";
    imagePreview.style.cssText =
      "margin-top: 5px; max-height: 100px; overflow: hidden; display: none;";

    // Preview image when URL is entered
    imageInput.addEventListener("input", function () {
      const imageUrl = this.value.trim();
      if (imageUrl) {
        const img = document.createElement("img");
        img.src = imageUrl;
        img.style.cssText =
          "max-width: 100%; max-height: 100px; object-fit: contain;";
        img.onload = function () {
          // Show preview when image loads successfully
          imagePreview.style.display = "block";
          imagePreview.innerHTML = "";
          imagePreview.appendChild(img);
        };
        img.onerror = function () {
          // Hide preview if image fails to load
          imagePreview.style.display = "none";
        };
      } else {
        imagePreview.style.display = "none";
      }
    });

    imageWrapper.appendChild(imageLabel);
    imageWrapper.appendChild(imageInput);
    imageWrapper.appendChild(imagePreview);
    container.appendChild(imageWrapper);

    // Create button container for multiple buttons
    const buttonContainer = document.createElement("div");
    buttonContainer.style.cssText =
      "display: flex; gap: 5px; margin-bottom: 10px;";

    // Create send button
    const sendButton = document.createElement("button");
    sendButton.innerText = "Send Message";
    sendButton.style.cssText =
      "flex: 1; padding: 8px; background: #3498db; color: white; border: none; border-radius: 4px; cursor: pointer;";
    sendButton.onclick = handleSendMessage;
    buttonContainer.appendChild(sendButton);

    // Create refresh button
    const refreshButton = document.createElement("button");
    refreshButton.innerText = "Refresh Client";
    refreshButton.style.cssText =
      "padding: 8px; background: #7f8c8d; color: white; border: none; border-radius: 4px; cursor: pointer;";
    refreshButton.onclick = async () => {
      updateStatus("Refreshing Supabase client and user ID...");

      // Force reload the scripts
      const loaderScript = document.createElement("script");
      loaderScript.src = "/supabase-loader.js?" + Date.now(); // Prevent caching
      loaderScript.onload = async () => {
        // Try to reconnect
        const client = await findSupabaseClient();
        if (client) {
          supabaseClient = client;
          updateStatus("Supabase client refreshed ✓");

          // Get current user
          const userId = await getCurrentUserId();
          if (userId) {
            currentUserId = userId;
            document.getElementById("current-user-id").innerText = userId;
            updateStatus(`Ready. Logged in as user: ${userId}`);
          } else {
            updateStatus("Error: Not logged in after refresh", true);
          }
        } else {
          updateStatus("Error: Supabase client not found after refresh", true);
        }
      };
      document.head.appendChild(loaderScript);
    };
    buttonContainer.appendChild(refreshButton);

    container.appendChild(buttonContainer);

    // Create debug log
    const logContainer = document.createElement("div");
    logContainer.id = "debug-log-container";
    logContainer.style.cssText =
      "margin-top: 10px; max-height: 200px; overflow-y: auto; font-size: 12px; border-top: 1px solid #eee; padding-top: 10px;";
    container.appendChild(logContainer);

    // Add to body
    document.body.appendChild(container);

    // Update status
    updateStatus("Initializing...");

    // Find Supabase client
    findSupabaseClient().then((client) => {
      if (client) {
        supabaseClient = client;
        updateStatus("Supabase client found ✓");

        // Get current user
        getCurrentUserId().then((userId) => {
          if (userId) {
            currentUserId = userId;
            document.getElementById("current-user-id").innerText = userId;
            updateStatus(`Ready. Logged in as user: ${userId}`);
          } else {
            updateStatus("Error: Not logged in", true);
          }
        });
      } else {
        updateStatus("Error: Supabase client not found", true);
      }
    });
  }

  // Update status message
  function updateStatus(message, isError = false) {
    const statusElement = document.getElementById("direct-sender-status");
    if (statusElement) {
      statusElement.innerText = message;
      statusElement.style.color = isError ? "#e74c3c" : "#666";
    }

    // Add to debug log
    addToLog(message, isError ? "error" : "info");
  }

  // Add message to debug log
  function addToLog(message, type = "info") {
    const timestamp = new Date().toLocaleTimeString();
    debugLog.push({ message, type, timestamp });

    // Update UI
    const logContainer = document.getElementById("debug-log-container");
    if (logContainer) {
      // Only keep last 20 messages
      if (debugLog.length > 20) {
        debugLog = debugLog.slice(-20);
      }

      logContainer.innerHTML = debugLog
        .map((entry) => {
          const color =
            entry.type === "error"
              ? "#e74c3c"
              : entry.type === "success"
              ? "#2ecc71"
              : "#666";
          return `<div style="margin-bottom: 5px; color: ${color}">
                  <span style="opacity: 0.7">[${entry.timestamp}]</span> ${entry.message}
                </div>`;
        })
        .join("");

      // Auto scroll to bottom
      logContainer.scrollTop = logContainer.scrollHeight;
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
    // Get input values
    const receiverId = document.getElementById("receiver-id").value.trim();
    const messageText = document.getElementById("message-text").value.trim();
    const productId = document.getElementById("product-id").value.trim();
    const productImageUrl = document
      .getElementById("product-image")
      .value.trim();

    // Validate inputs
    if (!receiverId) {
      return updateStatus("Error: Receiver ID is required", true);
    }

    // Either message or product ID is required
    if (!messageText && !productId) {
      return updateStatus(
        "Error: Either Message Text or Product ID is required",
        true
      );
    }

    if (!currentUserId) {
      return updateStatus("Error: Not logged in", true);
    }

    // Create default message if none provided
    const defaultMessage =
      messageText ||
      "Hi, I'm interested in your product. Is this still available?";

    // Check for duplicates
    const messageKey = `${currentUserId}-${receiverId}-${defaultMessage}-${
      productId || ""
    }`;
    if (sentMessages.has(messageKey)) {
      return updateStatus("Duplicate message prevented", true);
    }

    // Mark as sent
    sentMessages.add(messageKey);

    // Try to get product details if product ID is provided
    let productDetails = null;
    if (productId) {
      try {
        // Try to fetch product details from URL parameters
        const url = new URL(window.location.href);
        const params = new URLSearchParams(url.search);

        productDetails = {
          id: productId,
          productID: productId,
          name: params.get("productName") || "this product",
          price: params.get("price") || null,
          image: productImageUrl || params.get("image") || null,
        };

        // If URL doesn't have product info, try to fetch from database
        if (!productDetails.image && !productImageUrl && supabaseClient) {
          addToLog(`Fetching product details for ID: ${productId}`, "info");

          // Try different table names
          const possibleTables = ["products", "items", "listings"];
          for (const table of possibleTables) {
            try {
              const { data, error } = await supabaseClient
                .from(table)
                .select("*")
                .eq("id", productId)
                .limit(1);

              if (!error && data && data.length > 0) {
                addToLog(`Found product in ${table} table`, "success");
                productDetails = data[0];

                // Override with the custom image URL if provided
                if (productImageUrl) {
                  productDetails.image = productImageUrl;
                }
                break;
              }
            } catch (e) {
              // Table doesn't exist, try next one
            }
          }
        }

        // If we still don't have an image and user provided one, use it
        if (
          productImageUrl &&
          (!productDetails.image || productDetails.image === null)
        ) {
          productDetails.image = productImageUrl;
        }

        if (productDetails) {
          addToLog(
            `Using product details: ${JSON.stringify(productDetails)}`,
            "info"
          );
        }
      } catch (err) {
        addToLog(`Error getting product details: ${err.message}`, "error");
      }
    } else if (productImageUrl) {
      // Create minimal product details if only image is provided
      productDetails = {
        name: "this product",
        image: productImageUrl,
      };
    }

    // Format message with product details if available
    const finalMessage = productDetails
      ? createProductInquiryMessage(defaultMessage, productDetails)
      : defaultMessage;

    // Attempt to send
    updateStatus("Sending message...");

    try {
      const result = await sendMessage(
        receiverId,
        finalMessage,
        productId,
        productDetails
      );
      if (result.error) {
        updateStatus(`Error: ${result.error.message}`, true);
        // Remove from sent messages so it can be retried
        sentMessages.delete(messageKey);
      } else {
        updateStatus(
          `Message sent successfully! ID: ${result.data[0]?.id || "unknown"}`,
          false
        );
        addToLog("Message sent successfully!", "success");

        // Clear message field and image field
        document.getElementById("message-text").value = "";
        document.getElementById("product-image").value = "";
        document.getElementById("image-preview").style.display = "none";
      }
    } catch (err) {
      updateStatus(`Exception: ${err.message}`, true);
      sentMessages.delete(messageKey);
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

    // Try to find in React components
    addToLog("Searching for Supabase client in React components...", "info");

    // Try to find the createClient function in the global scope
    addToLog("Checking for createClient function...", "info");
    let createClientFn = null;

    // Look for the createClient function in the global scope
    if (typeof createClient === "function") {
      createClientFn = createClient;
      addToLog("Found global createClient function", "success");
    } else if (typeof supabase?.createClient === "function") {
      createClientFn = supabase.createClient;
      addToLog("Found supabase.createClient function", "success");
    } else {
      // Search for it in other global objects
      for (const key in window) {
        if (window[key] && typeof window[key].createClient === "function") {
          createClientFn = window[key].createClient;
          addToLog(`Found createClient in window.${key}`, "success");
          break;
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

    // If we still haven't found a client, try to load Supabase from CDN
    try {
      addToLog("Attempting to load Supabase from CDN...", "info");
      const client = await loadSupabaseFromCDN();
      if (client) return client;
    } catch (err) {
      addToLog(`Error loading from CDN: ${err.message}`, "error");
    }

    // Try to get a backup client as last resort
    try {
      const backupClient = getBackupClient();
      if (backupClient) {
        addToLog("Using backup Supabase client from configuration", "info");
        return backupClient;
      }
    } catch (err) {
      addToLog(`Error creating backup client: ${err.message}`, "error");
    }

    return null;
  }

  // Load Supabase from CDN
  async function loadSupabaseFromCDN() {
    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://unpkg.com/@supabase/supabase-js@2";
      script.async = true;

      script.onload = async () => {
        addToLog("Supabase JS library loaded from CDN", "success");

        try {
          // Find credentials
          const { url, key } = await findSupabaseCredentials();

          if (!url || !key) {
            addToLog("Could not find Supabase credentials", "error");
            return resolve(null);
          }

          // Create client with the loaded library
          if (typeof supabase?.createClient === "function") {
            const client = supabase.createClient(url, key);

            if (client && typeof client.from === "function") {
              addToLog("Created Supabase client with CDN library", "success");
              window.supabase = client; // Make it globally available
              return resolve(client);
            }
          }

          addToLog("Could not create client after loading library", "error");
          resolve(null);
        } catch (err) {
          addToLog(`Error after loading library: ${err.message}`, "error");
          resolve(null);
        }
      };

      script.onerror = () => {
        addToLog("Failed to load Supabase from CDN", "error");
        reject(new Error("Failed to load Supabase from CDN"));
      };

      document.head.appendChild(script);
    });
  }

  // Find Supabase credentials in various locations
  async function findSupabaseCredentials() {
    let url = null;
    let key = null;

    // Look in meta tags
    const urlMeta = document.querySelector('meta[name="supabase-url"]');
    const keyMeta = document.querySelector('meta[name="supabase-key"]');

    if (urlMeta && keyMeta) {
      url = urlMeta.content;
      key = keyMeta.content;
      addToLog("Found Supabase credentials in meta tags", "success");
      return { url, key };
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

    // As a last resort, prompt the user (only if we're missing both)
    if (!url && !key) {
      addToLog("Prompting user for Supabase credentials", "info");

      const promptUrl = prompt(
        "Enter your Supabase URL (https://xxx.supabase.co):"
      );
      const promptKey = prompt("Enter your Supabase anon key:");

      if (promptUrl && promptKey) {
        return { url: promptUrl, key: promptKey };
      }
    }

    return { url, key };
  }

  // Get backup Supabase client if we can't find the main one
  function getBackupClient() {
    // Try to get configuration from localStorage
    let url;
    let key;

    try {
      // Check localStorage for supabase URL and key
      const localStorageKeys = Object.keys(localStorage);

      for (const lsKey of localStorageKeys) {
        if (lsKey.includes("supabase")) {
          const value = localStorage.getItem(lsKey);
          try {
            const parsed = JSON.parse(value);
            if (parsed.url) url = parsed.url;
            if (parsed.key || parsed.anon || parsed.anonKey) {
              key = parsed.key || parsed.anon || parsed.anonKey;
            }
          } catch (e) {
            // Not JSON, continue
          }
        }
      }
    } catch (e) {
      // localStorage access might be restricted
    }

    // If we found a URL and key, create a client
    if (url && key) {
      // We need to check if the Supabase library is available
      if (
        typeof supabase !== "undefined" &&
        typeof supabase.createClient === "function"
      ) {
        return supabase.createClient(url, key);
      }
    }

    return null;
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

      // Method 5: Last resort - prompt user
      addToLog(
        "Could not automatically detect user ID, prompting user",
        "info"
      );
      const promptedId = prompt("Please enter your user ID:");
      if (promptedId && promptedId.trim()) {
        return promptedId.trim();
      }

      addToLog("Failed to get user ID by any method", "error");
      return null;
    } catch (err) {
      addToLog(`Exception getting user: ${err.message}`, "error");
      return null;
    }
  }

  // Send a message
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

  // Initialize when DOM is ready
  if (
    document.readyState === "complete" ||
    document.readyState === "interactive"
  ) {
    // Disabled: setTimeout(initializeUI, 0);
  } else {
    // Disabled: document.addEventListener("DOMContentLoaded", initializeUI);
  }

  console.log("✅ Direct Product Inquiry Sender installed!");
  console.log(
    "You can also use window.sendProductInquiry(productDetails, receiverId) to send messages manually."
  );
})();
