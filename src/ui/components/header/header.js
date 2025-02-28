import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import "@fortawesome/fontawesome-free/css/all.min.css";
import { faHome, faBell, faTruck, faShoppingCart, faUser } from '@fortawesome/free-solid-svg-icons';
import './header.css';

const Header = () => {
    const searchItems = () => {
        // Add your search logic here
        console.log('Search button clicked');
    };
    return (
        <div>
            <header>
                <div className="logo">Students Marketplace</div>
                <nav>
                    <ul>
                        <a href="/#" className="nav-icon" data-tooltip="Chatroom">
                            <img src="chats.png" alt="Chat" className="nav-icon-image" />
                        </a>

                        <a href="/#" className="nav-icon" data-tooltip="Home">
                            <FontAwesomeIcon icon={faHome} />
                        </a>
                        <a href="/#" className="nav-icon" data-tooltip="Notifications">
                            <FontAwesomeIcon icon={faBell} />
                        </a>
                        <a href="/#" className="nav-icon" data-tooltip="Order History">
                            <FontAwesomeIcon icon={faTruck} />
                        </a>
                        <a href="/#" className="nav-icon" data-tooltip="Cart">
                            <FontAwesomeIcon icon={faShoppingCart} />
                        </a>
                        <a href="/#" className="nav-icon" data-tooltip="Profile">
                            <FontAwesomeIcon icon={faUser} />
                        </a>
                    </ul>
                </nav>
            </header>

            <section id="intro">
                <h1>Your Campus Marketplace</h1>
                <div className="search-bar">
                    <input type="text" placeholder="Search..." id="searchInput" />
                    <button onClick={searchItems}>
                        <i className="fa-solid fa-magnifying-glass" />
                    </button>
                </div>
            </section>


            <section id="categories">
                <h2>Browse Categories</h2>
                <div className="category-list">
                    <div className="category">
                        <a href="textbook.html">
                            <i className="fas fa-book" />
                        </a>
                        <p>Textbooks</p>
                    </div>
                    <div className="category">
                        <i className="fas fa-laptop" />
                        <p>Electronics</p>
                    </div>
                    <div className="category">
                        <i className="fas fa-chair" />
                        <p>Furniture</p>
                    </div>
                    <div className="category">
                        <i className="fas fa-tshirt" />
                        <p>Clothing</p>
                    </div>
                    <div className="category">
                        <i className="fas fa-basketball-ball" />
                        <p>Sports</p>
                    </div>
                    <div className="category">
                        <i className="fas fa-ellipsis-h" />
                        <p>More</p>
                    </div>
                </div>
            </section>


        </div>
    );
};

export default Header;
