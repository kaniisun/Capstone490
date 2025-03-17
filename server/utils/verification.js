/**
 * Verification utilities for ensuring search results match user intent
 */

const { extractPriceFilter } = require("./search-utils");
const { extractSearchTerms, productTermMap } = require("./term-utils");

/**
 * Verifies if search results actually match what the user was looking for
 * Implements a deterministic term-product matching approach
 * @param {Array} products - Products from database
 * @param {string} userQuery - User's query
 * @returns {Object} Verification result
 */
function verifySearchMatch(products, userQuery) {
  // Extract price filter
  const priceFilter = extractPriceFilter(userQuery);

  // Use global utility functions for extracting search terms
  const matchedTerms = extractSearchTerms(userQuery);

  // Extract any direct product names from the query
  // For example "show me electric guitar" should extract "electric guitar"
  const directProductMatches = [];

  for (const product of products) {
    const productName = product.name.toLowerCase();

    // Split product name into terms
    const productTerms = productName
      .split(/\s+/)
      .filter((term) => term.length > 2);

    const normalizedProductTerms =
      require("./search-utils").normalizeTerms(productTerms);

    // Check if any normalized product term matches in the query
    for (const term of normalizedProductTerms) {
      // Direct term match
      if (userQuery.includes(term)) {
        directProductMatches.push({
          term: term,
          productId: product.productID,
          productName: product.name,
          match_type: "term_match",
        });
      }

      // Word boundary match (more precise)
      const wordPattern = new RegExp(`\\b${term}\\b`, "i");
      if (
        wordPattern.test(userQuery) &&
        !directProductMatches.some(
          (m) => m.productId === product.productID && m.term === term
        )
      ) {
        directProductMatches.push({
          term: term,
          productId: product.productID,
          productName: product.name,
          match_type: "word_match",
        });
      }
    }

    // Check for full product name match (highest confidence)
    if (userQuery.includes(productName)) {
      directProductMatches.push({
        term: productName,
        productId: product.productID,
        productName: product.name,
        isExactMatch: true,
        match_type: "full_match",
      });
    }
  }

  // Convert extracted terms to array for easier handling
  const matchedTermsArray = Array.from(matchedTerms);

  // Build a term-product matching matrix
  // This tracks which terms matched which products
  const matchMatrix = {};

  // Initialize matrix with all terms
  matchedTermsArray.forEach((term) => {
    matchMatrix[term] = {
      matchCount: 0,
      products: [],
    };
  });

  // For each product, check which terms it matches
  products.forEach((product) => {
    const productName = product.name?.toLowerCase() || "";
    const productDesc = product.description?.toLowerCase() || "";
    const productCategory = product.category?.toLowerCase() || "";

    matchedTermsArray.forEach((term) => {
      let isMatch = false;
      let matchConfidence = 0;

      // Check if normalized term appears in product name, description or category
      const normalizedTerm =
        term.endsWith("s") && term.length > 3
          ? term.substring(0, term.length - 1)
          : term;

      // Product name matches are the strongest signals
      if (productName.includes(normalizedTerm) || productName.includes(term)) {
        isMatch = true;
        matchConfidence = 10; // Highest confidence
      }
      // Description matches are secondary
      else if (
        productDesc.includes(normalizedTerm) ||
        productDesc.includes(term)
      ) {
        isMatch = true;
        matchConfidence = 5; // Medium confidence
      }
      // Category matches are still valid
      else if (
        productCategory.includes(normalizedTerm) ||
        productCategory.includes(term)
      ) {
        isMatch = true;
        matchConfidence = 3; // Lower confidence
      }

      // If we have a match, add to the matrix with confidence score
      if (isMatch) {
        matchMatrix[term].matchCount++;
        matchMatrix[term].products.push({
          id: product.productID,
          name: product.name,
          confidence: matchConfidence,
        });
      }
    });
  });

  // Count how many terms matched products
  const termsWithMatches = matchedTermsArray.filter(
    (term) => matchMatrix[term].matchCount > 0
  );

  // Find exact matches (products that match specific terms directly)
  const exactMatches = directProductMatches.filter(
    (match) => match.isExactMatch
  );

  // Evaluate if we have strong matches to what user asked for
  const hasStrongMatch =
    products.length > 0 &&
    // Either we have exact matches
    (exactMatches.length > 0 ||
      // Or we have very clear term matches
      (directProductMatches.length > 0 &&
        directProductMatches.some(
          (m) => m.match_type === "word_match" || m.match_type === "full_match"
        )));

  // Create structured result object
  return {
    // Is this a successful match overall?
    hasMatch:
      products.length > 0 &&
      (termsWithMatches.length > 0 || directProductMatches.length > 0),

    // Do we have confident matches?
    hasStrongMatch: hasStrongMatch,

    // Count of products found
    matchCount: products.length,

    // Terms that matched products
    matchedTerms: termsWithMatches,

    // Terms that didn't match anything
    unmatchedTerms: matchedTermsArray.filter(
      (term) => matchMatrix[term].matchCount === 0
    ),

    // Matrix showing which terms matched which products
    matchMatrix: matchMatrix,

    // Direct product matches
    directMatches: directProductMatches,

    // Exact matches (full product name matches)
    exactMatches: exactMatches,

    // Is there an exact match for what the user wanted?
    hasExactMatch: exactMatches.length > 0,

    // The search terms we extracted
    searchTerms: matchedTermsArray,

    // Include price filter if present
    priceFilter: priceFilter,

    // Top matching product - the most relevant one to show first
    topMatch:
      directProductMatches.length > 0
        ? products.find(
            (p) => p.productID === directProductMatches[0].productId
          )
        : null,
  };
}

