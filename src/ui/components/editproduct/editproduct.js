import React, { useState, useEffect } from "react";
import { supabase } from "../../../supabaseClient";
import { useNavigate, useParams } from "react-router-dom";
import "./editproduct.css";

const EditProduct = () => {
    const navigate = useNavigate();
    const { productID } = useParams();
    const [loading, setLoading] = useState(true);
    const [product, setProduct] = useState({
        name: "",
        description: "",
        condition: "",
        category: "",
        price: "",
        imageFile: null,
        is_bundle: false,
        status: "Available",
    });

    useEffect(() => {
        const fetchProduct = async () => {
            if (!productID) {
                console.error("No product ID provided");
                alert("No product ID provided");
                navigate("/account");
                return;
            }

            console.log("Fetching product with ID:", productID);

            try {
                const { data, error } = await supabase
                    .from("products")
                    .select("*")
                    .eq("productID", productID)
                    .single();

                if (error) {
                    console.error("Database error:", error);
                    throw error;
                }

                if (!data) {
                    throw new Error("Product not found");
                }

                console.log("Fetched product data:", data);

                setProduct({
                    ...data,
                    imageFile: null
                });
            } catch (error) {
                console.error("Error fetching product:", error);
                alert(`Error fetching product details: ${error.message}`);
                navigate("/account");
            } finally {
                setLoading(false);
            }
        };

        fetchProduct();
    }, [productID, navigate]);

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
            let imageUrl = product.image; // Keep existing image URL by default

            // Upload new image if one was selected
            if (product.imageFile) {
                const fileExt = product.imageFile.name.split(".").pop();
                const fileName = `${productID}_${Date.now()}.${fileExt}`;
                const filePath = `uploads/${fileName}`;

                const { error: uploadError } = await supabase.storage
                    .from("product-images")
                    .upload(filePath, product.imageFile, { upsert: true });

                if (uploadError) throw uploadError;

                const { data: publicUrlData } = supabase.storage
                    .from("product-images")
                    .getPublicUrl(filePath);

                imageUrl = publicUrlData.publicUrl;
            }

            // Update product in database
            const { error: updateError } = await supabase
                .from("products")
                .update({
                    name: product.name,
                    description: product.description,
                    condition: product.condition,
                    category: product.category,
                    price: parseFloat(product.price),
                    image: imageUrl,
                    status: product.status,
                    is_bundle: product.is_bundle,
                    modified_at: new Date().toISOString(),
                })
                .eq("productID", productID);

            if (updateError) throw updateError;

            alert("Product updated successfully!");
            navigate("/account");
        } catch (error) {
            console.error("Error updating product:", error);
            alert(error.message || "Error updating product");
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return <div>Loading...</div>;
    }

    return (
        <div className="edit-product-container">
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

                <div className="checkbox-container">
                    <label>
                        <input
                            type="checkbox"
                            name="is_bundle"
                            checked={product.is_bundle}
                            onChange={handleCheckboxChange}
                        />
                        Available for Bundling
                    </label>
                </div>

                <div className="current-image">
                    <label>Current Image:</label>
                    <img 
                        src={product.image || "https://via.placeholder.com/150"} 
                        alt={product.name}
                        style={{ maxWidth: '200px' }}
                    />
                </div>

                <div className="file-upload">
                    <label>Upload New Image (optional):</label>
                    <input
                        type="file"
                        name="imageFile"
                        onChange={handleFileChange}
                        accept="image/*"
                    />
                </div>

                <button type="submit" disabled={loading}>
                    {loading ? "Updating..." : "Update Product"}
                </button>
            </form>
        </div>
    );
};

export default EditProduct;
