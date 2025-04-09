/**
 * Search utility functions for marketplace chat
 */

/**
 * Normalizes terms by handling singular/plural forms
 * @param {Array} terms - Array of terms to normalize
 * @returns {Array} Array of normalized terms
 */
function normalizeTerms(terms) {
  const normalized = new Set();

  terms.forEach((term) => {
    // Add the term as is
    normalized.add(term);

    // Add singular form if plural
    if (term.endsWith("s") && term.length > 3) {
      normalized.add(term.substring(0, term.length - 1));
    }

    // Add plural form if singular
    if (!term.endsWith("s") && term.length > 2) {
      normalized.add(term + "s");
    }
  });

  return Array.from(normalized);
}

/**
 * Extracts price filtering information from user query
 * @param {string} query - User's natural language query
 * @returns {Object|null} Price filter object with type and thresholds
 */
function extractPriceFilter(query) {
  // Normalize query for easier parsing
  const normalizedQuery = query.toLowerCase();

  // Check for "over $X" or "over X" pattern
  // (?:\$)? makes the dollar sign optional
  const overPattern = /(?:over|more\s+than|above)\s+(?:\$)?(\d+(\.\d+)?)/i;
  const overMatch = normalizedQuery.match(overPattern);
  if (overMatch) {
    return {
      type: "over",
      threshold: parseFloat(overMatch[1]),
    };
  }

  // Check for "under $X" or "under X" pattern
  // (?:\$)? makes the dollar sign optional
  const underPattern = /(?:under|less\s+than|below)\s+(?:\$)?(\d+(\.\d+)?)/i;
  const underMatch = normalizedQuery.match(underPattern);
  if (underMatch) {
    return {
      type: "under",
      threshold: parseFloat(underMatch[1]),
    };
  }

  // Check for "between $X and $Y" or "between X and Y" pattern
  // (?:\$)? makes the dollar sign optional in multiple places
  const betweenPattern =
    /(?:between\s+(?:\$)?(\d+(\.\d+)?)\s+and\s+(?:\$)?(\d+(\.\d+)?)|from\s+(?:\$)?(\d+(\.\d+)?)\s+to\s+(?:\$)?(\d+(\.\d+)?))/i;
  const betweenMatch = normalizedQuery.match(betweenPattern);
  if (betweenMatch) {
    const lowerBound = parseFloat(betweenMatch[1] || betweenMatch[5]);
    const upperBound = parseFloat(betweenMatch[3] || betweenMatch[7]);

    return {
      type: "between",
      lowerBound,
      upperBound,
    };
  }

  // No price filter detected
  return null;
}

/**
 * Helper function to apply price filter to a Supabase query
 * @param {Object} query - Supabase query object
 * @param {Object} priceFilter - Price filter object
 * @returns {Object} Updated Supabase query
 */
function applyPriceFilter(query, priceFilter) {
  if (!priceFilter) return query;

  switch (priceFilter.type) {
    case "over":
      // Strictly greater than threshold
      return query.gt("price", priceFilter.threshold);

    case "under":
      // Strictly less than threshold
      return query.lt("price", priceFilter.threshold);

    case "between":
      // Inclusive range
      return query
        .gte("price", priceFilter.lowerBound)
        .lte("price", priceFilter.upperBound);

    default:
      return query;
  }
}

/**
 * Formats a price filter into a human-readable string
 * @param {Object} priceFilter - Price filter object
 * @returns {string} Human-readable price filter description
 */
function formatPriceFilter(priceFilter) {
  if (!priceFilter) return "";

  switch (priceFilter.type) {
    case "over":
      return ` priced over $${priceFilter.threshold}`;
    case "under":
      return ` priced under $${priceFilter.threshold}`;
    case "between":
      return ` priced between $${priceFilter.lowerBound} and $${priceFilter.upperBound}`;
    default:
      return "";
  }
}

/**
 * Extracts category terms from a query string
 * @param {string} query - User's query
 * @returns {Array} Array of extracted category terms
 */
function extractCategoryTerms(query) {
  const query_lower = query.toLowerCase();
  const categoryKeywords = {
    laptop: ["laptop", "laptops", "computer", "computers", "notebook"],
    electronics: [
      "electronics",
      "electronic",
      "device",
      "gadget",
      "tech",
      "macbook",
      "mac",
    ],
    furniture: ["furniture", "chair", "table", "desk", "sofa", "couch"],
    clothing: ["clothing", "clothes", "shirt", "pants", "dress", "jacket"],
    textbooks: ["textbook", "textbooks", "book", "books", "novel", "reading"],
    music: ["guitar", "instrument", "music", "musical"],
    sport: ["sport", "sports", "exercise", "fitness", "bike", "bicycle"],
    home: ["home", "kitchen", "appliance", "decor"],
    miscellaneous: ["misc", "miscellaneous", "other"],
  };

  const matchedCategories = [];

  // Check for category keywords in the query
  for (const [category, keywords] of Object.entries(categoryKeywords)) {
    for (const keyword of keywords) {
      // Use word boundary for more precise matching
      const wordPattern = new RegExp(`\\b${keyword}\\b`, "i");
      if (wordPattern.test(query_lower) || query_lower.includes(keyword)) {
        matchedCategories.push(category);
        break; // Found a match for this category
      }
    }
  }

  return matchedCategories;
}

module.exports = {
  normalizeTerms,
  extractPriceFilter,
  applyPriceFilter,
  formatPriceFilter,
  extractCategoryTerms,
};
