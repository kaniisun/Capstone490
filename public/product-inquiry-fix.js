/**
 * Product Inquiry Message Fix
 *
 * This script fixes issues related to product inquiry messages,
 * specifically when clicking "Contact Seller" doesn't show messages in the UI.
 */

(async function () {
  console.log("🛠️ Product Inquiry Message Fix - Starting...");

  // Global variables
  let supabaseClient = null;
  let currentUserId = null;

  // Initialize
  async function initialize() {
    try {
      // Get Supabase client
      supabaseClient = await findSupabaseClient();
      if (!supabaseClient) {
        console.error("❌ Could not find Supabase client");
        return false;
      }

      // Get current user
      currentUserId = await getCurrentUserId();
      if (!currentUserId) {
        console.error("❌ Not logged in. Can't proceed.");
        return false;
      }

      console.log(`✅ Running as user ${currentUserId}`);
      return true;
    } catch (err) {
      console.error("❌ Error during initialization:", err);
      return false;
    }
  }

  // Find a Supabase client
  async function findSupabaseClient() {
    // Check window.supabase first (most reliable)
    if (window.supabase && typeof window.supabase.from === "function") {
      console.log("✅ Found Supabase client in window.supabase");
      return window.supabase;
    }

    // Check other common locations
    const commonNames = ["supabaseClient", "_supabase", "supabaseInstance"];
    for (const name of commonNames) {
      if (window[name] && typeof window[name].from === "function") {
        console.log(`✅ Found Supabase client in window.${name}`);
        return window[name];
      }
    }

    console.error("❌ Could not find Supabase client");
    return null;
  }

  // Get current user ID
  async function getCurrentUserId() {
    try {
      // Check localStorage first (most reliable)
      const userId = localStorage.getItem("userId");
      if (userId) {
        console.log(`✅ Found user ID in localStorage: ${userId}`);
        return userId;
      }

      // Try Supabase auth
      if (supabaseClient?.auth) {
        // Try getSession first (newer versions)
        if (typeof supabaseClient.auth.getSession === "function") {
          const { data } = await supabaseClient.auth.getSession();
          if (data?.session?.user?.id) {
            console.log(
              `✅ Found user ID via auth.getSession: ${data.session.user.id}`
            );
            return data.session.user.id;
          }
        }

        // Try user method (older versions)
        if (typeof supabaseClient.auth.user === "function") {
          const { data: user } = await supabaseClient.auth.user();
          if (user?.id) {
            console.log(`✅ Found user ID via auth.user: ${user.id}`);
            return user.id;
          }
        }
      }

      console.error("❌ Could not find user ID");
      return null;
    } catch (err) {
      console.error("❌ Error getting user ID:", err);
      return null;
    }
  }

  // Check for recent product inquiry messages
  async function findRecentProductInquiries() {
    if (!supabaseClient || !currentUserId) return [];

    try {
      console.log("🔍 Looking for recent product inquiry messages...");

      // Get messages sent by this user in the last 24 hours
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const { data, error } = await supabaseClient
        .from("messages")
        .select("*")
        .eq("sender_id", currentUserId)
        .gt("created_at", yesterday.toISOString())
        .order("created_at", { ascending: false });

      if (error) {
        console.error("❌ Error querying messages:", error.message);
        return [];
      }

      if (!data || data.length === 0) {
        console.log("ℹ️ No recent messages found");
        return [];
      }

      // Filter to likely product inquiry messages
      const productInquiries = data.filter(
        (msg) =>
          msg.content.includes("I'm interested in your") ||
          msg.content.includes("<img") ||
          msg.product_id
      );

      console.log(
        `✅ Found ${productInquiries.length} recent product inquiries`
      );

      if (productInquiries.length > 0) {
        console.log("Recent product inquiries:");
        productInquiries.forEach((msg, i) => {
          console.log(
            `${i + 1}. To: ${msg.receiver_id}, Content: ${msg.content.substring(
              0,
              30
            )}...`
          );
          console.log(
            `   Created: ${new Date(
              msg.created_at
            ).toLocaleString()}, Status: ${msg.status}, Is_deleted: ${
              msg.is_deleted
            }`
          );
        });
      }

      return productInquiries;
    } catch (err) {
      console.error("❌ Error finding product inquiries:", err);
      return [];
    }
  }

  // Fix issues with message displaying
  async function fixMessageDisplay(inquiries) {
    if (!inquiries || inquiries.length === 0) {
      console.log("ℹ️ No inquiries to fix");
      return false;
    }

    console.log(
      `🔧 Fixing display issues for ${inquiries.length} inquiries...`
    );

    let fixCount = 0;

    // Process each inquiry
    for (const inquiry of inquiries) {
      try {
        // Check if is_deleted is true
        if (inquiry.is_deleted === true) {
          console.log(
            `📝 Message ${inquiry.id} is marked as deleted, updating...`
          );

          // Update the message to not be deleted
          const { data, error } = await supabaseClient
            .from("messages")
            .update({
              is_deleted: false,
              updated_at: new Date().toISOString(),
            })
            .eq("id", inquiry.id)
            .select();

          if (error) {
            console.error(
              `❌ Error updating message ${inquiry.id}:`,
              error.message
            );
            continue;
          }

          console.log(`✅ Updated message ${inquiry.id} to not be deleted`);
          fixCount++;
        }

        // Check if status needs fixing
        if (inquiry.status === "deleted" || inquiry.status === "flagged") {
          console.log(
            `📝 Message ${inquiry.id} has status ${inquiry.status}, updating...`
          );

          // Update the status to active
          const { data, error } = await supabaseClient
            .from("messages")
            .update({
              status: "active",
              updated_at: new Date().toISOString(),
            })
            .eq("id", inquiry.id)
            .select();

          if (error) {
            console.error(
              `❌ Error updating message ${inquiry.id} status:`,
              error.message
            );
            continue;
          }

          console.log(`✅ Updated message ${inquiry.id} status to active`);
          fixCount++;
        }
      } catch (err) {
        console.error(`❌ Error processing message ${inquiry.id}:`, err);
      }
    }

    console.log(
      `✅ Fixed ${fixCount} messages. Refresh the page to see changes.`
    );
    return fixCount > 0;
  }

  // Clear all tracking variables that might be preventing messages from showing
  function clearTrackingVariables() {
    console.log("🧹 Clearing tracking variables...");

    // Reset fetchingMessages
    if (window.__fetchingMessages) {
      window.__fetchingMessages = {};
      console.log("✅ Reset __fetchingMessages");
    }

    // Reset initial message fetch tracking
    if (window.__initialMessageFetch) {
      window.__initialMessageFetch = {};
      console.log("✅ Reset __initialMessageFetch");
    }

    // Reset tracked deleted message IDs
    if (window.__deletedMessageIds) {
      window.__deletedMessageIds = new Set();
      console.log("✅ Reset __deletedMessageIds");
    }

    // Reset product sessions
    if (window.__sessionsByProduct) {
      window.__sessionsByProduct = {};
      console.log("✅ Reset __sessionsByProduct");
    }

    // Reset sent product messages
    if (window.__sentProductMessages) {
      window.__sentProductMessages = new Set();
      console.log("✅ Reset __sentProductMessages");
    }

    // Clear localStorage prevention flags
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (
        key &&
        (key.includes("product_msg") ||
          key.includes("_prevention_") ||
          key.includes("deleted_messages"))
      ) {
        keysToRemove.push(key);
      }
    }

    // Remove the keys in a separate loop to avoid issues with changing the collection
    keysToRemove.forEach((key) => {
      localStorage.removeItem(key);
      console.log(`✅ Removed localStorage key: ${key}`);
    });

    console.log(`✅ Removed ${keysToRemove.length} localStorage keys`);

    console.log("✅ All tracking variables cleared");
  }

  // Get URL parameters to check for product and user IDs
  function getUrlParams() {
    const url = new URL(window.location.href);
    const params = new URLSearchParams(url.search);

    // Get product ID from URL
    const productId = params.get("productId");

    // Try to get receiver ID from URL path
    let receiverId = null;
    const pathMatch = window.location.pathname.match(/\/messaging\/([^\/]+)/);
    if (pathMatch && pathMatch[1]) {
      receiverId = pathMatch[1];
    }

    return { productId, receiverId };
  }

  // Run the fix
  async function runFix() {
    const initialized = await initialize();
    if (!initialized) {
      console.error("❌ Initialization failed, cannot proceed");
      return;
    }

    // Find recent product inquiries
    const inquiries = await findRecentProductInquiries();

    // Fix message display issues
    await fixMessageDisplay(inquiries);

    // Clear tracking variables
    clearTrackingVariables();

    // Check URL parameters
    const { productId, receiverId } = getUrlParams();
    if (productId) {
      console.log(`📱 Found product ID in URL: ${productId}`);
    }
    if (receiverId) {
      console.log(`👤 Found receiver ID in URL: ${receiverId}`);
    }

    if (productId && receiverId) {
      console.log(
        `ℹ️ You're viewing a conversation with ${receiverId} about product ${productId}`
      );
      console.log("✅ After refresh, messages should appear properly");
    }
  }

  // Run the fix, then expose the fix function for manual running
  await runFix();

  // Expose the fix function globally
  window.fixProductInquiryMessages = runFix;

  console.log(
    "✅ Fix complete! If messages still don't appear, refresh the page."
  );
  console.log(
    "ℹ️ You can run the fix again by calling window.fixProductInquiryMessages()"
  );
})();
