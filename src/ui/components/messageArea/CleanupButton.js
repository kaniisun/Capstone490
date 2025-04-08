import React from "react";
import { resetAllMessagePrevention } from "./messageHelper";

/**
 * A button component to reset message prevention for testing purposes
 */
const CleanupButton = () => {
  const handleCleanup = () => {
    // Reset all prevention mechanisms
    const success = resetAllMessagePrevention();

    if (success) {
      alert(
        "Successfully reset all message prevention! You can now test Contact Seller again."
      );

      // Force reload to apply changes
      window.location.reload();
    } else {
      alert("Error resetting message prevention. Check console for details.");
    }
  };

  // Simple button with minimal styling
  return (
    <button
      onClick={handleCleanup}
      style={{
        position: "absolute",
        top: "10px",
        right: "10px",
        zIndex: 9999,
        background: "#0f2044",
        color: "white",
        border: "none",
        borderRadius: "4px",
        padding: "8px 12px",
        fontSize: "12px",
        cursor: "pointer",
      }}
      title="Reset Message Prevention (For Testing)"
    >
      Reset Prevention
    </button>
  );
};

export default CleanupButton;
