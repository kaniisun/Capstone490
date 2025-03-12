import React, { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "../../../supabaseClient";
import "./messages.css";

const MessageArea = ({ user, receiver, onCloseChat }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [userID, setUserID] = useState(localStorage.getItem("userId"));
  const messagesEndRef = useRef(null);

  useEffect(() => {
    setUserID(localStorage.getItem("userId"));
  }, []);

  // fetch messages
  const fetchMessages = useCallback(async () => {
    if (!receiver || !userID) return;

    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .or(
        `and(sender_id.eq.${userID},receiver_id.eq.${receiver.userID}),and(sender_id.eq.${receiver.userID},receiver_id.eq.${userID})`
      )

      .order("created_at", { ascending: true });

    console.log("Fetched Messages:", data);
    console.log("Error:", error);

    if (error) {
      console.error("Error fetching messages:", error.message);
    } else if (data) {
      setMessages(data);
    }
  }, [receiver, userID]);

  useEffect(() => {
    if (!receiver || !userID) return;
    fetchMessages(); // get existing messages

    const messageChannel = supabase
      .channel("chat")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload) => {
          console.log("New message received via realtime:", payload.new);

          if (
            (payload.new.sender_id === userID &&
              payload.new.receiver_id === receiver.userID) ||
            (payload.new.sender_id === receiver.userID &&
              payload.new.receiver_id === userID)
          ) {
            setMessages((prevMessages) => [...prevMessages, payload.new]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(messageChannel);
    };
  }, [receiver, userID, fetchMessages]);

  // send message
  const sendMessage = async () => {
    if (!newMessage.trim() || !receiver || !userID) return;

    const { error } = await supabase.from("messages").insert([
      {
        sender_id: userID,
        receiver_id: receiver.userID,
        content: newMessage,
      },
    ]);

    if (!error) {
      if (!error) {
        setNewMessage("");
      }
    }
  };

  // auto-scroll function
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // scroll to bottom of messages when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  return (
    // display chatroom and messages
    <div className="message-area-chat">
      {receiver ? (
        <>
          <div className="message-area-header">
            <h3>Chatting with {receiver.firstName}</h3>
            <button className="close-chat-btn" onClick={onCloseChat}>
              ❌ Close Chat
            </button>
          </div>
          <div className="message-area-messages">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`message-area-message ${
                  msg.sender_id === userID ? "sent" : "received"
                }`}
              >
                <p>{msg.content}</p>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
          <div className="message-area-message-input">
            <input
              type="text"
              placeholder="Type your message..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
            />
            <button onClick={sendMessage}>Send</button>
          </div>
        </>
      ) : (
        <p>Select a user to start chatting.</p>
      )}
    </div>
  );
};

export default MessageArea;
