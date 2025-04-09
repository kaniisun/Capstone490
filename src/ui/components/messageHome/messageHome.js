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
      .from("messages")
      .select("sender_id, COUNT(id)", { count: "exact" })
      .eq("receiver_id", userId)
      .eq("read", false)
      .eq("status", "active")
      .neq("sender_id", userId) // Exclude self-messages
      .group("sender_id");

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
          .from("messages")
          .select("sender_id, COUNT(id)", { count: "exact" })
          .eq("receiver_id", userId)
          .eq("read", false)
          .eq("status", "active")
          .neq("sender_id", userId)
          .group("sender_id");

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
