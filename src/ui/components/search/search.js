//search.js
//This component renders the chat interface

import React from "react";
import ChatInterface from "../ChatSearch/ChatInterface";
import "./search.css";

//This is the search component that renders the chat interface
function Search() {
  return (
    <div id="intro">
      <h1>How can I help you today?</h1>
      <ChatInterface />
    </div>
  );
}

export default Search;
