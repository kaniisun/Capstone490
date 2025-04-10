import React, { useState, useEffect } from "react";
import { supabase } from "../../../supabaseClient";
import { useNavigate, useLocation } from "react-router-dom";
import Filter from "../filter/Filter";
import "./products.css";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faHeart as solidHeart,
} from "@fortawesome/free-solid-svg-icons";
import { faHeart as regularHeart } from "@fortawesome/free-regular-svg-icons";
import placeholderImage from "../../../assets/placeholder.js";
import {
  Pagination,
  PaginationItem,
  Box,
  Typography,
  CircularProgress,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import { isFavorite, toggleFavorite } from "../../../utils/favoriteUtils";
import { getFormattedImageUrl } from "../ChatSearch/utils/imageUtils";

function Products() {
  const location = useLocation();
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [productsPerRow] = useState(3); // Assuming 3 products per row based on CSS
  const [rowsPerPage] = useState(4); // 4 rows per page as requested
  const [totalPages, setTotalPages] = useState(1);
  const itemsPerPage = productsPerRow * rowsPerPage;
  const [filteredProductsCount, setFilteredProductsCount] = useState(0);

  // Use the same filters structure as SearchResults
  const [filters, setFilters] = useState({
    categories: [],
    minPrice: "",
    maxPrice: "",
    conditions: [],
    isBundle: false,
  });

  useEffect(() => {
    // Reset to first page when filters change
    setCurrentPage(1);
  }, [filters]);

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      const params = new URLSearchParams(location.search);
      const categoryFromUrl = params.get("category");

      // Debug log to see what filters are being applied
      console.log("Applying filters:", {
        categories: filters.categories,
        minPrice: filters.minPrice,
        maxPrice: filters.maxPrice,
        conditions: filters.conditions,
        isBundle: filters.isBundle,
      });

      // Get all available, non-deleted, and approved products
      const productsResult = await supabase
        .from("products")
        .select("*")
        .or("status.eq.Available,status.eq.available") // Check for both uppercase and lowercase status
        .eq("is_deleted", false)
        .eq("moderation_status", "approved");

      const allProducts = productsResult.data || [];
      const error = productsResult.error;

      if (error) {
        console.error("Error fetching products:", error);
        setLoading(false);
        return;
      }

      // Add debug logging to check status values
      console.log(
        "All products before filtering:",
        allProducts.map((p) => ({
          id: p.productID,
          name: p.name,
          status: p.status,
          moderation: p.moderation_status,
        }))
      );

      // Apply all filters on the client side for more reliable filtering
      let filteredProducts = allProducts;

      // Apply category filter
      if (categoryFromUrl) {
        filteredProducts = filteredProducts.filter(
          (product) =>
            product.category &&
            product.category.toLowerCase() === categoryFromUrl.toLowerCase()
        );
      } else if (filters.categories.length > 0) {
        filteredProducts = filteredProducts.filter(
          (product) =>
            product.category &&
            filters.categories.some(
              (cat) => cat.toLowerCase() === product.category.toLowerCase()
            )
        );
      }

      // Apply price filters
      if (filters.minPrice !== "") {
        filteredProducts = filteredProducts.filter(
          (product) => product.price >= Number(filters.minPrice)
        );
      }

      if (filters.maxPrice !== "") {
        filteredProducts = filteredProducts.filter(
          (product) => product.price <= Number(filters.maxPrice)
        );
      }

      // Apply condition filter
      if (
        filters.conditions &&
        Array.isArray(filters.conditions) &&
        filters.conditions.length > 0
      ) {
        filteredProducts = filteredProducts.filter(
          (product) =>
            product.condition &&
            filters.conditions.some((condition) =>
              product.condition.toLowerCase().includes(condition.toLowerCase())
            )
        );
      }

      // Apply bundle filter
      if (filters.isBundle) {
        filteredProducts = filteredProducts.filter(
          (product) => product.is_bundle === true
        );
      }

      // Store the total filtered count before pagination
      setFilteredProductsCount(filteredProducts.length);

      // Calculate total pages
      const calculatedTotalPages = Math.ceil(
        filteredProducts.length / itemsPerPage
      );
      setTotalPages(calculatedTotalPages || 1); // Ensure at least 1 page

      // Apply pagination
      const startIndex = (currentPage - 1) * itemsPerPage;
      const endIndex = startIndex + itemsPerPage;
      const paginatedProducts = filteredProducts.slice(startIndex, endIndex);

      console.log(
        `Showing page ${currentPage} of ${calculatedTotalPages}, displaying ${paginatedProducts.length} of ${filteredProducts.length} products`
      );
      setProducts(paginatedProducts);
      setLoading(false);
    };

    fetchProducts();
  }, [location.search, filters, currentPage, itemsPerPage]);

  // Handle page changes
  const handlePageChange = (event, newPage) => {
    // Material UI Pagination is 1-based, so no need to check bounds
    setCurrentPage(newPage);
    // Scroll to top of product list
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="products-page-container">
      <Filter filters={filters} setFilters={setFilters} />
      <main className="products-main-content">
        <section id="featured-products">
          <h2>All Listings</h2>
          <p className="listings-description">
            Browse all available products across campus. Use the filters to
            narrow your search.
          </p>
          {loading ? (
            <Box className="loading-spinner-container">
              <CircularProgress />
            </Box>
          ) : (
            <>
              <div className="product-list">
                {products.length === 0 ? (
                  <div className="no-products-message">
                    <p>No products match your selected filters.</p>
                  </div>
                ) : (
                  products.map((product) => {
                    // Debug product values
                    console.log(`Product ${product.name}:`, {
                      id: product.productID,
                      is_bundle: product.is_bundle,
                      status: product.status,
                    });

                    return (
                      <div
                        key={product.productID}
                        className="product"
                        data-spot={
                          product.productID % 2 === 0 ? "true" : "false"
                        }
                      >
                        {/* Favorite icon */}
                        <div
                          className="favorite-icon-container"
                          onClick={(e) => {
                            e.stopPropagation(); // Prevent navigating to product
                            toggleFavorite(product.productID);
                            // Force re-render to update the heart
                            setProducts([...products]);
                          }}
                        >
                          <FontAwesomeIcon
                            icon={
                              isFavorite(product.productID)
                                ? solidHeart
                                : regularHeart
                            }
                            className={`favorite-icon ${isFavorite(product.productID)
                              ? "favorite-active"
                              : ""
                              }`}
                          />
                        </div>

                        {/* Product image */}
                        <div
                          className="product-image-container"
                          onClick={() =>
                            navigate(`/product/${product.productID}`)
                          }
                        >
                          <img
                            src={
                              getFormattedImageUrl(product.image) ||
                              placeholderImage
                            }
                            alt={product.name}
                            className="product-image"
                            onError={(e) => {
                              if (e.target instanceof HTMLImageElement) {
                                e.target.onerror = null;
                                e.target.src = placeholderImage;
                              }
                            }}
                          />
                        </div>

                        {/* Product info */}
                        <div
                          className="product-info"
                          onClick={() =>
                            navigate(`/product/${product.productID}`)
                          }
                        >
                          {/* Product name */}
                          <div
                            className="products-product-name"
                            title={product.name}
                          >
                            {product.name}
                          </div>

                          {/* Price */}
                          <p className="price">
                            ${parseFloat(product.price).toFixed(2)}
                          </p>

                          {/* Tags container for status */}
                          <div className="product-tags">
                            {/* Status tag */}
                            <span
                              className={`status-${(
                                product.status || "available"
                              ).toLowerCase()}`}
                            >
                              {product.status === "available" ||
                                product.status === "Available"
                                ? "Available"
                                : product.status === "sold" ||
                                  product.status === "Sold"
                                  ? "Sold"
                                  : product.status || "Available"}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Material UI Pagination Controls */}
              {totalPages > 1 && (
                <Box className="pagination-with-info">
                  {/* Product range information on the left */}
                  <Typography className="product-range-info">
                    Showing {(currentPage - 1) * itemsPerPage + 1}-
                    {Math.min(
                      currentPage * itemsPerPage,
                      filteredProductsCount
                    )}{" "}
                    of {filteredProductsCount} product
                    {filteredProductsCount !== 1 ? "s" : ""}
                  </Typography>

                  {/* Pagination controls on the right */}
                  <Pagination
                    count={totalPages}
                    page={currentPage}
                    onChange={handlePageChange}
                    color="primary"
                    size="large"
                    showFirstButton
                    showLastButton
                    renderItem={(item) => (
                      <PaginationItem
                        components={{
                          previous: ArrowBackIcon,
                          next: ArrowForwardIcon,
                        }}
                        {...item}
                      />
                    )}
                  />
                </Box>
              )}
            </>
          )}
        </section>
      </main>
    </div>
  );
}

export default Products;
