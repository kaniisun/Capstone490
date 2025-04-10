import React from "react";
import {
  Box,
  CircularProgress,
  Typography,
  Paper,
  Button,
  LinearProgress,
} from "@mui/material";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import RefreshIcon from "@mui/icons-material/Refresh";

/**
 * Loading overlay component for image processing
 * Shows different states: uploading, processing, error
 */
const LoadingOverlay = ({
  isVisible,
  stage,
  progress,
  imagePreview,
  error,
  onRetry,
  onCancel,
}) => {
  if (!isVisible) return null;

  // Different messages based on stage
  const getMessage = () => {
    switch (stage) {
      case "uploading":
        return "Uploading your image...";
      case "optimizing":
        return "Optimizing image...";
      case "processing":
        return "Analyzing your image with AI...";
      case "generating":
        return "Generating product details...";
      case "error":
        return error || "Something went wrong while analyzing the image.";
      default:
        return "Processing your image...";
    }
  };

  return (
    <Box
      sx={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "rgba(0, 0, 0, 0.7)",
        zIndex: 1000,
        backdropFilter: "blur(3px)",
      }}
    >
      <Paper
        elevation={4}
        sx={{
          width: "90%",
          maxWidth: 400,
          p: 3,
          borderRadius: 2,
          textAlign: "center",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 2,
        }}
      >
        {/* Image preview */}
        {imagePreview && (
          <Box
            sx={{
              width: "100%",
              maxHeight: 200,
              overflow: "hidden",
              borderRadius: 1,
              mb: 2,
              border: "1px solid rgba(0,0,0,0.1)",
            }}
          >
            <img
              src={imagePreview}
              alt="Preview"
              style={{
                width: "100%",
                height: "auto",
                objectFit: "contain",
                opacity: stage === "error" ? 0.6 : 1,
              }}
            />
          </Box>
        )}

        {/* Error icon or spinner */}
        {stage === "error" ? (
          <ErrorOutlineIcon color="error" sx={{ fontSize: 48 }} />
        ) : (
          <CircularProgress size={48} color="primary" />
        )}

        {/* Status message */}
        <Typography variant="h6" sx={{ mt: 1 }}>
          {getMessage()}
        </Typography>

        {/* Progress bar */}
        {stage !== "error" && progress > 0 && (
          <Box sx={{ width: "100%", mt: 1 }}>
            <LinearProgress
              variant="determinate"
              value={progress}
              sx={{ height: 8, borderRadius: 4 }}
            />
            <Typography
              variant="caption"
              sx={{ display: "block", textAlign: "right", mt: 0.5 }}
            >
              {Math.round(progress)}%
            </Typography>
          </Box>
        )}

        {/* Action buttons */}
        <Box sx={{ mt: 2, display: "flex", gap: 2 }}>
          {stage === "error" ? (
            <>
              <Button
                variant="contained"
                color="primary"
                startIcon={<RefreshIcon />}
                onClick={onRetry}
              >
                Try Again
              </Button>
              <Button variant="outlined" color="secondary" onClick={onCancel}>
                Cancel
              </Button>
            </>
          ) : (
            <Button variant="outlined" color="secondary" onClick={onCancel}>
              Cancel
            </Button>
          )}
        </Box>
      </Paper>
    </Box>
  );
};

export default LoadingOverlay;
