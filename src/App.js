import React from 'react';
import './App.css';
import { Home } from './ui/components/home/home';
import Header from './ui/components/header/header';
import { Detail } from './ui/components/detail/detail';
import { Footer } from './ui/components/footer/footer';
import { Products } from './ui/components/products/products';
import { Cart } from './ui/components/cart/cart';
import { Search } from './ui/components/search/search';



function App() {
  return (
    <div>
      <Header/>
      {/* <Home/> */}
      <Search />
      {/* <Detail /> */}
      {/* <Products /> */}
      {/* <Cart /> */}
      <Footer />
    </div>
  );
}

export default App;
