// Add these imports at the top
import React from "react";
import { useState, useRef, useEffect, useCallback } from "react";
import { supabase } from "../../../supabaseClient.js";
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  IconButton,
  CircularProgress,
  Avatar,
  Divider,
  Container,
  Chip,
  Card,
  useTheme,
  Tooltip,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  MenuItem,
  InputAdornment,
} from "@mui/material";
import SendIcon from "@mui/icons-material/Send";
import SmartToyIcon from "@mui/icons-material/SmartToy";
import PersonIcon from "@mui/icons-material/Person";
import CloseIcon from "@mui/icons-material/Close";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import AddPhotoAlternateIcon from "@mui/icons-material/AddPhotoAlternate";
// Import our new components
import ProductsDisplay from "./components/ProductsDisplay";
import { extractProductsFromMessage } from "./utils/productParser";
// Import markdown renderer
import Markdown from "markdown-to-jsx";
import ProductCard from "./components/ProductCard";
import API_CONFIG from "../../../config/api.js";
import { markMessageSent } from "../messageArea/messageHelper";
import ImageUploadUI from "./components/ImageUploadUI";
import ListingEditor from "./components/ListingEditor";
import {
  validateImage,
  optimizeImage,
  fileToBase64,
} from "../../../services/imageProcessingService";
import {
  uploadFile,
  generateProductImagePath,
} from "../../../services/storageService";
import apiService from "../../../services/apiService";
import { createProduct } from "../../../services/productService";
import { v4 as uuidv4 } from "uuid";
import LoadingOverlay from "./components/LoadingOverlay";

const API_URL = API_CONFIG.getUrl(API_CONFIG.ENDPOINTS.CHAT);

// Define keyframe animations globally
const keyframes = `
  @keyframes fadeIn {
    0% {
      opacity: 0;
      transform: translateY(20px);
    }
    100% {
      opacity: 1;
      transform: translateY(0);
    }
  }
  
  @keyframes progress {
    0% {
      left: -30%;
    }
    100% {
      left: 100%;
    }
  }
  
  @keyframes pulse {
    0% { opacity: 0.7; }
    50% { opacity: 1; }
    100% { opacity: 0.7; }
  }
  
  @keyframes slideIn {
    0% {
      opacity: 0;
      transform: translateX(20px);
    }
    100% {
      opacity: 1;
      transform: translateX(0);
    }
  }
  
  .progress-bar-animation {
    animation: progress 2s infinite linear;
  }
  
  .pulse-animation {
    animation: pulse 2s infinite ease-in-out;
  }
  
  .fade-in-animation {
    animation: fadeIn 0.3s ease-out;
  }
  
  .slide-in-animation {
    animation: slideIn 0.5s ease-out;
  }
  
  .MuiDialog-paper {
    animation: fadeIn 0.3s ease-out;
  }
`;

// Add this flag near the top of your component (inside the ChatInterface function)
// to enable detailed state logging for debugging
const DEBUG = false;

// Add these utility functions to your component
/**
 * Creates a debug log message if debug mode is enabled
 * @param {string} message - Debug message
 * @param {any} data - Optional data to log
 */
const debugLog = (message, data) => {
  if (!DEBUG) return;
  if (data) {
    console.log(`[ImageUpload] ${message}`, data);
  } else {
    console.log(`[ImageUpload] ${message}`);
  }
};

/**
 * Resets a file input element to allow the same file to be selected again
 * @param {React.RefObject<HTMLInputElement>} inputRef - Reference to file input element
 */
const resetFileInput = (inputRef) => {
  if (inputRef && inputRef.current) {
    inputRef.current.value = "";
    debugLog("File input reset");
  }
};

/**
 * Generates a unique filename for Supabase storage
 * @param {File} file - Original file object
 * @returns {string} Unique filename
 */
const generateUniqueFilename = (file) => {
  const timestamp = Date.now();
  const uniqueId = uuidv4().split("-")[0]; // Use first part of UUID for brevity
  const fileExt = file.name.split(".").pop().toLowerCase();

  // Clean the filename to ensure it's safe for storage
  const safeName = file.name
    .split(".")[0]
    .replace(/[^a-z0-9]/gi, "_")
    .toLowerCase()
    .substring(0, 20);

  // Create the full path with uploads directory
  const path = `uploads/${timestamp}-${safeName}-${uniqueId}.${fileExt}`;

  // Log the path generation for debugging
  console.log("Generated unique filename:", {
    originalName: file.name,
    timestamp: timestamp,
    uniqueId: uniqueId,
    extension: fileExt,
    finalPath: path,
    fileSize: Math.round(file.size / 1024) + "KB",
    fileType: file.type,
  });

  return path;
};

// Add this component at an appropriate place in your file for error messaging
const ErrorMessage = ({ error, onRetry, onClose }) => {
  // Determine error type and message
  const isConnectionError =
    error &&
    (error.message.includes("connect to the server") ||
      error.message.includes("internet connection") ||
      error.message.includes("timed out") ||
      error.message.includes("ERR_CONNECTION_REFUSED") ||
      error.message === "Failed to fetch");

  const message = isConnectionError
    ? "Something went wrong with the server. Please try again later or check your internet connection."
    : error?.message || "An unexpected error occurred";

  return (
    <Box
      sx={{
        padding: 2,
        backgroundColor: "#FEE2E2", // Light red background
        borderRadius: 1,
        mb: 2,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
      }}
    >
      <Typography
        variant="body1"
        color="error"
        sx={{ fontWeight: "medium", mb: 1, textAlign: "center" }}
      >
        {message}
      </Typography>

      <Box sx={{ display: "flex", gap: 2, mt: 1 }}>
        {onRetry && (
          <Button
            size="small"
            variant="outlined"
            color="error"
            onClick={onRetry}
          >
            Try Again
          </Button>
        )}

        {onClose && (
          <Button size="small" variant="text" color="inherit" onClick={onClose}>
            Dismiss
          </Button>
        )}
      </Box>
    </Box>
  );
};

// Add a declaration for the enhanced error interface
/**
 * @typedef {Object} EnhancedError
 * @property {string} message - User-friendly error message
 * @property {Error} originalError - Original error that was caught
 * @property {string} stack - Error stack trace
 */

