import React, { useState, useEffect } from "react";
import { supabase } from "../../../supabaseClient"; 

const ChatBox = ({ chatId, userId, otherUserId }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");

  useEffect(() => {
    const fetchMessages = async () => {
      const { data, error } = await supabase
        .from("message")
        .select("*")
        .eq("sender_id", userId)
        .eq("receiver_id", otherUserId)
        .order("created_at", { ascending: true });

      if (!error) setMessages(data);
    };

    fetchMessages();

    const subscription = supabase
      .channel(`chat:${chatId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "message" }, (payload) => {
        setMessages((prev) => [...prev, payload.new]);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [chatId, userId, otherUserId]);

  const sendMessage = async () => {
    if (!newMessage.trim()) return;

    const { error } = await supabase.from("message").insert({
      sender_id: userId,
      receiver_id: otherUserId,
      content: newMessage,
      created_at: new Date().toISOString(),
    });

    if (error) console.error(error);
    else setNewMessage("");
  };

  return (
    <div>
      <h2>Chat with {otherUserId}</h2>
      <div className="chat-messages">
        {messages.map((msg) => (
          <p key={msg.id} className={msg.sender_id === userId ? "sent" : "received"}>
            {msg.content}
          </p>
        ))}
      </div>
      <input value={newMessage} onChange={(e) => setNewMessage(e.target.value)} />
      <button onClick={sendMessage}>Send</button>
    </div>
  );
};

export default ChatBox;
