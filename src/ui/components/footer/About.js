import React from "react";
import {
  Container,
  Typography,
  Box,
  Divider,
  Paper,
  useTheme,
} from "@mui/material";
import InfoIcon from "@mui/icons-material/Info";
import LightbulbIcon from "@mui/icons-material/Lightbulb";
import FlagIcon from "@mui/icons-material/Flag";

const About = () => {
  const theme = useTheme();

  return (
    <Container maxWidth="md" sx={{ py: 6 }}>
      <Box textAlign="center" mb={5}>
        <InfoIcon sx={{ fontSize: 40, color: theme.palette.secondary.main }} />
        <Typography variant="h3" fontWeight="bold" gutterBottom>
          About Spartan Marketplace
        </Typography>
        <Typography variant="subtitle1" color="text.secondary">
          A student-built platform created for empowering UNCG students to connect, exchange, and thrive.
        </Typography>
      </Box>

      {/* Purpose */}
      <Paper elevation={3} sx={{ p: 4, mb: 4, borderRadius: 3 }}>
        <Box display="flex" alignItems="center" mb={2}>
          <LightbulbIcon sx={{ color: theme.palette.primary.main, mr: 1 }} />
          <Typography variant="h5" fontWeight="medium">
            Our Purpose
          </Typography>
        </Box>
        <Divider sx={{ mb: 2 }} />
        <Typography variant="body1" sx={{ lineHeight: 1.7 }}>
          Most students want to do their best at saving their money because
          they’re usually busy in school and don’t have time to work a job or
          are low on funds. There are also times when students have items they
          no longer need, especially during dorm move-outs. With a marketplace
          built specifically for campus, students can buy, sell, or trade items
          at low cost in a safe, familiar environment.
        </Typography>
      </Paper>

      {/* Goals */}
      <Paper elevation={3} sx={{ p: 4, mb: 4, borderRadius: 3 }}>
        <Box display="flex" alignItems="center" mb={2}>
          <FlagIcon sx={{ color: theme.palette.primary.main, mr: 1 }} />
          <Typography variant="h5" fontWeight="medium">
            Our Goals
          </Typography>
        </Box>
        <Divider sx={{ mb: 2 }} />
        <Typography variant="body1" sx={{ lineHeight: 1.7 }}>
          Students face financial challenges and need a local, trusted way to
          exchange goods. Whether it's textbooks, electronics, or gear from a
          dropped hobby, we offer a safe space to connect with other students.
          <br />
          <br />
          We're also building a zero-waste, eco-conscious student culture. By
          promoting reuse and exchange, we reduce waste while giving items a
          second life. Our verified-student system ensures safety and trust
          across the platform.
        </Typography>
      </Paper>
    </Container>
  );
};

export default About;
