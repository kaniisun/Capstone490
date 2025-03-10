import React, { useState, useEffect } from "react";
import { Link as RouterLink, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../../contexts/AuthContext";
import {
  AppBar,
  Avatar,
  Badge,
  Box,
  Container,
  Divider,
  IconButton,
  ListItemIcon,
  Menu,
  MenuItem,
  Toolbar,
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
} from "@mui/icons-material";

// Temporary logo component
const TempLogo = ({ isAuthenticated, isEmailVerified }) => {
  const theme = useTheme();
  const navigate = useNavigate();

  const handleLogoClick = () => {
    if (isAuthenticated && isEmailVerified) {
      navigate("/home");
    } else {
      navigate("/");
    }
  };

  return (
    <Box
      onClick={handleLogoClick}
      sx={{
        display: "flex",
        alignItems: "center",
        cursor: "pointer",
        "&:hover": {
          "& .logo-icon": {
            transform: "rotate(10deg)",
          },
        },
      }}
    >
      <SchoolIcon
        className="logo-icon"
        sx={{
          fontSize: 32,
          mr: 1.5,
          color: theme.palette.secondary.main,
          transition: "transform 0.3s ease",
        }}
      />
      <Typography
        variant="h6"
        component="span"
        sx={{
          fontWeight: 700,
          letterSpacing: "0.5px",
          background: `linear-gradient(45deg, ${theme.palette.secondary.main} 30%, #ffffff 90%)`,
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
        }}
      >
        SPARTAN
      </Typography>
      <Typography
        variant="h6"
        component="span"
        sx={{
          fontWeight: 500,
          ml: 0.5,
          color: "white",
        }}
      >
        Marketplace
      </Typography>
    </Box>
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

        console.log(
          "Auth state changed, userName from localStorage:",
          userName
        );

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
    <AppBar position="sticky" sx={{ bgcolor: "#0f2044", width: "100%" }}>
      <Box sx={{ width: "100%", px: { xs: 2, sm: 3, md: 4 } }}>
        <Toolbar
          disableGutters
          sx={{
            display: "flex",
            justifyContent: "space-between",
            minHeight: { xs: "56px", sm: "64px" },
            width: "100%",
          }}
        >
          {/* Left side - Logo - Always at left edge */}
          <Box
            sx={{
              display: { xs: "none", md: "flex" },
              ml: { xs: 0, md: 0, lg: 0 }, // No margin to stay at edge
            }}
          >
            <TempLogo
              isAuthenticated={isAuthenticated}
              isEmailVerified={isEmailVerified}
            />
          </Box>

          {/* Right side - Profile Icon - Always at right edge */}
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              ml: "auto",
              mr: { xs: 0, md: 0, lg: 0 }, // No margin to stay at edge
            }}
          >
            <Tooltip
              title={userInfo ? `Hi, ${userInfo.firstName}!` : "Account"}
            >
              <IconButton
                onClick={handleProfileMenuOpen}
                size="small"
                sx={{
                  bgcolor: theme.palette.primary.light,
                  "&:hover": {
                    bgcolor: theme.palette.primary.dark,
                  },
                }}
                aria-controls={open ? "account-menu" : undefined}
                aria-haspopup="true"
                aria-expanded={open ? "true" : undefined}
              >
                <Avatar
                  sx={{
                    width: isMobile ? 28 : 32,
                    height: isMobile ? 28 : 32,
                    bgcolor: theme.palette.secondary.main,
                    color: theme.palette.secondary.contrastText,
                  }}
                >
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
                elevation: 3,
                sx: {
                  overflow: "visible",
                  filter: "drop-shadow(0px 2px 8px rgba(0,0,0,0.2))",
                  mt: 1.5,
                  minWidth: 230,
                  "& .MuiAvatar-root": {
                    width: 32,
                    height: 32,
                    ml: -0.5,
                    mr: 1,
                  },
                },
              }}
              transformOrigin={{ horizontal: "right", vertical: "top" }}
              anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
            >
              {userInfo ? (
                <div>
                  <Box sx={{ px: 2, py: 1 }}>
                    <Typography
                      variant="subtitle1"
                      fontWeight="medium"
                      color="primary"
                    >
                      Hi, {userInfo.firstName}!
                    </Typography>
                  </Box>
                  <Divider />

                  <MenuItem onClick={handleHomeClick}>
                    <ListItemIcon>
                      <HomeIcon fontSize="small" color="primary" />
                    </ListItemIcon>
                    Home
                  </MenuItem>

                  <MenuItem onClick={() => handleNavigate("/messaging")}>
                    <ListItemIcon>
                      <ChatIcon fontSize="small" color="primary" />
                    </ListItemIcon>
                    Messages
                  </MenuItem>

                  <MenuItem onClick={() => handleNavigate("/notifications")}>
                    <ListItemIcon>
                      <Badge
                        badgeContent={3}
                        color="secondary"
                        sx={{ "& .MuiBadge-badge": { fontSize: "9px" } }}
                      >
                        <NotificationsIcon fontSize="small" color="primary" />
                      </Badge>
                    </ListItemIcon>
                    Notifications
                  </MenuItem>

                  <MenuItem onClick={() => handleNavigate("/orders")}>
                    <ListItemIcon>
                      <ShippingIcon fontSize="small" color="primary" />
                    </ListItemIcon>
                    Orders
                  </MenuItem>

                  <MenuItem onClick={() => handleNavigate("/cart")}>
                    <ListItemIcon>
                      <ShoppingCartIcon fontSize="small" color="primary" />
                    </ListItemIcon>
                    Cart
                  </MenuItem>

                  <Divider />

                  <MenuItem onClick={() => handleNavigate("/account")}>
                    <ListItemIcon>
                      <PersonIcon fontSize="small" color="primary" />
                    </ListItemIcon>
                    My Profile
                  </MenuItem>

                  <MenuItem onClick={() => handleNavigate("/uploadProduct")}>
                    <ListItemIcon>
                      <ShoppingCartIcon fontSize="small" color="primary" />
                    </ListItemIcon>
                    Sell an Item
                  </MenuItem>

                  <MenuItem onClick={() => handleNavigate("/account")}>
                    <ListItemIcon>
                      <SettingsIcon fontSize="small" color="primary" />
                    </ListItemIcon>
                    Settings
                  </MenuItem>

                  <Divider />
                  <MenuItem onClick={handleLogout} sx={{ color: "error.main" }}>
                    <ListItemIcon>
                      <LogoutIcon fontSize="small" color="error" />
                    </ListItemIcon>
                    Logout
                  </MenuItem>
                </div>
              ) : (
                <div>
                  <MenuItem onClick={() => navigate("/login")}>
                    <ListItemIcon>
                      <LoginIcon fontSize="small" color="primary" />
                    </ListItemIcon>
                    Login
                  </MenuItem>
                  <MenuItem onClick={() => navigate("/register")}>
                    <ListItemIcon>
                      <PersonAddIcon fontSize="small" color="primary" />
                    </ListItemIcon>
                    Sign Up
                  </MenuItem>
                </div>
              )}
            </Menu>
          </Box>
        </Toolbar>
      </Box>
    </AppBar>
  );
};

export default Header;
