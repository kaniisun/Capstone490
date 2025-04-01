const express = require("express");
const router = express.Router();
const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

// Initialize Supabase client with timeout and retry options
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
  db: {
    schema: "public",
  },
  global: {
    headers: { "x-my-custom-header": "my-app-name" },
  },
  // Add timeout settings
  request: {
    timeout: 10000, // 10 seconds timeout
  },
});

// Middleware for logging
router.use((req, res, next) => {
  console.log(
    `[${new Date().toISOString()}] POST /api/moderate-product accessed from ${
      req.get("origin") || "unknown"
    }`
  );
  if (req.body) {
    console.log("Request body:", JSON.stringify(req.body));
  }
  next();
});

// Verify user is authenticated and is an admin
const verifyAdmin = async (req, res, next) => {
  const requestTimeout = setTimeout(() => {
    console.error("Admin verification timed out");
    return res.status(504).json({
      success: false,
      message: "Request timed out while verifying admin status",
      requestSource: "api/moderate-product",
    });
  }, 15000); // 15 second timeout

  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      clearTimeout(requestTimeout);
      console.log("No authorization header provided");
      return res.status(401).json({
        success: false,
        message: "No authorization header provided",
        requestSource: "api/moderate-product",
      });
    }

    const token = authHeader.split(" ")[1];
    if (!token) {
      clearTimeout(requestTimeout);
      console.log("No token provided in authorization header");
      return res.status(401).json({
        success: false,
        message: "No token provided in authorization header",
        requestSource: "api/moderate-product",
      });
    }

    // Get user from token with timeout
    const userPromise = supabase.auth.getUser(token);
    const { data: userData, error: userError } = await Promise.race([
      userPromise,
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("User verification timed out")), 5000)
      ),
    ]);

    if (userError || !userData.user) {
      clearTimeout(requestTimeout);
      console.log("Invalid token or user not found:", userError);
      return res.status(401).json({
        success: false,
        message: "Invalid token or user not found",
        error: userError,
        requestSource: "api/moderate-product",
      });
    }

    // Check if user is admin with timeout
    const userRecordPromise = supabase
      .from("users")
      .select("role")
      .eq("userID", userData.user.id)
      .single();

    console.log(`Checking admin role for user ID: ${userData.user.id}`);

    const { data: userRecord, error: userRecordError } = await Promise.race([
      userRecordPromise,
      new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error("User role verification timed out")),
          5000
        )
      ),
    ]);

    if (userRecordError) {
      clearTimeout(requestTimeout);
      console.log(
        `User record error for ID ${userData.user.id}:`,
        userRecordError
      );
      console.log(`Detailed error:`, JSON.stringify(userRecordError, null, 2));
      return res.status(401).json({
        success: false,
        message: "User record not found",
        error: userRecordError,
        requestSource: "api/moderate-product",
      });
    }

    if (!userRecord) {
      clearTimeout(requestTimeout);
      console.log(`No user record found for ID ${userData.user.id}`);
      return res.status(401).json({
        success: false,
        message: "User record not found in database",
        requestSource: "api/moderate-product",
      });
    }

    console.log(`User role for ID ${userData.user.id}: ${userRecord.role}`);

    if (userRecord.role !== "admin") {
      clearTimeout(requestTimeout);
      console.log(
        `User ${userData.user.id} has insufficient role: ${userRecord.role}`
      );
      return res.status(403).json({
        success: false,
        message: "Unauthorized. Only admins can access this endpoint",
        requestSource: "api/moderate-product",
      });
    }

    // Add user to request for later use
    req.user = userData.user;
    clearTimeout(requestTimeout);
    next();
  } catch (error) {
    clearTimeout(requestTimeout);
    console.error("Error verifying admin:", error);
    return res.status(error.message.includes("timed out") ? 504 : 500).json({
      success: false,
      message: error.message.includes("timed out")
        ? "Request timed out while verifying admin status"
        : "Server error while verifying admin status",
      error: error.message,
      requestSource: "api/moderate-product",
    });
  }
};

