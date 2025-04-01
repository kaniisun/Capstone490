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
  isAdmin: false,
  userRole: null,
  checkEmailVerification: () => {},
  refreshUserData: async () => ({ success: false }),
  updateUserRole: async () => ({ success: false }),
});

// Set timeout for user session (30 minutes)
const SESSION_TIMEOUT = 30 * 60 * 1000;

// Set warning time before session expires (1 minute)
const WARNING_BEFORE_TIMEOUT = 60 * 1000;

// Provider component that wraps the app and makes auth object available to any child component that calls useAuth()
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sessionTimeout, setSessionTimeout] = useState(null);
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userRole, setUserRole] = useState(null);
  const navigate = useNavigate();

  // Function to refresh the session timeout
  const refreshSessionTimeout = () => {
    // Clear the session timeout first if it exists
    if (sessionTimeout) {
      clearTimeout(sessionTimeout);
      setSessionTimeout(null);
    }

    // Reset any warning flags
    localStorage.removeItem("sessionWarningActive");

    // Get the current time and calculate when the session will expire
    const now = new Date();
    const expirationTime = new Date(now.getTime() + SESSION_TIMEOUT);

    // Store the session expiration time
    localStorage.setItem(
      "sessionExpiration",
      expirationTime.getTime().toString()
    );

    // Update the last activity timestamp
    localStorage.setItem("lastActivity", now.getTime().toString());

    // Set a timeout to show the warning modal before the session expires
    const newSessionTimeout = setTimeout(() => {
      localStorage.setItem("sessionWarningActive", "true");

      // Dispatch an event to notify the SessionTimeoutModal
      try {
        window.dispatchEvent(new Event("sessionWarning"));
      } catch (error) {
        console.error(
          "[AuthContext] Error dispatching session warning event:",
          error
        );
      }
    }, SESSION_TIMEOUT - WARNING_BEFORE_TIMEOUT);

    setSessionTimeout(newSessionTimeout);
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

        // Fetch user role/admin status from the database
        if (isVerified && currentUser) {
          try {
            const { data: userData, error: userError } = await supabase
              .from("users")
              .select("role")
              .eq("userID", currentUser.id)
              .single();

            if (userError) {
              console.error("Error fetching user role:", userError);
            } else if (userData) {
              setUserRole(userData.role);
              setIsAdmin(userData.role === "admin");
            }
          } catch (err) {
            console.error("Error checking admin status:", err);
            setUserRole(null);
            setIsAdmin(false);
          }
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
      } else if (isEmailVerified) {
        localStorage.setItem("isEmailVerified", "true");
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

      // Clear localStorage items first
      localStorage.removeItem("userName");
      localStorage.removeItem("userEmail");
      localStorage.removeItem("userId");
      localStorage.removeItem("isLoggedIn");
      localStorage.removeItem("sessionExpiration");
      localStorage.removeItem("isEmailVerified");
      localStorage.removeItem("sessionWarningActive");
      localStorage.removeItem("lastActivity");
      localStorage.removeItem("loggingOut");

      // Update React state
      setUser(null);
      setIsEmailVerified(false);
      setIsAdmin(false);
      setUserRole(null);

      // Sign out with Supabase - don't await this to allow the rest to continue
      supabase.auth.signOut().catch((error) => {
        console.error("Error during Supabase signOut:", error.message);
      });

      // Redirect to login page
      navigate("/login");
    } catch (error) {
      console.error("Error during logout:", error.message);

      // Force clearing localStorage and redirect as a fallback
      localStorage.clear();

      // Use window.location as a fallback if navigation fails
      try {
        navigate("/login");
      } catch (navError) {
        console.error("Navigation failed, using direct redirect");
        window.location.href = "/login";
      }
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
    setIsAdmin(false);
    setUserRole(null);
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

          let roleFromMetadata = null;
          let isAdminFromMetadata = false;

          // Check for role in user metadata
          if (session.user.user_metadata) {
            console.log(
              "Checking user metadata for role:",
              session.user.user_metadata
            );

            if (session.user.user_metadata.role) {
              roleFromMetadata = session.user.user_metadata.role;
              isAdminFromMetadata =
                session.user.user_metadata.isAdmin === true ||
                roleFromMetadata === "admin";

              console.log(
                "Found role in metadata:",
                roleFromMetadata,
                "isAdmin:",
                isAdminFromMetadata
              );

              // Set role from metadata right away for faster UI response
              setUserRole(roleFromMetadata);
              setIsAdmin(isAdminFromMetadata);
            }
          }

          // After login, always verify role against database
          try {
            console.log("Fetching user role from database for verification");
            const { data: dbUserData, error: dbUserError } = await supabase
              .from("users")
              .select("role")
              .eq("userID", session.user.id)
              .single();

            if (dbUserError) {
              console.error(
                "Error fetching user role from database:",
                dbUserError
              );
            } else if (dbUserData && dbUserData.role) {
              // Database has authoritative role information
              const dbRole = dbUserData.role;
              const isDbAdmin = dbRole === "admin";

              console.log("Database role:", dbRole, "isAdmin:", isDbAdmin);

              // Set role from database as the source of truth
              setUserRole(dbRole);
              setIsAdmin(isDbAdmin);

              // If metadata doesn't match database, update metadata
              if (
                roleFromMetadata !== dbRole ||
                isAdminFromMetadata !== isDbAdmin
              ) {
                console.log("Syncing metadata with database role");

                try {
                  await supabase.auth.updateUser({
                    data: {
                      role: dbRole,
                      isAdmin: isDbAdmin,
                    },
                  });
                  console.log("User metadata updated to match database role");
                } catch (err) {
                  console.error("Error updating user metadata:", err);
                }
              }
            }
          } catch (err) {
            console.error("Error syncing roles after login:", err);
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

              // Check for role in user metadata
              if (session.user.user_metadata) {
                console.log(
                  "Checking user metadata for role:",
                  session.user.user_metadata
                );
                if (session.user.user_metadata.role) {
                  const metadataRole = session.user.user_metadata.role;
                  const isMetadataAdmin =
                    session.user.user_metadata.isAdmin === true ||
                    metadataRole === "admin";

                  console.log(
                    "Found role in metadata:",
                    metadataRole,
                    "isAdmin:",
                    isMetadataAdmin
                  );
                  setUserRole(metadataRole);
                  setIsAdmin(isMetadataAdmin);
                }
              }

              // Add a slight delay before refreshing session to ensure everything is set
              setTimeout(() => {
                refreshSessionTimeout();
                setLoading(false);
              }, 300);
            } else if (event === "SIGNED_OUT") {
              setUser(null);
              setIsEmailVerified(false);
              setIsAdmin(false);
              setUserRole(null);
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

              // Check for updated role in metadata
              if (session.user.user_metadata) {
                console.log(
                  "Checking updated user metadata for role:",
                  session.user.user_metadata
                );
                if (session.user.user_metadata.role) {
                  const metadataRole = session.user.user_metadata.role;
                  const isMetadataAdmin =
                    session.user.user_metadata.isAdmin === true ||
                    metadataRole === "admin";

                  console.log(
                    "Found role in updated metadata:",
                    metadataRole,
                    "isAdmin:",
                    isMetadataAdmin
                  );
                  setUserRole(metadataRole);
                  setIsAdmin(isMetadataAdmin);
                }
              }

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

    // Set up the auth listener
    setupAuthListener();

    // Activity events to listen for
    const activityEvents = [
      "mousedown",
      "mousemove",
      "keydown",
      "scroll",
      "touchstart",
      "click",
    ];

    // Function to handle user activity and refresh session if needed
    const handleUserActivity = () => {
      // Only refresh if user is logged in and not on a public route
      if (localStorage.getItem("isLoggedIn") === "true") {
        // Get the last activity time (or use 0 if not set)
        const lastActivity = localStorage.getItem("lastActivity") || "0";
        const now = new Date().getTime();

        // Only refresh if it's been at least 1 minute since the last activity
        if (now - parseInt(lastActivity, 10) > 60000) {
          // Update the last activity timestamp
          localStorage.setItem("lastActivity", now.toString());

          // Refresh the session timeout
          refreshSessionTimeout();
        }
      }
    };

    // Add event listeners for user activity
    activityEvents.forEach((event) => {
      window.addEventListener(event, handleUserActivity, { passive: true });
    });

    // Clean up
    return () => {
      // Clear the session timeout
      if (sessionTimeout) {
        clearTimeout(sessionTimeout);
      }

      // Remove activity event listeners
      activityEvents.forEach((event) => {
        window.removeEventListener(event, handleUserActivity);
      });
    };
  }, [navigate]);

  // Function to refresh the user's session
  const refreshSession = async () => {
    try {
      // Refresh the session timeout first
      refreshSessionTimeout();

      // Attempt to refresh the Supabase token if needed
      const { data, error } = await supabase.auth.refreshSession();

      if (error) {
        console.error("Error refreshing auth session:", error.message);
      } else if (data) {
        // Update user data if needed
        if (data.user) {
          setUser(data.user);
        }
      }

      return { success: true };
    } catch (err) {
      console.error("Error in refreshSession:", err.message);
      return { success: false, error: err.message };
    }
  };

  // Add refreshUserData function to the AuthContext to be called after role changes
  // Return the context value
  const contextValue = {
    user,
    loading,
    logout: handleLogout,
    refreshSession,
    isAuthenticated: !!user,
    isEmailVerified,
    isAdmin,
    userRole,
    checkEmailVerification,
    refreshUserData: async () => {
      // Only proceed if we have a user
      if (!user) return { success: false, error: "No user logged in" };

      try {
        console.log("Refreshing user role data from database");
        // Fetch fresh user role data from the database
        const { data: userData, error: userError } = await supabase
          .from("users")
          .select("role")
          .eq("userID", user.id)
          .single();

        if (userError) {
          console.error("Error refreshing user role:", userError);
          return { success: false, error: userError.message };
        }

        if (userData) {
          // Update the role and admin status in context
          console.log("Updated user role from database:", userData.role);
          setUserRole(userData.role);
          setIsAdmin(userData.role === "admin");

          // Update the user metadata in Supabase auth with the new role
          // This ensures the role persists even after logout/login
          try {
            const { error: metadataError } = await supabase.auth.updateUser({
              data: {
                role: userData.role,
                isAdmin: userData.role === "admin",
              },
            });

            if (metadataError) {
              console.error("Error updating user metadata:", metadataError);
            } else {
              console.log(
                "Successfully updated Supabase user metadata with role:",
                userData.role
              );
            }
          } catch (metadataErr) {
            console.error("Exception updating user metadata:", metadataErr);
          }

          return {
            success: true,
            role: userData.role,
            isAdmin: userData.role === "admin",
          };
        }

        return { success: false, error: "No user data found" };
      } catch (err) {
        console.error("Error in refreshUserData:", err.message);
        return { success: false, error: err.message };
      }
    },
    updateUserRole: async (targetUserId, newRole) => {
      try {
        console.log(`Updating user ${targetUserId} to role: ${newRole}`);

        // First update the users table
        const { data, error } = await supabase
          .from("users")
          .update({
            role: newRole,
            modified_at: new Date().toISOString(),
          })
          .eq("userID", targetUserId);

        if (error) {
          // Try with 'id' column if 'userID' fails
          const { data: retryData, error: retryError } = await supabase
            .from("users")
            .update({
              role: newRole,
              modified_at: new Date().toISOString(),
            })
            .eq("id", targetUserId);

          if (retryError) {
            console.error(
              "Both attempts to update role in database failed:",
              retryError
            );
            return { success: false, error: retryError.message };
          }
        }

        // For the current user, we can directly update their metadata
        if (user && user.id === targetUserId) {
          try {
            const { error: metadataError } = await supabase.auth.updateUser({
              data: {
                role: newRole,
                isAdmin: newRole === "admin",
              },
            });

            if (metadataError) {
              console.error("Error updating user metadata:", metadataError);
            } else {
              console.log(
                "Successfully updated auth metadata for current user"
              );
            }
          } catch (metadataErr) {
            console.error("Error updating metadata:", metadataErr);
          }
        } else {
          console.log(
            "Updated role in database only. User needs to log out and back in for changes to fully apply."
          );
        }

        return {
          success: true,
          message: `User role updated to ${newRole} in the database. User will need to log out and log back in for changes to fully apply.`,
        };
      } catch (err) {
        console.error("Error in updateUserRole:", err);
        return { success: false, error: err.message };
      }
    },
  };

  return (
    <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
  );
}

// Custom hook to use the auth context
export const useAuth = () => {
  return useContext(AuthContext);
};
