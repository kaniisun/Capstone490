const express = require("express");
const cors = require("cors");
const { OpenAI } = require("openai");
const { createClient } = require("@supabase/supabase-js");
const path = require("path");
require("dotenv").config();

// Import route modules
const moderateProductsRoutes = require("./api/moderate-products");
const moderateProductRoute = require("./api/moderate-product");
const deleteProductRoute = require("./api/delete-product");

/*
 * IMPORTANT NOTE FOR CLIENT-SERVER COMMUNICATION:
 *
 * When accessing these API endpoints from the client:
 * 1. For development: Ensure your frontend has a proxy configured to forward API requests to this server
 *    - In package.json (React), add: "proxy": "http://localhost:3001"
 *    - Or configure your API client/fetch calls to use the full server URL: http://localhost:3001/api/...
 *
 * 2. For production: Configure your frontend to use the appropriate backend URL
 *
 * Available User Management Endpoints:
 * - POST /api/update-user-role - Update a user's role
 * - POST /api/enforce-account-status - Update a user's account status
 * - POST /make-admin - Promote a user to admin
 * - POST /soft-delete - Soft delete a user
 * - POST /reinstate - Reinstate a soft-deleted user
 */

// Import utility modules
const {
  normalizeTerms,
  extractPriceFilter,
  formatPriceFilter,
} = require("./utils/search-utils");
const {
  extractSearchTerms,
  isProductSearchQuery,
} = require("./utils/term-utils");
const {
  verifySearchMatch,
  determineSearchResponse,
} = require("./utils/verification");
const { searchProducts } = require("./utils/product-search");

// Check required environment variables with fallback to REACT_APP_ prefixed variables
const requiredEnvVars = [
  {
    name: "OPENAI_API_KEY",
    fallback: "REACT_APP_OPENAI_API_KEY",
  },
  {
    name: "SUPABASE_URL",
    fallback: "REACT_APP_SUPABASE_URL",
  },
  {
    name: "SUPABASE_SERVICE_ROLE_KEY",
    fallback: "REACT_APP_SUPABASE_SERVICE_ROLE_KEY",
  },
];

const missingVars = requiredEnvVars.filter((envVar) => {
  // Check if the main variable exists
  if (process.env[envVar.name]) {
    return false;
  }

  // If not, check if there's a fallback and if it exists
  if (envVar.fallback && process.env[envVar.fallback]) {
    // Make the main variable available using the fallback value
    process.env[envVar.name] = process.env[envVar.fallback];
    console.log(`Using ${envVar.fallback} as fallback for ${envVar.name}`);
    return false;
  }

  // No value found in either variable
  return true;
});

if (missingVars.length > 0) {
  console.error(
    `Error: Missing required environment variables:\n  - ${missingVars
      .map((v) => v.name)
      .join("\n  - ")}\n\nPlease create a .env file with these variables.`
  );
  process.exit(1);
}

console.log("✓ Environment configuration verified");

const app = express();

// Enhanced CORS configuration - MUST come before routes
app.use(
  cors({
    origin:
      process.env.NODE_ENV === "production"
        ? process.env.ALLOWED_ORIGIN || "http://localhost:3000"
        : ["http://localhost:3000", "http://localhost:3001"],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "Accept"],
    credentials: true,
    optionsSuccessStatus: 200,
  })
);

app.use(express.json());

// Register API routes first, before any middleware or catch-all handlers
app.use("/api/moderate-products", moderateProductsRoutes);
app.use("/api/moderate-product", moderateProductRoute);
app.use("/api/delete-product", deleteProductRoute);

// Enhanced request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  console.log(
    `[${new Date().toISOString()}] ${req.method} ${req.path} - Request received`
  );

  // Log request body for debugging (but mask sensitive data)
  if (req.method !== "GET") {
    const sanitizedBody = { ...req.body };
    // Mask sensitive fields
    if (sanitizedBody.password) sanitizedBody.password = "******";
    if (sanitizedBody.key) sanitizedBody.key = "******";
    if (sanitizedBody.SUPABASE_SERVICE_ROLE_KEY)
      sanitizedBody.SUPABASE_SERVICE_ROLE_KEY = "******";
    console.log("Request body:", JSON.stringify(sanitizedBody));
  }

  // Track response time
  res.on("finish", () => {
    const duration = Date.now() - start;
    console.log(
      `[${new Date().toISOString()}] ${req.method} ${
        req.path
      } - Response sent (${res.statusCode}) - ${duration}ms`
    );
  });

  next();
});

// Configuration constants
const STRICT_MODE = true; // Set to true to prevent ANY hallucination possibility
const ENABLE_VERIFICATION = true; // Enable verification

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Initialize Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

// Add a simple test endpoint
app.get("/api/test", (req, res) => {
  res.json({
    message: "Server is working!",
    timestamp: new Date().toISOString(),
  });
});

// Health check endpoint for connection testing
app.get("/api/health-check", (req, res) => {
  res.json({
    status: "ok",
    server: true,
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
    apis: {
      update_user_role: true,
      enforce_account_status: true,
      chat: true,
    },
  });
});

