// Prevent duplicate clicking on Contact Seller
const handleContactSeller = useCallback((product) => {
  // Create a key to identify this specific product contact event
  const contactKey = `contact_${product.userID}_${product.id}`;

  // Check if we've already clicked this button in the last few seconds
  if (window.__recentSellerClicks && window.__recentSellerClicks[contactKey]) {
    console.log("Preventing duplicate Contact Seller click for:", product.name);
    return;
  }

  // Get seller ID from product
  const sellerId = product.userID;

  // Get the current user ID from local storage
  const currentUserID = window.localStorage.getItem("supabase.auth.token")
    ? JSON.parse(window.localStorage.getItem("supabase.auth.token")).user.id
    : null;

  if (!currentUserID) {
    toast("Please login to contact the seller");
    return;
  }

  if (sellerId === currentUserID) {
    toast("You can't message yourself");
    return;
  }

  // Mark this conversation as initiated to prevent duplicates
  if (!window.__recentSellerClicks) window.__recentSellerClicks = {};
  window.__recentSellerClicks[contactKey] = true;

  // Clear the click tracking after a reasonable timeout
  setTimeout(() => {
    if (window.__recentSellerClicks) {
      delete window.__recentSellerClicks[contactKey];
    }
  }, 5000); // 5 seconds debounce

  // Check if we should prevent this message based on our helper
  if (shouldPreventMessage(currentUserID, sellerId, product.id)) {
    console.log(
      "Message already sent for this product, redirecting without duplicate"
    );
    // Navigate to existing conversation
    const url = `/message/${sellerId}?productId=${
      product.id
    }&productName=${encodeURIComponent(product.name)}`;

    // Use a controlled navigation approach instead of direct location change
    window.history.pushState({}, "", url);
    window.dispatchEvent(new PopStateEvent("popstate"));
    return;
  }

  // Mark this message as sent to prevent future duplicates
  markMessageSent(currentUserID, sellerId, product.id);

  // Save scroll position (to fix scrolling issue on navigation)
  const scrollY = window.scrollY;

  // Safely encode product name for URL
  const url = `/message/${sellerId}?productId=${
    product.id
  }&productName=${encodeURIComponent(product.name)}&scrollY=${scrollY}`;

  // Use history.pushState for a smoother transition without full page reload
  window.history.pushState({}, "", url);
  window.dispatchEvent(new PopStateEvent("popstate"));
}, []);
