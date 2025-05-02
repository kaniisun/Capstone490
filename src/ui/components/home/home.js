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
  const { checkEmailVerification } = useAuth();

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
        const sessionResult = await supabase.auth.getSession();
        const session = sessionResult.data?.session;

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

  // fetch products, limit to first 10 products in the database
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        // First try to get available products
        let result = await supabase
          .from("products")
          .select("*")
          .eq("status", "Available")
          .eq("flag", false)
          .eq("is_deleted", false)
          .eq("moderation_status", "approved")
          .order("created_at", { ascending: false })
          .limit(10);

        let data = result.data || [];

        // If we don't have 10 items, try to get more with relaxed status filter
        if (data.length < 10) {
          const remainingCount = 10 - data.length;
          const additionalResult = await supabase
            .from("products")
            .select("*")
            .eq("flag", false)
            .eq("is_deleted", false)
            .eq("moderation_status", "approved")
            .not("productID", "in", `(${data.map(p => p.productID).join(",")})`)
            .order("created_at", { ascending: false })
            .limit(remainingCount);

          if (additionalResult.data) {
            data = [...data, ...additionalResult.data];
          }
        }

        console.log("Fetched featured products:", data);
        setProducts(data);
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
          message={`Registration successful! Welcome${userName ? ` ${userName}` : ""
            } to Spartan Marketplace!`}
          type="success"
          show={true}
          duration={6000}
          onClose={() => setShowVerificationSuccess(false)}
        />
      )}

      {showVerificationFixNotification && (
        <div className="verification-fix-banner">
          <div>
            <strong>Notice:</strong> If Supabase still shows "waiting for
            verification",
            <a href="/fix-verification">click here to fix it</a>.
          </div>
          <button onClick={() => setShowVerificationFixNotification(false)}>
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
