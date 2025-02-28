import React from "react";
import "./cart.css";

export const Cart = () => {
  return (
    <div>
      <div className="cart-container">
        <h1>Your Shopping Cart</h1>
        <div className="cart-items">
          {/* Example product in cart */}
          <div className="cart-item">
            <img src="physics.jpg" alt="Product2" />
            <div className="item-details">
              <h2 className="item-name">Product Name</h2>
              <p className="item-condition">Condition: New</p>
              <p className="item-price">$15.00</p>
              <button className="remove">Remove</button>
            </div>
          </div>
          <div className="cart-item">
            <img src="purse.jpg" alt="Product1" />
            <div className="item-details">
              <h2 className="item-name">Product Name</h2>
              <p className="item-condition">Condition: New</p>
              <p className="item-price">$15.00</p>
              <button className="remove">Remove</button>
            </div>
          </div>
          <div className="cart-item">
            <img src="physics.jpg" alt="Product2" />
            <div className="item-details">
              <h2 className="item-name">Product Name</h2>
              <p className="item-condition">Condition: New</p>
              <p className="item-price">$15.00</p>
              <button className="remove">Remove</button>
            </div>
          </div>
          <div className="cart-item">
            <img src="physics.jpg" alt="Product 3" />
            <div className="item-details">
              <h2 className="item-name">Product Name</h2>
              <p className="item-condition">Condition: New</p>
              <p className="item-price">$15.00</p>
              <button className="remove">Remove</button>
            </div>
          </div>
          {/* Add more products here */}
        </div>
        <div className="cart-summary">
          <h2>Order Summary</h2>
          <p>
            Subtotal: <span className="subtotal">$15.00</span>
          </p>
          <p>
            Tax (5%): <span className="tax">$0.75</span>
          </p>
          <p>
            Shipping: <span className="shipping">$5.00</span>
          </p>
          <p>
            Total Price: <span className="total-price">$20.75</span>
          </p>
          <div className="cart-buttons">
            <button className="checkout">Proceed to Payment</button>
            <button className="continue">Continue Shopping</button>
          </div>
        </div>
      </div>
    </div>
  );
};