// POST /api/moderate-product - Update product moderation status
router.post("/", verifyAdmin, async (req, res) => {
  const requestTimeout = setTimeout(() => {
    console.error("Product moderation request timed out");
    return res.status(504).json({
      success: false,
      message: "Request timed out while moderating product",
      requestSource: "api/moderate-product",
    });
  }, 15000); // 15 second timeout

  try {
    const { productId, status, reason } = req.body;
    const requestSource = "api/moderate-product";

    // Validate input
    if (!productId) {
      clearTimeout(requestTimeout);
      return res.status(400).json({
        success: false,
        message: "Product ID is required",
        requestSource,
      });
    }

    if (
      !status ||
      !["approved", "rejected", "archived", "pending"].includes(status)
    ) {
      clearTimeout(requestTimeout);
      return res.status(400).json({
        success: false,
        message:
          "Valid status is required (approved, rejected, archived, or pending)",
        requestSource,
      });
    }

    // Require reason for rejection
    if (status === "rejected" && !reason) {
      clearTimeout(requestTimeout);
      return res.status(400).json({
        success: false,
        message: "Reason is required when rejecting a product",
        requestSource,
      });
    }

    // Handle productId conversion if needed
    const productIdValue =
      typeof productId === "string" && !isNaN(Number(productId))
        ? Number(productId)
        : productId;

    console.log(
      `Original productId: ${productId}, converted to ${productIdValue} (${typeof productIdValue})`
    );

    // Check if product exists with timeout
    const productPromise = supabase
      .from("products")
      .select("productID, status")
      .eq("productID", productIdValue)
      .single();

    const { data: product, error: productError } = await Promise.race([
      productPromise,
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Product lookup timed out")), 5000)
      ),
    ]);

    if (productError) {
      clearTimeout(requestTimeout);
      console.error("Error finding product:", productError);
      return res.status(404).json({
        success: false,
        message: "Product not found",
        error: productError.message,
        requestSource,
      });
    }

    // Update product moderation status with timeout
    const updates = {
      moderation_status: status,
      moderation_reason: status === "rejected" ? reason : null,
      modified_at: new Date().toISOString(),
    };

    console.log(
      `Using existing fields only: moderation_status, moderation_reason, and modified_at`
    );

    // If rejected or archived, also update product status to unavailable
    if (status === "rejected" || status === "archived") {
      updates.status = "unavailable";
    }

    console.log(
      `Attempting to update product ID: ${productIdValue} with:`,
      updates
    );
    console.log(`Product ID type: ${typeof productIdValue}`);

    // Try fetching the product again to verify it exists
    const verifyProduct = await supabase
      .from("products")
      .select("productID")
      .eq("productID", productIdValue);

    if (verifyProduct.error) {
      console.error(
        `Verification error for product ${productIdValue}:`,
        verifyProduct.error
      );
    } else {
      console.log(`Product verification result:`, verifyProduct.data);
    }

    const updatePromise = supabase
      .from("products")
      .update(updates)
      .eq("productID", productIdValue);

    console.log(
      `Update SQL query:`,
      supabase
        .from("products")
        .update(updates)
        .eq("productID", productIdValue)
        .toSQL?.() || "Query SQL not available"
    );

    const { data: updateData, error: updateError } = await Promise.race([
      updatePromise,
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Product update timed out")), 5000)
      ),
    ]);

    if (updateError) {
      clearTimeout(requestTimeout);
      console.error("Error updating product:", updateError);
      console.error(
        "Detailed updateError:",
        JSON.stringify(updateError, null, 2)
      );
      return res.status(500).json({
        success: false,
        message: "Error updating product moderation status",
        error: updateError.message,
        requestSource,
      });
    }

    // Set proper headers to avoid 406 errors
    clearTimeout(requestTimeout);
    res.setHeader("Content-Type", "application/json");
    return res.status(200).json({
      success: true,
      message: `Product ${productIdValue} has been ${status}`,
      productId: productIdValue,
      status,
      requestSource,
    });
  } catch (error) {
    clearTimeout(requestTimeout);
    console.error("Error in /api/moderate-product:", error);
    return res.status(error.message.includes("timed out") ? 504 : 500).json({
      success: false,
      message: error.message.includes("timed out")
        ? "Request timed out while moderating product"
        : "Server error",
      error: error.message,
      requestSource: "api/moderate-product",
    });
  }
});

module.exports = router;
