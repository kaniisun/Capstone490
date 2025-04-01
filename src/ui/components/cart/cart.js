import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./cart.css";
import { getFormattedImageUrl } from "../../components/ChatSearch/utils/imageUtils";

export const Cart = () => {
  const navigate = useNavigate();
  // Sample cart items, could be fetched from an API or passed as props
  const [cartItems, setCartItems] = useState([
    {
      id: 1,
      name: "Product 1",
      price: 15.0,
      condition: "New",
      image: "physics.jpg",
    },
    {
      id: 2,
      name: "Product 2",
      price: 15.0,
      condition: "New",
      image: "purse.jpg",
    },
    {
      id: 3,
      name: "Product 3",
      price: 15.0,
      condition: "New",
      image: "physics.jpg",
    },
    {
      id: 4,
      name: "Product 4",
      price: 15.0,
      condition: "New",
      image: "physics.jpg",
    },
  ]);

  const removeItem = (id) => {
    setCartItems(cartItems.filter((item) => item.id !== id));
  };

  const calculateSubtotal = () => {
    return cartItems.reduce((total, item) => total + item.price, 0);
  };

  const calculateTax = (subtotal) => {
    return subtotal * 0.05; // 5% tax
  };

  const calculateShipping = () => {
    return cartItems.length > 0 ? 5.0 : 0; // Fixed shipping cost
  };

  const calculateTotal = (subtotal, tax, shipping) => {
    const total = subtotal + tax + shipping;
    return isNaN(total) ? 0 : total.toFixed(2);
  };

  const getTotalItems = () => {
    return cartItems.length;
  };

  const subtotal = calculateSubtotal();
  const tax = calculateTax(subtotal);
  const shipping = calculateShipping();
  const total = calculateTotal(subtotal, tax, shipping);
  const totalItems = getTotalItems();

  return (
    <div className="shopping-cart-page">
      <div className="shopping-cart-container">
        <div className="shopping-cart-header">
          <div className="shopping-cart-header-content">
            <h1>Shopping Cart</h1>
          </div>
        </div>

        <div className="shopping-cart-count-section">
          <span className="shopping-cart-count">
            Cart Total:{" "}
            <span className="shopping-cart-count-badge">{totalItems}</span>
            {totalItems === 1 ? " Item" : " Items"}
          </span>

          <Link to="/home" className="shopping-cart-continue-btn">
            <button className="cart-continue-btn">Continue Shopping</button>
          </Link>
        </div>

        <div className="shopping-cart-content">
          <div className="shopping-cart-products">
            {cartItems.length === 0 ? (
              <div className="shopping-cart-empty">
                <i className="fas fa-shopping-cart"></i>
                <p>Your cart is empty</p>
              </div>
            ) : (
              <div className="shopping-cart-product-list">
                {cartItems.map((item) => (
                  <div className="shopping-cart-product-item" key={item.id}>
                    <div className="shopping-cart-product-image">
                      <img
                        src={getFormattedImageUrl(item.image)}
                        alt={item.name}
                      />
                    </div>
                    <div className="shopping-cart-product-details">
                      <h2>{item.name}</h2>
                      <p className="shopping-cart-product-condition">
                        Condition: {item.condition}
                      </p>
                      <div className="shopping-cart-product-price">
                        ${item.price.toFixed(2)}
                      </div>
                    </div>
                    <button
                      className="shopping-cart-remove-btn"
                      onClick={() => removeItem(item.id)}
                      aria-label="Remove item"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="shopping-cart-summary">
            <h2>Order Summary</h2>
            <div className="shopping-cart-summary-details">
              <div className="shopping-cart-summary-row">
                <span>
                  Subtotal ({totalItems} {totalItems === 1 ? "item" : "items"})
                </span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
              <div className="shopping-cart-summary-row">
                <span>Tax (5%)</span>
                <span>${tax.toFixed(2)}</span>
              </div>
              <div className="shopping-cart-summary-row">
                <span>Shipping</span>
                <span>${shipping.toFixed(2)}</span>
              </div>
              <div className="shopping-cart-summary-total">
                <span>Total</span>
                <span>${total}</span>
              </div>
            </div>
            {/* <div className="shopping-cart-summary-actions">
              <button
                className="shopping-cart-checkout-btn"
                disabled={totalItems === 0}
              >
                Proceed to Checkout
              </button>
            </div> */}

            <div className="shopping-cart-summary-actions">
              <button
                className="shopping-cart-checkout-btn"
                disabled={totalItems === 0}
                onClick={() => {
                  const cartData = {
                    items: cartItems.map((item) => ({
                      name: item.name,
                      price: item.price,
                      quantity: 1, // You might want to add quantity management to cart items
                    })),
                    summary: {
                      subtotal: subtotal,
                      tax: tax,
                      shipping: shipping,
                      total: parseFloat(total),
                    },
                  };
                  navigate("/checkout", { state: { cartData } });
                }}
              >
                Proceed to Checkout
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
