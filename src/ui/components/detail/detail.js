import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import "@fortawesome/fontawesome-free/css/all.min.css";
import {
  faCartShopping,
  faComments,
  faCheck,
  faTag,
  faHeart as solidHeart,
} from "@fortawesome/free-solid-svg-icons";
import { faHeart as regularHeart } from "@fortawesome/free-regular-svg-icons";
import { supabase } from "../../../supabaseClient";
import "./detail.css";
import { isFavorite, toggleFavorite } from "../../../utils/favoriteUtils";
import { getFormattedImageUrl } from "../ChatSearch/utils/imageUtils";
import {
  shouldPreventMessage,
  markMessageSent,
} from "../messageArea/messageHelper";
import { useSnackbar } from "notistack";
import API_CONFIG from "../../../config/api.js";

const clickTracker = {};

export const Detail = () => {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  // Add favorited state
  const [favorited, setFavorited] = useState(false);
  const navigate = useNavigate();
  // Add snackbar
  const { enqueueSnackbar } = useSnackbar();

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

  // Check if product is favorited
  useEffect(() => {
    if (id) {
      setFavorited(isFavorite(id));
    }
  }, [id]);

  // fetch product details by id
  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const { data, error } = await supabase
          .from("products")
          .select(
            `
            *,
            users:userID (
              firstName,
              lastName
            )
          `
          )
          .eq("productID", id)
          .eq("is_deleted", false)
          .single();

        if (error) {
          console.error("Error fetching product:", error);
        } else {
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
      navigate("/login");
      return;
    }

    try {
      // First check if the item is already in the cart
      const { data: existingCartItem } = await supabase
        .from("cart")
        .select("*")
        .eq("user_id", userId)
        .eq("product_id", id)
        .single();

      if (existingCartItem) {
        // Update quantity if item exists
        const { error: updateError } = await supabase
          .from("cart")
          .update({ quantity: existingCartItem.quantity + 1 })
          .eq("user_id", userId)
          .eq("product_id", id);

        if (updateError) throw updateError;
      } else {
        // Add new item if it doesn't exist
        const { error: insertError } = await supabase.from("cart").insert([
          {
            user_id: userId,
            product_id: id,
            quantity: 1,
            product_name: product.name,
            product_price: product.price,
            product_image: product.image,
          },
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

  // delete product function - implements soft delete
  const handleDelete = async () => {
    try {
      // Use the API endpoint for soft delete
      const { data: session } = await supabase.auth.getSession();
      if (!session || !session.session) {
        throw new Error("You must be logged in to delete a product");
      }

      const response = await fetch(
        API_CONFIG.getUrl(API_CONFIG.ENDPOINTS.DELETE_PRODUCT),
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.session.access_token}`,
          },
          body: JSON.stringify({
            productId: id,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to delete product");
      }

      setShowConfirm(false); // Close confirmation popup
      navigate("/"); // redirect to home after deletion
    } catch (error) {
      console.error("Error deleting product:", error.message);
    }
  };

  // Handle toggling favorite
  const handleToggleFavorite = () => {
    const newFavoritedState = toggleFavorite(id);
    setFavorited(newFavoritedState);
  };

  const handleConfirmPurchase = async () => {
    if (!userId) {
      navigate("/login");
      return;
    }

    console.log("Starting confirmation process...");
    console.log("Product data:", product);

    try {
      // Prepare product data for confirmation
      const confirmationData = {
        ...product,
        sellerID: product.userID,
        sellerName: `${product.users.firstName} ${product.users.lastName}`,
        sellerEmail: "N/A",
        sellerPhone: "N/A",
      };

      console.log("Navigating to confirmation with data:", confirmationData);

      // Navigate to confirmation page with product data
      navigate("/confirmation", {
        state: {
          product: confirmationData,
        },
      });
    } catch (error) {
      console.error("Error in handleConfirmPurchase:", error);
      // Still try to navigate even if there's an error
      navigate("/confirmation", {
        state: {
          product: {
            ...product,
            sellerID: product.userID,
            sellerName: `${product.users.firstName} ${product.users.lastName}`,
            sellerEmail: "N/A",
            sellerPhone: "N/A",
          },
        },
      });
    }
  };

  // Handle Chat with Seller with duplicate prevention
  const handleChatWithSeller = () => {
    // First, check if user is logged in
    if (!userId) {
      enqueueSnackbar("Please login to contact the seller", {
        variant: "warning",
      });
      navigate("/login");
      return;
    }

    // Don't allow users to message themselves
    if (userId === product.userID) {
      enqueueSnackbar("You cannot message yourself about your own product", {
        variant: "info",
      });
      return;
    }

    try {
      // Create a key to identify this specific product contact event
      const contactKey = `contact_${product.userID}_${product.productID}`;

      // Store product context in localStorage for message persistence
      localStorage.setItem(
        "lastProductContext",
        JSON.stringify({
          timestamp: Date.now(),
          productId: product.productID,
          name: product.name,
          price: product.price,
          userID: product.userID,
        })
      );

      console.log(
        "Product contact initiated for:",
        product.name,
        product.productID
      );

      // Check if we've already clicked this button in the last few seconds
      if (clickTracker[contactKey]) {
        console.log("Preventing duplicate Chat with Seller click for:", product.name);
        return;
      }

      // Mark this conversation as initiated to prevent duplicates
      clickTracker[contactKey] = true;

      // Clear the click tracking after a reasonable timeout
      setTimeout(() => {
        delete clickTracker[contactKey];
      }, 5000);

      // Check if we should prevent this message based on our helper
      if (shouldPreventMessage(userId, product.userID, product)) {
        console.log(
          "Message already sent for this product, redirecting without duplicate"
        );
        enqueueSnackbar(
          "You've already contacted this seller about this product",
          {
            variant: "info",
          }
        );

        // Navigate to existing conversation using state instead of query params
        navigate("/messaging/" + product.userID, {
          state: {
            productDetails: {
              id: product.productID,
              productID: product.productID,
              name: product.name,
              price: product.price,
              image: product.image,
              userID: product.userID,
            },
          },
        });
        return;
      }

      // Mark this message as sent to prevent future duplicates
      markMessageSent(userId, product.userID, product);

      // Navigate to messaging page with product info - using state instead of URL params
      navigate("/messaging/" + product.userID, {
        state: {
          productDetails: {
            id: product.productID,
            productID: product.productID,
            name: product.name,
            price: product.price,
            image: product.image,
            userID: product.userID,
          },
        },
      });
    } catch (err) {
      console.error("Error initiating seller contact:", err);
      // Fallback navigation with minimal params using state
      navigate("/messaging/" + product.userID, {
        state: {
          productDetails: {
            id: product.productID,
            productID: product.productID,
          },
        },
      });
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
                src={getFormattedImageUrl(product.image) || "placeholder.jpg"}
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
              onClick={handleChatWithSeller}
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
                <span className="detail-price">
                  ${product.price.toFixed(2)}
                </span>
              </div>
            </div>

            <div className="detail-content">
              <div className="detail-metadata">
                <p className="detail-condition">
                  Condition:{" "}
                  {product.condition?.charAt(0).toUpperCase() +
                    product.condition?.slice(1)}
                </p>
                <p className="detail-status">Status: {product.status}</p>

                {/* Add bundle indicator that only shows if product is a bundle */}
                {product.is_bundle && (
                  <p className="detail-bundle-tag">
                    <FontAwesomeIcon icon={faTag} />
                    <span>Bundle</span>
                  </p>
                )}
              </div>

              <div className="detail-description-section">
                <h3 className="detail-section-title">Description</h3>
                <div
                  className="detail-description"
                  dangerouslySetInnerHTML={{
                    __html: product.description.replace(/\n/g, "<br />"),
                  }}
                ></div>
              </div>
            </div>

            <div className="detail-actions">
              <button
                className="detail-cart-button"
                onClick={handleConfirmPurchase}
              >
                <FontAwesomeIcon icon={faCartShopping} />
                Confirm Purchase
              </button>

              {/* Add Favorite button */}
              <button
                className={`detail-favorite-button ${favorited ? "favorited" : ""
                  }`}
                onClick={handleToggleFavorite}
                aria-label={
                  favorited ? "Remove from favorites" : "Add to favorites"
                }
              >
                <FontAwesomeIcon icon={favorited ? solidHeart : regularHeart} />
                {favorited ? "Remove from Favorites" : "Add to Favorites"}
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
