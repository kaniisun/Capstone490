import React, { useEffect, useState } from "react";
import { supabase } from "../../../supabaseClient";
import "./messages.css";
import SearchIcon from '@mui/icons-material/Search';

const UserList = ({ setReceiver }) => {
  const [users, setUsers] = useState([]);
  const loggedInUserId = localStorage.getItem("userId");
  const [searchTerm, setSearchTerm] = useState("");

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

  // user search filter
  const filteredUsers = users.filter((user) =>
    user.firstName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    // display users in db
    <div className="user-list">
      <h3>Chat with:</h3>
      {/* search input */}
      <div className="user-search-box">
        <input
          type="text"
          placeholder="Search..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="user-search-input"
        />
      </div>

      {/* search display */}
      {filteredUsers.map((user) => (
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