// Add a database diagnostic endpoint
app.get("/api/db-test", async (req, res) => {
  try {
    // Test basic connection with a count query
    const {
      data,
      count,
      error: countError,
    } = await supabase
      .from("products")
      .select("*", { count: "exact", head: true });

    if (countError) {
      return res.status(500).json({
        success: false,
        message: "Database connection error",
        error: countError,
      });
    }

    // Get a few sample products
    const { data: sampleData, error } = await supabase
      .from("products")
      .select("*")
      .limit(3);

    if (error) {
      return res.status(500).json({
        success: false,
        message: "Failed to fetch sample products",
        error: error,
      });
    }

    res.json({
      success: true,
      message: "Database connection successful",
      totalProducts: count,
      sampleProducts: sampleData || [],
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error testing database connection",
      error: error.message,
    });
  }
});

// Add a detailed diagnostics endpoint for Supabase connection
app.get("/api/diagnostics", async (req, res) => {
  try {
    const diagnostics = {
      supabase: {
        url: process.env.SUPABASE_URL ? "Configured" : "Missing",
        key: process.env.SUPABASE_SERVICE_ROLE_KEY
          ? "Configured (Hidden)"
          : "Missing",
        config: {
          auth: supabase.auth instanceof Object,
          headers: supabase?.rest?.headers || "Unknown",
        },
      },
      tests: {
        users: null,
        products: null,
        auth: null,
      },
      timestamp: new Date().toISOString(),
    };

    // Test users table
    try {
      const { count, error } = await supabase
        .from("users")
        .select("*", { count: "exact", head: true });

      diagnostics.tests.users = {
        success: !error,
        count: error ? null : count,
        error: error ? error.message : null,
      };
    } catch (err) {
      diagnostics.tests.users = {
        success: false,
        error: err.message,
      };
    }

    // Test products table
    try {
      const { count, error } = await supabase
        .from("products")
        .select("*", { count: "exact", head: true });

      diagnostics.tests.products = {
        success: !error,
        count: error ? null : count,
        error: error ? error.message : null,
      };
    } catch (err) {
      diagnostics.tests.products = {
        success: false,
        error: err.message,
      };
    }

    // Test auth
    try {
      const { data, error } = await supabase.auth.admin.listUsers({
        page: 1,
        perPage: 1,
      });

      diagnostics.tests.auth = {
        success: !error,
        data: error ? null : "Service role auth working",
        error: error ? error.message : null,
      };
    } catch (err) {
      diagnostics.tests.auth = {
        success: false,
        error: err.message,
      };
    }

    res.json(diagnostics);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error running diagnostics",
      error: error.message,
    });
  }
});

// CONSOLIDATED USER MANAGEMENT ENDPOINTS

// API endpoint to promote a user to admin
app.post("/api/make-admin", async (req, res) => {
  try {
    const { userId } = req.body;
    const requestSource =
      req.get("host") === "localhost:3001" ? "direct" : "proxy";

    // Log received request
    console.log(
      `Received request to promote user to admin (${requestSource}):`,
      {
        userId,
      }
    );

    // Validate inputs
    if (!userId) {
      return res.status(400).json({
        success: false,
        error: "User ID is required",
        requestSource,
      });
    }

    // First check if user exists in the database
    const { data: userData, error: userCheckError } = await supabase
      .from("users")
      .select("userID, role")
      .eq("userID", userId)
      .single();

    if (userCheckError && userCheckError.code !== "PGRST116") {
      console.error("Error checking if user exists:", userCheckError);
      return res.status(500).json({
        success: false,
        error: userCheckError.message,
        requestSource,
      });
    }

    if (!userData) {
      console.warn(
        `User with ID ${userId} not found, but will attempt to update role in database anyway`
      );
    } else if (userData.role === "admin") {
      return res.status(200).json({
        success: true,
        message: "User is already an admin",
        userId,
        requestSource,
      });
    }

    // Update the database (users table)
    const { data: dbData, error: dbError } = await supabase
      .from("users")
      .update({
        role: "admin",
        modified_at: new Date().toISOString(),
      })
      .eq("userID", userId);

    if (dbError) {
      console.error("Error updating user in database:", dbError);
      return res.status(500).json({
        success: false,
        error: dbError.message,
        requestSource,
      });
    }

    // Then update user metadata in Supabase Auth
    try {
      const { data: authData, error: authError } =
        await supabase.auth.admin.updateUserById(userId, {
          user_metadata: { role: "admin", isAdmin: true },
          app_metadata: { role: "admin", isAdmin: true },
        });

      if (authError) {
        console.error("Error updating user in Auth:", authError);
        // Still return a partial success since the database was updated
        return res.status(200).json({
          message: "User promoted to admin in database, but Auth update failed",
          warning: authError.message,
          userId,
          requestSource,
          success: true,
          partial: true,
        });
      }
    } catch (authException) {
      console.error("Exception when updating Auth metadata:", authException);
      return res.status(200).json({
        message:
          "User promoted to admin in database, but Auth update failed with exception",
        warning: authException.message,
        userId,
        requestSource,
        success: true,
        partial: true,
      });
    }

    // Log the action for security auditing
    console.log(`User ${userId} promoted to admin successfully`);

    res.status(200).json({
      message: "User successfully promoted to admin",
      userId,
      requestSource,
      success: true,
    });
  } catch (error) {
    console.error("Error in make-admin endpoint:", error);
    res.status(500).json({
      error: error.message,
      requestSource: req.get("host") === "localhost:3001" ? "direct" : "proxy",
      success: false,
    });
  }
});

