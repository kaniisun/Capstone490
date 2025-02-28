import React, { useState, useEffect } from "react";
import { supabase } from "../../../supabaseClient";
import { useNavigate } from "react-router-dom";
import "./home.css";

export const Home = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  //   function to fetch featured products on homepage
  // right now it just grabs the first 5 products in the database
  useEffect(() => {
    const fetchProducts = async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .limit(5); // limited the amount of products to be displayed to 5

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

  // returns featured products
  return (
    <div>
      <section id="featured-products">
        <h2>Featured Listings</h2>
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
                  alt={product.name}
                />
                <h3>{product.name}</h3>
                <h4>${product.price}</h4>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* <section id="featured-products">
                <h2>Featured Products</h2>
                <div className="product-list" id="productList">
                    <div className="product">
                        <img src="physics1.jpg" alt="Product 1" />
                        <h3>Product 1</h3>
                        <p>$10.00</p>
                    </div>
                    <div className="product">
                        <img src="lamp.jpg" alt="Product 2" />
                        <h3>Product 2</h3>
                        <p>$15.00</p>
                    </div>
                    <div className="product">
                        <img src="purse.jpg" alt="Product 3" />
                        <h3>Product 3</h3>
                        <p>$20.00</p>
                    </div>
                    <div className="product">
                        <img src="shoes.jpg" alt="Product 4" />
                        <h3>Product 4</h3>
                        <p>$25.00</p>
                    </div>
                    <div className="product">
                        <img src="sofa.jpg" alt="Product 5" />
                        <h3>Product 5</h3>
                        <p>$30.00</p>
                    </div>
                    <div className="product">
                        <img src="table.jpg" alt="Product 6" />
                        <h3>Product 6</h3>
                        <p>$35.00</p>
                    </div>
                    <div className="product">
                        <img src="tsirt.jpg" alt="Product 6" />
                        <h3>Product 6</h3>
                        <p>$35.00</p>
                    </div>
                    <div className="product">
                        <img src="purse.jpg" alt="Product 6" />
                        <h3>Product 6</h3>
                        <p>$35.00</p>
                    </div>
                </div>
            </section> */}
    </div>
  );
};

export default Home;
