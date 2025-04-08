/*
 * debug-send.js - Advanced Debugging Tool for Message Sending
 *
 * This script helps diagnose and fix 400 Bad Request errors when sending messages.
 * It creates a diagnostic overlay with a form to test message sending with different
 * parameters and provides detailed error information.
 */

import { supabase } from "../src/supabaseClient";

(function () {
  // Use the imported Supabase client directly instead of searching for one
  let supabaseClient = supabase;

  // Create debugging UI overlay
  const debugContainer = document.createElement("div");
  debugContainer.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    width: 400px;
    max-height: 90vh;
    overflow-y: auto;
    background: #fff;
    border: 1px solid #ccc;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    z-index: 10000;
    padding: 16px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
  `;

  // Initialize UI
  function initDebugUI() {
    debugContainer.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
        <h2 style="margin: 0; font-size: 18px; color: #333;">Facebook-style Messenger</h2>
        <button id="debugClose" style="background: none; border: none; cursor: pointer; font-size: 16px;">✕</button>
      </div>
      
      <div id="clientStatus" style="margin-bottom: 16px; padding: 8px; background: #f5f5f5; border-radius: 4px;">
        Using Supabase client from your application
      </div>
      
      <form id="messageTestForm">
        <div style="margin-bottom: 12px;">
          <label style="display: block; margin-bottom: 4px; font-weight: 500;">Receiver ID:</label>
          <input type="text" id="receiverId" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;" placeholder="UUID of message recipient">
        </div>
        
        <div style="margin-bottom: 12px;">
          <label style="display: block; margin-bottom: 4px; font-weight: 500;">Message Text:</label>
          <textarea id="messageText" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; min-height: 80px;" placeholder="Enter message here"></textarea>
        </div>
        
        <div style="margin-bottom: 12px;">
          <label style="display: block; margin-bottom: 4px; font-weight: 500;">Product ID:</label>
          <input type="text" id="productId" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;" placeholder="ID of product being discussed">
        </div>
        
        <button type="submit" id="sendTestBtn" style="padding: 8px 16px; background: #0084ff; color: white; border: none; border-radius: 20px; cursor: pointer; font-weight: 500;">Send Message</button>
      </form>
      
      <div style="margin-top: 16px;">
        <h3 style="font-size: 16px; margin-bottom: 8px;">Messages:</h3>
        <div id="messagesList" style="background: #f8f9fa; padding: 12px; border-radius: 4px; max-height: 300px; overflow-y: auto;">
          <div style="text-align: center; color: #888; padding: 20px;">No messages yet</div>
        </div>
      </div>
    `;

    document.body.appendChild(debugContainer);

    // Setup event listeners
    document.getElementById("debugClose").addEventListener("click", () => {
      document.body.removeChild(debugContainer);
    });

    document
      .getElementById("messageTestForm")
      .addEventListener("submit", (e) => {
        e.preventDefault();
        sendFacebookStyleMessage();
      });

    // Load existing messages when the UI initializes
    loadExistingMessages();

    // Update the client status
    updateClientStatus();
  }

  function updateClientStatus() {
    const statusEl = document.getElementById("clientStatus");
    if (supabaseClient) {
      statusEl.innerHTML = `
        <span style="color: #28a745;">✓ Supabase client found!</span>
        <div style="font-size: 12px; margin-top: 4px;">Ready to send messages</div>
      `;
      document.getElementById("sendTestBtn").disabled = false;
    } else {
      statusEl.innerHTML = `
        <span style="color: #dc3545;">❌ Supabase client not found</span>
        <div style="font-size: 12px; margin-top: 4px;">
          There's an issue with your Supabase configuration
        </div>
      `;
    }
  }

  async function loadExistingMessages() {
    if (!supabaseClient) return;

    try {
      // Get current user
      const {
        data: { user },
      } = await supabaseClient.auth.getUser();
      if (!user) {
        console.log("Not logged in, can't load messages");
        return;
      }

      // Get recent messages (limited to 10)
      const { data, error } = await supabaseClient
        .from("messages")
        .select("*, products(name, image)")
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) {
        console.error("Error loading messages:", error);
        return;
      }

      if (data && data.length > 0) {
        displayMessages(data.reverse(), user.id);
      }
    } catch (error) {
      console.error("Error in loadExistingMessages:", error);
    }
  }

  function displayMessages(messages, currentUserId) {
    const messagesListEl = document.getElementById("messagesList");
    messagesListEl.innerHTML = "";

    messages.forEach((message) => {
      const isOutgoing = message.sender_id === currentUserId;
      const messageEl = document.createElement("div");
      messageEl.style.cssText = `
        margin-bottom: 12px;
        display: flex;
        flex-direction: ${isOutgoing ? "row-reverse" : "row"};
      `;

      let content = message.content;

      // Check if there's product info
      let productInfo = "";
      if (message.products) {
        productInfo = `
          <div style="margin-top: 8px; display: flex; align-items: center; background: #f0f2f5; padding: 8px; border-radius: 8px;">
            ${
              message.products.image
                ? `<img src="${message.products.image}" style="width: 40px; height: 40px; object-fit: cover; border-radius: 4px; margin-right: 8px;">`
                : ""
            }
            <div style="font-size: 12px;">
              <div style="font-weight: 500;">${
                message.products.name || "Product"
              }</div>
              <div style="color: #65676B;">Product ID: ${
                message.product_id
              }</div>
            </div>
          </div>
        `;
      }

      messageEl.innerHTML = `
        <div style="
          background: ${isOutgoing ? "#0084ff" : "#e4e6eb"};
          color: ${isOutgoing ? "white" : "black"};
          padding: 8px 12px;
          border-radius: 18px;
          max-width: 70%;
          word-wrap: break-word;
        ">
          ${content}
          ${productInfo}
          <div style="font-size: 10px; text-align: right; margin-top: 4px; opacity: 0.7;">
            ${new Date(message.created_at).toLocaleTimeString()}
          </div>
        </div>
      `;

      messagesListEl.appendChild(messageEl);
    });

    // Scroll to bottom
    messagesListEl.scrollTop = messagesListEl.scrollHeight;
  }

  async function sendFacebookStyleMessage() {
    const receiverId = document.getElementById("receiverId").value.trim();
    const messageText = document.getElementById("messageText").value.trim();
    const productId = document.getElementById("productId").value.trim() || null;

    if (!receiverId || !messageText) {
      alert("Receiver ID and Message Text are required");
      return;
    }

    if (!supabaseClient) {
      alert("Error: Supabase client not found");
      return;
    }

    // Get current user ID
    let userId = null;
    try {
      const {
        data: { user },
      } = await supabaseClient.auth.getUser();
      if (!user) {
        alert("Error: Not logged in. Please login first.");
        return;
      }
      userId = user.id;
    } catch (error) {
      alert(`Error getting current user: ${error.message}`);
      return;
    }

    // Create message object in Facebook Messenger style
    const messageData = {
      sender_id: userId,
      receiver_id: receiverId,
      content: messageText,
      status: "active",
      created_at: new Date().toISOString(),
    };

    if (productId) {
      messageData.product_id = parseInt(productId, 10) || productId;
    }

    try {
      // Send message
      const { data, error } = await supabaseClient
        .from("messages")
        .insert(messageData)
        .select();

      if (error) {
        alert(`Error sending message: ${error.message}`);
      } else {
        // Clear message input
        document.getElementById("messageText").value = "";

        // Refresh messages
        loadExistingMessages();
      }
    } catch (error) {
      alert(`Unexpected error: ${error.message}`);
    }
  }

  // Initialize when DOM is ready
  if (
    document.readyState === "complete" ||
    document.readyState === "interactive"
  ) {
    setTimeout(initDebugUI, 0);
  } else {
    document.addEventListener("DOMContentLoaded", initDebugUI);
  }
})();
