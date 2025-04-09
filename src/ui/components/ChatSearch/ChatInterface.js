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
} from "@mui/material";
import SendIcon from "@mui/icons-material/Send";
import SmartToyIcon from "@mui/icons-material/SmartToy";
import PersonIcon from "@mui/icons-material/Person";
import CloseIcon from "@mui/icons-material/Close";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
// Import our new components
import ProductsDisplay from "./components/ProductsDisplay";
import { extractProductsFromMessage } from "./utils/productParser";
// Import markdown renderer
import Markdown from "markdown-to-jsx";
import ProductCard from "./components/ProductCard";
import API_CONFIG from "../../../config/api.js";
import { markMessageSent } from "../messageArea/messageHelper";

const API_URL = API_CONFIG.getUrl(API_CONFIG.ENDPOINTS.CHAT);

export default function ChatInterface() {
  const theme = useTheme();
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content:
        "Hi! I'm your marketplace assistant. The easiest way to find products is to use the category buttons below. Try clicking 'Electronics', 'Furniture', 'Textbooks', 'Clothing', or 'Miscellaneous' to browse items. You can also type specific searches like 'Find furniture under $300'.",
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [session, setSession] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showSearchTips, setShowSearchTips] = useState(false);
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
    if (!window.__sentMessages) window.__sentMessages = new Set();

    // Create a unique conversation key
    const conversationKey = `${userId}_${sellerId}_${
      product.productID || product.id
    }`;

    // Check if we've already sent a message in this session
    if (window.__sentMessages.has(conversationKey)) {
      console.log("Already initiated this conversation in current session");
      // Just navigate without sending another message
      window.location.href = `/messaging/${sellerId}?productId=${
        product.productID || product.id
      }`;
      return;
    }

    try {
      // Track that we've initiated this conversation
      window.__sentMessages.add(conversationKey);

      // Create initial message
      const initialMessage = `Hi, I'm interested in your ${product.name}. Is this still available?`;

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

      // Process the response for products
      const { message: processedMessage, products } = processMessageForProducts(
        data.message
      );

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
                  color: "white",
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
                  color: "white",
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
                  color: "white",
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
                  color: "white",
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
                  color: "white",
                },
              }}
            />
          </Box>

          {/* Full-width search box with send button */}
          <Box sx={{ display: "flex", alignItems: "center" }}>
            <TextField
              fullWidth
              placeholder="Search for products or ask for help..."
              variant="outlined"
              value={input}
              onChange={(e) => {
                // Simple direct update without scroll manipulation
                setInput(e.target.value);
              }}
              disabled={isLoading}
              inputRef={inputRef}
              sx={{ mr: 1 }}
              InputProps={{
                sx: { borderRadius: 4 },
              }}
              onFocus={(e) => {
                // No need for complex focus handling
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  // Prevent default Enter key behavior
                  e.preventDefault();

                  if (input.trim()) {
                    // Store current scroll position
                    const scrollPos = window.scrollY;

                    // Handle submission
                    handleSubmit(e);

                    // Restore scroll position after a short delay
                    setTimeout(() => window.scrollTo(0, scrollPos), 0);
                  }
                }
              }}
            />
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
    </Container>
  );
}
