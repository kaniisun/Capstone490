import React from "react";
import { Routes, Route } from "react-router-dom";
import Header from "../header/header";
import Footer from "../footer/footer";
import Home from "../home/home";
import { Detail } from "../detail/detail";
import Products from "../products/products";
import SearchResults from "../search/SearchResults";
import SignUp from "../registration/SignUp";
import Account from "../account/account";
import UploadProduct from "../uploadproduct/uploadProduct";
import Editproduct from "../editproduct/editproduct";
import Login from "../login/Login";
import MessageHome from "../messageArea/messageHome";
import VerifySuccess from "../registration/VerifySuccess";
import ConnectionTester from "../common/ConnectionTester";
import ResetPassword from "../password/ResetPassword";
import UpdatePassword from "../password/UpdatePassword";
import VerifyEmail from "../registration/VerifyEmail";
import LandingPage from "../home/LandingPage";
import ProtectedRoute from "../auth/ProtectedRoute";
import AdminRoute from "../auth/AdminRoute";
import FixVerification from "../auth/FixVerification";
import Favorites from "../favorites/Favorites";
import AdminDashboard from "../admin/AdminDashboard";
import AdminSetup from "../admin/AdminSetup";

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
          path="/favorites"
          element={
            <ProtectedRoute>
              <Favorites />
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
          path="/messages/:userId"
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

        {/* Admin routes */}
        <Route
          path="/admin"
          element={
            <AdminRoute>
              <AdminDashboard />
            </AdminRoute>
          }
        />

        {/* Admin setup route - requires authentication but not admin status */}
        <Route
          path="/admin-setup"
          element={
            <ProtectedRoute>
              <AdminSetup />
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
    </div>
  );
}

export default AppRoutes;
