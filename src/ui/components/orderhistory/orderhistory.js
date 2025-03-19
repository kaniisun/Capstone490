import React, { useState, useEffect } from 'react';
import { supabase } from "../../../supabaseClient";
import './orderhistory.css';

const OrderHistory = () => {
  // Sample data for ordered and sold items with images
  const [orderedItems, setOrderedItems] = useState([
    { id: 1, name: 'Item A', price: 50, quantity: 2, imageUrl: 'https://via.placeholder.com/50' },
    { id: 2, name: 'Item B', price: 30, quantity: 1, imageUrl: 'https://via.placeholder.com/50' },
    { id: 3, name: 'Item C', price: 100, quantity: 3, imageUrl: 'https://via.placeholder.com/50' }
  ]);
  
  

  // Updated purchase confirmations state to match checkout data structure
  const [purchaseConfirmations, setPurchaseConfirmations] = useState([]);
  const [saleConfirmations, setSaleConfirmations] = useState([]);

  // State to track which view to show
  const [activeView, setActiveView] = useState('purchased');

  // Add state to track expanded confirmations
  const [expandedConfirmations, setExpandedConfirmations] = useState({});

  // Calculate total spent and total made
  const totalSpent = orderedItems.reduce((total, item) => total + item.price * item.quantity, 0);


  const [soldItems, setSoldItems] = useState([]);
  const [loading, setLoading] = useState(true);

  // Function to load purchase confirmations from localStorage
  useEffect(() => {
    const fetchSoldItems = async () => {
      try {
        const { data, error } = await supabase
          .from("products") // Change this to your actual table name
          .select("*")
          .eq("status", "Sold");
  
        if (error) throw error;
        setSoldItems(data || []);
      } catch (error) {
        console.error("Error fetching sold items:", error.message);
      } finally {
        setLoading(false);
      }
    };
  
    fetchSoldItems();
  }, []);


  // Toggle expanded state for a confirmation
  const toggleConfirmationView = (orderId) => {
    setExpandedConfirmations(prev => ({
      ...prev,
      [orderId]: !prev[orderId]
    }));
  };

  const renderConfirmationDetails = (confirmation, type) => {
    const isExpanded = expandedConfirmations[confirmation.orderId];

    return (
      <div className="confirmation-details" key={confirmation.orderId}>
        <div className="confirmation-header">
          <div className="confirmation-header-content">
            <h4>{type === 'purchase' ? 'Purchase' : 'Sale'} #{confirmation.orderId}</h4>
            <p className="confirmation-date">Date: {confirmation.orderDate}</p>
          </div>
          <button 
            className="view-toggle-btn"
            onClick={() => toggleConfirmationView(confirmation.orderId)}
          >
            {isExpanded ? 'View Less' : 'View Full'}
          </button>
        </div>

        <div className={`confirmation-content ${isExpanded ? 'expanded' : ''}`}>
          {/* Always show basic information */}
          <div className="confirmation-basic-info">
            <div className="items-summary">
              <p className="items-count">{confirmation.items.length} item(s)</p>
              <p className="total-amount">Total: ${confirmation.summary.total.toFixed(2)}</p>
            </div>
            <p className="payment-status">
              Payment: <span className={`status-${confirmation.payment.status.toLowerCase()}`}>
                {confirmation.payment.status}
              </span>
            </p>
          </div>

          {/* Show detailed information only when expanded */}
          {isExpanded && (
            <div className="confirmation-details-expanded">
              {type === 'purchase' && confirmation.seller && (
                <div className="confirmation-seller">
                  <h5>Seller Information:</h5>
                  <p>{confirmation.seller.name}</p>
                  <p>Email: {confirmation.seller.email}</p>
                  <p>Phone: {confirmation.seller.phone}</p>
                </div>
              )}

              {type === 'sale' && confirmation.shipping && (
                <div className="confirmation-buyer">
                  <h5>Buyer Information:</h5>
                  <p>{confirmation.shipping.fullName}</p>
                  <p>{confirmation.shipping.address}</p>
                  <p>{confirmation.shipping.city}, {confirmation.shipping.state} {confirmation.shipping.zipCode}</p>
                  <p>Phone: {confirmation.shipping.phone}</p>
                </div>
              )}

              <div className="confirmation-items">
                <h5>Items:</h5>
                <div className="items-list">
                  {confirmation.items.map((item, index) => (
                    <div key={index} className="confirmation-item">
                      <div className="item-details">
                        <span className="item-name">{item.name}</span>
                        <span className="item-quantity">x{item.quantity}</span>
                      </div>
                      <span className="item-total">${(item.price * item.quantity).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
                <div className="confirmation-total">
                  <span>Total:</span>
                  <span>${confirmation.summary.total.toFixed(2)}</span>
                </div>
              </div>

              <div className="confirmation-payment">
                <h5>Payment Details:</h5>
                <p>Method: {confirmation.payment.method}</p>
                <p>Status: <span className={`status-${confirmation.payment.status.toLowerCase()}`}>
                  {confirmation.payment.status}
                </span></p>
                {confirmation.payment.zellePhone && (
                  <p>Zelle Phone: {confirmation.payment.zellePhone}</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="order-history-container">
      <h2>Order History</h2>
      
      <div className="view-toggle">
        <button 
          className={activeView === 'purchased' ? 'active' : ''} 
          onClick={() => setActiveView('purchased')}
        >
          Purchased Items
        </button>
        <button 
          className={activeView === 'purchase-confirmations' ? 'active' : ''} 
          onClick={() => setActiveView('purchase-confirmations')}
        >
          Purchase Confirmations
        </button>
        <button 
          className={activeView === 'sold' ? 'active' : ''} 
          onClick={() => setActiveView('sold')}
        >
          Sold Items
        </button>
        <button 
          className={activeView === 'sale-confirmations' ? 'active' : ''} 
          onClick={() => setActiveView('sale-confirmations')}
        >
          Sale Confirmations
        </button>
      </div>

      <div className="content-section">
        {activeView === 'purchased' && (
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
                    <td><img src={item.image} alt={item.name} className="item-image" /></td>
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
        )}

        {activeView === 'purchase-confirmations' && (
          <div className="order-section fade-in">
            <h3>Purchase Confirmations</h3>
            <div className="confirmations-container">
              {purchaseConfirmations.length > 0 ? (
                purchaseConfirmations.map(confirmation => 
                  renderConfirmationDetails(confirmation, 'purchase')
                )
              ) : (
                <p className="no-confirmations">No purchase confirmations available</p>
              )}
            </div>
          </div>
        )}

{activeView === 'sold' && (
  <div className="order-section fade-in">
    <h3>Sold Items</h3>
    {loading ? (
      <p>Loading sold items...</p>
    ) : soldItems.length > 0 ? (
      <>
        <table>
          <thead>
            <tr>
              <th>Item Image</th>
              <th>Item Name</th>
              <th>Price</th>
              <th>Date</th>

            </tr>
          </thead>
          <tbody>
            {soldItems.map(item => (
              <tr key={item.id}>
                <td><img src={item.image || "https://via.placeholder.com/50"} alt={item.name} className="item-image" /></td>
                <td>{item.name}</td>
                <td>${item.price.toFixed(2)}</td>
                <td>{new Date(item.modified_at).toLocaleDateString("en-US")}</td>
                </tr>
            ))}
          </tbody>
        </table>
        <div className="total-earned">
          <strong>Total Earnings: </strong>$
          {soldItems.reduce((total, item) => total + item.price, 0).toFixed(2)}
        </div>
      </>
    ) : (
      <p>No sold items found.</p>
    )}
  </div>
)}


        {activeView === 'sale-confirmations' && (
          <div className="order-section fade-in">
            <h3>Sale Confirmations</h3>
            <div className="confirmations-container">
              {saleConfirmations.length > 0 ? (
                saleConfirmations.map(confirmation => 
                  renderConfirmationDetails(confirmation, 'sale')
                )
              ) : (
                <p className="no-confirmations">No sale confirmations available</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default OrderHistory;

