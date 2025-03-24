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
  isEmailVerified: false,
  checkEmailVerification: () => {},
});

// Session timeout duration in milliseconds (30 minutes by default)
const SESSION_TIMEOUT = 30 * 60 * 1000;

// Provider component that wraps the app and makes auth object available to any child component that calls useAuth()
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sessionTimeout, setSessionTimeout] = useState(null);
  const [isEmailVerified, setIsEmailVerified] = useState(false);
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

  // Add this function to determine if the current path is a public route
  const isPublicRoute = () => {
    const publicRoutes = [
      "/login",
      "/register",
      "/forgot-password",
      "/reset-password",
      "/verify-email",
      "/",
      "/welcome",
    ];
    const currentPath = window.location.pathname;

    // Check if the current path is in the list of public routes
    return publicRoutes.some(
      (route) => currentPath === route || currentPath === route + "/"
    );
  };

  // Function to check if the user's email is verified and set up their session
  const checkEmailVerification = async () => {
    try {
      // Add rate limiting for verification checks - only check once per minute
      const lastVerificationCheck = localStorage.getItem(
        "lastVerificationCheck"
      );
      const now = new Date().getTime();

      if (
        lastVerificationCheck &&
        now - parseInt(lastVerificationCheck, 10) < 60000
      ) {
        console.log("Skipping verification check - checked recently");
        // Return the cached verification status instead of making API calls
        return localStorage.getItem("isEmailVerified") === "true";
      }

      // Update last check timestamp
      localStorage.setItem("lastVerificationCheck", now.toString());

      // First get the current session
      const {
        data: { session },
      } = await supabase.auth.getSession();

      // If there's no session, try to restore from localStorage
      if (!session) {
        console.log("No active session, trying to restore from localStorage");
        const userId = localStorage.getItem("userId");
        const userEmail = localStorage.getItem("userEmail");

        if (userId && userEmail) {
          console.log("Found stored user data, checking if valid");
          // Check if there's a valid user with this ID and email
          const { data: userData } = await supabase
            .from("users")
            .select("*")
            .eq("userID", userId)
            .eq("email", userEmail)
            .single();

          if (userData) {
            console.log("Found valid user in database, attempting to sign in");
            // We found a user, but we need them to sign in again
            return false;
          }
        }

        setIsEmailVerified(false);
        return false;
      }

      const currentUser = session.user;

      // Set the user in state
      setUser(currentUser);

      // Supabase stores email verification status in email_confirmed_at
      const isVerified = !!currentUser.email_confirmed_at;
      setIsEmailVerified(isVerified);

      if (isVerified) {
        // Store verification status in localStorage for quick access
        localStorage.setItem("isEmailVerified", "true");

        // Only update Supabase's internal status if it hasn't been updated recently
        const lastVerificationUpdate = localStorage.getItem(
          "lastVerificationUpdate"
        );
        const shouldUpdateVerification =
          !lastVerificationUpdate ||
          now - parseInt(lastVerificationUpdate, 10) > 3600000; // 1 hour

        if (shouldUpdateVerification) {
          try {
            // Call the updateUser method to ensure Supabase knows this user is verified
            // This helps sync the dashboard status
            const { error: updateError } = await supabase.auth.updateUser({
              data: {
                email_verified: true,
                email_confirmed_at: new Date().toISOString(),
              },
            });

            if (updateError) {
              console.error(
                "Error updating user verification status:",
                updateError
              );
            } else {
              // Only update timestamp if successful
              localStorage.setItem("lastVerificationUpdate", now.toString());
            }
          } catch (err) {
            console.error("Error in verification status update:", err);
          }
        }

        // Ensure user info is in localStorage
        localStorage.setItem("userEmail", currentUser.email);
        localStorage.setItem("userId", currentUser.id);
        localStorage.setItem("isLoggedIn", "true");

        // Check if we need to save user data or update account status
        try {
          // Try to get user metadata for name
          const firstName = currentUser.user_metadata?.firstName || "";
          const lastName = currentUser.user_metadata?.lastName || "";

          // Store name in localStorage
          if (firstName) {
            localStorage.setItem("userName", firstName);
          }

          // Check if user data exists in database and update account status if needed
          const { data: userData, error: userDataError } = await supabase
            .from("users")
            .select("*")
            .eq("userID", currentUser.id)
            .single();

          // If user doesn't exist in database, create them with active status
          if (userDataError && userDataError.code === "PGRST116") {
            const { error: insertError } = await supabase.from("users").insert({
              userID: currentUser.id,
              email: currentUser.email,
              firstName: firstName,
              lastName: lastName,
              created_at: new Date().toISOString(),
              accountStatus: "active", // Set as active since email is verified
            });

            if (insertError) {
              console.error("Error creating user data:", insertError);
            }
          }
          // If user exists but is not active, update to active
          else if (userData && userData.accountStatus !== "active") {
            const { error: updateError } = await supabase
              .from("users")
              .update({ accountStatus: "active" })
              .eq("userID", currentUser.id);

            if (updateError) {
              console.error("Error updating account status:", updateError);
            }
          }
        } catch (err) {
          console.error("Error saving user data during verification:", err);
        }
      } else {
        localStorage.setItem("isEmailVerified", "false");
      }

      // Make sure session timeout is refreshed
      refreshSessionTimeout();

      return isVerified;
    } catch (error) {
      console.error("Error checking email verification:", error);
      return false;
    }
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
      localStorage.removeItem("isEmailVerified");

      // Sign out with Supabase
      await supabase.auth.signOut();
      setUser(null);
      setIsEmailVerified(false);

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
    localStorage.removeItem("isEmailVerified");
    setUser(null);
    setIsEmailVerified(false);
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

          // Check email verification status
          const isVerified = !!session.user.email_confirmed_at;
          setIsEmailVerified(isVerified);
          localStorage.setItem("isEmailVerified", isVerified.toString());

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
          async (event, session) => {
            console.log("Auth state change event:", event);

            if (event === "SIGNED_IN" && session?.user) {
              setUser(session.user);

              // Check email verification status on sign in
              const isVerified = !!session.user.email_confirmed_at;
              setIsEmailVerified(isVerified);
              localStorage.setItem("isEmailVerified", isVerified.toString());

              // Add a slight delay before refreshing session to ensure everything is set
              setTimeout(() => {
                refreshSessionTimeout();
                setLoading(false);
              }, 300);
            } else if (event === "SIGNED_OUT") {
              setUser(null);
              setIsEmailVerified(false);
              localStorage.removeItem("isEmailVerified");

              if (sessionTimeout) {
                clearTimeout(sessionTimeout);
                setSessionTimeout(null);
              }
              setLoading(false);
            } else if (event === "USER_UPDATED") {
              // Update user and check verification status when user is updated
              // (this happens after email verification)
              setUser(session.user);
              const isVerified = !!session.user.email_confirmed_at;
              setIsEmailVerified(isVerified);
              localStorage.setItem("isEmailVerified", isVerified.toString());
              setLoading(false);
            } else {
              setLoading(false);
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

      // Add debounce to prevent too many calls
      let debounceTimer = null;
      const DEBOUNCE_DELAY = 2000; // 2 seconds

      // Handler function to refresh the session timeout with debounce
      const activityHandler = () => {
        // Don't refresh session on public routes
        if (isPublicRoute()) {
          return;
        }

        // Clear any existing timer
        if (debounceTimer) {
          clearTimeout(debounceTimer);
        }

        // Set a new timer to call refreshSessionTimeout after delay
        debounceTimer = setTimeout(() => {
          refreshSessionTimeout();
        }, DEBOUNCE_DELAY);
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

        // Clear any pending timers
        if (debounceTimer) {
          clearTimeout(debounceTimer);
        }
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
    isEmailVerified,
    checkEmailVerification,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Custom hook to use the auth context
export const useAuth = () => {
  return useContext(AuthContext);
};
