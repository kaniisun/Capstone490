//App.js
//This is the main component that renders the app

import React from "react";
import "./App.css";
import {
  BrowserRouter,
  Routes,
  Route,
  useLocation,
  Navigate,
} from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import theme from "./theme";
import Header from "./ui/components/header/header";
import Footer from "./ui/components/footer/footer";
import Home from "./ui/components/home/home";
import { Detail } from "./ui/components/detail/detail";
import Products from "./ui/components/products/products";
import { Cart } from "./ui/components/cart/cart";
import SearchResults from "./ui/components/search/SearchResults";
import SignUp from "./ui/components/registration/SignUp";
import Account from "./ui/components/account/account";
import UploadProduct from "./ui/components/uploadproduct/uploadProduct";
import Chatroom from "./ui/components/chatroom/chatroom";
import Editproduct from "./ui/components/editproduct/editproduct";
import Login from "./ui/components/login/Login";
import Favorites from "./ui/components/favorites/Favorites";
import MessageHome from "./ui/components/messageArea/messageHome";
import VerifySuccess from "./ui/components/registration/VerifySuccess";
import ConnectionTester from "./ui/components/common/ConnectionTester";
import ResetPassword from "./ui/components/password/ResetPassword";
import UpdatePassword from "./ui/components/password/UpdatePassword";
import VerifyEmail from "./ui/components/registration/VerifyEmail";
import LandingPage from "./ui/components/home/LandingPage";
import SessionTimeoutModal from "./ui/components/common/SessionTimeoutModal";
import ProtectedRoute from "./ui/components/auth/ProtectedRoute";
import FixVerification from "./ui/components/auth/FixVerification";
import EmailVerificationCheck from "./ui/components/auth/EmailVerificationCheck";
import OrderHistory from "./ui/components/orderhistory/orderhistory";
import Checkout from "./ui/components/checkout/checkout";
import OrderConfirmation from "./ui/components/orderconfirmation/orderconfirmation";

function AppContent() {
  const location = useLocation();
  const { isAuthenticated, isEmailVerified } = useAuth();

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <EmailVerificationCheck location={location}>
          <div>
            <Header />
            <Routes>
              {/* Landing page - redirect to home if authenticated */}
              <Route
                path="/"
                element={
                  isAuthenticated && isEmailVerified ? (
                    <Navigate to="/home" replace />
                  ) : (
                    <LandingPage />
                  )
                }
              />
              <Route
                path="/welcome"
                element={
                  isAuthenticated && isEmailVerified ? (
                    <Navigate to="/home" replace />
                  ) : (
                    <LandingPage />
                  )
                }
              />

              {/* Home route - protected for verified users only */}
              <Route
                path="/home"
                element={
                  <ProtectedRoute>
                    <Home />
                  </ProtectedRoute>
                }
              />

              {/* Other routes */}
              <Route path="/register" element={<SignUp />} />
              <Route path="/verify-success" element={<VerifySuccess />} />
              <Route path="/verify-email" element={<VerifyEmail />} />
              <Route path="/products" element={<Products />} />
              <Route path="/product/:id" element={<Detail />} />
              <Route path="/checkout" element={<Checkout />} />
              <Route
                path="/orderconfirmation"
                element={<OrderConfirmation />}
              />
              <Route path="/search-results" element={<SearchResults />} />
              <Route path="/orderhistory" element={<OrderHistory />} />

              {/* Protected routes */}
              <Route
                path="/cart"
                element={
                  <ProtectedRoute>
                    <Cart />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/favorites"
                element={
                  <ProtectedRoute>
                    <Favorites />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/chatroom"
                element={
                  <ProtectedRoute>
                    <Chatroom />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/account"
                element={
                  <ProtectedRoute>
                    <Account />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/uploadProduct"
                element={
                  <ProtectedRoute>
                    <UploadProduct />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/messaging"
                element={
                  <ProtectedRoute>
                    <MessageHome />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/messaging/:userId"
                element={
                  <ProtectedRoute>
                    <MessageHome />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/editProduct/:productID"
                element={
                  <ProtectedRoute>
                    <Editproduct />
                  </ProtectedRoute>
                }
              />

              {/* Verification fix route */}
              <Route path="/fix-verification" element={<FixVerification />} />

              {/* Auth routes */}
              <Route path="/login" element={<Login />} />
              <Route path="/connection-test" element={<ConnectionTester />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/update-password" element={<UpdatePassword />} />
            </Routes>
            <Footer />
            <SessionTimeoutModal />
          </div>
        </EmailVerificationCheck>
      </AuthProvider>
    </ThemeProvider>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}

export default App;