// API endpoint to soft delete a user
app.post("/api/soft-delete", async (req, res) => {
  try {
    const { userId } = req.body;
    const requestSource =
      req.get("host") === "localhost:3001" ? "direct" : "proxy";

    // Log received request
    console.log(`Received request to soft delete user (${requestSource}):`, {
      userId,
    });

    // Validate inputs
    if (!userId) {
      return res.status(400).json({
        success: false,
        error: "User ID is required",
        requestSource,
      });
    }

    // First check if user exists in the database
    const { data: userData, error: userCheckError } = await supabase
      .from("users")
      .select("userID, role, accountStatus")
      .eq("userID", userId)
      .single();

    if (userCheckError && userCheckError.code !== "PGRST116") {
      console.error("Error checking if user exists:", userCheckError);
      return res.status(500).json({
        success: false,
        error: userCheckError.message,
        requestSource,
      });
    }

    if (!userData) {
      console.warn(
        `User with ID ${userId} not found, but will attempt to update status in database anyway`
      );
    } else if (userData.accountStatus === "inactive") {
      return res.status(200).json({
        success: true,
        message: "User is already soft deleted (inactive)",
        userId,
        requestSource,
      });
    }

    // Update the database (users table)
    const { data: dbData, error: dbError } = await supabase
      .from("users")
      .update({
        accountStatus: "inactive",
        modified_at: new Date().toISOString(),
      })
      .eq("userID", userId);

    if (dbError) {
      console.error("Error updating user status in database:", dbError);
      return res.status(500).json({
        success: false,
        error: dbError.message,
        requestSource,
      });
    }

    // Also ban the user in Supabase Auth
    try {
      const { data: authData, error: authError } =
        await supabase.auth.admin.updateUserById(userId, { banned: true });

      if (authError) {
        console.error("Error banning user in Auth:", authError);
        // Still return a partial success since the database was updated
        return res.status(200).json({
          message: "User soft deleted in database, but Auth update failed",
          warning: authError.message,
          userId,
          requestSource,
          success: true,
          partial: true,
        });
      }
    } catch (authException) {
      console.error("Exception when updating Auth status:", authException);
      return res.status(200).json({
        message:
          "User soft deleted in database, but Auth update failed with exception",
        warning: authException.message,
        userId,
        requestSource,
        success: true,
        partial: true,
      });
    }

    // Log the action for security auditing
    console.log(`User ${userId} soft deleted (set to inactive) successfully`);

    res.status(200).json({
      message: "User successfully soft deleted",
      userId,
      requestSource,
      success: true,
    });
  } catch (error) {
    console.error("Error in soft-delete endpoint:", error);
    res.status(500).json({
      error: error.message,
      requestSource: req.get("host") === "localhost:3001" ? "direct" : "proxy",
      success: false,
    });
  }
});

// API endpoint to reinstate a user
app.post("/api/reinstate", async (req, res) => {
  try {
    const { userId } = req.body;
    const requestSource =
      req.get("host") === "localhost:3001" ? "direct" : "proxy";

    // Log received request
    console.log(`Received request to reinstate user (${requestSource}):`, {
      userId,
    });

    // Validate inputs
    if (!userId) {
      return res.status(400).json({
        success: false,
        error: "User ID is required",
        requestSource,
      });
    }

    // First check if user exists in the database
    const { data: userData, error: userCheckError } = await supabase
      .from("users")
      .select("userID, role, accountStatus")
      .eq("userID", userId)
      .single();

    if (userCheckError && userCheckError.code !== "PGRST116") {
      console.error("Error checking if user exists:", userCheckError);
      return res.status(500).json({
        success: false,
        error: userCheckError.message,
        requestSource,
      });
    }

    if (!userData) {
      console.warn(
        `User with ID ${userId} not found, but will attempt to update status in database anyway`
      );
    } else if (userData.accountStatus === "active") {
      return res.status(200).json({
        success: true,
        message: "User is already active",
        userId,
        requestSource,
      });
    }

    // Update the database (users table)
    const { data: dbData, error: dbError } = await supabase
      .from("users")
      .update({
        accountStatus: "active",
        modified_at: new Date().toISOString(),
      })
      .eq("userID", userId);

    if (dbError) {
      console.error("Error updating user status in database:", dbError);
      return res.status(500).json({
        success: false,
        error: dbError.message,
        requestSource,
      });
    }

    // Also unban the user in Supabase Auth
    try {
      const { data: authData, error: authError } =
        await supabase.auth.admin.updateUserById(userId, { banned: false });

      if (authError) {
        console.error("Error unbanning user in Auth:", authError);
        // Still return a partial success since the database was updated
        return res.status(200).json({
          message: "User reinstated in database, but Auth update failed",
          warning: authError.message,
          userId,
          requestSource,
          success: true,
          partial: true,
        });
      }
    } catch (authException) {
      console.error("Exception when updating Auth status:", authException);
      return res.status(200).json({
        message:
          "User reinstated in database, but Auth update failed with exception",
        warning: authException.message,
        userId,
        requestSource,
        success: true,
        partial: true,
      });
    }

    // Log the action for security auditing
    console.log(`User ${userId} reinstated (set to active) successfully`);

    res.status(200).json({
      message: "User successfully reinstated",
      userId,
      requestSource,
      success: true,
    });
  } catch (error) {
    console.error("Error in reinstate endpoint:", error);
    res.status(500).json({
      error: error.message,
      requestSource: req.get("host") === "localhost:3001" ? "direct" : "proxy",
      success: false,
    });
  }
});

