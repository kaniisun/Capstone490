import React, { useState, useEffect } from "react";
import { supabase } from "../../../supabaseClient";
import MessageArea from "./messageArea";
import UserList from "./userList";
import "./messages.css";
import { useParams } from "react-router-dom";

const MessageHome = () => {
  const [user, setUser] = useState(null);
  const [receiver, setReceiver] = useState(null);
  const { userId } = useParams();

  console.log("MessageHome rendered with userId:", userId);

  // get auth user
  useEffect(() => {
    const getUser = async () => {
      console.log("Fetching current user...");
      const { data, error } = await supabase.auth.getUser();
      if (!error && data?.user) {
        const userID = data.user.id;
        console.log("Auth user ID:", userID);
        const { data: userData, error: userError } = await supabase
          .from("users")
          .select("*")
          .eq("userID", userID)
          .single();

        if (!userError) {
          console.log("Fetched user data:", userData);
          setUser(userData);
          localStorage.setItem("userId", userData.userID);
        }
      }
    };

    getUser();
  }, []);

  // If userId is provided in URL, fetch and set receiver
  useEffect(() => {
    const fetchReceiver = async () => {
      console.log("Fetching receiver with userId:", userId);
      if (userId) {
        const { data, error } = await supabase
          .from("users")
          .select("*")
          .eq("userID", userId)
          .single();

        if (!error && data) {
          console.log("Fetched receiver data:", data);
          setReceiver(data);
        } else {
          console.error("Error fetching receiver:", error);
        }
      }
    };

    fetchReceiver();
  }, [userId]);
  
  // close chat
  const handleCloseChat = () => {
    setReceiver(null); 
  };

  return (
    // display
    <div className="message-home">
      {user ? (
        <div className="message-home-chat-container">
          <UserList setReceiver={setReceiver} currentReceiver={receiver} />
          {receiver ? (
            <MessageArea user={user} receiver={receiver} onCloseChat={handleCloseChat} />
          ) : (
            <div className="message-home-empty-chat">Select a user to start chatting</div>
          )}
        </div>
      ) : (
        <p>Loading...</p>
      )}
    </div>
  );
};

export default MessageHome;
