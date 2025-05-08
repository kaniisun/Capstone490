import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardMedia,
  Typography,
  Box,
  IconButton,
  Skeleton,
  Stack,
} from "@mui/material";
import {
  LocalOffer as LocalOfferIcon,
  Category as CategoryIcon,
  Star as StarIcon,
} from "@mui/icons-material";
import FavoriteBorderIcon from "@mui/icons-material/FavoriteBorder";
import FavoriteIcon from "@mui/icons-material/Favorite";
import { getFormattedImageUrl } from "../ChatSearch/utils/imageUtils";
import { isFavorite, toggleFavorite } from "../../../utils/favoriteUtils";

export default function StoreProductCard({ product }) {
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);
  const [favorite, setFavorite] = useState(false);

  const productID = product?.productID || product?.id;

  // Get product condition stars
  const getConditionStars = (condition) => {
    const conditionLower = condition?.toLowerCase() || "";

    switch (conditionLower) {
      case "new":
        return 5;
      case "like new":
      case "like_new":
        return 4;
      case "good":
        return 3;
      case "fair":
        return 2;
      case "poor":
        return 1;
      default:
        return 3;
    }
  };

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
        height: "100%",
      }}
    >
      {/* Favorite Icon */}
      <IconButton
        size="small"
        onClick={handleToggleFavorite}
        sx={{
          position: "absolute",
          top: 8,
          right: 8,
          bgcolor: "rgba(255,255,255,0.8)",
        }}
      >
        {favorite ? (
          <FavoriteIcon fontSize="small" color="error" />
        ) : (
          <FavoriteBorderIcon fontSize="small" />
        )}
      </IconButton>

      {/* Image Section */}
      <Box sx={{ width: "100%", height: 0, pt: "75%", position: "relative" }}>
        {imageLoading && (
          <Skeleton
            variant="rectangular"
            sx={{ position: "absolute", inset: 0 }}
          />
        )}
        <CardMedia
          component="img"
          image={imageUrl}
          alt={product.name}
          onLoad={handleImageLoad}
          onError={handleImageError}
          sx={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            display: imageError ? "none" : "block",
          }}
          loading="lazy"
        />
      </Box>

      {/* Content Section */}
      <CardContent sx={{ flexGrow: 1, p: 2 }}>
        <Typography
          variant="subtitle1"
          fontWeight="500"
          gutterBottom
          title={product.name}
        >
          {product.name?.length > 24
            ? `${product.name.substring(0, 24)}...`
            : product.name}
        </Typography>

        <Typography
          variant="h6"
          sx={{
            fontWeight: 500,
            my: 1,
            display: "flex",
            alignItems: "center",
            gap: 0.5,
            color: "#0f2044", // UNCG Blue
          }}
        >
          <LocalOfferIcon fontSize="small" />$
          {parseFloat(product.price).toFixed(2)}
        </Typography>

        <Stack spacing={1} sx={{ mb: 1 }}>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 0.5,
            }}
          >
            <CategoryIcon
              fontSize="small"
              color="action"
              sx={{ fontSize: 18 }}
            />
            <Typography variant="body2" color="text.secondary">
              {product.category}
            </Typography>
          </Box>

          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 0.5,
            }}
          >
            <Box sx={{ display: "flex" }}>
              {[...Array(5)].map((_, i) => (
                <StarIcon
                  key={i}
                  sx={{
                    color:
                      i < getConditionStars(product.condition)
                        ? "warning.main"
                        : "text.disabled",
                    fontSize: "0.8rem",
                  }}
                />
              ))}
            </Box>
            <Typography variant="body2" color="text.secondary">
              {product.condition}
            </Typography>
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
}
