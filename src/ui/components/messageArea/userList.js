import React, { useEffect, useState } from "react";
import { supabase } from "../../../supabaseClient";
import "./messages.css";
import SearchIcon from "@mui/icons-material/Search";
import Badge from "@mui/material/Badge";
import MailIcon from "@mui/icons-material/Mail";

const UserList = ({ setReceiver, currentReceiver, unreadCounts, currentUserID}) => {
  const [users, setUsers] = useState([]);
  const loggedInUserId = localStorage.getItem("userId");
  const [searchTerm, setSearchTerm] = useState("");
  

  // get users in db besides user that's logged in
  useEffect(() => {
    const fetchUsers = async () => {
      const { data, error } = await supabase
        .from("users")
        .select("userID, firstName")
        .neq("userID", loggedInUserId);

      if (!error) {
        setUsers(data);
      } else {
        console.error("Error fetching users:", error);
      }
    };
    fetchUsers();
  }, [loggedInUserId]);

  // user search filter
  const filteredUsers = users.filter((user) =>
    user.firstName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
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

      {/* user list with unread message badges */}
      {filteredUsers.map((user) => (
        <div
          key={user.userID}
          className={`user-item ${currentReceiver?.userID === user.userID ? "selected" : ""}`}
          onClick={() => setReceiver(user)}
        >
          <p className="user-name-with-badge">
            {user.firstName}
            {unreadCounts?.[user.userID] > 0 && (
              <Badge
                badgeContent={unreadCounts[user.userID]}
                color="error"
                sx={{ ml: 1 }}
              >
                <MailIcon fontSize="small" />
              </Badge>
            )}
          </p>
        </div>
      ))}
    </div>
  );
};

export default UserList;
