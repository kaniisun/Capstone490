import React, { useState, useEffect } from "react";
import { supabase } from "../../../supabaseClient";
import { useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBook,
  faLaptop,
  faCouch,
  faTshirt,
} from "@fortawesome/free-solid-svg-icons";
import "./home.css";
import Search from "../search/search";
export const Home = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchProducts = async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .limit(5);

      console.log("Fetched Products:", data);

      if (error) {
        console.error("Error fetching products:", error);
      } else {
        setProducts(data);
      }
      setLoading(false);
    };

    fetchProducts();
  }, []);

  return (
    <div>
      {/* Hero Section - Unique to homepage */}
      <section id="hero">
        <h1>Your Campus Marketplace</h1>
        <p>Buy, sell, and connect with fellow students</p>
        <Search />
      </section>

      {/* Category Section - Unique to homepage */}
      <section id="categories">
        <h2>Browse Categories</h2>
        <div className="category-list">
          <div
            className="category"
            onClick={() => navigate("/products?category=Textbooks")}
          >
            <FontAwesomeIcon icon={faBook} className="category-icon" />
            <span>Textbooks</span>
          </div>
          <div
            className="category"
            onClick={() => navigate("/products?category=Electronics")}
          >
            <FontAwesomeIcon icon={faLaptop} className="category-icon" />
            <span>Electronics</span>
          </div>
          <div
            className="category"
            onClick={() => navigate("/products?category=Furniture")}
          >
            <FontAwesomeIcon icon={faCouch} className="category-icon" />
            <span>Furniture</span>
          </div>
          <div
            className="category"
            onClick={() => navigate("/products?category=Clothing")}
          >
            <FontAwesomeIcon icon={faTshirt} className="category-icon" />
            <span>Clothing</span>
          </div>
        </div>
      </section>

      {/* Featured Products - Already implemented */}
      <section id="featured-products">
        <h2>Featured Listings</h2>
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
                  <img
                    src={product.image || "placeholder.jpg"}
                    alt={product.name} className="product-image"
                  />
                <h3>{product.name}</h3>
                <p className="price">${product.price.toFixed(2)}</p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default Home;
