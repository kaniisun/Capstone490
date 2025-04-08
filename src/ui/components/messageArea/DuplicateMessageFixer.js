import React, { useEffect } from "react";
import { supabase } from "../../../supabaseClient";
import { trackDeletedMessage } from "./messageHelper";

/**
 * This component detects and prevents duplicate initial messages.
 * Simply import and include it once in your MessageArea component.
 */
const DuplicateMessageFixer = ({ userID, productDetails }) => {
  // Run once on component mount
  useEffect(() => {
    // Skip if missing data
    if (!userID || !productDetails) return;

    // Create a storage key to track if we've already run cleanup for this product
    const cleanupKey = `cleanup_done_${userID}_${
      productDetails.id || productDetails.productID
    }`;

    // Skip if we've already run cleanup for this product in this session
    if (sessionStorage.getItem(cleanupKey)) {
      console.log(
        "Duplicate cleanup already performed for this product in this session"
      );
      return;
    }

    const deleteDuplicateMessages = async () => {
      try {
        console.log("Checking for duplicate product messages...");

        // Find messages related to this product
        const productKeyword = productDetails.name.substring(0, 20);
        const interestPrefix = "Hi, I'm interested in your";

        const { data, error } = await supabase
          .from("messages")
          .select("*")
          .filter("content", "ilike", `%${productKeyword}%`)
          .filter("content", "ilike", `%${interestPrefix}%`)
          .eq("sender_id", userID)
          .order("created_at", { ascending: true });

        if (error) {
          console.error("Error fetching potential duplicates:", error);
          return;
        }

        if (!data || data.length <= 1) {
          console.log("No duplicates found.");
          return;
        }

        console.log(
          `Found ${data.length} messages about this product, keeping oldest.`
        );

        // Keep the first (oldest) message, delete the rest
        const oldestMessage = data[0];
        const messagesToDelete = data.slice(1);
        let deletedCount = 0;

        for (const msg of messagesToDelete) {
          console.log(`Deleting duplicate message: ${msg.id}`);
          const { error: deleteError } = await supabase
            .from("messages")
            .delete()
            .eq("id", msg.id);

          if (deleteError) {
            console.error(`Error deleting message ${msg.id}:`, deleteError);
          } else {
            // Track the message as deleted to prevent it from reappearing
            trackDeletedMessage(msg.id);
            deletedCount++;
          }
        }

        // Mark cleanup as done for this session
        sessionStorage.setItem(cleanupKey, "true");

        console.log(
          `Duplicate message cleanup complete. Deleted ${deletedCount} duplicates.`
        );

        // If we have exactly one message now, make sure it's not blocked for future
        if (deletedCount > 0) {
          // Clear any message blocking flags for this product
          try {
            const receiverId = oldestMessage.receiver_id;
            if (receiverId) {
              const preventionKey = `${userID}_${receiverId}_${
                productDetails.id || productDetails.productID
              }`;
              if (localStorage.getItem(preventionKey)) {
                console.log(
                  `Removing message prevention flag: ${preventionKey}`
                );
                localStorage.removeItem(preventionKey);
              }
            }
          } catch (e) {
            console.error("Error clearing message prevention flag:", e);
          }
        }
      } catch (err) {
        console.error("Error in deleteDuplicateMessages:", err);
      }
    };

    // Run with a reasonable delay to ensure other components have loaded
    const timer = setTimeout(() => {
      deleteDuplicateMessages();
    }, 3000);

    return () => clearTimeout(timer);
  }, [userID, productDetails]);

  // This component doesn't render anything
  return null;
};

export default DuplicateMessageFixer;
