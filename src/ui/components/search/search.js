// src/components/search.js
import React, { useState } from "react";
import { useNavigate } from "react-router-dom"; // For navigation between pages
import "./search.css";

function Search() {
  // State to store what the user types in the input field
  const [searchTerm, setSearchTerm] = useState("");
  const navigate = useNavigate(); // Hook to programmatically change the page

  // Update the searchTerm state whenever the user types something
  const handleInputChange = (event) => {
    setSearchTerm(event.target.value); // event.target.value is the text in the input
  };

  const handleSearch = () => {
    if (searchTerm.trim()) {
      navigate(`/search-results?term=${encodeURIComponent(searchTerm)}`);
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    handleSearch();
  };

  return (
    <div className="search-container">
      <form className="search-form" onSubmit={handleSubmit}>
        <input
          type="text"
          value={searchTerm}
          onChange={handleInputChange}
          placeholder="Search for products..."
          className="search-input"
        />
        <div
          className="search-icon"
          onClick={handleSearch}
          role="button"
          tabIndex={0}
        >
          <svg
            width="17"
            height="16"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            role="img"
            aria-labelledby="search"
          >
            <path
              d="M7.667 12.667A5.333 5.333 0 107.667 2a5.333 5.333 0 000 10.667zM14.334 14l-2.9-2.9"
              stroke="currentColor"
              strokeWidth="1.333"
              strokeLinecap="round"
              strokeLinejoin="round"
            ></path>
          </svg>
        </div>
      </form>
    </div>
  );
}

export default Search;
