import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import "@fortawesome/fontawesome-free/css/all.min.css";
import { faHome, faBell, faTruck, faShoppingCart, faUser } from '@fortawesome/free-solid-svg-icons';
import './header.css';

const Header = () => {
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

        </div>
    );
};

export default Header;
