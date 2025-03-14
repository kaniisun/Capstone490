import React, { useState, useEffect } from "react";
import { supabase } from "../../../supabaseClient";
import MessageArea from "./messageArea";
import UserList from "./userList";

const MessageHome = () => {
  const [user, setUser] = useState(null);
  const [receiver, setReceiver] = useState(null);

  // get auth user
  useEffect(() => {
    const getUser = async () => {
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

  // close chat
  const handleCloseChat = () => {
    setReceiver(null); 
  };

  return (
    // display
    <div>
      {user ? (
        <>
          <UserList setReceiver={setReceiver} />
          {receiver && (
            <MessageArea user={user} receiver={receiver} onCloseChat={handleCloseChat} />
          )}
        </>
      ) : (
        <p>Loading...</p>
      )}
    </div>
  );
};

export default MessageHome;
