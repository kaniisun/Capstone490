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
        console.log(`Fetching latest conversations for user: ${currentUserID}`);

        // Get all conversations this user is part of
        const { data: conversations, error: conversationsError } =
          await supabase
            .from("conversations")
            .select(
              `
            conversation_id, 
            last_message_at, 
            participant1_id, 
            participant2_id
          `
            )
            .or(
              `participant1_id.eq.${currentUserID},participant2_id.eq.${currentUserID}`
            )
            .order("last_message_at", { ascending: false });

        if (conversationsError) {
          console.error("Error fetching conversations:", conversationsError);
          return;
        }

        if (conversations && conversations.length > 0) {
          const timestamps = {};

          // Process each conversation to get the other participant's ID
          conversations.forEach((conversation) => {
            // Determine which participant is the other user
            const otherUserId =
              conversation.participant1_id === currentUserID
                ? conversation.participant2_id
                : conversation.participant1_id;

            // Store the timestamp for this conversation
            timestamps[otherUserId] = conversation.last_message_at;
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

    console.log(
      `Setting up message and conversation subscriptions for user: ${currentUserID}`
    );

    // Subscribe to messages table changes
    const messageChannel = supabase
      .channel("messages-changes")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload) => {
          const { sender_id, receiver_id, created_at, conversation_id } =
            payload.new;

          // If this message belongs to a conversation with the current user
          if (sender_id === currentUserID || receiver_id === currentUserID) {
            const chatUserId =
              sender_id === currentUserID ? receiver_id : sender_id;

            if (chatUserId) {
              setLatestMessageTimestamps((prev) => ({
                ...prev,
                [chatUserId]: created_at,
              }));
            }
          }
        }
      )
      .subscribe();

    // Subscribe to conversations table changes
    const conversationChannel = supabase
      .channel("conversations-changes")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "conversations" },
        (payload) => {
          const { participant1_id, participant2_id, last_message_at } =
            payload.new;

          // If this conversation involves the current user
          if (
            participant1_id === currentUserID ||
            participant2_id === currentUserID
          ) {
            // Get the other participant's ID
            const otherUserId =
              participant1_id === currentUserID
                ? participant2_id
                : participant1_id;

            // Update the timestamp for this conversation
            setLatestMessageTimestamps((prev) => ({
              ...prev,
              [otherUserId]: last_message_at,
            }));
          }
        }
      )
      .subscribe();

    return () => {
      messageChannel.unsubscribe();
      conversationChannel.unsubscribe();
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
