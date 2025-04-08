/**
 * Message Duplicate Prevention & Cleanup Script
 *
 * This script addresses three issues:
 * 1. Prevents duplicate messages when clicking "Contact Seller"
 * 2. Prevents duplicate network requests causing multiple message insertions
 * 3. Cleans up existing duplicate messages
 *
 * HOW TO USE:
 * 1. Open your browser console (F12 or right-click > Inspect > Console)
 * 2. Copy and paste this entire script into the console
 * 3. Press Enter to run it
 * 4. To clean up existing duplicates, type: cleanupDuplicateMessages()
 */
(function () {
  const DEBUG = true;

  // ---- STORAGE AND TRACKING MECHANISMS ----

  // Create an in-memory database of sent messages to prevent duplicates
  if (!window.__sentMessages) {
    window.__sentMessages = new Set();
  }

  // Create a map to track active network requests to prevent duplicates
  if (!window.__activeRequests) {
    window.__activeRequests = new Map();
  }

  // Keep a record of messages we've already sent
  if (!window.__processedMessages) {
    window.__processedMessages = new Set();
  }

  // ---- PATCH REACT STATE UPDATERS ----

  // Find and patch React setState for MessageArea component
  // This is an advanced technique to intercept React state updates
  const patchReactSetState = () => {
    const origPush = Array.prototype.push;

    // Override Array push to detect when messages are being added to state
    Array.prototype.push = function (...items) {
      // Check if this is a messages array push in the MessageArea component
      if (
        items.length === 1 &&
        items[0] &&
        typeof items[0] === "object" &&
        items[0].content &&
        items[0].sender_id &&
        items[0].receiver_id
      ) {
        // This looks like a message object, check if we've seen it before
        const msgId = items[0].id;
        const msgContent = items[0].content;
        const contentKey = `${items[0].sender_id}_${
          items[0].receiver_id
        }_${msgContent.substring(0, 30)}`;

        if (window.__processedMessages.has(contentKey)) {
          if (DEBUG)
            console.log(
              "[DuplicateMessageFix] Preventing duplicate message addition to React state:",
              contentKey
            );
          return this.length; // Don't add this item
        }

        // Track this message to prevent future duplicates
        window.__processedMessages.add(contentKey);
        if (DEBUG)
          console.log(
            "[DuplicateMessageFix] Tracking new message in state:",
            contentKey
          );
      }

      return origPush.apply(this, items);
    };
  };

  // ---- PATCH NETWORK REQUESTS ----

  // Save the original fetch function
  const originalFetch = window.fetch;

  // Override fetch to deduplicate requests
  window.fetch = function (...args) {
    const [resource, config] = args;

    // We only care about Supabase API calls related to messages
    if (
      !resource ||
      typeof resource !== "string" ||
      !resource.includes("supabase")
    ) {
      return originalFetch.apply(this, args);
    }

    // Check if this is a message insertion
    const isMessageInsert =
      resource.includes("messages") &&
      config?.method === "POST" &&
      config?.body &&
      config.body.includes("sender_id");

    if (isMessageInsert) {
      try {
        // Parse the request body to check if it's a duplicate message
        const body = JSON.parse(config.body);
        if (Array.isArray(body) && body.length > 0 && body[0].content) {
          const msg = body[0];
          const contentKey = `${msg.sender_id}_${
            msg.receiver_id
          }_${msg.content.substring(0, 30)}`;

          // Check if we've already sent this exact content recently
          if (window.__processedMessages.has(contentKey)) {
            if (DEBUG)
              console.log(
                "[DuplicateMessageFix] Blocking duplicate message API insertion:",
                contentKey
              );

            // Return a fake successful response
            return Promise.resolve(
              new Response(
                JSON.stringify({
                  data: [{ id: "blocked-duplicate-" + Date.now() }],
                  status: 200,
                })
              )
            );
          }

          // Track this message content
          window.__processedMessages.add(contentKey);
          if (DEBUG)
            console.log(
              "[DuplicateMessageFix] Allowing new message API insertion:",
              contentKey
            );
        }
      } catch (e) {
        console.error("[DuplicateMessageFix] Error parsing request body:", e);
      }
    }

    // Create a key based on the resource and request body
    const body = config?.body ? config.body : "";
    const key = resource + body;

    // Check if this exact request is already in progress
    if (window.__activeRequests.has(key) && resource.includes("supabase")) {
      if (DEBUG)
        console.log(
          "[DuplicateMessageFix] Preventing duplicate fetch request:",
          resource
        );
      return window.__activeRequests.get(key);
    }

    // Make the request and store the promise
    const fetchPromise = originalFetch
      .apply(this, args)
      .then((response) => {
        // Clone the response before using it
        const clone = response.clone();

        // Process and return the original response
        setTimeout(() => {
          window.__activeRequests.delete(key);
        }, 1000);
        return response;
      })
      .catch((error) => {
        window.__activeRequests.delete(key);
        throw error;
      });

    // Store the promise so we can reuse it for duplicate requests
    if (resource.includes("supabase")) {
      window.__activeRequests.set(key, fetchPromise);
    }
    return fetchPromise;
  };

  // ---- PATCH LOCATION REDIRECTS ----

  // Save original setter
  const originalLocationSetter = Object.getOwnPropertyDescriptor(
    window,
    "location"
  ).set;

  // Create a new setter that intercepts redirects to messaging
  Object.defineProperty(window, "location", {
    set: function (url) {
      // Only intercept URLs related to messaging
      if (typeof url === "string" && url.includes("/message/")) {
        try {
          // Extract seller ID and product ID from URL
          const urlObj = new URL(url, window.location.origin);
          const pathParts = urlObj.pathname.split("/");
          const sellerIndex = pathParts.indexOf("message") + 1;
          const sellerId = pathParts[sellerIndex];

          // Get product information from URL params
          const productId = urlObj.searchParams.get("productId");
          const productName = urlObj.searchParams.get("productName");

          // Create a unique key for this conversation
          const key = `${sellerId}_${productId || "general"}`;

          // Check if we've already initiated this conversation
          if (window.__sentMessages.has(key)) {
            if (DEBUG)
              console.log(
                `[DuplicateMessageFix] Preventing duplicate navigation to ${url}`
              );
            // Reload the page instead of redirecting, to reset any stale state
            if (window.location.pathname.includes("/message/")) {
              window.location.reload();
            }
            return;
          }

          // Mark this conversation as initiated
          window.__sentMessages.add(key);

          // Add to localStorage for persistence across page reloads
          try {
            const existingData = JSON.parse(
              localStorage.getItem("preventedMessages") || "{}"
            );
            existingData[key] = {
              timestamp: Date.now(),
              sellerId,
              productId,
              productName,
            };
            localStorage.setItem(
              "preventedMessages",
              JSON.stringify(existingData)
            );
          } catch (e) {
            console.error(
              "[DuplicateMessageFix] Error updating localStorage:",
              e
            );
          }

          if (DEBUG)
            console.log(
              `[DuplicateMessageFix] Allowing first navigation to ${url}`
            );
        } catch (e) {
          console.error("[DuplicateMessageFix] Error processing URL:", e);
        }
      }

      // Call the original setter
      originalLocationSetter.call(this, url);
    },
  });

  // Restore sent message data from localStorage to prevent duplicates after page refresh
  try {
    const savedData = JSON.parse(
      localStorage.getItem("preventedMessages") || "{}"
    );
    Object.keys(savedData).forEach((key) => {
      window.__sentMessages.add(key);
    });
    if (DEBUG)
      console.log(
        `[DuplicateMessageFix] Restored ${window.__sentMessages.size} prevented messages from localStorage`
      );
  } catch (e) {
    console.error(
      "[DuplicateMessageFix] Error restoring from localStorage:",
      e
    );
  }

  // Patch localStorage.setItem to track message keys
  const originalSetItem = localStorage.setItem;
  localStorage.setItem = function (key, value) {
    // Intercept any keys that help prevent duplicate messages
    if (key.includes("message") || key.includes("conversation")) {
      if (DEBUG)
        console.log(`[DuplicateMessageFix] Tracked localStorage key: ${key}`);
    }
    return originalSetItem.call(this, key, value);
  };

  // ---- CLEAN UP DUPLICATES ----

  // Function to clean up duplicate messages in the database
  window.cleanupDuplicateMessages = async function () {
    // Create helper to get Supabase instance
    const getSupabase = () => {
      if (window.supabase) return window.supabase;

      // If not directly accessible, try to get it from the app's React context
      console.log("Attempting to access Supabase client from app context...");

      // Warn user if we can't find Supabase
      console.warn(
        "Make sure you run this from a page where the app is fully loaded"
      );

      return null;
    };

    const supabase = getSupabase();
    if (!supabase) {
      console.error(
        "[DuplicateMessageFix] Could not access Supabase client. Make sure you are on a logged-in page."
      );
      return;
    }

    try {
      // Get current user ID
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        console.error(
          "[DuplicateMessageFix] User not logged in. Please log in first."
        );
        return;
      }

      const userID = user.id;
      console.log(`[DuplicateMessageFix] Running cleanup for user ${userID}`);

      // Get all messages sent by the current user
      const { data: sentMessages, error } = await supabase
        .from("messages")
        .select("*")
        .eq("sender_id", userID)
        .order("created_at", { ascending: true });

      if (error) {
        console.error("[DuplicateMessageFix] Error fetching messages:", error);
        return;
      }

      console.log(
        `[DuplicateMessageFix] Found ${sentMessages.length} messages sent by you`
      );

      // Group messages by receiver and content to find duplicates
      const conversationGroups = {};
      sentMessages.forEach((msg) => {
        // Create a key combining receiver ID and similar content
        // We only check the first 40 chars because subsequent duplicates might have slight variations
        const contentKey = msg.content.substring(0, 40);
        const key = `${msg.receiver_id}_${contentKey}`;

        if (!conversationGroups[key]) {
          conversationGroups[key] = [];
        }
        conversationGroups[key].push(msg);
      });

      let totalDuplicates = 0;
      const messagesToDelete = [];

      // For each group of similar messages, keep only the oldest one
      Object.values(conversationGroups).forEach((group) => {
        if (group.length > 1) {
          // Sort by created_at to find the oldest
          group.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

          // Keep the first (oldest) message, delete the rest
          const toDelete = group.slice(1);
          messagesToDelete.push(...toDelete.map((msg) => msg.id));
          totalDuplicates += toDelete.length;

          console.log(
            `[DuplicateMessageFix] Found ${
              toDelete.length
            } duplicates for message: "${group[0].content.substring(0, 40)}..."`
          );
        }
      });

      if (totalDuplicates === 0) {
        console.log("[DuplicateMessageFix] No duplicate messages found!");
        return;
      }

      console.log(
        `[DuplicateMessageFix] Found ${totalDuplicates} total duplicate messages to clean up`
      );

      // Delete the duplicate messages
      const batchSize = 100;
      let deletedCount = 0;

      for (let i = 0; i < messagesToDelete.length; i += batchSize) {
        const batch = messagesToDelete.slice(i, i + batchSize);
        const { error } = await supabase
          .from("messages")
          .delete()
          .in("id", batch);

        if (error) {
          console.error(
            `[DuplicateMessageFix] Error deleting batch ${i / batchSize + 1}:`,
            error
          );
        } else {
          deletedCount += batch.length;
          console.log(
            `[DuplicateMessageFix] Successfully deleted batch ${
              i / batchSize + 1
            } (${deletedCount}/${totalDuplicates})`
          );
        }
      }

      console.log(
        `[DuplicateMessageFix] Cleanup complete! Deleted ${deletedCount} duplicate messages.`
      );

      // Force reload the current page if we're in a message view
      if (window.location.pathname.includes("/message/")) {
        console.log(
          "[DuplicateMessageFix] Reloading page to refresh message list..."
        );
        setTimeout(() => window.location.reload(), 1000);
      }
    } catch (err) {
      console.error("[DuplicateMessageFix] Error in cleanup function:", err);
    }
  };

  // Apply React state patching
  patchReactSetState();

  console.log(`
  ✅ DuplicateMessageFix installed successfully!
  
  This script prevents:
  - Duplicate messages when clicking "Contact Seller"
  - Duplicate network requests that cause multiple message insertions
  - Duplicate messages added to React state
  
  To clean up existing duplicate messages:
  
  1. Type "cleanupDuplicateMessages()" in the console
  2. Press Enter
  
  This will identify and remove duplicate messages from the database.
  `);
})();

