// Add these imports at the top
import React from "react";
import { useState, useRef, useEffect } from "react";
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

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const pagePositionRef = useRef(0);
  const scrollLockTimeoutRef = useRef(null);
  const scrollBlockerRef = useRef(null);

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

  // Function to handle image upload and analysis
  const handleImageUpload = (file) => {
    if (!file) return;

    // Check if user is logged in
    if (!session || !session.user) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "To create a listing, you need to be logged in. Please sign in or create an account to continue.",
        },
      ]);
      return;
    }

    // Store the file for later use
    setUploadedImage(file);

    // Create a stable data URL from the file that will persist
    let stableImageUrl = null;
    try {
      // Create a FileReader to get a data URL that won't be revoked
      const reader = new FileReader();
      reader.onload = (e) => {
        // This data URL will be stable and won't be revoked when scope ends
        stableImageUrl = e.target.result;
        console.log("Created stable data URL for image");

        // Continue with analysis after getting stable URL
        continueWithAnalysis(file, stableImageUrl);
      };
      reader.onerror = () => {
        console.error("Error creating stable image URL");
        continueWithAnalysis(file, null);
      };

      // Start reading the file as data URL
      reader.readAsDataURL(file);
    } catch (e) {
      console.error("Error in stable URL creation:", e);
      // Continue anyway with the file
      continueWithAnalysis(file, null);
    }
  };

  // Helper function to continue image analysis after URL creation attempt
  const continueWithAnalysis = (file, stableImageUrl) => {
    // Set a timeout to prevent infinite loading
    const analysisTimeout = setTimeout(() => {
      setIsAnalyzing(false);
      setImageUploadOpen(false);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "The image analysis took too long. Please try again with a smaller image or check your internet connection.",
        },
      ]);
    }, 30000); // 30 second timeout

    // Immediately open the dialog with loading state
    setIsAnalyzing(true);
    setImageUploadOpen(true);

    // Optimize the image before uploading
    const optimizeAndAnalyzeImage = () => {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          // Create an image object to get dimensions
          const img = new Image();
          img.onload = async () => {
            try {
              // Create a canvas for image optimization
              const canvas = document.createElement("canvas");

              // Determine optimal dimensions (max 1200px width/height while preserving aspect ratio)
              let width = img.width;
              let height = img.height;
              const maxDimension = 1200;

              if (width > maxDimension || height > maxDimension) {
                if (width > height) {
                  height = Math.round((height * maxDimension) / width);
                  width = maxDimension;
                } else {
                  width = Math.round((width * maxDimension) / height);
                  height = maxDimension;
                }
              }

              // Set canvas dimensions
              canvas.width = width;
              canvas.height = height;

              // Draw and optimize image
              const ctx = canvas.getContext("2d");
              ctx.fillStyle = "#FFFFFF";
              ctx.fillRect(0, 0, width, height);
              ctx.drawImage(img, 0, 0, width, height);

              // Get optimized image data
              const optimizedImageData = canvas.toDataURL("image/jpeg", 0.85);
              const base64Image = optimizedImageData.split(",")[1];

              console.log("Image optimized, size:", base64Image.length);

              // Call the Vision API
              const response = await fetch(
                API_CONFIG.getUrl(API_CONFIG.ENDPOINTS.ANALYZE_IMAGE),
                {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    Accept: "application/json",
                    Authorization: session?.access_token
                      ? `Bearer ${session.access_token}`
                      : undefined,
                  },
                  body: JSON.stringify({
                    image: base64Image,
                  }),
                }
              );

              if (!response.ok) {
                const errorData = await response
                  .json()
                  .catch(() => ({ message: "Unknown error occurred" }));
                throw new Error(
                  errorData.message || `API Error: ${response.status}`
                );
              }

              const data = await response.json();

              // Modified validation to handle different API response formats
              // Check if the response is an OpenAI response (containing role and content)
              // or a wrapper containing a message property or a direct JSON object
              let messageToProcess;

              if (data && data.role && data.content) {
                // The API returned an OpenAI response object directly
                console.log("Direct OpenAI response format received");
                messageToProcess = data;
              } else if (
                data &&
                data.message &&
                typeof data.message === "object"
              ) {
                // The API returned a wrapped message object
                console.log("Wrapped message format received");
                messageToProcess = data.message;
              } else if (data && typeof data === "object") {
                // Direct JSON object returned (likely product data)
                console.log("Direct JSON product data received:", data);

                // Debug the uploaded image
                console.log("Uploaded image file:", uploadedImage);
                console.log(
                  "File type:",
                  uploadedImage ? uploadedImage.type : "unknown"
                );
                console.log(
                  "File size:",
                  uploadedImage ? uploadedImage.size : "unknown"
                );

                // Use the stable URL created earlier or fallback to optimized data
                let imageUrl = stableImageUrl || optimizedImageData;
                console.log(
                  "Using image URL for listing:",
                  imageUrl ? "Valid URL exists" : "No valid URL"
                );

                // Convert to a message format
                messageToProcess = {
                  role: "assistant",
                  content: `I've analyzed your image and created a product listing:\n\n**${
                    data.name || "Product"
                  }**\n\n${data.description || ""}\n\nPrice: $${
                    data.price || "0"
                  }\nCondition: ${
                    data.condition || "Not specified"
                  }\nCategory: ${data.category || "miscellaneous"}`,
                };

                // Store for dialog form with preprocessed image information
                setGeneratedListing({
                  ...data,
                  imageFile: uploadedImage,
                  // Use the stable image URL we created
                  image: imageUrl,
                });

                // Update dialog state while keeping it open
                setIsAnalyzing(false);
                clearTimeout(analysisTimeout); // Clear the timeout since we're handling the result

                // Add chat message
                setMessages((prev) => [
                  ...prev,
                  {
                    role: "assistant",
                    content: `I've analyzed your image and created a product listing for **${
                      data.name || "your item"
                    }**. You can now review and edit the details before creating the listing.`,
                  },
                ]);

                // Return early since we're showing the listing form
                return;
              } else {
                // Invalid response format
                console.error("Invalid API response format:", data);
                throw new Error("Received invalid response from API");
              }

              // Process the response for products
              const { message: processedMessage, products } =
                processMessageForProducts(messageToProcess);

              // Check if products were found in the response
              const hasProducts = products && products.length > 0;

              // For search queries with no products, suggest using category buttons
              if (
                messageToProcess.toLowerCase().includes("show me") &&
                !hasProducts
              ) {
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
              console.error("Error in image processing:", error);
              setIsAnalyzing(false);
              setImageUploadOpen(false);
              setMessages((prev) => [
                ...prev,
                {
                  role: "assistant",
                  content: `Error analyzing image: ${error.message}. Please try again.`,
                },
              ]);
            }
          };

          // Ensure result is a string (it should be when using readAsDataURL)
          if (typeof reader.result === "string") {
            img.src = reader.result;
          } else {
            throw new Error("Failed to read image as data URL");
          }
        } catch (error) {
          console.error("Error in image analysis:", error);
          setIsAnalyzing(false);
          setImageUploadOpen(false);
          setMessages((prev) => [
            ...prev,
            {
              role: "assistant",
              content: `Error processing image: ${error.message}. Please try again.`,
            },
          ]);
        }
      };

      reader.onerror = () => {
        console.error("FileReader error");
        setIsAnalyzing(false);
        setImageUploadOpen(false);
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content:
              "Error reading the image file. Please try a different image.",
          },
        ]);
      };

      reader.readAsDataURL(file);
    };

    // Start the optimization and analysis process
    optimizeAndAnalyzeImage();
  };

  // Function to handle listing submission
  const handleListingSubmit = async () => {
    if (!generatedListing || !session?.user?.id) return;

    try {
      setIsLoading(true);
      console.log("Starting listing creation for user:", session.user.id);

      // Store user ID in localStorage for consistent access
      localStorage.setItem("userId", session.user.id);

      // First upload the image to Supabase storage
      let imageUrl = "";
      if (generatedListing.image) {
        try {
          // Ensure the file has a proper extension
          let fileToUpload;
          let originalName = "image.jpg";

          // Handle different image sources
          if (
            generatedListing.imageFile &&
            (generatedListing.imageFile instanceof File ||
              generatedListing.imageFile instanceof Blob)
          ) {
            // We have a valid File/Blob object
            fileToUpload = generatedListing.imageFile;
            originalName = generatedListing.imageFile.name || "image.jpg";
            console.log("Using existing File/Blob object for upload");
          } else if (typeof generatedListing.image === "string") {
            // We have a string URL (either data URL or object URL)
            try {
              console.log("Converting image URL to blob for upload");
              const response = await fetch(generatedListing.image);
              if (!response.ok) throw new Error("Failed to fetch image data");

              fileToUpload = await response.blob();

              // Try to get a file extension from the content type
              const contentType = response.headers.get("content-type");
              if (contentType) {
                const ext = contentType.split("/").pop();
                if (ext) originalName = `image.${ext}`;
              }
            } catch (fetchError) {
              console.error("Error fetching image from URL:", fetchError);
              throw new Error(
                "Could not process the image URL. Please try again with a different image."
              );
            }
          } else {
            throw new Error("No valid image source found");
          }

          if (!fileToUpload || fileToUpload.size === 0) {
            throw new Error("Invalid or empty image file");
          }

          const fileExtension =
            originalName.split(".").pop().toLowerCase() || "jpg";

          // Create a clean filename with timestamp to prevent collisions
          const timestamp = Date.now();
          const cleanFileName = `uploads/${timestamp}-product.${fileExtension}`;

          console.log(
            "Preparing to upload image:",
            cleanFileName,
            "Size:",
            fileToUpload.size
          );

          // Upload to Supabase storage with the correct path
          const { data: uploadData, error: uploadError } =
            await supabase.storage
              .from("product-images")
              .upload(cleanFileName, fileToUpload, {
                cacheControl: "3600",
                contentType: fileToUpload.type || "image/jpeg",
                upsert: true,
              });

          if (uploadError) {
            console.error("Storage upload error:", uploadError);
            throw new Error(`Error uploading image: ${uploadError.message}`);
          }

          console.log("Image uploaded successfully, getting public URL");

          // Get the public URL
          const { data: urlData } = supabase.storage
            .from("product-images")
            .getPublicUrl(cleanFileName);

          if (!urlData || !urlData.publicUrl) {
            throw new Error("Failed to get public URL for uploaded image");
          }

          imageUrl = urlData.publicUrl;
          console.log("Final image URL:", imageUrl);
        } catch (error) {
          console.error("Error in image upload process:", error);
          // Don't rethrow - continue without image rather than failing completely
          console.warn("Continuing without image due to upload error");
        }
      }

      // Product data with user ID explicitly set
      const productData = {
        name: generatedListing.name,
        price: parseFloat(generatedListing.price),
        description: generatedListing.description,
        image: imageUrl, // This will be empty string if image upload failed
        condition: generatedListing.condition,
        category: generatedListing.category,
        status: "available",
        is_bundle: false,
        flag: false,
        userID: session.user.id,
        hide: false,
        moderation_status: "pending",
        is_deleted: false,
        created_at: new Date().toISOString(),
        modified_at: new Date().toISOString(),
      };

      console.log("Creating product with data:", productData);
      console.log("Image URL being saved to database:", imageUrl);

      // Create the product in the database
      const { data: insertedData, error: productError } = await supabase
        .from("products")
        .insert([productData])
        .select();

      if (productError) {
        console.error("Database error creating product:", productError);
        throw new Error(`Error creating product: ${productError.message}`);
      }

      // Verify the saved product data
      if (!insertedData || insertedData.length === 0) {
        throw new Error("Product was not created properly");
      }

      const savedProduct = insertedData[0];
      console.log("Product created successfully:", savedProduct);

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
    } catch (error) {
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

    // Use a simple track in memory approach
    const sentMessagesKey = "sentMessagesTracker";
    if (!window[sentMessagesKey]) {
      window[sentMessagesKey] = new Set();
    }

    // Create a unique conversation key
    const conversationKey = `${userId}_${sellerId}_${
      product.productID || product.id
    }`;

    // Check if we've already sent a message in this session
    if (window[sentMessagesKey].has(conversationKey)) {
      console.log("Already initiated this conversation in current session");
      // Just navigate without sending another message
      window.location.href = `/messaging/${sellerId}?productId=${
        product.productID || product.id
      }`;
      return;
    }

    try {
      // Track that we've initiated this conversation
      window[sentMessagesKey].add(conversationKey);

      // Create initial message
      let messageContent = `Hi, I'm interested in your ${product.name}. Is this still available?`;

      if (product.image) {
        messageContent += `\n\n<div style="margin-top:10px; margin-bottom:10px; max-width:250px;">
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
          content: messageContent,
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

    // 3. Create the category search message with consistent casing
    let normalizedCategory = category.toLowerCase();

    // Map common category names to ensure consistency
    const categoryMapping = {
      electronics: "electronics",
      furniture: "furniture",
      textbooks: "textbooks",
      books: "textbooks",
      clothing: "clothing",
      miscellaneous: "misc",
      misc: "misc",
    };

    // Use the mapped category if available, otherwise use the original
    normalizedCategory =
      categoryMapping[normalizedCategory] || normalizedCategory;

    // Create the message using the original category name from the chip for display
    const message = `Show me ${category}`;
    console.log(
      `Searching for category: ${category} (normalized: ${normalizedCategory})`
    );

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

    // Store the input to use for consistent messaging
    const displayInput = currentInput;

    // Check if this is a category search and normalize if needed
    let searchInput = currentInput;
    const showMeMatch = currentInput.match(/show me\s+(\w+)/i);
    if (showMeMatch && showMeMatch[1]) {
      const categoryToSearch = showMeMatch[1].toLowerCase();
      // Map common category names to ensure consistency
      const categoryMapping = {
        electronics: "electronics",
        furniture: "furniture",
        textbooks: "textbooks",
        books: "textbooks",
        clothing: "clothing",
        miscellaneous: "misc",
        misc: "misc",
      };

      // Use the mapped category if available
      const normalizedCategory =
        categoryMapping[categoryToSearch] || categoryToSearch;
      if (normalizedCategory !== categoryToSearch) {
        console.log(
          `Normalized category search: ${categoryToSearch} -> ${normalizedCategory}`
        );
        // Replace the category in the search input but keep the display input the same
        searchInput = currentInput.replace(
          new RegExp(categoryToSearch, "i"),
          normalizedCategory
        );
      }
    }

    // Add user message to chat without scroll manipulation
    const userMessage = { role: "user", content: displayInput };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      // Send message to API with potentially normalized search terms
      console.log("Sending API request with message:", searchInput);
      console.log("API URL:", API_URL);

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
          messages: [...messages, { role: "user", content: searchInput }],
          userId: session?.user?.id || "anonymous",
        }),
      });

      if (!response.ok) {
        console.error(
          "API response not OK:",
          response.status,
          response.statusText
        );
        throw new Error("API request failed");
      }

      const data = await response.json();
      console.log("API response data:", data);

      // Handle different response formats
      let messageToProcess;
      if (data && data.role && data.content) {
        // Direct OpenAI format (most likely case)
        console.log("Received direct OpenAI response format");
        messageToProcess = data;
      } else if (data && data.message && typeof data.message === "object") {
        // Wrapped message format
        console.log("Received wrapped message format");
        messageToProcess = data.message;
      } else {
        console.error("Invalid API response:", data);
        throw new Error("Received invalid response from API");
      }

      // Process the response for products
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

    console.log("Processing message for products:", message);

    // Check if the message contains the verified products marker
    if (
      message.content.includes("VERIFIED_PRODUCTS_START") &&
      message.content.includes("VERIFIED_PRODUCTS_END")
    ) {
      console.log("Found VERIFIED_PRODUCTS markers in response");
      // Extract the verified products JSON
      // Found verified products marker in message
      const productsJson = message.content
        .split("VERIFIED_PRODUCTS_START")[1]
        .split("VERIFIED_PRODUCTS_END")[0];

      try {
        const products = JSON.parse(productsJson);
        console.log(
          `Successfully parsed ${products.length} products from VERIFIED_PRODUCTS`
        );

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
  const ListingDialog = () => (
    <Dialog
      open={imageUploadOpen}
      onClose={() => !isAnalyzing && setImageUploadOpen(false)}
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
          backgroundColor: "rgba(0, 0, 0, 0.5)", // Darkens and narrows the backdrop shadow
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
          <Typography variant="h6">Create Listing from Image</Typography>
          {!isAnalyzing && (
            <IconButton
              onClick={() => setImageUploadOpen(false)}
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
                boxShadow: "none !important", // Force override any shadow
                outline: "none",
                border: "none",
                "&::after": {
                  display: "none !important", // Prevent any pseudo-elements from appearing
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
          <Box
            className="loading-container"
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              py: 4,
              px: 2,
              height: "100%",
              width: "100%",
              position: "absolute",
              top: 0,
              left: 0,
              zIndex: 10,
              backgroundColor: "#fff",
            }}
          >
            <Typography variant="h6" sx={{ mb: 1, textAlign: "center" }}>
              Analyzing your image with AI...
            </Typography>
            <Typography
              variant="body1"
              color="text.secondary"
              sx={{ mb: 2, textAlign: "center" }}
            >
              We're identifying the item and generating product details
            </Typography>

            {/* Progress bar with animation */}
            <Box
              sx={{
                width: "100%",
                maxWidth: "400px",
                mb: 2,
              }}
            >
              <Box
                sx={{
                  width: "100%",
                  height: "4px",
                  backgroundColor: "#e0e0e0",
                  borderRadius: "2px",
                  position: "relative",
                  overflow: "hidden",
                }}
              >
                <Box
                  className="progress-bar-animation"
                  sx={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    bottom: 0,
                    width: "30%",
                    backgroundColor: theme.palette.primary.main,
                  }}
                />
              </Box>
            </Box>

            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ textAlign: "center" }}
            >
              This usually takes 5-10 seconds
            </Typography>

            {/* Show image preview if available */}
            {uploadedImage && (
              <Box
                className="pulse-animation"
                sx={{
                  mt: 3,
                  p: 2,
                  border: "1px solid #e0e0e0",
                  borderRadius: "8px",
                  width: "100%",
                  maxWidth: "300px",
                }}
              >
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ display: "block", mb: 1, textAlign: "center" }}
                >
                  Processing your image:
                </Typography>
                <img
                  src={URL.createObjectURL(uploadedImage)}
                  alt="Uploaded"
                  style={{
                    width: "100%",
                    height: "auto",
                    borderRadius: "4px",
                    objectFit: "contain",
                    maxHeight: "200px",
                  }}
                />
              </Box>
            )}
          </Box>
        ) : (
          generatedListing && (
            <Grid container spacing={3}>
              <Grid item xs={12} md={5}>
                <Box
                  sx={{
                    width: "100%",
                    mb: { xs: 2, md: 0 },
                  }}
                  className="fade-in-animation"
                >
                  <img
                    src={generatedListing.image}
                    alt="Product preview"
                    style={{
                      width: "100%",
                      maxHeight: "300px",
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
                </Box>
              </Grid>
              <Grid item xs={12} md={7}>
                <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  <TextField
                    label="Product Name"
                    fullWidth
                    value={generatedListing.name}
                    onChange={(e) =>
                      setGeneratedListing((prev) => ({
                        ...prev,
                        name: e.target.value,
                      }))
                    }
                    required
                    sx={{
                      animation: "slideIn 0.4s ease-out",
                      "@keyframes slideIn": {
                        "0%": {
                          opacity: 0,
                          transform: "translateX(20px)",
                        },
                        "100%": {
                          opacity: 1,
                          transform: "translateX(0)",
                        },
                      },
                    }}
                    className="slide-in-animation"
                  />
                  <TextField
                    label="Description"
                    fullWidth
                    multiline
                    rows={4}
                    value={generatedListing.description}
                    onChange={(e) =>
                      setGeneratedListing((prev) => ({
                        ...prev,
                        description: e.target.value,
                      }))
                    }
                    required
                    sx={{
                      animation: "slideIn 0.5s ease-out",
                    }}
                    className="slide-in-animation"
                  />
                  <TextField
                    label="Price"
                    fullWidth
                    type="number"
                    value={generatedListing.price}
                    onChange={(e) =>
                      setGeneratedListing((prev) => ({
                        ...prev,
                        price: e.target.value,
                      }))
                    }
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">$</InputAdornment>
                      ),
                    }}
                    required
                    sx={{
                      animation: "slideIn 0.6s ease-out",
                    }}
                    className="slide-in-animation"
                  />
                  <TextField
                    select
                    label="Condition"
                    fullWidth
                    value={generatedListing.condition}
                    onChange={(e) =>
                      setGeneratedListing((prev) => ({
                        ...prev,
                        condition: e.target.value,
                      }))
                    }
                    required
                    sx={{
                      animation: "slideIn 0.7s ease-out",
                    }}
                    className="slide-in-animation"
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
                    value={generatedListing.category}
                    onChange={(e) =>
                      setGeneratedListing((prev) => ({
                        ...prev,
                        category: e.target.value,
                      }))
                    }
                    required
                    sx={{
                      animation: "slideIn 0.8s ease-out",
                    }}
                    className="slide-in-animation"
                  >
                    <MenuItem value="electronics">Electronics</MenuItem>
                    <MenuItem value="furniture">Furniture</MenuItem>
                    <MenuItem value="textbooks">Textbooks</MenuItem>
                    <MenuItem value="clothing">Clothing</MenuItem>
                    <MenuItem value="miscellaneous">Miscellaneous</MenuItem>
                  </TextField>
                </Box>
              </Grid>
            </Grid>
          )
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        {!isAnalyzing && (
          <>
            <Button
              onClick={() => setImageUploadOpen(false)}
              color="inherit"
              sx={{
                transition: "all 0.2s ease",
                "&:hover": {
                  backgroundColor: "rgba(0, 0, 0, 0.04)",
                },
              }}
              className="fade-in-animation"
            >
              Cancel
            </Button>
            <Button
              onClick={handleListingSubmit}
              variant="contained"
              color="primary"
              disabled={isLoading}
              startIcon={
                isLoading && <CircularProgress size={20} color="inherit" />
              }
              sx={{
                boxShadow: "0 4px 8px rgba(0, 0, 0, 0.1)",
                transition: "all 0.3s ease",
                "&:hover": {
                  boxShadow: "0 6px 12px rgba(0, 0, 0, 0.15)",
                  transform: "translateY(-2px)",
                },
                "&:active": {
                  boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
                  transform: "translateY(1px)",
                },
              }}
              className="fade-in-animation"
            >
              {isLoading ? "Creating..." : "Create Listing"}
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );

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
              onClick={(e) => handleCategoryClick("electronics", e)}
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
              onClick={(e) => handleCategoryClick("furniture", e)}
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
              onClick={(e) => handleCategoryClick("textbooks", e)}
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
              onClick={(e) => handleCategoryClick("clothing", e)}
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
              onClick={(e) => handleCategoryClick("miscellaneous", e)}
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
                type="submit"
                disabled={isLoading || !input.trim()}
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
                  mb: 2,
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
        </Box>
      </Paper>

      <ListingDialog />
    </Container>
  );
}
