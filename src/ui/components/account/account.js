import React, { useState, useEffect } from "react";
import { supabase } from "../../../supabaseClient";
import { Link } from "react-router-dom";
import "./account.css";

const Account = () => {
  const [user, setUser] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [message, setMessage] = useState({ text: "", type: "" });
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [passwords, setPasswords] = useState({
    current: "",
    new: "",
    confirm: "",
  });

  // Fetch user data and their products
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const {
          data: { user: authUser },
        } = await supabase.auth.getUser();

        if (authUser) {
          const { data: userData, error: userError } = await supabase
            .from("users")
            .select("*")
            .eq("userID", authUser.id)
            .single();

          if (userError) throw userError;

          const { data: userProducts, error: productsError } = await supabase
            .from("products")
            .select("*")
            .eq("userID", authUser.id)
            .order("created_at", { ascending: false });

          if (productsError) throw productsError;

          setUser(userData);
          setProducts(userProducts || []);
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
        setMessage({ text: "Error loading profile data", type: "error" });
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, []);

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setUpdating(true);
    try {
      const { error } = await supabase
        .from("users")
        .update({
          firstName: user.firstName,
          lastName: user.lastName,
        })
        .eq("userID", user.userID);

      if (error) throw error;
      setMessage({ text: "Profile updated successfully!", type: "success" });
    } catch (error) {
      console.error("Error updating profile:", error);
      setMessage({ text: "Error updating profile", type: "error" });
    } finally {
      setUpdating(false);
    }
  };

  const handlePasswordUpdate = async (e) => {
    e.preventDefault();
    if (passwords.new !== passwords.confirm) {
      setMessage({ text: "New passwords do not match", type: "error" });
      return;
    }

    setUpdating(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: passwords.new,
      });

      if (error) throw error;
      setMessage({ text: "Password updated successfully!", type: "success" });
      setShowPasswordForm(false);
      setPasswords({ current: "", new: "", confirm: "" });
    } catch (error) {
      console.error("Error updating password:", error);
      setMessage({ text: "Error updating password", type: "error" });
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteProduct = async (productId) => {
    if (window.confirm("Are you sure you want to delete this product?")) {
      try {
        // First, get the product to get its image URL
        const { data: product, error: fetchError } = await supabase
          .from("products")
          .select("*")
          .eq("productID", productId)
          .single();

        if (fetchError) throw fetchError;

        // Delete the product from the database
        const { error: deleteError } = await supabase
          .from("products")
          .delete()
          .eq("productID", productId);

        if (deleteError) throw deleteError;

        // If product had an image, try to delete it from storage
        if (product?.image) {
          try {
            const urlParts = product.image.split("/uploads/");
            if (urlParts.length > 1) {
              const filePath = `uploads/${urlParts[1]}`;
              await supabase.storage.from("product-images").remove([filePath]);
            }
          } catch (storageError) {
            console.error("Error deleting image from storage:", storageError);
            // Continue execution even if image deletion fails
          }
        }

        // Update local state to remove the product
        setProducts(products.filter((p) => p.productID !== productId));
        setMessage({ text: "Product deleted successfully!", type: "success" });
      } catch (error) {
        console.error("Error deleting product:", error.message);
        setMessage({
          text: `Error deleting product: ${error.message}`,
          type: "error",
        });
      }
    }
  };

  if (loading) {
    return <div className="account-loading">Loading...</div>;
  }

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1>Account Dashboard</h1>
        {message.text && (
          <div className={`alert alert-${message.type}`}>{message.text}</div>
        )}
      </div>

      <div className="dashboard-grid">
        {/* Profile Section */}
        <section className="profile-section dashboard-card">
          <h2>Profile Information</h2>
          <form onSubmit={handleUpdateProfile}>
            <div className="form-group">
              <label>First Name</label>
              <input
                type="text"
                value={user?.firstName || ""}
                onChange={(e) =>
                  setUser({ ...user, firstName: e.target.value })
                }
                required
              />
            </div>
            <div className="form-group">
              <label>Last Name</label>
              <input
                type="text"
                value={user?.lastName || ""}
                onChange={(e) => setUser({ ...user, lastName: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label>Email</label>
              <input type="email" value={user?.email || ""} disabled />
            </div>
            <button type="submit" disabled={updating}>
              {updating ? "Updating..." : "Update Profile"}
            </button>
          </form>

          <button
            className="change-password-btn"
            onClick={() => setShowPasswordForm(!showPasswordForm)}
          >
            Change Password
          </button>

          {showPasswordForm && (
            <form onSubmit={handlePasswordUpdate} className="password-form">
              <div className="form-group">
                <label>Current Password</label>
                <input
                  type="password"
                  value={passwords.current}
                  onChange={(e) =>
                    setPasswords({ ...passwords, current: e.target.value })
                  }
                  required
                />
              </div>
              <div className="form-group">
                <label>New Password</label>
                <input
                  type="password"
                  value={passwords.new}
                  onChange={(e) =>
                    setPasswords({ ...passwords, new: e.target.value })
                  }
                  required
                />
              </div>
              <div className="form-group">
                <label>Confirm New Password</label>
                <input
                  type="password"
                  value={passwords.confirm}
                  onChange={(e) =>
                    setPasswords({ ...passwords, confirm: e.target.value })
                  }
                  required
                />
              </div>
              <button type="submit" disabled={updating}>
                {updating ? "Updating Password..." : "Update Password"}
              </button>
            </form>
          )}
        </section>

        {/* Products Section */}
        <section className="products-section dashboard-card">
          <div className="products-header">
            <h2>Your Products</h2>
            <Link to="/uploadProduct" className="add-product-btn">
              Add New Product
            </Link>
          </div>

          <div className="products-grid">
            {products.length === 0 ? (
              <p className="no-products">
                You haven't uploaded any products yet.
              </p>
            ) : (
              products.map((product) => {
                console.log("Product in list:", product); // Debug log
                return (
                  <div key={product.productID} className="product-card">
                    <img
                      src={product.image || "https://via.placeholder.com/150"}
                      alt={product.name}
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = "https://via.placeholder.com/150";
                      }}
                    />
                    <div className="product-info">
                      <h3>{product.name}</h3>
                      <p className="price">
                        ${parseFloat(product.price).toFixed(2)}
                      </p>
                      <p className="category">Category: {product.category}</p>
                      <p className="condition">
                        Condition: {product.condition}
                      </p>
                      <p className="status">Status: {product.status}</p>
                      <div className="product-actions">
                        <Link
                          to={`/editProduct/${product.productID}`}
                          className="edit-btn"
                          onClick={() =>
                            console.log(
                              "Editing product with ID:",
                              product.productID
                            )
                          }
                        >
                          Edit
                          <svg className="svg" viewBox="0 0 512 512">
                            <path d="M410.3 231l11.3-11.3-33.9-33.9-62.1-62.1L291.7 89.8l-11.3 11.3-22.6 22.6L58.6 322.9c-10.4 10.4-18 23.3-22.2 37.4L1 480.7c-2.5 8.4-.2 17.5 6.1 23.7s15.3 8.5 23.7 6.1l120.3-35.4c14.1-4.2 27-11.8 37.4-22.2L387.7 253.7 410.3 231zM160 399.4l-9.1 22.7c-4 3.1-8.5 5.4-13.3 6.9L59.4 452l23-78.1c1.4-4.9 3.8-9.4 6.9-13.3l22.7-9.1v32c0 8.8 7.2 16 16 16h32zM362.7 18.7L348.3 33.2 325.7 55.8 314.3 67.1l33.9 33.9 62.1 62.1 33.9 33.9 11.3-11.3 22.6-22.6 14.5-14.5c25-25 25-65.5 0-90.5L453.3 18.7c-25-25-65.5-25-90.5 0zm-47.4 168l-144 144c-6.2 6.2-16.4 6.2-22.6 0s-6.2-16.4 0-22.6l144-144c6.2-6.2 16.4-6.2 22.6 0s6.2 16.4 0 22.6z"></path>
                          </svg>
                        </Link>
                        <button
                          onClick={() => handleDeleteProduct(product.productID)}
                          className="button"
                        >
                          <svg viewBox="0 0 448 512" className="svgIcon">
                            <path d="M135.2 17.7L128 32H32C14.3 32 0 46.3 0 64S14.3 96 32 96H416c17.7 0 32-14.3 32-32s-14.3-32-32-32H320l-7.2-14.3C307.4 6.8 296.3 0 284.2 0H163.8c-12.1 0-23.2 6.8-28.6 17.7zM416 128H32L53.2 467c1.6 25.3 22.6 45 47.9 45H346.9c25.3 0 46.3-19.7 47.9-45L416 128z"></path>
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

export default Account;
