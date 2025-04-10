/**
 * Product Service
 * Handles database operations for product listings
 */

import { supabase } from "../supabaseClient.js";

// Default values for product fields
const DEFAULT_PRODUCT = {
  name: "Unnamed Product",
  price: 0,
  description: "No description provided",
  condition: "used",
  category: "miscellaneous",
  status: "available",
  is_bundle: false,
  flag: false,
  hide: false,
  moderation_status: "pending",
  is_deleted: false,
};

// Allowed categories and conditions
const VALID_CATEGORIES = [
  "electronics",
  "furniture",
  "textbooks",
  "clothing",
  "miscellaneous",
];
const VALID_CONDITIONS = ["new", "like_new", "good", "fair", "poor"];

/**
 * Creates a new product listing in the database
 *
 * @param {Object} productData - Product data to create
 * @param {string} userId - User ID who created the product
 * @returns {Promise<Object>} Promise resolving to the created product
 */
export const createProduct = async (productData, userId) => {
  if (!userId) {
    throw new Error("User ID is required to create a product");
  }

  // Validate and sanitize product data
  const sanitizedProduct = sanitizeProductData({
    ...productData,
    userID: userId,
  });

  // Add timestamps
  const now = new Date().toISOString();
  sanitizedProduct.created_at = now;
  sanitizedProduct.modified_at = now;

  try {
    // Insert product into database
    const { data, error } = await supabase
      .from("products")
      .insert([sanitizedProduct])
      .select();

    if (error) {
      console.error("Error creating product:", error);
      throw new Error(`Database error: ${error.message}`);
    }

    if (!data || data.length === 0) {
      throw new Error("Product was not created properly");
    }

    console.log("Product created successfully:", data[0].productID);
    return data[0];
  } catch (error) {
    console.error("Failed to create product:", error);
    throw error;
  }
};

/**
 * Updates an existing product in the database
 *
 * @param {number} productId - Product ID to update
 * @param {Object} productData - Product data to update
 * @param {string} userId - User ID for authorization
 * @returns {Promise<Object>} Promise resolving to the updated product
 */
export const updateProduct = async (productId, productData, userId) => {
  if (!productId) {
    throw new Error("Product ID is required");
  }

  if (!userId) {
    throw new Error("User ID is required for authorization");
  }

  // Validate and sanitize product data
  const sanitizedProduct = sanitizeProductData(productData);

  // Add timestamp
  sanitizedProduct.modified_at = new Date().toISOString();

  try {
    // First check if user owns this product
    const { data: productCheck, error: checkError } = await supabase
      .from("products")
      .select("userID, productID")
      .eq("productID", productId)
      .single();

    if (checkError) {
      console.error("Error checking product:", checkError);
      throw new Error(`Database error: ${checkError.message}`);
    }

    if (!productCheck) {
      throw new Error("Product not found");
    }

    if (productCheck.userID !== userId) {
      throw new Error(
        "Unauthorized: You do not have permission to update this product"
      );
    }

    // Update product
    const { data, error } = await supabase
      .from("products")
      .update(sanitizedProduct)
      .eq("productID", productId)
      .select();

    if (error) {
      console.error("Error updating product:", error);
      throw new Error(`Database error: ${error.message}`);
    }

    if (!data || data.length === 0) {
      throw new Error("Product was not updated properly");
    }

    console.log("Product updated successfully:", productId);
    return data[0];
  } catch (error) {
    console.error("Failed to update product:", error);
    throw error;
  }
};

/**
 * Sanitizes and validates product data
 *
 * @param {Object} productData - Raw product data
 * @returns {Object} Sanitized product data
 */
export const sanitizeProductData = (productData) => {
  // Start with default values
  const sanitized = { ...DEFAULT_PRODUCT };

  // Validate name (required, string, length)
  if (productData.name) {
    sanitized.name = String(productData.name).trim().substring(0, 100);
  }

  // Validate price (required, number, positive)
  if (productData.price !== undefined) {
    const price = parseFloat(productData.price);
    sanitized.price = !isNaN(price) && price >= 0 ? price : 0;
  }

  // Validate description (required, string, length)
  if (productData.description) {
    sanitized.description = String(productData.description).trim();
    // Sanitize description to remove any potentially unsafe content
    // This is a simple example - consider using a library like DOMPurify in production
    sanitized.description = sanitized.description
      .replace(/<script[^>]*>.*?<\/script>/gi, "") // Remove script tags
      .replace(/<[^>]*>/g, ""); // Remove HTML tags
  }

  // Validate image URL - only use the existing 'image' field
  if (productData.imageUrl) {
    // If imageUrl is provided, save it to the image field
    sanitized.image = String(productData.imageUrl).trim();
  } else if (productData.image) {
    sanitized.image = String(productData.image).trim();
  }

  // Add logging to help with debugging
  console.log("Sanitized product image URL:", {
    originalImage: productData.image,
    originalImageUrl: productData.imageUrl,
    sanitizedImage: sanitized.image,
  });

  // Validate condition (enum)
  if (
    productData.condition &&
    VALID_CONDITIONS.includes(productData.condition)
  ) {
    sanitized.condition = productData.condition;
  }

  // Validate category (enum)
  if (productData.category && VALID_CATEGORIES.includes(productData.category)) {
    sanitized.category = productData.category;
  }

  // Transfer other fields
  if (productData.userID) sanitized.userID = productData.userID;
  if (productData.status) sanitized.status = productData.status;
  if (productData.is_bundle !== undefined)
    sanitized.is_bundle = Boolean(productData.is_bundle);
  if (productData.flag !== undefined)
    sanitized.flag = Boolean(productData.flag);
  if (productData.hide !== undefined)
    sanitized.hide = Boolean(productData.hide);
  if (productData.is_deleted !== undefined)
    sanitized.is_deleted = Boolean(productData.is_deleted);

  // Moderation status always starts as 'pending' for new products
  sanitized.moderation_status = "pending";

  return sanitized;
};

/**
 * Gets a product by ID
 *
 * @param {number} productId - Product ID to retrieve
 * @returns {Promise<Object|null>} Promise resolving to the product or null if not found
 */
export const getProductById = async (productId) => {
  try {
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .eq("productID", productId)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        // PGRST116 = "Results contain 0 rows"
        return null; // Product not found
      }
      throw new Error(`Database error: ${error.message}`);
    }

    return data;
  } catch (error) {
    console.error("Error fetching product:", error);
    throw error;
  }
};

/**
 * Gets all products for a user
 *
 * @param {string} userId - User ID to get products for
 * @param {Object} options - Query options (limit, offset, includeDeleted)
 * @returns {Promise<Array>} Promise resolving to an array of products
 */
export const getUserProducts = async (userId, options = {}) => {
  const { limit = 50, offset = 0, includeDeleted = false } = options;

  try {
    let query = supabase
      .from("products")
      .select("*")
      .eq("userID", userId)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    // Filter out deleted products unless includeDeleted is true
    if (!includeDeleted) {
      query = query.eq("is_deleted", false);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }

    return data || [];
  } catch (error) {
    console.error("Error fetching user products:", error);
    throw error;
  }
};

export default {
  createProduct,
  updateProduct,
  getProductById,
  getUserProducts,
  sanitizeProductData,
  DEFAULT_PRODUCT,
  VALID_CATEGORIES,
  VALID_CONDITIONS,
};
