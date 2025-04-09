/**
 * Message Tester Script
 *
 * This script tests the message system by:
 * 1. Querying all messages from the database
 * 2. Testing the send message functionality
 * 3. Verifying if messages appear correctly in the UI
 */

(function () {
  console.log("🧪 Message Tester Script - Starting diagnostics...");

  // Store reference to our Supabase client
  let supabaseClient = null;

  // Initialize
  async function initialize() {
    // Try to get the Supabase client
    supabaseClient = await findSupabaseClient();

    if (!supabaseClient) {
      console.error("❌ Could not find Supabase client. Aborting tests.");
      return;
    }

    console.log("✅ Found Supabase client");

    // Run the tests
    await runMessageDiagnostics();
  }

  // Main diagnostic function
  async function runMessageDiagnostics() {
    // Get current user ID
    const currentUserId = await getCurrentUserId();
    if (!currentUserId) {
      console.error("❌ Not logged in. Can't run tests.");
      return;
    }

    console.log(`✅ Current user ID: ${currentUserId}`);

    // Check message table schema
    await checkMessageTableSchema();

    // Get recent messages
    await checkRecentMessages(currentUserId);

    // Check message storage/prevention in localStorage
    checkMessagePreventionFlags();

    // Check SessionsByProduct tracking
    checkProductSessionTracking();

    // Provide test functions the user can run
    exposeTestFunctions(currentUserId);
  }

  // Check message table schema
  async function checkMessageTableSchema() {
    try {
      console.log("📊 Checking message table schema...");

      const { data, error } = await supabaseClient
        .from("messages")
        .select("*")
        .limit(1);

      if (error) {
        console.error("❌ Error querying messages table:", error.message);
        return;
      }

      if (!data || data.length === 0) {
        console.log("ℹ️ No messages found in database");
        return;
      }

      // Analyze schema
      const sampleMessage = data[0];
      console.log("✅ Message table schema:");

      const schema = {};
      for (const key in sampleMessage) {
        schema[key] = typeof sampleMessage[key];
      }

      console.table(schema);

      // Check for critical fields
      const requiredFields = [
        "id",
        "sender_id",
        "receiver_id",
        "content",
        "created_at",
        "status",
        "is_read",
        "is_deleted",
      ];

      const missingFields = requiredFields.filter(
        (field) => !(field in sampleMessage)
      );

      if (missingFields.length > 0) {
        console.warn(`⚠️ Missing expected fields: ${missingFields.join(", ")}`);
      } else {
        console.log("✅ All expected fields are present");
      }
    } catch (err) {
      console.error("❌ Error checking message schema:", err);
    }
  }

  // Check recent messages
  async function checkRecentMessages(userId) {
    try {
      console.log("📨 Checking recent messages...");

      // Get recent messages sent by this user
      const { data: sentMessages, error: sentError } = await supabaseClient
        .from("messages")
        .select("*")
        .eq("sender_id", userId)
        .order("created_at", { ascending: false })
        .limit(5);

      if (sentError) {
        console.error("❌ Error querying sent messages:", sentError.message);
      } else {
        console.log(`✅ Found ${sentMessages.length} recent sent messages`);
        if (sentMessages.length > 0) {
          console.log("Recent sent messages:");
          sentMessages.forEach((msg, i) => {
            console.log(
              `${i + 1}. To: ${
                msg.receiver_id
              }, Content: ${msg.content.substring(0, 30)}..., Status: ${
                msg.status
              }, Is_deleted: ${msg.is_deleted}, Is_read: ${msg.is_read}`
            );
          });
        }
      }

      // Get recent messages received by this user
      const { data: receivedMessages, error: receivedError } =
        await supabaseClient
          .from("messages")
          .select("*")
          .eq("receiver_id", userId)
          .order("created_at", { ascending: false })
          .limit(5);

      if (receivedError) {
        console.error(
          "❌ Error querying received messages:",
          receivedError.message
        );
      } else {
        console.log(
          `✅ Found ${receivedMessages.length} recent received messages`
        );
        if (receivedMessages.length > 0) {
          console.log("Recent received messages:");
          receivedMessages.forEach((msg, i) => {
            console.log(
              `${i + 1}. From: ${
                msg.sender_id
              }, Content: ${msg.content.substring(0, 30)}..., Status: ${
                msg.status
              }, Is_deleted: ${msg.is_deleted}, Is_read: ${msg.is_read}`
            );
          });
        }
      }
    } catch (err) {
      console.error("❌ Error checking recent messages:", err);
    }
  }

  // Check message prevention flags in localStorage
  function checkMessagePreventionFlags() {
    console.log("🚩 Checking message prevention flags in localStorage...");

    const preventionKeys = [];
    const productMessageKeys = [];

    // Scan localStorage for potential prevention keys
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key.includes("product_msg") || key.includes("_prevention_")) {
        const value = localStorage.getItem(key);
        if (key.includes("product_msg")) {
          productMessageKeys.push({ key, value });
        } else if (key.includes("_prevention_")) {
          preventionKeys.push({ key, value });
        }
      }
    }

    console.log(
      `Found ${preventionKeys.length} prevention flags and ${productMessageKeys.length} product message keys`
    );

    if (preventionKeys.length > 0) {
      console.log("Prevention flags:");
      console.table(preventionKeys);
    }

    if (productMessageKeys.length > 0) {
      console.log("Product message keys:");
      console.table(productMessageKeys);
    }
  }

  // Check ProductSessionTracking
  function checkProductSessionTracking() {
    console.log("🔄 Checking product session tracking...");

    if (!window.__sessionsByProduct) {
      console.log("❌ No __sessionsByProduct tracking found");
      return;
    }

    console.log(
      `Found ${Object.keys(window.__sessionsByProduct).length} product sessions`
    );

    const sessionInfo = [];
    for (const [key, session] of Object.entries(window.__sessionsByProduct)) {
      sessionInfo.push({
        productSessionId: key,
        initialMessageSent: session.initialMessageSent,
        messagesLoaded: session.messagesLoaded,
        fetchingMessages: session.fetchingMessages,
        processedMessageCount: session.processedMessageIds?.size || 0,
      });
    }

    if (sessionInfo.length > 0) {
      console.log("Active product sessions:");
      console.table(sessionInfo);
    }
  }

  // Find Supabase client (reused from direct-send-v2.js)
  async function findSupabaseClient() {
    console.log("🔍 Looking for Supabase client...");

    // First check window.supabase
    if (window.supabase && typeof window.supabase.from === "function") {
      console.log("✅ Found global window.supabase");
      return window.supabase;
    }

    // Check common variable names
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

  // Get current user ID (reused from direct-send-v2.js)
  async function getCurrentUserId() {
    if (!supabaseClient) return null;

    try {
      // First try localStorage (most reliable)
      const userId = localStorage.getItem("userId");
      if (userId) {
        return userId;
      }

      // Try modern Supabase v2 getSession
      if (
        supabaseClient.auth &&
        typeof supabaseClient.auth.getSession === "function"
      ) {
        const { data, error } = await supabaseClient.auth.getSession();
        if (!error && data?.session?.user?.id) {
          return data.session.user.id;
        }
      }

      // Try older Supabase auth user
      if (
        supabaseClient.auth &&
        typeof supabaseClient.auth.user === "function"
      ) {
        const { data: user } = await supabaseClient.auth.user();
        if (user && user.id) {
          return user.id;
        }
      }

      return null;
    } catch (err) {
      console.error("Error getting current user ID:", err);
      return null;
    }
  }

  // Create a function to force message refresh
  async function forceMessageRefresh() {
    try {
      console.log("🔄 Forcing message refresh...");

      // Reset all tracking variables that might be preventing message loading
      if (window.__fetchingMessages) {
        window.__fetchingMessages = {};
        console.log("✅ Reset __fetchingMessages");
      }

      if (window.__initialMessageFetch) {
        window.__initialMessageFetch = {};
        console.log("✅ Reset __initialMessageFetch");
      }

      // Clear cache of recent message queries
      const cacheKeys = Object.keys(localStorage).filter(
        (key) => key.startsWith("sb-") && key.includes("messages")
      );

      cacheKeys.forEach((key) => {
        localStorage.removeItem(key);
        console.log(`✅ Cleared cache key: ${key}`);
      });

      console.log("✅ Message refresh forced - reload the page to see effects");
      return true;
    } catch (err) {
      console.error("❌ Error forcing message refresh:", err);
      return false;
    }
  }

  // Expose test functions for the user to run
  function exposeTestFunctions(currentUserId) {
    window.messageTester = {
      // Test sending a message
      sendTestMessage: async function (
        receiverId,
        content = "Test message from Message Tester"
      ) {
        if (!supabaseClient || !currentUserId) {
          console.error("❌ Not logged in or no Supabase client");
          return false;
        }

        if (!receiverId) {
          console.error("❌ Receiver ID is required");
          return false;
        }

        try {
          console.log(`Sending test message to ${receiverId}`);

          const { data, error } = await supabaseClient
            .from("messages")
            .insert([
              {
                sender_id: currentUserId,
                receiver_id: receiverId,
                content: content,
                status: "active",
                created_at: new Date().toISOString(),
                is_read: false,
                is_deleted: false,
              },
            ])
            .select();

          if (error) {
            console.error("❌ Error sending test message:", error.message);
            return false;
          }

          console.log("✅ Test message sent successfully:", data[0]);
          return data[0];
        } catch (err) {
          console.error("❌ Exception sending test message:", err);
          return false;
        }
      },

      // Check conversation between two users
      checkConversation: async function (otherUserId) {
        if (!supabaseClient || !currentUserId) {
          console.error("❌ Not logged in or no Supabase client");
          return false;
        }

        if (!otherUserId) {
          console.error("❌ Other User ID is required");
          return false;
        }

        try {
          console.log(`Checking conversation with ${otherUserId}`);

          // Get messages in both directions
          const { data, error } = await supabaseClient
            .from("messages")
            .select("*")
            .or(
              `and(sender_id.eq.${currentUserId},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${currentUserId})`
            )
            .order("created_at", { ascending: false });

          if (error) {
            console.error("❌ Error checking conversation:", error.message);
            return false;
          }

          // Filter out deleted messages
          const activeMessages = data.filter(
            (msg) => !msg.is_deleted && msg.status !== "deleted"
          );

          console.log(
            `✅ Found ${data.length} total messages (${activeMessages.length} active)`
          );

          if (data.length > 0) {
            console.log("Most recent messages:");
            activeMessages.slice(0, 5).forEach((msg, i) => {
              const direction = msg.sender_id === currentUserId ? "→" : "←";
              console.log(
                `${i + 1}. ${direction} ${msg.content.substring(
                  0,
                  30
                )}... (${new Date(msg.created_at).toLocaleString()})`
              );
            });
          }

          return activeMessages;
        } catch (err) {
          console.error("❌ Exception checking conversation:", err);
          return false;
        }
      },

      // Fix conversation issues
      fixConversation: async function (otherUserId) {
        const result = await this.checkConversation(otherUserId);
        if (!result) return false;

        // Reset global tracking variables
        await forceMessageRefresh();

        // Reset product sessions related to this conversation
        if (window.__sessionsByProduct) {
          const sessionKeys = Object.keys(window.__sessionsByProduct).filter(
            (key) => key.includes(otherUserId)
          );

          sessionKeys.forEach((key) => {
            delete window.__sessionsByProduct[key];
            console.log(`✅ Reset product session: ${key}`);
          });
        }

        // Clear local storage prevention flags for this conversation
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (
            key &&
            (key.includes(otherUserId) ||
              key.includes("prevention") ||
              key.includes("product_msg"))
          ) {
            localStorage.removeItem(key);
            console.log(`✅ Removed localStorage key: ${key}`);
          }
        }

        console.log(
          "✅ Conversation fixed. Please refresh the page to see changes."
        );
        return true;
      },

      // Clear all prevention flags
      clearAllPreventionFlags: function () {
        // Reset global tracking variables
        if (window.__sessionsByProduct) {
          window.__sessionsByProduct = {};
          console.log("✅ Reset __sessionsByProduct");
        }

        if (window.__fetchingMessages) {
          window.__fetchingMessages = {};
          console.log("✅ Reset __fetchingMessages");
        }

        if (window.__initialMessageFetch) {
          window.__initialMessageFetch = {};
          console.log("✅ Reset __initialMessageFetch");
        }

        if (window.__sentProductMessages) {
          window.__sentProductMessages = new Set();
          console.log("✅ Reset __sentProductMessages");
        }

        // Clear localStorage prevention flags
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (
            key &&
            (key.includes("prevention") || key.includes("product_msg"))
          ) {
            localStorage.removeItem(key);
            console.log(`✅ Removed localStorage key: ${key}`);
          }
        }

        console.log(
          "✅ All prevention flags cleared. Please refresh the page."
        );
        return true;
      },
    };

    console.log(`
    🧪 MESSAGE TESTER READY!
    
    Use these commands in the console:
    
    - messageTester.sendTestMessage("receiver-id", "Your message") - Send a test message
    - messageTester.checkConversation("other-user-id") - Check messages with another user
    - messageTester.fixConversation("other-user-id") - Fix conversation issues
    - messageTester.clearAllPreventionFlags() - Reset all tracking & prevention flags
    `);
  }

  // Start the testing process
  initialize();
})();
