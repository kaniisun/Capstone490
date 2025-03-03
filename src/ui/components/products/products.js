import React, { useState, useEffect } from "react";
import { supabase } from "../../../supabaseClient";
import { useNavigate } from "react-router-dom";
import "./products.css";

function Products() {
  // export const Products = () => {

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // fetch all products from the database
  useEffect(() => {
    const fetchProducts = async () => {
      const { data, error } = await supabase.from("products").select("*");

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

  

  //   returns all the products in database
  return (
    // FILTER
    <div>
      <>
        <section id="filters">
          <h2>Filter by</h2>
          <div className="filter-list">
            <label>
              Category:
              <select id="categoryFilter">
                <option value="all">All</option>
                <option value="math">Math</option>
                <option value="science">Science</option>
                <option value="literature">Literature</option>
              </select>
            </label>
            <label>
              Price Range:
              <input
                type="range"
                id="priceFilter"
                min={0}
                max={100}
                defaultValue={50}
              />
            </label>
            <label>
              Condition:
              <select id="conditionFilter">
                <option value="all">All</option>
                <option value="new">New</option>
                <option value="used">Used</option>
              </select>
            </label>
          </div>
        </section>

        {/* PRODUCTS */}
        <section id="featured-products">
          <h2>All Listings</h2>
          {loading ? (
            <p>Loading products...</p>
          ) : (
            // products displayed
            <div className="product-list">
              {products.map((product) => (
                // goes to product details when clicked
                <div
                  key={product.productID}
                  className="product"
                  onClick={() => navigate(`/product/${product.productID}`)}
                >
                  <img
                    src={product.image || "placeholder.jpg"}
                    alt={product.name} className="product-image"
                  />
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

        {/* OLD CODE */}
        {/* <section id="featured-products">
          <h2>Available Textbooks</h2>
          <div className="product-list" id="productList">
            <div className="product">
              <img src="calculus.jpg" alt="Product 1" />
              <h3>Product 1</h3>
              <p>Description</p>
              <h4>$15.00</h4>

              <div className="chat-container">
                <p>Chat with Seller</p>
                <button className="chat">Chat</button>
              </div>
              <button className="add">Add</button>
            </div>
            <div className="product">
              <img src="physics.jpg" alt="Product 2" />
              <h3>Product 2</h3>
              <p>Description</p>
              <h4>$15.00</h4>

              <div className="chat-container">
                <p>Chat with Seller</p>
                <button className="chat">Chat</button>
              </div>
              <button className="add">Add</button>
            </div>
            <div className="product">
              <img src="calculus.jpg" alt="Product 3" />
              <h3>Product 3</h3>
              <p>Description</p>
              <h4>$15.00</h4>

              <div className="chat-container">
                <p>Chat with Seller</p>
                <button className="chat">Chat</button>
              </div>
              <button className="add">Add</button>
            </div>
            <div className="product">
              <img src="physics.jpg" alt="Product 4" />
              <h3>Product 4</h3>
              <p>Description</p>
              <h4>$15.00</h4>

              <div className="chat-container">
                <p>Chat with Seller</p>
                <button className="chat">Chat</button>
              </div>
              <button className="add">Add</button>
            </div>
            <div className="product">
              <img src="physics1.jpg" alt="Product 5" />
              <h3>Product 5</h3>
              <p>Description</p>
              <h4>$15.00</h4>

              <div className="chat-container">
                <p>Chat with Seller</p>
                <button className="chat">Chat</button>
              </div>
              <button className="add">Add</button>
            </div>
          </div>
        </section> */}
      </>
    </div>
  );
}

export default Products;
