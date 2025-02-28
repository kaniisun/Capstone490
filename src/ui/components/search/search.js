import React from 'react';
// import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import "@fortawesome/fontawesome-free/css/all.min.css";
// import { faHome, faBell, faTruck, faShoppingCart, faUser } from '@fortawesome/free-solid-svg-icons';
import './search.css';

export const Search = () => {
    const searchItems = () => {
        // Add your search logic here
        console.log('Search button clicked');
    };
    return (
        <div>
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

        </div>)
}
