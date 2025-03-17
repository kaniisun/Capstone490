//search.js
//This component renders the chat interface

import React from "react";
import ChatInterface from "../ChatSearch/ChatInterface";
import ErrorBoundary from "../ChatSearch/components/ErrorBoundary";
import { Box, Typography, Container } from "@mui/material";
import "./search.css";

//This is the search component that renders the chat interface
function Search() {
  return (
    <Box
      sx={{
        py: 4,
        width: "100%",
        minHeight: "calc(100vh - 120px)", // Adjust based on your header/footer height
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-start",
        alignItems: "center",
      }}
    >
      <Typography
        variant="h4"
        component="h1"
        gutterBottom
        sx={{
          mb: 3,
          fontWeight: "medium",
          textAlign: "center",
        }}
      >
        Chat with our Marketplace Assistant
      </Typography>
      <ErrorBoundary>
        <ChatInterface />
      </ErrorBoundary>
    </Box>
  );
}

export default Search;
