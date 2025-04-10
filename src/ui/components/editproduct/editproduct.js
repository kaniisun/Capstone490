import React, { useState, useEffect } from "react";
import { supabase } from "../../../supabaseClient";
import { useNavigate, useParams, Link } from "react-router-dom";
import "./editproduct.css";
// Import image utility function
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
  Edit as EditIcon,
  Save as SaveIcon,
  ArrowBack as ArrowBackIcon,
} from "@mui/icons-material";

const EditProduct = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const { productID } = useParams();
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);
  const [product, setProduct] = useState({
    name: "",
    description: "",
    condition: "",
    category: "",
    price: "",
    imageFile: null,
    is_bundle: false,
    status: "Available",
    image: "",
  });
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });

  useEffect(() => {
    const fetchProduct = async () => {
      if (!productID) {
        console.error("No product ID provided");
        setSnackbar({
          open: true,
          message: "No product ID provided",
          severity: "error",
        });
        navigate("/account");
        return;
      }

      console.log("Fetching product with ID:", productID);

      try {
        const { data, error } = await supabase
          .from("products")
          .select("*")
          .eq("productID", productID)
          .single();

        if (error) {
          console.error("Database error:", error);
          throw error;
        }

        if (!data) {
          throw new Error("Product not found");
        }

        console.log("Fetched product data:", data);

        // Convert condition and category to lowercase to match menu options
        const formattedData = {
          ...data,
          condition: data.condition ? data.condition.toLowerCase() : "",
          category: data.category ? data.category.toLowerCase() : "",
          imageFile: null,
        };

        setProduct(formattedData);

        // Set image preview using formatted URL
        if (data.image) {
          console.log("Image URL from database:", data.image);
          const formattedUrl = getFormattedImageUrl(data.image);
          console.log("Formatted image URL:", formattedUrl);
          setImagePreview(formattedUrl);
        } else {
          setImagePreview(null);
        }
      } catch (error) {
        console.error("Error fetching product:", error);
        setSnackbar({
          open: true,
          message: `Error fetching product details: ${error.message}`,
          severity: "error",
        });
        navigate("/account");
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [productID, navigate]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;

    // Ensure condition and category values match the case used in MenuItem values
    if (name === "condition" || name === "category") {
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

  const handleCloseSnackbar = (event, reason) => {
    if (reason === "clickaway") {
      return;
    }
    setSnackbar({ ...snackbar, open: false });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setUpdating(true);

    try {
      let imageUrl = product.image; // Keep existing image URL by default

      // Upload new image if one was selected
      if (product.imageFile) {
        const fileExt = product.imageFile.name.split(".").pop();

        // Generate a safe and unique filename with timestamp
        const timestamp = Date.now();
        const safeFilename = product.imageFile.name
          .split(".")[0]
          .replace(/[^a-z0-9]/gi, "_")
          .toLowerCase()
          .substring(0, 20);
        const fileName = `${timestamp}-${safeFilename}-${productID.substring(
          0,
          8
        )}.${fileExt}`;

        // Use the uploads folder for consistent storage
        const filePath = `uploads/${fileName}`;

        console.log("Uploading edited product image:", {
          originalName: product.imageFile.name,
          timestamp: timestamp,
          productID: productID,
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

        const { error: uploadError } = await supabase.storage
          .from("product-images")
          .upload(filePath, product.imageFile, {
            upsert: true,
            contentType: contentType, // Explicitly set the MIME type
          });

        if (uploadError) {
          console.error("Upload error details:", uploadError);
          throw uploadError;
        }

        console.log("Image uploaded successfully");

        // Get the full public URL from Supabase
        const { data: publicUrlData } = supabase.storage
          .from("product-images")
          .getPublicUrl(filePath);

        if (!publicUrlData?.publicUrl) {
          throw new Error("Failed to get public URL for uploaded image");
        }

        imageUrl = publicUrlData.publicUrl; // Store the full URL in the database

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
        } catch (fetchError) {
          console.warn("Error checking image URL:", fetchError);
        }
      }

      // Update product in database
      const { error: updateError } = await supabase
        .from("products")
        .update({
          name: product.name,
          description: product.description,
          condition: product.condition.toLowerCase(),
          category: product.category.toLowerCase(),
          price: parseFloat(product.price),
          image: imageUrl, // Store the full public URL in the image field only
          status: product.status,
          is_bundle: product.is_bundle,
          modified_at: new Date().toISOString(),
        })
        .eq("productID", productID);

      if (updateError) throw updateError;

      setSnackbar({
        open: true,
        message: "Product updated successfully!",
        severity: "success",
      });

      // Navigate to account page after delay to show success message
      setTimeout(() => navigate("/account"), 1500);
    } catch (error) {
      console.error("Error updating product:", error);
      setSnackbar({
        open: true,
        message: error.message || "Error updating product",
        severity: "error",
      });
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "50vh",
        }}
      >
        <CircularProgress sx={{ color: "#0f2044" }} />
      </Box>
    );
  }

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
            Edit Product
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
                        <MenuItem value="new">New</MenuItem>
                        <MenuItem value="like new">Like New</MenuItem>
                        <MenuItem value="good">Good</MenuItem>
                        <MenuItem value="fair">Fair</MenuItem>
                        <MenuItem value="poor">Poor</MenuItem>
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

                {/* Current image preview */}
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
                      <EditIcon
                        sx={{ fontSize: 60, mb: 1, color: "text.disabled" }}
                      />
                      <Typography variant="body2">
                        No image available
                      </Typography>
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
                    borderColor: "#0f2044",
                    color: "#0f2044",
                    "&:hover": {
                      borderColor: "#ffc72c",
                      bgcolor: "rgba(255, 199, 44, 0.04)",
                    },
                  }}
                >
                  Change Image
                  <input
                    type="file"
                    hidden
                    name="imageFile"
                    onChange={handleFileChange}
                    accept="image/*"
                  />
                </Button>
                <FormHelperText>
                  Optional: Upload a new image to replace the current one
                </FormHelperText>
              </Card>
            </Grid>

            {/* Submit button */}
            <Grid item xs={12}>
              <Divider sx={{ mb: 3 }} />
              <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                <Button
                  variant="outlined"
                  onClick={() => navigate("/account")}
                  sx={{
                    borderRadius: 1,
                    py: 1.2,
                    px: 3,
                    textTransform: "none",
                    borderColor: "#0f2044",
                    color: "#0f2044",
                    "&:hover": {
                      borderColor: "#ffc72c",
                      bgcolor: "rgba(255, 199, 44, 0.04)",
                    },
                  }}
                >
                  Cancel
                </Button>

                <Button
                  type="submit"
                  variant="contained"
                  disabled={updating}
                  startIcon={
                    updating ? (
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
                    bgcolor: "#0f2044",
                    "&:hover": {
                      bgcolor: "#1a365d",
                    },
                  }}
                >
                  {updating ? "Updating..." : "Update Product"}
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

export default EditProduct;
