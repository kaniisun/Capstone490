import React, { useState } from "react";
import "./uploadProduct.css";

const UploadProduct = () => {
    const [product, setProduct] = useState({
        name: "",
        description: "",
        condition: "new", // default value
        category: "furniture", // default category
        price: "",
        image: null,
    });

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setProduct({ ...product, [name]: value });
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        setProduct({ ...product, image: file });
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        alert("Product uploaded successfully!");
        console.log(product); // You can process the product data further here (e.g., save it to a database).
    };

    return (
        <div className="upload-product-container">
            <h2>Upload Product</h2>
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
                <div className="dropdown-container">
                    <label>Condition:</label>
                    <select
                        name="condition"
                        value={product.condition}
                        onChange={handleInputChange}
                        required
                    >
                        <option value="new">New</option>
                        <option value="like-new">Like New</option>
                        <option value="used">Used</option>
                    </select>
                </div>
                <div className="dropdown-container">
                    <label>Category:</label>
                    <select
                        name="category"
                        value={product.category}
                        onChange={handleInputChange}
                        required
                    >
                        <option value="furniture">Furniture</option>
                        <option value="personal">Personal</option>
                        <option value="books">Books</option>
                        <option value="electronics">Electronics</option>
                        <option value="clothing">Clothing</option>
                    </select>
                </div>
                <input
                    type="number"
                    name="price"
                    value={product.price}
                    onChange={handleInputChange}
                    placeholder="Price"
                    required
                />
                <div className="file-upload">
                    <label>Upload Image:</label>
                    <input
                        type="file"
                        name="image"
                        onChange={handleFileChange}
                        accept="image/*"
                        required
                    />
                </div>
                <button type="submit">Upload Product</button>
            </form>
        </div>
    );
};

export default UploadProduct;