/**
 * Determines the appropriate search response based on matches
 * @param {Array} products - List of products
 * @param {string} query - User's query
 * @param {Array} searchTerms - Extracted search terms
 * @param {Array} categoryTerms - Category terms (optional)
 * @returns {Object} Response object
 */
function determineSearchResponse(
  products,
  query,
  searchTerms,
  categoryTerms = []
) {
  // Extract price filter from query to include in response
  const priceFilter = extractPriceFilter(query);

  if (!products || products.length === 0) {
    // Extract the category from the query if possible
    let categoryName = "";

    if (query.toLowerCase().includes("electronics")) {
      categoryName = "Electronics";
    } else if (query.toLowerCase().includes("furniture")) {
      categoryName = "Furniture";
    } else if (query.toLowerCase().includes("textbooks")) {
      categoryName = "Textbooks";
    } else if (query.toLowerCase().includes("clothing")) {
      categoryName = "Clothing";
    } else if (query.toLowerCase().includes("miscellaneous")) {
      categoryName = "Miscellaneous";
    }

    const categoryText = categoryName
      ? ` in the ${categoryName} category`
      : " matching your search";

    let noResultsMessage = `I'm sorry, but we don't currently have any products${categoryText}. Would you like to try browsing a different category? You can use the category buttons below.`;

    // Add price filter information to no results message
    if (priceFilter) {
      noResultsMessage +=
        " Your price filter of" +
        require("./search-utils").formatPriceFilter(priceFilter) +
        " was applied.";
    }

    return {
      responseText: noResultsMessage,
      displayProducts: [],
      hasResults: false,
      exactMatchFound: false,
      priceFilter: priceFilter,
    };
  }

  // Step 1: Categories - extract categories from the query if not provided
  const extractedCategoryTerms =
    categoryTerms.length > 0
      ? categoryTerms
      : require("./search-utils").extractCategoryTerms(query);

  // Step 2: Find category matches
  const categoryMatches = products.filter((product) => {
    if (!product.category) return false;

    const productCategory = product.category.toLowerCase();

    return extractedCategoryTerms.some((term) => {
      // Direct category match
      if (productCategory === term) return true;

      // Handle special case for electronics category
      if (
        term === "laptop" &&
        productCategory === "electronics" &&
        (product.name.toLowerCase().includes("laptop") ||
          product.name.toLowerCase().includes("computer"))
      ) {
        return true;
      }

      return false;
    });
  });

  // Step 3: Find products with name/description matches
  const termMatches = products.filter((product) =>
    searchTerms.some(
      (term) =>
        product.name?.toLowerCase().includes(term) ||
        product.description?.toLowerCase().includes(term)
    )
  );

  // Step 4: Find exact match products (highest priority)
  const exactMatches = products.filter((product) => {
    const productName = product.name.toLowerCase();

    // Check if any normalized term exactly matches product name
    for (const term of searchTerms) {
      if (productName === term) return true;

      // Check for full product name in query
      if (query.toLowerCase().includes(productName)) return true;
    }

    return false;
  });

  // Step 5: Combine all match types with priority order
  let displayProducts = [];

  // Add exact matches first (highest priority)
  displayProducts = [...exactMatches];

  // Add term matches next that aren't already included
  termMatches.forEach((product) => {
    if (!displayProducts.some((p) => p.productID === product.productID)) {
      displayProducts.push(product);
    }
  });

  // Add category matches last that aren't already included
  categoryMatches.forEach((product) => {
    if (!displayProducts.some((p) => p.productID === product.productID)) {
      displayProducts.push(product);
    }
  });

  // If we still don't have products, just return all products
  if (displayProducts.length === 0) {
    displayProducts = products;
  }

  // Step 6: Determine the right response template based on match types
  let responseText = "";

  // Base response text based on match type
  if (exactMatches.length > 0) {
    const exactProductNames = exactMatches.map((p) => p.name).join(", ");
    responseText = `I found exactly what you're looking for! Here's the ${exactProductNames}`;
  } else if (termMatches.length > 0) {
    const searchTermText = searchTerms.join(", ");
    responseText = `I found ${termMatches.length} product${
      termMatches.length > 1 ? "s" : ""
    } matching "${searchTermText}"`;
  } else if (categoryMatches.length > 0) {
    const categoryText = extractedCategoryTerms.join(", ");
    responseText = `I found ${categoryMatches.length} product${
      categoryMatches.length > 1 ? "s" : ""
    } in the ${categoryText} category`;
  } else {
    responseText = `Here are some available products that might interest you`;
  }

  // Add price filter information to response
  if (priceFilter) {
    responseText += require("./search-utils").formatPriceFilter(priceFilter);
  }

  // Finalize response text
  responseText += ":";

  return {
    responseText,
    displayProducts,
    hasResults: displayProducts.length > 0,
    exactMatchFound: exactMatches.length > 0,
    priceFilter: priceFilter,
  };
}

module.exports = {
  verifySearchMatch,
  determineSearchResponse,
};
