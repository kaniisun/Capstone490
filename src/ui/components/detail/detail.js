import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import "@fortawesome/fontawesome-free/css/all.min.css";
import { faCartShopping, faComments, faCheck, faTag, faInfoCircle } from "@fortawesome/free-solid-svg-icons";
import { supabase } from "../../../supabaseClient";
import "./detail.css";

export const Detail = () => {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const navigate = useNavigate();

  // fetch current user ID
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

  // fetch product details by id
  useEffect(() => {
    const fetchProduct = async () => {
      try {
        console.log("Fetching product with ID:", id);
        const { data, error } = await supabase
          .from("products")
          .select(`
            *,
            users:userID (
              firstName,
              lastName
            )
          `)
          .eq("productID", id)
          .single();

        if (error) {
          console.error("Error fetching product:", error);
        } else {
          console.log("Fetched product data:", data);
          console.log("Product userID:", data.userID);
          console.log("Product seller info:", data.users);
          setProduct(data);
        }
      } catch (err) {
        console.error("Exception while fetching product:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [id]);

  const handleAddToCart = async () => {
    if (!userId) {
      navigate('/login');
      return;
    }

    try {
      // First check if the item is already in the cart
      const { data: existingCartItem } = await supabase
        .from('cart')
        .select('*')
        .eq('user_id', userId)
        .eq('product_id', id)
        .single();

      if (existingCartItem) {
        // Update quantity if item exists
        const { error: updateError } = await supabase
          .from('cart')
          .update({ quantity: existingCartItem.quantity + 1 })
          .eq('user_id', userId)
          .eq('product_id', id);

        if (updateError) throw updateError;
      } else {
        // Add new item if it doesn't exist
        const { error: insertError } = await supabase
          .from('cart')
          .insert([
            {
              user_id: userId,
              product_id: id,
              quantity: 1,
              product_name: product.name,
              product_price: product.price,
              product_image: product.image
            }
          ]);

        if (insertError) throw insertError;
      }

      // Show success message
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (error) {
      console.error("Error adding to cart:", error);
    }
  };

  // delete product function
  const handleDelete = async () => {
    const { error } = await supabase
      .from("products")
      .delete()
      .eq("productID", id);
    if (error) {
      console.error("Error deleting product:", error);
    } else {
      setShowConfirm(false); // Close confirmation popup
      navigate("/"); // redirect to home after deletion
    }
  };

  if (loading) {
    return (
      <div className="detail-container">
        <div className="detail-loading">Loading product details...</div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="detail-container">
        <div className="detail-error">Product not found.</div>
      </div>
    );
  }

  return (
    <div className="detail-container">
      <div className="detail-product-card">
        <div className="detail-product-main">
          <div className="detail-image-container">
            <div className="detail-product-image-wrapper">
              <img
                className="detail-product-image"
                src={product.image || "placeholder.jpg"}
                alt={product.name}
              />
            </div>
            <div className="detail-seller-info">
              <span className="detail-seller-name">
                Seller: {product.users?.firstName} {product.users?.lastName}
              </span>
            </div>
            <button
              className="detail-chat-button"
              onClick={() => {
                console.log("Chat button clicked");
                console.log("Product userID:", product.userID);
                navigate(`/messaging/${product.userID}`);
              }}
            >
              <FontAwesomeIcon icon={faComments} />
              Chat with Seller
            </button>
          </div>
          
          <div className="detail-info-container">
            <div className="detail-header">
              <h1 className="detail-product-title">{product.name}</h1>
              <div className="detail-price-tag">
                <FontAwesomeIcon icon={faTag} />
                <span className="detail-price">${product.price.toFixed(2)}</span>
              </div>
            </div>

            <div className="detail-content">
              <div className="detail-metadata">
                <p className="detail-condition">Condition: {product.condition}</p>
                <p className="detail-status">Status: {product.status}</p>
              </div>

              <div className="detail-description-section">
                <h3 className="detail-section-title">Description</h3>
                <div className="detail-description" dangerouslySetInnerHTML={{ __html: product.description.replace(/\n/g, "<br />") }}></div>
              </div>
            </div>

            <div className="detail-actions">
              <button className="detail-cart-button" onClick={handleAddToCart}>
                <FontAwesomeIcon icon={faCartShopping} />
                Add to Cart
              </button>
            </div>
          </div>
        </div>
      </div>

      {showSuccess && (
        <div className="detail-success-message">
          <FontAwesomeIcon icon={faCheck} />
          Added to cart successfully!
        </div>
      )}

      {showConfirm && (
        <div className="popup-overlay">
          <div className="popup">
            <h3>Are you sure?</h3>
            <p>
              Do you really want to delete this product? This action cannot be
              undone.
            </p>
            <div className="popup-buttons">
              <button className="confirm-delete" onClick={handleDelete}>
                Yes, Delete
              </button>
              <button
                className="cancel-delete"
                onClick={() => setShowConfirm(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
