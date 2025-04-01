const express = require("express");
const router = express.Router();
const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

// Initialize Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Middleware for logging
router.use((req, res, next) => {
  console.log(
    `[${new Date().toISOString()}] POST /api/delete-product accessed from ${
      req.get("origin") || "unknown"
    }`
  );
  console.log("Request body:", JSON.stringify(req.body));
  next();
});

// Verify user is authenticated and owns the product or is an admin
const verifyPermission = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      console.log("No authorization header provided");
      return res.status(401).json({
        success: false,
        message: "Authentication required",
        requestSource: "api/delete-product",
      });
    }

    const token = authHeader.split(" ")[1];
    if (!token) {
      console.log("No token provided in authorization header");
      return res.status(401).json({
        success: false,
        message: "Authentication token required",
        requestSource: "api/delete-product",
      });
    }

    // Get user from token
    const { data: userData, error: userError } = await supabase.auth.getUser(
      token
    );
    if (userError || !userData.user) {
      console.log("Invalid token or user not found:", userError);
      return res.status(401).json({
        success: false,
        message: "Invalid authentication token",
        error: userError,
        requestSource: "api/delete-product",
      });
    }

    // Check if the productId is provided
    const { productId } = req.body;
    if (!productId) {
      return res.status(400).json({
        success: false,
        message: "Product ID is required",
        requestSource: "api/delete-product",
      });
    }

    // Get the product
    const { data: product, error: productError } = await supabase
      .from("products")
      .select("userID, productID")
      .eq("productID", productId)
      .single();

    if (productError) {
      console.error("Error fetching product:", productError);
      return res.status(404).json({
        success: false,
        message: "Product not found",
        error: productError.message,
        requestSource: "api/delete-product",
      });
    }

    // Check user role - Updated to use userID column
    const { data: userRecord, error: userRecordError } = await supabase
      .from("users")
      .select("role")
      .eq("userID", userData.user.id)
      .single();

    if (userRecordError) {
      console.log("User record not found:", userRecordError);
      return res.status(401).json({
        success: false,
        message: "Unable to verify user permissions",
        error: userRecordError.message,
        requestSource: "api/delete-product",
      });
    }

    // Allow if user is product owner or is an admin
    const isAdmin = userRecord.role === "admin";
    const isOwner = product.userID === userData.user.id;

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: "You don't have permission to delete this product",
        requestSource: "api/delete-product",
      });
    }

    // Add user to request for later use
    req.user = userData.user;
    req.product = product;
    req.isAdmin = isAdmin;
    next();
  } catch (error) {
    console.error("Error verifying permissions:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while verifying permissions",
      error: error.message,
      requestSource: "api/delete-product",
    });
  }
};

// POST /api/delete-product
router.post("/", verifyPermission, async (req, res) => {
  try {
    const { productId } = req.body;
    const requestSource = "api/delete-product";

    console.log(`Processing delete request for product ID: ${productId}`);

    // Update the product to set is_deleted = true (soft delete)
    const { data, error } = await supabase
      .from("products")
      .update({
        is_deleted: true,
        modified_at: new Date().toISOString(),
      })
      .eq("productID", productId);

    if (error) {
      console.error("Error soft deleting product:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to delete product",
        error: error.message,
        requestSource,
      });
    }

    // Log the action for security auditing
    console.log(
      `Product ${productId} soft deleted successfully by user ${req.user.id}`
    );

    res.status(200).json({
      success: true,
      message: "Product deleted successfully",
      productId,
      requestSource,
    });
  } catch (error) {
    console.error("Error in delete-product endpoint:", error);
    res.status(500).json({
      success: false,
      message: "Server error while deleting product",
      error: error.message,
      requestSource: "api/delete-product",
    });
  }
});

module.exports = router;
