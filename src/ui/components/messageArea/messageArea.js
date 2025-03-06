import React, { useState, useEffect } from "react";
import { supabase } from "../../../supabaseClient"; 
import "./messageArea.css"

const MessageArea = ({  }) => {


  return (
<div className="container">
  <div className="row">
    {/* <nav className="menu">
      <ul className="items">
        <li className="item">
          <i className="fa fa-home" aria-hidden="true" />
        </li>
        <li className="item">
          <i className="fa fa-user" aria-hidden="true" />
        </li>
        <li className="item">
          <i className="fa fa-pencil" aria-hidden="true" />
        </li>
        <li className="item item-active">
          <i className="fa fa-commenting" aria-hidden="true" />
        </li>
        <li className="item">
          <i className="fa fa-file" aria-hidden="true" />
        </li>
        <li className="item">
          <i className="fa fa-cog" aria-hidden="true" />
        </li>
      </ul>
    </nav> */}
    {/* DISCUSSIONS */}
    <section className="discussions">
      <div className="discussion search">
        <div className="searchbar">
          <i className="fa fa-search" aria-hidden="true" />
          <input type="text" placeholder="Search..." />
        </div>
      </div>
      <div className="discussion message-active">
        <div
          className="photo"
          style={{
            backgroundImage:
              "url(https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png)"
          }}
        >
          <div className="online" />
        </div>
        <div className="desc-contact">
          <p className="name">User 1</p>
          <p className="message">What do you have in mind?</p>
        </div>
        <div className="timer">12 sec</div>
      </div>
      <div className="discussion">
        <div
          className="photo"
          style={{
            backgroundImage:
              "url(https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png)"
          }}
        >
          <div className="online" />
        </div>
        <div className="desc-contact">
          <p className="name">User 2</p>
          <p className="message">
            Is this available?
          </p>
        </div>
        <div className="timer">3 min</div>
      </div>
      <div className="discussion">
        <div
          className="photo"
          style={{
            backgroundImage:
              "url(https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png)"
          }}
        ></div>
        <div className="desc-contact">
          <p className="name">User 3</p>
          <p className="message">I can give it to you for $20.</p>
        </div>
        <div className="timer">42 min</div>
      </div>
      <div className="discussion">
        <div
          className="photo"
          style={{
            backgroundImage:
              "url(https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png)"
          }}
        >
          <div className="online" />
        </div>
        <div className="desc-contact">
          <p className="name">User 4</p>
          <p className="message">Where do you want to meet?</p>
        </div>
        <div className="timer">2 hour</div>
      </div>
      <div className="discussion">
        <div
          className="photo"
          style={{
            backgroundImage:
              "url(https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png)"
          }}
        ></div>
        <div className="desc-contact">
          <p className="name">User 5</p>
          <p className="message">How much is this?</p>
        </div>
        <div className="timer">1 day</div>
      </div>
      <div className="discussion">
        <div
          className="photo"
          style={{
            backgroundImage:
              "url(https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png)"
          }}
        ></div>
        <div className="desc-contact">
          <p className="name">User 6</p>
          <p className="message">Do you have other books?</p>
        </div>
        <div className="timer">4 days</div>
      </div>
      <div className="discussion">
        <div
          className="photo"
          style={{
            backgroundImage:
              "url(https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png)"
          }}
        >
          <div className="online" />
        </div>
        <div className="desc-contact">
          <p className="name">User 7</p>
          <p className="message">Hello, is this still available?</p>
        </div>
        <div className="timer">1 week</div>
      </div>
    </section>
    <section className="chat">
      <div className="header-chat">
        <i className="icon fa fa-user-o" aria-hidden="true" />
        <p className="name">User 1</p>
        <i
          className="icon clickable fa fa-ellipsis-h right"
          aria-hidden="true"
        />
      </div>
      <div className="messages-chat">
        <div className="message">
          <div
            className="photo"
            style={{
              backgroundImage:
                "url(https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png)"
            }}
          >
            <div className="online" />
          </div>
          <p className="text"> Hello, </p>
        </div>
        <div className="message text-only">
          <p className="text">
            {" "}
            I have more books for you to buy.
          </p>
        </div>
        <p className="time"> 14h58</p>
        <div className="message text-only">
          <div className="response">
            <p className="text"> Hello! What do you have?</p>
          </div>
        </div>
        <div className="message text-only">
          <div className="response">
            <p className="text">Can I make an offer?</p>
          </div>
        </div>
        <p className="response-time time"> 15h04</p>
        <div className="message">
          <div
            className="photo"
            style={{
              backgroundImage:
                "url(https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png)"
            }}
          >
            <div className="online" />
          </div>
          <p className="text"> What do you have in mind?</p>
        </div>
        <p className="time"> 15h09</p>
      </div>
      <div className="footer-chat">
        <i
          className="icon fa fa-smile-o clickable"
          style={{ fontSize: "25pt" }}
          aria-hidden="true"
        />
        <input
          type="text"
          className="write-message"
          placeholder="Type your message here"
        />
        <i
          className="icon send fa fa-paper-plane-o clickable"
          aria-hidden="true"
        />
      </div>
    </section>
  </div>
</div>

  );

};

export default MessageArea;