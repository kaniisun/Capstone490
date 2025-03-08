//App.js
//This is the main component that renders the app

import React from "react";
import "./App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Home from "./ui/components/home/home";
import Header from "./ui/components/header/header";
import { Detail } from "./ui/components/detail/detail";
import { Footer } from "./ui/components/footer/footer";
import Products from "./ui/components/products/products";
import { Cart } from "./ui/components/cart/cart";
import Search from "./ui/components/search/search";
import SearchResults from "./ui/components/search/SearchResults";
import SignUp from "./ui/components/registration/SignUp"; // Add this import at the top with other imports
import Account from "./ui/components/account/account";
import UploadProduct from "./ui/components/uploadproduct/uploadProduct";
import Chatroom from "./ui/components/chatroom/chatroom";
import ProductList from "./ui/components/products/ProductList";
import Editproduct from "./ui/components/editproduct/editproduct";
import Login from "./ui/components/login/Login";
import MessageArea from "./ui/components/messageArea/messageArea";
import VerifySuccess from "./ui/components/registration/VerifySuccess"; // Import VerifySuccess component
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import SessionTimeoutModal from "./ui/components/common/SessionTimeoutModal";
import ConnectionTester from "./ui/components/common/ConnectionTester";
import ResetPassword from "./ui/components/password/ResetPassword";
import UpdatePassword from "./ui/components/password/UpdatePassword";

// Protected route component
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    // You could add a loading spinner here
    return <div className="loading-spinner">Loading...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  return children;
};

// Make sure this component is not within the AuthProvider
function AppRoutes() {
  return (
    <div>
      <Header />
      <Routes>
        <Route
          path="/"
          element={
            <>
              {" "}
              <Home />
            </>
          }
        />{" "}
        {/* homepage route */}
        <Route path="/register" element={<SignUp />} /> {/* register route */}
        <Route path="/verify-success" element={<VerifySuccess />} />{" "}
        {/* verification success route */}
        <Route path="/products" element={<Products />} />{" "}
        {/* product display */}
        <Route path="/product/:id" element={<Detail />} />{" "}
        {/* route to product by id */}
        <Route
          path="/cart"
          element={
            <ProtectedRoute>
              <Cart />
            </ProtectedRoute>
          }
        />{" "}
        {/* cart route */}
        <Route
          path="/chatroom"
          element={
            <ProtectedRoute>
              <Chatroom />
            </ProtectedRoute>
          }
        />{" "}
        {/* chatroom route */}
        <Route
          path="/account"
          element={
            <ProtectedRoute>
              <Account />
            </ProtectedRoute>
          }
        />{" "}
        {/* account route */}
        <Route
          path="/uploadProduct"
          element={
            <ProtectedRoute>
              <UploadProduct />
            </ProtectedRoute>
          }
        />{" "}
        {/* upload product route */}
        {/* Route for the home page with the search bar */}
        <Route path="/" element={<Search />} />
        {/* Route for the search results page */}
        <Route path="/search-results" element={<SearchResults />} />
        {/*Route for Messaging*/}
        <Route
          path="/messaging"
          element={
            <ProtectedRoute>
              <MessageArea />
            </ProtectedRoute>
          }
        />
        {/*Route for editproduct*/}
        <Route
          path="/editProduct/:productID"
          element={
            <ProtectedRoute>
              <Editproduct />
            </ProtectedRoute>
          }
        />
        <Route path="/login" element={<Login />} />
        {/* Connection test route for debugging */}
        <Route path="/connection-test" element={<ConnectionTester />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/update-password" element={<UpdatePassword />} />
      </Routes>
      <Footer />
      <SessionTimeoutModal />
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
