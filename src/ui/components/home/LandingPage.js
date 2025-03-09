import React from "react";
import { Link as RouterLink } from "react-router-dom";
import {
  Box,
  Button,
  Card,
  CardContent,
  Container,
  Divider,
  Grid,
  Link,
  Paper,
  Typography,
  useTheme,
} from "@mui/material";
import {
  School,
  Security,
  Payment,
  People,
  Devices,
  CheckCircleOutline,
} from "@mui/icons-material";
import "./LandingPage.css";

/**
 * Public landing page for non-authenticated users
 * Serves as an entry point to the marketplace
 */
function LandingPage() {
  const theme = useTheme();

  // Features section data
  const features = [
    {
      icon: <School fontSize="large" color="primary" />,
      title: "Exclusive to UNCG",
      description:
        "Only verified @uncg.edu email addresses can join our platform",
    },
    {
      icon: <Payment fontSize="large" color="primary" />,
      title: "Buy and Sell Easily",
      description:
        "Find textbooks, dorm essentials, and more at student-friendly prices",
    },
    {
      icon: <People fontSize="large" color="primary" />,
      title: "Community Trust",
      description: "Trade with fellow Spartans you can meet on campus",
    },
    {
      icon: <Security fontSize="large" color="primary" />,
      title: "Secure Transactions",
      description: "Your data and transactions are always protected",
    },
  ];

  // How it works steps data
  const steps = [
    {
      number: 1,
      title: "Sign Up",
      description: "Create an account with your UNCG email",
    },
    {
      number: 2,
      title: "Verify Email",
      description: "Confirm your @uncg.edu email address",
    },
    {
      number: 3,
      title: "Start Trading",
      description: "Browse listings or create your own",
    },
  ];

  return (
    <Box className="mui-landing-page">
      {/* Hero Section */}
      <Paper
        elevation={0}
        sx={{
          backgroundColor: theme.palette.primary.main,
          color: "white",
          borderRadius: 0,
          py: 8,
          position: "relative",
          overflow: "hidden",
        }}
      >
        <Container maxWidth="lg">
          <Box sx={{ textAlign: "center", position: "relative", zIndex: 2 }}>
            <Typography
              variant="h2"
              component="h1"
              gutterBottom
              sx={{
                fontWeight: 700,
                mb: 2,
              }}
            >
              Spartan Marketplace
            </Typography>
            <Typography
              variant="h5"
              sx={{
                mb: 4,
                maxWidth: "800px",
                mx: "auto",
                opacity: 0.9,
              }}
            >
              The trusted marketplace exclusively for UNCG students
            </Typography>
            <Box
              sx={{ mt: 4, display: "flex", gap: 2, justifyContent: "center" }}
            >
              <Button
                component={RouterLink}
                to="/login"
                variant="contained"
                color="secondary"
                size="large"
                sx={{ px: 4, py: 1.5, fontWeight: "bold" }}
              >
                Log In
              </Button>
              <Button
                component={RouterLink}
                to="/register"
                variant="outlined"
                size="large"
                sx={{
                  px: 4,
                  py: 1.5,
                  fontWeight: "bold",
                  color: "white",
                  borderColor: "white",
                  "&:hover": {
                    borderColor: "white",
                    backgroundColor: "rgba(255, 255, 255, 0.1)",
                  },
                }}
              >
                Sign Up
              </Button>
            </Box>
          </Box>
          {/* Background decorative elements */}
          <Box
            sx={{
              position: "absolute",
              top: "-5%",
              right: "-5%",
              width: "500px",
              height: "500px",
              borderRadius: "50%",
              backgroundColor: "rgba(255, 255, 255, 0.05)",
              zIndex: 1,
            }}
          />
          <Box
            sx={{
              position: "absolute",
              bottom: "-10%",
              left: "-5%",
              width: "300px",
              height: "300px",
              borderRadius: "50%",
              backgroundColor: "rgba(255, 255, 255, 0.05)",
              zIndex: 1,
            }}
          />
        </Container>
      </Paper>

      {/* Features Section */}
      <Container maxWidth="lg" sx={{ py: 8 }}>
        <Box sx={{ textAlign: "center", mb: 6 }}>
          <Typography
            variant="h4"
            component="h2"
            gutterBottom
            fontWeight="bold"
          >
            Why Choose Spartan Marketplace?
          </Typography>
          <Typography
            variant="body1"
            color="text.secondary"
            sx={{ maxWidth: "800px", mx: "auto" }}
          >
            Our platform is specially designed for UNCG students, providing a
            safe and efficient way to buy and sell items on campus.
          </Typography>
        </Box>

        <Grid container spacing={4}>
          {features.map((feature, index) => (
            <Grid item xs={12} sm={6} md={3} key={index}>
              <Card
                elevation={2}
                sx={{
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                  transition: "transform 0.3s ease",
                  "&:hover": {
                    transform: "translateY(-8px)",
                  },
                }}
              >
                <CardContent sx={{ textAlign: "center", flexGrow: 1 }}>
                  <Box sx={{ mb: 2 }}>{feature.icon}</Box>
                  <Typography variant="h6" component="h3" gutterBottom>
                    {feature.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {feature.description}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Container>

      <Divider />

      {/* How It Works Section */}
      <Box sx={{ backgroundColor: "rgba(0, 0, 0, 0.02)", py: 8 }}>
        <Container maxWidth="lg">
          <Box sx={{ textAlign: "center", mb: 6 }}>
            <Typography
              variant="h4"
              component="h2"
              gutterBottom
              fontWeight="bold"
            >
              How It Works
            </Typography>
            <Typography
              variant="body1"
              color="text.secondary"
              sx={{ maxWidth: "800px", mx: "auto" }}
            >
              Getting started with Spartan Marketplace is quick and easy
            </Typography>
          </Box>

          <Grid container spacing={4} alignItems="center">
            {steps.map((step, index) => (
              <Grid item xs={12} md={4} key={index}>
                <Box sx={{ textAlign: "center" }}>
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: "60px",
                      height: "60px",
                      borderRadius: "50%",
                      backgroundColor: theme.palette.primary.main,
                      color: "white",
                      margin: "0 auto 16px",
                      fontSize: "24px",
                      fontWeight: "bold",
                    }}
                  >
                    {step.number}
                  </Box>
                  <Typography variant="h5" component="h3" gutterBottom>
                    {step.title}
                  </Typography>
                  <Typography variant="body1" color="text.secondary">
                    {step.description}
                  </Typography>
                </Box>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* Benefits Section */}
      <Container maxWidth="lg" sx={{ py: 8 }}>
        <Grid container spacing={6} alignItems="center">
          <Grid item xs={12} md={6}>
            <Typography
              variant="h4"
              component="h2"
              gutterBottom
              fontWeight="bold"
            >
              Built for UNCG Students
            </Typography>
            <Typography variant="body1" paragraph>
              Spartan Marketplace is the official trading platform for UNCG
              students, designed to make buying and selling items on campus safe
              and convenient.
            </Typography>

            {/* Benefits list */}
            {[
              "Buy and sell textbooks, electronics, furniture and more",
              "Connect with fellow Spartans on campus",
              "Verified student-only marketplace",
              "AI-powered marketplace assistant to help you find what you need",
            ].map((benefit, index) => (
              <Box
                key={index}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  mb: 1.5,
                }}
              >
                <CheckCircleOutline
                  fontSize="small"
                  color="primary"
                  sx={{ mr: 1 }}
                />
                <Typography variant="body1">{benefit}</Typography>
              </Box>
            ))}

            <Button
              component={RouterLink}
              to="/register"
              variant="contained"
              color="primary"
              size="large"
              sx={{ mt: 3, fontWeight: "bold" }}
            >
              Join Now
            </Button>
          </Grid>
          <Grid item xs={12} md={6}>
            <Box
              sx={{
                textAlign: "center",
                p: 2,
              }}
            >
              <Devices
                sx={{
                  fontSize: 280,
                  color: "rgba(0, 0, 0, 0.1)",
                  mb: 2,
                }}
              />
            </Box>
          </Grid>

          {/* Copyright notice moved here from footer */}
          <Grid item xs={12} sx={{ textAlign: "center", mt: 4, opacity: 0.7 }}>
            <Typography variant="body2" color="text.secondary">
              © {new Date().getFullYear()} Spartan Marketplace - Developed for
              UNCG Students
            </Typography>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
}

export default LandingPage;
