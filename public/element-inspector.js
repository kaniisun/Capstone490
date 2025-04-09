/**
 * DOM Element Inspector
 *
 * This script monitors DOM element access attempts to help debug UI errors.
 */

(function () {
  console.log("🔍 DOM Element Inspector starting...");

  // Store original functions
  const originalGetElementById = document.getElementById;
  const originalQuerySelector = document.querySelector;
  const originalQuerySelectorAll = document.querySelectorAll;

  // Track element access patterns
  const accessLog = [];
  const MAX_LOG_SIZE = 50;

  // Override getElementById to log access attempts
  document.getElementById = function (id) {
    const element = originalGetElementById.call(document, id);
    const stack = new Error().stack;

    // Only log if the element contains 'message' and 'button'
    if (
      id &&
      id.toLowerCase().includes("message") &&
      id.toLowerCase().includes("button")
    ) {
      logAccess("getElementById", id, !!element, stack);
    }

    return element;
  };

  // Override querySelector to log access attempts
  document.querySelector = function (selector) {
    const element = originalQuerySelector.call(document, selector);
    const stack = new Error().stack;

    // Only log if the selector contains 'message' and 'button'
    if (
      selector &&
      selector.toLowerCase().includes("message") &&
      selector.toLowerCase().includes("button")
    ) {
      logAccess("querySelector", selector, !!element, stack);
    }

    return element;
  };

  // Log access information
  function logAccess(method, selector, found, stack) {
    const timestamp = new Date().toISOString();
    const caller = stack.split("\n")[2]; // Get the calling function

    const entry = {
      timestamp,
      method,
      selector,
      found,
      caller,
    };

    accessLog.push(entry);
    if (accessLog.length > MAX_LOG_SIZE) {
      accessLog.shift(); // Keep log size manageable
    }

    console.warn(
      `DOM Access: ${method}('${selector}') - Element ${
        found ? "found" : "NOT FOUND"
      }`
    );
    console.warn(`Called from: ${caller}`);
  }

  // Expose logs for debugging
  window.__elementAccessLog = accessLog;

  // Report function to see recent access attempts
  window.showElementAccessLog = function () {
    console.table(accessLog);
    return accessLog;
  };

  console.log(
    "✅ DOM Element Inspector installed. Use window.showElementAccessLog() to see results."
  );
})();
