/**
 * DIRECT PRODUCT INQUIRY SENDER (HEADLESS VERSION)
 *
 * This script bypasses all React components and directly sends a product
 * inquiry through Supabase, but with NO UI elements.
 */

(function () {
  console.log("🚀 Starting Headless Product Inquiry Sender...");

  let supabaseClient = null;
  let currentUserId = null;
  let sentMessages = new Set(); // Track sent messages to prevent duplicates

  // Initialize core functionality
  function initialize() {
    findSupabaseClient().then((client) => {
      if (client) {
        supabaseClient = client;
        console.log("Supabase client connected ✓");

        // Get current user
        getCurrentUserId().then((userId) => {
          if (userId) {
            currentUserId = userId;
            console.log(`User authenticated: ${userId}`);

            // Check URL for product parameters
            checkUrlForProductInquiry();
          } else {
            console.log("Not logged in - product inquiries unavailable");
          }
        });
      } else {
        console.error(
          "Supabase client not found - product inquiries unavailable"
        );
      }
    });
  }

  // Check if we need to send a product inquiry based on URL parameters
  async function checkUrlForProductInquiry() {
    try {
      // Parse URL for product and receiver information
      const url = new URL(window.location.href);
      const params = new URLSearchParams(url.search);

      const productId = params.get("productId");
      const receiverId =
        params.get("sellerId") || url.pathname.split("/").pop();

      // Skip if we don't have required info
      if (!productId || !receiverId) {
        console.log("No product inquiry parameters found in URL");
        return;
      }

      console.log(
        `Found product params: Product ID=${productId}, Receiver ID=${receiverId}`
      );

      // Create product details object
      const productDetails = {
        id: productId,
        productID: productId,
        name: params.get("productName") || "this product",
        price: params.get("price") || null,
        image: params.get("image") || null,
      };

      // Try to fetch additional details from database
      if (supabaseClient) {
        try {
          const { data, error } = await supabaseClient
            .from("products")
            .select("*")
            .eq("productID", productId)
            .single();

          if (!error && data) {
            console.log("Found product details in database", data);
            Object.assign(productDetails, data);
          }
        } catch (e) {
          console.log("Could not fetch product details:", e.message);
        }
      }

      // Check if we've already sent a message for this product
      const messageKey = `${currentUserId}-${receiverId}-${productId}`;
      if (sentMessages.has(messageKey)) {
        console.log(
          "Duplicate product inquiry prevented for:",
          productDetails.name
        );
        return;
      }

      // Track as sent to prevent duplicates
      sentMessages.add(messageKey);

      // Send the message
      const message = createProductInquiryMessage(null, productDetails);
      const result = await sendMessage(message, receiverId, productDetails);

      if (result.error) {
        console.error("Failed to send product inquiry:", result.error.message);
      } else {
        console.log("✓ Product inquiry sent successfully!");
      }
    } catch (err) {
      console.error("Error checking URL for product inquiry:", err);
    }
  }

  // Find Supabase client
  async function findSupabaseClient() {
    // Check if already in global scope
    if (window.supabase && typeof window.supabase.from === "function") {
      return window.supabase;
    }

    // Try to find in common variable names
    const commonNames = ["supabaseClient", "supabase", "_supabase"];
    for (const name of commonNames) {
      if (window[name] && typeof window[name].from === "function") {
        return window[name];
      }
    }

    return null;
  }

  // Get the current user ID
  async function getCurrentUserId() {
    if (!supabaseClient) return null;

    try {
      // Try using auth.getUser
      const { data } = await supabaseClient.auth.getUser();
      if (data?.user?.id) {
        return data.user.id;
      }

      // Try localStorage as fallback
      const userId = localStorage.getItem("userId");
      if (userId) {
        return userId;
      }

      // Try parsing from supabase token
      const tokenStr = localStorage.getItem("supabase.auth.token");
      if (tokenStr) {
        try {
          const token = JSON.parse(tokenStr);
          return token.user?.id;
        } catch (e) {
          console.log("Could not parse auth token");
        }
      }
    } catch (err) {
      console.error("Error getting user ID:", err);
    }

    return null;
  }

  // Create product inquiry message
  function createProductInquiryMessage(message, productDetails) {
    if (!productDetails)
      return message || "Hi, I'm interested in your product.";

    // Extract product information
    const name = productDetails.name || "this product";
    const price = productDetails.price
      ? `$${productDetails.price}`
      : "listed price";
    const image = productDetails.image;

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

  // Send a message through Supabase
  async function sendMessage(message, receiverId, productDetails = null) {
    if (!supabaseClient || !currentUserId || !receiverId) {
      return {
        error: { message: "Missing required data for sending message" },
      };
    }

    try {
      // First find or create a conversation
      let conversationId;

      // Check if a conversation already exists between these users
      const { data: existingConversation, error: conversationError } =
        await supabaseClient
          .from("conversations")
          .select("conversation_id")
          .or(
            `and(participant1_id.eq.${currentUserId},participant2_id.eq.${receiverId}),and(participant1_id.eq.${receiverId},participant2_id.eq.${currentUserId})`
          )
          .limit(1);

      if (conversationError) {
        console.error(
          `Error finding conversation: ${conversationError.message}`
        );
        return { error: conversationError };
      }

      if (existingConversation && existingConversation.length > 0) {
        // Use existing conversation
        conversationId = existingConversation[0].conversation_id;
        console.log(`Using existing conversation: ${conversationId}`);

        // Update last_message_at timestamp
        await supabaseClient
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
          currentUserId < receiverId ? currentUserId : receiverId;
        const participant2 =
          currentUserId < receiverId ? receiverId : currentUserId;

        const { data: newConversation, error: newConversationError } =
          await supabaseClient
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
          return { error: newConversationError };
        }

        conversationId = newConversation[0].conversation_id;
        console.log(`Created new conversation: ${conversationId}`);
      }

      // Create the message data with conversation_id
      const messageData = {
        conversation_id: conversationId,
        sender_id: currentUserId,
        receiver_id: receiverId,
        content: message,
        created_at: new Date().toISOString(),
        status: "active",
      };

      // If we have product details, include the product ID
      if (productDetails) {
        const productId = productDetails.id || productDetails.productID;
        if (productId) {
          messageData.product_id = productId;
        }
      }

      // Send the message
      console.log("Sending message data:", messageData);
      const result = await supabaseClient
        .from("messages")
        .insert(messageData)
        .select();

      if (result.error) {
        console.error("Error sending message:", result.error.message);
        return result;
      }

      console.log("Message sent successfully:", result.data);
      return result;
    } catch (err) {
      console.error("Exception sending message:", err);
      return { error: { message: err.message } };
    }
  }

  // Make functions available globally
  window.sendProductInquiry = async (productDetails, receiverId) => {
    if (!supabaseClient) {
      console.error("Supabase client not initialized");
      return { error: { message: "Supabase client not initialized" } };
    }

    if (!currentUserId) {
      console.error("User not authenticated");
      return { error: { message: "User not authenticated" } };
    }

    if (!productDetails || !receiverId) {
      console.error("Missing product details or receiver ID");
      return { error: { message: "Missing product details or receiver ID" } };
    }

    const message = createProductInquiryMessage(null, productDetails);
    return await sendMessage(message, receiverId, productDetails);
  };

  // Initialize when DOM is ready
  if (
    document.readyState === "complete" ||
    document.readyState === "interactive"
  ) {
    setTimeout(initialize, 0);
  } else {
    document.addEventListener("DOMContentLoaded", initialize);
  }

  console.log("✅ Headless Product Inquiry Sender installed!");
})();
