/**
 * DUPLICATE MESSAGE CLEANER
 *
 * Instructions:
 * 1. Copy this entire script
 * 2. Open your browser console (F12 or Ctrl+Shift+I)
 * 3. Paste the script and press Enter
 * 4. Run the cleanup function by typing: cleanupDuplicateMessages()
 */

async function cleanupDuplicateMessages() {
  try {
    // Get supabase instance from window
    const supabase = window.supabase;
    if (!supabase) {
      console.error(
        "Supabase not found on window. Make sure you're on a page that has initialized Supabase."
      );
      return;
    }

    // Get current user ID
    const userID = localStorage.getItem("userId");
    if (!userID) {
      console.error("No user ID found in localStorage");
      return;
    }

    console.log(`Looking for duplicate messages from user ${userID}...`);

    // Find all "interested in" messages sent by the current user
    const { data: messages, error } = await supabase
      .from("messages")
      .select("*")
      .eq("sender_id", userID)
      .ilike("content", "Hi, I'm interested in your%")
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error fetching messages:", error);
      return;
    }

    console.log(`Found ${messages.length} "interested in" messages`);

    // Group messages by receiver and similar content
    const groups = {};

    messages.forEach((msg) => {
      // Create a key using the first 30 chars of content + receiver
      const contentKey = msg.content.substring(0, 30) + "_" + msg.receiver_id;

      if (!groups[contentKey]) {
        groups[contentKey] = [];
      }

      groups[contentKey].push(msg);
    });

    // Process each group
    let totalDeleted = 0;

    for (const [key, messageGroup] of Object.entries(groups)) {
      // If more than one message in the group, we have duplicates
      if (messageGroup.length > 1) {
        console.log(
          `Found ${messageGroup.length} duplicate messages for "${
            key.split("_")[0]
          }..."`
        );

        // Keep the oldest message, delete the rest
        const [oldest, ...duplicates] = messageGroup;
        console.log(`Keeping oldest message sent at ${oldest.created_at}`);

        // Delete each duplicate
        for (const duplicate of duplicates) {
          console.log(`Deleting duplicate from ${duplicate.created_at}`);

          const { error: deleteError } = await supabase
            .from("messages")
            .delete()
            .eq("id", duplicate.id);

          if (deleteError) {
            console.error(
              `Error deleting message ${duplicate.id}:`,
              deleteError
            );
          } else {
            totalDeleted++;
          }
        }
      }
    }

    console.log(
      `Cleanup complete! Deleted ${totalDeleted} duplicate messages.`
    );

    // Force refresh the page to show changes
    if (totalDeleted > 0) {
      const shouldRefresh = window.confirm(
        "Deleted duplicate messages. Refresh the page to see changes?"
      );
      if (shouldRefresh) {
        window.location.reload();
      }
    }
  } catch (err) {
    console.error("Error in cleanupDuplicateMessages:", err);
  }
}

console.log(
  "Duplicate Message Cleaner loaded! Type cleanupDuplicateMessages() to run."
);
