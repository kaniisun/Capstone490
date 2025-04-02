import React from "react";
import { useDispatch, useSelector } from "react-redux";
import { updateCommunityForm } from "../../../store/communitySlice";
import { createCommunity } from "../../../store/communityThunks";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  TextField,
  Button,
  Box,
  Typography,
  CircularProgress,
} from "@mui/material";

const NewCommunityDialog = ({ open, onClose }) => {
  const dispatch = useDispatch();
  const { newCommunityForm, loading, error } = useSelector(
    (state) => state.communities
  );

  const handleSubmit = async () => {
    try {
      await dispatch(createCommunity()).unwrap();
      // Close dialog on success
      onClose();
    } catch (err) {
      // Error is already handled in the thunk
      console.error("Error in community creation:", err);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      disableRestoreFocus
    >
      <DialogTitle>Create New Spartan Community</DialogTitle>
      <DialogContent>
        <DialogContentText>
          Create a new community for Spartan Marketplace users to share and
          discuss topics.
        </DialogContentText>

        {/* Community name with prefix outside the TextField */}
        <Box sx={{ display: "flex", alignItems: "center", mt: 2 }}>
          <Typography variant="body1" sx={{ mr: 1, color: "text.secondary" }}>
            s/
          </Typography>
          <TextField
            autoFocus
            fullWidth
            label="Community Name"
            value={newCommunityForm.name}
            onChange={(e) =>
              dispatch(updateCommunityForm({ name: e.target.value }))
            }
            error={!!error}
            helperText={error || "Enter a name for your community"}
            size="medium"
          />
        </Box>

        <TextField
          margin="dense"
          label="Description"
          type="text"
          fullWidth
          multiline
          rows={4}
          value={newCommunityForm.description}
          onChange={(e) =>
            dispatch(updateCommunityForm({ description: e.target.value }))
          }
          helperText="Tell people what this community is about"
          sx={{ mt: 2 }}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="primary">
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          color="primary"
          variant="contained"
          disabled={loading || !newCommunityForm.name.trim()}
          startIcon={
            loading ? <CircularProgress size={16} color="inherit" /> : null
          }
          sx={{
            borderRadius: 28,
            px: 3,
            textTransform: "none",
            boxShadow: 2,
            "&:hover": {
              boxShadow: 3,
            },
          }}
        >
          Create Community
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default NewCommunityDialog;
