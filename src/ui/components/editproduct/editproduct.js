import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "./editproduct.css";

const Editproduct = () => {
    const location = useLocation();
    const navigate = useNavigate();

    const existingProduct = location.state?.product || {
        id: "",
        name: "",
        description: "",
        condition: "new",
        category: "furniture",
        price: "",
        image: null,
    };

    const [product, setProduct] = useState(existingProduct);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setProduct({ ...product, [name]: value });
    };

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        setProduct({ ...product, image: file });
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        // Logic to update product in the backend
        console.log("Updated product", product);

        // Redirect back to the products list page or wherever needed
        navigate("/products");
    };

    return (
        <div className="edit-product-container">
            <p className="product-id">Product ID: <span>{product.id}</span></p>
            <h2>Edit Product</h2>
            <form onSubmit={handleSubmit}>
                <input
                    type="text"
                    name="name"
                    value={product.name}
                    onChange={handleInputChange}
                    placeholder="Product Name"
                    required
                />
                <textarea
                    name="description"
                    value={product.description}
                    onChange={handleInputChange}
                    placeholder="Product Description"
                    required
                />
                <select
                    name="condition"
                    value={product.condition}
                    onChange={handleInputChange}
                    required
                >
                    <option value="new">New</option>
                    <option value="used">Used</option>
                </select>
                <select
                    name="category"
                    value={product.category}
                    onChange={handleInputChange}
                    required
                >
                    <option value="furniture">Furniture</option>
                    <option value="electronics">Electronics</option>
                    <option value="clothing">Clothing</option>
                    {/* Add more categories if needed */}
                </select>
                <input
                    type="number"
                    name="price"
                    value={product.price}
                    onChange={handleInputChange}
                    placeholder="Price"
                    required
                />
                <input
                    type="file"
                    name="image"
                    onChange={handleImageChange}
                    accept="image/*"
                />
                <button type="submit">Save Changes</button>
            </form>
        </div>
    );
};

export default Editproduct;
