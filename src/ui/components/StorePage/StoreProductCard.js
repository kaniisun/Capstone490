import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardMedia,
  Typography,
  Box,
  Chip,
  IconButton,
  Skeleton,
} from "@mui/material";
import FavoriteBorderIcon from "@mui/icons-material/FavoriteBorder";
import FavoriteIcon from "@mui/icons-material/Favorite";
import { getFormattedImageUrl } from "../ChatSearch/utils/imageUtils";
import { isFavorite, toggleFavorite } from "../../../utils/favoriteUtils"; 

/**
 * StoreProductCard
 * A simplified product card for the storefront layout.
 * Hides contact button and fits grid display.
 */
export default function StoreProductCard({ product }) {
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);
  const [favorite, setFavorite] = useState(false);

  const productID = product?.productID || product?.id;

  useEffect(() => {
    if (productID) {
      setFavorite(isFavorite(productID));
    }
  }, [productID]);

  const handleToggleFavorite = (e) => {
    e.stopPropagation();
    const newStatus = toggleFavorite(productID);
    setFavorite(newStatus);
  };

  const handleImageLoad = () => setImageLoading(false);
  const handleImageError = () => {
    setImageError(true);
    setImageLoading(false);
  };

  const formatPrice = (price) =>
    typeof price === "number"
      ? `$${price.toFixed(2)}`
      : `$${parseFloat(price).toFixed(2)}`;

  const imageUrl = imageError
    ? "/images/no-image.png"
    : getFormattedImageUrl(product.image);

  return (
    <Card
      elevation={2}
      sx={{
        borderRadius: 2,
        overflow: "hidden",
        position: "relative",
        display: "flex",
        flexDirection: "column",
        height: '100%',
      }}
    >
      {/* Favorite Icon */}
      <IconButton
        size="small"
        onClick={handleToggleFavorite}
        sx={{ position: 'absolute', top: 8, right: 8, bgcolor: 'rgba(255,255,255,0.8)' }}
      >
        {favorite ? <FavoriteIcon fontSize="small" color="error" /> : <FavoriteBorderIcon fontSize="small" />}
      </IconButton>

      {/* Image Section */}
      <Box sx={{ width: '100%', height: 0, pt: '75%', position: 'relative' }}>
        {imageLoading && <Skeleton variant="rectangular" sx={{ position: 'absolute', inset: 0 }} />}
        <CardMedia
          component="img"
          image={imageUrl}
          alt={product.name}
          onLoad={handleImageLoad}
          onError={handleImageError}
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            display: imageError ? 'none' : 'block',
          }}
          loading="lazy"
        />
      </Box>

      {/* Content Section */}
      <CardContent sx={{ flexGrow: 1, p: 2 }}>
        <Typography variant="subtitle1" noWrap title={product.name} gutterBottom>
          {product.name}
        </Typography>
        <Typography variant="h6" sx={{ mb: 1 }}>
          {formatPrice(product.price)}
        </Typography>
        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
          {product.condition && (
            <Chip
              label={product.condition}
              size="small"
              color={product.condition.toLowerCase() === 'new' ? 'success' : 'default'}
              sx={{ height: 24, '& .MuiChip-label': { px: 0.5, fontSize: '0.75rem' } }}
            />
          )}
          {product.category && (
            <Chip
              label={product.category}
              size="small"
              variant="outlined"
              sx={{ height: 24, '& .MuiChip-label': { px: 0.5, fontSize: '0.75rem' } }}
            />
          )}
        </Box>
      </CardContent>
    </Card>
  );
}
