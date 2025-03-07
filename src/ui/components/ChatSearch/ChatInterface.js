//ChatInterface.js

//This is the UI component for the chatbot. It is responsible for displaying the chat history and the user's input.

import React, { useState, useRef, useEffect } from "react";
import { supabase } from "../../../supabaseClient"; // Adjust this import path if needed
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPaperPlane, faCircleNotch } from "@fortawesome/free-solid-svg-icons";
import "./ChatInterface.css";
import { ChatModel } from "../../../models/chatModel";

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

  // Scroll to bottom of messages
  const scrollToBottom = () => {
    if (chatMessagesRef.current) {
      chatMessagesRef.current.scrollTop = chatMessagesRef.current.scrollHeight;
    }
  };

  // Initial greeting
  useEffect(() => {
    const initializeChatbot = async () => {
      // Add initial greeting
      setMessages([
        {
          id: Date.now(),
          content:
            "👋 Hi! I'm your AI shopping assistant. How can I help you find products today?",
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
  }, []);

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
      let aiResponse = "I'll help you find that.";
      let searchParams = {
        category: null,
        priceRange: null,
        condition: null,
        sortBy: null,
        keywords: [],
      };

      if (chatModel && chatModel.isReady()) {
        console.log("Using Cohere for query:", query);
        const cohereResult = await chatModel.processQuery(query);
        aiResponse = cohereResult.aiMessage;
        searchParams = cohereResult.searchParams;

        // Show AI's understanding of the query
        await addMessageWithTypingEffect(aiResponse, "ai");
      } else {
        console.log("Cohere not available, using fallback");
        await addMessageWithTypingEffect("I'll search for that.", "ai");
      }

      console.log("Search parameters:", searchParams);

      // Build database query based on AI-extracted parameters
      let dbQuery = supabase
        .from("products")
        .select(
          `
          *,
          users:userID (
            firstName,
            lastName,
            email
          )
        `
        )
        .eq("status", "Available");

      // Apply category filter if provided
      if (searchParams.category) {
        dbQuery = dbQuery.eq("category", searchParams.category);
      }

      // Apply condition filter if provided
      if (searchParams.condition) {
        dbQuery = dbQuery.eq("condition", searchParams.condition);
      }

      // Apply sorting based on price preference
      if (
        searchParams.priceRange === "low" ||
        searchParams.sortBy === "price_asc"
      ) {
        dbQuery = dbQuery.order("price", { ascending: true });
      } else if (
        searchParams.priceRange === "high" ||
        searchParams.sortBy === "price_desc"
      ) {
        dbQuery = dbQuery.order("price", { ascending: false });
      }

      // Execute the query
      const { data: products, error } = await dbQuery;

      if (error) {
        console.error("Database error:", error);
        throw error;
      }

      console.log("Search results:", products);

      // If no results but we have keywords, try searching by keywords
      if (
        products.length === 0 &&
        searchParams.keywords &&
        searchParams.keywords.length > 0
      ) {
        console.log("No category matches, trying keyword search");

        // Build OR conditions for keyword search
        const orConditions = [];

        searchParams.keywords.forEach((keyword) => {
          if (keyword.length > 2) {
            orConditions.push(`name.ilike.%${keyword}%`);
            orConditions.push(`description.ilike.%${keyword}%`);
          }
        });

        if (orConditions.length > 0) {
          const keywordQuery = supabase
            .from("products")
            .select(
              `
              *,
              users:userID (
                firstName,
                lastName,
                email
              )
            `
            )
            .eq("status", "Available")
            .or(orConditions.join(","));

          const { data: keywordProducts } = await keywordQuery;

          if (keywordProducts && keywordProducts.length > 0) {
            await addMessageWithTypingEffect(
              `I found ${keywordProducts.length} items that might match what you're looking for:`,
              "ai"
            );

            const formattedResults = {
              type: "results",
              products: keywordProducts.map((product, index) => ({
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
            setIsLoading(false);
            return;
          }
        }
      }

      // Display results
      if (products.length > 0) {
        await addMessageWithTypingEffect(
          `I found ${products.length} items that match your search:`,
          "ai"
        );

        const formattedResults = {
          type: "results",
          products: products.map((product, index) => ({
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
        // No results found
        await addMessageWithTypingEffect(
          "I couldn't find any products matching your search criteria. Here are some available items:",
          "ai"
        );

        // Show some random products as fallback
        const { data: randomProducts } = await supabase
          .from("products")
          .select(
            `
            *,
            users:userID (
              firstName,
              lastName,
              email
            )
          `
          )
          .eq("status", "Available")
          .limit(5);

        if (randomProducts && randomProducts.length > 0) {
          const formattedResults = {
            type: "results",
            products: randomProducts.map((product, index) => ({
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
        }
      }
    } catch (error) {
      console.error("Search error:", error);
      await addMessageWithTypingEffect(
        "Sorry, I encountered an error while searching.",
        "ai"
      );
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

  // Displays the chat interface
  return (
    <div className="chat-interface">
      <div className="chat-header">
        <div className="chat-title">
          <h3>Marketplace Assistant</h3>
          <span className="status-indicator">Online</span>
        </div>
      </div>

      <div className="chat-messages" ref={chatMessagesRef}>
        {messages.map((message) => (
          <div
            key={message.id}
            className={`message ${message.sender} ${
              message.animate ? "animate-in" : ""
            }`}
          >
            {message.sender === "ai" && <div className="ai-avatar">AI</div>}
            <div className="message-content">
              {message.content &&
              typeof message.content === "object" &&
              message.content.type === "results" ? (
                <div className="search-results">
                  {message.content.products.map((product) => (
                    <div
                      key={product.id}
                      className="result-card"
                      style={{ animationDelay: product.animationDelay }}
                    >
                      <img
                        src={product.image}
                        alt={product.name}
                        onError={function (e) {
                          if (e.target instanceof HTMLImageElement) {
                            e.target.onerror = null;
                            e.target.src = "https://via.placeholder.com/150";
                          }
                        }}
                      />
                      <div className="result-info">
                        <h4>{product.name}</h4>
                        <p className="price">${product.price.toFixed(2)}</p>
                        <p className="category">📦 {product.category}</p>
                        <p className="condition">✨ {product.condition}</p>
                        <p className="seller">👤 {product.seller}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p>{message.content}</p>
              )}
              <span className="timestamp">
                {new Date(message.timestamp).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="message ai">
            <div className="ai-avatar">AI</div>
            <div className="message-content">
              <div className="typing-indicator">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <form className="chat-input-form" onSubmit={handleSubmit}>
        <input
          type="text"
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          placeholder="Ask me about products..."
          disabled={isLoading}
        />
        <button type="submit" disabled={!inputMessage.trim() || isLoading}>
          {isLoading ? (
            <FontAwesomeIcon icon={faCircleNotch} spin />
          ) : (
            <FontAwesomeIcon icon={faPaperPlane} />
          )}
        </button>
      </form>

      {showDebug && (
        <div className="debug-panel">
          <h4>Debug Info</h4>
          <p>
            Cohere Status:{" "}
            {chatModel
              ? chatModel.isReady()
                ? "Ready"
                : "Not Ready"
              : "Not Initialized"}
          </p>
          <p>
            API Key Set: {process.env.REACT_APP_COHERE_API_KEY ? "Yes" : "No"}
          </p>
          <button onClick={() => console.log("Chat Model:", chatModel)}>
            Log Chat Model
          </button>
        </div>
      )}

      <button
        className="debug-toggle"
        onClick={() => setShowDebug(!showDebug)}
        style={{
          position: "absolute",
          right: "10px",
          top: "10px",
          background: "none",
          border: "none",
          color: "#999",
        }}
      >
        🐞
      </button>
    </div>
  );
};

export default ChatInterface;
