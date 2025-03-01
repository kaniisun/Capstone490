import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../../../supabaseClient";
import "./detail.css";

export const Detail = () => {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState(null);
  const navigate = useNavigate();

  // Fetch current user ID
  useEffect(() => {
    const fetchUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
      }
    };

    fetchUser();
  }, []);

  // Fetch product details by id
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

  const handleDelete = async () => {
    const { error } = await supabase.from("products").delete().eq("productID", id);
    if (error) {
      console.error("Error deleting product:", error);
    } else {
      navigate("/"); // Redirect to home after deletion
    }
  };

  if (loading) return <p>Loading product details...</p>;
  if (!product) return <p>Product not found.</p>;

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

          {/* Show Edit and Delete buttons if user is the creator */}
          {/* {userId === product.user_id && ( */}
            <div className="admin-buttons">
              <button className="edit" onClick={() => navigate(`/edit/${id}`)}>
                Edit
              </button>
              <button className="delete" onClick={handleDelete}>
                Delete
              </button>
            </div>
         {/* )} */}
        </div>
      </div>
    </div>
  );
};
