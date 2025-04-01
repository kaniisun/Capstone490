import React from "react";
import {
  ListItem,
  ListItemText,
  Typography,
  Box,
  Button,
  Chip,
  Divider,
  Card,
  CardContent,
} from "@mui/material";
import FlagIcon from "@mui/icons-material/Flag";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";

// Format date function
const formatDate = (dateString) => {
  if (!dateString) return "Unknown date";

  try {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch (error) {
    console.error("Error formatting date:", error);
    return "Invalid date";
  }
};

const ContentItem = ({ item, isFlagged, onFlag, onUnflag }) => {
  // Format the date
  const formattedDate = formatDate(item.created_at);

  // Get creator name
  const creatorName = item.creator_id
    ? `${item.creator_id.firstName || ""} ${
        item.creator_id.lastName || ""
      }`.trim()
    : "Unknown user";

  return (
    <>
      <ListItem
        alignItems="flex-start"
        sx={{
          flexDirection: "column",
          p: 2,
          backgroundColor: isFlagged ? "rgba(255, 235, 235, 0.5)" : "inherit",
        }}
      >
        <Box sx={{ width: "100%", display: "flex", mb: 1 }}>
          <ListItemText
            primary={
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Typography variant="h6" component="span">
                  {item.title || "Untitled Post"}
                </Typography>

                {isFlagged ? (
                  <Chip
                    icon={<FlagIcon />}
                    label="Flagged"
                    color="warning"
                    size="small"
                  />
                ) : (
                  <Chip
                    label="Active"
                    color="success"
                    size="small"
                    variant="outlined"
                  />
                )}
              </Box>
            }
            secondary={
              <Typography
                variant="body2"
                color="text.secondary"
                component="span"
              >
                Posted by {creatorName} on {formattedDate}
              </Typography>
            }
          />

          <Box sx={{ display: "flex", gap: 1, ml: "auto" }}>
            {isFlagged ? (
              <Button
                variant="outlined"
                color="success"
                size="small"
                startIcon={<CheckCircleOutlineIcon />}
                onClick={() => onUnflag(item)}
              >
                Approve
              </Button>
            ) : (
              <Button
                variant="outlined"
                color="warning"
                size="small"
                startIcon={<FlagIcon />}
                onClick={() => onFlag(item)}
              >
                Flag
              </Button>
            )}
          </Box>
        </Box>

        <Card variant="outlined" sx={{ width: "100%", mt: 1, mb: 1 }}>
          <CardContent sx={{ py: 1.5, "&:last-child": { pb: 1.5 } }}>
            <Typography variant="body2" component="div">
              {item.content || "No content"}
            </Typography>
          </CardContent>
        </Card>
      </ListItem>
      <Divider />
    </>
  );
};

export default ContentItem;
