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
const visionRoutes = require("./routes/visionRoutes");

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
 *
 * Vision API Endpoints:
 * - POST /api/vision/analyze - Analyze an image and return product details
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
        ? ["https://spartan-marketplace.onrender.com", "http://localhost:3000"]
        : ["http://localhost:3000", "http://localhost:3001"],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "Accept"],
    credentials: true,
    optionsSuccessStatus: 200,
  })
);

app.use(express.json());

// Increase body parser limit for image uploads
app.use(express.json({ limit: "25mb" }));
app.use(express.urlencoded({ limit: "25mb", extended: true }));

// Add a root route handler
app.get("/", (req, res) => {
  res.json({
    message: "Spartan Marketplace Backend API",
    status: "running",
    environment: process.env.NODE_ENV || "development",
    timestamp: new Date().toISOString(),
  });
});

// Register API routes first, before any middleware or catch-all handlers
app.use("/api/moderate-products", moderateProductsRoutes);
app.use("/api/moderate-product", moderateProductRoute);
app.use("/api/delete-product", deleteProductRoute);
app.use("/api/vision", visionRoutes);

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
// OpenAI configuration constants
// See latest model documentation: https://platform.openai.com/docs/models/gpt-4
const OPENAI_MODEL_VERSION = process.env.OPENAI_MODEL_VERSION || "gpt-4-turbo";

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

