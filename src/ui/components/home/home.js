import React from 'react';
import './home.css';

export const Home = () => {
    // const [name, setName] = useState()

    // const handleNameInput = (value)=> {
    // setName(value)
    // }

    return (
        <div>
            <section id="featured-products">
                <h2>Featured Products</h2>
                <div className="product-list" id="productList">
                    <div className="product">
                        <img src="physics1.jpg" alt="Product 1" />
                        <h3>Product 1</h3>
                        <p>$10.00</p>
                    </div>
                    <div className="product">
                        <img src="lamp.jpg" alt="Product 2" />
                        <h3>Product 2</h3>
                        <p>$15.00</p>
                    </div>
                    <div className="product">
                        <img src="purse.jpg" alt="Product 3" />
                        <h3>Product 3</h3>
                        <p>$20.00</p>
                    </div>
                    <div className="product">
                        <img src="shoes.jpg" alt="Product 4" />
                        <h3>Product 4</h3>
                        <p>$25.00</p>
                    </div>
                    <div className="product">
                        <img src="sofa.jpg" alt="Product 5" />
                        <h3>Product 5</h3>
                        <p>$30.00</p>
                    </div>
                    <div className="product">
                        <img src="table.jpg" alt="Product 6" />
                        <h3>Product 6</h3>
                        <p>$35.00</p>
                    </div>
                    <div className="product">
                        <img src="tsirt.jpg" alt="Product 6" />
                        <h3>Product 6</h3>
                        <p>$35.00</p>
                    </div>
                    <div className="product">
                        <img src="purse.jpg" alt="Product 6" />
                        <h3>Product 6</h3>
                        <p>$35.00</p>
                    </div>
                </div>
            </section>

        </div>)
}
