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

const API_URL =
  process.env.NODE_ENV === "development"
    ? "http://localhost:3001/api/chat"
    : "/api/chat"; // Production URL

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

  // Add this useEffect to get the session with basic error handling
  useEffect(() => {
    // Check for active session
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (data?.session) {
        setSession(data.session);
      } else {
        // No active session found
      }
    };
    checkSession();
  }, []);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus input field on load
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // New function to handle a user wanting to contact a seller about a product
  const handleContactSeller = (product) => {
    if (!product) return;

    setSelectedProduct(product);

    // Add the messaging confirmation to the chat
    setMessages((prev) => [
      ...prev,
      {
        role: "assistant",
        content: `Would you like to send a message to the seller about the ${product.name}? If so, what would you like to say?`,
      },
    ]);

    // Scroll to bottom after adding the message
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  // Function to handle category chip clicks
  const handleCategoryClick = (category) => {
    // Add a message with the selected category
    const message = `Show me ${category}`;
    setInput(message);

    // Trigger send after a short delay to allow state update
    setTimeout(() => {
      handleSubmit({ preventDefault: () => {} });
    }, 100);
  };

  const handleSubmit = async (e) => {
    // Prevent the default form submission
    e.preventDefault();
    if (!input.trim()) return;

    // Add user message to chat
    const userMessage = { role: "user", content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    // Scroll to bottom after adding the message
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);

    try {
      // Send message to API
      const response = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
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

      // Check if this was a search query that might have been general
      const isGeneralSearch =
        userMessage.content.toLowerCase().includes("show me") ||
        userMessage.content.toLowerCase().includes("what do you have") ||
        userMessage.content.toLowerCase().includes("find");

      // For search queries with no products, suggest using category buttons
      if (isGeneralSearch && (!products || products.length === 0)) {
        processedMessage.content +=
          "\n\nTry browsing by category using the buttons below.";
      }

      // Add AI response to chat
      setMessages((prev) => [...prev, processedMessage]);

      // Set products if any were found
      if (products && products.length > 0) {
        setSelectedProduct(products[0]);
      }
    } catch (error) {
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
      // Scroll to bottom after a short delay to ensure new messages are rendered
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
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

  return (
    <Container maxWidth="md" sx={{ height: "100%" }}>
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
          height: "600px",
          display: "flex",
          flexDirection: "column",
          borderRadius: 2,
          overflow: "hidden",
          border: `1px solid ${theme.palette.divider}`,
          backgroundColor: theme.palette.background.paper,
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
          sx={{
            p: 2,
            flexGrow: 1,
            overflow: "auto",
            backgroundColor: theme.palette.background.default,
            scrollBehavior: "smooth",
          }}
        >
          {messages.map((message, index) => (
            <Box
              key={index}
              sx={{
                display: "flex",
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
                {renderMessageContent(message)}

                {/* Display products if available in this message */}
                {message.role === "assistant" &&
                  message.products &&
                  message.products.length > 0 && (
                    <>
                      {/* Add a divider if there's both text content and products */}
                      {message.content && message.content.trim() !== "" && (
                        <Divider sx={{ my: 2 }} />
                      )}
                      <ProductsDisplay
                        products={message.products}
                        onContactSeller={handleContactSeller}
                      />
                    </>
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
          onClick={(e) => e.stopPropagation()}
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
              onClick={() => handleCategoryClick("electronics")}
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
              onClick={() => handleCategoryClick("furniture")}
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
              onClick={() => handleCategoryClick("textbooks")}
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
              onClick={() => handleCategoryClick("clothing")}
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
              onClick={() => handleCategoryClick("miscellaneous")}
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
              onChange={(e) => setInput(e.target.value)}
              disabled={isLoading}
              inputRef={inputRef}
              sx={{ mr: 1 }}
              InputProps={{
                sx: { borderRadius: 4 },
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  if (input.trim()) handleSubmit(e);
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
