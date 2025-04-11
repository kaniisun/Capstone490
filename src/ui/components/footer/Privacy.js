import React from "react";
import {
  Container,
  Typography,
  Paper,
  Box,
  Divider,
  useTheme,
} from "@mui/material";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import ContactSupportOutlinedIcon from "@mui/icons-material/ContactSupportOutlined";

const Privacy = () => {
  const theme = useTheme();

  return (
    <Container maxWidth="md" sx={{ py: 6 }}>
      <Box textAlign="center" mb={5}>
        <LockOutlinedIcon sx={{ fontSize: 40, color: theme.palette.primary.main }} />
        <Typography variant="h3" fontWeight="bold" gutterBottom>
          Privacy Policy
        </Typography>
        <Typography variant="subtitle1" color="text.secondary">
          Your privacy and data security are our top priorities.
        </Typography>
      </Box>

      {/* Policy */}
      <Paper elevation={3} sx={{ p: 4, borderRadius: 3 }}>
        <Typography variant="body1" sx={{ lineHeight: 1.7, mb: 2 }}>
          At Spartan Marketplace, we value your privacy. Your personal
          information is used solely for the operation and improvement of the
          platform. We do not sell, rent, or share your data with third
          parties.
          <br />
          <br />
          All communication and personal data are encrypted and stored securely.
          We maintain strict access controls and adhere to industry best
          practices to ensure your data is safe.
        </Typography>

        <Divider sx={{ my: 3 }} />

        {/* Data Request */}
        <Box display="flex" alignItems="center" color="text.secondary">
          <ContactSupportOutlinedIcon sx={{ mr: 1 }} />
          <Typography variant="body2">
            You can contact us at any time to request access to or deletion of
            your data.
          </Typography>
        </Box>
      </Paper>
    </Container>
  );
};

export default Privacy;
