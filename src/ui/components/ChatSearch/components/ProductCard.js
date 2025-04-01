import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardMedia,
  Typography,
  Box,
  Chip,
  Skeleton,
  Button,
  IconButton,
} from "@mui/material";
import EmailIcon from "@mui/icons-material/Email";
import FavoriteBorderIcon from "@mui/icons-material/FavoriteBorder";
import FavoriteIcon from "@mui/icons-material/Favorite";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import { getFormattedImageUrl } from "../utils/imageUtils";
import { isFavorite, toggleFavorite } from "../../../../utils/favoriteUtils";

/**
 * ProductCard component to display product details in the chat interface
 *
 * @param {Object} props - Component props
 * @param {Object} props.product - Product data containing name, price, condition, image, etc.
 * @param {Function} props.onContactClick - Callback for when the contact seller button is clicked
 * @param {boolean} props.isFavoritesPage - Whether this card is being displayed on the favorites page
 * @param {Function} props.onRemoveFavorite - Callback for removing from favorites (used on favorites page)
 * @returns {React.ReactElement} ProductCard component
 */
const ProductCard = ({
  product,
  onContactClick,
  isFavoritesPage = false,
  onRemoveFavorite,
}) => {
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);
  const [showContactInfo, setShowContactInfo] = useState(false);
  const [isFavoriteState, setIsFavoriteState] = useState(false);

  // Get the product ID (prefer productID, fall back to id if needed)
  const productID = product?.productID || product?.id;

  // Debug log for the product ID
  useEffect(() => {
    if (product) {
      console.log(`Product ${product.name} ID:`, productID);
    }
  }, [product, productID]);

  // Check if product is in favorites
  useEffect(() => {
    if (product && productID) {
      // Convert to string for consistent checking
      const isProductFavorite = isFavorite(productID);
      console.log(`Is product ${product.name} favorite:`, isProductFavorite);
      setIsFavoriteState(isProductFavorite);
    }
  }, [product, productID]);

  if (!product) return null;

  // Handle different price formats
  const formatPrice = (price) => {
    if (typeof price === "number") {
      return `$${price.toFixed(2)}`;
    } else if (typeof price === "string" && !isNaN(parseFloat(price))) {
      return `$${parseFloat(price).toFixed(2)}`;
    }
    return price;
  };

  // Process the image URL using the utility function for reliable image display
  let imageUrl = imageError
    ? "https://via.placeholder.com/150?text=No+Image"
    : getFormattedImageUrl(product.image);

  // Add debug logging for image URL
  console.log(`ProductCard for ${product.name}:`);
  console.log(`- Original image URL: ${product.image}`);
  console.log(`- Processed image URL: ${imageUrl}`);
  console.log(`- Image error state: ${imageError}`);

  const handleImageError = () => {
    console.log(`Image loading error for ${product.name}:`, product.image);
    setImageError(true);
    setImageLoading(false);
  };

  const handleImageLoad = () => {
    console.log(`Image loaded successfully for ${product.name}:`, imageUrl);
    setImageLoading(false);
  };

  const handleContactSeller = () => {
    setShowContactInfo(true);

    // Call the external handler if provided
    if (onContactClick && typeof onContactClick === "function") {
      try {
        onContactClick(product);
      } catch (error) {
        // Show a fallback UI state if the callback fails
        setShowContactInfo(true);
      }
    } else {
      // Still show the contact info UI even if the callback isn't working
      setShowContactInfo(true);
    }
  };

  const handleToggleFavorite = (e) => {
    e.stopPropagation();

    console.log("Toggling favorite for product ID:", productID);
    console.log("Full product data:", product);

    // Check what's currently in localStorage for debugging
    const currentFavorites = JSON.parse(
      localStorage.getItem("favorites") || "[]"
    );
    console.log("Current favorites before toggle:", currentFavorites);

    const currentSearchResults = JSON.parse(
      localStorage.getItem("searchResults") || "[]"
    );
    console.log(
      "Current search results in localStorage:",
      currentSearchResults
    );

    // Use utility function to toggle favorite status
    const newStatus = toggleFavorite(productID);
    console.log("New favorite status:", newStatus);

    // Check localStorage after toggle
    const updatedFavorites = JSON.parse(
      localStorage.getItem("favorites") || "[]"
    );
    console.log("Favorites after toggle:", updatedFavorites);

    // Update state
    setIsFavoriteState(newStatus);
  };

  const handleRemoveFavorite = (e) => {
    e.stopPropagation();
    console.log("Removing favorite via button, product ID:", productID);
    if (onRemoveFavorite && typeof onRemoveFavorite === "function") {
      onRemoveFavorite(productID);
    }
  };

  return (
    <Card
      sx={{
        display: "flex",
        flexDirection: "column",
        mb: 1,
        width: "100%",
        maxWidth: 400,
        boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
        borderRadius: 2,
        overflow: "hidden",
        position: "relative",
        transition: "box-shadow 0.2s ease",
        "&:hover": {
          boxShadow: "0 4px 12px rgba(0,0,0,0.12)",
        },
      }}
    >
      {/* Favorite button in top-right corner - only show if not on favorites page */}
      {!isFavoritesPage && (
        <IconButton
          size="small"
          onClick={handleToggleFavorite}
          sx={{
            position: "absolute",
            top: 4,
            right: 4,
            zIndex: 2,
            bgcolor: "rgba(255,255,255,0.8)",
            padding: 0,
            width: 24,
            height: 24,
            minWidth: 24,
            minHeight: 24,
            boxShadow: "0 1px 3px rgba(0,0,0,0.12)",
            "&:hover": {
              bgcolor: "rgba(255,255,255,0.95)",
              boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
            },
          }}
        >
          {isFavoriteState ? (
            <FavoriteIcon
              fontSize="small"
              sx={{ fontSize: 16 }}
              color="error"
            />
          ) : (
            <FavoriteBorderIcon fontSize="small" sx={{ fontSize: 16 }} />
          )}
        </IconButton>
      )}

      {/* Remove button for favorites page */}
      {isFavoritesPage && (
        <IconButton
          size="small"
          onClick={handleRemoveFavorite}
          sx={{
            position: "absolute",
            top: 4,
            right: 4,
            zIndex: 2,
            bgcolor: "rgba(255,255,255,0.8)",
            padding: 0,
            width: 24,
            height: 24,
            minWidth: 24,
            minHeight: 24,
            boxShadow: "0 1px 3px rgba(0,0,0,0.12)",
            "&:hover": {
              bgcolor: "rgba(255,255,255,0.95)",
              color: "error.main",
              boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
            },
          }}
        >
          <DeleteOutlineIcon fontSize="small" sx={{ fontSize: 16 }} />
        </IconButton>
      )}

      <Box sx={{ display: "flex" }}>
        <Box
          sx={{ position: "relative", width: 110, height: 110, flexShrink: 0 }}
        >
          {imageLoading && (
            <Skeleton
              variant="rectangular"
              width={110}
              height={110}
              animation="wave"
              sx={{ position: "absolute", top: 0, left: 0 }}
            />
          )}
          <CardMedia
            component="img"
            sx={{
              width: 110,
              height: 110,
              objectFit: "cover",
              display: imageError ? "none" : "block",
            }}
            image={imageUrl}
            alt={product.name}
            onError={handleImageError}
            onLoad={handleImageLoad}
            loading="lazy"
          />
        </Box>
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            width: "100%",
            overflow: "hidden",
          }}
        >
          <CardContent
            sx={{ flex: "1 0 auto", py: 1, px: 1.5, "&:last-child": { pb: 1 } }}
          >
            <Typography
              variant="body1"
              fontWeight="bold"
              noWrap
              title={product.name}
            >
              {product.name}
            </Typography>
            <Typography
              variant="h6"
              color="primary"
              sx={{ fontSize: "1.1rem", mt: 0.5 }}
            >
              {formatPrice(product.price)}
            </Typography>

            {/* Product description - truncated to 2 lines with ellipsis */}
            {product.description && (
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{
                  mt: 0.5,
                  mb: 1,
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  lineHeight: 1.2,
                  fontSize: "0.8rem",
                }}
              >
                {product.description}
              </Typography>
            )}

            <Box sx={{ display: "flex", gap: 0.5, mt: 0.5, flexWrap: "wrap" }}>
              {product.condition && (
                <Chip
                  label={product.condition}
                  size="small"
                  color={
                    product.condition.toLowerCase() === "new"
                      ? "success"
                      : "default"
                  }
                  sx={{
                    height: 20,
                    "& .MuiChip-label": { px: 0.8, fontSize: "0.7rem" },
                  }}
                />
              )}
              {product.category && (
                <Chip
                  label={product.category}
                  size="small"
                  variant="outlined"
                  sx={{
                    height: 20,
                    "& .MuiChip-label": { px: 0.8, fontSize: "0.7rem" },
                  }}
                />
              )}
            </Box>
          </CardContent>
        </Box>
      </Box>

      {/* Contact seller section */}
      <Box sx={{ p: 1, borderTop: "1px solid #eee" }}>
        {showContactInfo ? (
          <Box sx={{ textAlign: "center", py: 1 }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              The seller has been notified of your interest.
            </Typography>
            <Typography variant="body2" fontWeight="medium">
              They'll contact you soon!
            </Typography>
          </Box>
        ) : (
          <Button
            variant="contained"
            color="primary"
            fullWidth
            startIcon={<EmailIcon sx={{ fontSize: 18 }} />}
            onClick={handleContactSeller}
            size="small"
            sx={{
              py: 0.5, // Reduced vertical padding
              textTransform: "none",
              borderRadius: 1.5,
              fontSize: "0.85rem",
              boxShadow: "none",
              "&:hover": {
                boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
              },
            }}
          >
            Contact Seller
          </Button>
        )}
      </Box>
    </Card>
  );
};

export default ProductCard;
