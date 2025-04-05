import React, { useState, useEffect } from "react";
import { supabase } from "../../../supabaseClient";
import { useNavigate, useLocation } from "react-router-dom";
import "./home.css";
import Search from "../search/search";
import NotificationBanner from "../common/NotificationBanner";
import { useAuth } from "../../../contexts/AuthContext";
import placeholderImage from "../../../assets/placeholder.js";
import { getFormattedImageUrl } from "../ChatSearch/utils/imageUtils";

export const Home = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showVerificationSuccess, setShowVerificationSuccess] = useState(false);
  const [userName, setUserName] = useState("");
  const [showVerificationFixNotification, setShowVerificationFixNotification] =
    useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, checkEmailVerification } = useAuth();

 
 // Scroll to top on initial page load only
useEffect(() => {
  window.scrollTo(0, 0);
}, []);


  // Check for verification success in URL parameters
  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    const verified = queryParams.get("verified");
    const needVerificationFix = queryParams.get("fix-verification");

    if (verified === "true") {
      // Remove the parameter from the URL without refreshing the page
      const newUrl = window.location.pathname;
      window.history.replaceState({}, document.title, newUrl);

      // Show the verification success message
      setShowVerificationSuccess(true);

      // Ensure auth context is updated with verification status
      const checkVerification = async () => {
        // Call the check function
        checkEmailVerification();

        // Check the session directly
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session) {
          console.log(
            "No valid session found after verification, redirecting to login"
          );
          navigate("/login");
        }
      };

      checkVerification();

      // Get user's name from localStorage
      const name = localStorage.getItem("userName") || "";
      setUserName(name);
    }

    // Check if we need to show verification fix notification
    if (needVerificationFix === "true") {
      setShowVerificationFixNotification(true);
      // Remove the parameter from URL
      const newUrl = window.location.pathname;
      window.history.replaceState({}, document.title, newUrl);
    }
  }, [location, checkEmailVerification, navigate]);

  // fetch products, limit to first 5 products in the database
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        // Fetch products that are available, not flagged, not deleted, and approved
        const { data, error } = await supabase
          .from("products")
          .select("*")
          .eq("status", "Available") // Only get available products
          .eq("flag", false) // Don't show flagged products
          .eq("is_deleted", false) // Don't show deleted products
          .eq("moderation_status", "approved") // Only show approved products
          .order("created_at", { ascending: false }) // Get newest first
          .limit(10); // Limit to 10 products

        if (error) {
          console.error("Error fetching products:", error);
        } else {
          console.log("Fetched featured products:", data);
          setProducts(data || []);
        }
      } catch (err) {
        console.error("Exception when fetching products:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  return (
    <div className="home">
      {showVerificationSuccess && (
        <NotificationBanner
          message={`Registration successful! Welcome${
            userName ? ` ${userName}` : ""
          } to Spartan Marketplace!`}
          type="success"
          show={true}
          duration={6000}
          onClose={() => setShowVerificationSuccess(false)}
        />
      )}

      {showVerificationFixNotification && (
        <div
          style={{
            backgroundColor: "#fff3cd",
            color: "#856404",
            padding: "10px",
            borderRadius: "4px",
            margin: "10px 0",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            <strong>Notice:</strong> If Supabase still shows "waiting for
            verification",
            <a
              href="/fix-verification"
              style={{
                marginLeft: "5px",
                color: "#856404",
                fontWeight: "bold",
              }}
            >
              click here to fix it
            </a>
            .
          </div>
          <button
            onClick={() => setShowVerificationFixNotification(false)}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              fontSize: "16px",
            }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Hero Section - Unique to homepage */}
      <section id="hero">
        <h1>Your Campus Marketplace</h1>
        <p>Buy, Sell, and Connect with Fellow Students</p>
        <Search />
      </section>

      {/* Featured Products - Already implemented */}
      <section id="featured-products">
        <h2>Featured Listings</h2>
        {loading ? (
          <p>Loading products...</p>
        ) : (
          <div className="home-product-list">
            {products.map((product) => (
              <div
                key={product.productID}
                className="home-product-card"
                onClick={() => navigate(`/product/${product.productID}`)}
              >
                <img
                  src={getFormattedImageUrl(product.image) || placeholderImage}
                  alt={product.name}
                  className="home-product-image"
                  onError={(e) => {
                    if (e.target instanceof HTMLImageElement) {
                      e.target.onerror = null;
                      e.target.src = placeholderImage;
                    }
                  }}
                />
                <h3>{product.name}</h3>
                <p className="home-product-price">
                  $
                  {(product.price && !isNaN(product.price)
                    ? parseFloat(product.price)
                    : 0
                  ).toFixed(2)}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default Home;