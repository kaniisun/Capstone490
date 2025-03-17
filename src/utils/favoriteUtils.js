/**
 * Utility functions for managing favorites
 * Using a simple approach storing only product IDs in localStorage
 */

/**
 * Normalizes a product ID to ensure consistent storage and comparison
 * @param {string|number} productId - The product ID to normalize
 * @returns {string} - The normalized product ID
 */
const normalizeId = (productId) => {
  if (productId === undefined || productId === null) return null;
  // Convert everything to string for consistent storage and comparison
  return String(productId);
};

/**
 * Checks if a product is in favorites
 * @param {string|number} productId - The product ID to check
 * @returns {boolean} - True if the product is in favorites
 */
export const isFavorite = (productId) => {
  if (!productId) return false;

  const normalizedId = normalizeId(productId);
  const favorites = JSON.parse(localStorage.getItem("favorites") || "[]");
  // Convert stored IDs to strings for comparison
  return favorites.some((id) => normalizeId(id) === normalizedId);
};

/**
 * Toggles a product's favorite status
 * @param {string|number} productId - The product ID to toggle
 * @returns {boolean} - The new favorite status (true if added, false if removed)
 */
export const toggleFavorite = (productId) => {
  if (!productId) return false;

  const normalizedId = normalizeId(productId);

  // Get current favorites
  const favorites = JSON.parse(localStorage.getItem("favorites") || "[]");

  // Check if already in favorites (using normalized comparison)
  const index = favorites.findIndex((id) => normalizeId(id) === normalizedId);

  if (index >= 0) {
    // Remove from favorites
    favorites.splice(index, 1);
    localStorage.setItem("favorites", JSON.stringify(favorites));
    return false;
  } else {
    // Add to favorites
    favorites.push(normalizedId);
    localStorage.setItem("favorites", JSON.stringify(favorites));
    return true;
  }
};

/**
 * Gets all favorite product IDs
 * @returns {Array} - Array of product IDs
 */
export const getFavoriteIds = () => {
  return JSON.parse(localStorage.getItem("favorites") || "[]");
};

/**
 * Removes a product from favorites
 * @param {string|number} productId - The product ID to remove
 */
export const removeFavorite = (productId) => {
  if (!productId) return;

  const normalizedId = normalizeId(productId);
  const favorites = JSON.parse(localStorage.getItem("favorites") || "[]");
  const updatedFavorites = favorites.filter(
    (id) => normalizeId(id) !== normalizedId
  );
  localStorage.setItem("favorites", JSON.stringify(updatedFavorites));
};

/**
 * Clears all favorites
 */
export const clearAllFavorites = () => {
  localStorage.setItem("favorites", JSON.stringify([]));
};

/**
 * Gets product data for favorites from search results in localStorage
 * @param {Array} favoriteIds - Array of favorited product IDs
 * @returns {Array} - Product objects for the favorites
 */
export const getFavoriteProducts = (favoriteIds) => {
  if (!favoriteIds || favoriteIds.length === 0) {
    return [];
  }

  // Get products from search results in localStorage
  let products = [];
  try {
    const searchResults = JSON.parse(
      localStorage.getItem("searchResults") || "[]"
    );

    products = searchResults.filter((product) => {
      const productId = product.productID || product.id;
      const normalizedProductId = normalizeId(productId);

      return favoriteIds.some(
        (favId) => normalizeId(favId) === normalizedProductId
      );
    });
  } catch (error) {
    // Silent error handling for localStorage issues
    return [];
  }

  return products;
};
