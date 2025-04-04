import React, { useState, useEffect } from 'react';
import { useAuth } from "../../../contexts/AuthContext";
import { supabase } from "../../../supabaseClient";
import './orderhistory.css';
import { useLocation } from 'react-router-dom';

const OrderHistory = () => {
  const location = useLocation();
  const orderData = location.state?.orderData;
  const { user } = useAuth();

  // State for orders and items
  const [purchaseConfirmations, setPurchaseConfirmations] = useState([]);
  const [saleConfirmations, setSaleConfirmations] = useState([]);
  const [soldItems, setSoldItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState([]);

  // State to track which view to show
  const [activeView, setActiveView] = useState('purchase-confirmations');

  // Add state to track expanded confirmations
  const [expandedConfirmations, setExpandedConfirmations] = useState({});

  // Handle incoming order data
  useEffect(() => {
    if (orderData) {
      setPurchaseConfirmations(prev => [orderData, ...prev]);
      // Clear the location state to prevent duplicate entries on refresh
      window.history.replaceState({}, document.title);
    }
  }, [orderData]);

  // Fetch orders, sold items, and notifications
  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      setLoading(true);

      try {
        console.log('Fetching data for user:', user.id);

        // Fetch orders where user is buyer
        const { data: buyerOrders, error: buyerError } = await supabase
          .from('orders')
          .select(`
            *,
            order_items (
              *,
              products (
                name,
                price,
                image,
                users:userID (
                  firstName,
                  lastName
                )
              )
            )
          `)
          .eq('buyerid', user.id)
          .order('created_at', { ascending: false });

        if (buyerError) {
          console.error('Error fetching buyer orders:', buyerError);
          throw buyerError;
        }
        console.log('Fetched buyer orders:', buyerOrders);

        // Transform buyer orders into purchase confirmations
        const purchaseConfs = buyerOrders.map(order => ({
          orderId: order.orderid,
          orderDate: new Date(order.created_at).toLocaleDateString(),
          seller: {
            name: `${order.order_items[0]?.products?.users?.firstName || ''} ${order.order_items[0]?.products?.users?.lastName || ''}`.trim() || 'Seller',
            email: 'N/A',
            phone: 'N/A'
          },
          shipping: {
            fullName: order.order_items[0]?.products?.name || 'Product',
            address: order.meetingaddress,
            city: order.meetingcity,
            state: order.meetingstate,
            zipCode: order.meetingzipcode,
            phone: order.meetingphone,
            date: order.meetingdate,
            time: order.meetingtime
          },
          payment: {
            method: order.paymentmethod,
            status: order.paymentstatus,
            zellePhone: order.zellephone
          },
          items: order.order_items.map(item => ({
            name: item.products?.name || 'Product',
            price: item.priceatpurchase,
            quantity: item.quantity,
            productid: item.productid
          })),
          summary: {
            subtotal: order.totalamount,
            shipping: 0,
            total: order.totalamount
          },
          status: order.status
        }));

        setPurchaseConfirmations(purchaseConfs);

        // Fetch orders where user is seller
        const { data: sellerOrders, error: sellerError } = await supabase
          .from('orders')
          .select(`
            *,
            order_items (
              *,
              products (
                name,
                price,
                image
              )
            )
          `)
          .eq('sellerid', user.id)
          .order('created_at', { ascending: false });

        if (sellerError) {
          console.error('Error fetching seller orders:', sellerError);
          throw sellerError;
        }
        console.log('Fetched seller orders:', sellerOrders);

        // Fetch buyer names for seller orders
        const buyerIds = sellerOrders.map(order => order.buyerid);
        const { data: buyerData, error: buyerNamesError } = await supabase
          .from('users')
          .select('userID, firstName, lastName')
          .in('userID', buyerIds);

        if (buyerNamesError) {
          console.error('Error fetching buyer names:', buyerNamesError);
          throw buyerNamesError;
        }

        // Create a map of buyer IDs to their names
        const buyerNameMap = {};
        buyerData.forEach(buyer => {
          buyerNameMap[buyer.userID] = `${buyer.firstName} ${buyer.lastName}`;
        });

        // Transform seller orders into sale confirmations
        const saleConfs = sellerOrders.map(order => ({
          orderId: order.orderid,
          orderDate: new Date(order.created_at).toLocaleDateString(),
          buyer: {
            id: order.buyerid,
            name: buyerNameMap[order.buyerid] || 'Buyer',
            email: 'N/A',
            phone: 'N/A'
          },
          shipping: {
            fullName: order.order_items[0]?.products?.name || 'Product',
            address: order.meetingaddress,
            city: order.meetingcity,
            state: order.meetingstate,
            zipCode: order.meetingzipcode,
            phone: order.meetingphone,
            date: order.meetingdate,
            time: order.meetingtime
          },
          payment: {
            method: order.paymentmethod,
            status: order.paymentstatus,
            zellePhone: order.zellephone
          },
          items: order.order_items.map(item => ({
            name: item.products?.name || 'Product',
            price: item.priceatpurchase,
            quantity: item.quantity,
            productid: item.productid
          })),
          summary: {
            subtotal: order.totalamount,
            shipping: 0,
            total: order.totalamount
          },
          status: order.status
        }));

        setSaleConfirmations(saleConfs);

        // Fetch sold items
        const { data: soldProducts, error: soldError } = await supabase
          .from('products')
          .select('*')
          .eq('status', 'sold')
          .eq('userID', user.id);

        if (soldError) {
          console.error('Error fetching sold products:', soldError);
          throw soldError;
        }
        console.log('Fetched sold products:', soldProducts);
        setSoldItems(soldProducts || []);

        // Fetch notifications
        console.log('Fetching notifications for user:', user.id);
        const { data: notificationData, error: notificationError } = await supabase
          .from('notifications')
          .select('*')
          .eq('userid', user.id)
          .eq('isread', false)
          .order('created_at', { ascending: false });

        if (notificationError) {
          console.error('Error fetching notifications:', notificationError);
          throw notificationError;
        }
        console.log('Fetched notifications:', notificationData);
        setNotifications(notificationData || []);

      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  // Handle seller confirmation
  const handleSellerConfirm = async (orderId, action) => {
    try {
      console.log(`Starting seller ${action} process for order:`, orderId);

      // Update order status based on action
      const newStatus = action === 'confirm' ? 'confirmed' : 'rejected';
      const { error: orderError } = await supabase
        .from('orders')
        .update({
          status: newStatus
        })
        .eq('orderid', orderId);

      if (orderError) {
        console.error('Error updating order status:', orderError);
        throw orderError;
      }
      console.log('Order status updated successfully');

      // Find the order to get product details
      const order = saleConfirmations.find(o => o.orderId === orderId);
      if (!order) {
        throw new Error('Order not found in sale confirmations');
      }

      // If seller confirms the order, update product status to "Sold"
      if (action === 'confirm') {
        // Get all product IDs from the order items
        const productIds = order.items.map(item => item.productid);

        // Update each product's status to "Sold"
        for (const productId of productIds) {
          const { error: productError } = await supabase
            .from('products')
            .update({ status: 'Sold', modified_at: new Date().toISOString() })
            .eq('productID', productId);

          if (productError) {
            console.error('Error updating product status:', productError);
            throw productError;
          }
        }
        console.log('Product status updated to Sold successfully');
      }

      // Create notification for buyer
      const notificationData = {
        userid: order.buyer.id,
        type: action === 'confirm' ? 'order_confirmed' : 'order_rejected',
        title: action === 'confirm' ? 'Order Confirmed' : 'Order Rejected',
        message: action === 'confirm'
          ? `Your order has been confirmed by the seller. Meeting details: ${order.shipping.address}, ${order.shipping.city}, ${order.shipping.state} ${order.shipping.zipCode} on ${order.shipping.date} at ${order.shipping.time}`
          : `Your order has been rejected by the seller.`,
        orderid: orderId,
        isread: false
      };

      const { error: notificationError } = await supabase
        .from('notifications')
        .insert([notificationData]);

      if (notificationError) {
        console.error('Error creating notification:', notificationError);
        throw notificationError;
      }
      console.log('Notification created successfully');

      // Refresh the data
      window.location.reload();
    } catch (error) {
      console.error(`Error in seller ${action} process:`, error);
      alert(`Failed to ${action} order. Please try again.`);
    }
  };

  // Mark notification as read 
  const markNotificationAsRead = async (notificationId) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ isread: true })
        .eq('id', notificationId);

      if (error) throw error;

      // Remove the notification from the list as read
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

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
            <p className="order-status">Status: {confirmation.status}</p>
          </div>
          <button
            className="view-toggle-btn"
            onClick={() => toggleConfirmationView(confirmation.orderId)}
          >
            {isExpanded ? 'View Less' : 'View Full'}
          </button>
        </div>

        <div className={`confirmation-content ${isExpanded ? 'expanded' : ''}`}>
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

          {/* confirmation buttons for pending orders  */}
          {type === 'sale' && confirmation.status === 'pending_seller_confirmation' && (
            <div className="confirmation-actions">
              <button
                className="confirm-order-btn"
                onClick={() => handleSellerConfirm(confirmation.orderId, 'confirm')}
              >
                Confirm Order
              </button>
              <button
                className="reject-order-btn"
                onClick={() => handleSellerConfirm(confirmation.orderId, 'reject')}
              >
                Reject Order
              </button>
            </div>
          )}

          {/* Expanded details */}
          {isExpanded && (
            <div className="confirmation-details-expanded">
              {type === 'purchase' && confirmation.seller && (
                <div className="confirmation-seller">
                  <h5>Seller Information:</h5>
                  <p>{confirmation.seller.name}</p>
                </div>
              )}

              {type === 'sale' && confirmation.buyer && (
                <div className="confirmation-buyer">
                  <h5>Buyer Information:</h5>
                  <p>{confirmation.buyer.name}</p>
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
              </div>

              <div className="confirmation-payment">
                <h5>Payment Details:</h5>
                <p>Method: {confirmation.payment.method}</p>
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

      {/* Notifications Section */}
      {notifications.length > 0 && (
        <div className="notifications-section">
          <h3>Notifications</h3>
          <div className="notifications-list">
            {notifications.map(notification => (
              <div key={notification.id} className="notification-item">
                <div className="notification-content">
                  <h4>{notification.title}</h4>
                  <p>{notification.message}</p>
                </div>
                <button
                  className="mark-read-btn"
                  onClick={() => markNotificationAsRead(notification.id)}
                >
                  Mark as Read
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="view-toggle">
        <button
          className={activeView === 'purchase-confirmations' ? 'active' : ''}
          onClick={() => setActiveView('purchase-confirmations')}
        >
          Purchase Confirmations
        </button>
        <button
          className={activeView === 'sale-confirmations' ? 'active' : ''}
          onClick={() => setActiveView('sale-confirmations')}
        >
          Sale Confirmations
        </button>
      </div>

      <div className="content-section">
        {activeView === 'purchase-confirmations' && (
          <div className="order-section fade-in">
            <h3>Purchase Confirmations</h3>
            <div className="confirmations-container">
              {loading ? (
                <p>Loading orders...</p>
              ) : purchaseConfirmations.length > 0 ? (
                purchaseConfirmations.map(confirmation =>
                  renderConfirmationDetails(confirmation, 'purchase')
                )
              ) : (
                <p className="no-confirmations">No purchase confirmations available</p>
              )}
            </div>
          </div>
        )}

        {activeView === 'sale-confirmations' && (
          <div className="order-section fade-in">
            <h3>Sale Confirmations</h3>
            <div className="confirmations-container">
              {loading ? (
                <p>Loading orders...</p>
              ) : saleConfirmations.length > 0 ? (
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

