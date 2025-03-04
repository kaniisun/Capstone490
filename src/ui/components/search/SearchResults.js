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

  // Fetch search results based on search term and filters
  useEffect(() => {
    const fetchResults = async () => {
      setLoading(true);
      setError(null);

      try {
        let query = supabase.from("products").select("*");

        // If there's a search term, apply search filters
        if (searchTerm) {
          query = query.or(
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
          );
        }

        // Apply filters
        if (filters.categories.length > 0) {
          query = query.in("category", filters.categories);
        }

        // Update price filter logic
        if (filters.minPrice !== "") {
          query = query.gte("price", Number(filters.minPrice));
          console.log("Applying min price filter:", filters.minPrice);
        }
        if (filters.maxPrice !== "") {
          query = query.lte("price", Number(filters.maxPrice));
          console.log("Applying max price filter:", filters.maxPrice);
        }

        if (filters.condition) {
          query = query.eq("condition", filters.condition);
        }
        if (filters.isBundle) {
          query = query.eq("is_bundle", true);
        }

        query = query.order("created_at", { ascending: false });

        const { data, error } = await query;

        if (error) throw error;

        console.log("Current filters:", filters);
        console.log("Query results:", data);

        setResults(data);
      } catch (err) {
        console.error("Error in fetch:", err);
        setError("Failed to fetch search results. Please try again.");
        setResults([]);
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
  }, [searchTerm, filters]);

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
