import React, { useEffect } from "react";
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
  // Add debug logging to help diagnose product display issues
  useEffect(() => {
    console.log("ProductsDisplay received products:", products?.length || 0);
    // Log category distribution to help debug category search
    if (products && products.length > 0) {
      const categoryDistribution = products.reduce((acc, product) => {
        const category = (product.category || "unknown").toLowerCase();
        acc[category] = (acc[category] || 0) + 1;
        return acc;
      }, {});
      console.log("Category distribution:", categoryDistribution);
    }
  }, [products]);

  // Basic validation
  if (!products || !Array.isArray(products) || products.length === 0) {
    console.log("ProductsDisplay: No products to display");
    return null;
  }

  // Get the accurate product count - critical for consistent UI
  const productCount = products.length;

  // Determine category for display if all products have the same category
  let displayCategory = null;
  if (productCount > 0) {
    const firstCategory = products[0]?.category?.toLowerCase();
    if (firstCategory) {
      const allSameCategory = products.every(
        (product) => product.category?.toLowerCase() === firstCategory
      );
      if (allSameCategory) {
        // Proper capitalization for display
        const categoryMap = {
          electronics: "Electronics",
          furniture: "Furniture",
          textbooks: "Textbooks",
          clothing: "Clothing",
          miscellaneous: "Miscellaneous",
        };
        displayCategory =
          categoryMap[firstCategory] ||
          firstCategory.charAt(0).toUpperCase() + firstCategory.slice(1);
      }
    }
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
        {productCount === 1
          ? displayCategory
            ? `1 product found in the "${displayCategory}" category`
            : "1 product found"
          : displayCategory
          ? `${productCount} products found in the "${displayCategory}" category`
          : `${productCount} products found`}
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
