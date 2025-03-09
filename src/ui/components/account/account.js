//account.js
//This is the account page that allows the user to update their profile information and delete their products

import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../../../supabaseClient";
import { useAuth } from "../../../contexts/AuthContext";
import "./account.css";
// Material-UI imports
import {
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Container,
  Divider,
  Grid,
  Paper,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
  Alert,
  Snackbar,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  useTheme,
  useMediaQuery,
  CircularProgress,
  Tooltip,
  Chip,
  Zoom,
  Fade,
} from "@mui/material";
import {
  AccountCircle as AccountCircleIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  Save as SaveIcon,
  Lock as LockIcon,
  LockReset as LockResetIcon,
  Store as StoreIcon,
  LocalOffer as LocalOfferIcon,
  Category as CategoryIcon,
  Star as StarIcon,
} from "@mui/icons-material";
import { useTheme as useMuiTheme } from "@mui/material/styles";

const Account = () => {
  const { user, logout } = useAuth();
  const [profile, setProfile] = useState({
    email: "",
    fullName: "",
  });
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [passwords, setPasswords] = useState({
    current: "",
    new: "",
    confirm: "",
  });
  const [tabValue, setTabValue] = useState(0);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [productToDelete, setProductToDelete] = useState(null);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      fetchUserProfile();
      fetchUserProducts();
    } else {
      setLoading(false);
    }
  }, [user]);

  // Fetch user profile data
  const fetchUserProfile = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (error) throw error;

      if (data) {
        setProfile({
          email: user.email || "",
          fullName: data.full_name || "",
        });
      }
    } catch (error) {
      console.error("Error fetching user profile:", error.message);
    }
  };

  // Fetch user products
  const fetchUserProducts = async () => {
    try {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("userID", user.id);

      if (error) throw error;

      setProducts(data || []);
    } catch (error) {
      console.error("Error fetching user products:", error.message);
    } finally {
      setLoading(false);
    }
  };

  // Update profile
  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setUpdating(true);

    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: profile.fullName,
          updated_at: new Date(),
        })
        .eq("id", user.id);

      if (error) throw error;

      setSnackbar({
        open: true,
        message: "Profile updated successfully!",
        severity: "success",
      });
    } catch (error) {
      console.error("Error updating profile:", error.message);
      setSnackbar({
        open: true,
        message: `Error updating profile: ${error.message}`,
        severity: "error",
      });
    } finally {
      setUpdating(false);
    }
  };

  // Update password
  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    setUpdating(true);

    if (passwords.new !== passwords.confirm) {
      setSnackbar({
        open: true,
        message: "New passwords don't match",
        severity: "error",
      });
      setUpdating(false);
      return;
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password: passwords.new,
      });

      if (error) throw error;

      setPasswords({ current: "", new: "", confirm: "" });
      setShowPasswordForm(false);
      setSnackbar({
        open: true,
        message: "Password updated successfully!",
        severity: "success",
      });
    } catch (error) {
      console.error("Error updating password:", error.message);
      setSnackbar({
        open: true,
        message: `Error updating password: ${error.message}`,
        severity: "error",
      });
    } finally {
      setUpdating(false);
    }
  };

  // Delete product
  const handleDeleteProduct = (productId) => {
    setProductToDelete(productId);
    setOpenDeleteDialog(true);
  };

  const confirmDeleteProduct = async () => {
    if (!productToDelete) return;

    try {
      const { error } = await supabase
        .from("products")
        .delete()
        .eq("productID", productToDelete);

      if (error) throw error;

      setProducts(
        products.filter((product) => product.productID !== productToDelete)
      );
      setSnackbar({
        open: true,
        message: "Product deleted successfully!",
        severity: "success",
      });
    } catch (error) {
      console.error("Error deleting product:", error.message);
      setSnackbar({
        open: true,
        message: `Error deleting product: ${error.message}`,
        severity: "error",
      });
    } finally {
      setOpenDeleteDialog(false);
      setProductToDelete(null);
    }
  };

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const handleCloseSnackbar = (event, reason) => {
    if (reason === "clickaway") {
      return;
    }
    setSnackbar({ ...snackbar, open: false });
  };

  // Get background color for product status
  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case "available":
        return "success";
      case "sold":
        return "error";
      case "pending":
        return "warning";
      default:
        return "info";
    }
  };

  // Get product condition stars
  const getConditionStars = (condition) => {
    switch (condition?.toLowerCase()) {
      case "new":
        return 5;
      case "like new":
        return 4;
      case "good":
        return 3;
      case "fair":
        return 2;
      case "poor":
        return 1;
      default:
        return 3;
    }
  };

  if (loading) {
    return (
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "50vh",
        }}
      >
        <CircularProgress size={40} sx={{ color: "#0f2044" }} />
      </Box>
    );
  }

  if (!user) {
    navigate("/login");
    return null;
  }

  return (
    <Fade in={!loading} timeout={500}>
      <Container maxWidth="lg" sx={{ mt: 4, mb: 6 }}>
        <Paper
          elevation={3}
          sx={{
            borderRadius: 2,
            overflow: "hidden",
          }}
        >
          {/* Simple header with avatar */}
          <Box
            sx={{
              p: 3,
              display: "flex",
              alignItems: "center",
              gap: 2,
              borderBottom: 1,
              borderColor: "divider",
            }}
          >
            <Avatar
              sx={{
                width: 56,
                height: 56,
                bgcolor: "#0f2044", // UNCG Blue
                fontWeight: "bold",
              }}
            >
              {profile.fullName
                ? profile.fullName.charAt(0).toUpperCase()
                : user?.email?.charAt(0).toUpperCase() || "U"}
            </Avatar>
            <Box>
              <Typography variant="h5" component="h1" fontWeight="500">
                {profile.fullName || user?.email?.split("@")[0] || "User"}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {profile.email}
              </Typography>
            </Box>
          </Box>

          {/* Tabs navigation */}
          <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
            <Tabs
              value={tabValue}
              onChange={handleTabChange}
              aria-label="account tabs"
              sx={{
                "& .MuiTab-root": {
                  fontSize: "0.95rem",
                  textTransform: "none",
                  fontWeight: 500,
                  minHeight: "48px",
                },
                "& .Mui-selected": {
                  color: "#0f2044", // UNCG Blue
                },
                "& .MuiTabs-indicator": {
                  backgroundColor: "#ffc72c", // UNCG Gold
                },
              }}
            >
              <Tab
                label="Profile"
                icon={<AccountCircleIcon />}
                iconPosition="start"
              />
              <Tab label="Products" icon={<StoreIcon />} iconPosition="start" />
            </Tabs>
          </Box>

          {/* Profile Tab */}
          <Box sx={{ p: 3 }} hidden={tabValue !== 0}>
            {tabValue === 0 && (
              <Card variant="outlined" sx={{ borderRadius: 2 }}>
                <CardContent sx={{ p: 3 }}>
                  <Typography variant="h6" gutterBottom fontWeight="500">
                    Profile Information
                  </Typography>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mb: 3 }}
                  >
                    Update your personal information
                  </Typography>

                  <Box
                    component="form"
                    onSubmit={handleUpdateProfile}
                    noValidate
                  >
                    <Grid container spacing={3}>
                      <Grid item xs={12}>
                        <TextField
                          fullWidth
                          label="Email Address"
                          variant="outlined"
                          value={profile.email}
                          disabled
                          InputProps={{
                            readOnly: true,
                          }}
                          sx={{
                            "& .MuiOutlinedInput-root": {
                              borderRadius: 1,
                            },
                          }}
                        />
                      </Grid>
                      <Grid item xs={12}>
                        <TextField
                          fullWidth
                          label="Full Name"
                          variant="outlined"
                          value={profile.fullName}
                          onChange={(e) =>
                            setProfile({ ...profile, fullName: e.target.value })
                          }
                          sx={{
                            "& .MuiOutlinedInput-root": {
                              borderRadius: 1,
                            },
                          }}
                        />
                      </Grid>
                      <Grid item xs={12}>
                        <Box sx={{ display: "flex", gap: 2, mt: 1 }}>
                          <Button
                            variant="contained"
                            color="primary"
                            startIcon={<SaveIcon />}
                            type="submit"
                            disabled={updating}
                            sx={{
                              borderRadius: 1,
                              textTransform: "none",
                              py: 1,
                              bgcolor: "#0f2044", // UNCG Blue
                              "&:hover": {
                                bgcolor: "#1a365d", // Slightly lighter UNCG Blue
                              },
                            }}
                          >
                            {updating ? (
                              <Box
                                sx={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 1,
                                }}
                              >
                                <CircularProgress size={16} color="inherit" />
                                <span>Saving...</span>
                              </Box>
                            ) : (
                              "Save Changes"
                            )}
                          </Button>
                          <Button
                            variant="outlined"
                            sx={{
                              borderRadius: 1,
                              textTransform: "none",
                              py: 1,
                              borderColor: "#0f2044",
                              color: "#0f2044",
                              "&:hover": {
                                borderColor: "#ffc72c",
                                bgcolor: "rgba(255, 199, 44, 0.04)", // Very light UNCG Gold background
                              },
                            }}
                            startIcon={<LockResetIcon />}
                            onClick={() =>
                              setShowPasswordForm(!showPasswordForm)
                            }
                          >
                            {showPasswordForm ? "Cancel" : "Change Password"}
                          </Button>
                        </Box>
                      </Grid>
                    </Grid>
                  </Box>

                  {/* Password form */}
                  {showPasswordForm && (
                    <Box
                      component="form"
                      onSubmit={handleUpdatePassword}
                      sx={{
                        mt: 4,
                        pt: 3,
                        borderTop: 1,
                        borderColor: "divider",
                      }}
                      noValidate
                    >
                      <Typography variant="h6" gutterBottom fontWeight="500">
                        Change Password
                      </Typography>
                      <Grid container spacing={3}>
                        <Grid item xs={12}>
                          <TextField
                            fullWidth
                            label="Current Password"
                            type="password"
                            variant="outlined"
                            value={passwords.current}
                            onChange={(e) =>
                              setPasswords({
                                ...passwords,
                                current: e.target.value,
                              })
                            }
                            required
                            sx={{
                              "& .MuiOutlinedInput-root": {
                                borderRadius: 1,
                              },
                            }}
                          />
                        </Grid>
                        <Grid item xs={12} md={6}>
                          <TextField
                            fullWidth
                            label="New Password"
                            type="password"
                            variant="outlined"
                            value={passwords.new}
                            onChange={(e) =>
                              setPasswords({
                                ...passwords,
                                new: e.target.value,
                              })
                            }
                            required
                            sx={{
                              "& .MuiOutlinedInput-root": {
                                borderRadius: 1,
                              },
                            }}
                          />
                        </Grid>
                        <Grid item xs={12} md={6}>
                          <TextField
                            fullWidth
                            label="Confirm New Password"
                            type="password"
                            variant="outlined"
                            value={passwords.confirm}
                            onChange={(e) =>
                              setPasswords({
                                ...passwords,
                                confirm: e.target.value,
                              })
                            }
                            required
                            sx={{
                              "& .MuiOutlinedInput-root": {
                                borderRadius: 1,
                              },
                            }}
                          />
                        </Grid>
                        <Grid item xs={12}>
                          <Button
                            variant="contained"
                            color="primary"
                            startIcon={<LockIcon />}
                            type="submit"
                            disabled={updating}
                            sx={{
                              borderRadius: 1,
                              textTransform: "none",
                              py: 1,
                            }}
                          >
                            {updating ? (
                              <Box
                                sx={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 1,
                                }}
                              >
                                <CircularProgress size={16} color="inherit" />
                                <span>Updating...</span>
                              </Box>
                            ) : (
                              "Update Password"
                            )}
                          </Button>
                        </Grid>
                      </Grid>
                    </Box>
                  )}
                </CardContent>
              </Card>
            )}
          </Box>

          {/* Products Tab */}
          <Box sx={{ p: 3 }} hidden={tabValue !== 1}>
            {tabValue === 1 && (
              <Box>
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    mb: 3,
                  }}
                >
                  <Typography
                    variant="h6"
                    fontWeight="500"
                    sx={{ color: "#0f2044" }}
                  >
                    Your Products
                  </Typography>
                  <Button
                    component={Link}
                    to="/uploadProduct"
                    variant="contained"
                    sx={{
                      borderRadius: 1,
                      textTransform: "none",
                      py: 1,
                      bgcolor: "#0f2044", // UNCG Blue
                      "&:hover": {
                        bgcolor: "#1a365d", // Slightly lighter UNCG Blue
                      },
                    }}
                    startIcon={<AddIcon />}
                  >
                    Add Product
                  </Button>
                </Box>

                {products?.length > 0 && (
                  <Box sx={{ mb: 4 }}>
                    <Typography
                      variant="h6"
                      sx={{
                        mb: 2,
                        pb: 1,
                        borderBottom: `2px solid #ffc72c`, // UNCG Gold
                        display: "inline-block",
                        color: "#0f2044", // UNCG Blue
                      }}
                    >
                      Featured Listings
                    </Typography>
                    <Grid container spacing={2}>
                      {Array.isArray(products) &&
                        products
                          .filter((product) => product.status === "Available")
                          .slice(0, 3)
                          .map((product) => {
                            if (!product?.productID) return null;
                            return (
                              <Grid
                                item
                                xs={12}
                                sm={4}
                                key={`featured-${product.productID}`}
                              >
                                <Card
                                  sx={{
                                    display: "flex",
                                    height: "100%",
                                    border: "1px solid #e0e0e0",
                                    boxShadow: "none",
                                    transition: "transform 0.2s",
                                    "&:hover": {
                                      transform: "translateY(-4px)",
                                      boxShadow: "0 4px 8px rgba(0,0,0,0.1)",
                                    },
                                  }}
                                >
                                  <CardContent
                                    sx={{
                                      p: 2,
                                      display: "flex",
                                      alignItems: "center",
                                    }}
                                  >
                                    <Box
                                      sx={{
                                        width: 80,
                                        height: 80,
                                        backgroundColor: "#f5f5f5",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        borderRadius: 1,
                                        overflow: "hidden",
                                        flexShrink: 0,
                                        mr: 2,
                                      }}
                                    >
                                      <img
                                        src={
                                          product.image ||
                                          "https://via.placeholder.com/150"
                                        }
                                        alt={product.name}
                                        style={{
                                          maxWidth: "100%",
                                          maxHeight: "100%",
                                          objectFit: "contain",
                                        }}
                                        onError={(e) => {
                                          if (
                                            e.target instanceof HTMLImageElement
                                          ) {
                                            e.target.onerror = null;
                                            e.target.src =
                                              "https://via.placeholder.com/150";
                                          }
                                        }}
                                      />
                                    </Box>
                                    <Box sx={{ flexGrow: 1 }}>
                                      <Typography variant="subtitle2" noWrap>
                                        {product.name}
                                      </Typography>
                                      <Typography
                                        variant="subtitle1"
                                        fontWeight="bold"
                                        sx={{ color: "#0f2044" }}
                                      >
                                        ${parseFloat(product.price).toFixed(2)}
                                      </Typography>
                                      <Box
                                        sx={{
                                          display: "flex",
                                          alignItems: "center",
                                          mt: 1,
                                        }}
                                      >
                                        <Button
                                          component={Link}
                                          to={`/editProduct/${product.productID}`}
                                          size="small"
                                          sx={{
                                            mr: 1,
                                            fontSize: "0.75rem",
                                            color: "#0f2044",
                                            borderColor: "#0f2044",
                                            borderRadius: 0.5,
                                            py: 0.25,
                                            minWidth: 0,
                                            "&:hover": {
                                              borderColor: "#ffc72c", // UNCG Gold
                                              bgcolor:
                                                "rgba(255, 199, 44, 0.04)",
                                            },
                                          }}
                                          variant="outlined"
                                        >
                                          Edit
                                        </Button>
                                        <Chip
                                          label={product.condition}
                                          size="small"
                                          sx={{
                                            height: 20,
                                            fontSize: "0.7rem",
                                            bgcolor: "rgba(15, 32, 68, 0.08)", // Light UNCG Blue
                                          }}
                                        />
                                      </Box>
                                    </Box>
                                  </CardContent>
                                </Card>
                              </Grid>
                            );
                          })}
                    </Grid>
                  </Box>
                )}

                {products?.length === 0 ? (
                  <Paper
                    variant="outlined"
                    sx={{
                      p: 4,
                      textAlign: "center",
                      borderRadius: 2,
                      borderStyle: "dashed",
                    }}
                  >
                    <StoreIcon
                      sx={{ fontSize: 40, color: "text.disabled", mb: 1 }}
                    />
                    <Typography variant="body1" color="text.secondary">
                      You haven't uploaded any products yet
                    </Typography>
                    <Button
                      component={Link}
                      to="/uploadProduct"
                      variant="outlined"
                      color="primary"
                      sx={{
                        mt: 2,
                        borderRadius: 1,
                        textTransform: "none",
                        borderColor: "#0f2044",
                        color: "#0f2044",
                        "&:hover": {
                          borderColor: "#ffc72c", // UNCG Gold
                          bgcolor: "rgba(255, 199, 44, 0.04)",
                        },
                      }}
                    >
                      Upload Your First Product
                    </Button>
                  </Paper>
                ) : (
                  <Grid container spacing={3}>
                    {Array.isArray(products) &&
                      products.map((product) => {
                        if (!product?.productID) return null;
                        return (
                          <Grid
                            item
                            xs={12}
                            sm={6}
                            md={4}
                            key={product.productID}
                          >
                            <Zoom in={true} timeout={500}>
                              <Card
                                variant="outlined"
                                sx={{
                                  height: "100%",
                                  display: "flex",
                                  flexDirection: "column",
                                  borderRadius: 2,
                                  transition: "all 0.2s",
                                  border: "1px solid #e0e0e0",
                                  "&:hover": {
                                    boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                                  },
                                }}
                              >
                                {/* Status chip */}
                                <Box
                                  sx={{
                                    position: "absolute",
                                    top: 12,
                                    right: 12,
                                    zIndex: 1,
                                  }}
                                >
                                  <Chip
                                    label={product.status || "Available"}
                                    color={getStatusColor(product.status)}
                                    size="small"
                                    sx={{ fontSize: "0.75rem" }}
                                  />
                                </Box>

                                {/* Product image */}
                                <Box
                                  sx={{
                                    height: 180,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    p: 2,
                                    bgcolor: "grey.50",
                                  }}
                                >
                                  <img
                                    src={
                                      product.image ||
                                      "https://via.placeholder.com/150"
                                    }
                                    alt={product.name}
                                    style={{
                                      maxWidth: "100%",
                                      maxHeight: "100%",
                                      objectFit: "contain",
                                    }}
                                    onError={(e) => {
                                      if (
                                        e.target instanceof HTMLImageElement
                                      ) {
                                        e.target.onerror = null;
                                        e.target.src =
                                          "https://via.placeholder.com/150";
                                      }
                                    }}
                                  />
                                </Box>

                                {/* Product details */}
                                <CardContent sx={{ flexGrow: 1, p: 2 }}>
                                  <Typography
                                    variant="subtitle1"
                                    fontWeight="500"
                                    gutterBottom
                                    title={product.name}
                                  >
                                    {product.name?.length > 24
                                      ? `${product.name.substring(0, 24)}...`
                                      : product.name}
                                  </Typography>

                                  <Typography
                                    variant="h6"
                                    sx={{
                                      fontWeight: 500,
                                      my: 1,
                                      display: "flex",
                                      alignItems: "center",
                                      gap: 0.5,
                                      color: "#0f2044", // UNCG Blue
                                    }}
                                  >
                                    <LocalOfferIcon fontSize="small" />$
                                    {parseFloat(product.price).toFixed(2)}
                                  </Typography>

                                  <Stack spacing={1} sx={{ mb: 1 }}>
                                    <Box
                                      sx={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 0.5,
                                      }}
                                    >
                                      <CategoryIcon
                                        fontSize="small"
                                        color="action"
                                        sx={{ fontSize: 18 }}
                                      />
                                      <Typography
                                        variant="body2"
                                        color="text.secondary"
                                      >
                                        {product.category}
                                      </Typography>
                                    </Box>

                                    <Box
                                      sx={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 0.5,
                                      }}
                                    >
                                      <Box sx={{ display: "flex" }}>
                                        {[...Array(5)].map((_, i) => (
                                          <StarIcon
                                            key={i}
                                            sx={{
                                              color:
                                                i <
                                                getConditionStars(
                                                  product.condition
                                                )
                                                  ? "warning.main"
                                                  : "text.disabled",
                                              fontSize: "0.8rem",
                                            }}
                                          />
                                        ))}
                                      </Box>
                                      <Typography
                                        variant="body2"
                                        color="text.secondary"
                                      >
                                        {product.condition}
                                      </Typography>
                                    </Box>
                                  </Stack>
                                </CardContent>

                                {/* Action buttons */}
                                <Divider />
                                <Box
                                  sx={{
                                    p: 2,
                                    display: "flex",
                                    justifyContent: "space-between",
                                    gap: 1,
                                  }}
                                >
                                  <Tooltip title="Edit product">
                                    <Button
                                      component={Link}
                                      to={`/editProduct/${product.productID}`}
                                      variant="outlined"
                                      startIcon={<EditIcon />}
                                      size="small"
                                      sx={{
                                        flex: 1,
                                        borderRadius: 1,
                                        textTransform: "none",
                                        borderColor: "#0f2044",
                                        color: "#0f2044",
                                        "&:hover": {
                                          borderColor: "#ffc72c", // UNCG Gold
                                          bgcolor: "rgba(255, 199, 44, 0.04)",
                                        },
                                      }}
                                    >
                                      Edit
                                    </Button>
                                  </Tooltip>
                                  <Tooltip title="Delete product">
                                    <Button
                                      variant="outlined"
                                      startIcon={<DeleteIcon />}
                                      onClick={() =>
                                        handleDeleteProduct(product.productID)
                                      }
                                      size="small"
                                      sx={{
                                        flex: 1,
                                        borderRadius: 1,
                                        textTransform: "none",
                                        color: "#d32f2f",
                                        borderColor: "#d32f2f",
                                        "&:hover": {
                                          borderColor: "#d32f2f",
                                          bgcolor: "rgba(211, 47, 47, 0.04)",
                                        },
                                      }}
                                    >
                                      Delete
                                    </Button>
                                  </Tooltip>
                                </Box>
                              </Card>
                            </Zoom>
                          </Grid>
                        );
                      })}
                  </Grid>
                )}
              </Box>
            )}
          </Box>
        </Paper>

        {/* Delete Confirmation Dialog */}
        <Dialog
          open={openDeleteDialog}
          onClose={() => setOpenDeleteDialog(false)}
          PaperProps={{
            style: {
              borderRadius: "8px",
            },
          }}
        >
          <DialogTitle
            sx={{
              bgcolor: "#0f2044", // UNCG Blue
              color: "white",
            }}
          >
            Delete Product
          </DialogTitle>
          <DialogContent>
            <DialogContentText sx={{ mt: 2 }}>
              Are you sure you want to delete this product? This action cannot
              be undone.
            </DialogContentText>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button
              onClick={() => setOpenDeleteDialog(false)}
              sx={{
                textTransform: "none",
                color: "#0f2044",
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={confirmDeleteProduct}
              sx={{
                borderRadius: 1,
                textTransform: "none",
                bgcolor: "#d32f2f",
                color: "white",
                "&:hover": {
                  bgcolor: "#b71c1c",
                },
              }}
              variant="contained"
            >
              Delete
            </Button>
          </DialogActions>
        </Dialog>

        {/* Snackbar for notifications */}
        <Snackbar
          open={snackbar.open}
          autoHideDuration={5000}
          onClose={handleCloseSnackbar}
          anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
        >
          <Alert
            onClose={handleCloseSnackbar}
            severity={snackbar.severity === "error" ? "error" : "success"}
            variant="filled"
            sx={{
              width: "100%",
              borderRadius: 1,
              ...(snackbar.severity !== "error" && {
                bgcolor: "#0f2044", // UNCG Blue for success alerts
              }),
            }}
          >
            {snackbar.message}
          </Alert>
        </Snackbar>
      </Container>
    </Fade>
  );
};

export default Account;
