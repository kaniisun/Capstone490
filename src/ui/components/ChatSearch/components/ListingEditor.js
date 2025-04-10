/**
 * ListingEditor Component
 * Allows users to edit AI-generated product details before submitting
 */

import React, { useState, useEffect, useCallback } from "react";
import {
  Box,
  TextField,
  InputAdornment,
  MenuItem,
  Button,
  Grid,
  Typography,
  CircularProgress,
  Paper,
  Divider,
  Alert,
  Fade,
} from "@mui/material";
import SaveIcon from "@mui/icons-material/Save";
import CloseIcon from "@mui/icons-material/Close";
import {
  uploadFile,
  generateProductImagePath,
} from "../../../../services/storageService";
import { createProduct } from "../../../../services/productService";
import { supabase } from "../../../../supabaseClient.js";

// Valid conditions and categories - must match backend validation
const CONDITIONS = [
  { value: "new", label: "New" },
  { value: "like_new", label: "Like New" },
  { value: "good", label: "Good" },
  { value: "fair", label: "Fair" },
  { value: "poor", label: "Poor" },
];

const CATEGORIES = [
  { value: "electronics", label: "Electronics" },
  { value: "furniture", label: "Furniture" },
  { value: "textbooks", label: "Textbooks" },
  { value: "clothing", label: "Clothing" },
  { value: "miscellaneous", label: "Miscellaneous" },
];

