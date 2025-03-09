import React, { useState, useEffect } from "react";
import "./NotificationBanner.css";

/**
 * Notification banner component for displaying success/error messages
 * @param {Object} props Component props
 * @param {string} props.message - Message to display
 * @param {string} props.type - Type of notification (success, error, warning, info)
 * @param {boolean} props.show - Whether to show the notification
 * @param {number} props.duration - How long to show in ms (0 for no auto-hide)
 * @param {function} props.onClose - Function to call when notification is closed
 */
function NotificationBanner({
  message,
  type = "info",
  show = true,
  duration = 5000,
  onClose = () => {},
}) {
  const [visible, setVisible] = useState(show);

  // Handle visibility changes based on show prop
  useEffect(() => {
    setVisible(show);
  }, [show]);

  // Auto-hide after duration
  useEffect(() => {
    if (visible && duration > 0) {
      const timer = setTimeout(() => {
        setVisible(false);
        onClose();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [visible, duration, onClose]);

  const handleClose = () => {
    setVisible(false);
    onClose();
  };

  if (!visible) return null;

  return (
    <div className={`notification-banner ${type}`}>
      <div className="notification-content">{message}</div>
      <button className="close-button" onClick={handleClose}>
        ✕
      </button>
    </div>
  );
}

export default NotificationBanner;
