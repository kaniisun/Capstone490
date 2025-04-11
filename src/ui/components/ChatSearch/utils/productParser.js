/**
 * Utilities for extracting product information from messages
 */

/**
 * Extracts products from message content
 * This function detects and extracts product data from message content
 *
 * @param {string} content - The content of a message
 * @returns {Array} - Array of extracted products or empty array
 */
export function extractProductsFromMessage(content) {
  if (!content) return [];

  // First, check for verified products data (from Supabase products)
  // This is the format used for direct database query results
  if (
    content.includes("VERIFIED_PRODUCTS_START") &&
    content.includes("VERIFIED_PRODUCTS_END")
  ) {
    try {
      // Extract the JSON string between the markers
      const productsJSON = content
        .split("VERIFIED_PRODUCTS_START")[1]
        .split("VERIFIED_PRODUCTS_END")[0];

      // Parse the JSON into an array of product objects
      const products = JSON.parse(productsJSON);

      // Log for debugging - important for category search debugging
      console.log(
        `Extracted ${products.length} verified products from message`
      );

      // Log category distribution to help debug category search
      if (products && products.length > 0) {
        const categoryDistribution = products.reduce((acc, product) => {
          const category = (product.category || "unknown").toLowerCase();
          acc[category] = (acc[category] || 0) + 1;
          return acc;
        }, {});
        console.log("Category distribution:", categoryDistribution);
      }

      return products;
    } catch (e) {
      console.error("Error parsing verified products data:", e);
      return [];
    }
  }

  // Fallback to database products format (alternative format)
  if (
    content.includes("DATABASE_PRODUCTS_START") &&
    content.includes("DATABASE_PRODUCTS_END")
  ) {
    try {
      // Extract the JSON string between the markers
      const productsJSON = content
        .split("DATABASE_PRODUCTS_START")[1]
        .split("DATABASE_PRODUCTS_END")[0];

      // Parse the JSON into an array of product objects
      const products = JSON.parse(productsJSON);
      console.log("Extracted database products from message:", products.length);
      return products;
    } catch (e) {
      console.error("Error parsing database products data:", e);
      return [];
    }
  }

  // If no structured data, try to extract markdown tables (simplified)
  if (content.includes("|") && content.includes("-|-")) {
    return extractProductsFromMarkdown(content);
  }

  // Nothing found, return empty array
  return [];
}

/**
 * Extract products from markdown tables
 * Note: This is a very simplified implementation
 *
 * @param {string} markdown - Markdown content
 * @returns {Array} - Array of products
 */
const extractProductsFromMarkdown = (markdown) => {
  try {
    const lines = markdown.split("\n");
    const products = [];
    let inTable = false;
    let headers = [];

    for (const line of lines) {
      const trimmedLine = line.trim();

      // Table header detection
      if (
        trimmedLine.startsWith("|") &&
        trimmedLine.includes("Name") &&
        trimmedLine.includes("Price")
      ) {
        headers = trimmedLine
          .split("|")
          .map((h) => h.trim())
          .filter((h) => h);
        inTable = true;
        continue;
      }

      // Skip divider line
      if (
        inTable &&
        trimmedLine.startsWith("|") &&
        trimmedLine.includes("-|-")
      ) {
        continue;
      }

      // Process table row
      if (
        inTable &&
        trimmedLine.startsWith("|") &&
        !trimmedLine.includes("-|-")
      ) {
        const cells = trimmedLine
          .split("|")
          .map((c) => c.trim())
          .filter((c) => c);

        if (cells.length >= 2) {
          const product = {
            name: cells[headers.findIndex((h) => h.includes("Name")) || 0],
            price: parsePrice(
              cells[headers.findIndex((h) => h.includes("Price")) || 1]
            ),
          };

          // Add other fields if available
          const descIndex = headers.findIndex((h) => h.includes("Description"));
          if (descIndex !== -1 && cells[descIndex]) {
            product.description = cells[descIndex];
          }

          const condIndex = headers.findIndex((h) => h.includes("Condition"));
          if (condIndex !== -1 && cells[condIndex]) {
            product.condition = cells[condIndex];
          }

          // Generate a placeholder ID
          product.id = `extracted-${products.length + 1}`;
          product.productID = product.id;

          products.push(product);
        }
      }

      // End of table detection
      if (inTable && !trimmedLine.startsWith("|")) {
        inTable = false;
      }
    }

    return products;
  } catch (error) {
    // Error parsing markdown
    return [];
  }
};

/**
 * Parse price from various formats
 *
 * @param {string} priceStr - Price as string
 * @returns {number} - Parsed price or 0
 */
const parsePrice = (priceStr) => {
  try {
    if (!priceStr) return 0;

    // Remove currency symbols and commas
    const cleaned = priceStr.replace(/[$,]/g, "");
    const match = cleaned.match(/\d+(\.\d+)?/);

    if (match) {
      return parseFloat(match[0]);
    }

    return 0;
  } catch (error) {
    return 0;
  }
};
