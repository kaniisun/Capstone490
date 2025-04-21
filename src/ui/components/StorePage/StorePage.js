import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "../../../supabaseClient";
import "./StorePage.css";
import StoreProductCard from "./StoreProductCard";

import {
  Container,
  Typography,
  Grid,
  CircularProgress,
  Avatar,
  Box,
  Paper,
  Button,
  Chip,
} from "@mui/material";
import EmailIcon from '@mui/icons-material/Email';

const StorePage = () => {
  const { userId } = useParams();
  const navigate = useNavigate();

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sellerInfo, setSellerInfo] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [sortOrder, setSortOrder] = useState("low-high");

  useEffect(() => {
    const fetchData = async () => {
      // Seller info
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("firstName, lastName")
        .eq("userID", userId)
        .single();
      if (userError) console.error(userError);
      else setSellerInfo(userData);

      // Products
      const { data: productData, error: productError } = await supabase
        .from("products")
        .select("*", { count: "exact" })
        .eq("userID", userId)
        .eq("is_deleted", false)
        .eq("moderation_status", "approved")
        .ilike("status", "available");
      if (productError) console.error(productError);
      else {
        setProducts(
          productData.map(p => ({
            ...p,
            category: p.category?.trim().toLowerCase(),
          }))
        );
      }

      setLoading(false);
    };
    fetchData();
  }, [userId]);

  const openChatWithSeller = () => navigate(`/messaging/${userId}`);

  // Filter and sort products
  const displayProducts = products
    .filter(
      p => selectedCategory === "All" || p.category === selectedCategory
    )
    .sort((a, b) =>
      sortOrder === "low-high"
        ? parseFloat(a.price) - parseFloat(b.price)
        : parseFloat(b.price) - parseFloat(a.price)
    );

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 8 }}>
      {loading ? (
        <Box sx={{ textAlign: "center", py: 5 }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          {/* Header with Message Seller */}
          <Paper
            elevation={3}
            sx={{
              mb: 4,
              p: 4,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'linear-gradient(to right, #fffbe6, #fff6cc)',
              borderRadius: 3,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
              <Avatar
                alt={`${sellerInfo?.firstName} ${sellerInfo?.lastName}`}
                sx={{ width: 80, height: 80, fontSize: 28, bgcolor: '#ffe082' }}
              >
                {sellerInfo?.firstName?.[0]}
              </Avatar>
              <Box>
                <Typography variant="h4" fontWeight={700}>
                  {sellerInfo?.firstName}'s Store
                </Typography>
                <Typography variant="subtitle1" color="text.secondary">
                  {products.length} product{products.length !== 1 && 's'} available
                </Typography>
              </Box>
            </Box>
            <Button
              size="small"
              variant="outlined"
              onClick={openChatWithSeller}
              sx={{
                textTransform: 'none',
                borderRadius: 2,
                px: 1.5,
                py: 0.5,
                fontSize: '0.75rem',
                backgroundColor: '#0f2044',
                color: '#ffffff',
                '&:hover': {
                  backgroundColor: '#1a3366',
                  transform: 'translateY(-2px)',
                  color: '#ffffff',
                },
                minWidth: 'auto',
                width: 'fit-content',
              }}
              startIcon={<EmailIcon sx={{ fontSize: 16 }} />}
            >
              Message Seller
            </Button>
          </Paper>

          {/* Category Filters */}
          <Box sx={{ mb: 1, display: 'flex', gap: 1, overflowX: 'auto' }}>
            <Chip
              label="All"
              size="small"
              color={selectedCategory === 'All' ? 'primary' : 'default'}
              variant={selectedCategory === 'All' ? 'filled' : 'outlined'}
              onClick={() => setSelectedCategory('All')}
              sx={{
                borderRadius: 2,
                '&:hover': {
                  backgroundColor: '#1a3366',
                  transform: 'translateY(-2px)',
                  color: '#ffffff',
                },
              }}
            />

            {Array.from(new Set(products.map(p => p.category).filter(Boolean))).map(
              cat => (
                <Chip
                  key={cat}
                  label={cat.charAt(0).toUpperCase() + cat.slice(1)}
                  size="small"
                  color={selectedCategory === cat ? 'primary' : 'default'}
                  variant={selectedCategory === cat ? 'filled' : 'outlined'}
                  onClick={() => setSelectedCategory(cat)}
                  sx={{ borderRadius: 2,
                    '&:hover': {
                      transform: 'translateY(-2px)',
                    },
                   }}
                />
              )
            )}
          </Box>

          {/* Sort Toggle Button */}
          <Box sx={{ mb: 3, display: 'flex' }}>
            <Button
              size="small"
              variant="outlined"
              onClick={() =>
                setSortOrder(prev => (prev === 'low-high' ? 'high-low' : 'low-high'))
              }
              sx={{
                textTransform: 'none',
                borderRadius: 2,
                px: 2,
                py: 0.5,
                fontSize: '0.75rem',
                minWidth: 'auto',
                width: 'fit-content',
                backgroundColor: '#0f2044',
                color: '#ffffff',
                '&:hover': {
                  backgroundColor: '#1a3366',
                  transform: 'translateY(-2px)',
                  color: '#ffffff',
                },
              }}
            >
              {sortOrder === 'low-high'
                ? 'Price: Low → High'
                : 'Price: High → Low'}
            </Button>
          </Box>

          {/* Products Grid */}
          {displayProducts.length === 0 ? (
            <Typography variant="body1" color="text.secondary">
              No products to display.
            </Typography>
          ) : (
            <Grid container spacing={3}>
              {displayProducts.map(product => (
                <Grid
                  item
                  xs={12}
                  sm={6}
                  md={4}
                  key={product.productID || product.id}
                >
                  <Link
                    to={`/product/${product.productID || product.id}`}
                    style={{ textDecoration: 'none' }}
                  >
                    <Box className="product-card-hover">
                      <StoreProductCard product={product} />
                    </Box>
                  </Link>
                </Grid>
              ))}
            </Grid>
          )}
        </>
      )}
    </Container>
  );
};

export default StorePage;
