import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "../../../supabaseClient";
import MessageArea from "./messageArea";
import UserList from "./userList";
import "./messages.css";
import { useParams, useSearchParams, useLocation } from "react-router-dom";
import { Grid, Paper } from "@mui/material";

const MessageHome = () => {
  const [user, setUser] = useState(null);
  const [receiver, setReceiver] = useState(null);
  const [unreadCounts, setUnreadCounts] = useState({});
  const { userId } = useParams();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const [productDetails, setProductDetails] = useState(null);

  // Fetch unread message counts
  const fetchUnreadCounts = useCallback(async () => {
    if (!user?.userID) return;

    try {
      console.log(`Fetching unread counts for user: ${user.userID}`);
      const { data, error } = await supabase
        .from("messages")
        .select("sender_id, conversation_id")
        .eq("receiver_id", user.userID)
        .eq("is_read", false);

      if (error) {
        console.error("Error fetching unread counts:", error);
        return;
      }

      if (data) {
        const counts = {};
        data.forEach((msg) => {
          if (msg.sender_id) {
            counts[msg.sender_id] = (counts[msg.sender_id] || 0) + 1;
          }
        });
        setUnreadCounts(counts);
      }
    } catch (err) {
      console.error("Exception in fetchUnreadCounts:", err);
    }
  }, [user?.userID]);

  // Mark messages as read when selecting a conversation
  const markMessagesAsRead = useCallback(
    async (senderId) => {
      if (!user?.userID || !senderId) return;

      try {
        console.log(`Marking messages from ${senderId} as read`);

        // Find the conversation
        const { data: conversationData, error: convError } = await supabase
          .from("conversations")
          .select("conversation_id")
          .or(
            `and(participant1_id.eq.${user.userID},participant2_id.eq.${senderId}),and(participant1_id.eq.${senderId},participant2_id.eq.${user.userID})`
          )
          .limit(1);

        if (convError || !conversationData || conversationData.length === 0) {
          return;
        }

        const conversationId = conversationData[0].conversation_id;

        // Find and mark unread messages in this conversation
        const { data: unreadMessages, error } = await supabase
          .from("messages")
          .select("id")
          .eq("conversation_id", conversationId)
          .eq("receiver_id", user.userID)
          .eq("sender_id", senderId)
          .eq("is_read", false);

        if (error || !unreadMessages?.length) {
          return;
        }

        // Mark messages as read
        const messageIds = unreadMessages.map((msg) => msg.id);
        const { error: updateError } = await supabase
          .from("messages")
          .update({ is_read: true })
          .in("id", messageIds);

        if (!updateError) {
          fetchUnreadCounts();
        }
      } catch (err) {
        console.error("Error marking messages as read:", err);
      }
    },
    [user?.userID, fetchUnreadCounts]
  );

  // Fetch product details from location state or URL params
  useEffect(() => {
    const fetchProductDetails = async () => {
      // First check if product details are in the location state
      if (location.state && location.state.productDetails) {
        console.log(
          "Using product details from location state:",
          location.state.productDetails
        );
        setProductDetails(location.state.productDetails);
        return;
      }

      // Fallback to query params if no state is available
      const productId = searchParams.get("productId");
      if (!productId) return;

      try {
        console.log("Fetching product details for:", productId);

        // Use a simple approach - just try to fetch by productID
        const productResult = await supabase
          .from("products")
          .select("*")
          .eq("productID", productId)
          .single();

        const data = productResult.data;
        const error = productResult.error;

        if (error || !data) {
          // Try by ID if productID fails
          const secondTryResult = await supabase
            .from("products")
            .select("*")
            .eq("id", productId)
            .single();

          const secondTryData = secondTryResult.data;

          if (secondTryData) {
            console.log("Found product by ID:", secondTryData);
            setProductDetails(secondTryData);
          } else {
            console.log("No product found with ID:", productId);
          }
        } else {
          console.log("Found product by productID:", data);
          setProductDetails(data);
        }
      } catch (err) {
        console.error("Exception fetching product details:", err);
      }
    };

    fetchProductDetails();
  }, [searchParams, location.state]);

  // Fetch current user data
  useEffect(() => {
    const fetchUserData = async () => {
      const currentUserID = localStorage.getItem("userId");
      if (!currentUserID) return;

      try {
        const { data, error } = await supabase
          .from("users")
          .select("userID, firstName, lastName, email")
          .eq("userID", currentUserID)
          .single();

        if (error) {
          console.error("Error fetching user data:", error);
          return;
        }

        if (data) {
          setUser(data);
        }
      } catch (err) {
        console.error("Exception in fetchUserData:", err);
      }
    };

    fetchUserData();
  }, []);

  // Fetch the receiver user data
  useEffect(() => {
    const fetchReceiverData = async () => {
      if (!userId) return;

      try {
        const { data, error } = await supabase
          .from("users")
          .select("userID, firstName, lastName, email")
          .eq("userID", userId)
          .single();

        if (error) {
          console.error("Error fetching receiver data:", error);
          return;
        }

        if (data) {
          setReceiver(data);
          // If we have both user and receiver, mark messages as read
          if (user?.userID) {
            markMessagesAsRead(userId);
          }
        }
      } catch (err) {
        console.error("Exception in fetchReceiverData:", err);
      }
    };

    fetchReceiverData();
  }, [userId, user?.userID, markMessagesAsRead]);

  // Listen for new messages to update unread counts
  useEffect(() => {
    if (user?.userID) {
      fetchUnreadCounts();

      // Set up real-time subscription for new messages
      const messagesChannel = supabase
        .channel("messages-changes")
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "messages" },
          (payload) => {
            if (payload.new.receiver_id === user.userID) {
              fetchUnreadCounts();
            }
          }
        )
        .subscribe();

      return () => {
        messagesChannel.unsubscribe();
      };
    }
  }, [user?.userID, fetchUnreadCounts]);

  // Handle selecting a user from the list
  const handleSelectUser = (selectedUser) => {
    setReceiver(selectedUser);
    if (selectedUser && user?.userID) {
      markMessagesAsRead(selectedUser.userID);
    }
  };

  // Handle closing the chat
  const handleCloseChat = () => {
    setReceiver(null);
  };

  return (
    <div className="message-home-container">
      <Grid container spacing={0} className="message-home-grid">
        <Grid item xs={12} sm={4} md={3} lg={3} className="user-list-container">
          <Paper className="user-list-paper">
            <UserList
              setReceiver={handleSelectUser}
              currentReceiver={receiver}
              unreadCounts={unreadCounts}
              currentUserID={user?.userID}
            />
          </Paper>
        </Grid>
        <Grid
          item
          xs={12}
          sm={8}
          md={9}
          lg={9}
          className="message-area-container"
        >
          <Paper className="message-area-paper"

           elevation={0}
           sx={{
             boxShadow: "none",
             border: "none",
           }}
          
          >
  {receiver ? (
    <MessageArea
      user={user}
      receiver={receiver}
      onCloseChat={handleCloseChat}
      productDetails={productDetails}
    />
  ) : (
    <div className="select-user-message"
    >
      
      <p>Select a user to start a conversation</p>
    </div>
  )}
</Paper>

        </Grid>
      </Grid>
    </div>
  );
};

export default MessageHome;
