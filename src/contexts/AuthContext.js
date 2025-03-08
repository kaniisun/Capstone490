import React, { createContext, useState, useEffect, useContext } from "react";
import { supabase } from "../supabaseClient";
import { useNavigate } from "react-router-dom";

// Create the authentication context with default values
const AuthContext = createContext({
  user: null,
  loading: true,
  logout: () => {},
  refreshSession: () => {},
  isAuthenticated: false,
});

// Session timeout duration in milliseconds (30 minutes by default)
const SESSION_TIMEOUT = 30 * 60 * 1000;

// Provider component that wraps the app and makes auth object available to any child component that calls useAuth()
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sessionTimeout, setSessionTimeout] = useState(null);
  const navigate = useNavigate();

  // Function to refresh the session timeout
  const refreshSessionTimeout = () => {
    // Clear any existing timeout
    if (sessionTimeout) {
      clearTimeout(sessionTimeout);
    }

    // Set a new timeout for automatic logout
    const timeoutId = setTimeout(() => {
      handleLogout();
    }, SESSION_TIMEOUT);

    setSessionTimeout(timeoutId);

    // Store the expiration time in localStorage (convert to string)
    const expirationTime = new Date().getTime() + SESSION_TIMEOUT;
    localStorage.setItem("sessionExpiration", expirationTime.toString());
  };

  // Function to handle user logout
  const handleLogout = async () => {
    try {
      // Clear the session timeout
      if (sessionTimeout) {
        clearTimeout(sessionTimeout);
        setSessionTimeout(null);
      }

      // Clear localStorage items
      localStorage.removeItem("userName");
      localStorage.removeItem("userEmail");
      localStorage.removeItem("userId");
      localStorage.removeItem("isLoggedIn");
      localStorage.removeItem("sessionExpiration");

      // Sign out with Supabase
      await supabase.auth.signOut();
      setUser(null);

      // Redirect to login page
      navigate("/login");
    } catch (error) {
      console.error("Error logging out:", error.message);
    }
  };

  // Function to clear any invalid sessions
  const clearInvalidSession = () => {
    localStorage.removeItem("userName");
    localStorage.removeItem("userEmail");
    localStorage.removeItem("userId");
    localStorage.removeItem("isLoggedIn");
    localStorage.removeItem("sessionExpiration");
    setUser(null);
  };

  useEffect(() => {
    // Function to set up the auth state listener
    const setupAuthListener = async () => {
      try {
        setLoading(true);

        // Get the current session
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        // Check if we have both localStorage login state and valid Supabase session
        const isLoggedInLocalStorage =
          localStorage.getItem("isLoggedIn") === "true";
        const hasValidSupabaseSession = !!session?.user;

        // If localStorage says we're logged in but Supabase disagrees, clear the localStorage
        if (isLoggedInLocalStorage && !hasValidSupabaseSession) {
          console.log("Detected invalid session state, clearing local storage");
          clearInvalidSession();
          setLoading(false);
          return;
        }

        // Set the user if there's an active session
        if (session?.user) {
          setUser(session.user);

          // Verify user data exists in users table
          const { data: userData, error: userDataError } = await supabase
            .from("users")
            .select("*")
            .eq("userID", session.user.id)
            .single();

          if (userDataError || !userData) {
            console.log("User data not found in database, logging out");
            handleLogout();
            setLoading(false);
            return;
          }

          // Check if there's a stored expiration time
          const storedExpiration = localStorage.getItem("sessionExpiration");

          if (storedExpiration) {
            const expirationTime = parseInt(storedExpiration, 10);
            const currentTime = new Date().getTime();

            if (currentTime > expirationTime) {
              // Session has expired
              handleLogout();
            } else {
              // Session is still valid, set a new timeout for the remaining time
              const remainingTime = expirationTime - currentTime;
              const timeoutId = setTimeout(() => {
                handleLogout();
              }, remainingTime);

              setSessionTimeout(timeoutId);
            }
          } else {
            // No expiration time found, set a new one
            refreshSessionTimeout();
          }
        } else {
          // Make sure localStorage is cleared if there's no Supabase session
          clearInvalidSession();
        }

        // Set up the auth state change listener
        const { data: authListener } = supabase.auth.onAuthStateChange(
          (event, session) => {
            if (event === "SIGNED_IN" && session?.user) {
              setUser(session.user);
              refreshSessionTimeout();
            } else if (event === "SIGNED_OUT") {
              setUser(null);
              if (sessionTimeout) {
                clearTimeout(sessionTimeout);
                setSessionTimeout(null);
              }
            }
          }
        );

        setLoading(false);

        // Clean up the listener on unmount
        return () => {
          authListener.subscription?.unsubscribe();
          if (sessionTimeout) {
            clearTimeout(sessionTimeout);
          }
        };
      } catch (error) {
        console.error("Auth setup error:", error.message);
        clearInvalidSession();
        setLoading(false);
      }
    };

    setupAuthListener();
  }, [navigate]);

  // Set up event listeners to refresh session on user activity
  useEffect(() => {
    if (user) {
      // List of events to listen for
      const events = ["mousedown", "keydown", "touchstart", "scroll"];

      // Handler function to refresh the session timeout
      const activityHandler = () => {
        refreshSessionTimeout();
      };

      // Add event listeners
      events.forEach((event) => {
        window.addEventListener(event, activityHandler);
      });

      // Clean up event listeners on unmount
      return () => {
        events.forEach((event) => {
          window.removeEventListener(event, activityHandler);
        });
      };
    }
  }, [user, sessionTimeout]);

  // Expose the auth context to components
  const value = {
    user,
    loading,
    logout: handleLogout,
    refreshSession: refreshSessionTimeout,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Custom hook to use the auth context
export const useAuth = () => {
  return useContext(AuthContext);
};
