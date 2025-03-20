import React, { useState, useEffect } from "react";
import { supabase } from "../../../supabaseClient";
import { useNavigate } from "react-router-dom";
import "./uploadProduct.css";

// Material-UI imports
import {
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Container,
  Divider,
  FormControl,
  FormControlLabel,
  FormHelperText,
  Grid,
  InputAdornment,
  MenuItem,
  Paper,
  Select,
  TextField,
  Typography,
  Alert,
  Snackbar,
  IconButton,
  CircularProgress,
  useTheme,
} from "@mui/material";
import {
  CloudUpload as CloudUploadIcon,
  AddPhotoAlternate as AddPhotoIcon,
  Save as SaveIcon,
  ArrowBack as ArrowBackIcon,
} from "@mui/icons-material";

const UploadProduct = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const [userId, setUserId] = useState(null);
  const [product, setProduct] = useState({
    name: "",
    description: "",
    condition: "new",
    category: "furniture",
    price: "",
    imageFile: null,
    is_bundle: false,
    status: "Available",
    flag: false,
  });
  const [loading, setLoading] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });

  // Get the current user's ID when component mounts
  useEffect(() => {
    const getCurrentUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        navigate("/login");
        return;
      }
      setUserId(user.id);
    };

    getCurrentUser();
  }, [navigate]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;

    // Capitalize first letter for category and condition
    if (name === "category" || name === "condition") {
      const capitalizedValue = value
        .split(" ")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
      setProduct({ ...product, [name]: capitalizedValue });
    } else {
      setProduct({ ...product, [name]: value });
    }
  };

  const handleCheckboxChange = (e) => {
    setProduct({ ...product, is_bundle: e.target.checked });
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setProduct({ ...product, imageFile: file });

      // Create a preview URL for the selected image
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!userId) {
        throw new Error("User not authenticated");
      }

      let imageUrl = null;

      if (product.imageFile) {
        const fileExt = product.imageFile.name.split(".").pop();
        const fileName = `${userId}_${Date.now()}.${fileExt}`;
        const filePath = `uploads/${fileName}`;

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("product-images")
          .upload(filePath, product.imageFile, { upsert: false });

        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage
          .from("product-images")
          .getPublicUrl(filePath);

        imageUrl = publicUrlData.publicUrl;
      }

      const { data, error: productError } = await supabase
        .from("products")
        .insert([
          {
            userID: userId,
            name: product.name,
            description: product.description,
            condition: product.condition,
            category: product.category,
            price: parseFloat(product.price),
            image: imageUrl,
            status: product.status,
            is_bundle: product.is_bundle,
            flag: product.flag,
            created_at: new Date().toISOString(),
            modified_at: new Date().toISOString(),
          },
        ])
        .select();

      if (productError) throw productError;

      // Show success message
      setSnackbar({
        open: true,
        message: "Product uploaded successfully!",
        severity: "success",
      });

      // Navigate to account dashboard after successful upload
      setTimeout(() => navigate("/account"), 1500);
    } catch (error) {
      console.error("Error uploading product:", error);
      setSnackbar({
        open: true,
        message: error.message || "Failed to upload product",
        severity: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCloseSnackbar = (event, reason) => {
    if (reason === "clickaway") {
      return;
    }
    setSnackbar({ ...snackbar, open: false });
  };

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 6 }}>
      <Paper elevation={2} sx={{ p: 3, borderRadius: 2 }}>
        <Box
          sx={{
            mb: 3,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Typography variant="h5" component="h1" fontWeight="500">
            Upload New Product
          </Typography>
          <IconButton
            color="primary"
            onClick={() => navigate("/account")}
            sx={{ borderRadius: 1 }}
          >
            <ArrowBackIcon />
            <Typography variant="body2" sx={{ ml: 0.5 }}>
              Back
            </Typography>
          </IconButton>
        </Box>
        <Divider sx={{ mb: 4 }} />

        <Box component="form" onSubmit={handleSubmit} noValidate>
          <Grid container spacing={3}>
            {/* Product info section */}
            <Grid item xs={12} md={7}>
              <Card variant="outlined" sx={{ p: 2, mb: 3, borderRadius: 2 }}>
                <Typography variant="subtitle1" fontWeight="500" gutterBottom>
                  Product Information
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Product Name"
                      name="name"
                      value={product.name}
                      onChange={handleInputChange}
                      required
                      variant="outlined"
                      sx={{
                        mb: 2,
                        "& .MuiOutlinedInput-root": {
                          borderRadius: 1,
                        },
                      }}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Description"
                      name="description"
                      value={product.description}
                      onChange={handleInputChange}
                      required
                      multiline
                      rows={4}
                      variant="outlined"
                      sx={{
                        mb: 2,
                        "& .MuiOutlinedInput-root": {
                          borderRadius: 1,
                        },
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth sx={{ mb: 2 }}>
                      <TextField
                        select
                        label="Condition"
                        name="condition"
                        value={product.condition}
                        onChange={handleInputChange}
                        required
                        variant="outlined"
                        sx={{
                          "& .MuiOutlinedInput-root": {
                            borderRadius: 1,
                          },
                        }}
                      >
                        <MenuItem value="New">New</MenuItem>
                        <MenuItem value="Like New">Like New</MenuItem>
                        <MenuItem value="Good">Good</MenuItem>
                        <MenuItem value="Fair">Fair</MenuItem>
                        <MenuItem value="Poor">Poor</MenuItem>
                      </TextField>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth sx={{ mb: 2 }}>
                      <TextField
                        select
                        label="Category"
                        name="category"
                        value={product.category}
                        onChange={handleInputChange}
                        required
                        variant="outlined"
                        sx={{
                          "& .MuiOutlinedInput-root": {
                            borderRadius: 1,
                          },
                        }}
                      >
                        <MenuItem value="furniture">Furniture</MenuItem>
                        <MenuItem value="personal">Personal</MenuItem>
                        <MenuItem value="books">Books</MenuItem>
                        <MenuItem value="electronics">Electronics</MenuItem>
                        <MenuItem value="clothing">Clothing</MenuItem>
                        <MenuItem value="miscellaneous">Miscellaneous</MenuItem>
                      </TextField>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Price"
                      name="price"
                      type="number"
                      value={product.price}
                      onChange={handleInputChange}
                      required
                      variant="outlined"
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">$</InputAdornment>
                        ),
                      }}
                      sx={{
                        mb: 2,
                        "& .MuiOutlinedInput-root": {
                          borderRadius: 1,
                        },
                      }}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={product.is_bundle}
                          onChange={handleCheckboxChange}
                          color="primary"
                        />
                      }
                      label="Available for Bundling"
                    />
                  </Grid>
                </Grid>
              </Card>
            </Grid>

            {/* Image upload section */}
            <Grid item xs={12} md={5}>
              <Card
                variant="outlined"
                sx={{
                  p: 2,
                  mb: 3,
                  borderRadius: 2,
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <Typography variant="subtitle1" fontWeight="500" gutterBottom>
                  Product Image
                </Typography>
                <Box
                  sx={{
                    border: "1px dashed",
                    borderColor: "divider",
                    borderRadius: 1,
                    p: 2,
                    mb: 2,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    flexGrow: 1,
                    bgcolor: "grey.50",
                    position: "relative",
                    overflow: "hidden",
                  }}
                >
                  {imagePreview ? (
                    <Box
                      component="img"
                      src={imagePreview}
                      alt="Product preview"
                      sx={{
                        maxWidth: "100%",
                        maxHeight: "200px",
                        objectFit: "contain",
                      }}
                    />
                  ) : (
                    <Box sx={{ textAlign: "center", color: "text.secondary" }}>
                      <AddPhotoIcon
                        sx={{ fontSize: 60, mb: 1, color: "text.disabled" }}
                      />
                      <Typography variant="body2">No image selected</Typography>
                    </Box>
                  )}
                </Box>

                <Button
                  component="label"
                  variant="outlined"
                  startIcon={<CloudUploadIcon />}
                  sx={{
                    borderRadius: 1,
                    textTransform: "none",
                  }}
                >
                  Upload Image
                  <input
                    type="file"
                    hidden
                    name="imageFile"
                    onChange={handleFileChange}
                    accept="image/*"
                  />
                </Button>
                <FormHelperText>
                  Recommended size: 600x600 pixels
                </FormHelperText>
              </Card>
            </Grid>

            {/* Submit button */}
            <Grid item xs={12}>
              <Divider sx={{ mb: 3 }} />
              <Box sx={{ display: "flex", justifyContent: "center" }}>
                <Button
                  type="submit"
                  variant="contained"
                  disabled={loading}
                  startIcon={
                    loading ? (
                      <CircularProgress size={18} color="inherit" />
                    ) : (
                      <SaveIcon />
                    )
                  }
                  sx={{
                    borderRadius: 1,
                    py: 1.2,
                    px: 4,
                    textTransform: "none",
                  }}
                >
                  {loading ? "Uploading..." : "Upload Product"}
                </Button>
              </Box>
            </Grid>
          </Grid>
        </Box>
      </Paper>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={5000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbar.severity === "error" ? "error" : "success"}
          variant="filled"
          sx={{ width: "100%", borderRadius: 1 }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default UploadProduct;