// API endpoint to update user role
app.post("/api/update-user-role", async (req, res) => {
  try {
    const { userId, role, isAdmin } = req.body;
    const requestSource =
      req.get("host") === "localhost:3001" ? "direct" : "proxy";

    // Log received request
    console.log(`Received request to update user role (${requestSource}):`, {
      userId,
      role,
      isAdmin,
    });

    // Validate inputs
    if (!userId) {
      return res.status(400).json({
        error: "User ID is required",
        requestSource,
      });
    }

    if (role !== "admin" && role !== "user") {
      return res.status(400).json({
        error: "Role must be 'admin' or 'user'",
        requestSource,
      });
    }

    // First check if user exists in the database
    const { data: userData, error: userCheckError } = await supabase
      .from("users")
      .select("userID, role")
      .eq("userID", userId)
      .single();

    if (userCheckError && userCheckError.code !== "PGRST116") {
      console.error("Error checking if user exists:", userCheckError);
      return res.status(500).json({
        error: userCheckError.message,
        requestSource,
      });
    }

    if (!userData) {
      console.warn(
        `User with ID ${userId} not found, but will attempt to update role in database anyway`
      );
    }

    // Update the database (users table)
    const { data: dbData, error: dbError } = await supabase
      .from("users")
      .update({
        role,
        modified_at: new Date().toISOString(),
      })
      .eq("userID", userId);

    if (dbError) {
      console.error("Error updating user in database:", dbError);
      return res.status(500).json({
        error: dbError.message,
        requestSource,
      });
    }

    // Then update user metadata in Supabase Auth
    try {
      const { data: authData, error: authError } =
        await supabase.auth.admin.updateUserById(userId, {
          user_metadata: { role, isAdmin },
          app_metadata: { role, isAdmin },
        });

      if (authError) {
        console.error("Error updating user in Auth:", authError);
        // Still return a partial success since the database was updated
        return res.status(200).json({
          message: `User role updated to ${role} in database, but Auth update failed`,
          warning: authError.message,
          userId,
          role,
          requestSource,
          success: true,
          partial: true,
        });
      }
    } catch (authException) {
      console.error("Exception when updating Auth metadata:", authException);
      return res.status(200).json({
        message: `User role updated to ${role} in database, but Auth update failed with exception`,
        warning: authException.message,
        userId,
        role,
        requestSource,
        success: true,
        partial: true,
      });
    }

    // Log the action for security auditing
    console.log(`User ${userId} role updated to ${role} successfully`);

    res.status(200).json({
      message: `User role updated to ${role} successfully`,
      userId,
      role,
      isAdmin,
      requestSource,
      success: true,
    });
  } catch (error) {
    console.error("Error in update-user-role endpoint:", error);
    res.status(500).json({
      error: error.message,
      requestSource: req.get("host") === "localhost:3001" ? "direct" : "proxy",
      success: false,
    });
  }
});

