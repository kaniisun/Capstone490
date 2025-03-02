import React, { useState } from 'react';
import './chatroom.css';

const Chatroom = () => {
    const [messages, setMessages] = useState([
        { id: 1, text: "Hello!", sender: "You", timestamp: "10:30 AM", hidden: false, replies: [] },
        { id: 2, text: "Hi there, how are you?", sender: "User", timestamp: "10:31 AM", hidden: false, replies: [] }
    ]);
    const [input, setInput] = useState('');
    const [replyInput, setReplyInput] = useState({});
    const [likes, setLikes] = useState({});
    const [showHidden, setShowHidden] = useState(false);
    const [replyingTo, setReplyingTo] = useState(null);

    const handleSendMessage = () => {
        if (input.trim()) {
            setMessages([...messages, { id: Date.now(), text: input, sender: "You", timestamp: new Date().toLocaleTimeString(), hidden: false, replies: [] }]);
            setInput('');
        }
    };

    const handleLike = (id) => {
        setLikes({ ...likes, [id]: (likes[id] || 0) + 1 });
    };

    const handleDelete = (id) => {
        setMessages(messages.filter(msg => msg.id !== id));
    };

    const handleHide = (id) => {
        setMessages(messages.map(msg => (msg.id === id ? { ...msg, hidden: true } : msg)));
    };

    const handleUnhide = (id) => {
        setMessages(messages.map(msg => (msg.id === id ? { ...msg, hidden: false } : msg)));
    };

    const handleReply = (id) => {
        setReplyingTo(id);
    };

    const sendReply = (id) => {
        if (replyInput[id]?.trim()) {
            setMessages(messages.map(msg => 
                msg.id === id ? { ...msg, replies: [...msg.replies, { text: replyInput[id], sender: "You", timestamp: new Date().toLocaleTimeString() }] } : msg
            ));
            setReplyInput({ ...replyInput, [id]: '' });
            setReplyingTo(null);
        }
    };

    return (
        <div className="chatroom-container">
            <div className="chatroom-header">
                <h2>Chatroom</h2>
                <button className="show-hidden-btn" onClick={() => setShowHidden(!showHidden)}>
                    {showHidden ? "Hide Hidden Messages" : "Show Hidden Messages"}
                </button>
            </div>

            <div className="messages-container">
                {messages.map((msg) => (
                    msg.hidden && !showHidden ? null : (
                        <div key={msg.id} className={`message-box ${msg.sender === "You" ? "your-message" : "other-message"}`}>
                            <p className="message-text">{msg.text}</p>
                            <div className="message-footer">
                                <div className="message-options">
                                    {!msg.hidden ? (
                                        <>
                                            <button className="option-btn" onClick={() => handleReply(msg.id)}>Reply</button>
                                            <button className="option-btn" onClick={() => handleLike(msg.id)}>Like {likes[msg.id] || 0}</button>
                                            <button className="option-btn" onClick={() => handleHide(msg.id)}>Hide</button>
                                            <button className="option-btn" onClick={() => handleDelete(msg.id)}>Delete</button>
                                        </>
                                    ) : (
                                        <button className="unhide-btn" onClick={() => handleUnhide(msg.id)}>Unhide</button>
                                    )}
                                </div>
                                <span className="timestamp">{msg.timestamp}</span>
                            </div>

                            {/* Reply input field */}
                            {replyingTo === msg.id && (
                                <div className="reply-input">
                                    <input
                                        type="text"
                                        value={replyInput[msg.id] || ''}
                                        onChange={(e) => setReplyInput({ ...replyInput, [msg.id]: e.target.value })}
                                        placeholder="Type your reply..."
                                    />
                                    <button onClick={() => sendReply(msg.id)}>Send</button>
                                </div>
                            )}

                            {/* Display replies in separate boxes */}
                            {msg.replies.length > 0 && (
                                <div className="replies-container">
                                    {msg.replies.map((reply, index) => (
                                        <div key={index} className="reply-box">
                                            <p className="message-text">{reply.text}</p>
                                            <div className="message-footer">
                                                <span className="sender">{reply.sender}</span>
                                                <span className="timestamp">{reply.timestamp}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )
                ))}
            </div>

            <div className="chatroom-footer">
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Type a message..."
                    className="message-input"
                />
                <button onClick={handleSendMessage} className="send-button">Send</button>
            </div>
        </div>
    );
};

export default Chatroom;


