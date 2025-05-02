import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../../contexts/AuthContext";
import { supabase } from "../../../supabaseClient";

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
} from "@mui/material";
import {
  Home as HomeIcon,
  Person as PersonIcon,
  ChatBubble as ChatIcon,
  LocalShipping as ShippingIcon,
  Logout as LogoutIcon,
  Login as LoginIcon,
  PersonAdd as PersonAddIcon,
  School as SchoolIcon,
  Favorite as FavoriteIcon,
  ViewList as ViewListIcon,
  Forum as ForumIcon,
  AdminPanelSettings as AdminPanelSettingsIcon,
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
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, isEmailVerified, user, logout, isAdmin } = useAuth();
  const [userInfo, setUserInfo] = useState(null);
  const [anchorEl, setAnchorEl] = useState(null);
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);
  const [notificationCount, setNotificationCount] = useState(0);

  const open = Boolean(anchorEl);
  const getUnreadMessageCount = async (userId) => {
    const { data, error } = await supabase
      .from('messages')
      .select('id', { count: 'exact' })
      .eq('receiver_id', userId)
      .eq('is_read', false);
  
    if (error) {
      console.error('Error fetching unread messages:', error);
      return 0;
    }
  
    return data.length;
  };

  useEffect(() => {
    if (!user) return;
  
    const fetchUnread = async () => {
      const count = await getUnreadMessageCount(user.id);
      setUnreadMessagesCount(count);
    };
  
    fetchUnread();
  
    const subscription = supabase
      .channel("messages-channel")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "messages",
          filter: `receiver_id=eq.${user.id}`,
        },
        () => {
          fetchUnread();
        }
      )
      .subscribe();
  
    return () => {
      supabase.removeChannel(subscription);
    };
  }, [user]);


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
  useEffect(() => {
      const fetchNotificationCount = async () => {
        if (!user) return;
        
        try {
          const { data, error } = await supabase
            .from('notifications')
            .select('id', { count: 'exact' })
            .eq('userid', user.id)
            .eq('isread', false);
  
          if (error) throw error;
          setNotificationCount(data.length);
        } catch (error) {
          console.error('Error fetching notifications:', error);
        }
      };
  
      const subscription = supabase
        .channel('notifications')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `userid=eq.${user?.id}`
        }, () => {
          fetchNotificationCount();
        })
        .subscribe();
  
      if (isAuthenticated) {
        fetchNotificationCount();
      }
  
      return () => {
        subscription.unsubscribe();
      };
    }, [user, isAuthenticated]);
  

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
        <Box className="logo-box">
          <TempLogo
            isAuthenticated={isAuthenticated}
            isEmailVerified={isEmailVerified}
          />
        </Box>

        {/* Right side - Profile Icon */}
        <Box className="profile-box">
          {/* Remove Admin Link from header */}

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
            slotProps={{
              paper: {
                className: "profile-menu-paper",
                elevation: 3,
              }
            }}
            className="profile-menu"
          >
            {userInfo ? (
              <div>
                <div className="profile-greeting">
                  <Typography
                    variant="subtitle1"
                    color="primary"
                    fontWeight="medium"
                  >
                    Hi, {userInfo.firstName}!
                    {isAdmin && (
                      <Tooltip title="Administrator Account">
                        <AdminPanelSettingsIcon
                          fontSize="small"
                          color="primary"
                          className="admin-icon"
                        />
                      </Tooltip>
                    )}
                  </Typography>
                  {isAdmin && (
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      className="admin-text"
                    >
                      Administrator Account
                    </Typography>
                  )}
                </div>
                <Divider className="menu-divider" />

                <MenuItem onClick={handleHomeClick} className="menu-item">
                  <ListItemIcon className="menu-item-icon">
                    <HomeIcon fontSize="small" />
                  </ListItemIcon>
                  Home
                </MenuItem>

                {/* Admin Section - Only visible for admins */}
                {isAuthenticated && isAdmin && (
                  <>
                    <Divider className="admin-divider" />
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      className="admin-controls-text"
                    >
                      ADMIN CONTROLS
                    </Typography>

                    <MenuItem
                      onClick={() => handleNavigate("/admin")}
                      className="menu-item admin-menu-item"
                    >
                      <ListItemIcon className="menu-item-icon">
                        <AdminPanelSettingsIcon
                          fontSize="small"
                          color="primary"
                        />
                      </ListItemIcon>
                      <Typography color="primary" fontWeight="medium">
                        Admin Dashboard
                      </Typography>
                    </MenuItem>
                  </>
                )}

                <MenuItem
                  onClick={() => handleNavigate("/products")}
                  className="menu-item"
                >
                  <ListItemIcon className="menu-item-icon">
                    <ViewListIcon fontSize="small" />
                  </ListItemIcon>
                  All Listings
                </MenuItem>

                <MenuItem
                  onClick={() => handleNavigate("/messaging")}
                  className="menu-item"
                >
                  <ListItemIcon className="menu-item-icon">
                    {unreadMessagesCount > 0 ? (
                      <Badge
                        badgeContent={unreadMessagesCount}
                        color="secondary"
                        className="notification-badge"
                      >
                        <ChatIcon fontSize="small" />
                      </Badge>
                    ) : (
                      <ChatIcon fontSize="small" />
                    )}
                  </ListItemIcon>
                  Messages
                </MenuItem>

                <MenuItem
                  onClick={() => handleNavigate("/orderhistory")}
                  className="menu-item"
                >
                  <ListItemIcon className="menu-item-icon">
                  <Badge badgeContent={notificationCount} color="error" className="notification-badge">
                    <ShippingIcon fontSize="small" />
                    </Badge>
                  </ListItemIcon>
                  Orders
                </MenuItem>

                <MenuItem
                  onClick={() => handleNavigate("/favorites")}
                  className="menu-item"
                >
                  <ListItemIcon className="menu-item-icon">
                    <FavoriteIcon fontSize="small" />
                  </ListItemIcon>
                  Favorites
                </MenuItem>

                <MenuItem
                  onClick={() => handleNavigate("/openboard")}
                  className="menu-item"
                >
                  <ListItemIcon className="menu-item-icon">
                    <ForumIcon fontSize="small" />
                  </ListItemIcon>
                  Open Board
                </MenuItem>

                <MenuItem
                  onClick={() => handleNavigate("/account")}
                  className="menu-item"
                >
                  <ListItemIcon className="menu-item-icon">
                    <PersonIcon fontSize="small" />
                  </ListItemIcon>
                  Account
                </MenuItem>

                <Divider className="menu-divider" />

                <MenuItem onClick={handleLogout} className="menu-item">
                  <ListItemIcon className="menu-item-icon">
                    <LogoutIcon fontSize="small" />
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