/**
 * MINIFIED VERSION FOR EASY COPYING
 * Simply copy the code below into your browser console.
 */

const minifiedScript = `(function(){const e=!0;window.__sentMessages||(window.__sentMessages=new Set),window.__activeRequests||(window.__activeRequests=new Map),window.__processedMessages||(window.__processedMessages=new Set);const t=()=>{const e=Array.prototype.push;Array.prototype.push=function(...t){if(1===t.length&&t[0]&&"object"==typeof t[0]&&t[0].content&&t[0].sender_id&&t[0].receiver_id){const s=t[0].id,a=t[0].content,r=\`\${t[0].sender_id}_\${t[0].receiver_id}_\${a.substring(0,30)}\`;if(window.__processedMessages.has(r))return this.length;window.__processedMessages.add(r)}return e.apply(this,t)}};const s=window.fetch;window.fetch=function(...t){const[a,r]=t;if(!a||"string"!=typeof a||!a.includes("supabase"))return s.apply(this,t);if(a.includes("messages")&&"POST"===r?.method&&r?.body&&r.body.includes("sender_id"))try{const s=JSON.parse(r.body);if(Array.isArray(s)&&s.length>0&&s[0].content){const a=s[0],r=\`\${a.sender_id}_\${a.receiver_id}_\${a.content.substring(0,30)}\`;if(window.__processedMessages.has(r))return Promise.resolve(new Response(JSON.stringify({data:[{id:"blocked-duplicate-"+Date.now()}],status:200})));window.__processedMessages.add(r)}}catch(e){console.error("[DuplicateMessageFix] Error parsing request body:",e)}const n=r?.body?r.body:"",o=a+n;if(window.__activeRequests.has(o)&&a.includes("supabase"))return window.__activeRequests.get(o);const i=s.apply(this,t).then(e=>(setTimeout(()=>{window.__activeRequests.delete(o)},1e3),e)).catch(e=>{throw window.__activeRequests.delete(o),e});return a.includes("supabase")&&window.__activeRequests.set(o,i),i};const a=Object.getOwnPropertyDescriptor(window,"location").set;Object.defineProperty(window,"location",{set:function(t){if("string"==typeof t&&t.includes("/message/"))try{const s=new URL(t,window.location.origin),r=s.pathname.split("/"),n=r.indexOf("message")+1,o=r[n],i=s.searchParams.get("productId"),c=s.searchParams.get("productName"),d=\`\${o}_\${i||"general"}\`;if(window.__sentMessages.has(d))return void(window.location.pathname.includes("/message/")&&window.location.reload());window.__sentMessages.add(d);try{const e=JSON.parse(localStorage.getItem("preventedMessages")||"{}");e[d]={timestamp:Date.now(),sellerId:o,productId:i,productName:c},localStorage.setItem("preventedMessages",JSON.stringify(e))}catch(e){console.error("[DuplicateMessageFix] Error updating localStorage:",e)}}catch(e){console.error("[DuplicateMessageFix] Error processing URL:",e)}a.call(this,t)}});try{const e=JSON.parse(localStorage.getItem("preventedMessages")||"{}");Object.keys(e).forEach(e=>{window.__sentMessages.add(e)})}catch(e){console.error("[DuplicateMessageFix] Error restoring from localStorage:",e)}const r=localStorage.setItem;localStorage.setItem=function(e,t){return r.call(this,e,t)},window.cleanupDuplicateMessages=async function(){const e=()=>window.supabase||(console.log("Attempting to access Supabase client from app context..."),console.warn("Make sure you run this from a page where the app is fully loaded"),null),t=e();if(!t)return void console.error("[DuplicateMessageFix] Could not access Supabase client. Make sure you are on a logged-in page.");try{const{data:{user:e}}=await t.auth.getUser();if(!e)return void console.error("[DuplicateMessageFix] User not logged in. Please log in first.");const s=e.id;console.log(\`[DuplicateMessageFix] Running cleanup for user \${s}\`);const{data:a,error:r}=await t.from("messages").select("*").eq("sender_id",s).order("created_at",{ascending:!0});if(r)return void console.error("[DuplicateMessageFix] Error fetching messages:",r);console.log(\`[DuplicateMessageFix] Found \${a.length} messages sent by you\`);const n={};a.forEach(e=>{const t=e.content.substring(0,40),s=\`\${e.receiver_id}_\${t}\`;n[s]||(n[s]=[]),n[s].push(e)});let o=0;const i=[];if(Object.values(n).forEach(e=>{if(e.length>1){e.sort((e,t)=>new Date(e.created_at)-new Date(t.created_at));const t=e.slice(1);i.push(...t.map(e=>e.id)),o+=t.length,console.log(\`[DuplicateMessageFix] Found \${t.length} duplicates for message: "\${e[0].content.substring(0,40)}..."\`)}}),0===o)return void console.log("[DuplicateMessageFix] No duplicate messages found!");console.log(\`[DuplicateMessageFix] Found \${o} total duplicate messages to clean up\`);const c=100;let d=0;for(let e=0;e<i.length;e+=c){const s=i.slice(e,e+c),{error:a}=await t.from("messages").delete().in("id",s);a?console.error(\`[DuplicateMessageFix] Error deleting batch \${e/c+1}:\`,a):(d+=s.length,console.log(\`[DuplicateMessageFix] Successfully deleted batch \${e/c+1} (\${d}/\${o})\`))}console.log(\`[DuplicateMessageFix] Cleanup complete! Deleted \${d} duplicate messages.\`),window.location.pathname.includes("/message/")&&(console.log("[DuplicateMessageFix] Reloading page to refresh message list..."),setTimeout(()=>window.location.reload(),1e3))}catch(e){console.error("[DuplicateMessageFix] Error in cleanup function:",e)}},t(),console.log(\`
  ✅ DuplicateMessageFix installed successfully!
  
  This script prevents:
  - Duplicate messages when clicking "Contact Seller"
  - Duplicate network requests that cause multiple message insertions
  - Duplicate messages added to React state
  
  To clean up existing duplicate messages:
  
  1. Type "cleanupDuplicateMessages()" in the console
  2. Press Enter
  
  This will identify and remove duplicate messages from the database.
  \`)})();`;

console.log(
  "Copy and paste the following into your browser console to fix duplicate message issues:"
);
console.log(minifiedScript);
