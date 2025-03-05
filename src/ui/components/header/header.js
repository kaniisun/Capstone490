import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../../../supabaseClient";
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
  const [user, setUser] = useState(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user is logged in
    const isLoggedIn = localStorage.getItem("isLoggedIn");
    const userName = localStorage.getItem("userName");

    if (isLoggedIn && userName) {
      setUser({ firstName: userName });
    }
  }, []);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      localStorage.removeItem("userName");
      localStorage.removeItem("userEmail");
      localStorage.removeItem("userId");
      localStorage.removeItem("isLoggedIn");
      setUser(null);
      setShowDropdown(false);
      navigate("/");
      window.location.reload();
    } catch (error) {
      console.error("Error logging out:", error);
    }
  };

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
              <div
                className="nav-icon"
                data-tooltip={user ? `Hi, ${user.firstName}!` : "Profile"}
                onClick={() => setShowDropdown(!showDropdown)}
              >
                <FontAwesomeIcon icon={faUser} />
              </div>

              {showDropdown && (
                <div className="dropdown-menu">
                  {user ? (
                    <>
                      <div className="dropdown-header">
                        Hi, {user.firstName}!
                      </div>
                      <Link to="/account" className="dropdown-item">
                        Edit Profile
                      </Link>
                      <button
                        className="dropdown-item logout"
                        onClick={handleLogout}
                      >
                        Logout
                      </button>
                    </>
                  ) : (
                    <>
                      <Link to="/login" className="dropdown-item">
                        Login
                      </Link>
                      <Link to="/register" className="dropdown-item">
                        Sign Up
                      </Link>
                    </>
                  )}
                </div>
              )}
            </div>
          </ul>
        </nav>
      </header>
    </div>
  );
};

export default Header;
