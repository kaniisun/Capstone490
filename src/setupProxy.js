const { createProxyMiddleware } = require("http-proxy-middleware");
const API_CONFIG = require("./config/api.js").default;

module.exports = function (app) {
  // Proxy all /api requests to the backend server
  app.use(
    "/api",
    createProxyMiddleware({
      target: API_CONFIG.BASE_URL,
      changeOrigin: true,
      secure: false,
      logLevel: "debug", // This will help with debugging
      onProxyReq: (proxyReq, req) => {
        // Log the proxied request for debugging
        console.log("Proxying request:", {
          method: req.method,
          path: req.path,
          headers: req.headers,
        });
      },
      onError: (err, req, res) => {
        // Handle proxy errors
        console.error("Proxy Error:", err);
        res.status(500).json({
          error: "Proxy Error",
          message: err.message,
        });
      },
    })
  );
};