// API endpoint to enforce account status
app.post("/api/enforce-account-status", async (req, res) => {
  try {
    const { userId, accountStatus } = req.body;
    const requestSource =
      req.get("host") === "localhost:3001" ? "direct" : "proxy";

    // Log received request
    console.log(
      `Received request to enforce account status (${requestSource}):`,
      {
        userId,
        accountStatus,
      }
    );

    // Validate inputs
    if (!userId) {
      return res.status(400).json({ error: "User ID is required" });
    }

    if (
      accountStatus !== "active" &&
      accountStatus !== "inactive" &&
      accountStatus !== "suspended"
    ) {
      return res.status(400).json({
        error: "Account status must be 'active', 'inactive', or 'suspended'",
      });
    }

    if (accountStatus === "inactive" || accountStatus === "suspended") {
      // Disable the user in Auth
      const { error: disableError } = await supabase.auth.admin.updateUserById(
        userId,
        { banned: true }
      );

      if (disableError) {
        console.error("Error disabling user in Auth:", disableError);
        return res.status(500).json({
          error: disableError.message,
          requestSource,
        });
      }
    } else {
      // Enable the user in Auth
      const { error: enableError } = await supabase.auth.admin.updateUserById(
        userId,
        { banned: false }
      );

      if (enableError) {
        console.error("Error enabling user in Auth:", enableError);
        return res.status(500).json({
          error: enableError.message,
          requestSource,
        });
      }
    }

    // Log the action for security auditing
    console.log(`User ${userId} account status set to ${accountStatus}`);

    res.status(200).json({
      message: `User account status updated to ${accountStatus} successfully`,
      userId,
      accountStatus,
      requestSource,
    });
  } catch (error) {
    console.error("Error in enforce-account-status endpoint:", error);
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/chat", async (req, res) => {
  try {
    const { messages, userId } = req.body;

    // Process the user's intent - searching or listing
    const userMessage = messages[messages.length - 1].content.toLowerCase();

    // Check if query contains a price filter
    const priceFilter = extractPriceFilter(userMessage);

    // Create system message with context - enhanced with stricter instructions
    const systemMessage = {
      role: "system",
      content: `You are a helpful assistant for a student marketplace. 
      You can help users search for products or list items for sale.
      When users want to search, extract key details and respond with relevant listings.
      When users want to list an item, collect all necessary information like title, description, price, condition.
      
      VERIFICATION SYSTEM:
      1. You must ONLY discuss products that are specifically found in the database.
      2. Every product mentioned MUST have a verification code [VPxxx].
      3. Never make up or hallucinate products that don't have verification codes.
      4. If you're uncertain about a product, DO NOT mention it.
      5. When referring to products, use EXACTLY the names provided in the verified data.
      
      RESPONSE FORMAT:
      - When showing products, always include their verification codes.
      - Always wrap product listings in the VERIFIED_PRODUCTS_START and VERIFIED_PRODUCTS_END markers.
      - For any product info that isn't explicitly verified, say "I don't have that information" rather than making it up.
      
      Remember: It's better to provide less information that is verified than more information that might be wrong.`,
    };

    // Prepare conversation history for OpenAI
    const conversationHistory = [
      systemMessage,
      ...messages.slice(-10), // Send only the last 10 messages for context
    ];

    // Determine if user is searching or listing
    let aiResponse;

    // Check if this is a product search query
    const isProductSearch = isProductSearchQuery(userMessage);

    if (isProductSearch) {
      try {
        // Get products from database using our universal search function
        let searchResults = await searchProducts(supabase, userMessage);

        // Check if query is specifically about a category
        const categoryMatch = userMessage.match(/show me (\w+)/i);
        // Also check for direct category mentions (from button clicks)
        let requestedCategory = null;

        if (categoryMatch && categoryMatch[1]) {
          requestedCategory = categoryMatch[1].toLowerCase();
        } else if (
          /^(electronics|furniture|textbooks|clothing|miscellaneous)$/i.test(
            userMessage.trim()
          )
        ) {
          // Direct category button click
          requestedCategory = userMessage.trim().toLowerCase();
        }

        if (requestedCategory) {
          // Filter results to only include products from that category
          const filteredResults = searchResults.filter(
            (product) =>
              product.category &&
              product.category.toLowerCase() === requestedCategory
          );

          // If no products found in requested category, show a helpful message
          if (filteredResults.length === 0) {
            aiResponse = {
              role: "assistant",
              content: `I couldn't find any ${requestedCategory} items currently available. Would you like to browse other categories instead? Try clicking one of the category buttons below.`,
            };
            return res.json({ message: aiResponse });
          }

          // Use the filtered results instead of all results
          searchResults = filteredResults;
        }

        // Get search terms
        const searchTerms = extractSearchTerms(userMessage);

        // Determine response
        const determinedResponse = determineSearchResponse(
          searchResults,
          userMessage,
          searchTerms
        );

        if (!searchResults || searchResults.length === 0) {
          // No products found
          aiResponse = {
            role: "assistant",
            content:
              "I'm sorry, but I couldn't find any products matching your search criteria in our current inventory. Would you like to try a different search term or browse other categories instead?",
          };
        } else {
          try {
            // Format product data with verification codes
            const formattedResults = searchResults.map((item) => {
              // Get image URL if available
              let imageUrl = item.image || "";

              // If the image is a storage path, construct the full URL
              if (imageUrl && !imageUrl.startsWith("http")) {
                const imagePath = imageUrl.startsWith("/")
                  ? imageUrl.substring(1)
                  : imageUrl;

                // Use the exact Supabase URL format
                imageUrl = `https://vfjcutqzhhcvqjqjzwaf.supabase.co/storage/v1/object/public/product-images/${imagePath}`;
              }

              // Add verification code to product
              const verificationCode = `VP${item.productID}`; // Verified Product + ID

              // Return a clean, formatted object
              return {
                id: item.productID,
                productID: item.productID,
                name: item.name || "",
                price: item.price || 0,
                description: item.description || "",
                image: imageUrl,
                condition: item.condition || "",
                category: item.category || "",
                status: item.status || "available",
                is_bundle: item.is_bundle || false,
                flag: item.flag || false,
                created_at: item.created_at || "",
                modified_at: item.modified_at || "",
                userID: item.userID || "",
                _vcode: verificationCode, // Add verification code
              };
            });

            // Use the deterministic response template
            const responseTemplate = determinedResponse.responseText;

            aiResponse = {
              role: "assistant",
              content: `VERIFIED_PRODUCTS_START${JSON.stringify(
                formattedResults
              )}VERIFIED_PRODUCTS_END

${responseTemplate}

Let me know if you'd like more information about any of these items or if you'd like to refine your search.${
                priceFilter ? ` You can also try different price ranges.` : ""
              }`,
            };
          } catch (formattingError) {
            aiResponse = {
              role: "assistant",
              content:
                "I'm sorry, but I encountered an error while formatting the search results. Please try again later.",
            };
          }
        }
      } catch (searchError) {
        aiResponse = {
          role: "assistant",
          content:
            "I'm sorry, but I encountered an error while searching for products. Please try again later.",
        };
      }
    } else if (
      userMessage.includes("sell") ||
      userMessage.includes("list") ||
      userMessage.includes("listing")
    ) {
      // User wants to list an item
      try {
        aiResponse = await getAIResponse(conversationHistory);

        // Extract product details from conversation
        const extractedProduct = extractProductDetails(conversationHistory);

        if (extractedProduct.isComplete) {
          // Save the product to database
          const { data, error } = await supabase
            .from("products")
            .insert({
              userID: userId,
              name: extractedProduct.title,
              description: extractedProduct.description,
              price: extractedProduct.price,
              category: extractedProduct.category,
              condition: extractedProduct.condition,
              image: extractedProduct.imageUrl || "",
              status: "available",
              is_bundle: false,
              flag: false,
              created_at: new Date(),
              modified_at: new Date(),
            })
            .select();

          if (error) {
            // Update AI response to indicate error
            aiResponse.content +=
              "\n\nThere was an error creating your listing. Please try again.";
          } else {
            // Update AI response to confirm listing was created
            aiResponse.content +=
              "\n\nGreat! I've created your listing for: " +
              extractedProduct.title;
          }
        } else {
          // Product information is incomplete, ask for missing fields
          aiResponse.content +=
            "\n\nTo complete your listing, I still need: " +
            extractedProduct.missingFields.join(", ");
        }
      } catch (listingError) {
        aiResponse = {
          role: "assistant",
          content:
            "I'm sorry, but I encountered an error while processing your listing request. Please try again later.",
        };
      }
    } else {
      // General conversation
      try {
        // Use a more restrictive system prompt for general conversations too
        const generalSystemMessage = {
          role: "system",
          content: `You are a helpful assistant for a student marketplace.
          Provide general help and information, but never make claims about specific products
          unless they've been explicitly provided to you from the database.
          Our marketplace has categories: electronics, furniture, clothing, textbooks, and miscellaneous.
          Never hallucinate or make up products that aren't in the database.`,
        };

        const conversationWithRestrictions = [
          generalSystemMessage,
          ...messages.slice(-10),
        ];

        aiResponse = await getAIResponse(conversationWithRestrictions);
      } catch (conversationError) {
        aiResponse = {
          role: "assistant",
          content:
            "I'm sorry, but I encountered an error while processing your request. Please try again later.",
        };
      }
    }

    res.json({ message: aiResponse });
  } catch (error) {
    res
      .status(500)
      .json({ error: "An error occurred while processing your request" });
  }
});

/**
 * Get AI response from OpenAI
 */
async function getAIResponse(messages) {
  try {
    // Validate input
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return {
        role: "assistant",
        content: "I'm sorry, there was an issue with the message format.",
      };
    }

    // Validate API key
    if (!process.env.OPENAI_API_KEY) {
      return {
        role: "assistant",
        content:
          "I'm sorry, there's a configuration issue with the AI service.",
      };
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: messages,
      temperature: 0.7,
    });

    if (!completion || !completion.choices || !completion.choices[0]) {
      throw new Error("Invalid response structure from OpenAI API");
    }

    return completion.choices[0].message;
  } catch (error) {
    return {
      role: "assistant",
      content:
        "I'm sorry, I'm having trouble processing your request right now. Please try again later.",
    };
  }
}

