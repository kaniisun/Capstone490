import React from "react";
import "./App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
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
import MessagePage from "./ui/components/messageArea/messagePage";
import Editproduct from "./ui/components/editproduct/editproduct";
import Login from "./ui/components/login/Login";


function App() {
  return (
    <BrowserRouter>
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
          <Route path="/products" element={<Products />} />{" "}
          {/* product display */}
          <Route path="/product/:id" element={<Detail />} />{" "}
          {/* route to product by id */}
          <Route path="/cart" element={<Cart />} /> {/* cart route */}
          <Route path="/chatroom" element={<Chatroom />} />{" "}
          {/* chatroom route */}
          <Route path="/account" element={<Account />} /> {/* account route */}
          <Route path="/uploadProduct" element={<UploadProduct />} />{" "}
          {/* account route */}
          {/* Route for the home page with the search bar */}
          <Route path="/" element={<Search />} />
          {/* Route for the search results page */}
          <Route path="/search-results" element={<SearchResults />} />
          {/*Route for Messaging*/}

          <Route path="/editProduct/:index" element={<Editproduct />} />
          {/*Route for editproduct*/}
          <Route path="/login" element={<Login />} />
        </Routes>
        <Footer />
      </div>
    </BrowserRouter>
  );
}

export default App;
