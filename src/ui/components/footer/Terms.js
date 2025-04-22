import React from "react";
import {
  Container,
  Typography,
  Paper,
  Box,
  Divider,
  useTheme,
} from "@mui/material";
import GavelIcon from "@mui/icons-material/Gavel";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";

const Terms = () => {
  const theme = useTheme();

  return (
    <Container maxWidth="md" sx={{ py: 6 }}>
      <Box textAlign="center" mb={5}>
        <GavelIcon sx={{ fontSize: 40, color: theme.palette.secondary.main }} />
        <Typography variant="h3" fontWeight="bold" gutterBottom>
          Terms of Service
        </Typography>
        <Typography variant="subtitle1" color="text.secondary">
          Guidelines for a safe and respectful Spartan Marketplace experience.
        </Typography>
      </Box>

      {/* Terms */}
      <Paper elevation={3} sx={{ p: 4, borderRadius: 3 }}>
        <Typography variant="body1" sx={{ lineHeight: 1.7, mb: 2 }}>
          By using Spartan Marketplace, you agree to follow our community
          standards regarding item listings, transactions, and respectful user
          behavior. All users must be currently enrolled students at UNCG and
          are expected to adhere to university policies while engaging on the
          platform.
          <br />
          <br />
          We reserve the right to suspend or permanently remove any user who
          violates these terms or behaves inappropriately within the
          marketplace.
        </Typography>

        <Divider sx={{ my: 3 }} />

        {/* Update */}
        <Box display="flex" alignItems="center" color="text.secondary">
          <InfoOutlinedIcon sx={{ mr: 1 }} />
          <Typography variant="body2">
            These terms may be updated periodically. Continued use of the
            platform indicates acceptance of any changes.
          </Typography>
        </Box>
      </Paper>
    </Container>
  );
};

export default Terms;