export default function ChatInterface() {
  const theme = useTheme();
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content:
        "Hi! I'm your marketplace assistant. The easiest way to find products is to use the category buttons below. Try clicking 'Electronics', 'Furniture', 'Textbooks', 'Clothing', or 'Miscellaneous' to browse items. You can also type specific searches like 'Find furniture under $300'. Want to sell something? Just click the camera icon to upload an image and I'll help create a listing!",
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [session, setSession] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showSearchTips, setShowSearchTips] = useState(false);

  // New state variables for image upload
  const [imageUploadOpen, setImageUploadOpen] = useState(false);
  const [uploadedImage, setUploadedImage] = useState(null);
  const [generatedListing, setGeneratedListing] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Add these new state variables for loading and processing
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStage, setProcessingStage] = useState("idle");
  const [processingProgress, setProcessingProgress] = useState(0);
  const [processingError, setProcessingError] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const pagePositionRef = useRef(0);
  const scrollLockTimeoutRef = useRef(null);
  const scrollBlockerRef = useRef(null);

  // Add a new file input ref at the component level (add this near other refs)
  const fileInputRef = useRef(null);

  // Get the session
  useEffect(() => {
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (data?.session) {
        setSession(data.session);
      }
    };
    checkSession();
  }, []);

  // Inject global keyframes into the document
  useEffect(() => {
    // Create style element for keyframes
    const styleEl = document.createElement("style");
    styleEl.type = "text/css";
    styleEl.innerHTML = `
      ${keyframes}
      
      :root {
        --animation-fade-in: fadeIn 0.3s ease-out;
        --animation-progress: progress 2s infinite linear;
        --animation-pulse: pulse 2s infinite ease-in-out;
        --animation-slide-in: slideIn 0.5s ease-out;
      }
      
      .progress-bar-animation {
        animation: var(--animation-progress) !important;
      }
      
      .pulse-animation {
        animation: var(--animation-pulse) !important;
      }
      
      .fade-in-animation {
        animation: var(--animation-fade-in) !important;
      }
      
      .slide-in-animation {
        animation: var(--animation-slide-in) !important;
      }
      
      .MuiDialog-paper {
        animation: var(--animation-fade-in) !important;
      }
    `;
    document.head.appendChild(styleEl);

    // Clean up on unmount
    return () => {
      document.head.removeChild(styleEl);
    };
  }, []);

  // Focus input field on load
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Add this function to disable page scrolling temporarily
  const lockPageScroll = () => {
    // Store current scroll position
    pagePositionRef.current = window.scrollY;

    // Apply fixed positioning to body to prevent scroll
    document.body.style.position = "fixed";
    document.body.style.top = `-${pagePositionRef.current}px`;
    document.body.style.width = "100%";
  };

  // Add this function to re-enable page scrolling
  const unlockPageScroll = () => {
    // Remove fixed positioning
    document.body.style.position = "";
    document.body.style.top = "";
    document.body.style.width = "";

    // Restore scroll position
    window.scrollTo(0, pagePositionRef.current);
  };

  // Define a more robust scroll lock function
  const forcePreventPageScroll = (callback) => {
    // Store position
    const scrollPos = window.scrollY;

    // Create MutationObserver to detect any DOM changes that might cause scrolling
    const observer = new MutationObserver(() => {
      // Force window back to original position
      window.scrollTo(0, scrollPos);
    });

    // Start observing the entire document for all changes
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      characterData: true,
    });

    // Execute the callback
    setTimeout(() => {
      try {
        if (typeof callback === "function") {
          callback();
        }
      } finally {
        // Force position again
        window.scrollTo(0, scrollPos);

        // Stop observing after a short delay to catch any delayed scrolling
        setTimeout(() => observer.disconnect(), 300);
      }
    }, 0);
  };

  // Add or replace the handleImageUpload function with this updated version
  /**
   * Handles the full image upload, processing, and modal display flow
   * @param {File} file - The image file to process
   */
  const handleImageUpload = async (file) => {
    // Guard clause - if no file, exit early
    if (!file) {
      debugLog("No file provided");
      return;
    }

    debugLog("Image upload initiated", {
      fileName: file.name,
      size: Math.round(file.size / 1024) + "KB",
      type: file.type,
    });

    // Check if user is logged in
    if (!session || !session.user) {
      debugLog("User not logged in - showing login prompt");
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "To create a listing, you need to be logged in. Please sign in or create an account to continue.",
        },
      ]);

      // Reset file input
      resetFileInput(fileInputRef);
      return;
    }

    try {
      // Reset states and start processing
      setProcessingError(null);
      setGeneratedListing(null);
      setUploadedImage(null);
      setIsProcessing(true);
      setProcessingStage("optimizing");
      setProcessingProgress(10);

      // Create image preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target.result);
        setProcessingProgress(20);
      };
      reader.readAsDataURL(file);

      // Upload to Supabase
      setProcessingStage("uploading");
      setProcessingProgress(30);
      debugLog("Starting Supabase upload");
      const imageUrl = await uploadImageToSupabase(file);

      if (!imageUrl) {
        throw new Error("Failed to get image URL after upload");
      }

      // Store file reference for later use
      setUploadedImage(file);
      setProcessingProgress(50);

      // Now process the image with OpenAI Vision
      setProcessingStage("processing");
      debugLog("Starting OpenAI Vision processing", { imageUrl });
      const productData = await processImageWithVision(imageUrl, file);

      // Processing complete
      setProcessingProgress(100);
      setProcessingStage("done");
      setIsProcessing(false);

      // Store generated listing
      debugLog("Setting generated listing data", productData);
      setGeneratedListing(productData);

      // Open modal to show results
      debugLog("Opening listing modal");
      setImageUploadOpen(true);
    } catch (error) {
      // Handle errors
      debugLog("Error in image upload process", {
        message: error.message,
        stack: error.stack,
      });

      console.error("Image upload error:", error);

      setProcessingStage("error");
      setProcessingError(error.message);

      // Allow user to retry from the error overlay
      // We'll keep isProcessing true so the overlay remains visible
    } finally {
      // Always reset the file input so the same file can be selected again
      resetFileInput(fileInputRef);
    }
  };

  // Add a handler for retrying after an error
  const handleRetryUpload = () => {
    if (!uploadedImage) {
      // If no previous image, close the overlay
      setIsProcessing(false);
      return;
    }

    // Retry with the same image
    setProcessingError(null);
    setProcessingStage("uploading");
    setProcessingProgress(0);
    handleImageUpload(uploadedImage);
  };

  // Add a handler for canceling the upload process
  const handleCancelUpload = () => {
    setIsProcessing(false);
    setProcessingStage("idle");
    setProcessingProgress(0);
    setProcessingError(null);
    setUploadedImage(null);
    setImagePreview(null);
    // Close any open dialogs
    setImageUploadOpen(false);
  };

  /**
   * Uploads an image to Supabase storage
   * @param {File} file - The image file to upload
   * @returns {Promise<string>} Public URL of the uploaded image
   */
  const uploadImageToSupabase = async (file) => {
    try {
      debugLog("Upload to Supabase started");

      // Generate a unique filename to prevent collisions
      const filePath = generateUniqueFilename(file);
      debugLog("Generated unique filename", filePath);

      // Upload to Supabase storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("product-images")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: true,
          contentType: file.type || "image/jpeg",
        });

      if (uploadError) {
        debugLog("Supabase upload error", uploadError);
        throw new Error(`Error uploading image: ${uploadError.message}`);
      }

      debugLog("Supabase upload successful");

      // Get the public URL
      const { data: urlData } = supabase.storage
        .from("product-images")
        .getPublicUrl(filePath);

      if (!urlData || !urlData.publicUrl) {
        throw new Error("Failed to get public URL for uploaded image");
      }

      const publicUrl = urlData.publicUrl;
      debugLog("Got public URL", publicUrl);

      // Verify the URL is accessible
      const checkResponse = await fetch(publicUrl, { method: "HEAD" });
      if (!checkResponse.ok) {
        debugLog("URL verification failed", checkResponse.status);
        throw new Error(`Image URL not accessible: ${checkResponse.status}`);
      }

      debugLog("URL verification successful");
      return publicUrl;
    } catch (error) {
      debugLog("Supabase upload failed", error);
      throw new Error(`Failed to upload image: ${error.message}`);
    }
  };

  /**
   * Processes an image URL with OpenAI Vision API
   * @param {string} imageUrl - Public URL of the image
   * @param {File} originalFile - Original file for reference
   * @returns {Promise<Object>} Product data from OpenAI
   */
  const processImageWithVision = async (imageUrl, originalFile) => {
    try {
      debugLog("OpenAI Vision processing started", { imageUrl });

      // Get the correct API URL from our configuration
      const apiUrl = API_CONFIG.getUrl(API_CONFIG.ENDPOINTS.ANALYZE_IMAGE);
      debugLog("Using API endpoint", apiUrl);

      // Create a timeout promise to handle unresponsive servers
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(
          () => reject(new Error("Request timed out after 30 seconds")),
          30000
        );
      });

      // Create the actual fetch request
      const fetchPromise = fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: session?.access_token
            ? `Bearer ${session.access_token}`
            : undefined,
        },
        body: JSON.stringify({
          image_url: imageUrl, // Send URL instead of base64 string
        }),
      });

      // Race the fetch against the timeout
      const response = await Promise.race([fetchPromise, timeoutPromise]);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({
          message: `Server returned ${response.status} ${
            response.statusText || "Unknown Error"
          }`,
        }));
        throw new Error(errorData.message || `API Error: ${response.status}`);
      }

      debugLog("API response received");
      const data = await response.json();

      // Handle different API response formats
      let productData;

      if (data && typeof data === "object") {
        if (data.name && data.description && data.price !== undefined) {
          // Direct product data format
          debugLog("Response format: direct product data");
          productData = data;
        } else if (data.role && typeof data.content === "string") {
          // OpenAI response object
          debugLog("Response format: OpenAI direct format");
          try {
            // Try to extract JSON from the content
            const jsonMatch = data.content.match(/{[\s\S]*}/);
            if (jsonMatch) {
              productData = JSON.parse(jsonMatch[0]);
            } else {
              throw new Error("Could not parse product data from response");
            }
          } catch (parseError) {
            debugLog("Failed to parse response", parseError);
            throw new Error("Invalid product data from API");
          }
        } else if (
          data.message &&
          typeof data.message === "object" &&
          data.message.content
        ) {
          // Wrapped message object
          debugLog("Response format: wrapped message object");
          try {
            // Try to extract JSON from the content
            const jsonMatch = data.message.content.match(/{[\s\S]*}/);
            if (jsonMatch) {
              productData = JSON.parse(jsonMatch[0]);
            } else {
              throw new Error("Could not parse product data from response");
            }
          } catch (parseError) {
            debugLog("Failed to parse response", parseError);
            throw new Error("Invalid product data from API");
          }
        } else {
          debugLog("Unknown response format", data);
          throw new Error("Invalid response format from API");
        }
      } else {
        debugLog("Invalid response format", data);
        throw new Error("Invalid response format from API");
      }

      // Ensure we have the minimum required fields
      if (
        !productData.name ||
        !productData.description ||
        productData.price === undefined
      ) {
        debugLog("Missing required fields in product data", productData);
        throw new Error("Missing required product details in API response");
      }

      // Add image URL and original file to product data
      debugLog("Adding image info to product data");
      productData.image = imageUrl;
      productData.imageFile = originalFile;

      return productData;
    } catch (error) {
      debugLog("OpenAI Vision processing failed", error);

      // Create user-friendly error messages for common connection issues
      let userMessage = "Failed to analyze image";

      if (
        error.message === "Failed to fetch" ||
        error.message.includes("ERR_CONNECTION_REFUSED")
      ) {
        userMessage =
          "Could not connect to the server. Please check your internet connection or try again later.";
      } else if (error.message.includes("timed out")) {
        userMessage =
          "Server took too long to respond. Please try again later.";
      } else if (error.message.includes("NetworkError")) {
        userMessage = "Network error. Please check your internet connection.";
      } else if (
        error.message.includes("model_not_found") ||
        error.message.includes("does not exist") ||
        error.message.includes("The model") ||
        error.message.includes("image processing model")
      ) {
        userMessage =
          "The image processing model was recently updated. We're fixing it. Please try again later.";
        console.error("OpenAI model error:", error.message);
      }

      // Just throw a new error with the user-friendly message
      throw new Error(userMessage);
    }
  };

  // Function to handle listing submission
  const handleListingSubmit = async () => {
    if (!generatedListing || !session?.user?.id) return;

    try {
      debugLog("Starting listing submission");
      setIsLoading(true);

      // Store user ID in localStorage for consistent access
      localStorage.setItem("userId", session.user.id);

      // We already have the image URL from our upload, so no need to upload again
      let imageUrl = generatedListing.image;

      // But verify it's still valid
      try {
        debugLog("Verifying image URL", imageUrl);
        const checkResponse = await fetch(imageUrl, { method: "HEAD" });
        if (!checkResponse.ok) {
          debugLog("Image URL verification failed", checkResponse.status);
          throw new Error(`Image URL not accessible: ${checkResponse.status}`);
        }
      } catch (urlError) {
        debugLog("Image URL check failed", urlError);
        throw new Error(`Failed to verify image URL: ${urlError.message}`);
      }

      // Prepare the product data
      debugLog("Preparing product data for database");
      const productData = {
        name: generatedListing.name,
        price: parseFloat(generatedListing.price),
        description: generatedListing.description,
        image: imageUrl,
        condition: generatedListing.condition,
        category: generatedListing.category,
        status: "available",
        is_bundle: false,
        flag: false,
        userID: session.user.id,
        hide: false,
        moderation_status: "pending",
        is_deleted: false,
      };

      debugLog("Creating product in database", productData);

      // Insert into the database
      const { data: insertedData, error: productError } = await supabase
        .from("products")
        .insert([productData])
        .select();

      if (productError) {
        debugLog("Database error creating product", productError);
        throw new Error(`Error creating product: ${productError.message}`);
      }

      if (!insertedData || insertedData.length === 0) {
        debugLog("No data returned from database insert");
        throw new Error("Product was not created properly");
      }

      const savedProduct = insertedData[0];
      debugLog("Product created successfully", savedProduct);

      // Close dialog and reset state
      setImageUploadOpen(false);
      setGeneratedListing(null);
      setUploadedImage(null);

      // Add success message to chat with link to account page
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `Your listing for "${generatedListing.name}" has been created and is pending approval. You can view it in your <a href="/account" style="color: #1976d2; text-decoration: underline;">account page</a> once approved.`,
        },
      ]);

      debugLog("Listing submission completed successfully");
    } catch (error) {
      debugLog("Error creating listing", error);
      console.error("Error creating listing:", error);

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `Sorry, there was an error creating your listing: ${error.message}`,
        },
      ]);
    } finally {
      setIsLoading(false);

      // Ensure file input is reset
      resetFileInput(fileInputRef);
    }
  };

  // New function to handle a user wanting to contact a seller about a product
  const handleContactSeller = async (product) => {
    if (!product) return;

    // Get seller ID from product's userID
    const sellerId = product.userID;
    if (!sellerId) return;

    // Get current user ID
    const userId = localStorage.getItem("userId");
    if (!userId) {
      console.error("No user ID found in localStorage");
      return;
    }

    // Create a unique conversation key
    const conversationKey = `${userId}_${sellerId}_${
      product.productID || product.id
    }`;

    // Use sessionStorage to track sent messages
    const sentMessagesKey = "sentMessagesTracker";
    const sentMessages = JSON.parse(
      sessionStorage.getItem(sentMessagesKey) || "[]"
    );

    // Check if we've already sent a message in this session
    if (sentMessages.includes(conversationKey)) {
      console.log("Already initiated this conversation in current session");
      // Just navigate without sending another message
      window.location.href = `/messaging/${sellerId}?productId=${
        product.productID || product.id
      }`;
      return;
    }

    try {
      // Track that we've initiated this conversation
      sentMessages.push(conversationKey);
      sessionStorage.setItem(sentMessagesKey, JSON.stringify(sentMessages));

      // Create initial message with let instead of const
      let initialMessage = `Hi, I'm interested in your ${product.name}. Is this still available?`;

      if (product.image) {
        initialMessage += `\n\n<div style="margin-top:10px; margin-bottom:10px; max-width:250px;">
          <img src="${product.image}" alt="${product.name}" style="max-width:100%; border-radius:8px; border:1px solid #eee;" />
        </div>\n\nLooking forward to your response!`;
      }

      // Save this info for the messaging page
      sessionStorage.setItem(
        "last_product_contacted",
        JSON.stringify({
          productId: product.productID || product.id,
          sellerId: sellerId,
          initialMessageSent: true,
        })
      );

      // Send the message first
      await supabase.from("messages").insert([
        {
          sender_id: userId,
          receiver_id: sellerId,
          content: initialMessage,
          status: "active",
          created_at: new Date().toISOString(),
        },
      ]);

      console.log("Successfully sent initial message");

      // Mark conversation as initiated
      markMessageSent(userId, sellerId, product);

      // Save window scroll position
      const windowScrollY = window.scrollY;

      // Construct URL with both seller ID and product ID for context
      const messagesUrl = `/messaging/${sellerId}?productId=${
        product.productID || product.id
      }`;

      // Navigate to messages
      window.location.href = messagesUrl;

      // Restore window scroll position
      window.scrollTo(0, windowScrollY);
    } catch (error) {
      console.error("Error sending initial message:", error);
      // Still redirect even if message fails
      window.location.href = `/messaging/${sellerId}?productId=${
        product.productID || product.id
      }`;
    }
  };

  // Update handleCategoryClick to be more aggressive about scroll prevention
  const handleCategoryClick = (category, event) => {
    // 1. Cancel the event completely
    if (event) {
      event.preventDefault();
      event.stopPropagation();
      if (event.nativeEvent) {
        event.nativeEvent.stopImmediatePropagation();
        event.nativeEvent.preventDefault();
      }
    }

    // 2. Store the current scroll position immediately
    const originalScrollPosition = window.scrollY;

    // 3. Create the category search message
    const message = `Show me ${category}`;

    // 4. Use our enhanced scroll prevention approach
    forcePreventPageScroll(() => {
      // Update the React state
      setInput(message);

      // Direct DOM update for immediate effect
      if (inputRef.current) {
        // Set value directly on DOM
        inputRef.current.value = message;

        // Create a fake submission event
        const fakeEvent = {
          preventDefault: () => {},
          stopPropagation: () => {},
          nativeEvent: {
            stopImmediatePropagation: () => {},
            preventDefault: () => {},
          },
        };

        // Focus input without scrolling using the DOM directly
        try {
          // Use a more direct approach - defer the focus
          setTimeout(() => {
            inputRef.current.focus({ preventScroll: true });
            // Force window position again
            window.scrollTo(0, originalScrollPosition);

            // Submit the form with some delay to ensure input is properly set
            setTimeout(() => {
              handleSubmit(fakeEvent);
              // Final position enforcement
              window.scrollTo(0, originalScrollPosition);
            }, 10);
          }, 0);
        } catch (e) {
          console.error("Focus error", e);
          // Submit anyway if focus fails
          handleSubmit(fakeEvent);
        }
      }
    });

    // 5. Enforce the scroll position again after everything
    setTimeout(() => window.scrollTo(0, originalScrollPosition), 100);

    return false;
  };

  // Function to handle submission of chat messages - updated with Karpathy approach
  const handleSubmit = async (e) => {
    // Complete event cancellation
    if (e) {
      e.preventDefault();
      e.stopPropagation();
      if (e.nativeEvent) e.nativeEvent.stopImmediatePropagation();
    }

    // Get the current input value
    const currentInput = input.trim();
    if (!currentInput) return;

    // Add user message to chat without scroll manipulation
    const userMessage = { role: "user", content: currentInput };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      // Send message to API
      const response = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: session?.access_token
            ? `Bearer ${session.access_token}`
            : undefined,
        },
        credentials: "include",
        body: JSON.stringify({
          messages: [...messages, userMessage],
          userId: session?.user?.id || "anonymous",
        }),
      });

      if (!response.ok) {
        throw new Error("API request failed");
      }

      const data = await response.json();

      // Modified validation to handle different API response formats
      // Check if the response is an OpenAI response (containing role and content)
      // or a wrapper containing a message property
      let messageToProcess;
      if (data && typeof data === "object") {
        if (data.role && typeof data.content === "string") {
          // The API returned an OpenAI response object directly
          console.log("Direct OpenAI response format received");
          messageToProcess = data;
        } else if (
          data.message &&
          typeof data.message === "object" &&
          data.message.content
        ) {
          // The API returned a wrapped message object
          console.log("Wrapped message format received");
          messageToProcess = data.message;
        } else if (data.message && typeof data.message === "string") {
          // The API returned a string message
          console.log("String message format received");
          messageToProcess = {
            role: "assistant",
            content: data.message,
          };
        } else {
          // Try to convert the data to a usable format
          console.log("Attempting to convert API response to usable format");
          const dataStr = JSON.stringify(data);
          messageToProcess = {
            role: "assistant",
            content: `I'm sorry, but I couldn't process your request properly. Please try again.`,
          };
          console.error("API returned unexpected data format:", dataStr);
        }
      } else {
        // Invalid response format
        console.error("Invalid API response format:", data);
        throw new Error("Received invalid response from API");
      }

      // Process the response for products - add null/undefined check
      const { message: processedMessage, products } =
        processMessageForProducts(messageToProcess);

      // Check if products were found in the response
      const hasProducts = products && products.length > 0;

      // For search queries with no products, suggest using category buttons
      if (currentInput.toLowerCase().includes("show me") && !hasProducts) {
        processedMessage.content +=
          "\n\nTry browsing by category using the buttons below.";
      }

      // Add AI response to chat
      setMessages((prev) => [...prev, processedMessage]);

      // Focus the input without scrolling
      if (inputRef.current) {
        inputRef.current.focus({ preventScroll: true });
      }

      // Set products if any were found
      if (hasProducts) {
        setSelectedProduct(products[0]);
      }
    } catch (error) {
      console.error("Error sending message:", error);
      // Add error message to chat
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "I'm sorry, I encountered an error while processing your request. Please try again later.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  // Function to render message content with products if available
  const renderMessageContent = (message) => {
    // Check if this is an assistant message that might contain product data
    if (message.role === "assistant") {
      try {
        // Check for verification marker to extract products - Karpathy's approach
        const verifiedRegex =
          /VERIFIED_PRODUCTS_START(\[[\s\S]*?\])VERIFIED_PRODUCTS_END/;
        const verifiedMatch = message.content.match(verifiedRegex);

        // Fallback to older database marker if needed
        const markerRegex =
          /DATABASE_PRODUCTS_START(\[[\s\S]*?\])DATABASE_PRODUCTS_END/;
        const markerMatch = message.content.match(markerRegex);

        let products = null;
        let cleanedContent = message.content;

        // If we found our verification marker, extract the products JSON and clean the message
        if (verifiedMatch && verifiedMatch[1]) {
          // Found verified products marker in message

          try {
            // Parse the JSON to get product objects
            const rawProductsJson = verifiedMatch[1].trim();
            const rawProducts = JSON.parse(rawProductsJson);

            if (!Array.isArray(rawProducts)) {
              // Parsed products is not an array
              products = [];
            } else {
              // Process products to remove verification codes and ensure clean data
              products = rawProducts
                .map((product) => {
                  if (!product) return null;
                  const cleanProduct = { ...product };
                  // Remove the verification code for display
                  if (cleanProduct._vcode) {
                    delete cleanProduct._vcode;
                  }
                  // Ensure required fields exist
                  if (!cleanProduct.name) cleanProduct.name = "Unnamed Product";
                  if (!cleanProduct.productID && cleanProduct.id)
                    cleanProduct.productID = cleanProduct.id;
                  if (!cleanProduct.id && cleanProduct.productID)
                    cleanProduct.id = cleanProduct.productID;
                  return cleanProduct;
                })
                .filter(Boolean); // Remove any null entries
            }

            // Remove the technical marker from the displayed message
            cleanedContent = message.content.replace(verifiedRegex, "");

            // Also clean up any visible verification codes [VPxxx] from the message - improved regex
            cleanedContent = cleanedContent.replace(/\[\w+\d*\]/g, "");

            // Also clean up any remaining product ID references
            cleanedContent = cleanedContent.replace(/VP\d+/g, "");

            // Clean up any extra whitespace/newlines from the marker removal
            cleanedContent = cleanedContent.trim().replace(/^\n+/, "");

            // Remove duplicate spaces
            cleanedContent = cleanedContent.replace(/\s{2,}/g, " ");

            // Check if this was likely a general search (not specific products)
            const lastUserMessage =
              messages
                .filter((msg) => msg.role === "user")
                .pop()
                ?.content?.toLowerCase() || "";
            const isGeneralSearch =
              lastUserMessage.includes("show me") ||
              lastUserMessage.includes("what do you have") ||
              (lastUserMessage.includes("find") &&
                !lastUserMessage.includes("specific"));

            if (isGeneralSearch && products && products.length > 0) {
              // Add an explanatory heading for general searches
              cleanedContent =
                "Here are some items from our marketplace:\n\n" +
                cleanedContent;
            }

            // Extracted verified products
          } catch (e) {
            // Error parsing verified products JSON
            products = []; // Set to empty array on error
          }
        }
        // Fall back to older DATABASE_PRODUCTS format
        else if (markerMatch && markerMatch[1]) {
          // Found database products marker in message

          try {
            // Parse the JSON to get product objects
            const productsJson = markerMatch[1].trim();
            const parsedProducts = JSON.parse(productsJson);

            if (!Array.isArray(parsedProducts)) {
              // Parsed products is not an array
              products = [];
            } else {
              products = parsedProducts.filter(
                (p) => p && typeof p === "object"
              );
            }

            // Remove the technical marker from the displayed message
            cleanedContent = message.content.replace(markerRegex, "");

            // Clean up any extra whitespace/newlines from the marker removal
            cleanedContent = cleanedContent.trim().replace(/^\n+/, "");

            // Extracted products from marker
          } catch (e) {
            // Error parsing products JSON
            products = []; // Set to empty array on error
          }
        } else {
          // Fallback to our general product extractor
          // No product markers found, trying general product extraction
          try {
            products = extractProductsFromMessage(message.content);
            if (!Array.isArray(products)) {
              // Extracted products is not an array
              products = [];
            }
          } catch (error) {
            // Error in general product extraction
            products = [];
          }
        }

        // If we have valid products, display them with the product cards
        if (products && Array.isArray(products) && products.length > 0) {
          // Displaying products in chat

          try {
            // Validate first product to see if it has required properties
            const firstProduct = products[0];
            // First product validation

            // Set the products for display
            setSelectedProduct(firstProduct);
          } catch (error) {
            // Error setting products
          }
        }

        // Check if the content contains HTML links
        if (cleanedContent.includes("<a href=")) {
          return (
            <Box sx={{ width: "100%" }}>
              <div
                style={{ whiteSpace: "pre-wrap" }}
                dangerouslySetInnerHTML={{ __html: cleanedContent }}
              />
            </Box>
          );
        }

        // If we have markdown images in the content, render them
        if (message.content.includes("![") && message.content.includes("](")) {
          // Message contains markdown images, rendering as markdown
          const htmlContent = convertMarkdownToHtml(message.content);

          return (
            <Box sx={{ width: "100%" }}>
              <div
                style={{ whiteSpace: "pre-wrap" }}
                dangerouslySetInnerHTML={{ __html: htmlContent }}
              />
            </Box>
          );
        }

        // Default case - just show the cleaned message
        return (
          <Typography variant="body1" style={{ whiteSpace: "pre-wrap" }}>
            {cleanedContent}
          </Typography>
        );
      } catch (error) {
        // Error rendering product content
        return (
          <Typography variant="body1" style={{ whiteSpace: "pre-wrap" }}>
            {message.content}
          </Typography>
        );
      }
    }

    // Default rendering for messages without products
    return (
      <Typography variant="body1" style={{ whiteSpace: "pre-wrap" }}>
        {message.content}
      </Typography>
    );
  };

  // Helper function to convert markdown image syntax to HTML
  const convertMarkdownToHtml = (markdown) => {
    // Convert markdown image syntax ![alt](url) to HTML <img> tags
    let html = markdown.replace(
      /!\[(.*?)\]\((.*?)\)/g,
      '<img src="$2" alt="$1" style="max-width: 100%; max-height: 200px; border-radius: 4px; margin: 8px 0;" />'
    );

    // Convert markdown double asterisks for bold
    html = html.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");

    // Convert single line breaks to <br>
    html = html.replace(/\n/g, "<br>");

    return html;
  };

  const processMessageForProducts = (message) => {
    // Add null check to handle undefined message or message.content
    if (!message || !message.content) {
      console.error(
        "Invalid message object in processMessageForProducts:",
        message
      );
      return {
        message: {
          role: "assistant",
          content:
            "I'm sorry, I encountered an error processing the response. Please try again.",
        },
        products: [],
      };
    }

    // Check if the message contains the verified products marker
    if (
      message.content.includes("VERIFIED_PRODUCTS_START") &&
      message.content.includes("VERIFIED_PRODUCTS_END")
    ) {
      // Extract the verified products JSON
      // Found verified products marker in message
      const productsJson = message.content
        .split("VERIFIED_PRODUCTS_START")[1]
        .split("VERIFIED_PRODUCTS_END")[0];

      try {
        const products = JSON.parse(productsJson);

        // Save products to localStorage for favorites functionality
        console.log("Saving search results to localStorage:", products);
        // Get existing search results from localStorage
        const existingResults = JSON.parse(
          localStorage.getItem("searchResults") || "[]"
        );
        // Merge with new products, avoiding duplicates by productID
        const mergedResults = [...existingResults];
        products.forEach((product) => {
          const productId = product.productID || product.id;
          // Only add if not already in results
          if (!mergedResults.some((p) => (p.productID || p.id) === productId)) {
            mergedResults.push(product);
          }
        });
        localStorage.setItem("searchResults", JSON.stringify(mergedResults));

        // Clean up the message by removing the JSON data
        const cleanedContent = message.content
          .replace(
            `VERIFIED_PRODUCTS_START${productsJson}VERIFIED_PRODUCTS_END`,
            ""
          )
          .replace(/\[\w+\d*\]/g, "") // Remove verification codes [VP123]
          .replace(/VP\d+/g, "") // Remove any remaining VP123 references
          .replace(/\s{2,}/g, " ") // Remove double spaces
          .trim(); // Trim leading/trailing whitespace

        // Return both the cleaned message and the extracted products
        // Attach products directly to the message object
        const processedMessage = {
          ...message,
          content: cleanedContent,
          products,
        };
        return {
          message: processedMessage,
          products,
        };
      } catch (error) {
        // Return the original message if parsing fails
        return { message, products: [] };
      }
    } else if (
      message.content.includes("DATABASE_PRODUCTS_START") &&
      message.content.includes("DATABASE_PRODUCTS_END")
    ) {
      // Extract the database products JSON
      // Found database products marker in message
      const productsJson = message.content
        .split("DATABASE_PRODUCTS_START")[1]
        .split("DATABASE_PRODUCTS_END")[0];

      try {
        const products = JSON.parse(productsJson);

        // Save products to localStorage for favorites functionality
        console.log(
          "Saving database search results to localStorage:",
          products
        );
        // Get existing search results from localStorage
        const existingResults = JSON.parse(
          localStorage.getItem("searchResults") || "[]"
        );
        // Merge with new products, avoiding duplicates by productID
        const mergedResults = [...existingResults];
        products.forEach((product) => {
          const productId = product.productID || product.id;
          // Only add if not already in results
          if (!mergedResults.some((p) => (p.productID || p.id) === productId)) {
            mergedResults.push(product);
          }
        });
        localStorage.setItem("searchResults", JSON.stringify(mergedResults));

        // Clean up the message by removing the JSON data and verification codes
        const cleanedContent = message.content
          .replace(
            `DATABASE_PRODUCTS_START${productsJson}DATABASE_PRODUCTS_END`,
            ""
          )
          .replace(/\[\w+\d*\]/g, "") // Remove verification codes [VP123]
          .replace(/VP\d+/g, "") // Remove any remaining VP123 references
          .replace(/\s{2,}/g, " ") // Remove double spaces
          .trim(); // Trim leading/trailing whitespace

        // Return both the cleaned message and the extracted products
        // Attach products directly to the message object
        const processedMessage = {
          ...message,
          content: cleanedContent,
          products,
        };
        return {
          message: processedMessage,
          products,
        };
      } catch (error) {
        // Return the original message if parsing fails
        return { message, products: [] };
      }
    } else {
      // Try to extract products using our utility function
      const products = extractProductsFromMessage(message.content);

      if (products && products.length > 0) {
        // Save products to localStorage for favorites functionality
        console.log(
          "Saving extracted search results to localStorage:",
          products
        );
        // Get existing search results from localStorage
        const existingResults = JSON.parse(
          localStorage.getItem("searchResults") || "[]"
        );
        // Merge with new products, avoiding duplicates by productID
        const mergedResults = [...existingResults];
        products.forEach((product) => {
          const productId = product.productID || product.id;
          // Only add if not already in results
          if (!mergedResults.some((p) => (p.productID || p.id) === productId)) {
            mergedResults.push(product);
          }
        });
        localStorage.setItem("searchResults", JSON.stringify(mergedResults));

        // Clean the message content of any verification codes
        const cleanedContent = message.content
          .replace(/\[\w+\d*\]/g, "") // Remove verification codes [VP123]
          .replace(/VP\d+/g, "") // Remove any remaining VP123 references
          .replace(/\s{2,}/g, " ") // Remove double spaces
          .trim(); // Trim leading/trailing whitespace

        // Displaying products in chat
        // Attach products directly to the message object
        const processedMessage = {
          ...message,
          content: cleanedContent,
          products,
        };
        return { message: processedMessage, products };
      }

      // No products found, return the original message
      return { message, products: [] };
    }
  };

  // Add a useEffect to trap wheel events within the chat container
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    // Function to prevent wheel events from propagating to window
    const handleWheel = (e) => {
      const { scrollTop, scrollHeight, clientHeight } = container;

      // If we're at the top of the container and trying to scroll up
      if (scrollTop === 0 && e.deltaY < 0) {
        // Allow normal window scrolling
        return;
      }

      // If we're at the bottom of the container and trying to scroll down
      if (scrollTop + clientHeight >= scrollHeight && e.deltaY > 0) {
        // Allow normal window scrolling
        return;
      }

      // Otherwise, we're in the middle of the container, so stop propagation
      e.stopPropagation();
    };

    container.addEventListener("wheel", handleWheel, { passive: false });
    return () => container.removeEventListener("wheel", handleWheel);
  }, []);

  // Add this useEffect to manage cleanup
  useEffect(() => {
    // Clean up scroll lock if component unmounts with lock still active
    return () => {
      clearTimeout(scrollLockTimeoutRef.current);

      // Check if body still has fixed position and restore it
      if (document.body.style.position === "fixed") {
        document.body.style.position = "";
        document.body.style.top = "";
        document.body.style.width = "";
        window.scrollTo(0, pagePositionRef.current);
      }
    };
  }, []);

  // Add this global scroll blocker function
  useEffect(() => {
    // Create variables to track if scrolling is currently blocked
    let isScrollBlocked = false;
    let originalScrollPosition = 0;

    // Create a scroll blocker function
    const blockScroll = (duration = 1000) => {
      if (isScrollBlocked) return;

      // Store current position
      originalScrollPosition = window.scrollY;
      isScrollBlocked = true;

      // Function to force the scroll position
      const forcePosition = (e) => {
        if (isScrollBlocked) {
          window.scrollTo(0, originalScrollPosition);
          if (e) {
            e.preventDefault();
            e.stopPropagation();
          }
        }
      };

      // Capture all events that could cause scrolling
      window.addEventListener("scroll", forcePosition, {
        passive: false,
        capture: true,
      });
      window.addEventListener("touchmove", forcePosition, {
        passive: false,
        capture: true,
      });
      window.addEventListener("mousewheel", forcePosition, {
        passive: false,
        capture: true,
      });
      window.addEventListener("DOMMouseScroll", forcePosition, {
        passive: false,
        capture: true,
      });

      // Create a style element to disable scrolling
      const styleElement = document.createElement("style");
      styleElement.innerHTML = `
        html, body {
          overflow: hidden !important;
          position: fixed !important;
          width: 100% !important;
          height: 100% !important;
          top: -${originalScrollPosition}px !important;
        }
      `;
      document.head.appendChild(styleElement);

      // Unblock after the specified duration
      setTimeout(() => {
        // Remove event listeners
        window.removeEventListener("scroll", forcePosition, { capture: true });
        window.removeEventListener("touchmove", forcePosition, {
          capture: true,
        });
        window.removeEventListener("mousewheel", forcePosition, {
          capture: true,
        });
        window.removeEventListener("DOMMouseScroll", forcePosition, {
          capture: true,
        });

        // Remove style element
        document.head.removeChild(styleElement);

        // Restore original position
        window.scrollTo(0, originalScrollPosition);
        isScrollBlocked = false;
      }, duration);

      return forcePosition;
    };

    // Store the function in our ref
    scrollBlockerRef.current = blockScroll;

    // No cleanup needed since we're using a ref, not modifying window
  }, []);

  // Create product listing dialog component
  const ListingDialog = () => {
    // Set up handlers that don't change on re-renders
    const handleDialogClose = useCallback(() => {
      debugLog("Dialog close requested");

      // Don't allow closing during analysis
      if (isAnalyzing) {
        debugLog("Close prevented - analysis in progress");
        return;
      }

      debugLog("Closing dialog");
      setImageUploadOpen(false);

      // Use a delay to ensure smooth transition
      setTimeout(() => {
        debugLog("Resetting state after dialog close");
        setGeneratedListing(null);
        setUploadedImage(null);
        setIsAnalyzing(false);

        // Ensure file input is reset
        resetFileInput(fileInputRef);
      }, 300);
    }, [isAnalyzing]);

    // Memoize other handlers
    const handleImageAnalyzed = useCallback((productData) => {
      debugLog("Image analysis completed", productData);

      setIsAnalyzing(false);
      setGeneratedListing(productData);
    }, []);

    const handleListingSubmitted = useCallback((savedProduct) => {
      debugLog("Listing submitted successfully", savedProduct);

      setImageUploadOpen(false);
      setGeneratedListing(null);
      setUploadedImage(null);

      // Show success message in chat
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `✅ Your listing for "${savedProduct.name}" has been created and is now awaiting moderation. You can view it in your <a href="/account" style="color: #1976d2; text-decoration: underline;">account page</a> once approved.`,
        },
      ]);

      // Ensure file input is reset
      resetFileInput(fileInputRef);
    }, []);

    const handleAnalysisError = useCallback((error) => {
      debugLog("Analysis error in dialog", error);

      setIsAnalyzing(false);
      setImageUploadOpen(false);

      // Show error message in chat
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `Error analyzing image: ${error.message}. Please try again with a different image.`,
        },
      ]);

      // Ensure file input is reset
      resetFileInput(fileInputRef);
    }, []);

    const handleCancel = useCallback(() => {
      debugLog("Dialog cancel requested");

      setImageUploadOpen(false);
      setGeneratedListing(null);
      setUploadedImage(null);
      setIsAnalyzing(false);

      // Ensure file input is reset
      resetFileInput(fileInputRef);
    }, []);

    // Log current dialog state for debugging
    useEffect(() => {
      debugLog("Dialog state", {
        open: imageUploadOpen,
        isAnalyzing,
        hasGeneratedListing: !!generatedListing,
      });
    }, [imageUploadOpen, isAnalyzing, generatedListing]);

    return (
      <Dialog
        open={imageUploadOpen}
        onClose={handleDialogClose}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: "8px",
            overflow: "hidden",
            boxShadow: "0px 8px 24px rgba(0, 0, 0, 0.15)",
            "& .MuiDialogTitle-root": {
              padding: "16px 24px",
              borderBottom: "1px solid rgba(0, 0, 0, 0.08)",
            },
            "& .MuiDialogContent-root": {
              padding: "24px",
            },
            "& .MuiDialogActions-root": {
              padding: "16px 24px",
              borderTop: "1px solid rgba(0, 0, 0, 0.08)",
            },
            className: "fade-in-animation",
          },
        }}
        BackdropProps={{
          sx: {
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            backdropFilter: "blur(1px)",
          },
        }}
        sx={{
          "& .MuiBackdrop-root": {
            opacity: "0.5 !important",
          },
        }}
        transitionDuration={{
          enter: 200,
          exit: 150,
        }}
      >
        <DialogTitle>
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Typography variant="h6">
              {generatedListing
                ? "Edit Product Listing"
                : "Create Listing from Image"}
            </Typography>
            {!isAnalyzing && (
              <IconButton
                onClick={handleDialogClose}
                size="small"
                aria-label="Close dialog"
                sx={{
                  color: "rgba(0, 0, 0, 0.54)",
                  padding: "8px",
                  width: "36px",
                  height: "36px",
                  borderRadius: "50%",
                  transition:
                    "background-color 150ms cubic-bezier(0.4, 0, 0.2, 1)",
                  "&:hover": {
                    backgroundColor: "rgba(0, 0, 0, 0.04)",
                    color: "rgba(0, 0, 0, 0.87)",
                    boxShadow: "none !important",
                  },
                  "& .MuiSvgIcon-root": {
                    fontSize: "20px",
                    transition: "color 150ms cubic-bezier(0.4, 0, 0.2, 1)",
                  },
                  boxShadow: "none !important",
                  outline: "none",
                  border: "none",
                  "&::after": {
                    display: "none !important",
                  },
                  ".MuiTouchRipple-root": {
                    boxShadow: "none !important",
                  },
                }}
              >
                <CloseIcon />
              </IconButton>
            )}
          </Box>
        </DialogTitle>
        <DialogContent
          dividers
          sx={{
            padding: 0,
            minHeight: "400px",
            position: "relative",
          }}
        >
          {isAnalyzing ? (
            // Processing state - show the upload UI with loading state
            <ImageUploadUI
              onImageAnalyzed={handleImageAnalyzed}
              onError={handleAnalysisError}
              onCancel={handleCancel}
              session={session}
              initialImage={uploadedImage}
            />
          ) : generatedListing ? (
            // Generated listing state - show the editor
            <ListingEditor
              productData={generatedListing}
              session={session}
              onSubmit={handleListingSubmitted}
              onCancel={handleCancel}
              onError={handleAnalysisError}
            />
          ) : (
            // Initial state - show the upload UI
            <ImageUploadUI
              onImageAnalyzed={handleImageAnalyzed}
              onError={handleAnalysisError}
              onCancel={handleCancel}
              session={session}
              initialImage={uploadedImage}
            />
          )}
        </DialogContent>
      </Dialog>
    );
  };

  // Add effect to log generatedListing for debugging
  useEffect(() => {
    if (generatedListing && generatedListing.image) {
      console.log("Generated listing image URL:", generatedListing.image);
    }
  }, [generatedListing]);

  // Final return statement with restored original layout but keeping simplified handlers
  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      {/* Search Tips Panel - Only shows when user clicks the help button */}
      {showSearchTips && (
        <Paper
          elevation={3}
          sx={{
            mb: 2,
            borderRadius: 2,
            backgroundColor: theme.palette.background.paper,
            border: `1px solid ${theme.palette.divider}`,
            overflow: "hidden",
          }}
        >
          <Box sx={{ p: 2 }}>
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                mb: 2,
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center" }}>
                <HelpOutlineIcon
                  fontSize="small"
                  color="primary"
                  sx={{ mr: 1 }}
                />
                <Typography
                  variant="h6"
                  fontWeight="medium"
                  color="primary"
                  fontSize="1rem"
                >
                  Search Tips
                </Typography>
              </Box>
              <IconButton
                size="small"
                onClick={() => setShowSearchTips(false)}
                sx={{
                  color: theme.palette.text.secondary,
                  padding: "4px",
                  width: "24px",
                  height: "24px",
                }}
                aria-label="Close search tips"
              >
                <CloseIcon sx={{ fontSize: "16px" }} />
              </IconButton>
            </Box>

            {/* Simplified search tips - focus on helping the user */}
            <Typography variant="body2" sx={{ color: "text.secondary", mb: 2 }}>
              Try these patterns to find products in our marketplace:
            </Typography>

            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                gap: 1.5,
              }}
            >
              <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1 }}>
                <Typography
                  variant="body2"
                  sx={{
                    fontWeight: "bold",
                    color: "text.primary",
                    minWidth: "24px",
                    textAlign: "center",
                  }}
                >
                  1.
                </Typography>
                <Box sx={{ flex: 1 }}>
                  <Typography
                    variant="body2"
                    sx={{ fontWeight: "bold", color: "text.primary" }}
                  >
                    Browse by category
                  </Typography>
                  <Typography variant="body2" sx={{ color: "text.secondary" }}>
                    Click any category chip below to see all items in that
                    category
                  </Typography>
                </Box>
              </Box>

              <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1 }}>
                <Typography
                  variant="body2"
                  sx={{
                    fontWeight: "bold",
                    color: "text.primary",
                    minWidth: "24px",
                    textAlign: "center",
                  }}
                >
                  2.
                </Typography>
                <Box sx={{ flex: 1 }}>
                  <Typography
                    variant="body2"
                    sx={{ fontWeight: "bold", color: "text.primary" }}
                  >
                    Search with price filters
                  </Typography>
                  <Typography variant="body2" sx={{ color: "text.secondary" }}>
                    Example: "Show me furniture under $300"
                  </Typography>
                </Box>
              </Box>

              <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1 }}>
                <Typography
                  variant="body2"
                  sx={{
                    fontWeight: "bold",
                    color: "text.primary",
                    minWidth: "24px",
                    textAlign: "center",
                  }}
                >
                  3.
                </Typography>
                <Box sx={{ flex: 1 }}>
                  <Typography
                    variant="body2"
                    sx={{ fontWeight: "bold", color: "text.primary" }}
                  >
                    Use natural language
                  </Typography>
                  <Typography variant="body2" sx={{ color: "text.secondary" }}>
                    Example: "I'm looking for electronics in good condition"
                  </Typography>
                </Box>
              </Box>

              <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1 }}>
                <Typography
                  variant="body2"
                  sx={{
                    fontWeight: "bold",
                    color: "text.primary",
                    minWidth: "24px",
                    textAlign: "center",
                  }}
                >
                  4.
                </Typography>
                <Box sx={{ flex: 1 }}>
                  <Typography
                    variant="body2"
                    sx={{ fontWeight: "bold", color: "text.primary" }}
                  >
                    Create listings with AI
                  </Typography>
                  <Typography variant="body2" sx={{ color: "text.secondary" }}>
                    Click the camera icon to upload an image and automatically
                    generate a listing
                  </Typography>
                </Box>
              </Box>
            </Box>
          </Box>
        </Paper>
      )}

      <Paper
        elevation={3}
        sx={{
          borderRadius: 2,
          overflow: "hidden",
          height: "70vh",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Chat Header */}
        <Box
          sx={{
            p: 2,
            backgroundColor: theme.palette.primary.main,
            color: "white",
            display: "flex",
            alignItems: "center",
            position: "relative", // Add relative positioning to enable absolute positioning of elements
          }}
        >
          {/* Left side */}
          <Box sx={{ display: "flex", alignItems: "center" }}>
            <SmartToyIcon sx={{ mr: 1 }} />
          </Box>

          {/* Centered title */}
          <Typography
            variant="h6"
            sx={{
              position: "absolute",
              left: "50%",
              transform: "translateX(-50%)",
              textAlign: "center",
              width: "auto",
            }}
          >
            Marketplace Assistant
          </Typography>

          {/* Right side - status and help button */}
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              ml: "auto",
              gap: 1,
            }}
          >
            <Chip
              label="Online"
              size="small"
              color="success"
              sx={{ color: "white" }}
            />

            {session && session.user && (
              <Tooltip title="View your account">
                <IconButton
                  size="small"
                  component="a"
                  href="/account"
                  sx={{
                    bgcolor: "rgba(255,255,255,0.2)",
                    color: "white",
                    "&:hover": { bgcolor: "rgba(255,255,255,0.3)" },
                    width: 28,
                    height: 28,
                    padding: "4px",
                  }}
                >
                  <PersonIcon fontSize="small" sx={{ fontSize: "16px" }} />
                </IconButton>
              </Tooltip>
            )}

            {/* Search Tips Button - smaller size */}
            <Tooltip title="Show search tips">
              <IconButton
                size="small"
                sx={{
                  bgcolor: "rgba(255,255,255,0.2)",
                  color: "white",
                  "&:hover": { bgcolor: "rgba(255,255,255,0.3)" },
                  width: 28,
                  height: 28,
                  padding: "4px",
                }}
                onClick={() => setShowSearchTips(true)}
              >
                <HelpOutlineIcon fontSize="small" sx={{ fontSize: "16px" }} />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        <Divider />

        {/* Messages Container */}
        <Box
          ref={messagesContainerRef}
          sx={{
            flex: 1,
            overflow: "auto",
            p: 2,
            backgroundColor: theme.palette.grey[50],
          }}
        >
          {messages.map((message, index) => (
            <Box
              key={index}
              data-role={message.role}
              sx={{
                display: "flex",
                alignItems: "flex-start",
                justifyContent:
                  message.role === "user" ? "flex-end" : "flex-start",
                mb: 2,
              }}
            >
              {message.role !== "user" && (
                <Avatar sx={{ bgcolor: theme.palette.primary.main, mr: 1 }}>
                  <SmartToyIcon />
                </Avatar>
              )}

              <Card
                elevation={1}
                sx={{
                  maxWidth: "70%",
                  p: 2,
                  borderRadius: 2,
                  borderTopLeftRadius: message.role !== "user" ? 0 : 2,
                  borderTopRightRadius: message.role === "user" ? 0 : 2,
                  backgroundColor:
                    message.role === "user"
                      ? theme.palette.primary.main
                      : theme.palette.background.paper,
                  color: message.role === "user" ? "white" : "inherit",
                }}
              >
                {message.role === "assistant" && message.products ? (
                  <>
                    {renderMessageContent(message)}

                    {/* Add a divider if there's both text content and products */}
                    {message.content && message.content.trim() !== "" && (
                      <Divider sx={{ my: 2 }} />
                    )}
                    <ProductsDisplay
                      products={message.products}
                      onContactSeller={handleContactSeller}
                    />
                  </>
                ) : (
                  renderMessageContent(message)
                )}
              </Card>

              {message.role === "user" && (
                <Avatar sx={{ bgcolor: theme.palette.secondary.main, ml: 1 }}>
                  <PersonIcon />
                </Avatar>
              )}
            </Box>
          ))}

          {isLoading && (
            <Box
              sx={{
                display: "flex",
                justifyContent: "flex-start",
                mb: 2,
              }}
            >
              <Avatar sx={{ bgcolor: theme.palette.primary.main, mr: 1 }}>
                <SmartToyIcon />
              </Avatar>
              <Card
                elevation={1}
                sx={{
                  p: 2,
                  borderRadius: 2,
                  borderTopLeftRadius: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <CircularProgress size={20} sx={{ mr: 1 }} />
                <Typography variant="body2" color="textSecondary">
                  Assistant is typing...
                </Typography>
              </Card>
            </Box>
          )}
          <div ref={messagesEndRef} />
        </Box>

        <Divider />

        {/* Input Area with category chips above search box */}
        <Box
          component="form"
          onSubmit={handleSubmit}
          sx={{
            p: 2,
            backgroundColor: theme.palette.background.paper,
            display: "flex",
            flexDirection: "column",
          }}
          onClick={(e) => {
            // Simple event containment
            e.stopPropagation();
          }}
        >
          {/* Category chips */}
          <Box
            sx={{
              display: "flex",
              flexWrap: "wrap",
              gap: 1,
              mb: 2,
              justifyContent: "center",
            }}
          >
            <Chip
              label="Electronics"
              size="small"
              variant="outlined"
              color="primary"
              onClick={(e) => {
                // Prevent default behavior
                e.preventDefault();
                e.stopPropagation();

                // Store current scroll position
                const scrollPos = window.scrollY;

                // Just set the input value, don't submit
                const category = "electronics";
                const message = `Show me ${category}`;
                setInput(message);

                // Update DOM input directly
                if (inputRef.current) {
                  inputRef.current.value = message;
                  // Focus without scrolling
                  inputRef.current.focus({ preventScroll: true });
                }

                // Restore scroll position
                window.scrollTo(0, scrollPos);
              }}
              sx={{
                borderRadius: 2,
                "&:hover": {
                  bgcolor: theme.palette.primary.light,
                  color: "#ffb71b",
                  borderColor: "#ffb71b",
                },
              }}
            />
            <Chip
              label="Furniture"
              size="small"
              variant="outlined"
              color="primary"
              onClick={(e) => {
                // Prevent default behavior
                e.preventDefault();
                e.stopPropagation();

                // Store current scroll position
                const scrollPos = window.scrollY;

                // Just set the input value, don't submit
                const category = "furniture";
                const message = `Show me ${category}`;
                setInput(message);

                // Update DOM input directly
                if (inputRef.current) {
                  inputRef.current.value = message;
                  // Focus without scrolling
                  inputRef.current.focus({ preventScroll: true });
                }

                // Restore scroll position
                window.scrollTo(0, scrollPos);
              }}
              sx={{
                borderRadius: 2,
                "&:hover": {
                  bgcolor: theme.palette.primary.light,
                  color: "#ffb71b",
                  borderColor: "#ffb71b",
                },
              }}
            />
            <Chip
              label="Textbooks"
              size="small"
              variant="outlined"
              color="primary"
              onClick={(e) => {
                // Prevent default behavior
                e.preventDefault();
                e.stopPropagation();

                // Store current scroll position
                const scrollPos = window.scrollY;

                // Just set the input value, don't submit
                const category = "textbooks";
                const message = `Show me ${category}`;
                setInput(message);

                // Update DOM input directly
                if (inputRef.current) {
                  inputRef.current.value = message;
                  // Focus without scrolling
                  inputRef.current.focus({ preventScroll: true });
                }

                // Restore scroll position
                window.scrollTo(0, scrollPos);
              }}
              sx={{
                borderRadius: 2,
                "&:hover": {
                  bgcolor: theme.palette.primary.light,
                  color: "#ffb71b",
                  borderColor: "#ffb71b",
                },
              }}
            />
            <Chip
              label="Clothing"
              size="small"
              variant="outlined"
              color="primary"
              onClick={(e) => {
                // Prevent default behavior
                e.preventDefault();
                e.stopPropagation();

                // Store current scroll position
                const scrollPos = window.scrollY;

                // Just set the input value, don't submit
                const category = "clothing";
                const message = `Show me ${category}`;
                setInput(message);

                // Update DOM input directly
                if (inputRef.current) {
                  inputRef.current.value = message;
                  // Focus without scrolling
                  inputRef.current.focus({ preventScroll: true });
                }

                // Restore scroll position
                window.scrollTo(0, scrollPos);
              }}
              sx={{
                borderRadius: 2,
                "&:hover": {
                  bgcolor: theme.palette.primary.light,
                  color: "#ffb71b",
                  borderColor: "#ffb71b",
                },
              }}
            />
            <Chip
              label="Miscellaneous"
              size="small"
              variant="outlined"
              color="primary"
              onClick={(e) => {
                // Prevent default behavior
                e.preventDefault();
                e.stopPropagation();

                // Store current scroll position
                const scrollPos = window.scrollY;

                // Just set the input value, don't submit
                const category = "miscellaneous";
                const message = `Show me ${category}`;
                setInput(message);

                // Update DOM input directly
                if (inputRef.current) {
                  inputRef.current.value = message;
                  // Focus without scrolling
                  inputRef.current.focus({ preventScroll: true });
                }

                // Restore scroll position
                window.scrollTo(0, scrollPos);
              }}
              sx={{
                borderRadius: 2,
                "&:hover": {
                  bgcolor: theme.palette.primary.light,
                  color: "#ffb71b",
                  borderColor: "#ffb71b",
                },
              }}
            />
          </Box>

          {/* Input and buttons container */}
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              width: "100%",
              gap: 1,
              position: "relative", // Add this to ensure proper overlay positioning
            }}
          >
            {/* Text input field */}
            <Box sx={{ flexGrow: 1 }}>
              <TextField
                fullWidth
                placeholder="Search for products or ask for help..."
                variant="outlined"
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                }}
                disabled={isLoading}
                inputRef={inputRef}
                sx={{
                  "& .MuiOutlinedInput-root": {
                    height: 48,
                    borderRadius: 4,
                  },
                }}
                InputProps={{
                  sx: { borderRadius: 4 },
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    if (input.trim()) {
                      const scrollPos = window.scrollY;
                      handleSubmit(e);
                      setTimeout(() => window.scrollTo(0, scrollPos), 0);
                    }
                  }
                }}
              />
            </Box>


            {/* Image upload button */}
            <Tooltip title="Upload product image to create a listing with AI">

            {/* Action buttons container */}
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1,
                flexShrink: 0,
              }}
            >
              {/* Image upload button */}
              <Tooltip title="Upload product image to create a listing with AI">
                <IconButton
                  color="primary"
                  component="label"
                  disabled={isLoading}
                  sx={{
                    backgroundColor: theme.palette.grey[200],
                    "&:hover": {
                      backgroundColor: theme.palette.grey[300],
                    },
                    width: 48,
                    height: 48,
                    padding: 0,
                    flexShrink: 0,
                    marginTop: "20px",
                    mb: 2,
                  }}
                  aria-label="Upload image for listing"
                >
                  <input
                    type="file"
                    hidden
                    accept="image/*"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        handleImageUpload(e.target.files[0]);
                      }
                    }}
                  />
                  <AddPhotoAlternateIcon />
                </IconButton>
              </Tooltip>

              {/* Send button */}

              <IconButton
                color="primary"
                component="label"
                disabled={isLoading || isProcessing}
                sx={{
                  backgroundColor: theme.palette.grey[200],
                  "&:hover": {
                    backgroundColor: theme.palette.grey[300],
                  },
                  width: 48,
                  height: 48,
                  padding: 0,
                  flexShrink: 0,

                  marginTop: "20px",

                }}
                aria-label="Upload image for listing"
              >
                <input
                  type="file"
                  hidden
                  accept="image/*"
                  ref={fileInputRef}
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      // Call handleImageUpload with the file
                      handleImageUpload(e.target.files[0]);
                      // Reset input value immediately to ensure onChange fires even with same file
                      e.target.value = "";
                    }
                  }}
                />
                <AddPhotoAlternateIcon />
              </IconButton>
            </Tooltip>

            {/* Send button */}
            <IconButton
              color="primary"
              type="submit"
              disabled={isLoading || !input.trim() || isProcessing}
              sx={{
                backgroundColor: theme.palette.primary.main,
                color: "white",
                "&:hover": {
                  backgroundColor: theme.palette.primary.dark,
                },
                "&.Mui-disabled": {
                  backgroundColor: theme.palette.action.disabledBackground,
                  color: theme.palette.action.disabled,
                },
                width: 48,
                height: 48,
                padding: 0,
                flexShrink: 0,
              }}
            >
              {isLoading ? (
                <CircularProgress size={24} color="inherit" />
              ) : (
                <SendIcon />
              )}
            </IconButton>
          </Box>
        </Box>
      </Paper>

      {/* Add the processing overlay */}
      <LoadingOverlay
        isVisible={isProcessing}
        stage={processingStage}
        progress={processingProgress}
        imagePreview={imagePreview}
        error={processingError}
        onRetry={handleRetryUpload}
        onCancel={handleCancelUpload}
      />

      <ListingDialog />
    </Container>
  );
}