// Add a simple test endpoint for OpenAI Vision API access
app.get("/api/test-vision", async (req, res) => {
  console.log("Vision API test endpoint called");
  try {
    // Simple test with a 1x1 transparent pixel encoded in base64
    const base64Image =
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";

    console.log("OpenAI API Key available:", !!process.env.OPENAI_API_KEY);
    console.log("OpenAI Vision API test - Starting test request");

    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4-turbo",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "What's in this image? Just respond with 'Test OK'",
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:image/png;base64,${base64Image}`,
                },
              },
            ],
          },
        ],
        max_tokens: 5,
      });

      console.log(
        "Vision API test - Response received:",
        completion.choices[0]?.message?.content
      );

      res.json({
        status: "success",
        message: "Vision API test successful",
        response: completion.choices[0]?.message?.content || "No response",
      });
    } catch (openaiError) {
      console.error("OpenAI Vision API Error:", openaiError);
      console.error("Error Message:", openaiError.message);
      console.error("Error Code:", openaiError.code);
      console.error("Error Type:", openaiError.type);
      console.error("Error Status:", openaiError.status);

      let errorType = "unknown";
      let suggestion = "";

      if (openaiError.message.includes("Incorrect API key")) {
        errorType = "invalid_api_key";
        suggestion = "Your API key is invalid";
      } else if (
        openaiError.message.includes("does not exist") ||
        openaiError.message.includes("The model")
      ) {
        errorType = "model_access";
        suggestion = "Your API key doesn't have access to GPT-4 Vision";
      } else if (openaiError.message.includes("Rate limit")) {
        errorType = "rate_limit";
        suggestion = "Rate limit exceeded";
      }

      console.log("Returning error response:", {
        status: "error",
        message: openaiError.message,
        type: errorType,
        suggestion,
      });

      return res.status(500).json({
        status: "error",
        message: openaiError.message,
        type: errorType,
        suggestion,
      });
    }
  } catch (error) {
    console.error("Test endpoint general error:", error);
    res.status(500).json({
      error: "Server error",
      message: error.message,
      stack: error.stack,
    });
  }
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

// Chat endpoint
app.post("/api/chat", async (req, res) => {
  try {
    const { messages, userId } = req.body;

    // Validate input
    if (!messages || !Array.isArray(messages)) {
      return res
        .status(400)
        .json({ error: "Messages must be provided as an array" });
    }

    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({ error: "OpenAI API key not configured" });
    }

    // Get the last message for improved logging
    const lastMessage = messages[messages.length - 1]?.content || "";
    console.log(`Chat request received from user ${userId || "anonymous"}`);
    console.log(`Last message: "${lastMessage}"`);
    console.log(
      `Number of messages in conversation history: ${messages.length}`
    );

    // Check if this is a product search query
    const isSearchQuery = isProductSearchQuery(lastMessage);
    let productSearchResults = [];

    if (isSearchQuery) {
      console.log("Detected product search query, searching database...");
      try {
        // Search for products in the database
        productSearchResults = await searchProducts(supabase, lastMessage);
        console.log(
          `Found ${productSearchResults.length} products matching the query`
        );

        if (productSearchResults.length > 0) {
          // Verify the search results match the query
          const verificationResult = verifySearchMatch(
            productSearchResults,
            lastMessage
          );

          // Format the AI response with the product data
          const response = determineSearchResponse(
            productSearchResults,
            lastMessage,
            extractSearchTerms(lastMessage)
          );

          // Format product data with verification codes for security
          const productsWithCodes = productSearchResults.map((product) => ({
            ...product,
            _vcode: `VP${Math.floor(Math.random() * 1000)}`, // Add verification code
          }));

          // Create the AI response with the product data embedded
          const aiMessage = {
            role: "assistant",
            content: `${
              response.responseText
            }\n\nVERIFIED_PRODUCTS_START${JSON.stringify(
              productsWithCodes
            )}VERIFIED_PRODUCTS_END`,
          };

          console.log("Returning search results with embedded product data");
          return res.json(aiMessage);
        } else {
          console.log("No products found matching the query");
        }
      } catch (searchError) {
        console.error("Error during product search:", searchError);
        // Continue with regular OpenAI response if search fails
      }
    }

    // Call OpenAI API with improved error handling
    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4-turbo",
        messages: messages,
        temperature: 0.7,
        max_tokens: 1000,
      });

      console.log("OpenAI API response received successfully");
      return res.json(completion.choices[0].message);
    } catch (openaiError) {
      console.error("OpenAI API Error:", openaiError);
      console.error(
        "Error details:",
        openaiError.response?.data || "No detailed error data"
      );

      return res.status(500).json({
        error: "OpenAI API Error",
        message: openaiError.message,
        details: openaiError.response?.data || "No detailed error data",
      });
    }
  } catch (error) {
    console.error("Server Error:", error);
    return res.status(500).json({
      error: "Error processing chat request",
      details: error.message,
    });
  }
});

// New endpoint for analyzing images with OpenAI Vision API
app.post("/api/analyze-image", async (req, res) => {
  try {
    const { image } = req.body;

    if (!image) {
      return res.status(400).json({ error: "No image provided" });
    }

    // Validate API key
    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({
        error: "OpenAI API key not configured",
      });
    }

    console.log("Starting OpenAI Vision API request");
    console.log("Image data length:", image.length);

    // Set cache headers to prevent browsers from caching the response
    res.setHeader(
      "Cache-Control",
      "no-store, no-cache, must-revalidate, proxy-revalidate"
    );
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    res.setHeader("Surrogate-Control", "no-store");

    try {
      // Call OpenAI Vision API with optimized settings for faster responses
      const completion = await openai.chat.completions.create({
        model: OPENAI_MODEL_VERSION, // Use configurable model version
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Analyze this image and create a marketplace listing. Return ONLY a JSON object with these exact fields: name (short title), description (detailed but brief), price (numeric, USD), condition (one of: new, like_new, good, fair, poor), category (one of: electronics, furniture, textbooks, clothing, miscellaneous). No explanations, just the JSON object.",
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:image/jpeg;base64,${image}`,
                },
              },
            ],
          },
        ],
        max_tokens: 500,
        temperature: 0.3, // Lower temperature for more consistent responses
        response_format: { type: "json_object" }, // Request JSON directly
      });

      console.log("OpenAI Vision API response received successfully");

      // Parse the response - with the json_object response_format, this should be more reliable
      try {
        const content = completion.choices[0].message.content;
        const productData = JSON.parse(content);
        return res.json(productData);
      } catch (parseError) {
        console.error("Error parsing JSON response:", parseError);

        // Attempt regex extraction as fallback
        const content = completion.choices[0].message.content;
        const jsonMatch = content.match(/```json\n([\s\S]*?)\n```|({[\s\S]*})/);

        if (jsonMatch && (jsonMatch[1] || jsonMatch[2])) {
          try {
            const productData = JSON.parse(jsonMatch[1] || jsonMatch[2]);
            return res.json(productData);
          } catch (err) {
            console.error("JSON regex extraction failed", err);
            return res.status(500).json({
              error: "Failed to parse product data from AI response",
              content,
            });
          }
        } else {
          return res.status(500).json({
            error: "Failed to extract JSON from AI response",
            content,
          });
        }
      }
    } catch (openaiError) {
      console.error("OpenAI API Error:", openaiError);
      console.error(
        "Error details:",
        openaiError.response?.data || "No detailed error data"
      );

      // Add specialized error handling for model not found
      if (
        openaiError.message.includes("model_not_found") ||
        openaiError.message.includes("does not exist") ||
        openaiError.message.includes("The model")
      ) {
        console.error(
          `Model error using '${OPENAI_MODEL_VERSION}':`,
          openaiError.message
        );
        return res.status(500).json({
          error: "OpenAI Vision API Error",
          message:
            "The image processing model was recently updated. We're fixing it. Please try again later.",
          details:
            process.env.NODE_ENV === "development"
              ? openaiError.message
              : undefined,
        });
      }

      return res.status(500).json({
        error: "OpenAI Vision API Error",
        message: openaiError.message,
        details: openaiError.response?.data || "No detailed error data",
      });
    }
  } catch (error) {
    console.error("Error analyzing image:", error);
    return res.status(500).json({
      error: "Error analyzing image with OpenAI Vision API",
      details: error.message,
    });
  }
});

// Start the server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`- Local URL: http://localhost:${PORT}`);
  console.log(`- API Test: http://localhost:${PORT}/api/test`);
  console.log(`- Environment: ${process.env.NODE_ENV || "development"}`);
});
