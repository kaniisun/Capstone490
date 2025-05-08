import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useAuth } from "../../../contexts/AuthContext";
import { supabase } from "../../../supabaseClient";
import "./SessionTimeoutModal.css";

// How often to update the countdown timer (every second)
const COUNTDOWN_INTERVAL = 1000;

// How often to check if we should show the warning (twice per second for responsive checks)
const CHECK_INTERVAL = 500;

// Function to find or create a DOM element for the portal
const getOrCreatePortalRoot = () => {
  let portalRoot = document.getElementById("session-timeout-portal");
  if (!portalRoot) {
    portalRoot = document.createElement("div");
    portalRoot.id = "session-timeout-portal";
    document.body.appendChild(portalRoot);
  }
  return portalRoot;
};

function SessionTimeoutModal() {
  const { refreshSession, logout } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [remainingTime, setRemainingTime] = useState(0);
  const countdownIntervalRef = useRef(null);
  const isMounted = useRef(true);
  const checkIntervalRef = useRef(null);
  const portalRootRef = useRef(getOrCreatePortalRoot());

  // Create and dispatch a custom event when session expires
  const createAndDispatchSessionExpiredEvent = () => {
    const event = new CustomEvent("sessionExpired", {
      detail: { timestamp: new Date().getTime() },
    });
    document.dispatchEvent(event);
  };

  // Function to reset modal state
  const resetModalState = () => {
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    setRemainingTime(0);
    setShowModal(false);
    // Let AuthContext know warning is no longer active
    localStorage.setItem("sessionWarningActive", "false");
  };

  // Handle extend session
  const handleExtend = (e) => {
    if (e) e.preventDefault();

    // First refresh the session (this resets the timer)
    refreshSession();

    // Then reset the modal state
    resetModalState();
  };

  // Handle manual logout
  const handleLogout = (e) => {
    if (e) e.preventDefault();

    // First reset the modal state
    resetModalState();

    // Then perform logout
    logout();
  };

  // Function to handle automatic logout when timer expires
  const handleAutoLogout = async () => {
    // Check if we're already in the process of logging out to prevent duplicate calls
    if (localStorage.getItem("loggingOut") === "true") {
      return;
    }

    // Reset all intervals and state first
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }

    if (checkIntervalRef.current) {
      clearInterval(checkIntervalRef.current);
      checkIntervalRef.current = null;
    }

    // Set flag to track that we're in the process of logging out
    localStorage.setItem("loggingOut", "true");

    // Reset React state
    setShowModal(false);
    setRemainingTime(0);

    // Reset localStorage state
    localStorage.setItem("sessionWarningActive", "false");

    // Clear critical localStorage items to force logout state
    localStorage.removeItem("sessionExpiration");
    localStorage.removeItem("lastActivity");
    localStorage.removeItem("isLoggedIn");
    localStorage.removeItem("userName");
    localStorage.removeItem("userEmail");
    localStorage.removeItem("userId");
    localStorage.removeItem("isEmailVerified");

    // First try the context logout function
    try {
      logout();
      return;
    } catch (error) {
      console.error("Error with context logout:", error);
    }

    // If context logout fails, try direct Supabase logout
    try {
      const { error } = await supabase.auth.signOut();

      if (error) {
        console.error("Supabase signOut error:", error);
      }
    } catch (error) {
      console.error("Error during Supabase logout:", error);
    }

    // Regardless of the result above, force a redirect to login
    setTimeout(() => {
      window.location.href = "/login";
    }, 500);
  };

  // Function to handle session warning
  const handleSessionWarning = (source) => {
    try {
      // Get current expiration time
      const expirationTime = localStorage.getItem("sessionExpiration");
      if (!expirationTime) {
        localStorage.setItem("sessionWarningActive", "false");
        return;
      }

      // Calculate remaining time
      const currentTime = new Date().getTime();
      const timeUntilExpiration = parseInt(expirationTime, 10) - currentTime;

      if (timeUntilExpiration <= 0) {
        // Expired already - skip showing modal and go straight to logout
        handleAutoLogout();
      } else {
        // Valid warning - show modal with exactly 60 seconds countdown
        if (countdownIntervalRef.current) {
          clearInterval(countdownIntervalRef.current);
          countdownIntervalRef.current = null;
        }

        // Set modal visibility
        setShowModal(true);

        // Start countdown timer with 60 seconds
        const timerId = startCountdownTimer(60);
        countdownIntervalRef.current = timerId;
      }
    } catch (error) {
      console.error("Error handling session warning:", error);
    }
  };

  // Check session warning status
  const checkSessionWarning = () => {
    if (!isMounted.current) return;

    // Check if we're logged in
    const isLoggedIn = localStorage.getItem("isLoggedIn") === "true";
    if (!isLoggedIn) {
      if (showModal) resetModalState();
      return;
    }

    try {
      // Get session expiration time and warning status
      const expirationTime = localStorage.getItem("sessionExpiration");
      const warningActive =
        localStorage.getItem("sessionWarningActive") === "true";

      if (!expirationTime) {
        return;
      }

      const currentTime = new Date().getTime();
      const timeUntilExpiration = parseInt(expirationTime, 10) - currentTime;

      // Handle specific state combinations:

      // Case 1: Warning active, modal not shown, time remaining - need to show modal
      if (warningActive && !showModal && timeUntilExpiration > 0) {
        setShowModal(true);

        // Start/restart countdown timer with max 60 seconds
        if (countdownIntervalRef.current) {
          clearInterval(countdownIntervalRef.current);
        }

        startCountdownTimer(60);
      }
      // Case 2: Warning not active, modal shown - need to hide modal
      else if (!warningActive && showModal) {
        resetModalState();
      }
      // Case 3: Time expired with modal showing - perform logout
      else if (timeUntilExpiration <= 0 && showModal) {
        resetModalState();
        handleAutoLogout();
      }
      // Case 4: Warning active but time expired - perform logout without showing modal
      else if (timeUntilExpiration <= 0 && warningActive) {
        handleAutoLogout();
      }
    } catch (error) {
      console.error("Error checking session:", error);
    }
  };

  // Helper function to start a consistent countdown timer
  const startCountdownTimer = (initialSeconds) => {
    // Ensure we never start with more than 60 seconds for the warning modal
    const actualInitialSeconds = Math.min(initialSeconds, 60);

    // Set the initial remaining time
    setRemainingTime(actualInitialSeconds);

    const intervalId = setInterval(() => {
      if (!isMounted.current) {
        clearInterval(intervalId);
        return;
      }

      setRemainingTime((prevTime) => {
        const newTime = prevTime > 0 ? prevTime - 1 : 0;

        // Handle logout when time reaches zero
        if (newTime === 0) {
          // Cancel any ongoing interval and clear ref
          clearInterval(intervalId);
          if (countdownIntervalRef.current === intervalId) {
            countdownIntervalRef.current = null;
          }

          // Create and dispatch the session expired event
          try {
            createAndDispatchSessionExpiredEvent();
          } catch (e) {
            console.error("Error dispatching session expired event:", e);
          }

          // Use setTimeout to ensure this runs after state update
          setTimeout(() => {
            if (isMounted.current) {
              handleAutoLogout();
            }
          }, 10);
        }

        return newTime;
      });
    }, COUNTDOWN_INTERVAL);

    countdownIntervalRef.current = intervalId;
    return intervalId;
  };

  // Set up the session check interval and event handlers
  useEffect(() => {
    isMounted.current = true;

    // Initial cleanup - clear any inconsistent flags from previous sessions
    localStorage.removeItem("loggingOut");

    // Check if there's a stale warning state and handle it appropriately
    const warningActive =
      localStorage.getItem("sessionWarningActive") === "true";
    const expirationTime = localStorage.getItem("sessionExpiration");

    if (warningActive && expirationTime) {
      const currentTime = new Date().getTime();
      const timeUntilExpiration = parseInt(expirationTime, 10) - currentTime;

      if (timeUntilExpiration <= 0) {
        // Warning active but already expired - clear it
        localStorage.setItem("sessionWarningActive", "false");
      } else {
        // Valid warning - set the modal state immediately
        setShowModal(true);

        // Start countdown timer with 60 seconds
        const initialTimerId = startCountdownTimer(60);
        countdownIntervalRef.current = initialTimerId;
      }
    }

    // Create a single session warning handler to use across different event sources
    const handleSessionWarning = (source) => {
      try {
        // Get current expiration time
        const expirationTime = localStorage.getItem("sessionExpiration");
        if (!expirationTime) {
          localStorage.setItem("sessionWarningActive", "false");
          return;
        }

        // Calculate remaining time
        const currentTime = new Date().getTime();
        const timeUntilExpiration = parseInt(expirationTime, 10) - currentTime;

        if (timeUntilExpiration <= 0) {
          // Expired already - skip showing modal and go straight to logout
          handleAutoLogout();
        } else {
          // Valid warning - show modal with exactly 60 seconds countdown
          if (countdownIntervalRef.current) {
            clearInterval(countdownIntervalRef.current);
            countdownIntervalRef.current = null;
          }

          // Set modal visibility
          setShowModal(true);

          // Start countdown timer with 60 seconds
          const timerId = startCountdownTimer(60);
          countdownIntervalRef.current = timerId;
        }
      } catch (error) {
        console.error("Error handling session warning:", error);
      }
    };

    // Event listeners for different warning sources
    const handleWindowWarning = () => handleSessionWarning("window event");
    const handleDocumentWarning = () => handleSessionWarning("document event");

    // Add event listeners
    window.addEventListener("sessionWarning", handleWindowWarning);
    document.addEventListener("sessionWarning", handleDocumentWarning);

    // Storage event listener to handle cross-tab synchronization
    const handleStorageEvent = (event) => {
      if (event.key === "sessionWarningActive") {
        if (event.newValue === "true" && !showModal) {
          handleSessionWarning("storage event");
        } else if (event.newValue === "false" && showModal) {
          resetModalState();
        }
      }
    };

    window.addEventListener("storage", handleStorageEvent);

    // Session expired event listener
    const handleSessionExpired = () => {
      if (isMounted.current) {
        handleAutoLogout();
      }
    };

    document.addEventListener("sessionExpired", handleSessionExpired);

    // Set up the check interval with better error handling
    checkIntervalRef.current = setInterval(() => {
      if (!isMounted.current) return;

      try {
        checkSessionWarning();
      } catch (error) {
        console.error("Error in check interval:", error);
      }
    }, CHECK_INTERVAL);

    // Execute initial check
    setTimeout(() => {
      if (isMounted.current) {
        try {
          checkSessionWarning();
        } catch (error) {
          console.error("Error in initial check:", error);
        }
      }
    }, 500);

    // Clean up function
    return () => {
      isMounted.current = false;

      // Clean up all intervals
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
        checkIntervalRef.current = null;
      }

      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
      }

      // Remove all event listeners
      window.removeEventListener("sessionWarning", handleWindowWarning);
      document.removeEventListener("sessionWarning", handleDocumentWarning);
      window.removeEventListener("storage", handleStorageEvent);
      document.removeEventListener("sessionExpired", handleSessionExpired);
    };
  }, [checkSessionWarning, handleAutoLogout, showModal, startCountdownTimer]);

  // Update state when warning status changes
  useEffect(() => {
    // This effect only handles existing state updates, not setting up intervals
    if (showModal) {
      // If modal becomes visible, force styles to ensure it shows properly
      document.body.style.overflow = "hidden"; // Prevent scrolling behind modal
    } else {
      // When modal is hidden, make sure countdowns are cleared
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
      }
      document.body.style.overflow = ""; // Reset overflow
    }
  }, [showModal]);

  // Add a safety check in case the modal stays open too long
  useEffect(() => {
    if (!showModal) return;

    // Timeout to ensure modal doesn't stay open longer than expected
    const safetyTimeout = setTimeout(() => {
      // If the modal has been open too long (more than 70 seconds), force logout
      if (showModal) {
        console.error(
          "Safety timeout reached - modal open too long, forcing logout"
        );
        handleAutoLogout();
      }
    }, 70 * 1000); // 70 seconds (10 seconds longer than our max countdown)

    return () => {
      clearTimeout(safetyTimeout);
    };
  }, [showModal]);

  // Format the time as MM:SS
  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  };

  // Render the modal content
  const renderModalContent = () => {
    if (!showModal) return null;

    return (
      <div className="session-timeout-overlay">
        <div className="session-timeout-modal">
          <h2>Are you still there?</h2>
          <div className="timeout-message">
            <p>Your session will expire in:</p>
            <div className="countdown-timer">{formatTime(remainingTime)}</div>
            <p>Do you want to extend your session?</p>
          </div>
          <div className="timeout-actions">
            <button className="continue-btn" onClick={handleExtend}>
              Yes, Extend Session
            </button>
            <button className="logout-btn" onClick={handleLogout}>
              No, Logout
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Use React's createPortal to render the modal at the root level of the DOM
  return showModal
    ? createPortal(renderModalContent(), portalRootRef.current)
    : null;
}

export default SessionTimeoutModal;
