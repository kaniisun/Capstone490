import React, { useState, useEffect } from "react";
import { supabase } from "../../../supabaseClient"; 

const ChatList = ({ userId, selectChat }) => {
  const [chats, setChats] = useState([]);

  useEffect(() => {
    const fetchChats = async () => {
      const { data, error } = await supabase
        .from("private_chat")
        .select("chat_id, buyer_id, seller_id, product_id")
        .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`);

      if (error) console.error(error);
      else setChats(data);
    };

    fetchChats();
  }, [userId]);

  return (
    <div>
      <h2>Your Chats</h2>
      {chats.map((chat) => {
        const otherUser = chat.buyer_id === userId ? chat.seller_id : chat.buyer_id;
        return (
          <button key={chat.chat_id} onClick={() => selectChat(chat.chat_id, otherUser)}>
            Chat with {otherUser}
          </button>
        );
      })}
    </div>
  );
};

export default ChatList;