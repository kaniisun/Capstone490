import React, { useState, useEffect } from 'react';
import { supabase } from "../../../supabaseClient";
import './orderhistory.css';

const OrderHistory = () => {
  // Sample data for ordered items with images (keep this static)
  const [orderedItems, setOrderedItems] = useState([
    { id: 1, name: 'Item A', price: 50, quantity: 2, imageUrl: 'https://via.placeholder.com/50' },
    { id: 2, name: 'Item B', price: 30, quantity: 1, imageUrl: 'https://via.placeholder.com/50' },
    { id: 3, name: 'Item C', price: 100, quantity: 3, imageUrl: 'https://via.placeholder.com/50' }
  ]);

  const [soldItems, setSoldItems] = useState([]);
  const [loading, setLoading] = useState(true);



  // Load sold items from the database
  useEffect(() => {
    const fetchSoldItems = async () => {
      try {
        const { data, error } = await supabase
          .from("products") 
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

  // Updated purchase confirmations state to match checkout data structure
  const [purchaseConfirmations, setPurchaseConfirmations] = useState([]);
  const [saleConfirmations, setSaleConfirmations] = useState([]);

  // State to track which view to show
  const [activeView, setActiveView] = useState('purchased');

  // Add state to track expanded confirmations
  const [expandedConfirmations, setExpandedConfirmations] = useState({});

  // Calculate total spent and total made dynamically
  const totalSpent = orderedItems.reduce((total, item) => total + item.price * item.quantity, 0);
  const totalMade = soldItems.reduce((total, item) => total + item.price, 0).toFixed(2);


  // Toggle expanded state for a confirmation
  const toggleConfirmationView = (orderId) => {
    setExpandedConfirmations(prev => ({
      ...prev,
      [orderId]: !prev[orderId]
    }));
  };

  return (
    <div className="order-history-container">
      <h2>Order History</h2>
      
      <div className="view-toggle">
        <button className={activeView === 'purchased' ? 'active' : ''} onClick={() => setActiveView('purchased')}>
          Purchased Items
        </button>
        <button className={activeView === 'purchase-confirmations' ? 'active' : ''} onClick={() => setActiveView('purchase-confirmations')}>
          Purchase Confirmations
        </button>
        <button className={activeView === 'sold' ? 'active' : ''} onClick={() => setActiveView('sold')}>
          Sold Items
        </button>
        <button className={activeView === 'sale-confirmations' ? 'active' : ''} onClick={() => setActiveView('sale-confirmations')}>
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
              <strong>Total Spent: </strong>${totalSpent.toFixed(2)}
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
                      <th>Sold Date</th>
                     
                    </tr>
                  </thead>
                  <tbody>
                    {soldItems.map(item => (
                      <tr key={item.id}>
                        <td><img src={item.image || "https://via.placeholder.com/50"} alt={item.name} className="item-image" /></td>
                        <td>{item.name}</td>
                        <td>${item.price.toFixed(2)}</td>
                        <td>{new Date(item.modified_at).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="total-earned">
                <strong>Total Earnings: </strong>${totalMade}
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
                saleConfirmations.map(confirmation => (
                  <div key={confirmation.orderId}>
                    <h4>Sale #{confirmation.orderId}</h4>
                    <p>Date: {confirmation.orderDate}</p>
                  </div>
                ))
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
