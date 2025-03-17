/**
 * Utilities for extracting product information from messages
 */

/**
 * Extracts products from message content
 * This function detects and extracts product data from message content
 *
 * @param {string} messageContent - The content of a message
 * @returns {Array} - Array of extracted products or empty array
 */
export const extractProductsFromMessage = (messageContent) => {
  try {
    // First try to extract from VERIFIED_PRODUCTS format (Karpathy approach)
    const verifiedRegex =
      /VERIFIED_PRODUCTS_START(\[[\s\S]*?\])VERIFIED_PRODUCTS_END/;
    const verifiedMatch = messageContent.match(verifiedRegex);

    if (verifiedMatch && verifiedMatch[1]) {
      // Found VERIFIED_PRODUCTS in message
      const rawProducts = JSON.parse(verifiedMatch[1]);

      // Clean products by removing verification codes
      return rawProducts.map((product) => {
        const cleanProduct = { ...product };
        if (cleanProduct._vcode) {
          // Verify the code format matches our expected pattern
          if (
            cleanProduct._vcode.startsWith("VP") &&
            cleanProduct._vcode.substring(2) ===
              cleanProduct.productID.toString()
          ) {
            // Product verified
          } else {
            // Product verification failed
          }
          // Remove verification code regardless
          delete cleanProduct._vcode;
        }
        return cleanProduct;
      });
    }

    // Fall back to DATABASE_PRODUCTS format
    const dbRegex =
      /DATABASE_PRODUCTS_START(\[[\s\S]*?\])DATABASE_PRODUCTS_END/;
    const dbMatch = messageContent.match(dbRegex);

    if (dbMatch && dbMatch[1]) {
      // Found DATABASE_PRODUCTS in message
      return JSON.parse(dbMatch[1]);
    }

    // If no structured data, try to extract markdown tables (simplified)
    if (messageContent.includes("|") && messageContent.includes("-|-")) {
      return extractProductsFromMarkdown(messageContent);
    }

    // Nothing found, return empty array
    return [];
  } catch (error) {
    // Error extracting products
    return [];
  }
};

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
