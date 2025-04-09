/**
 * Term extraction utility functions
 */

// Product term mappings for different categories
const productTermMap = {
  guitar: [
    "guitar",
    "guitars",
    "electric guitar",
    "acoustic guitar",
    "bass guitar",
    "instrument",
    "musical instrument",
    "string instrument",
  ],
  laptop: [
    "laptop",
    "laptops",
    "notebook",
    "notebooks",
    "computer",
    "computers",
  ],
  furniture: [
    "desk",
    "desks",
    "chair",
    "chairs",
    "table",
    "tables",
    "furniture",
    "sofa",
    "couch",
    "couches",
    "bookshelf",
    "bookshelves",
  ],
  clothing: [
    "shirt",
    "shirts",
    "pants",
    "clothing",
    "jacket",
    "jackets",
    "dress",
    "dresses",
    "clothes",
    "garment",
    "garments",
    "apparel",
  ],
  textbooks: [
    "book",
    "books",
    "textbook",
    "textbooks",
    "novel",
    "novels",
    "reading",
    "literature",
    "manual",
    "manuals",
  ],
  electronics: [
    "electronics",
    "electronic",
    "device",
    "devices",
    "gadget",
    "gadgets",
    "tech",
    "technology",
    "appliance",
    "appliances",
    "digital",
    "macbook",
    "macbooks",
    "mac",
    "apple computer",
  ],
  sports: [
    "sport",
    "sports",
    "exercise",
    "fitness",
    "bike",
    "bicycle",
    "bicycles",
    "athletic",
    "equipment",
    "outdoor",
    "recreation",
  ],
  home: [
    "home",
    "kitchen",
    "appliance",
    "appliances",
    "decor",
    "decoration",
    "decorations",
    "household",
    "domestic",
    "interior",
  ],
  misc: [
    "misc",
    "miscellaneous",
    "other",
    "various",
    "item",
    "items",
    "product",
    "products",
  ],
};

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
 * Extracts search terms from a user query
 * @param {string} userQuery - User's natural language query
 * @returns {Array} Array of extracted search terms
 */
function extractSearchTerms(userQuery) {
  const query = userQuery.toLowerCase();
  const extractedTerms = new Set();

  // Find which product terms the user is searching for
  for (const [baseTerm, variations] of Object.entries(productTermMap)) {
    // Normalize the variations to catch more matches
    const normalizedVariations = normalizeTerms(variations);

    if (
      normalizedVariations.some((term) => {
        // Exact match
        if (query.includes(term)) return true;

        // Word boundary match (more robust)
        const wordPattern = new RegExp(`\\b${term}\\b`, "i");
        return wordPattern.test(query);
      })
    ) {
      extractedTerms.add(baseTerm);

      // Also add the specific variation that matched
      normalizedVariations.forEach((variation) => {
        if (
          query.includes(variation) ||
          new RegExp(`\\b${variation}\\b`, "i").test(query)
        ) {
          extractedTerms.add(variation);
        }
      });
    }
  }

  return Array.from(extractedTerms);
}

/**
 * Checks if a user query is a product search query
 * @param {string} userQuery - User's message
 * @returns {boolean} True if this seems to be a product search query
 */
function isProductSearchQuery(userQuery) {
  const query = userQuery.toLowerCase();

  // Common search intent indicators
  const searchIndicators = [
    "need",
    "looking for",
    "search",
    "find",
    "want",
    "show me",
    "list",
    "display",
  ];

  return searchIndicators.some((indicator) => query.includes(indicator));
}

module.exports = {
  productTermMap,
  normalizeTerms,
  extractSearchTerms,
  isProductSearchQuery,
};
