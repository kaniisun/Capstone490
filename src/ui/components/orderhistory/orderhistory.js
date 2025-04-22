import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { Box, Button } from '@mui/material';
import { supabase } from '../../../supabaseClient';
import './orderhistory.css';
import { useLocation } from 'react-router-dom';

const OrderHistory = () => {
  const location = useLocation();
  const orderData = location.state?.orderData;
  const { user } = useAuth();

  const [purchaseConfirmations, setPurchaseConfirmations] = useState([]);
  const [saleConfirmations, setSaleConfirmations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState([]);
  const [activeView, setActiveView] = useState('purchase-confirmations');
  const [expandedConfirmations, setExpandedConfirmations] = useState({});

  
  useEffect(() => {
    if (orderData) {
      setPurchaseConfirmations(prev => [orderData, ...prev]);
      window.history.replaceState({}, document.title);
    }
  }, [orderData]);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      setLoading(true);
      try {
        // Fetch buyer orders
        const { data: buyerOrders, error: buyerError } = await supabase
          .from('orders')
          .select(`
            *,
            order_items (*, products (name, price, image, users:userID (firstName, lastName)))
          `)
          .eq('buyerid', user.id)
          .order('created_at', { ascending: false });
        if (buyerError) throw buyerError;
        const purchaseConfs = buyerOrders.map(order => ({
          orderId: order.orderid,
          orderDate: new Date(order.created_at).toLocaleDateString(),
          seller: { name: `${order.order_items[0]?.products?.users?.firstName || ''} ${order.order_items[0]?.products?.users?.lastName || ''}`.trim() || 'Seller' },
          shipping: {
            address: order.meetingaddress,
            city: order.meetingcity,
            state: order.meetingstate,
            zipCode: order.meetingzipcode,
            date: order.meetingdate,
            time: order.meetingtime
          },
          payment: { method: order.paymentmethod, status: order.paymentstatus },
          items: order.order_items.map(item => ({
            name: item.products?.name,
            price: item.priceatpurchase,
            quantity: item.quantity,
            productid: item.productid
          })),
          summary: { subtotal: order.totalamount, total: order.totalamount },
          status: order.status
        }));
        setPurchaseConfirmations(purchaseConfs);

        // Fetch seller orders
        const { data: sellerOrders, error: sellerError } = await supabase
          .from('orders')
          .select(`
            *,
            order_items (*, products (name, price, image))
          `)
          .eq('sellerid', user.id)
          .order('created_at', { ascending: false });
        if (sellerError) throw sellerError;
        const buyerIds = sellerOrders.map(o => o.buyerid);
        const { data: buyerData } = await supabase
          .from('users')
          .select('userID, firstName, lastName')
          .in('userID', buyerIds);
        const buyerNameMap = {};
        buyerData.forEach(b => { buyerNameMap[b.userID] = `${b.firstName} ${b.lastName}`; });
        const saleConfs = sellerOrders.map(order => ({
          orderId: order.orderid,
          orderDate: new Date(order.created_at).toLocaleDateString(),
          buyer: { id: order.buyerid, name: buyerNameMap[order.buyerid] || 'Buyer' },
          shipping: {
            address: order.meetingaddress,
            city: order.meetingcity,
            state: order.meetingstate,
            zipCode: order.meetingzipcode,
            date: order.meetingdate,
            time: order.meetingtime
          },
          payment: { method: order.paymentmethod, status: order.paymentstatus },
          items: order.order_items.map(item => ({
            name: item.products?.name,
            price: item.priceatpurchase,
            quantity: item.quantity,
            productid: item.productid
          })),
          summary: { subtotal: order.totalamount, total: order.totalamount },
          status: order.status
        }));
        setSaleConfirmations(saleConfs);

        // Notifications
        const { data: notificationData } = await supabase
          .from('notifications')
          .select('*')
          .eq('userid', user.id)
          .eq('isread', false)
          .order('created_at', { ascending: false });
        setNotifications(notificationData || []);
      } catch (error) {
        console.error('Fetch error:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user]);

  // Handlers
  const handleConfirmOrder = async (orderId) => {
    if (!window.confirm('Confirming will reserve items and set payment to Pending. Proceed?')) return;
    await supabase.from('orders')
      .update({ status: 'confirmed', paymentstatus: 'Pending' })
      .eq('orderid', orderId);

    const saleOrder = saleConfirmations.find(o => o.orderId === orderId);
    if (saleOrder) {
      for (const item of saleOrder.items) {
        await supabase.from('products')
          .update({ status: 'sold', modified_at: new Date().toISOString() })
          .eq('productID', item.productid);
      }
      await supabase.from('notifications').insert([{ 
        userid: saleOrder.buyer.id,
        type: 'order_confirmed',
        title: 'Order Confirmed',
        message: `Your order #${orderId} has been confirmed.`,
        orderid: orderId,
        isread: false
      }]);
    }
    window.location.reload();
  };

  const handleRejectOrder = async (orderId) => {
    if (!window.confirm('Rejecting will cancel and release items back to available. Proceed?')) return;
    await supabase.from('orders')
      .update({ status: 'rejected', paymentstatus: 'Incomplete' })
      .eq('orderid', orderId);

    const saleOrder = saleConfirmations.find(o => o.orderId === orderId);
    if (saleOrder) {
      for (const item of saleOrder.items) {
        await supabase.from('products')
          .update({ status: 'available', modified_at: new Date().toISOString() })
          .eq('productID', item.productid);
      }
      await supabase.from('notifications').insert([{ 
        userid: saleOrder.buyer.id,
        type: 'order_rejected',
        title: 'Order Rejected',
        message: `Your order #${orderId} was rejected. Items are available again.`,
        orderid: orderId,
        isread: false
      }]);
    }
    window.location.reload();
  };

  const handleCancelOrder = async (orderId) => {
    if (!window.confirm('Cancelling will release items back and mark payment as Incomplete. Proceed?')) return;
    await supabase.from('orders')
      .update({ status: 'cancelled', paymentstatus: 'Incomplete' })
      .eq('orderid', orderId);

    const saleOrder = saleConfirmations.find(o => o.orderId === orderId);
    if (saleOrder) {
      for (const item of saleOrder.items) {
        await supabase.from('products')
          .update({ status: 'available', modified_at: new Date().toISOString() })
          .eq('productID', item.productid);
      }
      await supabase.from('notifications').insert([{ 
        userid: saleOrder.buyer.id,
        type: 'order_cancelled',
        title: 'Order Cancelled',
        message: `Your order #${orderId} was cancelled. Items are available again.`,
        orderid: orderId,
        isread: false
      }]);
    }
    window.location.reload();
  };

  const handleCompleteOrder = async (orderId) => {
    if (!window.confirm('Completing will mark as Complete and set payment to Paid. Proceed?')) return;
    await supabase.from('orders')
      .update({ status: 'complete', paymentstatus: 'Paid' })
      .eq('orderid', orderId);
    alert('Order marked Complete and payment set to Paid');
    window.location.reload();
  };

  const markNotificationAsRead = async (id) => {
    await supabase.from('notifications').update({ isread: true }).eq('id', id);
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const toggleConfirmationView = (id) => setExpandedConfirmations(prev => ({ ...prev, [id]: !prev[id] }));

  const renderConfirmationDetails = (c, type) => {
    const expanded = expandedConfirmations[c.orderId];
    return (
      <div className="confirmation-details" key={c.orderId}>
        <div className="confirmation-header">
          <div>
            <h4>{type === 'purchase' ? 'Purchase' : 'Sale'} #{c.orderId}</h4>
            <p className="confirmation-date">Date: {c.orderDate}</p>
            <p className="order-status">Status: <span className={`status-${c.status.toLowerCase()}`}>{c.status}</span></p>
          </div>
        </div> 
        <button onClick={() => toggleConfirmationView(c.orderId)}>{expanded ? 'View Less' : 'View More'}</button>
        <div className={`confirmation-content ${expanded ? 'expanded' : ''}`}>
          <div className="confirmation-basic-info">
            <p className="items-count">{c.items.length} item(s)</p>
            <p className="total-amount">Total: ${c.summary.total.toFixed(2)}</p>
            <p>Payment: <span className={`status-${c.payment.status.toLowerCase()}`}>{c.payment.status}</span></p>
          </div>
          {type === 'sale' && c.status === 'pending_seller_confirmation' && (
            <div className="confirmation-actions">
              <button className="confirm-order-btn" onClick={() => handleConfirmOrder(c.orderId)}>Confirm Order</button>
              <button className="reject-order-btn" onClick={() => handleRejectOrder(c.orderId)}>Reject Order</button>
            </div>
          )}
          {type === 'sale' && c.status === 'confirmed' && (
            <div className="confirmation-actions">
              <button className="confirm-order-btn" onClick={() => handleCompleteOrder(c.orderId)}>Mark as Complete</button>
              <button className="reject-order-btn" onClick={() => handleCancelOrder(c.orderId)}>Cancel Order</button>
            </div>
          )}
          {expanded && (
            <div className="confirmation-details-expanded">
              {type === 'purchase' && (
                <>
                  <h5>Seller Information</h5>
                  <p>{c.seller.name}</p>
                  <h5>Shipping Details</h5>
                  <p>{c.shipping.address}, {c.shipping.city}, {c.shipping.state} {c.shipping.zipCode}</p>
                  <p>Date: {c.shipping.date} Time: {c.shipping.time}</p>
                </>
              )}

              {type === 'sale' && (
                <>
                  <h5>Buyer Information</h5>
                  <p>{c.buyer.name}</p>
                  <h5>Shipping Details</h5>
                  <p>{c.shipping.address}, {c.shipping.city}, {c.shipping.state} {c.shipping.zipCode}</p>
                  <p>Date: {c.shipping.date} Time: {c.shipping.time}</p>
                </>
              )}

              <h5>Items</h5>
              <ul className="items-list">
                {c.items.map((item, idx) => (
                  <li key={idx}>
                    {item.name} x{item.quantity} — ${(item.price * item.quantity).toFixed(2)}
                  </li>
                ))}
              </ul>

              <h5>Payment Details</h5>
              <p>Method: {c.payment.method}</p>
              <p>Status: <span className={`status-${c.payment.status.toLowerCase()}`}>{c.payment.status}</span></p>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="order-history-container">
      {notifications.length > 0 && (
        <div className="notifications-section">
          <h3>Notifications</h3>
          <div className="notifications-list">
            {notifications.map(n => (
              <div className="notification-item">
              <div className="notification-content">
                <h4>{n.title}</h4>
                <p>{n.message}</p>
                <div className="notification-actions">
                  <button className="mark-read-btn" onClick={() => markNotificationAsRead(n.id)}>Mark as Read</button>
                </div>
              </div>
            </div>
            
            ))}
          </div>
        </div>
      )}
       <h2>Order History</h2>
      <div className="view-toggle">
        <button className={activeView === 'purchase-confirmations' ? 'active' : ''} onClick={() => setActiveView('purchase-confirmations')}>Purchase Confirmations</button>
        <button className={activeView === 'sale-confirmations' ? 'active' : ''} onClick={() => setActiveView('sale-confirmations')}>Sale Confirmations</button>
      </div>
      <div className="content-section">
        {activeView === 'purchase-confirmations' && (
          <div className="order-section">
            {loading ? <p>Loading...</p> : purchaseConfirmations.length > 0 ? purchaseConfirmations.map(c => renderConfirmationDetails(c, 'purchase')) : <p>No purchases.</p>}
          </div>
        )}
        {activeView === 'sale-confirmations' && (
          <div className="order-section">
            {loading ? <p>Loading...</p> : saleConfirmations.length > 0 ? saleConfirmations.map(c => renderConfirmationDetails(c, 'sale')) : <p>No sales.</p>}
          </div>
        )}
      </div>
    </div>
  );
};

export default OrderHistory;
