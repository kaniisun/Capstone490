import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "../../../supabaseClient"; // Adjust the path based on your project structure
import "./SearchResults.css";

const SearchResults = () => {
  const [searchParams] = useSearchParams();
  const searchTerm = searchParams.get("term") || "";
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch search results when the search term changes
  useEffect(() => {
    const fetchResults = async () => {
      if (!searchTerm) {
        setResults([]);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        // Query Supabase for products matching the search term
        const { data, error } = await supabase
          .from("products")
          .select("*")
          .or(
            `name.ilike.%${searchTerm}%,` +
              `name.ilike.%${searchTerm}s%,` +
              `name.ilike.%${
                searchTerm.endsWith("s") ? searchTerm.slice(0, -1) : searchTerm
              }%,` +
              `description.ilike.%${searchTerm}%,` +
              `description.ilike.%${searchTerm}s%,` +
              `description.ilike.%${
                searchTerm.endsWith("s") ? searchTerm.slice(0, -1) : searchTerm
              }%`
          )
          .order("created_at", { ascending: false });

        if (error) throw error;

        setResults(data);
      } catch (err) {
        setError("Failed to fetch search results. Please try again.");
        setResults([]);
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
  }, [searchTerm]);

  return (
    <div className="search-results-page">
      <h1>Search Results for "{searchTerm}"</h1>
      {loading ? (
        <p>Loading...</p>
      ) : error ? (
        <p className="error">{error}</p>
      ) : results.length === 0 ? (
        <p>No results found.</p>
      ) : (
        <div className="results-grid">
          {results.map((product) => (
            <ResultCard key={product.productID} product={product} />
          ))}
        </div>
      )}
    </div>
  );
};

// Component to render individual product cards
const ResultCard = ({ product }) => {
  const [liked, setLiked] = useState(false);
  const navigate = useNavigate();
  const imageUrl = product.image || "/default-image.jpg"; // Fallback image if none provided

  const handleCardClick = () => {
    navigate(`/product/${product.productID}`);
  };

  const handleLikeClick = (e) => {
    e.stopPropagation(); // Prevent card click when clicking the like button
    setLiked(!liked);
  };

  return (
    <div
      className="result-card"
      onClick={handleCardClick}
      style={{ cursor: "pointer" }}
    >
      <img src={imageUrl} alt={product.name} className="product-image" />
      <div className="product-info">
        <h3>{product.name}</h3>
        <p className="description">{product.description}</p>
        <p className="price">${product.price.toFixed(2)}</p>
        <p className="condition">Condition: {product.condition}</p>
        <p className="category">Category: {product.category}</p>
        <p className="status">Status: {product.status}</p>
        {product.is_bundle && <p className="bundle">Bundle Item</p>}
        {product.flag && <p className="flag">Flagged</p>}
        <p className="created">
          Added: {new Date(product.created_at).toLocaleDateString()}
        </p>
        {product.modified_at && (
          <p className="modified">
            Last Updated: {new Date(product.modified_at).toLocaleDateString()}
          </p>
        )}
        <button
          className={`like-button ${liked ? "liked" : ""}`}
          onClick={handleLikeClick}
        >
          ♥
        </button>
      </div>
    </div>
  );
};

export default SearchResults;
