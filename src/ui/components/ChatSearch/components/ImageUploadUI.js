/**
 * ImageUploadUI Component
 * Handles image upload, preview, and AI-powered listing generation
 */

import React, { useState, useRef, useCallback, useEffect } from "react";
import {
  Box,
  Button,
  Typography,
  Paper,
  IconButton,
  Alert,
  Tooltip,
  Fade,
  LinearProgress,
} from "@mui/material";
import AddPhotoAlternateIcon from "@mui/icons-material/AddPhotoAlternate";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import CloseIcon from "@mui/icons-material/Close";
import RefreshIcon from "@mui/icons-material/Refresh";
import {
  validateImage,
  optimizeImage,
} from "../../../../services/imageProcessingService";
import { fileToBase64 } from "../../../../services/imageProcessingService";
import { analyzeImage } from "../../../../services/apiService";
import LoadingOverlay from "./LoadingOverlay";

// Default error timeout in ms
const ERROR_TIMEOUT = 5000;

const ImageUploadUI = ({
  onImageAnalyzed,
  onError,
  onCancel,
  session,
  initialImage = null, // Add initialImage prop with default value
}) => {
  // Component states
  const [optimizedImage, setOptimizedImage] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState(0);
  const [processingStage, setProcessingStage] = useState("");

  // Refs
  const fileInputRef = useRef(null);
  const errorTimeoutRef = useRef(null);

  // Process initialImage when provided
  useEffect(() => {
    // Only process if initialImage exists and we're not already processing an image
    if (initialImage && !loading && !optimizedImage && !previewUrl) {
      // Automatically start processing the provided image
      const processInitialImage = async () => {
        try {
          setLoading(true);
          setProcessingStage("Optimizing image...");
          setProgress(10);

          // Optimize the initial image
          const optimized = await optimizeImage(initialImage);
          setPreviewUrl(optimized.preview);
          setOptimizedImage(optimized.file);
          setProgress(30);

          // Automatically trigger processing
          setProcessingStage("Processing image...");
          setProgress(40);
          handleProcessImage(optimized.file, optimized.preview);
        } catch (err) {
          console.error("Error processing initial image:", err);
          setError(`Error processing initial image: ${err.message}`);
          setLoading(false);
          clearErrorAfterTimeout();
        }
      };

      processInitialImage();
    }
  }, [initialImage, loading, optimizedImage, previewUrl]);

  // Clear error after timeout
  const clearErrorAfterTimeout = useCallback(() => {
    if (errorTimeoutRef.current) {
      clearTimeout(errorTimeoutRef.current);
    }

    errorTimeoutRef.current = setTimeout(() => {
      setError(null);
    }, ERROR_TIMEOUT);
  }, []);

  // Handle file selection
  const handleFileChange = useCallback(
    async (event) => {
      try {
        // Reset states
        setError(null);
        setPreviewUrl(null);
        setOptimizedImage(null);
        setProgress(0);

        // Get selected file
        const file = event.target.files[0];

        if (!file) {
          return;
        }

        // Validate file
        const validation = validateImage(file);
        if (!validation.valid) {
          setError(validation.error);
          clearErrorAfterTimeout();
          return;
        }

        setOptimizedImage(file);
        setProcessingStage("optimizing");
        setLoading(true);
        setProgress(10);

        // Optimize image
        const optimized = await optimizeImage(file);

        setPreviewUrl(optimized.preview);
        setOptimizedImage(optimized.file);
        setProgress(30);
        setLoading(false);
      } catch (err) {
        console.error("Error processing selected file:", err);
        setError(`Error processing image: ${err.message}`);
        setLoading(false);
        clearErrorAfterTimeout();
      }
    },
    [clearErrorAfterTimeout]
  );

  // Handle drag and drop
  const handleDrop = useCallback(
    (event) => {
      event.preventDefault();
      event.stopPropagation();

      // Check if the dataTransfer object contains files
      if (event.dataTransfer.files && event.dataTransfer.files.length > 0) {
        // Create a synthetic event object
        const syntheticEvent = { target: { files: event.dataTransfer.files } };
        handleFileChange(syntheticEvent);
      }
    },
    [handleFileChange]
  );

  // Handle drag events
  const handleDragOver = useCallback((event) => {
    event.preventDefault();
    event.stopPropagation();
  }, []);

  // Handle click on upload area
  const handleUploadClick = useCallback(() => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  }, []);

  // Process image with Vision API
  // Modified to accept file and preview parameters for auto-processing
  const handleProcessImage = useCallback(
    async (fileOverride = null, previewOverride = null) => {
      // Use provided file/preview or fall back to component state
      const fileToProcess = fileOverride || optimizedImage;
      const previewToUse = previewOverride || previewUrl;

      if (!fileToProcess) {
        setError("No image selected for processing");
        clearErrorAfterTimeout();
        return;
      }

      setLoading(true);
      setProgress(40);
      setProcessingStage("processing");

      try {
        // Convert image to base64
        const base64Image = await fileToBase64(fileToProcess);
        setProgress(50);
        setProcessingStage("processing");

        // If no session, show error
        if (!session) {
          setError("You need to be logged in to analyze images");
          setLoading(false);
          clearErrorAfterTimeout();
          return;
        }

        // Send to API for processing
        const result = await analyzeImage(base64Image, session?.access_token, {
          debug: true,
          maxRetries: 3,
        });

        setProgress(100);
        setProcessingStage("done");

        // Check if the result contains an error
        if (result.error) {
          throw new Error(result.message || "Failed to analyze image");
        }

        // Use fallback data if provided
        const productData = result.fallback ? result.fallback : result;

        // Add the image file and preview URL to the product data
        const enhancedData = {
          ...productData,
          imageFile: fileToProcess,
          image: previewToUse,
        };

        // Call the onImageAnalyzed callback with the result
        onImageAnalyzed(enhancedData);

        // Reset states
        setOptimizedImage(null);
        setPreviewUrl(null);
        setProgress(0);
        setProcessingStage("");
      } catch (err) {
        console.error("Error analyzing image:", err);
        setError(`Error analyzing image: ${err.message}`);
        setProcessingStage("error");
        clearErrorAfterTimeout();

        // Call the onError callback
        if (onError) {
          onError(err);
        }
      } finally {
        setLoading(false);
      }
    },
    [
      optimizedImage,
      previewUrl,
      session,
      onImageAnalyzed,
      onError,
      clearErrorAfterTimeout,
    ]
  );

  // Clean up resources when component unmounts
  useEffect(() => {
    return () => {
      // Clean up any preview URLs to avoid memory leaks
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }

      // Clear any timeouts
      if (errorTimeoutRef.current) {
        clearTimeout(errorTimeoutRef.current);
      }
    };
  }, [previewUrl]);

  // Cancel upload
  const handleCancel = useCallback(() => {
    // Reset all states
    setOptimizedImage(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
    setLoading(false);
    setError(null);
    setProgress(0);
    setProcessingStage("");

    // Reset the file input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }

    // Call the onCancel callback
    if (onCancel) {
      onCancel();
    }
  }, [onCancel, previewUrl]);

  // Reset the component
  const handleReset = useCallback(() => {
    setOptimizedImage(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
    setError(null);
    setProgress(0);
    setProcessingStage("");

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, [previewUrl]);

  return (
    <Box sx={{ width: "100%", my: 2, position: "relative" }}>
      {/* Error alert */}
      {error && !loading && (
        <Fade in={!!error}>
          <Alert
            severity="error"
            sx={{ mb: 2 }}
            action={
              <IconButton
                aria-label="close"
                color="inherit"
                size="small"
                onClick={() => setError(null)}
              >
                <CloseIcon fontSize="inherit" />
              </IconButton>
            }
          >
            {error}
          </Alert>
        </Fade>
      )}

      {/* Progress bar - only show when not in loading state */}
      {!loading && progress > 0 && progress < 100 && (
        <Box sx={{ width: "100%", mb: 2 }}>
          <Typography variant="caption" color="text.secondary">
            Image optimized and ready for analysis
          </Typography>
          <LinearProgress
            variant="determinate"
            value={progress}
            sx={{
              height: 8,
              borderRadius: 4,
              "& .MuiLinearProgress-bar": {
                transition: "transform 0.4s ease",
              },
            }}
          />
        </Box>
      )}

      {/* Upload container */}
      <Paper
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onClick={!previewUrl ? handleUploadClick : undefined}
        sx={{
          p: 3,
          border: "2px dashed rgba(0, 0, 0, 0.1)",
          borderRadius: 2,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: 200,
          cursor: !previewUrl ? "pointer" : "default",
          position: "relative",
          bgcolor: (theme) => theme.palette.background.default,
          transition: "all 0.2s ease-in-out",
          "&:hover": {
            borderColor: !previewUrl ? "primary.main" : "rgba(0, 0, 0, 0.1)",
            bgcolor: !previewUrl
              ? "rgba(0, 0, 0, 0.02)"
              : (theme) => theme.palette.background.default,
          },
        }}
      >
        {/* File input (hidden) */}
        <input
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          ref={fileInputRef}
          style={{ display: "none" }}
        />

        {/* Preview or upload icon */}
        {previewUrl ? (
          <Box sx={{ position: "relative", width: "100%", maxHeight: 300 }}>
            <img
              src={previewUrl}
              alt="Preview"
              style={{
                width: "100%",
                maxHeight: 300,
                objectFit: "contain",
                borderRadius: 8,
              }}
            />

            {/* Action buttons for image preview */}
            <Box
              sx={{
                position: "absolute",
                top: 8,
                right: 8,
                display: "flex",
                gap: 1,
              }}
            >
              <Tooltip title="Change image">
                <IconButton
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleReset();
                    setTimeout(() => {
                      if (fileInputRef.current) {
                        fileInputRef.current.click();
                      }
                    }, 100);
                  }}
                  sx={{
                    bgcolor: "rgba(255, 255, 255, 0.8)",
                    "&:hover": {
                      bgcolor: "rgba(255, 255, 255, 0.9)",
                    },
                  }}
                >
                  <RefreshIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="Remove image">
                <IconButton
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleReset();
                  }}
                  sx={{
                    bgcolor: "rgba(255, 255, 255, 0.8)",
                    "&:hover": {
                      bgcolor: "rgba(255, 255, 255, 0.9)",
                    },
                  }}
                >
                  <CloseIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>
        ) : (
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              p: 3,
            }}
          >
            <CloudUploadIcon
              sx={{ fontSize: 48, color: "primary.main", mb: 2, opacity: 0.7 }}
            />
            <Typography variant="h6" color="text.secondary" align="center">
              Drag & drop an image here
            </Typography>
            <Typography
              variant="body2"
              color="text.secondary"
              align="center"
              sx={{ mt: 1 }}
            >
              or click to browse files
            </Typography>
            <Typography
              variant="caption"
              color="text.secondary"
              align="center"
              sx={{ mt: 2 }}
            >
              Supported formats: JPEG, PNG, WebP
            </Typography>
          </Box>
        )}
      </Paper>

      {/* Action buttons */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          mt: 2,
          gap: 2,
        }}
      >
        <Button
          variant="outlined"
          color="inherit"
          onClick={handleCancel}
          disabled={loading}
          sx={{
            flex: 1,
            height: 48,
            minHeight: 48,
            boxSizing: "border-box",
            padding: "6px 16px",
            lineHeight: 1.75,
          }}
        >
          Cancel
        </Button>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddPhotoAlternateIcon />}
          onClick={() => handleProcessImage()}
          disabled={!previewUrl || loading}
          sx={{
            flex: 2,
            height: 48,
            minHeight: 48,
            boxSizing: "border-box",
            padding: "6px 16px",
            lineHeight: 1.75,
          }}
        >
          {loading ? "Processing..." : "Create Listing with AI"}
        </Button>
      </Box>

      {/* Loading Overlay */}
      <LoadingOverlay
        isVisible={loading}
        stage={processingStage}
        progress={progress}
        imagePreview={previewUrl}
        error={error && processingStage === "error" ? error : null}
        onRetry={() => {
          setError(null);
          setProcessingStage("processing");
          handleProcessImage();
        }}
        onCancel={handleCancel}
      />
    </Box>
  );
};

export default ImageUploadUI;
