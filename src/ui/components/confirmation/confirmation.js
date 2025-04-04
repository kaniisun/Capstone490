import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../../../supabaseClient';
import { useAuth } from '../../../contexts/AuthContext';
import './confirmation.css';

/**
 * @typedef {Object} FormData
 * @property {string} meetingAddress
 * @property {string} meetingCity
 * @property {string} meetingState
 * @property {string} meetingZipCode
 * @property {string} meetingPhone
 * @property {string} meetingDate
 * @property {string} meetingTime
 * @property {string} paymentMethod
 */

/**
 * @typedef {Object} FormErrors
 * @property {string} [meetingAddress]
 * @property {string} [meetingCity]
 * @property {string} [meetingState]
 * @property {string} [meetingZipCode]
 * @property {string} [meetingPhone]
 * @property {string} [meetingDate]
 * @property {string} [meetingTime]
 * @property {string} [payment]
 */

const Confirmation = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { user } = useAuth();
    const product = location.state?.product;
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);

    /** @type {[FormData, React.Dispatch<React.SetStateAction<FormData>>]} */
    const [formData, setFormData] = useState({
        meetingAddress: '',
        meetingCity: '',
        meetingState: '',
        meetingZipCode: '',
        meetingPhone: '',
        meetingDate: '',
        meetingTime: '',
        paymentMethod: ''
    });
    /** @type {[FormErrors, React.Dispatch<React.SetStateAction<FormErrors>>]} */
    const [formErrors, setFormErrors] = useState({});
    const [showCashInfo, setShowCashInfo] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Log initial data
    useEffect(() => {
        console.log('Confirmation component mounted');
        console.log('Location state:', location.state);
        console.log('User:', user);
        console.log('Product:', product);
    }, [user, product, location.state]);

    // Redirect if not logged in
    if (!user) {
        console.log('No user found, redirecting to login');
        navigate('/login');
        return null;
    }

    // Redirect if no product data
    if (!product) {
        console.error('No product data found in location state');
        navigate('/');
        return null;
    }

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
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

    const handlePaymentMethodClick = (method) => {
        setShowCashInfo(method === 'Cash');
        setFormData(prev => ({ ...prev, paymentMethod: method }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError(null);
        setSuccess(false);

        // Validate form for buyer
        const newErrors = {};
        if (!formData.meetingAddress) newErrors.meetingAddress = 'Meeting address is required';
        if (!formData.meetingCity) newErrors.meetingCity = 'City is required';
        if (!formData.meetingState) newErrors.meetingState = 'State is required';
        if (!formData.meetingZipCode) newErrors.meetingZipCode = 'ZIP code is required';
        if (!formData.meetingPhone) newErrors.meetingPhone = 'Phone number is required';
        if (!formData.meetingDate) newErrors.meetingDate = 'Meeting date is required';
        if (!formData.meetingTime) newErrors.meetingTime = 'Meeting time is required';
        if (!formData.paymentMethod) newErrors.payment = 'Payment method is required';

        setFormErrors(newErrors);

        if (Object.keys(newErrors).length === 0) {
            try {
                console.log('Starting order creation process...');
                console.log('Current user:', user);
                console.log('Product data:', product);

                // Create order
                const orderInputData = {
                    buyerid: user.id,
                    sellerid: product.sellerID,
                    status: 'pending_seller_confirmation',
                    paymentmethod: formData.paymentMethod,
                    paymentstatus: 'Pending',
                    meetingaddress: formData.meetingAddress,
                    meetingcity: formData.meetingCity,
                    meetingstate: formData.meetingState,
                    meetingzipcode: formData.meetingZipCode,
                    meetingphone: formData.meetingPhone,
                    meetingdate: formData.meetingDate,
                    meetingtime: formData.meetingTime,
                    totalamount: product.price
                };
                console.log('Creating order with data:', orderInputData);

                const { data: orderData, error: orderError } = await supabase
                    .from('orders')
                    .insert([orderInputData])
                    .select()
                    .single();

                if (orderError) {
                    console.error('Error creating order:', orderError);
                    throw orderError;
                }
                console.log('Order created successfully:', orderData);

                // Create order item
                const orderItemData = {
                    orderid: orderData.orderid,
                    productid: product.productID,
                    quantity: 1,
                    priceatpurchase: product.price
                };
                console.log('Creating order item with data:', orderItemData);

                const { error: itemError } = await supabase
                    .from('order_items')
                    .insert([orderItemData]);

                if (itemError) {
                    console.error('Error creating order item:', itemError);
                    throw itemError;
                }
                console.log('Order item created successfully');

                // Create notification for seller side
                const notificationData = {
                    userid: product.sellerID,
                    type: 'order_confirmation',
                    title: 'New Order Confirmation Required',
                    message: `A buyer has confirmed purchase of your product "${product.name}". Please review and confirm the order.`,
                    orderid: orderData.orderid,
                    isread: false
                };
                console.log('Creating notification for seller:', notificationData);

                const { error: notificationError } = await supabase
                    .from('notifications')
                    .insert([notificationData]);

                if (notificationError) {
                    console.error('Error creating notification:', notificationError);
                    throw notificationError;
                }
                console.log('Notification created successfully');

                setSuccess(true);
                // Wait a moment to show success message before navigating
                setTimeout(() => {
                    navigate('/orderhistory', {
                        state: {
                            orderData: {
                                orderId: orderData.orderid,
                                orderDate: new Date().toLocaleDateString(),
                                seller: {
                                    name: product.sellerName || 'Seller',
                                },
                                shipping: {
                                    fullName: product.name,
                                    address: formData.meetingAddress,
                                    city: formData.meetingCity,
                                    state: formData.meetingState,
                                    zipCode: formData.meetingZipCode,
                                    phone: formData.meetingPhone,
                                    date: formData.meetingDate,
                                    time: formData.meetingTime
                                },
                                payment: {
                                    method: formData.paymentMethod,
                                    status: 'Pending'
                                },
                                items: [{
                                    name: product.name,
                                    price: product.price,
                                    quantity: 1
                                }],
                                summary: {
                                    subtotal: product.price,
                                    shipping: 0,
                                    total: product.price
                                }
                            }
                        }
                    });
                }, 1500);

            } catch (error) {
                console.error('Error in confirmation process:', error);
                setError(error.message || 'An error occurred during confirmation');
            } finally {
                setIsSubmitting(false);
            }
        } else {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="confirmation-container">
            {error && (
                <div className="error-message">
                    {error}
                </div>
            )}
            {success && (
                <div className="success-message">
                    Order created successfully! Redirecting to order history...
                </div>
            )}
            <div className="confirmation-header">
                <h2>Confirm Purchase</h2>
                <div className="product-summary">
                    <img src={product.image} alt={product.name} className="product-image" />
                    <div className="product-info">
                        <h3>{product.name}</h3>
                        <p className="price">${product.price.toFixed(2)}</p>
                    </div>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="confirmation-form">
                <div className="form-section">
                    <h3>Meeting Details</h3>
                    <div className="form-group">
                        <label htmlFor="meetingAddress">Meeting Address</label>
                        <input
                            type="text"
                            id="meetingAddress"
                            name="meetingAddress"
                            value={formData.meetingAddress}
                            onChange={handleInputChange}
                            className={formErrors.meetingAddress ? 'error' : ''}
                            placeholder="Enter meeting address"
                        />
                        {formErrors.meetingAddress && (
                            <div className="error-message">{formErrors.meetingAddress}</div>
                        )}
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label htmlFor="meetingCity">City</label>
                            <input
                                type="text"
                                id="meetingCity"
                                name="meetingCity"
                                value={formData.meetingCity}
                                onChange={handleInputChange}
                                className={formErrors.meetingCity ? 'error' : ''}
                                placeholder="Enter city"
                            />
                            {formErrors.meetingCity && (
                                <div className="error-message">{formErrors.meetingCity}</div>
                            )}
                        </div>

                        <div className="form-group">
                            <label htmlFor="meetingState">State</label>
                            <input
                                type="text"
                                id="meetingState"
                                name="meetingState"
                                value={formData.meetingState}
                                onChange={handleInputChange}
                                className={formErrors.meetingState ? 'error' : ''}
                                placeholder="Enter state"
                            />
                            {formErrors.meetingState && (
                                <div className="error-message">{formErrors.meetingState}</div>
                            )}
                        </div>

                        <div className="form-group">
                            <label htmlFor="meetingZipCode">ZIP Code</label>
                            <input
                                type="text"
                                id="meetingZipCode"
                                name="meetingZipCode"
                                value={formData.meetingZipCode}
                                onChange={handleInputChange}
                                className={formErrors.meetingZipCode ? 'error' : ''}
                                placeholder="Enter ZIP code"
                            />
                            {formErrors.meetingZipCode && (
                                <div className="error-message">{formErrors.meetingZipCode}</div>
                            )}
                        </div>
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label htmlFor="meetingPhone">Phone Number</label>
                            <input
                                type="tel"
                                id="meetingPhone"
                                name="meetingPhone"
                                value={formData.meetingPhone}
                                onChange={handleInputChange}
                                className={formErrors.meetingPhone ? 'error' : ''}
                                placeholder="Enter phone number"
                            />
                            {formErrors.meetingPhone && (
                                <div className="error-message">{formErrors.meetingPhone}</div>
                            )}
                        </div>

                        <div className="form-group">
                            <label htmlFor="meetingDate">Meeting Date</label>
                            <input
                                type="date"
                                id="meetingDate"
                                name="meetingDate"
                                value={formData.meetingDate}
                                onChange={handleInputChange}
                                className={formErrors.meetingDate ? 'error' : ''}
                                min={new Date().toISOString().split('T')[0]}
                            />
                            {formErrors.meetingDate && (
                                <div className="error-message">{formErrors.meetingDate}</div>
                            )}
                        </div>

                        <div className="form-group">
                            <label htmlFor="meetingTime">Meeting Time</label>
                            <input
                                type="time"
                                id="meetingTime"
                                name="meetingTime"
                                value={formData.meetingTime}
                                onChange={handleInputChange}
                                className={formErrors.meetingTime ? 'error' : ''}
                            />
                            {formErrors.meetingTime && (
                                <div className="error-message">{formErrors.meetingTime}</div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="form-section">
                    <h3>Payment Method</h3>
                    <div className="payment-methods">
                        <button
                            type="button"
                            className={`payment-button cash-button ${formData.paymentMethod === 'Cash' ? 'active' : ''}`}
                            onClick={() => handlePaymentMethodClick('Cash')}
                        >
                            Pay with Cash
                        </button>
                        <button
                            type="button"
                            className={`payment-button other-button ${formData.paymentMethod === 'Other' ? 'active' : ''}`}
                            onClick={() => handlePaymentMethodClick('Other')}
                        >
                            Other
                        </button>
                    </div>

                    {showCashInfo && (
                        <div className="payment-info cash-info">
                            <p>Please have exact change ready for the meeting</p>
                            <p className="cash-note">Amount due: ${product.price.toFixed(2)}</p>
                        </div>
                    )}

                    {formErrors.payment && (
                        <div className="error-message">{formErrors.payment}</div>
                    )}
                </div>

                <button
                    type="submit"
                    className="confirm-button"
                    disabled={isSubmitting}
                >
                    {isSubmitting ? 'Confirming...' : 'Confirm Purchase'}
                </button>
            </form>
        </div>
    );
};

export default Confirmation; 