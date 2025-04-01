import React, { useState, useEffect } from "react";
import { supabase } from "../../../supabaseClient";
import MessageArea from "./messageArea";
import UserList from "./userList";
import "./messages.css";
import { useParams } from "react-router-dom";

const MessageHome = () => {
  const [user, setUser] = useState(null);
  const [receiver, setReceiver] = useState(null);
  const [unreadCounts, setUnreadCounts] = useState({});
  const { userId } = useParams();

  console.log("MessageHome rendered with userId:", userId);

  // Get authenticated user
  useEffect(() => {
    const getUser = async () => {
      console.log("Fetching current user...");
      const { data, error } = await supabase.auth.getUser();
      if (!error && data?.user) {
        const userID = data.user.id;
        const { data: userData, error: userError } = await supabase
          .from("users")
          .select("*")
          .eq("userID", userID)
          .single();

        if (!userError) {
          setUser(userData);
          localStorage.setItem("userId", userData.userID);
        }
      }
    };

    getUser();
  }, []);



  // Fetch unread message counts grouped by sender_id
  const fetchUnreadCounts = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from("messages")
      .select("sender_id")
      .eq("receiver_id", user.userID)
      .eq("is_read", false);

    if (error) {
      console.error("Error fetching unread messages:", error);
      return;
    }

    const counts = {};
    data.forEach((msg) => {
      counts[msg.sender_id] = (counts[msg.sender_id] || 0) + 1;
    });

    console.log("Updated unreadCounts:", counts);
    setUnreadCounts(counts);
  };

  // Mark messages as read when a user is selected
  const markMessagesAsRead = async (sender_id) => {
    if (!user || !sender_id) return;

    const { data, error } = await supabase
      .from("messages")
      .update({ is_read: true })
      .eq("receiver_id", user.userID)
      .eq("sender_id", sender_id)
      .select(); 

    if (error) {
      console.error("Error marking messages as read:", error);
    } else {
      console.log("Marked messages as read:", data);
      fetchUnreadCounts(); // refresh badge counts
    }
  };

  // Subscribe to message updates
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
          () => {
            fetchUnreadCounts();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(subscription);
      };
    }
  }, [user]);

  const handleCloseChat = () => {
    setReceiver(null);
  };

  return (
    <div className="message-home">
      {user ? (
        <div className="message-home-chat-container">
          <UserList
            currentReceiver={receiver}
            unreadCounts={unreadCounts}
            currentUserID={user.userID}
            setReceiver={(selectedUser) => {
              setReceiver(selectedUser);
              markMessagesAsRead(selectedUser.id); // call with sender_id
            }}
          />
          {receiver ? (
            <MessageArea
              user={user}
              receiver={receiver}
              onCloseChat={handleCloseChat}
            />
          ) : (
            <div className="message-home-empty-chat">
              Select a user to start chatting
            </div>
          )}
        </div>
      ) : (
        <p>Loading...</p>
      )}
    </div>
  );
};

export default MessageHome;
