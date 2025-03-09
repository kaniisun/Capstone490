import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { updateVerificationStatus } from "../../../utils/supabaseHelpers";

function FixVerification() {
  const [status, setStatus] = useState("idle");
  const navigate = useNavigate();

  const handleFixVerification = async () => {
    setStatus("loading");
    try {
      const result = await updateVerificationStatus();
      if (result.success) {
        setStatus("success");
      } else {
        setStatus("error");
        console.error("Error fixing verification:", result.error);
      }
    } catch (err) {
      setStatus("error");
      console.error("Unexpected error:", err);
    }
  };

  return (
    <div
      style={{
        padding: "2rem",
        maxWidth: "600px",
        margin: "0 auto",
        textAlign: "center",
      }}
    >
      <h2>Fix Verification Status</h2>
      <p>
        If Supabase still shows "waiting for verification" even though you've
        clicked the verification link, use this utility to fix it.
      </p>

      {status === "idle" && (
        <button
          onClick={handleFixVerification}
          style={{
            padding: "10px 20px",
            background: "#0f2044",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
            fontSize: "16px",
          }}
        >
          Fix My Verification Status
        </button>
      )}

      {status === "loading" && <p>Updating verification status...</p>}

      {status === "success" && (
        <>
          <p style={{ color: "green" }}>
            Verification status updated successfully!
          </p>
          <button
            onClick={() => navigate("/")}
            style={{
              padding: "10px 20px",
              background: "#0f2044",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              marginTop: "20px",
              fontSize: "16px",
            }}
          >
            Return to Home
          </button>
        </>
      )}

      {status === "error" && (
        <>
          <p style={{ color: "red" }}>
            Error updating verification status. Please try again later.
          </p>
          <button
            onClick={() => setStatus("idle")}
            style={{
              padding: "10px 20px",
              background: "#0f2044",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              marginTop: "20px",
              fontSize: "16px",
            }}
          >
            Try Again
          </button>
        </>
      )}
    </div>
  );
}

export default FixVerification;
