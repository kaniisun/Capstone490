const { createProxyMiddleware } = require("http-proxy-middleware");

module.exports = function (app) {
  // Proxy all /api requests to the backend server
  app.use(
    "/api",
    createProxyMiddleware({
      target: "http://localhost:3001",
      changeOrigin: true,
      secure: false,
    })
  );
};
