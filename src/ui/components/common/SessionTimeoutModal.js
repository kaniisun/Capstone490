import React, { useState, useEffect } from "react";
import { useAuth } from "../../../contexts/AuthContext";
import "./SessionTimeoutModal.css";

// Time before session expiration to show the warning (2 minutes)
const WARNING_BEFORE_TIMEOUT = 2 * 60 * 1000;

// How often to update the countdown timer (every second)
const COUNTDOWN_INTERVAL = 1000;

function SessionTimeoutModal() {
  const { refreshSession, logout } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [remainingTime, setRemainingTime] = useState(0);
  const [countdownInterval, setCountdownInterval] = useState(null);

  // Add function to determine if the current path is a public route
  const isPublicRoute = () => {
    const publicRoutes = [
      "/login",
      "/register",
      "/forgot-password",
      "/reset-password",
      "/verify-email",
      "/",
      "/landing",
    ];
    const currentPath = window.location.pathname;

    // Check if the current path is in the list of public routes
    return publicRoutes.some(
      (route) => currentPath === route || currentPath === route + "/"
    );
  };

  useEffect(() => {
    // Function to check if we should show the warning
    const checkSessionExpiration = () => {
      // Don't check session expiration on public routes
      if (isPublicRoute()) {
        return;
      }

      // Get the session expiration time from localStorage
      const expirationTime = localStorage.getItem("sessionExpiration");

      if (expirationTime) {
        const currentTime = new Date().getTime();
        const timeUntilExpiration = parseInt(expirationTime, 10) - currentTime;

        // If the session is about to expire, show the warning
        if (
          timeUntilExpiration > 0 &&
          timeUntilExpiration <= WARNING_BEFORE_TIMEOUT
        ) {
          setRemainingTime(Math.floor(timeUntilExpiration / 1000));
          setShowModal(true);

          // Start the countdown timer
          const intervalId = setInterval(() => {
            setRemainingTime((prevTime) => {
              // If time is up, clear the interval and logout
              if (prevTime <= 1) {
                clearInterval(intervalId);
                logout();
                return 0;
              }
              return prevTime - 1;
            });
          }, COUNTDOWN_INTERVAL);

          setCountdownInterval(intervalId);
        }
      }
    };

    // Check session expiration regularly
    const intervalId = setInterval(checkSessionExpiration, 10000);

    // Clean up intervals on unmount
    return () => {
      clearInterval(intervalId);
      if (countdownInterval) {
        clearInterval(countdownInterval);
      }
    };
  }, [logout]);

  // Handle continue session
  const handleContinue = () => {
    if (countdownInterval) {
      clearInterval(countdownInterval);
      setCountdownInterval(null);
    }
    refreshSession();
    setShowModal(false);
  };

  // Handle logout
  const handleLogout = () => {
    if (countdownInterval) {
      clearInterval(countdownInterval);
      setCountdownInterval(null);
    }
    logout();
  };

  // Format the remaining time as MM:SS
  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, "0")}:${remainingSeconds
      .toString()
      .padStart(2, "0")}`;
  };

  // Only render the modal if it should be shown
  if (!showModal) {
    return null;
  }

  return (
    <div className="session-timeout-overlay">
      <div className="session-timeout-modal">
        <h2>Session Timeout Warning</h2>
        <div className="timeout-message">
          <p>Your session will expire in:</p>
          <div className="countdown-timer">{formatTime(remainingTime)}</div>
          <p>Would you like to continue your session?</p>
        </div>
        <div className="timeout-actions">
          <button className="continue-btn" onClick={handleContinue}>
            Continue Session
          </button>
          <button className="logout-btn" onClick={handleLogout}>
            Logout Now
          </button>
        </div>
      </div>
    </div>
  );
}

export default SessionTimeoutModal;
