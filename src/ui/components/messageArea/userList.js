import React, { useEffect, useState } from "react";
import { supabase } from "../../../supabaseClient";
import "./messages.css";
import SearchIcon from "@mui/icons-material/Search";
import Badge from "@mui/material/Badge";
import MailIcon from "@mui/icons-material/Mail";

const UserList = ({
  setReceiver,
  currentReceiver,
  unreadCounts,
  currentUserID,
}) => {
  const [users, setUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const fetchUsers = async () => {
      const { data, error } = await supabase
        .from("users")
        .select("userID, firstName")
        .neq("userID", currentUserID);

      if (!error && data) setUsers(data);
    };

    fetchUsers();
  }, [currentUserID]);

  const filteredUsers = users.filter((user) =>
    user.firstName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="user-list">
      <h3>Chat with:</h3>
      <div className="user-search-box">
        <input
          type="text"
          placeholder="Search..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="user-search-input"
        />
      </div>

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
