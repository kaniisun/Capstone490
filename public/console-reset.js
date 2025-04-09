/**
 * TESTING UTILITY: Console Reset for Message Prevention
 *
 * This script can be pasted into the browser console to reset
 * all message prevention mechanisms for testing.
 *
 * Just copy and paste this entire script into your browser console
 * and it will reset everything so you can test Contact Seller again.
 */

(function () {
  console.log("🧹 Starting message prevention reset...");

  // Reset in-memory caches
  if (window.__sentProductMessages) {
    window.__sentProductMessages.clear();
    console.log("✅ Cleared __sentProductMessages");
  }

  if (window.__processedMessages) {
    window.__processedMessages.clear();
    console.log("✅ Cleared __processedMessages");
  }

  if (window.__initialMessageFetch) {
    window.__initialMessageFetch = {};
    console.log("✅ Reset __initialMessageFetch");
  }

  if (window.__fetchingMessages) {
    window.__fetchingMessages = {};
    console.log("✅ Reset __fetchingMessages");
  }

  if (window.initiatedConversations) {
    window.initiatedConversations.clear();
    console.log("✅ Cleared initiatedConversations");
  }

  // Create a list of localStorage keys to remove
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
    const oldValue = localStorage.getItem(key);
    localStorage.removeItem(key);
    console.log(`🗑️ Removed localStorage key: ${key} (value was: ${oldValue})`);
  });

  // Also clear sessionStorage for any cleanup flags
  const sessionKeysToRemove = [];
  for (let i = 0; i < sessionStorage.length; i++) {
    const key = sessionStorage.key(i);
    if (key && (key.includes("cleanup") || key.includes("message"))) {
      sessionKeysToRemove.push(key);
    }
  }

  sessionKeysToRemove.forEach((key) => {
    sessionStorage.removeItem(key);
    console.log(`🗑️ Removed sessionStorage key: ${key}`);
  });

  console.log(`
  ✅ Reset complete! Removed:
  - ${keysToRemove.length} localStorage keys
  - ${sessionKeysToRemove.length} sessionStorage keys
  - All in-memory message prevention caches
  
  🔄 Please reload the page to see the changes take effect.
  `);

  return true;
})();
