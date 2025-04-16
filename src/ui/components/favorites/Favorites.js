import React, { useState, useEffect } from "react";
import {
  Container,
  Typography,
  Grid,
  Box,
  Button,
  Divider,
  Paper,
  useTheme,
  Chip,
  Fade,
  LinearProgress,
  Card,
  CardContent,
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
import { green } from "@mui/material/colors";

/**
 * Enhanced Favorites component with a sleek, modern UI
 * Now fetches favorite products directly from Supabase
 */
const Favorites = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const [favoriteProducts, setFavoriteProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [justSoldProduct, setJustSoldProduct] = useState(null);
  const [showSnackbar, setShowSnackbar] = useState(false);


  

  // Load favorites
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
  
      const normalizedProducts = filteredProducts.map((p) => ({
        ...p,
        category: p.category?.trim().toLowerCase(), // Normalize here too
      }));
  
      // Detect newly sold item
      const currentProductIds = normalizedProducts.map(p => p.productID || p.id);
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
  
      setFavoriteProducts(normalizedProducts);
      setLoading(false);
  
      localStorage.setItem(
        "lastFavorites",
        JSON.stringify(normalizedProducts.map((p) => p.productID || p.id))
      );
    };
  
    loadFavorites();
  
    window.addEventListener("storage", (e) => {
      if (e.key === "favorites") loadFavorites();
    });
  
    return () => window.removeEventListener("storage", () => {});
  }, []);
  

  const handleRemoveFromFavorites = (productId) => {
    // Use utility function to remove from favorites
    removeFavorite(productId);

    // Update UI
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
  
      const normalizedProducts = filteredProducts.map((p) => ({
        ...p,
        category: p.category?.trim().toLowerCase(), // Normalize here too
      }));
  
      // Detect newly sold item
      const currentProductIds = normalizedProducts.map(p => p.productID || p.id);
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
  
      setFavoriteProducts(normalizedProducts);
      setLoading(false);
  
      localStorage.setItem(
        "lastFavorites",
        JSON.stringify(normalizedProducts.map((p) => p.productID || p.id))
      );
    };
  
    loadFavorites();
  
    window.addEventListener("storage", (e) => {
      if (e.key === "favorites") loadFavorites();
    });
  
    return () => window.removeEventListener("storage", () => {});
  }, []);
  
  


  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header Section */}
      <Box
        sx={{
          mb: 4,
          display: "flex",
          flexDirection: isMobile ? "column" : "row",
          alignItems: isMobile ? "flex-start" : "center",
          justifyContent: "space-between",
          gap: 2,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center" }}>
          <IconButton
            onClick={handleBackToSearch}
            size="small"
            sx={{
              mr: 1.5,
              color: theme.palette.primary.main,
              bgcolor: `${theme.palette.primary.main}10`,
              "&:hover": {
                bgcolor: `${theme.palette.primary.main}20`,
              },
              width: 32,
              height: 32,
            }}
          >
            <ArrowBackIcon fontSize="small" />
          </IconButton>
          <Box>
            <Typography
              variant={isMobile ? "h5" : "h4"}
              component="h1"
              sx={{
                fontWeight: 600,
                color: theme.palette.text.primary,
                display: "flex",
                alignItems: "center",
                gap: 1,
              }}
            >
              <FavoriteIcon
                color="error"
                sx={{
                  fontSize: isMobile ? "0.8em" : "0.9em",
                  minWidth: isMobile ? 16 : 20,
                  minHeight: isMobile ? 16 : 20,
                }}
              />
              Your Favorites
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
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
              startIcon={<DeleteSweepIcon />}
              onClick={handleClearAllFavorites}
              size="small"
              sx={{
                borderRadius: 2,
                textTransform: "none",
                px: 1,
                py: 0.5,
                minWidth: "auto",
                maxWidth: "100px",
                width: "fit-content",
                alignSelf: isMobile ? "flex-start" : "center",
                mt: isMobile ? 1 : 0,
                "& .MuiButton-startIcon": {
                  mr: 0.5,
                },
              }}
            >
              Clear
            </Button>
          </Tooltip>
        )}
      </Box>

      {/* Loading State */}
      {loading && (
        <Box sx={{ width: "100%", mb: 4 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            Loading your favorites...
          </Typography>
          <LinearProgress color="primary" sx={{ borderRadius: 1 }} />
        </Box>
      )}

      {/* Main Content */}
      <Fade in={!loading}>
        <Box>
          {!loading && favoriteProducts.length === 0 ? (
            <Card
              elevation={0}
              sx={{
                
                p: { xs: 3, sm: 6 },
                borderRadius: 3,
                textAlign: "center",
                bgcolor: theme.palette.background.paper,
                border: `1px solid ${theme.palette.divider}`,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 2,
               
              }}
            >
              <ShoppingBagIcon
                sx={{
                  fontSize: isMobile ? 60 : 80,
                  color: theme.palette.action.disabled,
                  mb: 2,
                }}
              />
              <Typography variant="h6" fontWeight={500} color="text.primary">
                No favorites yet
              </Typography>
              <Typography
                variant="body1"
                color="text.secondary"
                paragraph
                sx={{ maxWidth: "85%" }}
              >
               
              </Typography>
              <Button
                variant="contained"
                color="primary"
                onClick={handleBackToSearch}
                size="medium"
                sx={{
                  mt: 2,
                  borderRadius: 2,
                  px: 3,
                  py: 0.75,
                  textTransform: "none",
                  fontWeight: 500,
                }}
              >
                Back to Home
              </Button>
            </Card>
          ) : (
            <>
              {/* Categories filter chips - only show if we have products */}
              {favoriteProducts.length > 0 && (
                <Box
                sx={{
                  mb: 3,
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 1,
                  overflowX: isMobile ? "auto" : "visible",
                  pb: isMobile ? 1 : 0,
                }}
              >
                <Chip
                  label="All"
                  color={selectedCategory === "All" ? "primary" : "default"}
                  variant={selectedCategory === "All" ? "filled" : "outlined"}
                  size="small"
                  sx={{ borderRadius: 2 }}
                  onClick={() => setSelectedCategory("All")}
                />
              
                {Array.from(
                  new Set(favoriteProducts.map((p) => p.category).filter(Boolean))
                ).map((category) => (
                  <Chip
                    key={category}
                    label={category.charAt(0).toUpperCase() + category.slice(1)} // Capitalize
                    color={selectedCategory === category ? "primary" : "default"}
                    variant={selectedCategory === category ? "filled" : "outlined"}
                    size="small"
                    sx={{ borderRadius: 2 }}
                    onClick={() => setSelectedCategory(category)}
                  />
                ))}
              </Box>
              
              )}

              {/* Products Grid */}
              <Box
                sx={{
                  bgcolor: theme.palette.background.paper,
                  borderRadius: 3,
                  p: { xs: 1.5, md: 3 },
                  border: `1px solid ${theme.palette.divider}`,
                  boxShadow: "0 4px 20px rgba(0,0,0,0.05)",
                }}
              >
                <Grid container spacing={{ xs: 2, md: 3 }}>
                {favoriteProducts
  .filter(
    (product) =>
      selectedCategory === "All" || 
    product.category?.toLowerCase() === selectedCategory.toLowerCase()

  )
  .map((product) => {
                    
                    const productId = product.productID || product.id;
                    return (
                      <Grid item xs={12} sm={6} md={4} key={productId}>
                        <Box
                          sx={{
                      
                            display: "flex",
                            height: "100%",
                            transition: "transform 0.2s ease-in-out",
                            "&:hover": { transform: "translateY(-4px)" },
                          }}
                        >
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
    sx={{ borderRadius: 1, bgcolor: "#ffc72c", color: "#000" }}
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
