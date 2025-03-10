import React, { useEffect, useState } from "react";
import { supabase } from "../../../supabaseClient";
import "./messages.css";

const UserList = ({ setReceiver }) => {
  const [users, setUsers] = useState([]);
  const loggedInUserId = localStorage.getItem("userId"); 

  // get users in db besides user thats logged in
  useEffect(() => {
    const fetchUsers = async () => {
      const { data, error } = await supabase
        .from("users")
        .select("userID, firstName")
        .neq("userID", loggedInUserId);

        console.log("Logged in User ID:", loggedInUserId);
  
      if (!error) {
        setUsers(data);
        console.log("Fetched users:", data); 
      }
    };
    fetchUsers();
  }, [loggedInUserId]);
  

  
  return (
    // display users in db
    <div className="user-list">
      <h3>Chat with:</h3>
      {users.map((user) => (
        <div
          key={user.userID}
          className="user-item"
          onClick={() => setReceiver(user)}
        >
          <p>{user.firstName}</p>
        </div>
      ))}
    </div>
  );
};

export default UserList;
