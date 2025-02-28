import React from 'react';
import './detail.css';

export const Detail = () => {

    return (
        <div>
            <div className="content-container">
                <div className="product">
                    <div className="prod-image">
                        <img id="prod-image" src="purse.jpg" alt="pink purse" />
                    </div>
                    <div className="prod-info">
                        <h2 id="prod-name">Product Name</h2>
                        <p className="prod-info-item" id="prod-size">
                            Size: Medium
                        </p>
                        <p className="prod-info-item" id="prod-detail">
                            Detail: This is a detailed description of the product.
                        </p>
                        <p className="prod-info-item" id="prod-condition">
                            Condition: New
                        </p>
                        <p className="price" id="prod-price">
                            $15.00
                        </p>
                        <div className="button-container">
                            <div className="chat-container">
                                <p>Chat with Seller</p>
                                <button className="chat">Chat</button>
                            </div>
                            <button className="add">Add</button>
                        </div>
                    </div>
                </div>
            </div>

        </div>)
}

