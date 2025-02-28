import React from 'react';
import './App.css';
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Home } from './ui/components/home/home';
import Header from './ui/components/header/header';
import { Detail } from './ui/components/detail/detail';
import { Footer } from './ui/components/footer/footer';
import { Products } from './ui/components/products/products';
import { Cart } from './ui/components/cart/cart';
import { Search } from './ui/components/search/search';
import  SignUp  from './ui/components/registration/SignUp';  // Add this import at the top with other imports




function App() {
  return (
<<<<<<< HEAD
    <div>
      <Header/>
      <Home/>
      <Search />
      <Detail />
      <Products />
      <Cart />
      <Footer />
    </div>
=======
    <BrowserRouter>
      <div>
        <Header />
        <Routes>
          <Route path="/" element={<><Home/> <Search/></>} />
          <Route path="/register" element={<SignUp />} />
        </Routes>
        {/* <Home/> */}
       
        {/* <Detail /> */}
        {/* <Products /> */}
        {/* <Cart /> */}
        <Footer />
      </div>
    </BrowserRouter>
>>>>>>> 0229e207c3cde5d3096b1d905e774602ee7fb6b7
  );
}

export default App;
