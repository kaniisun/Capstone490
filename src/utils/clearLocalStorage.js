/**
 * Utility function to clear authentication data from localStorage
 * This can be run manually in the browser console by typing:
 *
 * clearAuthData()
 *
 * It will remove all authentication-related data from localStorage
 * and refresh the page to ensure a clean state.
 */
window.clearAuthData = function () {
  console.log("Clearing authentication data from localStorage...");

  // Remove all auth-related items
  localStorage.removeItem("userName");
  localStorage.removeItem("userEmail");
  localStorage.removeItem("userId");
  localStorage.removeItem("isLoggedIn");
  localStorage.removeItem("sessionExpiration");

  console.log("Authentication data cleared. Refreshing page...");

  // Refresh the page to ensure a clean state
  window.location.reload();
};

/**
 * How to use this utility:
 *
 * 1. If you suspect there's an issue with authentication state:
 *    - Open your browser's developer console (F12 or right-click -> Inspect)
 *    - Navigate to the Console tab
 *    - Type: clearAuthData()
 *    - Press Enter
 *
 * 2. This will clear all authentication data and refresh the page
 *
 * 3. You should now be able to log in properly
 */
