import React, { useState } from 'react';
import { Link } from "react-router-dom";
import './cart.css';

export const Cart = () => {
  // Sample cart items, could be fetched from an API or passed as props
  const [cartItems, setCartItems] = useState([
    { id: 1, name: 'Product 1', price: 15.00, condition: 'New', image: 'physics.jpg' },
    { id: 2, name: 'Product 2', price: 15.00, condition: 'New', image: 'purse.jpg' },
    { id: 3, name: 'Product 3', price: 15.00, condition: 'New', image: 'physics.jpg' },
    { id: 4, name: 'Product 4', price: 15.00, condition: 'New', image: 'physics.jpg' },
  ]);

  const removeItem = (id) => {
    setCartItems(cartItems.filter(item => item.id !== id));
  };

  const calculateSubtotal = () => {
    return cartItems.reduce((total, item) => total + item.price, 0);
  };

  const calculateTax = (subtotal) => {
    return (subtotal * 0.05); // 5% tax
  };

  const calculateShipping = () => {
    return 5.00; // Fixed shipping cost
  };

  const calculateTotal = (subtotal, tax, shipping) => {
    const total = subtotal + tax + shipping;
    return isNaN(total) ? 0 : total.toFixed(2);
  };

  const subtotal = calculateSubtotal();
  const tax = calculateTax(subtotal);
  const shipping = calculateShipping();
  const total = calculateTotal(subtotal, tax, shipping);

  return (
    <div>
      <div className="carts-container">
        <h1>Your Shopping Cart</h1>
        <div className="cart-items">
          {cartItems.map((item) => (
            <div className="cart-item" key={item.id}>
              <img src={item.image} alt={item.name} />
              <div className="item-details">
                <h2 className="item-name">{item.name}</h2>
                <p className="item-condition">Condition: {item.condition}</p>
                <p className="item-price">${item.price.toFixed(2)}</p>
                <button className="remove" onClick={() => removeItem(item.id)}>Remove</button>
              </div>
            </div>
          ))}
        </div>
        <div className="cart-summary">
          <h2>Order Summary</h2>
          <p>
            Subtotal: <span className="subtotal">${subtotal.toFixed(2)}</span>
          </p>
          <p>
            Tax (5%): <span className="tax">${tax.toFixed(2)}</span>
          </p>
          <p>
            Shipping: <span className="shipping">${shipping.toFixed(2)}</span>
          </p>
          <p>
            Total Price: <span className="total-price">${total}</span>
          </p>
          <div className="cart-buttons">

            <Link to="/" className="continue-link">
              <button className="continue">Continue Shopping</button>
            </Link>
            <button className="checkout">Proceed to Payment</button>

            {/* Use Link component for navigation */}
          </div>
        </div>
      </div>
    </div>
  );
};
