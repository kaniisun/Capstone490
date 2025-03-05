import React from "react";
import { Link } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import "@fortawesome/fontawesome-free/css/all.min.css";
import {
  faHome,
  faBell,
  faTruck,
  faShoppingCart,
  faUser,
} from "@fortawesome/free-solid-svg-icons";
import "./header.css";

const Header = () => {
  return (
    <div>
      <header>
        {/* LOGO */}
        {/* clicking on logo leads to homepage */}
        <Link to="/" className="logo">
          Student Marketplace
        </Link>

        <nav>
          <ul>
            {/* NAVIGATION */}
            {/* icons link to according pages */}
            {/* <Link to="/chatroom" className="nav-icon" data-tooltip="Chatroom">
              <img src="chats.png" alt="Chat" className="nav-icon-image" />
            </Link> */}
            <Link to="/messaging" className="nav-icon" data-tooltip="Chatroom">
              <img src="chats.png" alt="Chat" className="nav-icon-image" />
            </Link>
            <Link to="/" className="nav-icon" data-tooltip="Home">
              <FontAwesomeIcon icon={faHome} />
            </Link>
            <a href="/#" className="nav-icon" data-tooltip="Notifications">
              <FontAwesomeIcon icon={faBell} />
            </a>
            <a href="/#" className="nav-icon" data-tooltip="Order History">
              <FontAwesomeIcon icon={faTruck} />
            </a>
            <a href="/cart" className="nav-icon" data-tooltip="Cart">
              <FontAwesomeIcon icon={faShoppingCart} />
            </a>

            <div className="user-icon-container">
              <Link to="/register" className="nav-icon" data-tooltip="Profile">
                <FontAwesomeIcon icon={faUser} />
              </Link>

              <div className="dropdown-menu">
                <Link to="/account" className="dropdown-item">
                  Edit User
                </Link>
                <button className="dropdown-item">Logout</button>
              </div>
            </div>



          </ul>
        </nav>
      </header>
    </div>
  );
};

export default Header;
