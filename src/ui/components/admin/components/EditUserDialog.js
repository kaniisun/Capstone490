import React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
  Grid,
  Typography,
  Alert,
} from "@mui/material";

const EditUserDialog = ({
  open,
  onClose,
  currentUser,
  editedUser,
  onInputChange,
  onSave,
}) => {
  const isAdmin = currentUser?.role === "admin";

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        Edit User: {currentUser?.firstName} {currentUser?.lastName}
      </DialogTitle>

      <DialogContent>
        {currentUser?.userID && (
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ display: "block", mb: 2 }}
            component="div"
          >
            User ID: {currentUser.userID}
          </Typography>
        )}

        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              margin="dense"
              label="First Name"
              name="firstName"
              value={editedUser.firstName}
              onChange={onInputChange}
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              margin="dense"
              label="Last Name"
              name="lastName"
              value={editedUser.lastName}
              onChange={onInputChange}
            />
          </Grid>

          <Grid item xs={12}>
            <TextField
              fullWidth
              margin="dense"
              label="Email"
              name="email"
              type="email"
              value={editedUser.email}
              onChange={onInputChange}
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <FormControl fullWidth margin="dense">
              <InputLabel id="role-select-label">Role</InputLabel>
              <Select
                labelId="role-select-label"
                name="role"
                value={editedUser.role}
                label="Role"
                onChange={onInputChange}
              >
                <MenuItem value="user">User</MenuItem>
                <MenuItem value="admin">Admin</MenuItem>
              </Select>
              <FormHelperText>
                Admin users have access to the admin dashboard
              </FormHelperText>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={6}>
            <FormControl fullWidth margin="dense">
              <InputLabel id="status-select-label">Account Status</InputLabel>
              <Select
                labelId="status-select-label"
                name="accountStatus"
                value={editedUser.accountStatus}
                label="Account Status"
                onChange={onInputChange}
              >
                <MenuItem value="active">Active</MenuItem>
                <MenuItem value="suspended">Suspended</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>

        <Alert severity="info" sx={{ mt: 2 }}>
          <Typography variant="body2" component="div">
            Changes will be saved immediately to the database when you click
            Save.
          </Typography>
        </Alert>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} color="inherit">
          Cancel
        </Button>
        <Button onClick={onSave} color="primary" variant="contained">
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default EditUserDialog;
