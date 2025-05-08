import { useState, useEffect, useCallback } from "react";
import { supabase } from "../../../../supabaseClient";

export const useAdminData = (setSnackbar) => {
  // State for admin data
  const [users, setUsers] = useState([]);
  const [posts, setPosts] = useState([]);
  const [privateMessages, setPrivateMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Function to fetch admin data
  const fetchAdminData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Fetch all users
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("*")
        .order("role", { ascending: false }) // Admin users first
        .order("accountStatus", { ascending: true }) // Active users first
        .order("created_at", { ascending: false }); // Most recently created first

      if (userError) {
        // Handle auth errors specially to avoid logout loops
        if (
          userError.code === "PGRST301" ||
          userError.message.includes("JWT")
        ) {
          setLoading(false);
          return; // Early return instead of throwing
        }
        throw userError;
      }

      // Fetch community posts (open board posts)
      const { data: postData, error: postError } = await supabase
        .from("open_board")
        .select("*, creator_id(userID, firstName, lastName)")
        .order("created_at", { ascending: false }); // Most recent first

      if (postError) {
        // Handle auth errors specially
        if (
          postError.code === "PGRST301" ||
          postError.message.includes("JWT")
        ) {
          // Continue with user data
          setUsers(userData || []);
          setLoading(false);
          return;
        }
        throw postError;
      }

      // Fetch private messages
      const fetchPrivateMessages = async () => {
        try {
          // Use a more detailed query to ensure we get all fields including updated_at
          const { data, error } = await supabase
            .from("messages")
            .select(
              `
              id,
              content,
              created_at,
              updated_at,
              sender_id,
              receiver_id,
              status,
              reply_to,
              sender:sender_id(userID, firstName, lastName),
              receiver:receiver_id(userID, firstName, lastName)
            `
            )
            .order("created_at", { ascending: false });

          if (error) {
            throw error;
          }

          // Process messages to include proper objects
          const processedMessages = data.map((message) => {
            // Create a new object to avoid modifying the original
            const processedMessage = { ...message };

            // Set status to active if not defined
            if (!processedMessage.status) {
              processedMessage.status = "active";
            }

            // Handle sender data
            if (message.sender && typeof message.sender === "object") {
              processedMessage.original_sender = message.sender;
              processedMessage.sender_id = message.sender.userID;
            }

            // Handle receiver data
            if (message.receiver && typeof message.receiver === "object") {
              processedMessage.original_receiver = message.receiver;
              processedMessage.receiver_id = message.receiver.userID;
            }

            // Remove nested objects to avoid rendering issues
            delete processedMessage.sender;
            delete processedMessage.receiver;

            return processedMessage;
          });

          setPrivateMessages(processedMessages);
          return processedMessages;
        } catch (error) {
          setError(error.message);
          return [];
        }
      };

      // Update state with fetched data
      setUsers(userData || []);
      setPosts(postData || []);
      await fetchPrivateMessages();
      setLoading(false);
    } catch (error) {
      setError(error.message);
      setLoading(false);

      setSnackbar({
        open: true,
        message: `Error fetching data: ${error.message}`,
        severity: "error",
      });
    }
  }, [setSnackbar]);

  // Fetch data on component mount
  useEffect(() => {
    fetchAdminData();
  }, [fetchAdminData]);

  return {
    // Data
    users,
    setUsers,
    posts,
    setPosts,
    privateMessages,
    setPrivateMessages,

    // Metadata
    loading,
    error,

    // Functions
    fetchAdminData,
  };
};
