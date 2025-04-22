import React from "react";
import {
  Container,
  Typography,
  TextField,
  Button,
  Stack,
  Paper,
  Box,
  Divider,
  useTheme,
} from "@mui/material";
import ContactMailIcon from "@mui/icons-material/ContactMail";

const Contact = () => {
  const theme = useTheme();

  return (
    <Container maxWidth="md" sx={{ py: 6 }}>
      <Box textAlign="center" mb={5}>
        <ContactMailIcon sx={{ fontSize: 50, color: theme.palette.primary.main }} />
        <Typography variant="h3" fontWeight="bold" gutterBottom>
          Contact Us
        </Typography>
        <Typography variant="subtitle1" color="text.secondary">
          We’d love to hear from you! Whether you have a question, suggestion, or just want to say hello.
        </Typography>
      </Box>

      {/* Contact */}
      <Paper elevation={3} sx={{ p: 4, borderRadius: 3 }}>
        <Stack spacing={3}>

          <Typography variant="h6" fontWeight="bold" gutterBottom>
            Get In Touch
          </Typography>

          <TextField
            label="Your Name"
            variant="outlined"
            fullWidth
            sx={{ bgcolor: theme.palette.background.paper }}
            required
          />
          <TextField
            label="Your Email"
            type="email"
            variant="outlined"
            fullWidth
            sx={{ bgcolor: theme.palette.background.paper }}
            required
          />
          <TextField
            label="Your Message"
            variant="outlined"
            fullWidth
            multiline
            rows={4}
            sx={{ bgcolor: theme.palette.background.paper }}
            required
          />

          {/* Send */}
          <Button
            variant="contained"
            color="primary"
            sx={{
              alignSelf: "flex-start",
              paddingX: 3,
              fontWeight: "bold",
              boxShadow: 2,
              "&:hover": {
                boxShadow: 4,
              },
            }}
          >
            Send Message
          </Button>
        </Stack>
      </Paper>

      <Divider sx={{ my: 4 }} />

      {/* Contact Info */}
      <Box textAlign="center" mt={3}>
        <Typography variant="h6" fontWeight="bold" gutterBottom>
          Other Ways to Reach Us
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Email: contact@spartanmarketplace.com
          <br />
          Phone: (123) 456-7890
        </Typography>
      </Box>
    </Container>
  );
};

export default Contact;
