import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../../contexts/AuthContext";
import {
  Box,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Avatar,
  Typography,
  Divider,
  IconButton,
  Badge,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import {
  Home as HomeIcon,
  ShoppingCart as ShoppingCartIcon,
  Person as PersonIcon,
  Notifications as NotificationsIcon,
  ChatBubble as ChatIcon,
  LocalShipping as ShippingIcon,
  Favorite as FavoriteIcon,
  Logout as LogoutIcon,
  Login as LoginIcon,
  PersonAdd as PersonAddIcon,
  School as SchoolIcon,
  Menu as MenuIcon,
  ViewList as ViewListIcon,
  Add as AddIcon,
} from "@mui/icons-material";
import "./Sidebar.css";

const Logo = ({ isAuthenticated, isEmailVerified }) => {
  const navigate = useNavigate();

  const handleLogoClick = () => {
    if (isAuthenticated && isEmailVerified) {
      navigate("/home");
    } else {
      navigate("/");
    }
  };

  return (
    <div className="sidebar-logo" onClick={handleLogoClick}>
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

const Sidebar = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userInfo, setUserInfo] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, isEmailVerified, user, logout } = useAuth();

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

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/login");
    } catch (error) {
      console.error("Error logging out:", error);
    }
  };

  const handleNavigate = (path) => {
    navigate(path);
    if (isMobile) {
      setMobileOpen(false);
    }
  };

  const drawer = (
    <div>
      <Box sx={{ p: 2 }}>
        <Logo
          isAuthenticated={isAuthenticated}
          isEmailVerified={isEmailVerified}
        />
      </Box>
      <Divider />

      {userInfo ? (
        <Box sx={{ p: 2, textAlign: "center" }}>
          <Avatar sx={{ width: 64, height: 64, mx: "auto", mb: 1 }}>
            {userInfo.firstName.charAt(0).toUpperCase()}
          </Avatar>
          <Typography variant="body1" fontWeight="bold">
            Hi, {userInfo.firstName}!
          </Typography>
        </Box>
      ) : (
        <Box sx={{ p: 2, textAlign: "center" }}>
          <Avatar sx={{ width: 64, height: 64, mx: "auto", mb: 1 }}>
            <PersonIcon />
          </Avatar>
          <Typography variant="body1">Guest</Typography>
        </Box>
      )}

      <Divider />

      <List>
        <ListItem component="button" onClick={() => handleNavigate("/home")}>
          <ListItemIcon>
            <HomeIcon />
          </ListItemIcon>
          <ListItemText primary="Home" />
        </ListItem>

        <ListItem component="button" onClick={() => handleNavigate("/products")}>
          <ListItemIcon>
            <ViewListIcon />
          </ListItemIcon>
          <ListItemText primary="All Listings" />
        </ListItem>

        {isAuthenticated && (
          <>
            <ListItem component="button" onClick={() => handleNavigate("/messaging")}>
              <ListItemIcon>
                <ChatIcon />
              </ListItemIcon>
              <ListItemText primary="Messages" />
            </ListItem>

            <ListItem component="button" onClick={() => handleNavigate("/notifications")}>
              <ListItemIcon>
                <Badge badgeContent={3} color="secondary">
                  <NotificationsIcon />
                </Badge>
              </ListItemIcon>
              <ListItemText primary="Notifications" />
            </ListItem>

            <ListItem component="button" onClick={() => handleNavigate("/orderhistory")}>
              <ListItemIcon>
                <ShippingIcon />
              </ListItemIcon>
              <ListItemText primary="Orders" />
            </ListItem>

            <ListItem component="button" onClick={() => handleNavigate("/cart")}>
              <ListItemIcon>
                <ShoppingCartIcon />
              </ListItemIcon>
              <ListItemText primary="Cart" />
            </ListItem>

            <ListItem component="button" onClick={() => handleNavigate("/favorites")}>
              <ListItemIcon>
                <FavoriteIcon />
              </ListItemIcon>
              <ListItemText primary="Favorites" />
            </ListItem>

            <ListItem component="button" onClick={() => handleNavigate("/uploadProduct")}>
              <ListItemIcon>
                <AddIcon />
              </ListItemIcon>
              <ListItemText primary="Sell Item" />
            </ListItem>

            <ListItem component="button" onClick={() => handleNavigate("/account")}>
              <ListItemIcon>
                <PersonIcon />
              </ListItemIcon>
              <ListItemText primary="Account" />
            </ListItem>

            <ListItem component="button" onClick={handleLogout}>
              <ListItemIcon>
                <LogoutIcon />
              </ListItemIcon>
              <ListItemText primary="Logout" />
            </ListItem>
          </>
        )}

        {!isAuthenticated && (
          <>
            <ListItem component="button" onClick={() => handleNavigate("/login")}>
              <ListItemIcon>
                <LoginIcon />
              </ListItemIcon>
              <ListItemText primary="Login" />
            </ListItem>

            <ListItem component="button" onClick={() => handleNavigate("/register")}>
              <ListItemIcon>
                <PersonAddIcon />
              </ListItemIcon>
              <ListItemText primary="Sign Up" />
            </ListItem>
          </>
        )}
      </List>
    </div>
  );

  return (
    <>
      {isMobile && (
        <IconButton
          color="inherit"
          aria-label="open drawer"
          edge="start"
          onClick={handleDrawerToggle}
          sx={{
            position: "fixed",
            top: 10,
            left: 10,
            zIndex: 1100,
            bgcolor: "background.paper",
            boxShadow: 1,
            borderRadius: "50%",
          }}
        >
          <MenuIcon />
        </IconButton>
      )}

      <Box component="nav" sx={{ width: { sm: 240 }, flexShrink: { sm: 0 } }}>
        <Drawer
          variant={isMobile ? "temporary" : "permanent"}
          open={isMobile ? mobileOpen : true}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true, // Better open performance on mobile
          }}
          sx={{
            "& .MuiDrawer-paper": {
              boxSizing: "border-box",
              width: 240,
              borderRight: "1px solid rgba(0, 0, 0, 0.12)",
            },
          }}
        >
          {drawer}
        </Drawer>
      </Box>
    </>
  );
};

export default Sidebar;
