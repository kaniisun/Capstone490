import React, { useState, useEffect } from "react";
import { supabase } from "../../../supabaseClient";
import { useNavigate } from "react-router-dom";
import "./uploadProduct.css";
import {
  getFormattedImageUrl,
  fixImageContentType,
} from "../ChatSearch/utils/imageUtils";

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

    // Only capitalize condition, but keep category as lowercase to match menu values
    if (name === "condition") {
      const capitalizedValue = value
        .split(" ")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
      setProduct({ ...product, [name]: capitalizedValue });
    } else if (name === "category") {
      // Ensure category value stays lowercase to match menu options
      setProduct({ ...product, [name]: value.toLowerCase() });
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

        // Generate a safe and unique filename with timestamp
        const timestamp = Date.now();
        const safeFilename = product.imageFile.name
          .split(".")[0]
          .replace(/[^a-z0-9]/gi, "_")
          .toLowerCase()
          .substring(0, 20);
        const fileName = `${timestamp}-${safeFilename}-${userId.substring(
          0,
          8
        )}.${fileExt}`;

        // Use the 'uploads' folder for consistent storage
        const filePath = `uploads/${fileName}`;

        console.log("Uploading image with details:", {
          originalName: product.imageFile.name,
          timestamp: timestamp,
          fileSize: Math.round(product.imageFile.size / 1024) + "KB",
          fileType: product.imageFile.type,
          targetPath: filePath,
        });

        // Extract MIME type from file or determine from extension
        let contentType = product.imageFile.type;
        if (!contentType || contentType === "application/octet-stream") {
          // Fallback to extension-based content type
          if (fileExt.toLowerCase() === "png") contentType = "image/png";
          else if (fileExt.toLowerCase() === "gif") contentType = "image/gif";
          else if (fileExt.toLowerCase() === "webp") contentType = "image/webp";
          else if (fileExt.toLowerCase() === "svg")
            contentType = "image/svg+xml";
          else contentType = "image/jpeg"; // Default to JPEG

          console.log(
            "Content type not detected, using extension-based type:",
            contentType
          );
        }

        // Upload with correct content type and upsert option
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("product-images")
          .upload(filePath, product.imageFile, {
            upsert: true,
            contentType: contentType, // Explicitly set the MIME type
          });

        if (uploadError) {
          console.error("Upload error details:", uploadError);
          throw uploadError;
        }

        console.log("Image uploaded successfully:", uploadData);

        // Get the public URL using storage API
        const { data: publicUrlData } = supabase.storage
          .from("product-images")
          .getPublicUrl(filePath);

        console.log("Retrieved public URL data:", publicUrlData);

        if (!publicUrlData?.publicUrl) {
          throw new Error("Failed to get public URL for uploaded image");
        }

        // Store the full public URL in the database
        imageUrl = publicUrlData.publicUrl;
        console.log("Final image URL to be stored:", imageUrl);

        // Verify the image is accessible by attempting to fetch it
        try {
          const checkResponse = await fetch(imageUrl, { method: "HEAD" });
          console.log(
            "Image URL check status:",
            checkResponse.status,
            "Content-Type:",
            checkResponse.headers.get("content-type")
          );

          // If content type is wrong, fix it
          if (
            checkResponse.ok &&
            checkResponse.headers.get("content-type") === "application/json"
          ) {
            console.log("Detected wrong content type. Attempting to fix...");

            // Fix the content type using our utility function
            const fixResult = await fixImageContentType(filePath);

            if (fixResult.success && fixResult.url) {
              console.log("Successfully fixed image content type.");
              imageUrl = fixResult.url; // Use the fixed URL
            } else {
              console.warn(
                "Could not fix image content type:",
                fixResult.message
              );
            }
          }

          if (!checkResponse.ok) {
            console.warn("The image URL might not be accessible:", imageUrl);
          }
        } catch (fetchError) {
          console.warn("Error checking image URL:", fetchError);
        }
      }

      const { data, error: productError } = await supabase
        .from("products")
        .insert([
          {
            userID: userId,
            name: product.name,
            description: product.description,
            condition: product.condition.toLowerCase(),
            category: product.category.toLowerCase(),
            price: parseFloat(product.price),
            image: imageUrl, // Store the full public URL in the image field only
            status: "available",
            is_bundle: product.is_bundle,
            flag: product.flag,
            created_at: new Date().toISOString(),
            modified_at: new Date().toISOString(),
            is_deleted: false, // Explicitly set is_deleted to false for new products
            moderation_status: "pending", // Add moderation status
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

                        <MenuItem value="textbooks">Textbooks</MenuItem>

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
