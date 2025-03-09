import { createTheme } from "@mui/material/styles";

// UNCG colors based on their branding
// Primary: Blue and Gold
const theme = createTheme({
  palette: {
    primary: {
      // UNCG Blue
      main: "#0f2044",
      light: "#3e4a6c",
      dark: "#00001f",
      contrastText: "#ffffff",
    },
    secondary: {
      // UNCG Gold
      main: "#ffc72c",
      light: "#fff55f",
      dark: "#c79700",
      contrastText: "#000000",
    },
    background: {
      default: "#f8f9fa",
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontWeight: 700,
    },
    h2: {
      fontWeight: 700,
    },
    h3: {
      fontWeight: 600,
    },
    h4: {
      fontWeight: 600,
    },
    button: {
      fontWeight: 600,
      textTransform: "none",
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          padding: "10px 16px",
        },
        contained: {
          boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
          "&:hover": {
            boxShadow: "0 6px 10px rgba(0, 0, 0, 0.15)",
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          overflow: "hidden",
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        rounded: {
          borderRadius: 12,
        },
      },
    },
  },
});

export default theme;
