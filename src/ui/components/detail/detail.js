import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../../../supabaseClient";
import "./detail.css";

export const Detail = () => {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);

  //   function to fetch product details by id
  useEffect(() => {
    const fetchProduct = async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("productID", id)
        .single(); // fetch singular product

      if (error) {
        console.error("Error fetching product:", error);
      } else {
        setProduct(data);
      }
      setLoading(false);
    };

    fetchProduct();
  }, [id]);

  if (loading) return <p>Loading product details...</p>;
  if (!product) return <p>Product not found.</p>;

  //   display product details
  return (
    <div className="content-container">
      <div className="product">
        <div className="prod-image">
          <img
            id="prod-image"
            src={product.image || "placeholder.jpg"}
            alt={product.name}
          />
        </div>
        <div className="prod-info">
          <h2 id="prod-name">{product.name}</h2>
          <p className="prod-info-item" id="prod-detail">
            {product.description}
          </p>
          <p className="prod-info-item" id="prod-condition">
            Condition: {product.condition}
          </p>
          <p className="price" id="prod-price">
            ${product.price}
          </p>
          <div className="button-container">
            <div className="chat-container">
              <p>Chat with Seller</p>
              <button className="chat">Chat</button>
            </div>
            <button className="add">Add to Cart</button>
          </div>
        </div>
      </div>

      {/*<div>
            <div className="content-container">
                <div className="product">
                    <div className="prod-image">
                        <img id="prod-image" src="purse.jpg" alt="pink purse" />
                    </div>
                    <div className="prod-info">
                        <h2 id="prod-name">Product Name</h2>
                        <p className="prod-info-item" id="prod-size">
                            Size: Medium
                        </p>
                        <p className="prod-info-item" id="prod-detail">
                            Detail: This is a detailed description of the product.
                        </p>
                        <p className="prod-info-item" id="prod-condition">
                            Condition: New
                        </p>
                        <p className="price" id="prod-price">
                            $15.00
                        </p>
                        <div className="button-container">
                            <div className="chat-container">
                                <p>Chat with Seller</p>
                                <button className="chat">Chat</button>
                            </div>
                            <button className="add">Add</button>
                        </div>
                    </div>
                </div>
            </div>

        </div>*/}
    </div>
  );
};
