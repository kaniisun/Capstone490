import React, { useState, useEffect } from "react";
import { supabase } from "../../../supabaseClient"; 
import { useNavigate } from "react-router-dom";
import "./uploadProduct.css";

const UploadProduct = () => {
    const navigate = useNavigate();
    const [userId, setUserId] = useState(null);
    const [product, setProduct] = useState({
        name: "",
        description: "",
        condition: "",
        category: "furniture",
        price: "",
        imageFile: null,
        is_bundle: false,
        status: "Available",
        flag: false,
    });

    const [loading, setLoading] = useState(false);

    // Get the current user's ID when component mounts
    useEffect(() => {
        const getCurrentUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                navigate('/login');
                return;
            }
            setUserId(user.id);
        };

        getCurrentUser();
    }, [navigate]);

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

        try {
            if (!userId) {
                throw new Error('User not authenticated');
            }

            let imageUrl = null;

            if (product.imageFile) {
                const fileExt = product.imageFile.name.split(".").pop();
                const fileName = `${userId}_${Date.now()}.${fileExt}`;
                const filePath = `uploads/${fileName}`;

                const { data: uploadData, error: uploadError } = await supabase.storage
                    .from("product-images")
                    .upload(filePath, product.imageFile, { upsert: false });

                if (uploadError) throw uploadError;

                const { data: publicUrlData } = supabase
                    .storage
                    .from("product-images")
                    .getPublicUrl(filePath);

                imageUrl = publicUrlData.publicUrl;
            }

            const { data, error: productError } = await supabase
                .from("products")
                .insert([
                    {
                        userID: userId,
                        name: product.name,
                        description: product.description,
                        condition: product.condition,
                        category: product.category,
                        price: parseFloat(product.price),
                        image: imageUrl,
                        status: product.status,
                        is_bundle: product.is_bundle,
                        flag: product.flag,
                        created_at: new Date().toISOString(),
                        modified_at: new Date().toISOString(),
                    },
                ])
                .select();

            if (productError) throw productError;

            // Show success message
            alert('Product uploaded successfully!');
            
            // Navigate to account dashboard after successful upload
            navigate('/account');
            
        } catch (error) {
            console.error("Error uploading product:", error);
            alert(error.message || "Failed to upload product");
        } finally {
            setLoading(false);
        }
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
                        <option value="miscellaneous">Miscellaneous</option>
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
