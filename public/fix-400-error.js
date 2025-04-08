/**
 * FIX-400-ERROR.JS
 * This script fixes the 400 Bad Request error when sending messages to Supabase
 * by patching the Supabase client's message sending functionality.
 */

(function () {
  console.log("🔧 Running fix for 400 Bad Request errors...");

  // Wait for Supabase client to be ready
  const checkForSupabase = setInterval(() => {
    if (window.supabase) {
      clearInterval(checkForSupabase);
      applyFix();
    }
  }, 100);

  function applyFix() {
    console.log("✅ Found Supabase client, applying fix...");

    // Store the original insert method
    const originalInsert = window.supabase.from("messages").insert;

    // Override the insert method with a fixed version
    window.supabase.from("messages").insert = function (data) {
      console.log("🔄 Intercepting message send with fixed format...");

      // Format data correctly for Supabase
      let formattedData = data;

      // If data is an object (not wrapped in an array), wrap it
      if (!Array.isArray(data)) {
        formattedData = [data];
        console.log("🛠️ Converted object to array format for Supabase");
      }

      // Ensure all required fields are present
      formattedData = formattedData.map((msg) => {
        if (!msg.sender_id || !msg.receiver_id || !msg.content) {
          console.warn("⚠️ Message is missing required fields", msg);
        }

        // Make sure the status field is set
        if (!msg.status) {
          msg.status = "sent";
        }

        return msg;
      });

      console.log("📤 Sending with fixed format:", formattedData);

      // Call the original method with the fixed data
      return originalInsert(formattedData);
    };

    // Create a global helper function for sending messages
    window.sendMessageSafely = async function (
      sender_id,
      receiver_id,
      content,
      product_id = null
    ) {
      const messageData = {
        sender_id,
        receiver_id,
        content,
        status: "sent",
        ...(product_id && { product_id }),
      };

      console.log("📨 Sending message using safe method:", messageData);

      try {
        const { data, error } = await window.supabase
          .from("messages")
          .insert([messageData]);

        if (error) {
          console.error("❌ Error sending message:", error);
          return { success: false, error };
        }

        console.log("✅ Message sent successfully:", data);
        return { success: true, data };
      } catch (err) {
        console.error("❌ Exception sending message:", err);
        return { success: false, error: err };
      }
    };

    // Show success message
    console.log("🎉 400 Bad Request fix has been applied successfully!");
    console.log(
      "📝 You can now use window.sendMessageSafely(sender_id, receiver_id, content, product_id) to send messages"
    );

    // Add a visual indicator that the fix is active
    const fixIndicator = document.createElement("div");
    fixIndicator.style.position = "fixed";
    fixIndicator.style.bottom = "10px";
    fixIndicator.style.right = "10px";
    fixIndicator.style.background = "#4CAF50";
    fixIndicator.style.color = "white";
    fixIndicator.style.padding = "8px 12px";
    fixIndicator.style.borderRadius = "4px";
    fixIndicator.style.zIndex = "9999";
    fixIndicator.style.boxShadow = "0 2px 5px rgba(0,0,0,0.2)";
    fixIndicator.style.fontSize = "14px";
    fixIndicator.innerText = "400 Error Fix Active ✓";
    document.body.appendChild(fixIndicator);

    // Remove indicator after 5 seconds
    setTimeout(() => {
      fixIndicator.style.opacity = "0";
      fixIndicator.style.transition = "opacity 0.5s ease";
      setTimeout(() => fixIndicator.remove(), 500);
    }, 5000);
  }
})();
