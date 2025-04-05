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
  const [showVerificationFixNotification, setShowVerificationFixNotification] = useState(false);
  const [showFirstTimePopup, setShowFirstTimePopup] = useState(false); // 👈 new state


  const navigate = useNavigate();
  const location = useLocation();
  const { user, checkEmailVerification } = useAuth();

  // Scroll to top logic
  // Scroll to top on initial page load only
useEffect(() => {
  window.scrollTo(0, 0);
}, []);


  // Check for email verification from URL params
  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    const verified = queryParams.get("verified");
    const needVerificationFix = queryParams.get("fix-verification");

    if (verified === "true") {
      const newUrl = window.location.pathname;
      window.history.replaceState({}, document.title, newUrl);
      setShowVerificationSuccess(true);

      const checkVerification = async () => {
        checkEmailVerification();
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          console.log("No valid session found after verification, redirecting to login");
          navigate("/login");
        }
      };
      checkVerification();

      const name = localStorage.getItem("userName") || "";
      setUserName(name);
    }

    if (needVerificationFix === "true") {
      setShowVerificationFixNotification(true);
      const newUrl = window.location.pathname;
      window.history.replaceState({}, document.title, newUrl);
    }
  }, [location, checkEmailVerification, navigate]);

  // Check if it's the first login
  useEffect(() => {
    if (user) {
      const hasSeenPopup = localStorage.getItem("hasSeenFirstTimePopup");
      if (!hasSeenPopup) {
        setShowFirstTimePopup(true);
        localStorage.setItem("hasSeenFirstTimePopup", "true");
      }
    }
  }, [user]);
    
 



  // Fetch products
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const { data, error } = await supabase
          .from("products")
          .select("*")
          .eq("status", "Available")
          .eq("flag", false)
          .eq("is_deleted", false)
          .eq("moderation_status", "approved")
          .order("created_at", { ascending: false })
          .limit(10);

        if (error) {
          console.error("Error fetching products:", error);
        } else {
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
          message={`Registration successful! Welcome${userName ? ` ${userName}` : ""} to Spartan Marketplace!`}
          type="success"
          show={true}
          duration={6000}
          onClose={() => setShowVerificationSuccess(false)}
        />
      )}

      {showVerificationFixNotification && (
        <div className="verification-fix-banner">
          <div>
            <strong>Notice:</strong> If Supabase still shows "waiting for verification",
            <a href="/fix-verification">click here to fix it</a>.
          </div>
          <button onClick={() => setShowVerificationFixNotification(false)}>✕</button>
        </div>
      )}
    
    
      {/* First-time login popup */}
      {showFirstTimePopup && (
  <div className="first-time-popup">
    <div className="popup-box">
      👋 Hey there! Click your profile icon to see your full account!
      <button onClick={() => setShowFirstTimePopup(false)}>Got it!</button>
    </div>
  </div>
)}


      {/* Hero Section */}
      <section id="hero">
        <h1>Your Campus Marketplace</h1>
        <p>Buy, Sell, and Connect with Fellow Students</p>
        <Search />
      </section>

      {/* Featured Products */}
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
