import React from "react";
import "./App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./ui/components/home/home";
import Header from "./ui/components/header/header";
import { Detail } from "./ui/components/detail/detail";
import { Footer } from "./ui/components/footer/footer";
import Products from "./ui/components/products/products";
import { Cart } from "./ui/components/cart/cart";
import { Search } from "./ui/components/search/search";
import SignUp from "./ui/components/registration/SignUp"; // Add this import at the top with other imports

function App() {
  return (
    <BrowserRouter>
      <div>
        <Header />
        <Routes>
          <Route path="/" element={<> <Search /> <Home /></>}/> {/* homepage route */}
          <Route path="/register" element={<SignUp />} /> {/* register route */}
          <Route path="/products" element={<Products />} /> {/* product display */}
          <Route path="/product/:id" element={<Detail />} /> {/* route to product by id */}
          <Route path="/cart" element={<Cart />} /> {/* cart route */}
        </Routes>
        <Footer />
      </div>
    </BrowserRouter>
  );
}

export default App;
