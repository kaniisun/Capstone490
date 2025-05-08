import React, { useState, useEffect } from "react";
import {
  Box,
  Button,
  Typography,
  Paper,
  CircularProgress,
  TextField,
  Grid,
  MenuItem,
  InputAdornment,
  Alert,
  AlertTitle,
} from "@mui/material";
import { supabase } from "../../../../supabaseClient.js";

const ImageUploader = () => {
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [apiResponse, setApiResponse] = useState(null);
  const [apiStatus, setApiStatus] = useState(null);
  const [isApiLoading, setIsApiLoading] = useState(true);

  // Check Vision API status on load
  useEffect(() => {
    checkVisionApiStatus();
  }, []);

  // Function to check Vision API status
  const checkVisionApiStatus = async () => {
    try {
      setIsApiLoading(true);
      const response = await fetch("http://localhost:3101/api/test-vision", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();
      setApiStatus(data);

      if (!response.ok) {
        console.error("API Test Failed:", data);
      } else {
        console.log("API Test Successful:", data);
      }
    } catch (error) {
      console.error("Error checking API status:", error);
      setApiStatus({
        status: "error",
        message: "Could not connect to server to check API status",
      });
    } finally {
      setIsApiLoading(false);
    }
  };

  // Product form state
  const [productData, setProductData] = useState({
    name: "",
    description: "",
    price: "",
    condition: "good",
    category: "miscellaneous",
  });

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setSelectedImage(file);
    setError(null);

    // Create preview
    const reader = new FileReader();
    reader.onload = () => {
      setImagePreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedImage) {
      setError("Please select an image first");
      return;
    }

    // Prevent submission if API is not available
    if (apiStatus?.status !== "success") {
      setError("Cannot analyze image: Vision API is not available");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Convert to base64
      const reader = new FileReader();
      reader.readAsDataURL(selectedImage);
      reader.onload = async () => {
        try {
          // Extract the base64 data
          const base64Data = reader.result.split(",")[1];

          // Call the Vision API
          console.log("Calling API with image data length:", base64Data.length);
          const response = await fetch(
            "http://localhost:3101/api/test-vision",
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                image: base64Data,
              }),
            }
          );

          const responseData = await response.json();
          console.log("API Response:", responseData);

          if (!response.ok) {
            throw new Error(responseData.error || "Error analyzing image");
          }

          setApiResponse(responseData);
          setProductData({
            name: responseData.name || "",
            description: responseData.description || "",
            price: responseData.price || "",
            condition: responseData.condition || "good",
            category: responseData.category || "miscellaneous",
          });

          setResult(
            "Image successfully analyzed! Check the console for details."
          );
        } catch (error) {
          console.error("API Error:", error);
          setError(error.message || "Failed to analyze image");
        } finally {
          setIsLoading(false);
        }
      };
    } catch (error) {
      console.error("File reading error:", error);
      setError("Error reading the image file");
      setIsLoading(false);
    }
  };

  const handleCreateProduct = async () => {
    if (!imagePreview || !productData.name || !productData.price) {
      setError("Please fill out all required fields");
      return;
    }

    setIsLoading(true);

    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.user) {
        setError("You must be logged in to create a product");
        setIsLoading(false);
        return;
      }

      // Upload image to Supabase Storage
      const fileExt = selectedImage.name.split(".").pop();
      const fileName = `${Date.now()}-${Math.random()
        .toString(36)
        .substring(2, 15)}.${fileExt}`;
      const filePath = `${session.session.user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("product-images")
        .upload(filePath, selectedImage);

      if (uploadError) {
        throw new Error(`Image upload failed: ${uploadError.message}`);
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("product-images")
        .getPublicUrl(filePath);

      // Create product in database
      const { error: productError } = await supabase
        .from("products")
        .insert([
          {
            name: productData.name,
            price: parseFloat(productData.price),
            description: productData.description,
            image: urlData.publicUrl,
            condition: productData.condition.toLowerCase(),
            category: productData.category.toLowerCase(),
            status: "available",
            userID: session.session.user.id,
            moderation_status: "pending",
            is_deleted: false,
            created_at: new Date().toISOString(),
            modified_at: new Date().toISOString(),
          },
        ])
        .select();

      if (productError) {
        throw new Error(`Product creation failed: ${productError.message}`);
      }

      setResult(
        `Product "${productData.name}" created successfully! It will be visible once approved.`
      );

      // Reset form
      setSelectedImage(null);
      setImagePreview(null);
      setApiResponse(null);
      setProductData({
        name: "",
        description: "",
        price: "",
        condition: "good",
        category: "miscellaneous",
      });
    } catch (error) {
      console.error("Product creation error:", error);
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Paper elevation={3} sx={{ p: 3, maxWidth: 800, mx: "auto", my: 4 }}>
      <Typography variant="h5" gutterBottom>
        Test AI Product Creator
      </Typography>

      <Typography variant="body2" color="text.secondary" paragraph>
        Upload a product image to test the OpenAI Vision API integration
      </Typography>

      {/* API Status Section */}
      {isApiLoading ? (
        <Box sx={{ display: "flex", alignItems: "center", mb: 3 }}>
          <CircularProgress size={20} sx={{ mr: 1 }} />
          <Typography>Checking Vision API status...</Typography>
        </Box>
      ) : apiStatus?.status === "error" ? (
        <Alert severity="error" sx={{ mb: 3 }}>
          <AlertTitle>Vision API Not Available</AlertTitle>
          <Typography variant="body2">
            The Vision API is currently not available:{" "}
            {apiStatus.message || "Unknown error"}
          </Typography>
          {apiStatus.type === "model_access" && (
            <Typography variant="body2" sx={{ mt: 1 }}>
              Your OpenAI API key doesn't have access to the GPT-4 Vision model.
              You may need to:
              <ol>
                <li>Ensure you have a pay-as-you-go account with OpenAI</li>
                <li>Request access to GPT-4 if you don't already have it</li>
                <li>
                  Verify that your subscription has enough usage credit
                  available
                </li>
              </ol>
              <Button
                size="small"
                variant="outlined"
                onClick={checkVisionApiStatus}
              >
                Try Again
              </Button>
            </Typography>
          )}
        </Alert>
      ) : apiStatus?.status === "success" ? (
        <Alert severity="success" sx={{ mb: 3 }}>
          <AlertTitle>Vision API Available</AlertTitle>
          <Typography variant="body2">
            The Vision API is connected and working properly. You can now test
            creating a product from an image.
          </Typography>
        </Alert>
      ) : null}

      {error && (
        <Box
          sx={{
            p: 2,
            mb: 3,
            bgcolor: "error.50",
            color: "error.main",
            border: "1px solid",
            borderColor: "error.light",
            borderRadius: 1,
          }}
        >
          <Typography>{error}</Typography>
        </Box>
      )}

      {result && (
        <Box
          sx={{
            p: 2,
            mb: 3,
            bgcolor: "success.50",
            color: "success.main",
            border: "1px solid",
            borderColor: "success.light",
            borderRadius: 1,
          }}
        >
          <Typography>{result}</Typography>
        </Box>
      )}

      {/* Disable the form if the API is not available */}
      <Box
        sx={
          apiStatus?.status !== "success"
            ? { opacity: 0.5, pointerEvents: "none" }
            : {}
        }
      >
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            {/* Image Upload Section */}
            <Box
              sx={{
                border: "2px dashed",
                borderColor: "primary.main",
                borderRadius: 2,
                p: 3,
                textAlign: "center",
                mb: 2,
                height: 250,
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                alignItems: "center",
                bgcolor: imagePreview ? "transparent" : "action.hover",
                backgroundImage: imagePreview ? `url(${imagePreview})` : "none",
                backgroundSize: "contain",
                backgroundPosition: "center",
                backgroundRepeat: "no-repeat",
              }}
            >
              {!imagePreview && (
                <>
                  <Typography variant="body1" gutterBottom>
                    Drop image here or click to browse
                  </Typography>
                  <Button
                    variant="contained"
                    component="label"
                    disabled={isLoading}
                    sx={{ mt: 1 }}
                  >
                    Select Image
                    <input
                      type="file"
                      hidden
                      accept="image/*"
                      onChange={handleImageChange}
                    />
                  </Button>
                </>
              )}
            </Box>

            {imagePreview && (
              <Box
                sx={{ display: "flex", justifyContent: "space-between", mb: 2 }}
              >
                <Button
                  variant="outlined"
                  onClick={() => {
                    setSelectedImage(null);
                    setImagePreview(null);
                  }}
                  disabled={isLoading}
                >
                  Remove
                </Button>

                <Button
                  variant="contained"
                  onClick={handleSubmit}
                  disabled={isLoading || !selectedImage}
                  startIcon={
                    isLoading && <CircularProgress size={20} color="inherit" />
                  }
                >
                  {isLoading ? "Analyzing..." : "Analyze with AI"}
                </Button>
              </Box>
            )}
          </Grid>

          <Grid item xs={12} md={6}>
            {/* Product Details Form */}
            <Box component="form">
              <TextField
                label="Product Name"
                fullWidth
                margin="normal"
                value={productData.name}
                onChange={(e) =>
                  setProductData({ ...productData, name: e.target.value })
                }
                required
                disabled={isLoading}
              />

              <TextField
                label="Description"
                fullWidth
                multiline
                rows={3}
                margin="normal"
                value={productData.description}
                onChange={(e) =>
                  setProductData({
                    ...productData,
                    description: e.target.value,
                  })
                }
                required
                disabled={isLoading}
              />

              <TextField
                label="Price"
                fullWidth
                margin="normal"
                type="number"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">$</InputAdornment>
                  ),
                }}
                value={productData.price}
                onChange={(e) =>
                  setProductData({ ...productData, price: e.target.value })
                }
                required
                disabled={isLoading}
              />

              <TextField
                select
                label="Condition"
                fullWidth
                margin="normal"
                value={productData.condition}
                onChange={(e) =>
                  setProductData({ ...productData, condition: e.target.value })
                }
                disabled={isLoading}
              >
                <MenuItem value="new">New</MenuItem>
                <MenuItem value="like_new">Like New</MenuItem>
                <MenuItem value="good">Good</MenuItem>
                <MenuItem value="fair">Fair</MenuItem>
                <MenuItem value="poor">Poor</MenuItem>
              </TextField>

              <TextField
                select
                label="Category"
                fullWidth
                margin="normal"
                value={productData.category}
                onChange={(e) =>
                  setProductData({ ...productData, category: e.target.value })
                }
                disabled={isLoading}
              >
                <MenuItem value="electronics">Electronics</MenuItem>
                <MenuItem value="furniture">Furniture</MenuItem>
                <MenuItem value="textbooks">Textbooks</MenuItem>
                <MenuItem value="clothing">Clothing</MenuItem>
                <MenuItem value="miscellaneous">Miscellaneous</MenuItem>
              </TextField>

              <Button
                variant="contained"
                color="success"
                fullWidth
                disabled={isLoading || !apiResponse}
                onClick={handleCreateProduct}
                sx={{ mt: 2 }}
              >
                Create Product
              </Button>
            </Box>
          </Grid>
        </Grid>

        {apiResponse && (
          <Box sx={{ mt: 3 }}>
            <Typography variant="h6" gutterBottom>
              AI Analysis Results:
            </Typography>
            <pre
              style={{
                background: "#f5f5f5",
                padding: 16,
                borderRadius: 4,
                overflowX: "auto",
              }}
            >
              {JSON.stringify(apiResponse, null, 2)}
            </pre>
          </Box>
        )}
      </Box>
    </Paper>
  );
};

export default ImageUploader;
