import React, { useState, useEffect } from "react";
import { supabase } from "../../../supabaseClient";
import MessageArea from "./messageArea";
import UserList from "./userList";
import "./messages.css";
import { useParams } from "react-router-dom";
import { Grid, Box, Paper } from "@mui/material";

const MessageHome = () => {
  const [user, setUser] = useState(null);
  const [receiver, setReceiver] = useState(null);
  const [unreadCounts, setUnreadCounts] = useState({});
  const { userId } = useParams();

  useEffect(() => {
    const getUser = async () => {
      const { data, error } = await supabase.auth.getUser();
      if (!error && data?.user) {
        const userID = data.user.id;
        const { data: userData } = await supabase
          .from("users")
          .select("*")
          .eq("userID", userID)
          .single();

        if (userData) {
          setUser(userData);
          localStorage.setItem("userId", userData.userID);
        }
      }
    };

    getUser();
  }, []);

  useEffect(() => {
    const fetchReceiver = async () => {
      if (userId && user) {
        const { data: receiverData } = await supabase
          .from("users")
          .select("*")
          .eq("userID", userId)
          .single();

        if (receiverData) {
          setReceiver(receiverData);
          markMessagesAsRead(userId);
        }
      }
    };

    fetchReceiver();
    return () => {};
  }, [userId, user]);

  const fetchUnreadCounts = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from("messages")
      .select("sender_id")
      .eq("receiver_id", user.userID)
      .eq("is_read", false);

    if (!error && data) {
      const counts = {};
      data.forEach((msg) => {
        counts[msg.sender_id] = (counts[msg.sender_id] || 0) + 1;
      });
      setUnreadCounts(counts);
    }
  };

  const markMessagesAsRead = async (sender_id) => {
    if (!user || !sender_id) return;

    const { data: unreadMessages } = await supabase
      .from("messages")
      .select("id")
      .eq("receiver_id", user.userID)
      .eq("sender_id", sender_id)
      .eq("is_read", false);

    if (unreadMessages?.length) {
      await supabase
        .from("messages")
        .update({ is_read: true })
        .in(
          "id",
          unreadMessages.map((msg) => msg.id)
        )
        .select("*");

      fetchUnreadCounts();
    }
  };

  useEffect(() => {
    if (user) {
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
          <Grid
            item
            xs={3}
            className="message-home-user-list-grid"
          >
            <UserList
                currentReceiver={receiver}
                unreadCounts={unreadCounts}
                currentUserID={user?.userID}
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
