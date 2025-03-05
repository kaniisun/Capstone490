import React, { useState, useEffect } from "react";
import { supabase } from "../../../supabaseClient"; 
import ChatList from "./chatList";
import ChatBox from "./chatBox";

const MessagingPage = () => {
  const [user, setUser] = useState(null);
  const [selectedChat, setSelectedChat] = useState(null);
  const [otherUserId, setOtherUserId] = useState(null);

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };

    fetchUser();
  }, []);

  const openChat = (chatId, otherUser) => {
    setSelectedChat(chatId);
    setOtherUserId(otherUser);
  };

  if (!user) return <p>Loading...</p>;

  return (
    <div>
      <ChatList userId={user.id} selectChat={openChat} />
      {selectedChat && <ChatBox chatId={selectedChat} userId={user.id} otherUserId={otherUserId} />}
    </div>
  );
};

export default MessagingPage;
