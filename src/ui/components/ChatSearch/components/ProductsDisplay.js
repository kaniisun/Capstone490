import React from "react";
import { Box, Typography, Alert } from "@mui/material";
import ProductCard from "./ProductCard";

/**
 * Displays a list of products in the chat interface
 *
 * @param {Object} props - Component props
 * @param {Array} props.products - Array of product objects to display
 * @param {Function} props.onContactSeller - Optional callback when user wants to contact a seller
 * @returns {React.ReactElement} Products display component
 */
const ProductsDisplay = ({ products, onContactSeller }) => {
  // Basic validation
  if (!products || !Array.isArray(products) || products.length === 0) {
    return null;
  }

  // Count products with images
  const productsWithImages = products.filter(
    (p) => p.image && typeof p.image === "string" && p.image.trim() !== ""
  );

  // Handler for when a user clicks to contact a seller
  const handleContactClick = (product) => {
    if (onContactSeller && typeof onContactSeller === "function") {
      onContactSeller(product);
    }
  };

  return (
    <Box sx={{ my: 1 }}>
      <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
        {products.length === 1
          ? "1 product found"
          : `${products.length} products found`}
      </Typography>

      {productsWithImages.length === 0 && products.length > 0 && (
        <Alert severity="warning" sx={{ mb: 1 }}>
          Product images may not display correctly
        </Alert>
      )}

      {/* Debug message about contact seller availability */}
      {!onContactSeller && (
        <Alert severity="info" sx={{ mb: 1 }}>
          Contact seller functionality is unavailable for these products
        </Alert>
      )}

      <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
        {products.map((product) => {
          // Ensure we have a valid product with required fields
          if (!product || !product.name) {
            return null;
          }

          // Generate a stable key using productID, id, or a random fallback
          const key =
            product.productID || product.id || Math.random().toString(36);

          return (
            <ProductCard
              key={key}
              product={product}
              onContactClick={handleContactClick}
            />
          );
        })}
      </Box>
    </Box>
  );
};

export default ProductsDisplay;
