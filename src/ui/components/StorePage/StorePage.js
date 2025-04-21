import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
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
import { Link } from "react-router-dom";

const StorePage = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sellerInfo, setSellerInfo] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState("All");

  useEffect(() => {
    const fetchData = async () => {
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("firstName, lastName")
        .eq("userID", userId)
        .single();
      if (userError) console.error(userError);
      else setSellerInfo(userData);

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

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 8 }}>
      {loading ? (
        <Box sx={{ textAlign: "center", py: 5 }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          {/* Header with Message button aligned right */}
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
              boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
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
  variant="contained"
  startIcon={<EmailIcon sx={{ fontSize: 16 }} />}
  onClick={openChatWithSeller}
  sx={{
    textTransform: 'none',
    py: 0.3,
    px: 1,
    fontSize: '0.75rem',
    minWidth: 'auto',
    width: 'fit-content',
  }}
>
  Message Seller
</Button>
          </Paper>

          {/* Category Filters */}
          {products.length > 0 && (
            <Box sx={{ mb: 3, display: 'flex', gap: 1, overflowX: 'auto' }}>
              <Chip
                label="All"
                size="small"
                color={selectedCategory === 'All' ? 'primary' : 'default'}
                variant={selectedCategory === 'All' ? 'filled' : 'outlined'}
                onClick={() => setSelectedCategory('All')}
                sx={{ borderRadius: 2 }}
              />
              {Array.from(new Set(products.map(p => p.category).filter(Boolean))).map(cat => (
                <Chip
                  key={cat}
                  label={cat.charAt(0).toUpperCase() + cat.slice(1)}
                  size="small"
                  color={selectedCategory === cat ? 'primary' : 'default'}
                  variant={selectedCategory === cat ? 'filled' : 'outlined'}
                  onClick={() => setSelectedCategory(cat)}
                  sx={{ borderRadius: 2 }}
                />
              ))}
            </Box>
          )}

          {/* Product Grid or Empty Message */}
          {products.length === 0 ? (
            <Typography variant="body1" color="text.secondary">
              This seller currently has no available products.
            </Typography>
          ) : (
            <Grid container spacing={3}>
              {products
                .filter(p => selectedCategory === 'All' || p.category === selectedCategory)
                .map(product => (
                  <Grid item xs={12} sm={6} md={4} key={product.id}>
                    <Link to={`/product/${product.productID || product.id}`} style={{ textDecoration: 'none' }}>
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
