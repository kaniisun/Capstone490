// import React, { useState } from "react";
// import "./account.css";
// // import { Link } from "react-router-dom";

// const Account = () => {
//     const [user, setUser] = useState({
//         firstName: "John",
//         lastName: "Doe",
//         email: "johndoe@example.com",
//     });

//     const [products, setProducts] = useState([
//         {
//             id: 1,
//             name: "Product 1",
//             description: "This is a description for product 1.",
//             price: "$19.99",
//             imageUrl: "https://via.placeholder.com/150",
//         },
//         {
//             id: 2,
//             name: "Product 2",
//             description: "This is a description for product 2.",
//             price: "$29.99",
//             imageUrl: "https://via.placeholder.com/150",
//         },
//     ]);

//     const handleInputChange = (e) => {
//         const { name, value } = e.target;
//         setUser({ ...user, [name]: value });
//     };

//     const handleSubmit = (e) => {
//         e.preventDefault();
//         alert("Account details updated!");
//     };

//     const handleDelete = (id) => {
//         const updatedProducts = products.filter(product => product.id !== id);
//         setProducts(updatedProducts);
//     };

//     const handleEdit = (id) => {
//         const updatedProducts = products.map(product => {
//             if (product.id === id) {
//                 // Edit logic here, for now we change the name and price as an example
//                 return {
//                     ...product,
//                     name: prompt("Edit Product Name:", product.name),
//                     price: prompt("Edit Product Price:", product.price),
//                 };
//             }
//             return product;
//         });
//         setProducts(updatedProducts);
//     };

//     return (
//         <div className="account-container">
//             <h2>Account Settings</h2>
//             <form onSubmit={handleSubmit}>
//                 <input
//                     type="text"
//                     name="firstName"
//                     value={user.firstName}
//                     onChange={handleInputChange}
//                     placeholder="First Name"
//                 />
//                 <input
//                     type="text"
//                     name="lastName"
//                     value={user.lastName}
//                     onChange={handleInputChange}
//                     placeholder="Last Name"
//                 />
//                 <input
//                     type="email"
//                     name="email"
//                     value={user.email}
//                     readOnly
//                     placeholder="Email"
//                 />
//                 <button type="submit">Update Account</button>
//             </form>

//             <div className="buttons-container">
//                 {/* <Link to="/uploaded-products" className="link-button">View Uploaded Products</Link> */}
//                 <button className="add-more-button">Add More Item</button>
//             </div>

//             <div className="products-container">
//                 <h3>Your Products</h3>
//                 <div className="product-list">
//                     {products.map((product) => (
//                         <div key={product.id} className="product-card">
//                             <img src={product.imageUrl} alt={product.name} />
//                             <h4>{product.name}</h4>
//                             <p>{product.description}</p>
//                             <p className="price">{product.price}</p>
//                             <div className="product-actions">
//                                 <button className="edit-button" onClick={() => handleEdit(product.id)}>Edit</button>
//                                 <button className="delete-button" onClick={() => handleDelete(product.id)}>Delete</button>
//                             </div>
//                         </div>
//                     ))}
//                 </div>
//             </div>
//         </div>
//     );
// };

// export default Account;

import React, { useState } from "react";
import { Link } from "react-router-dom";
import "./account.css";


const Account = () => {
    const [user, setUser] = useState({
        firstName: "John",
        lastName: "Doe",
        email: "johndoe@example.com",
    });

    const [products, setProducts] = useState([
        {
            name: "Wooden Chair",
            description: "Comfortable wooden chair",
            condition: "new",
            category: "furniture",
            price: "99.99",
            image: "https://via.placeholder.com/150",
        },
        {
            name: "Used Laptop",
            description: "A used laptop in good condition",
            condition: "used",
            category: "electronics",
            price: "299.99",
            image: "https://via.placeholder.com/150",
        },
    ]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setUser({ ...user, [name]: value });
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        alert("Account details updated!");
    };

    const handleDeleteProduct = (index) => {
        const updatedProducts = products.filter((_, i) => i !== index);
        setProducts(updatedProducts);
    };

    const handleEditProduct = (index) => {
        // Handle product editing logic here (e.g., open a modal or update state)
        alert(`Editing product: ${products[index].name}`);
    };

    return (
        <div className="account-container">
            <h2>Account Settings</h2>
            <form onSubmit={handleSubmit}>
                <input
                    type="text"
                    name="firstName"
                    value={user.firstName}
                    onChange={handleInputChange}
                    placeholder="First Name"
                />
                <input
                    type="text"
                    name="lastName"
                    value={user.lastName}
                    onChange={handleInputChange}
                    placeholder="Last Name"
                />
                <input
                    type="email"
                    name="email"
                    value={user.email}
                    onChange={handleInputChange}
                    placeholder="Email"
                    disabled
                />
                <button type="submit">Update Account</button>
            </form>

            {/* <div className="buttons-container">
                <button className="add-more-button">Add More Item</button>
            </div> */}

            <div className="buttons-container">
                <Link to="/uploadProduct" className="add-more-button">
                    Add More Item
                </Link>
            </div>


            <h3>Your Products</h3>
            <div className="product-list">
                {products.map((product, index) => (
                    <div key={index} className="product-item">
                        <img src={product.image} alt={product.name} className="product-image" />
                        <div className="product-info">
                            <h4>{product.name}</h4>
                            <p>{product.description}</p>
                            <p><strong>Condition:</strong> {product.condition}</p>
                            <p><strong>Category:</strong> {product.category}</p>
                            <p><strong>Price:</strong> ${product.price}</p>
                            <div className="product-actions">
                                <button onClick={() => handleEditProduct(index)}>Edit</button>
                                <button onClick={() => handleDeleteProduct(index)}>Delete</button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default Account;

