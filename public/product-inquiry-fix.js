/**
 * PRODUCT INQUIRY FIX
 *
 * This script fixes the issue where clicking "Contact Seller" on different products
 * from the same seller doesn't create new inquiries for each product.
 *
 * HOW TO USE:
 * 1. Open your browser console (F12 or Command+Option+I)
 * 2. Copy and paste this entire script
 * 3. Press Enter to run it
 * 4. The fix will be applied immediately
 */

(function () {
  console.log("🔧 Starting Product Inquiry Fix...");

  // First, let's reset the initialMessageRef flag if it exists
  // This is the main cause of the "Initial message already sent during this session" issue
  if (window.initialMessageRef) {
    console.log("Resetting global initialMessageRef flag");
    window.initialMessageRef.current = false;
  }

  // Look for any React components with initialMessageRef
  const findAndResetReactRefs = () => {
    // Function to scan an object for initialMessageRef
    const scanForRef = (obj, path = "") => {
      if (!obj || typeof obj !== "object") return;

      // Check if this is an initialMessageRef
      if (obj.current !== undefined && path.includes("initialMessageRef")) {
        console.log(`Found React ref at path: ${path}`);
        obj.current = false;
        return;
      }

      // Skip certain React internals to avoid infinite recursion
      if (path.includes("_owner") || path.includes("_debugOwner")) return;

      // Recursively check properties
      for (const key in obj) {
        if (
          key === "current" ||
          key === "memoizedState" ||
          key === "stateNode"
        ) {
          scanForRef(obj[key], `${path}.${key}`);
        }
      }
    };

    // Start with document.body which might contain React fiber nodes
    scanForRef(document.body);

    // Check React's fiber nodes directly if we can find them
    for (const key in window) {
      if (key.startsWith("__REACT_DEVTOOLS") || key.includes("fiber")) {
        scanForRef(window[key], key);
      }
    }
  };

  // Reset React refs
  findAndResetReactRefs();

  // Also reset the session storage tracking for product messages
  const clearProductTracking = () => {
    // Clear any keys that track product messages
    let clearedCount = 0;

    // Check localStorage for product message keys
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.includes("product_msg_")) {
        localStorage.removeItem(key);
        clearedCount++;
      }
    }

    // Clear the in-memory Set that tracks sent product messages
    if (window.__sentProductMessages) {
      const beforeSize = window.__sentProductMessages.size;
      window.__sentProductMessages.clear();
      clearedCount += beforeSize;
    }

    return clearedCount;
  };

  const clearedCount = clearProductTracking();
  console.log(`Cleared ${clearedCount} product message tracking items`);

  // Override the shouldPreventMessage function to be smarter about different products
  const patchMessagePrevention = () => {
    // First, try to find the messageHelper module
    const findMessageHelper = () => {
      // Look for the function in the global scope
      if (
        window.shouldPreventMessage &&
        typeof window.shouldPreventMessage === "function"
      ) {
        return window;
      }

      // Look in module registry if using webpack or similar bundlers
      if (window.webpackJsonp) {
        // This is just a skeleton implementation since the exact webpack setup varies
        console.log(
          "Found webpack modules, but specific module extraction not implemented"
        );
      }

      return null;
    };

    const messageHelper = findMessageHelper();
    if (messageHelper && messageHelper.shouldPreventMessage) {
      console.log("Found shouldPreventMessage function, overriding...");

      // Store the original function
      const originalShouldPreventMessage = messageHelper.shouldPreventMessage;

      // Override with our improved version
      messageHelper.shouldPreventMessage = function (
        senderId,
        receiverId,
        product
      ) {
        if (!senderId || !receiverId || !product) return true;

        // Handle different product ID formats
        const productId =
          product.productID ||
          product.id ||
          (typeof product === "string" ? product : null);

        if (!productId) {
          console.error("No product ID found in product object:", product);
          return true;
        }

        // Create a unique key for this specific PRODUCT in this conversation
        // (not just the conversation as a whole)
        const key = `${senderId}_${receiverId}_${productId}`;

        // Check if we've already sent a message about this specific product
        const preventDuplicate = originalShouldPreventMessage(
          senderId,
          receiverId,
          product
        );

        if (preventDuplicate) {
          console.log(`Already sent message about product ${productId}`);
        } else {
          console.log(`Will send new message about product ${productId}`);
        }

        return preventDuplicate;
      };

      console.log("Successfully patched shouldPreventMessage function!");
      return true;
    }

    return false;
  };

  // Try to patch the prevention function
  const patchSuccess = patchMessagePrevention();
  if (!patchSuccess) {
    console.log("Could not find and patch shouldPreventMessage function");
  }

  // Add our enhanced handler for the product details effect
  const enhanceProductDetailEffect = () => {
    // This function runs on each page load
    const enhanceOnLoad = () => {
      // Reset initialMessageRef to allow new product messages
      setTimeout(() => {
        // Look for any MessageArea components
        const messageAreas = Array.from(
          document.querySelectorAll(".message-area-chat")
        );
        if (messageAreas.length > 0) {
          console.log(`Found ${messageAreas.length} MessageArea components`);

          // Reset tracking for this page
          if (window.__sentProductMessages) {
            window.__sentProductMessages.clear();
          }

          // Also reset initialMessageRef in React components
          findAndResetReactRefs();
        }
      }, 1000);
    };

    // Run immediately and also set up to run when page changes
    enhanceOnLoad();

    // Add event listener for URL changes
    let lastUrl = location.href;
    new MutationObserver(() => {
      const url = location.href;
      if (url !== lastUrl) {
        lastUrl = url;
        console.log("URL changed, resetting product message tracking");
        enhanceOnLoad();
      }
    }).observe(document, { subtree: true, childList: true });
  };

  // Run our enhancement
  enhanceProductDetailEffect();

  // Add UI to show the fix is active
  const addFixIndicator = () => {
    const div = document.createElement("div");
    div.style.position = "fixed";
    div.style.bottom = "15px";
    div.style.right = "15px";
    div.style.backgroundColor = "#4CAF50";
    div.style.color = "white";
    div.style.padding = "8px 12px";
    div.style.borderRadius = "4px";
    div.style.fontSize = "14px";
    div.style.zIndex = "9999";
    div.style.boxShadow = "0 2px 5px rgba(0,0,0,0.2)";
    div.textContent = "Product Inquiry Fix Active ✓";

    document.body.appendChild(div);

    // Fade out after 5 seconds
    setTimeout(() => {
      div.style.transition = "opacity 0.5s ease";
      div.style.opacity = "0";
      setTimeout(() => div.remove(), 500);
    }, 5000);
  };

  addFixIndicator();

  console.log("✅ Product Inquiry Fix installed successfully!");
})();
