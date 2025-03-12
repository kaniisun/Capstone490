import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from "react-router-dom";
import './checkout.css';

/**
 * @typedef {Object} FormErrors
 * @property {string} [fullName]
 * @property {string} [address]
 * @property {string} [city]
 * @property {string} [state]
 * @property {string} [zipCode]
 * @property {string} [phone]
 * @property {string} [payment]
 */

const Checkout = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const cartData = location.state?.cartData;

    const [showZelleInfo, setShowZelleInfo] = useState(false);
    const [showCashInfo, setShowCashInfo] = useState(false);
    /** @type {[FormErrors, React.Dispatch<React.SetStateAction<FormErrors>>]} */
    const [formErrors, setFormErrors] = useState({});
    const [formData, setFormData] = useState({
        fullName: '',
        address: '',
        city: '',
        state: '',
        zipCode: '',
        phone: ''
    });

    // Use cart data if available, otherwise use sample data
    const orderSummary = cartData || {
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

    const validateForm = () => {
        const errors = {};

        // Validate shipping information
        if (!formData.fullName.trim()) errors.fullName = 'Full name is required';
        if (!formData.address.trim()) errors.address = 'Address is required';
        if (!formData.city.trim()) errors.city = 'City is required';
        if (!formData.state.trim()) errors.state = 'State is required';
        if (!formData.zipCode.trim()) errors.zipCode = 'ZIP code is required';
        if (!formData.phone.trim()) errors.phone = 'Phone number is required';

        // Validate payment method
        if (!showZelleInfo && !showCashInfo) errors.payment = 'Please select a payment method';

        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prevState => ({
            ...prevState,
            [name]: value
        }));
        // Clear error when user starts typing
        if (formErrors[name]) {
            setFormErrors(prev => ({
                ...prev,
                [name]: undefined
            }));
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        
        // Validate form
        const newErrors = {};
        if (!formData.fullName) newErrors.fullName = 'Full name is required';
        if (!formData.address) newErrors.address = 'Address is required';
        if (!formData.city) newErrors.city = 'City is required';
        if (!formData.state) newErrors.state = 'State is required';
        if (!formData.zipCode) newErrors.zipCode = 'ZIP code is required';
        if (!formData.phone) newErrors.phone = 'Phone number is required';
        if (!showZelleInfo && !showCashInfo) newErrors.payment = 'Payment method is required';
        
        setFormErrors(newErrors);
        
        if (Object.keys(newErrors).length === 0) {
            const completeOrderData = {
                orderId: 'ORD-' + Math.random().toString(36).substr(2, 9).toUpperCase(),
                orderDate: new Date().toLocaleDateString(),
                seller: cartData?.seller || {
                    name: 'Default Seller',
                    email: 'seller@example.com',
                    phone: '(555) 123-4567'
                },
                shipping: formData,
                payment: {
                    method: showZelleInfo ? 'Zelle' : 'Cash',
                    status: 'Pending',
                    zellePhone: showZelleInfo ? '+1 (555) 123-4567' : undefined
                },
                items: orderSummary.items,
                summary: {
                    subtotal: orderSummary.summary.subtotal,
                    shipping: orderSummary.summary.shipping,
                    tax: orderSummary.summary.tax,
                    total: orderSummary.summary.total
                }
            };

            // Save to localStorage
            const savedPurchases = localStorage.getItem('purchaseConfirmations');
            const purchases = savedPurchases ? JSON.parse(savedPurchases) : [];
            purchases.unshift(completeOrderData); // Add new order at the beginning
            localStorage.setItem('purchaseConfirmations', JSON.stringify(purchases));

            // If this is a sale, also save to sale confirmations
            if (cartData?.isSeller) {
                const savedSales = localStorage.getItem('saleConfirmations');
                const sales = savedSales ? JSON.parse(savedSales) : [];
                sales.unshift(completeOrderData);
                localStorage.setItem('saleConfirmations', JSON.stringify(sales));
            }

            navigate('/orderconfirmation', { state: { orderData: completeOrderData } });
        }
    };

    const handlePaymentMethodClick = (method) => {
        if (method === 'zelle') {
            setShowZelleInfo(true);
            setShowCashInfo(false);
        } else if (method === 'cash') {
            setShowCashInfo(true);
            setShowZelleInfo(false);
        }
        // Clear payment error when a method is selected
        if (formErrors.payment) {
            setFormErrors(prev => ({
                ...prev,
                payment: undefined
            }));
        }
    };

    return (
        <div className="checkout-container">
            <div className="checkout-left">
                <h2>Shipping Information</h2>
                <form onSubmit={handleSubmit} className="shipping-form">
                    <div className="form-group">
                        <label htmlFor="fullName">Full Name</label>
                        <input
                            type="text"
                            id="fullName"
                            name="fullName"
                            value={formData.fullName}
                            onChange={handleInputChange}
                            className={formErrors.fullName ? 'error' : ''}
                            required
                        />
                        {formErrors.fullName && <div className="error-message">{formErrors.fullName}</div>}
                    </div>
                    <div className="form-group">
                        <label htmlFor="address">Street Address</label>
                        <input
                            type="text"
                            id="address"
                            name="address"
                            value={formData.address}
                            onChange={handleInputChange}
                            className={formErrors.address ? 'error' : ''}
                            required
                        />
                        {formErrors.address && <div className="error-message">{formErrors.address}</div>}
                    </div>
                    <div className="form-row">
                        <div className="form-group">
                            <label htmlFor="city">City</label>
                            <input
                                type="text"
                                id="city"
                                name="city"
                                value={formData.city}
                                onChange={handleInputChange}
                                className={formErrors.city ? 'error' : ''}
                                required
                            />
                            {formErrors.city && <div className="error-message">{formErrors.city}</div>}
                        </div>
                        <div className="form-group">
                            <label htmlFor="state">State</label>
                            <input
                                type="text"
                                id="state"
                                name="state"
                                value={formData.state}
                                onChange={handleInputChange}
                                className={formErrors.state ? 'error' : ''}
                                required
                            />
                            {formErrors.state && <div className="error-message">{formErrors.state}</div>}
                        </div>
                        <div className="form-group">
                            <label htmlFor="zipCode">ZIP Code</label>
                            <input
                                type="text"
                                id="zipCode"
                                name="zipCode"
                                value={formData.zipCode}
                                onChange={handleInputChange}
                                className={formErrors.zipCode ? 'error' : ''}
                                required
                            />
                            {formErrors.zipCode && <div className="error-message">{formErrors.zipCode}</div>}
                        </div>
                    </div>
                    <div className="form-group">
                        <label htmlFor="phone">Phone Number</label>
                        <input
                            type="tel"
                            id="phone"
                            name="phone"
                            value={formData.phone}
                            onChange={handleInputChange}
                            className={formErrors.phone ? 'error' : ''}
                            required
                        />
                        {formErrors.phone && <div className="error-message">{formErrors.phone}</div>}
                    </div>
                </form>
            </div>

            <div className="checkout-right">
                <div className="order-summary">
                    <h2>Order Summary</h2>
                    <div className="order-items">
                        {orderSummary.items.map((item, index) => (
                            <div key={index} className="order-item">
                                <span>{item.name} x{item.quantity}</span>
                                <span>${(item.price * item.quantity).toFixed(2)}</span>
                            </div>
                        ))}
                    </div>
                    <div className="order-totals">
                        <div className="subtotal">
                            <span>Subtotal</span>
                            <span>${orderSummary.summary.subtotal.toFixed(2)}</span>
                        </div>
                        <div className="shipping">
                            <span>Shipping</span>
                            <span>${orderSummary.summary.shipping.toFixed(2)}</span>
                        </div>
                        {orderSummary.summary.tax && (
                            <div className="tax">
                                <span>Tax</span>
                                <span>${orderSummary.summary.tax.toFixed(2)}</span>
                            </div>
                        )}
                        <div className="total">
                            <span>Total</span>
                            <span>${orderSummary.summary.total.toFixed(2)}</span>
                        </div>
                    </div>
                </div>

                <div className="payment-section">
                    <h3>Select Payment Method</h3>
                    {formErrors.payment && <div className="error-message payment-error">{formErrors.payment}</div>}
                    <div className="payment-buttons">
                        <button
                            type="button"
                            className={`payment-button zelle-button ${showZelleInfo ? 'active' : ''}`}
                            onClick={() => handlePaymentMethodClick('zelle')}
                        >
                            Pay with Zelle
                        </button>
                        <button
                            type="button"
                            className={`payment-button cash-button ${showCashInfo ? 'active' : ''}`}
                            onClick={() => handlePaymentMethodClick('cash')}
                        >
                            Pay with Cash
                        </button>
                    </div>

                    {showZelleInfo && (
                        <div className="payment-info zelle-info">
                            <p>Send payment to:</p>
                            <p className="zelle-phone">+1 (555) 123-4567</p>
                            <p className="zelle-note">Please include your order number in the payment note</p>
                        </div>
                    )}

                    {showCashInfo && (
                        <div className="payment-info cash-info">
                            <p>Cash Payment Details:</p>
                            <p className="cash-instructions">Please have exact change ready for delivery</p>
                            <p className="cash-note">Our delivery person will collect the payment upon arrival</p>
                        </div>
                    )}

                    <button className="checkout-button" onClick={handleSubmit}>
                        Complete Checkout
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Checkout;
