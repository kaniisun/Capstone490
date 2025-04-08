/**
 * FORCE SEND INITIAL MESSAGE UTILITY
 *
 * This script bypasses all prevention mechanisms and forces the initial
 * "interested in your product" message to be sent.
 *
 * HOW TO USE:
 * 1. Run this in the browser console when viewing a product's message page
 * 2. It will send the initial message, bypassing prevention checks
 */

(async function () {
  console.log("🚀 Force Send Initial Message - Starting...");

  try {
    // First clear all prevention mechanisms
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (
        key &&
        (key.includes("_") ||
          key.includes("message") ||
          key.includes("conversation") ||
          key.includes("prevented") ||
          key.includes("product_msg") ||
          key.includes("initiated"))
      ) {
        keysToRemove.push(key);
      }
    }

    // Remove the keys
    keysToRemove.forEach((key) => {
      localStorage.removeItem(key);
      console.log(`🗑️ Removed localStorage key: ${key}`);
    });

    // Clear global variables
    if (window.__sentProductMessages) window.__sentProductMessages.clear();
    if (window.__processedMessages) window.__processedMessages.clear();
    if (window.initiatedConversations) window.initiatedConversations.clear();
    if (window.__initialMessageFetch) window.__initialMessageFetch = {};
    if (window.__fetchingMessages) window.__fetchingMessages = {};

    // Get required data
    const userID = localStorage.getItem("userId");
    if (!userID) {
      console.error(
        "❌ Error: User ID not found in localStorage. Please log in."
      );
      return false;
    }

    // Extract product and receiver details from URL or current state
    let productDetails, receiverID;

    // Try to get from URL first
    const url = new URL(window.location.href);
    const pathParts = url.pathname.split("/");
    const params = new URLSearchParams(url.search);

    if (url.pathname.includes("/messages/")) {
      receiverID = pathParts[pathParts.indexOf("messages") + 1];

      // Try to get product ID from URL params
      const productId = params.get("productId");

      if (productId) {
        // Attempt to find product details from page context
        if (window.productData) {
          productDetails = window.productData;
        } else {
          // Create basic product details
          productDetails = {
            id: productId,
            productID: productId,
            name: params.get("productName") || "this product",
            price: params.get("price") || "listed price",
            image: params.get("image") || null,
          };
        }
      }
    }

    // If we couldn't extract from URL, try to get from React state
    if (!receiverID || !productDetails) {
      console.log(
        "Couldn't extract all details from URL, looking in React state..."
      );
      // This is a very basic way to try to access React state - not reliable
      // but might work in some cases
      let found = false;
      for (const key in window) {
        if (key.startsWith("__REACT_") || key.includes("fiber")) {
          try {
            // If we find React internals, try to extract information
            console.log("Found potential React data, trying to extract...");
            found = true;
          } catch (e) {
            // Ignore errors
          }
        }
      }

      if (!found) {
        console.error(
          "❌ Error: Couldn't extract product and receiver details."
        );
        console.log(
          "Please run this script when viewing a product message page."
        );
        return false;
      }
    }

    // If we have all the required data, send the message
    if (userID && receiverID && productDetails) {
      console.log("📝 Preparing to send message with:");
      console.log(`- Sender ID: ${userID}`);
      console.log(`- Receiver ID: ${receiverID}`);
      console.log(
        `- Product: ${productDetails.name} (ID: ${
          productDetails.id || productDetails.productID
        })`
      );

      // Function to create formatted message with product image
      const createProductInquiryMessage = (product) => {
        if (!product)
          return "Hi, I'm interested in your product. Is this still available?";

        // Extract product details
        const name = product.name || product.productName || "this product";
        const price = product.price ? `$${product.price}` : "listed price";
        const image = product.image || null;

        // Create basic message without image
        if (!image) {
          return `Hi, I'm interested in your ${name} listed for ${price}. Is this still available?`;
        }

        // Create formatted message with image
        return `Hi, I'm interested in your ${name} listed for ${price}. Is this still available?\n\n<div style="margin-top:10px; margin-bottom:10px; max-width:250px;"><img src="${image}" alt="${name}" style="max-width:100%; border-radius:8px; border:1px solid #eee;" /></div>\n\nLooking forward to your response!`;
      };

      // Construct the initial message with product image
      const initialMessage = createProductInquiryMessage(productDetails);

      // Send the message via Supabase
      const { data, error } = await window.supabase.from("messages").insert([
        {
          sender_id: userID,
          receiver_id: receiverID,
          content: initialMessage,
          status: "active",
          created_at: new Date().toISOString(),
        },
      ]);

      if (error) {
        console.error("❌ Error sending message:", error);
        alert(`Error: ${error.message}`);
        return false;
      }

      console.log("✅ Message sent successfully!", data);
      alert("Initial message sent successfully! Refresh the page to see it.");

      return true;
    } else {
      console.error("❌ Error: Missing required data for sending message.");
      console.log("Please make sure you are on a product message page.");
      return false;
    }
  } catch (err) {
    console.error("❌ Error in force-send script:", err);
    alert(`Error in force-send script: ${err.message}`);
    return false;
  }
})();
