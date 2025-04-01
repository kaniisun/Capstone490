import React from 'react';
import { useLocation } from 'react-router-dom';
import './orderconfirmation.css';

const OrderConfirmation = () => {
    const location = useLocation();
    const orderData = location.state?.orderData;

    // Default order data if none is provided
    const defaultOrderData = {
        orderId: 'ORD-' + Math.random().toString(36).substr(2, 9).toUpperCase(),
        orderDate: new Date().toLocaleDateString(),
        seller: {
            name: 'Jane Smith',
            email: 'jane.smith@example.com',
            phone: '(555) 987-6543'
        },
        shipping: {
            fullName: 'John Doe',
            address: '123 Main St',
            city: 'Anytown',
            state: 'ST',
            zipCode: '12345',
            phone: '(555) 123-4567'
        },
        payment: {
            method: 'Zelle', // or 'Cash'
            status: 'Pending',
            zellePhone: '+1 (555) 123-4567' // Only if payment method is Zelle
        },
        items: [
            { name: 'Item 1', price: 29.99, quantity: 1 },
            { name: 'Item 2', price: 49.99, quantity: 2 }
        ],
        summary: {
            subtotal: 129.97,
            shipping: 5.99,
            total: 135.96
        }
    };

    const data = orderData || defaultOrderData;

    return (
        <div className="order-confirmation-container">
            <div className="order-confirmation-header">
                <div className="success-checkmark">✓</div>
                <h1>Order Confirmed!</h1>
                <p className="order-id">Order ID: {data.orderId}</p>
                <p className="order-date">Order Date: {data.orderDate}</p>
            </div>

            <div className="order-confirmation-content">
                {data.seller && (
                    <div className="confirmation-section seller-details">
                        <h2>Seller Information</h2>
                        <div className="details-content">
                            <p className="name">{data.seller.name}</p>
                            <p className="email">Email: {data.seller.email}</p>
                            <p className="phone">Phone: {data.seller.phone}</p>
                        </div>
                    </div>
                )}

                <div className="confirmation-section shipping-details">
                    <h2>Shipping Details</h2>
                    <div className="details-content">
                        <p className="name">{data.shipping.fullName}</p>
                        <p className="address">{data.shipping.address}</p>
                        <p className="city-state">
                            {data.shipping.city}, {data.shipping.state} {data.shipping.zipCode}
                        </p>
                        <p className="phone">Phone: {data.shipping.phone}</p>
                    </div>
                </div>

                <div className="confirmation-section payment-details">
                    <h2>Payment Information</h2>
                    <div className="details-content">
                        <p className="payment-method">
                            Method: <span className="highlight">{data.payment.method}</span>
                        </p>
                        <p className="payment-status">
                            Status: <span className={`status-${data.payment.status.toLowerCase()}`}>
                                {data.payment.status}
                            </span>
                        </p>
                        {data.payment.method === 'Zelle' && (
                            <div className="zelle-details">
                                <p>Please send payment to:</p>
                                <p className="zelle-phone">{data.payment.zellePhone}</p>
                                <p className="payment-note">Include order ID: {data.orderId}</p>
                            </div>
                        )}
                        {data.payment.method === 'Cash' && (
                            <div className="cash-details">
                                <p>Please have exact change ready</p>
                                <p className="payment-note">Amount due upon delivery: ${data.summary.total}</p>
                            </div>
                        )}
                    </div>
                </div>

                <div className="confirmation-section order-details">
                    <h2>Order Summary</h2>
                    <div className="details-content">
                        <div className="order-items">
                            {data.items.map((item, index) => (
                                <div key={index} className="order-item">
                                    <div className="item-info">
                                        <span className="item-name">{item.name}</span>
                                        <span className="item-quantity">x{item.quantity}</span>
                                    </div>
                                    <span className="item-price">
                                        ${(item.price * item.quantity).toFixed(2)}
                                    </span>
                                </div>
                            ))}
                        </div>
                        <div className="order-totals">
                            <div className="subtotal">
                                <span>Subtotal</span>
                                <span>${data.summary.subtotal}</span>
                            </div>
                            <div className="shipping">
                                <span>Shipping</span>
                                <span>${data.summary.shipping}</span>
                            </div>
                            <div className="total">
                                <span>Total</span>
                                <span>${data.summary.total}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="order-confirmation-footer">
                <p>Thank you for your order!</p>
                <p className="contact-support">
                    If you have any questions, please contact our support team
                </p>
            </div>
        </div>
    );
};

export default OrderConfirmation;
