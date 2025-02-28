import React from "react";
import { Link } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import "@fortawesome/fontawesome-free/css/all.min.css";
import {
  faBook,
  faLaptop,
  faChair,
  faTShirt,
  faBasketball,
  faEllipsisH,
} from "@fortawesome/free-solid-svg-icons";
import "./search.css";

export const Search = () => {
  const searchItems = () => {
    // SEARCH
    // Add your search logic here
    console.log("Search button clicked");
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

      {/*CATEGORIES */}
      <section id="categories">
        <h2>Browse Categories</h2>
        <div className="category-list">
          {/* For now, all categories just lead to the same product listing */}
          <Link to="/products" className="category">
            <FontAwesomeIcon icon={faBook} />
            <p>Textbooks</p>
          </Link>
          <Link to="/products" className="category">
            <FontAwesomeIcon icon={faLaptop} />
            <p>Electronics</p>
          </Link>
          <Link to="/products" className="category">
            <FontAwesomeIcon icon={faChair} />
            <p>Furniture</p>
          </Link>
          <Link to="/products" className="category">
            <FontAwesomeIcon icon={faTShirt} />
            <p>Clothing</p>
          </Link>
          <Link to="/products" className="category">
            <FontAwesomeIcon icon={faBasketball} />
            <p>Sports</p>
          </Link>
          <Link to="/products" className="category">
            <FontAwesomeIcon icon={faEllipsisH} />
            <p>More</p>
          </Link>
        </div>
      </section>
    </div>
  );
};
