import React, { useState } from "react";
import { supabase } from "../../../supabaseClient"; 
import { useNavigate } from "react-router-dom";
import "./uploadProduct.css";

const UploadProduct = () => {
    const navigate = useNavigate();
    const testUserId = "58189ec7-fc7d-4ccc-b168-2cc641ea7896"; // Fixed test user ID

    const [product, setProduct] = useState({
        userId: testUserId, // Assign test user ID
        name: "",
        description: "",
        condition: "",
        category: "furniture",
        price: "",
        imageFile: null, // Users will upload an image file
        is_bundle: false,
        status: "Available",
        flag: false,
    });

    const [loading, setLoading] = useState(false);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setProduct({ ...product, [name]: value });
    };

    const handleCheckboxChange = (e) => {
        setProduct({ ...product, is_bundle: e.target.checked });
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setProduct({ ...product, imageFile: file });
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        let imageUrl = null; // Store the public URL of the uploaded image

        try {
            //  ** Upload Image to Supabase Storage**
            if (product.imageFile) {
                const fileExt = product.imageFile.name.split(".").pop();
                const fileName = `product_${Date.now()}.${fileExt}`;
                const filePath = `uploads/${fileName}`;

                const { data: uploadData, error: uploadError } = await supabase.storage
                    .from("product-images") // Make sure this bucket exists in Supabase
                    .upload(filePath, product.imageFile, { upsert: false });

                if (uploadError) {
                    console.error("Image upload error:", uploadError);
                    alert(`Failed to upload image: ${uploadError.message}`);
                    setLoading(false);
                    return;
                }

                //  Retrieve Public URL of uploaded image
                const { data: publicUrlData } = supabase
                    .storage
                    .from("product-images")
                    .getPublicUrl(filePath);

                imageUrl = publicUrlData.publicUrl; // Store the image URL
            }

            //  **Step 2: Insert Product Data into Supabase Database**
            const { data, error: productError } = await supabase
                .from("products")
                .insert([
                    {
                        userID: testUserId, // Assign test user ID
                        name: product.name,
                        description: product.description,
                        condition: product.condition,
                        category: product.category,
                        price: parseFloat(product.price), // Ensure price is a number
                        image: imageUrl, // Use the uploaded image URL
                        status: product.status,
                        is_bundle: product.is_bundle,
                        flag: product.flag,
                        created_at: new Date().toISOString(), //  Auto timestamp for creation
                        modified_at: new Date().toISOString(), //  Auto timestamp for last update
                    },
                ])
                .select();

            if (productError) {
                console.error("Product upload error:", productError);
                alert("Failed to upload product.");
                setLoading(false);
                return;
            }

            console.log("Product added successfully:", data);
            alert("Product uploaded successfully!");

            // Redirect to Products Page
            navigate("/products");

        } catch (error) {
            console.error("Unexpected error:", error);
            alert("Something went wrong.");
        }

        setLoading(false);
    };

    return (
        <div className="upload-product-container">
            <h2>Upload New Product</h2>
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

                {/*  Bundle Option Checkbox */}
                <div className="checkbox-container">
                    <label>
                        <input
                            type="checkbox"
                            name="isbundle"
                            checked={product.is_bundle}
                            onChange={handleCheckboxChange}
                        />
                        Available for Bundling
                    </label>
                </div>

                {/*  Image Upload */}
                <div className="file-upload">
                    <label>Upload Product Image:</label>
                    <input
                        type="file"
                        name="imageFile"
                        onChange={handleFileChange}
                        accept="image/*"
                    />
                </div>

                <button type="submit" disabled={loading}>
                    {loading ? "Uploading..." : "Upload Product"}
                </button>
            </form>
        </div>
    );
};

export default UploadProduct;
