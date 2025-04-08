import React, { useState, useEffect } from "react";
import { supabase } from "../../../supabaseClient";
import MessageArea from "./messageArea";
import UserList from "./userList";
import "./messages.css";
import { useParams, useSearchParams } from "react-router-dom";
import { Grid, Box, Paper } from "@mui/material";

const MessageHome = () => {
  const [user, setUser] = useState(null);
  const [receiver, setReceiver] = useState(null);
  const [unreadCounts, setUnreadCounts] = useState({});
  const { userId } = useParams();
  const [searchParams] = useSearchParams();
  const [productDetails, setProductDetails] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch product details if productId is in URL
  useEffect(() => {
    const fetchProductDetails = async () => {
      const productId = searchParams.get("productId");
      if (!productId) return;

      // Check if we've already fetched these product details
      const productCacheKey = `product_details_${productId}`;
      if (
        window.__fetchedProductDetails &&
        window.__fetchedProductDetails[productCacheKey]
      ) {
        console.log("Using cached product details for:", productId);
        setProductDetails(window.__fetchedProductDetails[productCacheKey]);
        return;
      }

      try {
        console.log("Fetching product details for:", productId);
        const { data: product, error } = await supabase
          .from("products")
          .select("*")
          .eq("productID", productId)
          .single();

        if (error) {
          console.error("Error fetching product details:", error);
          return;
        }

        if (product) {
          console.log("Found product details:", product);

          // Cache the product details to prevent duplicate fetches
          if (!window.__fetchedProductDetails)
            window.__fetchedProductDetails = {};
          window.__fetchedProductDetails[productCacheKey] = product;

          // Only update state if we're still mounted and don't already have these details
          setProductDetails(product);
        }
      } catch (err) {
        console.error("Exception fetching product details:", err);
      }
    };

    fetchProductDetails();
  }, [searchParams]);

  useEffect(() => {
    const getUser = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase.auth.getUser();
        if (error) {
          console.error("Error getting authenticated user:", error);
          setIsLoading(false);
          return;
        }

        if (data?.user) {
          const userID = data.user.id;
          const { data: userData, error: userError } = await supabase
            .from("users")
            .select("*")
            .eq("userID", userID)
            .single();

          if (userError) {
            console.error("Error fetching user data:", userError);
            setIsLoading(false);
            return;
          }

          if (userData) {
            console.log("User data loaded:", userData.userID);
            setUser(userData);
            localStorage.setItem("userId", userData.userID);
          }
        }
      } catch (err) {
        console.error("Exception in getUser:", err);
      } finally {
        setIsLoading(false);
      }
    };

    getUser();
  }, []);

  useEffect(() => {
    const fetchReceiver = async () => {
      if (!userId || !user || isLoading) return;

      // Safety check
      if (userId === "undefined" || userId === "null") {
        console.error("Invalid userId in URL params:", userId);
        return;
      }

      try {
        console.log(`Fetching receiver with userId: ${userId}`);
        const { data: receiverData, error } = await supabase
          .from("users")
          .select("*")
          .eq("userID", userId)
          .single();

        if (error) {
          console.error("Error fetching receiver:", error);
          return;
        }

        if (receiverData) {
          console.log("Receiver data loaded:", receiverData.userID);
          setReceiver(receiverData);
          if (user?.userID) {
            markMessagesAsRead(userId);
          }
        } else {
          console.error("No user found with ID:", userId);
        }
      } catch (err) {
        console.error("Exception in fetchReceiver:", err);
      }
    };

    fetchReceiver();
  }, [userId, user, isLoading]);

  const fetchUnreadCounts = async () => {
    if (!user?.userID) return;

    try {
      console.log(`Fetching unread counts for user: ${user.userID}`);
      const { data, error } = await supabase
        .from("messages")
        .select("sender_id")
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
  };

  const markMessagesAsRead = async (sender_id) => {
    if (!user?.userID || !sender_id) return;

    // Safety check
    if (sender_id === "undefined" || sender_id === "null") {
      console.error("Invalid sender_id in markMessagesAsRead:", sender_id);
      return;
    }

    try {
      console.log(
        `Marking messages as read from sender: ${sender_id} to receiver: ${user.userID}`
      );
      const { data: unreadMessages, error } = await supabase
        .from("messages")
        .select("id")
        .eq("receiver_id", user.userID)
        .eq("sender_id", sender_id)
        .eq("is_read", false);

      if (error) {
        console.error("Error finding unread messages:", error);
        return;
      }

      if (unreadMessages?.length) {
        const messageIds = unreadMessages.map((msg) => msg.id);
        console.log(`Marking ${messageIds.length} messages as read`);

        const { error: updateError } = await supabase
          .from("messages")
          .update({ is_read: true })
          .in("id", messageIds);

        if (updateError) {
          console.error("Error marking messages as read:", updateError);
          return;
        }

        fetchUnreadCounts();
      }
    } catch (err) {
      console.error("Exception in markMessagesAsRead:", err);
    }
  };

  useEffect(() => {
    if (user?.userID) {
      fetchUnreadCounts();

      const subscription = supabase
        .channel("unread-message-updates")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "messages",
            filter: `receiver_id=eq.${user.userID}`,
          },
          fetchUnreadCounts
        )
        .subscribe();

      return () => {
        supabase.removeChannel(subscription);
      };
    }
    return undefined;
  }, [user]);

  return (
    <Box className="message-home-container">
      <Paper className="message-home-paper">
        <Grid container className="message-home-grid">
          {/* User List */}
          <Grid item xs={3} className="message-home-user-list-grid">
            <UserList
              currentReceiver={receiver}
              unreadCounts={unreadCounts}
              currentUserID={user?.userID || null}
              setReceiver={(user) => {
                setReceiver(user);
                markMessagesAsRead(user.userID);
              }}
            />
          </Grid>

          {/* Message Area */}
          <Grid item xs={9} className="message-home-message-grid">
            {receiver ? (
              <MessageArea
                user={user}
                receiver={receiver}
                onCloseChat={() => setReceiver(null)}
                productDetails={productDetails}
              />
            ) : (
              <Box className="message-home-empty-chat-box">
                <p>Select a user to start chatting.</p>
              </Box>
            )}
          </Grid>
        </Grid>
      </Paper>
    </Box>
  );
};

export default MessageHome;
