import React, { useState } from 'react';
import './orderhistory.css';

const OrderHistory = () => {
  // Sample data for ordered and sold items with images
  const [orderedItems, setOrderedItems] = useState([
    { id: 1, name: 'Item A', price: 50, quantity: 2, imageUrl: 'https://via.placeholder.com/50' },
    { id: 2, name: 'Item B', price: 30, quantity: 1, imageUrl: 'https://via.placeholder.com/50' },
    { id: 3, name: 'Item C', price: 100, quantity: 3, imageUrl: 'https://via.placeholder.com/50' }
  ]);
  const [soldItems, setSoldItems] = useState([
    { id: 1, name: 'Item A', price: 60, quantity: 2, imageUrl: 'https://via.placeholder.com/50' },
    { id: 2, name: 'Item B', price: 40, quantity: 1, imageUrl: 'https://via.placeholder.com/50' },
    { id: 3, name: 'Item C', price: 120, quantity: 3, imageUrl: 'https://via.placeholder.com/50' }
  ]);

  // State to track which view to show
  const [showSoldItems, setShowSoldItems] = useState(false);

  // Calculate total spent and total made
  const totalSpent = orderedItems.reduce((total, item) => total + item.price * item.quantity, 0);
  const totalMade = soldItems.reduce((total, item) => total + item.price * item.quantity, 0);

  return (
    <div className="order-history-container">
      <h2>Order History</h2>
      
      <div className="view-toggle">
        <button 
          className={!showSoldItems ? 'active' : ''} 
          onClick={() => setShowSoldItems(false)}
        >
          Purchased Items
        </button>
        <button 
          className={showSoldItems ? 'active' : ''} 
          onClick={() => setShowSoldItems(true)}
        >
          Sold Items
        </button>
      </div>

      <div className="content-section">
        {!showSoldItems ? (
          /* Ordered Items */
          <div className="order-section fade-in">
            <h3>Purchased Items</h3>
            <table>
              <thead>
                <tr>
                  <th>Item Image</th>
                  <th>Item Name</th>
                  <th>Price</th>
                  <th>Quantity</th>
                  <th>Total Cost</th>
                </tr>
              </thead>
              <tbody>
                {orderedItems.map(item => (
                  <tr key={item.id}>
                    <td><img src={item.imageUrl} alt={item.name} className="item-image" /></td>
                    <td>{item.name}</td>
                    <td>${item.price}</td>
                    <td>{item.quantity}</td>
                    <td>${item.price * item.quantity}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="total-spent">
              <strong>Total Spent: </strong>${totalSpent}
            </div>
          </div>
        ) : (
          /* Sold Items */
          <div className="order-section fade-in">
            <h3>Sold Items</h3>
            <table>
              <thead>
                <tr>
                  <th>Item Image</th>
                  <th>Item Name</th>
                  <th>Price</th>
                  <th>Quantity</th>
                  <th>Total Earnings</th>
                </tr>
              </thead>
              <tbody>
                {soldItems.map(item => (
                  <tr key={item.id}>
                    <td><img src={item.imageUrl} alt={item.name} className="item-image" /></td>
                    <td>{item.name}</td>
                    <td>${item.price}</td>
                    <td>{item.quantity}</td>
                    <td>${item.price * item.quantity}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="total-earned">
              <strong>Total Earnings: </strong>${totalMade}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default OrderHistory;
