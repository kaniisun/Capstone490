import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../../../supabaseClient";
import "./UserProfile.css";
import {
  Container,
  Typography,
  Grid,
  CircularProgress,
  Avatar,
  Box,
  Divider,
  Paper,
} from "@mui/material";
import ProductCard from "../ChatSearch/components/ProductCard";
import { Link } from "react-router-dom";
import { Chip } from "@mui/material";



const UserProfile = () => {
  const { userId } = useParams();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sellerInfo, setSellerInfo] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState("All");

  useEffect(() => {
    const fetchData = async () => {
      // Fetch seller info
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("firstName, lastName")
        .eq("userID", userId)
        .single();

      if (userError) {
        console.error("Error fetching user info:", userError.message);
      } else {
        setSellerInfo(userData);
      }

      // Fetch available products (case-insensitive)
      const { data: productData, error: productError } = await supabase
        .from("products")
        .select("*")
        .eq("userID", userId)
        .ilike("status", "available"); 

      if (productError) {
        console.error("Error loading products:", productError.message);
      } else {
        setProducts(productData);
      }
      const normalizedProducts = productData.map((p) => ({
        ...p,
        category: p.category?.trim().toLowerCase(),
      }));
      
      setProducts(normalizedProducts);

      setLoading(false);
    };

    fetchData();
  }, [userId]);

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 8 }}>
      {loading ? (
        <Box sx={{ textAlign: "center", py: 5 }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          {/* Storefront Header */}
          <Paper
            elevation={3}
            sx={{
              mb: 4,
              p: 4,
              background: "linear-gradient(to right, #fffbe6, #fff6cc)",
              borderRadius: 3,
              display: "flex",
              alignItems: "center",
              gap: 3,
              boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
            }}
          >
            <Avatar
              alt={`${sellerInfo?.firstName} ${sellerInfo?.lastName}`}
              sx={{
                width: 80,
                height: 80,
                fontSize: 28,
                bgcolor: "#ffe082",
              }}
            >
              {sellerInfo?.firstName?.[0]}
            </Avatar>
            <Box>
              <Typography variant="h4" fontWeight={700}>
                {sellerInfo?.firstName} 's Store
              </Typography>
              <Typography variant="subtitle1" color="text.secondary">
                {products.length} product{products.length !== 1 ? "s" : ""} available
              </Typography>
            </Box>
          </Paper>

          {/* Product Grid */}
          {products.length === 0 ? (
            <Typography variant="body1" color="text.secondary">
              This seller currently has no available products.
            </Typography>
          ) : (
            <>
              <Typography variant="h5" sx={{ mb: 2, fontWeight: 600 }}>
                Available Products
              </Typography>

              {products.length > 0 && (
  <Box
    sx={{
      mb: 3,
      display: "flex",
      flexWrap: "wrap",
      gap: 1,
      overflowX: "auto",
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
      new Set(products.map((p) => p.category).filter(Boolean))
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

              
              <Grid container spacing={3}>
                {products
  .filter(
    (product) =>
      selectedCategory === "All" ||
      product.category?.toLowerCase() === selectedCategory.toLowerCase()
  )
  .map((product) => (

                  <Grid item xs={12} sm={6} md={4} key={product.id}>
                  <Link
                    to={`/product/${product.productID || product.id}`}
                    className="product-card-link"
                    style={{ textDecoration: "none" }}
                  >
                    <Box className="product-card-hover">
                      <ProductCard product={product} />
                    </Box>
                  </Link>
                </Grid>
                
                ))}
              </Grid>
            </>
          )}
        </>
      )}
    </Container>
  );
};

export default UserProfile;
