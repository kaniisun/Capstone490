import React, { useEffect, useState } from "react";
import { supabase } from "../../../supabaseClient";

const MessageHome = () => {
  const [unreadCounts, setUnreadCounts] = useState({});
  const [totalUnreadCount, setTotalUnreadCount] = useState(0);

  // Fix the fetchUnreadCounts function to prevent "body stream already read" error
  const fetchUnreadCounts = async () => {
    try {
      // Get current user ID from localStorage or auth
      const userId = localStorage.getItem("userId");
      if (!userId) {
        console.log("User ID not found in localStorage");
        return;
      }

      // Load unread messages count where user is recipient and messages are unread
      const { data: unreadMessages, error: messageError } = await supabase
        .rpc('get_unread_counts', { user_id: userId });

      if (messageError) {
        // If we get a body stream error, create a fresh request
        if (
          messageError.message &&
          messageError.message.includes("body stream already read")
        ) {
          console.warn(
            "Detected body stream error, retrying with fresh request..."
          );

          // Create a fresh request
          const { data: retryData, error: retryError } = await supabase
            .rpc('get_unread_counts', { user_id: userId });

          if (retryError) {
            console.error("Error fetching unread counts (retry):", retryError);
            throw retryError;
          }

          // Process the retry data
          if (retryData) {
            const countsByUser = {};
            retryData.forEach((item) => {
              countsByUser[item.sender_id] = parseInt(item.count);
            });

            setUnreadCounts(countsByUser);
            setTotalUnreadCount(
              Object.values(countsByUser).reduce((sum, count) => sum + count, 0)
            );
            return;
          }
        } else {
          console.error("Error fetching unread counts:", messageError);
          throw messageError;
        }
      }

      // Process the unread message counts
      if (unreadMessages) {
        const countsByUser = {};
        unreadMessages.forEach((item) => {
          countsByUser[item.sender_id] = parseInt(item.count);
        });

        setUnreadCounts(countsByUser);
        setTotalUnreadCount(
          Object.values(countsByUser).reduce((sum, count) => sum + count, 0)
        );
      }
    } catch (error) {
      console.error("Error fetching unread counts:", error);
    }
  };

  // Call fetchUnreadCounts when component mounts
  useEffect(() => {
    fetchUnreadCounts();
  }, []);

  return (
    <div>
      <div>Total unread messages: {totalUnreadCount}</div>
      {Object.entries(unreadCounts).map(([senderId, count]) => (
        <div key={senderId}>
          Sender {senderId}: {count} unread messages
        </div>
      ))}
    </div>
  );
};

export default MessageHome;
