import React, { useState, useEffect } from "react";
import { supabase } from "../../../supabaseClient";
import { useNavigate, useLocation } from "react-router-dom";
import Filter from "../filter/Filter";
import "./products.css";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faThumbtack } from "@fortawesome/free-solid-svg-icons";

function Products() {
  const location = useLocation();
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Use the same filters structure as SearchResults
  const [filters, setFilters] = useState({
    categories: [],
    minPrice: "",
    maxPrice: "",
    condition: "",
    isBundle: false,
  });

  // Get category from URL and fetch products when component mounts or filters change
  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      const params = new URLSearchParams(location.search);
      const categoryFromUrl = params.get("category");

      let query = supabase.from("products").select("*");

      // If there's a category in the URL, use that instead of filters.categories
      if (categoryFromUrl) {
        query = query.eq("category", categoryFromUrl);
      } else if (filters.categories.length > 0) {
        query = query.in("category", filters.categories);
      }

      // Apply other filters
      if (filters.minPrice !== "") {
        query = query.gte("price", Number(filters.minPrice));
      }
      if (filters.maxPrice !== "") {
        query = query.lte("price", Number(filters.maxPrice));
      }
      if (filters.condition) {
        query = query.eq("condition", filters.condition);
      }
      if (filters.isBundle) {
        query = query.eq("is_bundle", true);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error fetching products:", error);
      } else {
        setProducts(data);
      }
      setLoading(false);
    };

    fetchProducts();
  }, [location.search, filters]);


  return (
    <div className="products-page-container">
      <Filter filters={filters} setFilters={setFilters} />
      <main className="products-main-content">
        <section id="featured-products">
          <h2>All Listings</h2>
          {loading ? (
            <p>Loading products...</p>
          ) : (
            <div className="product-list">
              {products.map((product) => (
                <div
                  key={product.productID}
                  className="product"
                  onClick={() => navigate(`/product/${product.productID}`)}
                >
                  <FontAwesomeIcon icon={faThumbtack} className="pin-icon" />
                  {product.is_bundle && (
                    <span className="bundle-tag">Bundle</span>
                  )}
                  <img
                    src={product.image || "placeholder.jpg"}
                    alt={product.name} className="product-image"
                  />
                  <div className="product-info">
                    <h3>{product.name}</h3>
                    <p className="price">${product.price.toFixed(2)}</p>
                    <p className="condition">Condition: {product.condition}</p>
                    <p className="status">Status: {product.status}</p>
                    {product.is_bundle && <p className="bundle">Bundle Item</p>}
                    {product.flag && <p className="flag">Flagged</p>}
                    {product.modified_at && (
                      <p className="modified">
                        Last Updated:{" "}
                        {new Date(product.modified_at).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

export default Products;
