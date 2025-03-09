//ChatInterface.js

//This is the UI component for the chatbot. It is responsible for displaying the chat history and the user's input.

import React, { useState, useRef, useEffect } from "react";
import { supabase } from "../../../supabaseClient"; // Adjust this import path if needed
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPaperPlane, faCircleNotch } from "@fortawesome/free-solid-svg-icons";
import "./ChatInterface.css";
import { ChatModel } from "../../../models/chatModel";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../../contexts/AuthContext";

// Material-UI imports
import {
  Box,
  TextField,
  IconButton,
  Typography,
  Paper,
  Avatar,
  Divider,
  Card,
  CardContent,
  Chip,
  LinearProgress,
  useTheme,
  Grid,
  Badge,
} from "@mui/material";
import {
  Send as SendIcon,
  SmartToy as BotIcon,
  Category as CategoryIcon,
  Stars as StarsIcon,
  Person as PersonIcon,
  AttachMoney as MoneyIcon,
  MoreVert as MoreVertIcon,
} from "@mui/icons-material";

//ChatInterface is the UI component for the chatbot. It is responsible for displaying the chat history and the user's input.
const ChatInterface = () => {
  // State variables
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const chatMessagesRef = useRef(null);
  const [chatModel, setChatModel] = useState(null);
  const [showDebug, setShowDebug] = useState(false);
  const theme = useTheme();
  const { user } = useAuth();
  const [userName, setUserName] = useState("");

  // Scroll to bottom of messages
  const scrollToBottom = () => {
    if (chatMessagesRef.current) {
      chatMessagesRef.current.scrollTop = chatMessagesRef.current.scrollHeight;
    }
  };

  // Get user's name when component mounts
  useEffect(() => {
    const getUserName = async () => {
      if (user?.id) {
        try {
          const { data, error } = await supabase
            .from("users")
            .select("firstName")
            .eq("userID", user.id)
            .single();

          if (error) {
            console.error("Error fetching user name:", error);
            return;
          }

          if (data?.firstName) {
            setUserName(data.firstName);
          }
        } catch (err) {
          console.error("Error in getUserName:", err);
        }
      }
    };

    getUserName();
  }, [user]);

  // Initial greeting
  useEffect(() => {
    const initializeChatbot = async () => {
      // Add initial greeting with user's name if available
      const greeting = userName
        ? `👋 Hi ${userName}! I'm your AI shopping assistant. How can I help you find products today?`
        : "👋 Hi! I'm your AI shopping assistant. How can I help you find products today?";

      setMessages([
        {
          id: Date.now(),
          content: greeting,
          sender: "ai",
          timestamp: new Date(),
          animate: true,
        },
      ]);

      try {
        // Initialize Cohere
        console.log("Initializing Cohere...");
        const model = new ChatModel();
        const initialized = await model.initialize();

        if (initialized) {
          console.log("Cohere initialized successfully");
          setChatModel(model);
        } else {
          console.error("Failed to initialize Cohere");
        }
      } catch (error) {
        console.error("Error initializing chatbot:", error);
      }
    };

    initializeChatbot();
  }, [userName]);

  // Scroll when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  //Creates the typing animation for AI messages
  const addMessageWithTypingEffect = async (content, sender) => {
    setIsLoading(true);
    if (sender === "ai") {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    setMessages((prev) => [
      ...prev,
      {
        id: Date.now(),
        content,
        sender,
        timestamp: new Date(),
        animate: true,
      },
    ]);
    setIsLoading(false);
  };

  // Handles the search logic
  const handleSearch = async (query) => {
    setIsLoading(true);

    try {
      // Add user message to chat
      await addMessageWithTypingEffect(query, "user");

      // Process query through Cohere if available
      let aiResponse = userName
        ? `I'll help you find that, ${userName}.`
        : "I'll help you find that.";
      let searchParams = {
        category: null,
        keywords: query.split(" "),
      };

      if (chatModel && chatModel.isReady()) {
        try {
          console.log("Processing query with Cohere:", query);
          const processedQuery = await chatModel.processQuery(query);
          console.log("Processed query:", processedQuery);

          if (processedQuery) {
            // Add user's name to the response if available
            aiResponse = userName
              ? processedQuery.response.replace("I'll", `${userName}, I'll`)
              : processedQuery.response;
            searchParams = {
              category: processedQuery.category,
              priceRange: processedQuery.priceRange,
              condition: processedQuery.condition,
              sortBy: processedQuery.sortBy,
              keywords: processedQuery.keywords,
            };
          }
        } catch (error) {
          console.error("Error processing query with Cohere:", error);
        }
      }

      // Add AI response to chat
      await addMessageWithTypingEffect(aiResponse, "ai");

      // Perform product search
      const { data: products, error } = await supabase
        .from("products")
        .select("*, users(firstName, lastName)")
        .order("created_at", { ascending: false });

      if (error) {
        throw error;
      }

      console.log("All products:", products);

      // Filter products based on search parameters
      let filteredProducts = products;

      // Category filter
      if (searchParams.category && searchParams.category !== "null") {
        filteredProducts = filteredProducts.filter((product) => {
          return product.category
            ?.toLowerCase()
            .includes(searchParams.category.toLowerCase());
        });
      }

      // Keyword filter
      if (searchParams.keywords && searchParams.keywords.length > 0) {
        const keywordProducts = [];
        for (const product of filteredProducts) {
          const nameMatch = searchParams.keywords.some((keyword) =>
            product.name?.toLowerCase().includes(keyword.toLowerCase())
          );
          const descMatch = searchParams.keywords.some((keyword) =>
            product.description?.toLowerCase().includes(keyword.toLowerCase())
          );
          if (nameMatch || descMatch) {
            keywordProducts.push(product);
          }
        }
        filteredProducts = keywordProducts;
      }

      console.log("Filtered products:", filteredProducts);

      // Display results
      if (filteredProducts.length > 0) {
        await addMessageWithTypingEffect(
          `I found ${filteredProducts.length} items that match your search:`,
          "ai"
        );

        const formattedResults = {
          type: "results",
          products: filteredProducts.map((product, index) => ({
            id: product.productID || product.id,
            name: product.name || "Unnamed Product",
            price: product.price || 0,
            seller: product.users
              ? `${product.users.firstName || ""} ${
                  product.users.lastName || ""
                }`
              : "Unknown Seller",
            image: product.image || "https://via.placeholder.com/150",
            condition: product.condition || "Not specified",
            category: product.category || "Uncategorized",
            description: product.description || "",
            animationDelay: `${index * 0.1}s`,
          })),
        };

        await addMessageWithTypingEffect(formattedResults, "ai");
      } else {
        await addMessageWithTypingEffect(
          "I couldn't find any products matching your search. Please try different keywords or browse our categories.",
          "ai"
        );
      }
    } catch (error) {
      console.error("Error in search:", error);
      const errorMessage = userName
        ? `Sorry ${userName}, I encountered an error while searching. Please try again.`
        : "Sorry, I encountered an error while searching. Please try again.";
      await addMessageWithTypingEffect(errorMessage, "ai");
    } finally {
      setIsLoading(false);
    }
  };

  // Handles the form submission, which triggers the search logic
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!inputMessage.trim() || isLoading) return;

    const query = inputMessage;
    setInputMessage("");
    await handleSearch(query);
  };

  // Formats the timestamp
  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Displays the chat interface with Material-UI
  return (
    <Paper
      elevation={3}
      sx={{
        maxWidth: 800,
        margin: "2rem auto",
        height: { xs: "70vh", md: "80vh" },
        display: "flex",
        flexDirection: "column",
        borderRadius: 3,
        overflow: "hidden",
        position: "relative",
        bgcolor: "background.paper",
      }}
    >
      {/* Header */}
      <Box
        sx={{
          p: 2,
          bgcolor: "#0f2044", // UNCG Blue
          color: "white",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <BotIcon />
          <Typography variant="h6" component="h2" sx={{ fontWeight: 500 }}>
            Marketplace Assistant
          </Typography>
        </Box>
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
          <Box
            sx={{
              width: 8,
              height: 8,
              bgcolor: "#4ade80",
              borderRadius: "50%",
              animation: "pulse 2s infinite",
            }}
          />
          <Typography variant="caption" color="#4ade80">
            Online
          </Typography>
        </Box>
      </Box>

      {/* Loading indicator */}
      {isLoading && (
        <LinearProgress
          sx={{
            height: 3,
            bgcolor: "rgba(255,255,255,0.2)",
            "& .MuiLinearProgress-bar": {
              bgcolor: "#ffc72c", // UNCG Gold
            },
          }}
        />
      )}

      {/* Messages container */}
      <Box
        ref={chatMessagesRef}
        sx={{
          flex: 1,
          overflowY: "auto",
          p: 2,
          bgcolor: "#f8f9fa",
          display: "flex",
          flexDirection: "column",
          gap: 2,
        }}
      >
        {messages.map((message) => (
          <Box
            key={message.id}
            sx={{
              display: "flex",
              flexDirection: message.sender === "user" ? "row-reverse" : "row",
              gap: 1.5,
              maxWidth: "85%",
              alignSelf: message.sender === "user" ? "flex-end" : "flex-start",
              animation: message.animate
                ? "messageIn 0.5s cubic-bezier(0.4, 0, 0.2, 1) forwards"
                : "none",
              opacity: message.animate ? 0 : 1,
            }}
          >
            {message.sender === "ai" && (
              <Avatar
                sx={{
                  bgcolor: "#0f2044", // UNCG Blue
                  width: 36,
                  height: 36,
                  fontSize: "0.9rem",
                }}
              >
                AI
              </Avatar>
            )}

            <Box
              sx={{
                maxWidth: "100%",
              }}
            >
              {message.content &&
              typeof message.content === "object" &&
              message.content.type === "results" ? (
                <Card
                  sx={{
                    bgcolor: "background.paper",
                    boxShadow: 2,
                    borderRadius: 2,
                    width: "100%",
                  }}
                >
                  <CardContent sx={{ p: 2 }}>
                    <Typography
                      variant="subtitle2"
                      fontWeight={500}
                      gutterBottom
                    >
                      Search Results
                    </Typography>
                    <Divider sx={{ mb: 2 }} />
                    <Grid container spacing={2}>
                      {message.content.products.map((product) => (
                        <Grid item xs={12} key={product.id} sx={{ mb: 1 }}>
                          <Card
                            variant="outlined"
                            sx={{
                              display: "flex",
                              borderRadius: 2,
                              overflow: "hidden",
                              transition: "transform 0.2s, box-shadow 0.2s",
                              "&:hover": {
                                transform: "translateY(-4px)",
                                boxShadow: 4,
                                cursor: "pointer",
                              },
                            }}
                          >
                            <Box
                              sx={{
                                width: 90,
                                height: 90,
                                bgcolor: "grey.100",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                              }}
                            >
                              <Box
                                component="img"
                                src={product.image}
                                alt={product.name}
                                sx={{
                                  maxWidth: "100%",
                                  maxHeight: "100%",
                                  objectFit: "contain",
                                }}
                                onError={(e) => {
                                  if (e.target instanceof HTMLImageElement) {
                                    e.target.onerror = null;
                                    e.target.src =
                                      "https://via.placeholder.com/150";
                                  }
                                }}
                              />
                            </Box>
                            <Box sx={{ p: 1.5, flexGrow: 1 }}>
                              <Typography
                                variant="subtitle2"
                                fontWeight={500}
                                noWrap
                              >
                                {product.name}
                              </Typography>
                              <Box
                                sx={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 0.5,
                                  mb: 0.5,
                                }}
                              >
                                <MoneyIcon
                                  color="primary"
                                  sx={{ fontSize: 16 }}
                                />
                                <Typography
                                  variant="body2"
                                  fontWeight={500}
                                  color="primary"
                                >
                                  ${product.price.toFixed(2)}
                                </Typography>
                              </Box>
                              <Box
                                sx={{
                                  display: "flex",
                                  flexWrap: "wrap",
                                  gap: 0.5,
                                }}
                              >
                                <Chip
                                  size="small"
                                  icon={
                                    <CategoryIcon
                                      sx={{ fontSize: "0.9rem !important" }}
                                    />
                                  }
                                  label={product.category}
                                  sx={{ height: 22, fontSize: "0.7rem" }}
                                />
                                <Chip
                                  size="small"
                                  icon={
                                    <StarsIcon
                                      sx={{ fontSize: "0.9rem !important" }}
                                    />
                                  }
                                  label={product.condition}
                                  sx={{ height: 22, fontSize: "0.7rem" }}
                                />
                                <Chip
                                  size="small"
                                  icon={
                                    <PersonIcon
                                      sx={{ fontSize: "0.9rem !important" }}
                                    />
                                  }
                                  label={product.seller}
                                  sx={{ height: 22, fontSize: "0.7rem" }}
                                />
                              </Box>
                            </Box>
                          </Card>
                        </Grid>
                      ))}
                    </Grid>
                  </CardContent>
                </Card>
              ) : (
                <Paper
                  elevation={0}
                  sx={{
                    p: 1.5,
                    borderRadius:
                      message.sender === "user"
                        ? "12px 12px 0 12px"
                        : "12px 12px 12px 0",
                    bgcolor: message.sender === "user" ? "#0f2044" : "white",
                    color: message.sender === "user" ? "white" : "text.primary",
                    boxShadow: message.sender === "user" ? 0 : 1,
                  }}
                >
                  <Typography variant="body1">{message.content}</Typography>
                </Paper>
              )}
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{
                  display: "block",
                  mt: 0.5,
                  textAlign: message.sender === "user" ? "right" : "left",
                }}
              >
                {formatTime(message.timestamp)}
              </Typography>
            </Box>
          </Box>
        ))}

        {/* Typing indicator */}
        {isLoading && (
          <Box
            sx={{
              display: "flex",
              gap: 1.5,
              maxWidth: "85%",
              alignSelf: "flex-start",
            }}
          >
            <Avatar
              sx={{
                bgcolor: "#0f2044", // UNCG Blue
                width: 36,
                height: 36,
                fontSize: "0.9rem",
              }}
            >
              AI
            </Avatar>
            <Paper
              elevation={1}
              sx={{
                p: 2,
                borderRadius: "12px 12px 12px 0",
                bgcolor: "white",
                display: "flex",
                alignItems: "center",
                gap: 0.5,
              }}
            >
              <Box
                sx={{
                  width: 8,
                  height: 8,
                  bgcolor: "#0f2044",
                  borderRadius: "50%",
                  opacity: 0.6,
                  animation: "bounce 1.4s infinite ease-in-out",
                  animationDelay: "0s",
                }}
              />
              <Box
                sx={{
                  width: 8,
                  height: 8,
                  bgcolor: "#0f2044",
                  borderRadius: "50%",
                  opacity: 0.6,
                  animation: "bounce 1.4s infinite ease-in-out",
                  animationDelay: "0.2s",
                }}
              />
              <Box
                sx={{
                  width: 8,
                  height: 8,
                  bgcolor: "#0f2044",
                  borderRadius: "50%",
                  opacity: 0.6,
                  animation: "bounce 1.4s infinite ease-in-out",
                  animationDelay: "0.4s",
                }}
              />
            </Paper>
          </Box>
        )}

        <div ref={messagesEndRef} />
      </Box>

      {/* Input form */}
      <Box
        component="form"
        onSubmit={handleSubmit}
        sx={{
          p: 2,
          bgcolor: "background.paper",
          borderTop: "1px solid",
          borderColor: "divider",
          display: "flex",
          gap: 1,
        }}
      >
        <TextField
          fullWidth
          placeholder="Ask me about products..."
          variant="outlined"
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          disabled={isLoading}
          sx={{
            "& .MuiOutlinedInput-root": {
              borderRadius: 5,
              backgroundColor: "#f8f9fa",
              transition: "all 0.3s",
              "&:hover, &.Mui-focused": {
                backgroundColor: "white",
                boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
              },
            },
          }}
        />
        <IconButton
          type="submit"
          disabled={!inputMessage.trim() || isLoading}
          sx={{
            bgcolor: "#0f2044", // UNCG Blue
            color: "white",
            borderRadius: "50%",
            width: 46,
            height: 46,
            "&:hover": {
              bgcolor: "#1a3366",
            },
            "&.Mui-disabled": {
              bgcolor: "action.disabledBackground",
              color: "action.disabled",
            },
          }}
        >
          <SendIcon />
        </IconButton>
      </Box>

      {/* Debug toggle - keeping it minimal and less visible */}
      {showDebug && (
        <Paper
          sx={{
            position: "absolute",
            right: 15,
            top: 60,
            p: 2,
            zIndex: 10,
            width: 220,
            bgcolor: "background.paper",
          }}
        >
          <Typography variant="subtitle2" gutterBottom>
            Debug Info
          </Typography>
          <Typography variant="body2">
            Cohere Status:{" "}
            {chatModel
              ? chatModel.isReady()
                ? "Ready"
                : "Not Ready"
              : "Not Initialized"}
          </Typography>
        </Paper>
      )}

      <IconButton
        size="small"
        onClick={() => setShowDebug(!showDebug)}
        sx={{
          position: "absolute",
          right: 5,
          top: 5,
          color: "rgba(255,255,255,0.5)",
        }}
      >
        <MoreVertIcon fontSize="small" />
      </IconButton>
    </Paper>
  );
};

export default ChatInterface;
