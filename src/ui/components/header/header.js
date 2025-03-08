import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../../contexts/AuthContext";
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
  const [userInfo, setUserInfo] = useState(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const navigate = useNavigate();
  const { isAuthenticated, logout, user } = useAuth();

  useEffect(() => {
    // Check if user is logged in using both AuthContext and localStorage
    if (isAuthenticated && user) {
      const userName = localStorage.getItem("userName");
      setUserInfo({ firstName: userName || "User" });
    } else {
      setUserInfo(null);
    }
  }, [isAuthenticated, user]);

  const handleLogout = async () => {
    try {
      // Use the logout function from AuthContext instead
      await logout();
      setShowDropdown(false);
    } catch (error) {
      console.error("Error logging out:", error);
    }
  };

  const handleLogin = () => {
    navigate("/login");
    setShowDropdown(false);
  };

  const handleSignUp = () => {
    navigate("/register");
    setShowDropdown(false);
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
                data-tooltip={
                  userInfo ? `Hi, ${userInfo.firstName}!` : "Profile"
                }
                onClick={() => setShowDropdown(!showDropdown)}
              >
                <FontAwesomeIcon icon={faUser} />
              </div>

              {showDropdown && (
                <div className="dropdown-menu">
                  {userInfo ? (
                    <>
                      <div className="dropdown-header">
                        Hi, {userInfo.firstName}!
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
                      <button className="dropdown-item" onClick={handleLogin}>
                        Login
                      </button>
                      <button className="dropdown-item" onClick={handleSignUp}>
                        Sign Up
                      </button>
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
