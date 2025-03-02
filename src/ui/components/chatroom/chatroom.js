import React from 'react';
import './chatroom.css';

export const Chatroom = () => {
    return (
        <div>
            <div className="chatroom">
                <div className="chatroom-header">
                    <h1>Chatroom</h1>
                </div>
                <div className="message-container">
                    <div className="message sent">
                        <div className="name">User1</div>
                        <div className="bubble">
                            <p>Hi there! How are you?</p>
                            <div className="actions">
                                <button>Reply</button>
                                <button>Delete</button>
                                <button>Like</button>
                                <button>Hide</button>
                            </div>
                        </div>
                    </div>
                    <div className="message received">
                        <div className="name">User2</div>
                        <div className="bubble">
                            <p>I’m good, thank you! How about you?</p>
                            <div className="actions">
                                <button>Reply</button>
                                <button>Delete</button>
                                <button>Like</button>
                                <button>Hide</button>
                            </div>
                        </div>
                    </div>
                    <div className="message sent">
                        <div className="name">User1</div>
                        <div className="bubble">
                            <p>Hi there! How are you?</p>
                            <div className="actions">
                                <button>Reply</button>
                                <button>Delete</button>
                                <button>Like</button>
                                <button>Hide</button>
                            </div>
                        </div>
                    </div>
                    <div className="message received">
                        <div className="name">User2</div>
                        <div className="bubble">
                            <p>I’m good, thank you! How about you?</p>
                            <div className="actions">
                                <button>Reply</button>
                                <button>Delete</button>
                                <button>Like</button>
                                <button>Hide</button>
                            </div>
                        </div>
                    </div>
                    <div className="message sent">
                        <div className="name">User1</div>
                        <div className="bubble">
                            <p>Hi there! How are you?</p>
                            <div className="actions">
                                <button>Reply</button>
                                <button>Delete</button>
                                <button>Like</button>
                                <button>Hide</button>
                            </div>
                        </div>
                    </div>
                    <div className="message received">
                        <div className="name">User2</div>
                        <div className="bubble">
                            <p>I’m good, thank you! How about you?</p>
                            <div className="actions">
                                <button>Reply</button>
                                <button>Delete</button>
                                <button>Like</button>
                                <button>Hide</button>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="input-area">
                    <input type="text" placeholder="Type your message..." />
                    <button className="send">Send</button>
                </div>
            </div>

        </div>)
}
