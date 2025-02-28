import React from 'react';
import './products.css';

export const Products = () => {

    return (
        <div>
            <>
                <section id="filters">
                    <h2>Filter by</h2>
                    <div className="filter-list">
                        <label>
                            Category:
                            <select id="categoryFilter">
                                <option value="all">All</option>
                                <option value="math">Math</option>
                                <option value="science">Science</option>
                                <option value="literature">Literature</option>
                            </select>
                        </label>
                        <label>
                            Price Range:
                            <input
                                type="range"
                                id="priceFilter"
                                min={0}
                                max={100}
                                defaultValue={50}
                            />
                        </label>
                        <label>
                            Condition:
                            <select id="conditionFilter">
                                <option value="all">All</option>
                                <option value="new">New</option>
                                <option value="used">Used</option>
                            </select>
                        </label>
                    </div>
                </section>
                <section id="featured-products">
            <h2>Available Textbooks</h2>
            <div className="product-list" id="productList">
                <div className="product">
                    <img src="calculus.jpg" alt="Product 1"/>
                    <h3>Product 1</h3>
                    <p>Description</p>
                    <h4>$15.00</h4>

                    {/* <div className="chat-container">
                        <p>Chat with Seller</p>
                        <button className="chat">Chat</button>
                    </div>
                    <button className="add">Add</button> */}

                </div>
                <div className="product">
                    <img src="physics.jpg" alt="Product 2"/>
                    <h3>Product 2</h3>
                    <p>Description</p>
                    <h4>$15.00</h4>

                    {/* <div className="chat-container">
                        <p>Chat with Seller</p>
                        <button className="chat">Chat</button>
                    </div>
                    <button className="add">Add</button> */}
                </div>
                <div className="product">
                    <img src="calculus.jpg" alt="Product 3"/>
                    <h3>Product 3</h3>
                    <p>Description</p>
                    <h4>$15.00</h4>

                    {/* <div className="chat-container">
                        <p>Chat with Seller</p>
                        <button className="chat">Chat</button>
                    </div>
                    <button className="add">Add</button> */}

                </div>
                <div className="product">
                    <img src="physics.jpg" alt="Product 4"/>
                    <h3>Product 4</h3>
                    <p>Description</p>
                    <h4>$15.00</h4>

                    {/* <div className="chat-container">
                        <p>Chat with Seller</p>
                        <button className="chat">Chat</button>
                    </div>
                    <button className="add">Add</button> */}
                </div>
                <div className="product">
                    <img src="physics1.jpg" alt="Product 5"/>
                    <h3>Product 5</h3>
                    <p>Description</p>
                    <h4>$15.00</h4>

                    {/* <div className="chat-container">
                        <p>Chat with Seller</p>
                        <button className="chat">Chat</button>
                    </div>
                    <button className="add">Add</button> */}
                
                </div>

            </div>
        </section>
            </>


        </div>)
}

