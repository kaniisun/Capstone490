import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import "@fortawesome/fontawesome-free/css/all.min.css";
import { faCartShopping } from "@fortawesome/free-solid-svg-icons";
import { supabase } from "../../../supabaseClient";
import "./detail.css";

export const Detail = () => {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false); // State for confirmation popup
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

  // Delete product function
  const handleDelete = async () => {
    const { error } = await supabase.from("products").delete().eq("productID", id);
    if (error) {
      console.error("Error deleting product:", error);
    } else {
      setShowConfirm(false); // Close confirmation popup
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
              <Link to="/chatroom"><button className="chat">Chat</button></Link>
            </div>
            <button className="add"><FontAwesomeIcon icon={faCartShopping} /></button>
          </div>

          {/* Show Edit and Delete buttons if user is the creator */}
          {/* {userId === product.user_id && ( */}
            <div className="admin-buttons">
              <button className="edit" onClick={() => navigate(`/edit/${id}`)}>
                Edit
              </button>
              <button className="delete" onClick={() => setShowConfirm(true)}>
                Delete
              </button>
            </div>
          {/* )} */}
        </div>
      </div>

      {/* Confirmation Popup */}
      {showConfirm && (
        <div className="popup-overlay">
          <div className="popup">
            <h3>Are you sure?</h3>
            <p>Do you really want to delete this product? This action cannot be undone.</p>
            <div className="popup-buttons">
              <button className="confirm-delete" onClick={handleDelete}>Yes, Delete</button>
              <button className="cancel-delete" onClick={() => setShowConfirm(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
