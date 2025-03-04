import React, { useState, useEffect } from "react";
import { supabase } from "../../../supabaseClient";

const Message = ({ user, recipientId }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");

  useEffect(() => {
    // get past messages
    const fetchMessages = async () => {
      const { data, error } = await supabase
        .from("message")
        .select("*")
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .order("created_at", { ascending: true });

      if (!error) setMessages(data);
    };

    fetchMessages();

    // lsiten for new messages in real-time
    const subscription = supabase
      .channel("message")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "message" },
        (payload) => {
          setMessages((prev) => [...prev, payload.new]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [user.id]);

  // send Message
  const sendMessage = async () => {
    if (!newMessage.trim()) return;

    await supabase
      .from("message")
      .insert([
        { sender_id: user.id, receiver_id: recipientId, content: newMessage },
      ]);

    setNewMessage(""); // clear input after sending
  };

  return (
    <div>
      <h2>Chat with User {recipientId}</h2>
      <div className="chat-box">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={
              msg.sender_id === user.id ? "my-message" : "other-message"
            }
          >
            <p>{msg.content}</p>
          </div>
        ))}
      </div>
      <input
        type="text"
        value={newMessage}
        onChange={(e) => setNewMessage(e.target.value)}
        placeholder="Type a message..."
      />
      <button onClick={sendMessage}>Send</button>
    </div>
  );
};

export default Message;
