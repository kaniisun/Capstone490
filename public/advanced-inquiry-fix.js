/**
 * ADVANCED PRODUCT INQUIRY FIX
 *
 * This script forcefully enables creating new inquiries for different products
 * from the same seller, even when other fixes don't work.
 *
 * HOW TO USE:
 * 1. Open your browser console (F12 or Command+Option+I)
 * 2. Copy and paste this entire script
 * 3. Press Enter to run it
 * 4. Refresh the page
 */

(function () {
  console.log("🔧 Starting Advanced Product Inquiry Fix...");

  // Global flags and state
  window.__advancedFixActive = true;
  window.__productThatNeedsInquiry = null;
  window.__pendingProductInquiry = false;

  // Find and directly patch the React component that handles product inquiries
  const patchReactComponents = () => {
    console.log("Searching for React components to patch...");

    // Watch for URL changes to detect when a new product is being viewed
    let lastUrl = location.href;
    new MutationObserver(() => {
      const url = location.href;
      if (url !== lastUrl) {
        lastUrl = url;
        // Try to extract product ID from URL
        const productIdMatch = url.match(/productId=([^&]+)/);
        if (productIdMatch && productIdMatch[1]) {
          const productId = productIdMatch[1];
          console.log(`URL changed, detected product ID: ${productId}`);
          window.__productThatNeedsInquiry = {
            id: productId,
            needsInquiry: true,
          };
        }
      }
    }).observe(document, { subtree: true, childList: true });

    // Monkey-patch React's createElement to find and modify the MessageArea component
    const originalCreateElement = React.createElement;
    React.createElement = function (type, props, ...children) {
      // Check if this is the MessageArea component
      if (type && type.name === "MessageArea") {
        console.log("Found MessageArea component, applying patches!");

        // Create a wrapper for the component to modify its behavior
        const WrappedMessageArea = function (originalProps) {
          // Reset the initialMessageRef.current value directly
          if (
            originalProps.productDetails &&
            window.__productThatNeedsInquiry
          ) {
            if (
              originalProps.productDetails.id ===
                window.__productThatNeedsInquiry.id ||
              originalProps.productDetails.productID ===
                window.__productThatNeedsInquiry.id
            ) {
              window.__pendingProductInquiry = true;
              console.log(
                "Setting up for new product inquiry:",
                originalProps.productDetails.name
              );
            }
          }

          // Call the original component
          return originalCreateElement(type, originalProps, ...children);
        };

        WrappedMessageArea.displayName = "FixedMessageArea";
        return originalCreateElement(WrappedMessageArea, props, ...children);
      }

      return originalCreateElement(type, props, ...children);
    };

    // For direct DOM manipulation, we'll watch for the right elements
    const setupDOMObserver = () => {
      // Observer for the MessageArea component being added to the DOM
      const observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
          if (mutation.addedNodes.length > 0) {
            for (const node of mutation.addedNodes) {
              if (
                node.classList &&
                node.classList.contains("message-area-chat")
              ) {
                console.log(
                  "MessageArea component added to DOM, applying direct patches"
                );

                // Force reset initialMessageRef after the component mounts
                setTimeout(() => {
                  if (window.__pendingProductInquiry) {
                    console.log("Forcing new product inquiry...");

                    // Clear all tracking flags
                    if (window.initialMessageRef)
                      window.initialMessageRef.current = false;

                    // Also clear from localStorage directly
                    clearProductTrackingInStorage();

                    // Remove any old React state that might prevent the inquiry
                    patchReactState();

                    // Reset flag
                    window.__pendingProductInquiry = false;
                    window.__productThatNeedsInquiry = null;
                  }
                }, 500);
              }
            }
          }
        }
      });

      // Start observing the document for component mounts
      observer.observe(document.body, {
        childList: true,
        subtree: true,
      });
    };

    setupDOMObserver();
  };

  // Clear product message tracking from localStorage and sessionStorage
  const clearProductTrackingInStorage = () => {
    let removed = 0;

    // Clear localStorage tracking
    const keysToCheck = [];
    for (let i = 0; i < localStorage.length; i++) {
      keysToCheck.push(localStorage.key(i));
    }

    keysToCheck.forEach((key) => {
      // Clear product_msg keys
      if (
        key &&
        (key.includes("product_msg_") ||
          key.includes("_sent") ||
          key.includes("message") ||
          key.startsWith("contact_"))
      ) {
        localStorage.removeItem(key);
        removed++;
      }
    });

    // Also clear in-memory tracking
    if (window.__sentProductMessages) {
      window.__sentProductMessages.clear();
      removed++;
    }

    if (window.__processedMessageIds) {
      window.__processedMessageIds.clear();
      removed++;
    }

    if (window.__recentSellerClicks) {
      window.__recentSellerClicks = {};
      removed++;
    }

    console.log(`Cleared ${removed} product tracking items from storage`);
  };

  // Find and patch React component state directly
  const patchReactState = () => {
    // Look for React fiber nodes with state
    const patchReactNode = (node, path = "") => {
      if (!node || typeof node !== "object") return;

      try {
        // Check for state objects with initialMessageRef
        if (
          node.memoizedState &&
          node.memoizedState.refs &&
          node.memoizedState.refs.initialMessageRef
        ) {
          console.log(`Found React state with initialMessageRef at ${path}`);
          node.memoizedState.refs.initialMessageRef.current = false;
        }

        // Look deeper in the tree
        if (node.child) patchReactNode(node.child, `${path}.child`);
        if (node.sibling) patchReactNode(node.sibling, `${path}.sibling`);
        if (node.return) patchReactNode(node.return, `${path}.return`);
      } catch (e) {
        // Ignore errors during traversal
      }
    };

    // Find React root fiber node
    for (const key in window) {
      if (key.startsWith("__REACT_DEVTOOLS_GLOBAL_HOOK__")) {
        const hook = window[key];
        if (hook && hook.renderers && hook.renderers.size > 0) {
          console.log("Found React DevTools hook, searching for fiber nodes");

          hook.renderers.forEach((renderer, idx) => {
            if (renderer.findFiberByHostInstance) {
              const root = renderer.findFiberByHostInstance(document.body);
              if (root) {
                console.log("Found React fiber root, patching state");
                patchReactNode(root, "root");
              }
            }
          });
        }
      }
    }
  };

  // Apply the patches
  try {
    if (typeof React !== "undefined") {
      console.log("React found, applying component patches");
      patchReactComponents();
    } else {
      console.log("React not found in global scope, using DOM-based approach");
      // Set up a more basic fix using DOM observation only
      document.addEventListener("DOMContentLoaded", () => {
        // When components mount, force reset the tracking
        const observer = new MutationObserver((mutations) => {
          for (const mutation of mutations) {
            if (mutation.addedNodes.length > 0) {
              for (const node of mutation.addedNodes) {
                if (
                  node.classList &&
                  node.classList.contains("message-area-chat")
                ) {
                  console.log(
                    "Message area detected, clearing product tracking"
                  );
                  clearProductTrackingInStorage();
                }
              }
            }
          }
        });

        observer.observe(document.body, {
          childList: true,
          subtree: true,
        });
      });
    }

    // Directly override native functions to enforce our behavior
    console.log("Setting up direct function overrides");

    // Force-enable sending product messages by creating a utility function
    window.forceNewProductInquiry = (productDetails) => {
      if (!productDetails) {
        console.error("No product details provided");
        return false;
      }

      // Clear tracking data
      clearProductTrackingInStorage();

      // Generate a unique ID to prevent deduplication if one isn't provided
      const productId =
        productDetails.id ||
        productDetails.productID ||
        `generated_${Date.now()}`;

      console.log(`Will force new inquiry for product ID: ${productId}`);

      // Store product for inquiry
      window.__productThatNeedsInquiry = {
        ...productDetails,
        id: productId,
        needsInquiry: true,
      };

      window.__pendingProductInquiry = true;

      return true;
    };

    // Add UI to show the fix is active
    const addFixIndicator = () => {
      const div = document.createElement("div");
      div.style.position = "fixed";
      div.style.bottom = "15px";
      div.style.right = "15px";
      div.style.backgroundColor = "#FF5722";
      div.style.color = "white";
      div.style.padding = "8px 12px";
      div.style.borderRadius = "4px";
      div.style.fontSize = "14px";
      div.style.zIndex = "9999";
      div.style.boxShadow = "0 2px 5px rgba(0,0,0,0.2)";
      div.textContent = "Advanced Product Inquiry Fix Active ✓";

      document.body.appendChild(div);

      // Fade out after 5 seconds
      setTimeout(() => {
        div.style.transition = "opacity 0.5s ease";
        div.style.opacity = "0";
        setTimeout(() => div.remove(), 500);
      }, 5000);
    };

    // Run on page load
    if (document.readyState === "complete") {
      addFixIndicator();
    } else {
      window.addEventListener("load", addFixIndicator);
    }

    console.log("✅ Advanced Product Inquiry Fix installed successfully!");
  } catch (e) {
    console.error("Error applying product inquiry fix:", e);
  }
})();
