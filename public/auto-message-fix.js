/**
 * Auto Message Fix
 *
 * This script automatically detects when the user is on a messaging page
 * and checks if there are no messages showing. If there are none, it will
 * automatically attempt to fix the issue.
 */

(function () {
  console.log("📱 Auto Message Fix - Starting...");

  // Check if we're on a messaging page
  const isMessagingPage = window.location.pathname.includes("/messaging/");
  if (!isMessagingPage) {
    console.log("Not on a messaging page, exiting");
    return;
  }

  // Extract important information from URL
  const receiverId = window.location.pathname
    .split("/messaging/")[1]
    ?.split("?")[0];
  const params = new URLSearchParams(window.location.search);
  const productId = params.get("productId");

  console.log(
    `On messaging page with receiver: ${receiverId}, product: ${
      productId || "none"
    }`
  );

  // Function to check if messages are visible
  function checkForVisibleMessages() {
    console.log("Checking for visible messages...");

    // Look for message elements
    const messageElements = document.querySelectorAll(".message-area-message");
    const messageCount = messageElements.length;

    console.log(`Found ${messageCount} message elements on page`);

    // If no messages and we're on a product page, try to fix
    if (messageCount === 0 && productId) {
      console.log("No messages found, will attempt fix");
      attemptFix();
    } else if (messageCount > 0) {
      console.log("Messages found, no fix needed");
    } else {
      console.log("No messages but no product ID, can't auto-fix");
    }
  }

  // Function to attempt fixing the messages
  function attemptFix() {
    console.log("Attempting to fix missing messages");

    // Check if we have a record of a recent product inquiry
    const lastInquiry = localStorage.getItem("last_product_inquiry");
    if (lastInquiry) {
      try {
        const inquiryData = JSON.parse(lastInquiry);
        console.log("Found record of recent product inquiry:", inquiryData);

        // Only proceed if the inquiry matches the current page
        if (
          inquiryData.seller_id === receiverId &&
          inquiryData.product_id === productId
        ) {
          console.log("Inquiry matches current page, applying fix");

          // Load the product inquiry fix script
          const script = document.createElement("script");
          script.src = "/product-inquiry-fix.js";
          script.onload = function () {
            console.log("Product inquiry fix loaded and running");
          };
          document.head.appendChild(script);
        }
      } catch (err) {
        console.error("Error parsing last inquiry data:", err);
      }
    } else {
      console.log("No record of recent product inquiry found");

      // Try a more generic approach - clear all tracking variables
      resetMessageTrackingVariables();
    }
  }

  // Reset message tracking variables
  function resetMessageTrackingVariables() {
    console.log("Resetting message tracking variables");

    // Reset global tracking variables
    if (window.__fetchingMessages) {
      window.__fetchingMessages = {};
    }

    if (window.__initialMessageFetch) {
      window.__initialMessageFetch = {};
    }

    if (window.__sessionsByProduct) {
      // Find sessions related to current user
      const relevantSessions = Object.keys(window.__sessionsByProduct).filter(
        (key) => key.includes(receiverId)
      );

      relevantSessions.forEach((key) => {
        delete window.__sessionsByProduct[key];
      });
    }

    // Clear related localStorage items
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (
        key &&
        ((receiverId && key.includes(receiverId)) ||
          (productId && key.includes(productId)) ||
          key.includes("_prevention_"))
      ) {
        localStorage.removeItem(key);
      }
    }

    console.log("Variables reset, reloading page");
    window.location.reload();
  }

  // Wait for page to load, then check for messages
  window.addEventListener("load", function () {
    // Give the page a moment to fully render
    setTimeout(checkForVisibleMessages, 2000);
  });
})();