/**
 * Extract product details from conversation
 */
function extractProductDetails(messages) {
  const requiredFields = [
    "title",
    "description",
    "price",
    "category",
    "condition",
  ];
  const product = {
    title: null,
    description: null,
    price: null,
    category: null,
    condition: null,
    imageUrl: "",
    isComplete: false,
    missingFields: [],
  };

  // Look through last few messages for product details
  const userMessages = messages
    .filter((msg) => msg.role === "user")
    .map((msg) => msg.content.toLowerCase());

  // Extract product details from messages
  userMessages.forEach((content) => {
    // Extract title
    if (
      !product.title &&
      (content.includes("title:") ||
        content.includes("selling") ||
        content.includes("listing"))
    ) {
      const titleMatch = content.match(
        /(?:title:|selling|listing)\s+([^\.]+)/i
      );
      if (titleMatch && titleMatch[1]) product.title = titleMatch[1].trim();
    }

    // Extract price
    if (
      !product.price &&
      (content.includes("$") || content.includes("price:"))
    ) {
      const priceMatch = content.match(
        /\$\s*(\d+(?:\.\d{2})?)|price:\s*(\d+(?:\.\d{2})?)/i
      );
      if (priceMatch)
        product.price = parseFloat(priceMatch[1] || priceMatch[2]);
    }

    // Extract other fields
    if (!product.description && content.includes("description:")) {
      const descMatch = content.match(/description:\s+([^\.]+)/i);
      if (descMatch) product.description = descMatch[1].trim();
    }

    if (!product.category && content.includes("category:")) {
      const categoryMatch = content.match(/category:\s+([^\.]+)/i);
      if (categoryMatch) product.category = categoryMatch[1].trim();
    }

    if (!product.condition && content.includes("condition:")) {
      const conditionMatch = content.match(/condition:\s+([^\.]+)/i);
      if (conditionMatch) product.condition = conditionMatch[1].trim();
    }
  });

  // Check which fields are missing
  product.missingFields = requiredFields.filter((field) => !product[field]);
  product.isComplete = product.missingFields.length === 0;

  return product;
}

