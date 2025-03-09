import React from "react";
import { Routes, Route } from "react-router-dom";
import Header from "../header/header";
import Footer from "../footer/footer";
import Home from "../home/home";
import { Detail } from "../detail/detail";
import Products from "../products/products";
import { Cart } from "../cart/cart";
import SearchResults from "../search/SearchResults";
import SignUp from "../registration/SignUp";
import Account from "../account/account";
import UploadProduct from "../uploadproduct/uploadProduct";
import Chatroom from "../chatroom/chatroom";
import Editproduct from "../editproduct/editproduct";
import Login from "../login/Login";
import MessageArea from "../messageArea/messageArea";
import VerifySuccess from "../registration/VerifySuccess";
import ConnectionTester from "../common/ConnectionTester";
import ResetPassword from "../password/ResetPassword";
import UpdatePassword from "../password/UpdatePassword";
import VerifyEmail from "../registration/VerifyEmail";
import LandingPage from "../home/LandingPage";
import SessionTimeoutModal from "../common/SessionTimeoutModal";
import ProtectedRoute from "../auth/ProtectedRoute";
import FixVerification from "../auth/FixVerification";

function AppRoutes() {
  return (
    <div>
      <Header />
      <Routes>
        {/* Landing page for everyone - accessible at root and /welcome */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/welcome" element={<LandingPage />} />

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
        <Route path="/search-results" element={<SearchResults />} />

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
              <MessageArea />
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

        {/* Add this new route */}
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
  );
}

export default AppRoutes;
