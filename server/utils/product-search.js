/**
 * Product search functionality
 */

const { extractSearchTerms } = require("./term-utils");
const {
  extractPriceFilter,
  applyPriceFilter,
  normalizeTerms,
} = require("./search-utils");
const { verifySearchMatch } = require("./verification");

/**
 * Searches for products in the database based on a query
 * @param {Object} supabase - Supabase client
 * @param {string} searchQuery - User's search query
 * @returns {Array} Search results
 */
async function searchProducts(supabase, searchQuery) {
  // Extract search terms and price filter
  const extractedTerms = extractSearchTerms(searchQuery);
  const priceFilter = extractPriceFilter(searchQuery);
  const isGeneralSearch =
    extractedTerms.length === 0 ||
    searchQuery.toLowerCase().includes("show me") ||
    searchQuery.toLowerCase().includes("what do you have");

  // Log the incoming query and extracted terms for debugging
  console.log("------ PRODUCT SEARCH DEBUG ------");
  console.log("Original search query:", searchQuery);
  console.log("Extracted terms:", extractedTerms);
  console.log("Is general search:", isGeneralSearch);

  try {
    if (!supabase) {
      return [];
    }

    // Generic product search approach that works for any product type
    let products = [];

    // Check for specific category searches first - look for "show me [category]" pattern
    const specificCategorySearch = searchQuery
      .toLowerCase()
      .match(/show me\s+(\w+)/i);

    if (specificCategorySearch && specificCategorySearch[1]) {
      const requestedCategory = specificCategorySearch[1].toLowerCase().trim();
      console.log("Detected category search for:", requestedCategory);

      // Map of user-friendly category terms to database category values
      const categoryMap = {
        textbooks: "textbooks",
        textbook: "textbooks",
        books: "textbooks",
        book: "textbooks",
        electronics: "electronics",
        electronic: "electronics",
        furniture: "furniture",
        clothing: "clothing",
        clothes: "clothing",
        misc: "miscellaneous",
        miscellaneous: "miscellaneous",
      };

      // If this is a specific category search, directly query that category
      if (categoryMap[requestedCategory]) {
        const targetCategory = categoryMap[requestedCategory];
        console.log(
          `Exact category match: "${requestedCategory}" → "${targetCategory}"`
        );

        // Create a precise category query with case-insensitive match using ilike
        let categoryQuery = supabase
          .from("products")
          .select("*")
          .eq("is_deleted", false)
          .eq("moderation_status", "approved")
          .or("status.eq.available,status.eq.Available")
          .ilike("category", targetCategory); // Case-insensitive match on category

        // Apply price filter if present
        if (priceFilter) {
          categoryQuery = applyPriceFilter(categoryQuery, priceFilter);
        }

        // Execute the query WITHOUT any limit
        const { data: categoryData, error: categoryError } =
          await categoryQuery;

        if (categoryError) {
          console.error("Category query error:", categoryError);
        } else {
          console.log(
            `Found ${
              categoryData?.length || 0
            } products in category "${targetCategory}"`
          );

          if (categoryData && categoryData.length > 0) {
            return categoryData; // Return all products in this category
          } else {
            // Return empty array but with metadata for no results handling
            return {
              noResults: true,
              searchedCategory: targetCategory,
            };
          }
        }
      } else {
        // Try direct search with the raw category term if not in mapping
        // This handles cases where user searches for a valid category not in our map
        console.log(
          `No mapping for "${requestedCategory}", trying direct search`
        );

        let directCategoryQuery = supabase
          .from("products")
          .select("*")
          .eq("is_deleted", false)
          .eq("moderation_status", "approved")
          .or("status.eq.available,status.eq.Available")
          .ilike("category", requestedCategory); // Case-insensitive match on raw category

        const { data: directCategoryData, error: directCategoryError } =
          await directCategoryQuery;

        if (directCategoryError) {
          console.error("Direct category query error:", directCategoryError);
        } else if (directCategoryData && directCategoryData.length > 0) {
          console.log(
            `Found ${directCategoryData.length} products with direct category "${requestedCategory}"`
          );
          return directCategoryData;
        } else {
          return {
            noResults: true,
            searchedCategory: requestedCategory,
          };
        }
      }
    }

    // If we're here, then we either don't have a category search or found no results
    // First, try a direct query based on extracted terms
    if (extractedTerms.length > 0) {
      // Build search conditions for name/description fields
      const searchTerms = normalizeTerms(extractedTerms);
      const searchConditions = searchTerms
        .map((term) => `name.ilike.%${term}%,description.ilike.%${term}%`)
        .join(",");

      // Create query
      let directQuery = supabase
        .from("products")
        .select("*")
        .eq("is_deleted", false)
        .eq("moderation_status", "approved")
        .or(searchConditions)
        .or("status.eq.available,status.eq.Available");

      // Apply price filter if present
      if (priceFilter) {
        directQuery = applyPriceFilter(directQuery, priceFilter);
      }

      // Execute the query
      const { data: directMatches, error: directError } =
        await directQuery.limit(20);

      if (!directError && directMatches && directMatches.length > 0) {
        products = directMatches;
      }
    }

    // If no direct matches, try category-based fuzzy search as a fallback
    if (products.length === 0 && extractedTerms.length > 0) {
      // Create a category-based query
      let categoryQuery = supabase
        .from("products")
        .select("*")
        .eq("is_deleted", false)
        .eq("moderation_status", "approved")
        .or("status.eq.available,status.eq.Available");

      // Add term-category filters
      for (const term of extractedTerms) {
        categoryQuery = categoryQuery.or(`category.ilike.%${term}%`);
      }

      // Apply price filter if present
      if (priceFilter) {
        categoryQuery = applyPriceFilter(categoryQuery, priceFilter);
      }

      // Execute the query
      const { data: categoryData, error: categoryError } =
        await categoryQuery.limit(20);

      if (!categoryError && categoryData && categoryData.length > 0) {
        products = categoryData;
      }
    }

    // IMPROVED FALLBACK: Always show something for general searches
    if (products.length === 0) {
      // Build a simpler query that searches all text fields
      let fallbackQuery = supabase
        .from("products")
        .select("*")
        .eq("is_deleted", false)
        .eq("moderation_status", "approved")
        .or("status.eq.available,status.eq.Available");

      // Apply price filter if present
      if (priceFilter) {
        fallbackQuery = applyPriceFilter(fallbackQuery, priceFilter);
      }

      // For general searches, order by most recent first
      if (isGeneralSearch) {
        fallbackQuery = fallbackQuery.order("created_at", { ascending: false });
      }

      const { data: fallbackData, error: fallbackError } =
        await fallbackQuery.limit(12);

      if (!fallbackError && fallbackData && fallbackData.length > 0) {
        products = fallbackData;
      }
    }

    // Verify and rank products if we found any
    if (products.length > 0) {
      const verificationResult = verifySearchMatch(products, searchQuery);

      // If we have a strong match, prioritize those products
      if (verificationResult.hasStrongMatch && !isGeneralSearch) {
        // Create a scoring function based on relevance
        const scoredProducts = products.map((product) => {
          let score = 0;

          // Check for exact product name matches
          if (
            verificationResult.exactMatches.some(
              (match) => match.productId === product.productID
            )
          ) {
            score += 20; // Highest score for exact matches
          }

          // Check for term matches in product name
          for (const term of extractedTerms) {
            if (product.name?.toLowerCase().includes(term)) {
              score += 10;
            }
            if (product.description?.toLowerCase().includes(term)) {
              score += 5;
            }
            if (product.category?.toLowerCase() === term) {
              score += 8;
            }
          }

          return { product, score };
        });

        // Sort by score (highest first)
        scoredProducts.sort((a, b) => b.score - a.score);

        // Return sorted products
        return scoredProducts.map((item) => item.product);
      }
    }

    console.log(`Returning ${products.length} products from search`);
    return products || [];
  } catch (error) {
    console.error("Product search error:", error);
    return [];
  }
}

module.exports = {
  searchProducts,
};
