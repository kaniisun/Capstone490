import React, { useState, useEffect } from "react";
import {
  Container,
  Typography,
  Grid,
  Box,
  Button,
  useTheme,
  Chip,
  Fade,
  LinearProgress,
  Card,
  IconButton,
  Tooltip,
  useMediaQuery,
  Alert,
  Snackbar,
} from "@mui/material";
import ProductCard from "../ChatSearch/components/ProductCard";
import {
  getFavoriteIds,
  getFavoriteProducts,
  removeFavorite,
  clearAllFavorites,
} from "../../../utils/favoriteUtils";
import FavoriteIcon from "@mui/icons-material/Favorite";
import DeleteSweepIcon from "@mui/icons-material/DeleteSweep";
import ShoppingBagIcon from "@mui/icons-material/ShoppingBag";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../../supabaseClient";
import "./Favorites.css";

 //Now fetches favorite products directly from Supabase
 
const Favorites = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const [favoriteProducts, setFavoriteProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [justSoldProduct, setJustSoldProduct] = useState(null);
  const [showSnackbar, setShowSnackbar] = useState(false);


  useEffect(() => {
    const loadFavorites = async () => {
      setLoading(true);
      const favoriteIds = getFavoriteIds();
      const previouslySaved = JSON.parse(localStorage.getItem("lastFavorites") || "[]");

      if (favoriteIds.length === 0) {
        setFavoriteProducts([]);
        setLoading(false);
        localStorage.setItem("lastFavorites", JSON.stringify([]));
        return;
      }

      const products = await getFavoriteProducts(supabase, favoriteIds);

      const filteredProducts = products.filter((product) => {
        const isTest = String(product.productID || product.id).startsWith("test");
        const isAvailable = product.status?.toLowerCase() === "available";
        return !isTest && isAvailable;
      });

      const currentProductIds = filteredProducts.map(p => p.productID || p.id);
      const lostProducts = previouslySaved.filter(id => !currentProductIds.includes(id));

      if (lostProducts.length > 0) {
        const lostProductId = lostProducts[0];
        const lostProduct = products.find(p => (p.productID || p.id) === lostProductId);
        if (lostProduct) {
          setJustSoldProduct(lostProduct.name);
          setShowSnackbar(true);
        }
        removeFavorite(lostProductId);
      }

      setFavoriteProducts(filteredProducts);
      setLoading(false);

      localStorage.setItem(
        "lastFavorites",
        JSON.stringify(filteredProducts.map((p) => p.productID || p.id))
      );
    };

    loadFavorites();

    const handleStorageChange = (e) => {
      if (e.key === "favorites") {
        loadFavorites();
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => {
      window.removeEventListener("storage", handleStorageChange);
    };
  }, []);

  const handleRemoveFromFavorites = (productId) => {
    removeFavorite(productId);
    setFavoriteProducts((prev) =>
      prev.filter((product) => {
        const id = product.productID || product.id;
        return id.toString() !== productId.toString();
      })
    );
  };

  const handleClearAllFavorites = () => {
    if (window.confirm("Are you sure you want to clear all favorites?")) {
      clearAllFavorites();
      setFavoriteProducts([]);
    }
  };

  const handleContactSeller = (product) => {
    alert(`Contacting seller about: ${product.name}`);
  };

  const handleBackToSearch = () => {
    navigate("/home");
  };

  return (
    <Container maxWidth="lg" className="favorites-container">
      {/* Header Section */}
      <Box className={`favorites-header ${isMobile ? 'favorites-header-mobile' : ''}`}>
        <Box className="favorites-title-container">
          <IconButton
            onClick={handleBackToSearch}
            size="small"
            className="back-button"
          >
            <ArrowBackIcon fontSize="small" />
          </IconButton>
          <Box>
            <Typography
              variant={isMobile ? "h5" : "h4"}
              component="h1"
              className={`favorites-title ${isMobile ? 'favorites-title-mobile' : ''}`}
            >
              <FavoriteIcon
                color="error"
                className={`favorites-icon ${isMobile ? 'favorites-icon-mobile' : ''}`}
              />
              Your Favorites
            </Typography>
            <Typography variant="body2" className="favorites-subtitle">
              {favoriteProducts.length}{" "}
              {favoriteProducts.length === 1 ? "item" : "items"} saved for later
            </Typography>
          </Box>
        </Box>

        {favoriteProducts.length > 0 && (
          <Tooltip title="Clear all favorites">
            <Button
              variant="outlined"
              color="error"
              startIcon={<DeleteSweepIcon className="clear-button-icon" />}
              onClick={handleClearAllFavorites}
              size="small"
              className={`clear-button ${isMobile ? 'clear-button-mobile' : ''}`}
            >
              Clear
            </Button>
          </Tooltip>
        )}
      </Box>

      {/* Loading State */}
      {loading && (
        <Box className="loading-container">
          <Typography variant="body2" className="loading-text">
            Loading your favorites...
          </Typography>
          <LinearProgress color="primary" className="loading-progress" />
        </Box>
      )}

      {/* Main Content */}
      <Fade in={!loading}>
        <Box>
          {!loading && favoriteProducts.length === 0 ? (
            <Card
              elevation={0}
              className={`empty-state-card ${isMobile ? 'empty-state-card-mobile' : ''}`}
            >
              <ShoppingBagIcon
                className={`empty-state-icon ${isMobile ? 'empty-state-icon-mobile' : ''}`}
              />
              <Typography variant="h6" className="empty-state-title">
                No favorites yet
              </Typography>
              <Typography
                variant="body1"
                className="empty-state-description"
              >
                Items you favorite while browsing will appear here.
              </Typography>
              <Button
                variant="contained"
                color="primary"
                onClick={handleBackToSearch}
                size="medium"
                className="empty-state-button"
              >
                Back to Home
              </Button>
            </Card>
          ) : (
            <>
              {/* Categories filter chips */}
              {favoriteProducts.length > 0 && (
                <Box className={`categories-container ${isMobile ? 'categories-container-mobile' : ''}`}>
                  <Chip
                    label="All"
                    color={selectedCategory === "All" ? "primary" : "default"}
                    variant={selectedCategory === "All" ? "filled" : "outlined"}
                    size="small"
                    className="category-chip"
                    onClick={() => setSelectedCategory("All")}
                  />
                  {Array.from(
                    new Set(favoriteProducts.map((p) => p.category).filter(Boolean))
                  ).map((category) => (
                    <Chip
                      key={category}
                      label={category}
                      color={selectedCategory === category ? "primary" : "default"}
                      variant={selectedCategory === category ? "filled" : "outlined"}
                      size="small"
                      className="category-chip"
                      onClick={() => setSelectedCategory(category)}
                    />
                  ))}
                </Box>
              )}

              {/* Products Grid */}
              <Box className={`products-grid-container ${isMobile ? 'products-grid-container-mobile' : ''}`}>
                <Grid container spacing={3}>
                  {favoriteProducts
                    .filter(
                      (product) =>
                        selectedCategory === "All" || product.category === selectedCategory
                    )
                    .map((product) => {
                      const productId = product.productID || product.id;
                      return (
                        <Grid item xs={12} sm={4} key={productId}>
                          <Box className="product-card-container">
                            <ProductCard
                              product={product}
                              onContactClick={handleContactSeller}
                              isFavoritesPage={true}
                              onRemoveFavorite={handleRemoveFromFavorites}
                            />
                          </Box>
                        </Grid>
                      );
                    })}
                </Grid>
              </Box>
            </>
          )}
        </Box>
      </Fade>
      <Snackbar
        open={showSnackbar}
        autoHideDuration={6000}
        onClose={() => setShowSnackbar(false)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={() => setShowSnackbar(false)}
          severity="warning"
          variant="filled"
          className="sold-alert"
        >
          {justSoldProduct
            ? `"${justSoldProduct}" is no longer available and has been removed from your favorites.`
            : "One of your favorites is no longer available."}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default Favorites;
