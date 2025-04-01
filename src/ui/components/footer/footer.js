import React from "react";
import { Link as RouterLink } from "react-router-dom";
import {
  Box,
  Container,
  Divider,
  IconButton,
  Link,
  Stack,
  Typography,
  useTheme,
} from "@mui/material";
import {
  Facebook as FacebookIcon,
  Twitter as TwitterIcon,
  Instagram as InstagramIcon,
  YouTube as YouTubeIcon,
  Pinterest as PinterestIcon,
  School as SchoolIcon,
} from "@mui/icons-material";

const Footer = () => {
  const theme = useTheme();
  const currentYear = new Date().getFullYear();

  const socialLinks = [
    {
      icon: <FacebookIcon fontSize="small" />,
      url: "https://facebook.com",
      label: "Facebook",
    },
    {
      icon: <TwitterIcon fontSize="small" />,
      url: "https://twitter.com",
      label: "Twitter",
    },
    {
      icon: <InstagramIcon fontSize="small" />,
      url: "https://instagram.com",
      label: "Instagram",
    },
    {
      icon: <YouTubeIcon fontSize="small" />,
      url: "https://youtube.com",
      label: "YouTube",
    },
  ];

  return (
    <Box
      component="footer"
      sx={{
        backgroundColor: theme.palette.primary.main,
        color: "white",
        py: 2,
        mt: "auto",
        flexShrink: 0,
        borderTop: `3px solid ${theme.palette.secondary.main}`,
        width: "100%",
      }}
    >
      <Container maxWidth="lg">
        <Box
          sx={{
            display: "flex",
            flexDirection: { xs: "column", sm: "row" },
            justifyContent: "space-between",
            alignItems: { xs: "center", sm: "flex-start" },
          }}
        >
          {/* Logo and Copyright */}
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: { xs: "center", sm: "flex-start" },
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
              <SchoolIcon
                sx={{
                  fontSize: 20,
                  mr: 1,
                  color: theme.palette.secondary.main,
                }}
              />
              <Typography variant="body1" component="span" fontWeight="bold">
                Spartan Marketplace
              </Typography>
            </Box>
            <Typography variant="caption" sx={{ opacity: 0.8 }}>
              © {currentYear} UNCG Students. All rights reserved.
            </Typography>
          </Box>

          {/* Quick Links - Very Condensed */}
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              mt: { xs: 2, sm: 0 },
            }}
          >
            <Stack
              direction="row"
              spacing={2}
              divider={
                <Divider
                  orientation="vertical"
                  flexItem
                  sx={{ borderColor: "rgba(255, 255, 255, 0.2)" }}
                />
              }
            >
              <Link
                component={RouterLink}
                to="/about"
                color="inherit"
                underline="hover"
                variant="caption"
              >
                About
              </Link>
              <Link
                component={RouterLink}
                to="/terms"
                color="inherit"
                underline="hover"
                variant="caption"
              >
                Terms
              </Link>
              <Link
                component={RouterLink}
                to="/privacy"
                color="inherit"
                underline="hover"
                variant="caption"
              >
                Privacy
              </Link>
              <Link
                component={RouterLink}
                to="/contact"
                color="inherit"
                underline="hover"
                variant="caption"
              >
                Contact
              </Link>
            </Stack>

            {/* Social Icons */}
            <Divider
              orientation="vertical"
              flexItem
              sx={{ mx: 2, borderColor: "rgba(255, 255, 255, 0.2)" }}
            />
            <Box>
              {socialLinks.map((social, index) => (
                <IconButton
                  key={index}
                  component="a"
                  href={social.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={social.label}
                  color="inherit"
                  size="small"
                  sx={{
                    opacity: 0.8,
                    "&:hover": { opacity: 1 },
                    ml: 0.5,
                  }}
                >
                  {social.icon}
                </IconButton>
              ))}
            </Box>
          </Box>
        </Box>
      </Container>
    </Box>
  );
};

export default Footer;