const ListingEditor = ({
  productData,
  session,
  onSubmit,
  onCancel,
  onError,
}) => {
  // Form state
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: 0,
    condition: "like_new",
    category: "miscellaneous",
    image: null,
    imageFile: null,
  });

  // UI states
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);
  const [stage, setStage] = useState("");

  // Initialize form with product data
  useEffect(() => {
    if (productData) {
      setFormData({
        name: productData.name || "",
        description: productData.description || "",
        price: typeof productData.price === "number" ? productData.price : 0,
        condition: productData.condition || "like_new",
        category: productData.category || "miscellaneous",
        image: productData.image || null,
        imageFile: productData.imageFile || null,
      });
    }
  }, [productData]);

  // Handle input changes
  const handleChange = useCallback((e) => {
    const { name, value } = e.target;

    setFormData((prev) => {
      // Special handling for price to ensure it's a number
      if (name === "price") {
        // Remove non-numeric characters except periods
        const numericValue = value.replace(/[^0-9.]/g, "");
        // Parse as float with 2 decimal places
        const parsedValue = parseFloat(parseFloat(numericValue).toFixed(2));
        return { ...prev, [name]: isNaN(parsedValue) ? 0 : parsedValue };
      }

      return { ...prev, [name]: value };
    });
  }, []);

  // Clear error message after timeout
  useEffect(() => {
    let errorTimeout;
    if (error) {
      errorTimeout = setTimeout(() => {
        setError(null);
      }, 5000);
    }

    return () => {
      if (errorTimeout) clearTimeout(errorTimeout);
    };
  }, [error]);

  // Submit the form
  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault();

      // Basic validation
      if (!formData.name.trim()) {
        setError("Product name is required");
        return;
      }

      if (!formData.description.trim()) {
        setError("Product description is required");
        return;
      }

      if (!formData.price || formData.price <= 0) {
        setError("Price must be greater than 0");
        return;
      }

      if (!session || !session.user) {
        setError("You must be logged in to create a listing");
        if (onError) onError(new Error("User not logged in"));
        return;
      }

      setLoading(true);
      setProgress(0);
      setError(null);

      try {
        let imageUrl = formData.image || ""; // Start with existing image URL if available

        // Step 1: Upload image if available
        if (formData.imageFile) {
          setStage("Uploading image...");
          setProgress(10);

          // Generate a clean, unique path for the image
          const imagePath = generateProductImagePath(
            session.user.id,
            formData.imageFile.name
          );

          console.log("Uploading image to path:", imagePath);

          // Upload the image to Supabase Storage
          const uploadResult = await uploadFile(
            formData.imageFile,
            imagePath,
            "product-images",
            { contentType: formData.imageFile.type },
            { debug: true }
          );

          // Get the public URL
          imageUrl = uploadResult.publicUrl;

          console.log("Upload result:", {
            path: imagePath,
            publicUrl: imageUrl,
            fileType: formData.imageFile.type,
            fileSize: Math.round(formData.imageFile.size / 1024) + "KB",
          });

          // Verify URL is accessible
          try {
            const response = await fetch(imageUrl, { method: "HEAD" });
            if (!response.ok) {
              console.warn(
                `Image URL check returned status ${response.status}`
              );

              // Fallback: manually construct URL if needed
              if (!imageUrl.includes("product-images")) {
                // Get the public URL directly from Supabase
                const { data: urlData } = supabase.storage
                  .from("product-images")
                  .getPublicUrl(imagePath);

                if (urlData?.publicUrl) {
                  console.log(
                    "Using alternative public URL method:",
                    urlData.publicUrl
                  );
                  imageUrl = urlData.publicUrl;
                }
              }
            }
          } catch (urlError) {
            console.error("Error checking image URL:", urlError);
          }

          console.log("Final image URL to be saved:", imageUrl);
          setProgress(40);
        }

        // Step 2: Create the product record in the database
        setStage("Creating listing...");
        setProgress(60);

        // Prepare product data
        const productToSave = {
          name: formData.name.trim(),
          description: formData.description.trim(),
          price: formData.price,
          condition: formData.condition,
          category: formData.category,
          image: imageUrl, // Store image URL in the existing column
          status: "available",
          is_bundle: false,
          flag: false,
          hide: false,
          moderation_status: "pending",
          is_deleted: false,
        };

        // Create the product in the database
        const savedProduct = await createProduct(
          productToSave,
          session.user.id
        );

        setProgress(100);
        setStage("Listing created!");

        // Notify parent of successful submission
        if (onSubmit) {
          onSubmit(savedProduct);
        }
      } catch (err) {
        console.error("Error creating listing:", err);
        setError(`Error creating listing: ${err.message}`);

        // Notify parent of error
        if (onError) {
          onError(err);
        }
      } finally {
        setLoading(false);
      }
    },
    [formData, session, onSubmit, onError]
  );

  // Cancel
  const handleCancel = useCallback(() => {
    if (onCancel) {
      onCancel();
    }
  }, [onCancel]);

  return (
    <Paper
      elevation={2}
      sx={{
        p: 3,
        borderRadius: 2,
        animation: "fadeIn 0.3s ease-out",
        "@keyframes fadeIn": {
          "0%": { opacity: 0, transform: "translateY(20px)" },
          "100%": { opacity: 1, transform: "translateY(0)" },
        },
      }}
    >
      <Typography variant="h6" gutterBottom>
        Edit Listing Details
      </Typography>

      <Divider sx={{ mb: 3 }} />

      {/* Error message */}
      {error && (
        <Fade in={!!error}>
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        </Fade>
      )}

      {/* Progress during submission */}
      {loading && (
        <Box sx={{ mb: 3, width: "100%" }}>
          <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
            <CircularProgress size={20} sx={{ mr: 1 }} />
            <Typography variant="body2" color="textSecondary">
              {stage}
            </Typography>
          </Box>
          <Box
            sx={{
              width: "100%",
              bgcolor: "background.paper",
              borderRadius: 1,
              height: 8,
              overflow: "hidden",
            }}
          >
            <Box
              sx={{
                width: `${progress}%`,
                bgcolor: "primary.main",
                height: "100%",
                transition: "width 0.5s ease-in-out",
              }}
            />
          </Box>
        </Box>
      )}

      <form onSubmit={handleSubmit}>
        <Grid container spacing={2}>
          {/* Left column for image */}
          <Grid item xs={12} md={4}>
            <Box sx={{ width: "100%", mb: { xs: 2, md: 0 } }}>
              {formData.image ? (
                <>
                  <img
                    src={formData.image}
                    alt="Product"
                    style={{
                      width: "100%",
                      maxHeight: "200px",
                      objectFit: "contain",
                      borderRadius: "8px",
                      border: "1px solid #e0e0e0",
                    }}
                  />
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ display: "block", mt: 1 }}
                  >
                    Image will be uploaded with your listing
                  </Typography>
                </>
              ) : (
                <Box
                  sx={{
                    height: "200px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    border: "1px dashed #ccc",
                    borderRadius: "8px",
                  }}
                >
                  <Typography color="text.secondary">
                    No image preview available
                  </Typography>
                </Box>
              )}
            </Box>
          </Grid>

          {/* Right column for fields */}
          <Grid item xs={12} md={8}>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <TextField
                label="Product Name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                fullWidth
                required
                disabled={loading}
                inputProps={{ maxLength: 100 }}
              />

              <TextField
                label="Description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                multiline
                rows={4}
                fullWidth
                required
                disabled={loading}
                inputProps={{ maxLength: 2000 }}
              />

              <TextField
                label="Price"
                name="price"
                value={formData.price}
                onChange={handleChange}
                type="number"
                fullWidth
                required
                disabled={loading}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">$</InputAdornment>
                  ),
                  inputProps: { min: 0, step: 0.01 },
                }}
              />

              <TextField
                select
                label="Condition"
                name="condition"
                value={formData.condition}
                onChange={handleChange}
                fullWidth
                required
                disabled={loading}
              >
                {CONDITIONS.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </TextField>

              <TextField
                select
                label="Category"
                name="category"
                value={formData.category}
                onChange={handleChange}
                fullWidth
                required
                disabled={loading}
              >
                {CATEGORIES.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </TextField>
            </Box>
          </Grid>
        </Grid>

        {/* Action buttons */}
        <Box
          sx={{
            display: "flex",
            justifyContent: "flex-end",
            alignItems: "center",
            mt: 4,
            gap: 2,
            paddingTop: 1,
          }}
        >
          <Button
            variant="outlined"
            color="inherit"
            onClick={handleCancel}
            disabled={loading}
            startIcon={<CloseIcon />}
            sx={{
              height: 48,
              minHeight: 48,
              padding: "6px 24px",
              boxSizing: "border-box",
              display: "flex",
              alignItems: "center",
              marginTop: 2,
              "&:hover": {
                backgroundColor: "rgba(0, 0, 0, 0.08)",
                borderColor: "rgba(0, 0, 0, 0.38)",
                color: "rgba(0, 0, 0, 0.87)",
              },
            }}
          >
            Cancel
          </Button>

          <Button
            type="submit"
            variant="contained"
            color="primary"
            disabled={
              loading ||
              !formData.name ||
              !formData.description ||
              formData.price <= 0
            }
            startIcon={loading ? <CircularProgress size={20} /> : <SaveIcon />}
            sx={{
              height: 48,
              minHeight: 48,
              padding: "6px 24px",
              boxSizing: "border-box",
              display: "flex",
              alignItems: "center",
              marginTop: 1,
            }}
          >
            {loading ? "Creating..." : "Create Listing"}
          </Button>
        </Box>
      </form>
    </Paper>
  );
};

export default ListingEditor;
