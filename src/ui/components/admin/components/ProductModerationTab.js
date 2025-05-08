import React, { useState, useEffect } from "react";
import {
  Box,
  Paper,
  Typography,
  Alert,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  ListItemSecondaryAction,
  Avatar,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Chip,
  IconButton,
  Divider,
  Grid,
  Tab,
  Tabs,
} from "@mui/material";
import {
  CheckCircle as ApproveIcon,
  Cancel as RejectIcon,
  Archive as ArchiveIcon,
  Visibility as ViewIcon,
  Refresh as RefreshIcon,
} from "@mui/icons-material";
import { supabase } from "../../../../supabaseClient";
import {
  getFormattedImageUrl,
  getProductImageUrl,
} from "../../ChatSearch/utils/imageUtils";
import API_CONFIG from "../../../../config/api.js";

const ProductModerationTab = ({ setSnackbar }) => {
  // State for products
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("pending");
  const [error, setError] = useState(null);

  // State for moderation action dialog
  const [moderationDialog, setModerationDialog] = useState({
    open: false,
    product: null,
    action: null,
    reason: "",
  });

  // State for product details dialog
  const [detailsDialog, setDetailsDialog] = useState({
    open: false,
    product: null,
  });

  // Fetch products from the API endpoint directly
  const fetchProducts = async (filterStatus = "pending") => {
    console.log(`Fetching products with status: ${filterStatus}`);
    setLoading(true);
    setError(null);

    try {
      // Get authentication token
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;

      if (!token) {
        console.error("No authentication token available");
        setError("Authentication required. Please log in again.");
        setLoading(false);
        return;
      }

      // Prepare headers with proper Accept header to avoid 406 errors
      const headers = {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      };

      // Make API request with properly encoded query parameters
      const encodedStatus = encodeURIComponent(filterStatus);
      const response = await fetch(
        API_CONFIG.getUrl(
          `${API_CONFIG.ENDPOINTS.MODERATE_PRODUCTS}?status=${encodedStatus}`
        ),
        {
          method: "GET",
          headers: headers,
        }
      );

      // Check if content type is JSON
      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        console.error("Response is not JSON:", contentType);
        throw new Error(`Expected JSON response but got ${contentType}`);
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || `Error ${response.status}: ${response.statusText}`
        );
      }

      if (data.success && data.products) {
        // Filter products to match exactly the requested status
        const filteredProducts = data.products.filter((product) => {
          if (filterStatus === "pending") {
            // For pending tab, include null and "pending" statuses
            return (
              !product.moderation_status ||
              product.moderation_status === "pending"
            );
          } else {
            // For other tabs, only show products with exactly matching status
            return product.moderation_status === filterStatus;
          }
        });

        setProducts(filteredProducts);
        console.log(
          `Found ${filteredProducts.length} products with status: ${filterStatus}`
        );
      } else {
        console.error("API returned success but no products array");
        throw new Error("Invalid API response format");
      }
    } catch (error) {
      console.error("Error fetching products:", error);
      setError(`Failed to fetch products: ${error.message}`);

      // Fallback to direct Supabase query if API fails
      try {
        await fetchProductsDirectFromSupabase(filterStatus);
      } catch (fallbackError) {
        console.error("Fallback also failed:", fallbackError);
        setError(`API and fallback both failed: ${fallbackError.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  // Add fallback function to query Supabase directly
  const fetchProductsDirectFromSupabase = async (filterStatus = "pending") => {
    console.log(
      `Querying Supabase directly for products with status: ${filterStatus}`
    );

    let query = supabase.from("products").select("*").eq("is_deleted", false);

    // Apply filter based on status
    if (filterStatus === "pending") {
      // Handle both NULL and 'pending' values for backward compatibility
      query = query.or(
        "moderation_status.is.null,moderation_status.eq.pending"
      );
    } else if (filterStatus) {
      // For other statuses, only fetch exact matches
      query = query.eq("moderation_status", filterStatus);
    }

    const { data, error } = await query.order("created_at", {
      ascending: false,
    });

    if (error) {
      console.error("Supabase query error:", error);
      throw error;
    }

    console.log(`Found ${data.length} products directly from Supabase`);
    setProducts(data);
  };

  // Fetch products on component mount and when filter changes
  useEffect(() => {
    console.log(`Tab changed, fetching products with status: ${filterStatus}`);
    fetchProducts(filterStatus);
  }, [filterStatus]);

  // Handle tab change
  const handleTabChange = (event, newValue) => {
    console.log(`Tab changing from ${filterStatus} to ${newValue}`);
    setFilterStatus(newValue);
  };

  // Handle moderation action click
  const handleModerationAction = (product, action) => {
    setModerationDialog({
      open: true,
      product,
      action,
      reason: "",
    });
  };

  // Handle view product details
  const handleViewDetails = (product) => {
    setDetailsDialog({
      open: true,
      product,
    });
  };

  // Close moderation dialog
  const handleCloseModeration = () => {
    setModerationDialog({
      open: false,
      product: null,
      action: null,
      reason: "",
    });
  };

  // Close details dialog
  const handleCloseDetails = () => {
    setDetailsDialog({
      open: false,
      product: null,
    });
  };

  // Handle reason change
  const handleReasonChange = (e) => {
    setModerationDialog({
      ...moderationDialog,
      reason: e.target.value,
    });
  };

  // Submit moderation action
  const handleSubmitModeration = async () => {
    if (!moderationDialog.product || !moderationDialog.action) return;

    const { product, action, reason } = moderationDialog;

    try {
      // Map action to status
      const statusMap = {
        approve: "approved",
        reject: "rejected",
        archive: "archived",
      };

      const status = statusMap[action];

      if (!status) {
        throw new Error(`Invalid action: ${action}`);
      }

      // Get authentication token
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;

      if (!token) {
        throw new Error("Authentication required. Please log in again.");
      }

      // Prepare request data
      const requestData = {
        productId: product.productID,
        status,
      };

      // Add reason if provided (required for rejection)
      if (reason || action === "reject") {
        requestData.reason = reason;
      }

      // Call API to moderate product
      const response = await fetch(
        API_CONFIG.getUrl(API_CONFIG.ENDPOINTS.MODERATE_PRODUCT),
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(requestData),
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Failed to moderate product");
      }

      // Show success message
      setSnackbar({
        open: true,
        message: `Product has been ${status}. Refreshing data...`,
        severity: "success",
      });

      // Close the dialog before refreshing
      handleCloseModeration();

      // Wait a moment before refreshing to ensure changes propagate
      setTimeout(async () => {
        // Temporarily update UI for better responsiveness while waiting for refresh
        if (filterStatus === "pending") {
          // Remove the product from pending tab if we've moderated it
          setProducts(
            products.filter((p) => p.productID !== product.productID)
          );
        } else if (filterStatus === status) {
          // Update the product in the current list if we're on the matching tab
          setProducts(
            products.map((p) =>
              p.productID === product.productID
                ? {
                    ...p,
                    moderation_status: status,
                    moderation_reason: reason || p.moderation_reason,
                    modified_at: new Date().toISOString(),
                  }
                : p
            )
          );
        }

        // Force a complete refresh from the API
        await fetchProducts(filterStatus);
      }, 1000);
    } catch (error) {
      console.error(`Error ${action}ing product:`, error);
      setSnackbar({
        open: true,
        message: error.message,
        severity: "error",
      });
      handleCloseModeration();
    }
  };

  // Get color for moderation status chip
  const getStatusColor = (status) => {
    switch (status) {
      case "approved":
        return "success";
      case "rejected":
        return "error";
      case "archived":
        return "default";
      case "pending":
      default:
        return "warning";
    }
  };

  return (
    <Box>
      <Box sx={{ mb: 2 }}>
        <Alert
          severity="info"
          sx={{ mb: 2 }}
          action={
            <Button
              color="inherit"
              startIcon={<RefreshIcon />}
              onClick={() => fetchProducts(filterStatus)}
            >
              Refresh
            </Button>
          }
        >
          <Typography variant="body2" component="div">
            Review and moderate product listings. You can approve, reject, or
            archive products as needed.
          </Typography>
        </Alert>
      </Box>

      {/* Filter Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 2 }}>
        <Tabs
          value={filterStatus}
          onChange={handleTabChange}
          aria-label="product moderation tabs"
        >
          <Tab label="Pending" value="pending" />
          <Tab label="Approved" value="approved" />
          <Tab label="Rejected" value="rejected" />
          <Tab label="Archived" value="archived" />
        </Tabs>
      </Box>

      {/* Products List */}
      <Paper elevation={2} sx={{ p: 2, mb: 4 }}>
        {loading ? (
          <Typography>Loading products...</Typography>
        ) : error ? (
          <Typography color="error">{error}</Typography>
        ) : products.length === 0 ? (
          <Typography>No products found with the selected filter.</Typography>
        ) : (
          <List>
            {products.map((product) => (
              <React.Fragment key={product.productID}>
                <ListItem alignItems="flex-start">
                  <ListItemAvatar>
                    <Avatar
                      alt={product.name}
                      src={
                        getFormattedImageUrl(product.image) ||
                        "/placeholder.png"
                      }
                      variant="rounded"
                      sx={{ width: 60, height: 60, mr: 2 }}
                    />
                  </ListItemAvatar>
                  <ListItemText
                    primary={
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          gap: 1,
                          mb: 0.5,
                        }}
                      >
                        <Typography variant="subtitle1" component="span">
                          {product.name}
                        </Typography>
                        <Chip
                          size="small"
                          label={product.price ? `$${product.price}` : "N/A"}
                          color="primary"
                          variant="outlined"
                        />
                        <Chip
                          size="small"
                          label={product.moderation_status || "pending"}
                          color={getStatusColor(
                            product.moderation_status || "pending"
                          )}
                        />
                      </Box>
                    }
                    secondary={
                      <>
                        <Typography
                          variant="body2"
                          color="text.primary"
                          component="span"
                          sx={{
                            display: "-webkit-box",
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: "vertical",
                            overflow: "hidden",
                            mb: 1,
                          }}
                        >
                          {product.description || "No description available"}
                        </Typography>
                        <Typography variant="caption" component="div">
                          {`Listed: ${new Date(
                            product.created_at
                          ).toLocaleDateString()}`}
                          {product.category &&
                            ` • Category: ${product.category}`}
                          {product.condition &&
                            ` • Condition: ${product.condition}`}
                        </Typography>
                      </>
                    }
                  />
                  <ListItemSecondaryAction sx={{ display: "flex", gap: 1 }}>
                    <IconButton onClick={() => handleViewDetails(product)}>
                      <ViewIcon />
                    </IconButton>
                    {filterStatus === "pending" && (
                      <>
                        <IconButton
                          color="success"
                          onClick={() =>
                            handleModerationAction(product, "approve")
                          }
                        >
                          <ApproveIcon />
                        </IconButton>
                        <IconButton
                          color="error"
                          onClick={() =>
                            handleModerationAction(product, "reject")
                          }
                        >
                          <RejectIcon />
                        </IconButton>
                        <IconButton
                          onClick={() =>
                            handleModerationAction(product, "archive")
                          }
                        >
                          <ArchiveIcon />
                        </IconButton>
                      </>
                    )}
                  </ListItemSecondaryAction>
                </ListItem>
                <Divider component="li" />
              </React.Fragment>
            ))}
          </List>
        )}
      </Paper>

      {/* Moderation Action Dialog */}
      <Dialog
        open={moderationDialog.open}
        onClose={handleCloseModeration}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {moderationDialog.action === "approve"
            ? "Approve Product"
            : moderationDialog.action === "reject"
            ? "Reject Product"
            : moderationDialog.action === "archive"
            ? "Archive Product"
            : "Moderate Product"}
        </DialogTitle>
        <DialogContent>
          {moderationDialog.product && (
            <>
              <DialogContentText>
                {moderationDialog.action === "approve"
                  ? "Are you sure you want to approve this product? It will be visible to all users."
                  : moderationDialog.action === "reject"
                  ? "Are you sure you want to reject this product? It will be hidden from all users."
                  : "Are you sure you want to archive this product? It will be hidden from all users."}
              </DialogContentText>
              <Box sx={{ my: 2 }}>
                <Typography variant="subtitle1">
                  {moderationDialog.product.name}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {moderationDialog.product.description}
                </Typography>
              </Box>
              {(moderationDialog.action === "reject" ||
                moderationDialog.action === "archive") && (
                <TextField
                  autoFocus
                  margin="dense"
                  id="reason"
                  label="Reason"
                  type="text"
                  fullWidth
                  variant="outlined"
                  value={moderationDialog.reason}
                  onChange={handleReasonChange}
                  required={moderationDialog.action === "reject"}
                  helperText={
                    moderationDialog.action === "reject"
                      ? "Reason is required when rejecting a product"
                      : "Optional reason for archiving"
                  }
                />
              )}
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseModeration}>Cancel</Button>
          <Button
            onClick={handleSubmitModeration}
            variant="contained"
            color={
              moderationDialog.action === "approve"
                ? "success"
                : moderationDialog.action === "reject"
                ? "error"
                : "primary"
            }
            disabled={
              moderationDialog.action === "reject" && !moderationDialog.reason
            }
          >
            {moderationDialog.action === "approve"
              ? "Approve"
              : moderationDialog.action === "reject"
              ? "Reject"
              : "Archive"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Product Details Dialog */}
      <Dialog
        open={detailsDialog.open}
        onClose={handleCloseDetails}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Product Details</DialogTitle>
        <DialogContent>
          {detailsDialog.product && (
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Box sx={{ mb: 2 }}>
                  <img
                    src={
                      getProductImageUrl(detailsDialog.product) ||
                      "/placeholder.png"
                    }
                    alt={detailsDialog.product.name}
                    style={{
                      width: "100%",
                      height: 300,
                      objectFit: "contain",
                    }}
                    onError={(e) => {
                      if (e.target instanceof HTMLImageElement) {
                        e.target.onerror = null;
                        e.target.src = "/placeholder.png";
                      }
                    }}
                  />
                </Box>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="h6" gutterBottom>
                  {detailsDialog.product.name}
                </Typography>
                <Chip
                  label={`$${detailsDialog.product.price || "N/A"}`}
                  color="primary"
                  sx={{ mb: 2 }}
                />
                <Typography variant="body1" paragraph>
                  {detailsDialog.product.description}
                </Typography>
                <Typography variant="subtitle2" gutterBottom>
                  Details:
                </Typography>
                <Typography variant="body2">
                  <strong>Category:</strong>{" "}
                  {detailsDialog.product.category || "N/A"}
                </Typography>
                <Typography variant="body2">
                  <strong>Condition:</strong>{" "}
                  {detailsDialog.product.condition || "N/A"}
                </Typography>
                <Typography variant="body2">
                  <strong>Status:</strong>{" "}
                  {detailsDialog.product.status || "N/A"}
                </Typography>
                <Typography variant="body2">
                  <strong>Listed by:</strong>{" "}
                  {detailsDialog.product.userID || "Unknown"}
                </Typography>
                <Typography variant="body2">
                  <strong>Listed on:</strong>{" "}
                  {new Date(
                    detailsDialog.product.created_at
                  ).toLocaleDateString()}
                </Typography>
                {detailsDialog.product.moderation_status && (
                  <>
                    <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>
                      Moderation:
                    </Typography>
                    <Typography variant="body2">
                      <strong>Status:</strong>{" "}
                      <Chip
                        size="small"
                        label={detailsDialog.product.moderation_status}
                        color={getStatusColor(
                          detailsDialog.product.moderation_status
                        )}
                      />
                    </Typography>
                    {detailsDialog.product.moderation_reason && (
                      <Typography variant="body2">
                        <strong>Reason:</strong>{" "}
                        {detailsDialog.product.moderation_reason}
                      </Typography>
                    )}
                  </>
                )}
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDetails}>Close</Button>
          {detailsDialog.product &&
            detailsDialog.product.moderation_status !== "approved" && (
              <Button
                onClick={() =>
                  handleModerationAction(detailsDialog.product, "approve")
                }
                color="success"
                variant="contained"
              >
                Approve
              </Button>
            )}
          {detailsDialog.product &&
            detailsDialog.product.moderation_status !== "rejected" && (
              <Button
                onClick={() =>
                  handleModerationAction(detailsDialog.product, "reject")
                }
                color="error"
                variant="contained"
              >
                Reject
              </Button>
            )}
          {detailsDialog.product &&
            detailsDialog.product.moderation_status !== "archived" && (
              <Button
                onClick={() =>
                  handleModerationAction(detailsDialog.product, "archive")
                }
                variant="contained"
              >
                Archive
              </Button>
            )}
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ProductModerationTab;
