import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../../contexts/AuthContext";
import {
  AppBar,
  Avatar,
  Badge,
  Box,
  Divider,
  IconButton,
  ListItemIcon,
  Menu,
  MenuItem,
  Tooltip,
  Typography,
  useTheme,
  useMediaQuery,
} from "@mui/material";
import {
  Home as HomeIcon,
  ShoppingCart as ShoppingCartIcon,
  Person as PersonIcon,
  Notifications as NotificationsIcon,
  ChatBubble as ChatIcon,
  LocalShipping as ShippingIcon,
  Settings as SettingsIcon,
  Logout as LogoutIcon,
  Login as LoginIcon,
  PersonAdd as PersonAddIcon,
  School as SchoolIcon,
  Favorite as FavoriteIcon,
} from "@mui/icons-material";
import "./header.css";

const TempLogo = ({ isAuthenticated, isEmailVerified }) => {
  const navigate = useNavigate();

  const handleLogoClick = () => {
    if (isAuthenticated && isEmailVerified) {
      navigate("/home");
    } else {
      navigate("/");
    }
  };

  return (
    <div className="header-logo" onClick={handleLogoClick}>
      <SchoolIcon className="logo-icon" />
      <Typography variant="h6" component="span" className="logo-text-gradient">
        SPARTAN
      </Typography>
      <Typography variant="h6" component="span" className="logo-text-plain">
        Marketplace
      </Typography>
    </div>
  );
};

const Header = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const [userInfo, setUserInfo] = useState(null);
  const [anchorEl, setAnchorEl] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, isEmailVerified, user, logout } = useAuth();

  const open = Boolean(anchorEl);

  useEffect(() => {
    const updateUserInfo = () => {
      if (isAuthenticated) {
        const userName = localStorage.getItem("userName");
        if (userName) {
          setUserInfo({ firstName: userName });
        } else if (user?.user_metadata?.firstName) {
          const firstName = user.user_metadata.firstName;
          setUserInfo({ firstName });
          localStorage.setItem("userName", firstName);
        } else {
          setUserInfo({ firstName: "User" });
        }
      } else {
        setUserInfo(null);
      }
    };

    updateUserInfo();
    const timeoutId = setTimeout(updateUserInfo, 50);
    return () => clearTimeout(timeoutId);
  }, [isAuthenticated, user, location]);

  const handleProfileMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = async () => {
    try {
      await logout();
      handleMenuClose();
    } catch (error) {
      console.error("Error logging out:", error);
    }
  };

  const handleLogin = () => {
    navigate("/login");
    handleMenuClose();
  };

  const handleSignUp = () => {
    navigate("/register");
    handleMenuClose();
  };

  const handleNavigate = (path) => {
    navigate(path);
    handleMenuClose();
  };

  const handleHomeClick = () => {
    if (isAuthenticated && isEmailVerified) {
      navigate("/home");
    } else {
      navigate("/");
    }
  };

  return (
    <AppBar position="sticky" className="header-container">
      <div className="header-toolbar">
        {/* Left side - Logo */}
        <Box sx={{ display: { xs: "none", md: "flex" } }}>
          <TempLogo
            isAuthenticated={isAuthenticated}
            isEmailVerified={isEmailVerified}
          />
        </Box>

        {/* Right side - Profile Icon */}
        <Box sx={{ display: "flex", alignItems: "center", ml: "auto" }}>
          <Tooltip title={userInfo ? `Hi, ${userInfo.firstName}!` : "Account"}>
            <IconButton
              onClick={handleProfileMenuOpen}
              className="profile-button"
              size="small"
              aria-controls={open ? "account-menu" : undefined}
              aria-haspopup="true"
              aria-expanded={open ? "true" : undefined}
            >
              <Avatar className="profile-avatar">
                {userInfo && userInfo.firstName ? (
                  userInfo.firstName.charAt(0).toUpperCase()
                ) : (
                  <PersonIcon />
                )}
              </Avatar>
            </IconButton>
          </Tooltip>


          {/* Profile Menu */}
          <Menu
            anchorEl={anchorEl}
            id="account-menu"
            open={open}
            onClose={handleMenuClose}
            onClick={handleMenuClose}
            PaperProps={{
              className: "profile-menu-paper",
              elevation: 3
            }}
            transformOrigin={{ horizontal: "right", vertical: "top" }}
            anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
          >
            {userInfo ? (
              <div>
                <div className="profile-greeting">
                  <Typography variant="subtitle1" color="primary" fontWeight="medium">
                    Hi, {userInfo.firstName}!
                  </Typography>

                </div>
                <Divider className="menu-divider" />

                <MenuItem onClick={handleHomeClick} className="menu-item">
                  <ListItemIcon className="menu-item-icon">
                    <HomeIcon fontSize="small" />
                  </ListItemIcon>
                  Home
                </MenuItem>

                <MenuItem onClick={() => handleNavigate("/messaging")} className="menu-item">
                  <ListItemIcon className="menu-item-icon">
                    <ChatIcon fontSize="small" />
                  </ListItemIcon>
                  Messages
                </MenuItem>

                <MenuItem onClick={() => handleNavigate("/notifications")} className="menu-item">
                  <ListItemIcon className="menu-item-icon">
                    <Badge badgeContent={3} color="secondary" className="notification-badge">
                      <NotificationsIcon fontSize="small" />
                    </Badge>
                  </ListItemIcon>
                  Notifications
                </MenuItem>

                <MenuItem onClick={() => handleNavigate("/orderhistory")} className="menu-item">
                  <ListItemIcon className="menu-item-icon">
                    <ShippingIcon fontSize="small" />
                  </ListItemIcon>
                  Orders
                </MenuItem>

                <MenuItem onClick={() => handleNavigate("/cart")} className="menu-item">
                  <ListItemIcon className="menu-item-icon">
                    <ShoppingCartIcon fontSize="small" />
                  </ListItemIcon>
                  Cart
                </MenuItem>

                <Divider className="menu-divider" />

                <MenuItem onClick={() => handleNavigate("/account")} className="menu-item">
                  <ListItemIcon className="menu-item-icon">
                    <PersonIcon fontSize="small" />
                  </ListItemIcon>
                  My Profile
                </MenuItem>

                <MenuItem onClick={() => handleNavigate("/uploadProduct")} className="menu-item">
                  <ListItemIcon className="menu-item-icon">
                    <ShoppingCartIcon fontSize="small" />
                  </ListItemIcon>
                  Sell an Item
                </MenuItem>

                <MenuItem onClick={() => handleNavigate("/account")} className="menu-item">
                  <ListItemIcon className="menu-item-icon">
                    <SettingsIcon fontSize="small" />
                  </ListItemIcon>
                  Settings
                </MenuItem>

                <Divider className="menu-divider" />
                <MenuItem onClick={handleLogout} className="menu-item logout-item">
                  <ListItemIcon>
                    <LogoutIcon fontSize="small" color="error" />
                  </ListItemIcon>
                  Logout
                </MenuItem>
              </div>
            ) : (
              <div>
                <MenuItem onClick={handleLogin} className="menu-item">
                  <ListItemIcon className="menu-item-icon">
                    <LoginIcon fontSize="small" />
                  </ListItemIcon>
                  Login
                </MenuItem>
                <MenuItem onClick={handleSignUp} className="menu-item">
                  <ListItemIcon className="menu-item-icon">
                    <PersonAddIcon fontSize="small" />
                  </ListItemIcon>
                  Sign Up
                </MenuItem>
              </div>
            )}
          </Menu>
        </Box>
      </div>
    </AppBar>
  );
};

export default Header;
