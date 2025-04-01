// Debug script to print all routes in the server.js Express app
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });

// Import the server module
const { app } = require("./server");

// Verify that the app was properly imported
if (!app) {
  console.error("Failed to import app from server.js");
  process.exit(1);
}

console.log("\nRegistered Routes:");
console.log("=================");

// Get all routes
const routes = [];

app._router.stack.forEach((middleware) => {
  if (middleware.route) {
    // Routes registered directly on the app
    const methods = Object.keys(middleware.route.methods)
      .filter((method) => middleware.route.methods[method])
      .join(", ")
      .toUpperCase();

    routes.push(`${methods} ${middleware.route.path}`);
  } else if (middleware.name === "router") {
    // Router middleware
    middleware.handle.stack.forEach((handler) => {
      if (handler.route) {
        const methods = Object.keys(handler.route.methods)
          .filter((method) => handler.route.methods[method])
          .join(", ")
          .toUpperCase();

        routes.push(`${methods} ${handler.route.path}`);
      }
    });
  }
});

// Sort routes for easier reading
routes.sort();

// Print all routes
routes.forEach((route) => {
  console.log(route);
});

// Specifically check for the problematic route
const hasModerateProducts = routes.some(
  (route) =>
    route.includes("/api/moderate-products") ||
    route.includes("/moderate-products")
);

console.log("\nChecking for specific routes:");
console.log(
  `/api/moderate-products endpoint exists: ${
    hasModerateProducts ? "YES" : "NO"
  }`
);

console.log("\nTotal routes:", routes.length);