// For production, serve static files from the build directory
if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, "../build")));

  app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "../build", "index.html"));
  });
}

// Catch-all JSON 404 handler - must come after all valid routes
app.use((req, res, next) => {
  console.log(`Route not found: ${req.method} ${req.path}`);
  res.status(404).json({
    error: "Not Found",
    message: `The requested endpoint ${req.method} ${req.path} does not exist.`,
    status: 404,
  });
});

// Global error handler - ensure all errors return JSON
app.use((err, req, res, next) => {
  console.error(`[ERROR] ${req.method} ${req.path}:`, err.stack || err);

  // Ensure response is sent as JSON
  const statusCode = err.statusCode || 500;
  const errorMessage =
    process.env.NODE_ENV === "production"
      ? "Internal Server Error"
      : err.message || String(err);

  res.status(statusCode).json({
    error: err.name || "Error",
    message: errorMessage,
    status: statusCode,
  });
});

// Change the port back to 3001
const PORT = process.env.PORT || 3001;

// Update where the server listens
const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health-check`);
});

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("SIGTERM signal received: closing HTTP server");
  server.close(() => {
    console.log("HTTP server closed");
    process.exit(0);
  });
});

process.on("SIGINT", () => {
  console.log("SIGINT signal received: closing HTTP server");
  server.close(() => {
    console.log("HTTP server closed");
    process.exit(0);
  });
});

// Legacy non-API route for backward compatibility
app.post("/reinstate", async (req, res) => {
  console.log(
    "Received request to /reinstate (legacy endpoint) - forwarding to /api/reinstate"
  );

  // Simply forward the request to the /api/reinstate handler
  try {
    req.url = "/api/reinstate";
    app.handle(req, res);
  } catch (error) {
    console.error("Error forwarding to /api/reinstate:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error forwarding request",
    });
  }
});

// Update authentication middleware to use users table
const authenticateUser = async (req, res, next) => {
  const { authorization } = req.headers;

  if (!authorization) {
    return res.status(401).json({
      success: false,
      message: "No authorization header provided",
      requestSource: "auth-middleware",
    });
  }

  if (!authorization.startsWith("Bearer ")) {
    return res.status(401).json({
      success: false,
      message: "Invalid authorization format, Bearer expected",
      requestSource: "auth-middleware",
    });
  }

  const token = authorization.replace("Bearer ", "");

  try {
    const { data, error } = await supabase.auth.getUser(token);

    if (error || !data.user) {
      console.error("Auth error:", error);
      return res.status(401).json({
        success: false,
        message: "Invalid or expired token",
        requestSource: "auth-middleware",
      });
    }

    // Get user data from users table (updated to use userID)
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("role, accountStatus")
      .eq("userID", data.user.id)
      .single();

    if (userError) {
      console.error("Error getting user data:", userError);

      // If user record doesn't exist, create one with default role
      if (userError.code === "PGRST116") {
        const { error: insertError } = await supabase.from("users").insert([
          {
            userID: data.user.id,
            email: data.user.email,
            role: "user",
            accountStatus: "active",
          },
        ]);

        if (insertError) {
          console.error("Error creating user record:", insertError);
          return res.status(500).json({
            success: false,
            message: "Error creating user record",
            requestSource: "auth-middleware",
          });
        }

        // Set default user data
        req.user = {
          ...data.user,
          role: "user",
          accountStatus: "active",
        };
      } else {
        return res.status(500).json({
          success: false,
          message: "Error getting user data",
          requestSource: "auth-middleware",
        });
      }
    } else {
      // Add user data to request
      req.user = {
        ...data.user,
        role: userData.role,
        accountStatus: userData.accountStatus,
      };
    }

    next();
  } catch (error) {
    console.error("Auth middleware error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error during authentication",
      requestSource: "auth-middleware",
    });
  }
};

// Add a debug endpoint for product moderation
app.get("/api/debug-products", async (req, res) => {
  try {
    console.log("Debug products endpoint called");

    const results = {};

    // Get pending products (NULL or pending)
    const { data: pendingProducts, error: pendingError } = await supabase
      .from("products")
      .select("productID, name, moderation_status")
      .or("moderation_status.is.null,moderation_status.eq.pending")
      .limit(10);

    if (pendingError) {
      results.pendingError = pendingError.message;
    } else {
      results.pending = {
        count: pendingProducts.length,
        samples: pendingProducts.slice(0, 3),
      };
    }

    // Get approved products
    const { data: approvedProducts, error: approvedError } = await supabase
      .from("products")
      .select("productID, name, moderation_status")
      .eq("moderation_status", "approved")
      .limit(10);

    if (approvedError) {
      results.approvedError = approvedError.message;
    } else {
      results.approved = {
        count: approvedProducts.length,
        samples: approvedProducts.slice(0, 3),
      };
    }

    // Get rejected products
    const { data: rejectedProducts, error: rejectedError } = await supabase
      .from("products")
      .select("productID, name, moderation_status")
      .eq("moderation_status", "rejected")
      .limit(10);

    if (rejectedError) {
      results.rejectedError = rejectedError.message;
    } else {
      results.rejected = {
        count: rejectedProducts.length,
        samples: rejectedProducts.slice(0, 3),
      };
    }

    // Get archived products
    const { data: archivedProducts, error: archivedError } = await supabase
      .from("products")
      .select("productID, name, moderation_status")
      .eq("moderation_status", "archived")
      .limit(10);

    if (archivedError) {
      results.archivedError = archivedError.message;
    } else {
      results.archived = {
        count: archivedProducts.length,
        samples: archivedProducts.slice(0, 3),
      };
    }

    // Return results
    res.status(200).json({
      success: true,
      results,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error in debug products endpoint:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Add a direct diagnosis route for product statuses
app.get("/api/diagnose-products", async (req, res) => {
  try {
    console.log(
      `[${new Date().toISOString()}] GET /api/diagnose-products accessed`
    );

    const results = {};

    // Check for pending (NULL or pending)
    const { data: pendingProducts, error: pendingError } = await supabase
      .from("products")
      .select("productID, name, moderation_status")
      .or("moderation_status.is.null,moderation_status.eq.pending");

    if (pendingError) {
      results.pendingError = pendingError.message;
    } else {
      results.pending = {
        count: pendingProducts.length,
        samples: pendingProducts.slice(0, 5).map((p) => ({
          id: p.productID,
          name: p.name,
          status: p.moderation_status || "NULL",
        })),
      };
    }

    // Check for approved
    const { data: approvedProducts, error: approvedError } = await supabase
      .from("products")
      .select("productID, name, moderation_status")
      .eq("moderation_status", "approved");

    if (approvedError) {
      results.approvedError = approvedError.message;
    } else {
      results.approved = {
        count: approvedProducts.length,
        samples: approvedProducts.slice(0, 5).map((p) => ({
          id: p.productID,
          name: p.name,
          status: p.moderation_status,
        })),
      };
    }

    // Check for rejected
    const { data: rejectedProducts, error: rejectedError } = await supabase
      .from("products")
      .select("productID, name, moderation_status")
      .eq("moderation_status", "rejected");

    if (rejectedError) {
      results.rejectedError = rejectedError.message;
    } else {
      results.rejected = {
        count: rejectedProducts.length,
        samples: rejectedProducts.slice(0, 5).map((p) => ({
          id: p.productID,
          name: p.name,
          status: p.moderation_status,
        })),
      };
    }

    // Check for archived
    const { data: archivedProducts, error: archivedError } = await supabase
      .from("products")
      .select("productID, name, moderation_status")
      .eq("moderation_status", "archived");

    if (archivedError) {
      results.archivedError = archivedError.message;
    } else {
      results.archived = {
        count: archivedProducts.length,
        samples: archivedProducts.slice(0, 5).map((p) => ({
          id: p.productID,
          name: p.name,
          status: p.moderation_status,
        })),
      };
    }

    // Check for products with invalid moderation_status
    const { data: invalidProducts, error: invalidError } = await supabase
      .from("products")
      .select("productID, name, moderation_status")
      .not(
        "moderation_status",
        "in",
        '("approved","rejected","archived","pending")'
      )
      .not("moderation_status", "is", null);

    if (invalidError) {
      results.invalidError = invalidError.message;
    } else {
      results.invalid = {
        count: invalidProducts.length,
        samples: invalidProducts.slice(0, 5).map((p) => ({
          id: p.productID,
          name: p.name,
          status: p.moderation_status,
        })),
      };
    }

    // Return results
    res.status(200).json({
      success: true,
      results,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error in diagnose-products endpoint:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

module.exports = { app, server };
