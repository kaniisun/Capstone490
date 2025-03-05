import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "../../../supabaseClient";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faThumbtack } from "@fortawesome/free-solid-svg-icons";
import Filter from "../filter/Filter"; // Adjust the path to where Filter.js is located
import "./SearchResults.css";

const SearchResults = () => {
  const [searchParams] = useSearchParams();
  const searchTerm = searchParams.get("term") || "";
  const categoryFromUrl = searchParams.get("category") || "";
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Move filters state initialization to useEffect
  const [filters, setFilters] = useState({
    categories: [],
    minPrice: "",
    maxPrice: "",
    condition: "",
    isBundle: false,
  });

  // Handle initial category from URL
  useEffect(() => {
    if (categoryFromUrl) {
      setFilters((prev) => ({
        ...prev,
        categories: [categoryFromUrl],
      }));
    }
  }, [categoryFromUrl]);

  const searchProducts = async (searchTerm) => {
    try {
      // Get all available products
      const { data: products, error } = await supabase
        .from("products")
        .select("*")
        .eq("status", "Available");

      if (error) throw error;

      // Filter products based on search term and filters
      const filteredProducts = products.filter((product) => {
        const searchableText = `
          ${product.name?.toLowerCase() || ""} 
          ${product.description?.toLowerCase() || ""} 
          ${product.category?.toLowerCase() || ""}
        `;

        return searchableText.includes(searchTerm.toLowerCase());
      });

      setResults(filteredProducts);
      setLoading(false);
    } catch (error) {
      console.error("Error searching products:", error);
      setLoading(false);
    }
  };

  // Fetch search results based on search term and filters
  useEffect(() => {
    searchProducts(searchTerm);
  }, [searchTerm]);

  return (
    <div className="search-results-page">
      <h1>Search Results for "{searchTerm}"</h1>
      <div className="search-results-container">
        <Filter filters={filters} setFilters={setFilters} />
        <main className="search-results-content">
          {loading ? (
            <p>Loading...</p>
          ) : error ? (
            <p className="error">{error}</p>
          ) : results.length === 0 ? (
            <p>No results found.</p>
          ) : (
            <div className="product-list">
              {results.map((product) => (
                <ResultCard key={product.productID} product={product} />
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

const ResultCard = ({ product }) => {
  const navigate = useNavigate();
  const imageUrl = product.image || "/default-image.jpg";

  // Add this console log to check the product data
  console.log("Product data:", {
    id: product.productID,
    name: product.name,
    isBundle: product.is_bundle,
    category: product.category,
  });

  const handleCardClick = () => {
    navigate(`/product/${product.productID}`);
  };

  return (
    <div
      className="product"
      data-category={product.category}
      onClick={handleCardClick}
    >
      <FontAwesomeIcon icon={faThumbtack} className="pin-icon" />
      {/* Make sure the bundle tag appears before the image */}
      {product.is_bundle && <span className="bundle-tag">Bundle</span>}
      <img src={imageUrl} alt={product.name} />
      <h3>{product.name}</h3>
      <h4>${product.price.toFixed(2)}</h4>
    </div>
  );
};

export default SearchResults;
