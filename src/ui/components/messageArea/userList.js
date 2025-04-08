import React, { useEffect, useState } from "react";
import { supabase } from "../../../supabaseClient";
import "./messages.css";
import SearchIcon from "@mui/icons-material/Search";
import Badge from "@mui/material/Badge";
import MailIcon from "@mui/icons-material/Mail";
import {
  List,
  ListItemButton,
  ListItemText,
  Avatar,
  Box,
  TextField,
} from "@mui/material";

const UserList = ({
  setReceiver,
  currentReceiver,
  unreadCounts,
  currentUserID,
}) => {
  const [users, setUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [latestMessageTimestamps, setLatestMessageTimestamps] = useState({});

  useEffect(() => {
    const fetchUsers = async () => {
      if (!currentUserID) {
        console.log("Skipping fetchUsers: No currentUserID");
        return;
      }

      try {
        console.log(`Fetching users for currentUserID: ${currentUserID}`);
        const { data, error } = await supabase
          .from("users")
          .select("userID, firstName, lastName")
          .neq("userID", currentUserID);

        if (error) {
          console.error("Error fetching users:", error);
          return;
        }

        if (data) {
          console.log(`Found ${data.length} users`);
          setUsers(data);
        }
      } catch (err) {
        console.error("Exception in fetchUsers:", err);
      }
    };

    fetchUsers();
  }, [currentUserID]);

  // fetch latest messages
  useEffect(() => {
    const fetchLatestMessages = async () => {
      if (!currentUserID) {
        console.log("Skipping fetchLatestMessages: No currentUserID");
        return;
      }

      try {
        console.log(`Fetching latest messages for user: ${currentUserID}`);
        const { data, error } = await supabase
          .from("messages")
          .select("sender_id, receiver_id, created_at")
          .or(`sender_id.eq.${currentUserID},receiver_id.eq.${currentUserID}`)
          .order("created_at", { ascending: false });

        if (error) {
          console.error("Error fetching latest messages:", error);
          return;
        }

        if (data) {
          const timestamps = {};
          data.forEach((msg) => {
            const chatUserId =
              msg.sender_id === currentUserID ? msg.receiver_id : msg.sender_id;
            if (chatUserId && !timestamps[chatUserId]) {
              timestamps[chatUserId] = msg.created_at;
            }
          });

          setLatestMessageTimestamps(timestamps);
        }
      } catch (err) {
        console.error("Exception in fetchLatestMessages:", err);
      }
    };

    fetchLatestMessages();
  }, [currentUserID]);

  // listen for message updates
  useEffect(() => {
    if (!currentUserID) {
      console.log("Skipping subscription: No currentUserID");
      return;
    }

    console.log(`Setting up message subscription for user: ${currentUserID}`);
    const messageChannel = supabase
      .channel("chat")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload) => {
          const { sender_id, receiver_id, created_at } = payload.new;
          const chatUserId =
            sender_id === currentUserID ? receiver_id : sender_id;

          if (chatUserId) {
            setLatestMessageTimestamps((prev) => ({
              ...prev,
              [chatUserId]: created_at,
            }));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(messageChannel);
    };
  }, [currentUserID]);

  // filter and sort users
  const filteredUsers = users
    .filter((user) =>
      user.firstName.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      const timeA = latestMessageTimestamps[a.userID]
        ? new Date(latestMessageTimestamps[a.userID]).getTime()
        : 0;
      const timeB = latestMessageTimestamps[b.userID]
        ? new Date(latestMessageTimestamps[b.userID]).getTime()
        : 0;
      return timeB - timeA;
    });

  return (
    <Box sx={{ p: 2 }}>
      {/* Search Input */}
      <TextField
        fullWidth
        variant="outlined"
        placeholder="Search..."
        size="small"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        sx={{ mb: 2 }}
      />

      {/* User List */}
      <List>
        {filteredUsers.map((user) => (
          <ListItemButton
            key={user.userID}
            selected={currentReceiver?.userID === user.userID}
            onClick={() => setReceiver(user)}
            sx={{ borderRadius: 1, mb: 1 }}
          >
            <Avatar sx={{ bgcolor: "#0F2044", mr: 2 }}>
              {user.firstName[0]}
            </Avatar>
            <ListItemText
              primary={
                <span className="user-name-with-badge">
                  {user.firstName} {user.lastName}
                  {unreadCounts?.[user.userID] > 0 && (
                    <Badge
                      badgeContent={unreadCounts[user.userID]}
                      color="error"
                      sx={{ ml: 1 }}
                    >
                      <MailIcon fontSize="small" />
                    </Badge>
                  )}
                </span>
              }
            />
          </ListItemButton>
        ))}
      </List>
    </Box>
  );
};

export default UserList;
