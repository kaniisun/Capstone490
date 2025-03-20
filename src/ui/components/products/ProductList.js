import React, { useEffect, useState } from "react"; // Add React to the import
import { supabase } from "../../../supabaseClient"; // Import the Supabase client for database access

function ProductList({ filters }) {
  //State to store list of products fetched from supabase
  const [products, setProducts] = useState([]);

  //State to track if data is currently being fetched
  const [loading, setLoading] = useState(false);

  //State to store any error messages from the fetch operation
  const [error, setError] = useState(null);

  //useEffect hook to fetch data whenever the filters prop changes
  useEffect(() => {
    //Async function to fetch products based on filters
    const fetchProducts = async () => {
      setLoading(true); //Show loading indicator while fetching data
      setError(null); //Clear any previous error messages

      //Base query to select all columns from products table
      let query = supabase.from("products").select("*");

      //Apply category filter
      if (filters.category) {
        query = query.eq("category", filters.category); //Match exact category
      }

      //Apply min price filter
      if (filters.minPrice) {
        query = query.gte("price", filters.minPrice); //Greater than or equal to min price
      }

      //Apply max price filter
      if (filters.maxPrice) {
        query = query.lte("price", filters.maxPrice); //Less than or equal to max price
      }

      //Apply condition filter
      if (
        filters.conditions &&
        Array.isArray(filters.conditions) &&
        filters.conditions.length > 0
      ) {
        query = query.in("condition", filters.conditions); //Match any of the selected conditions
      }

      //Apply bundle filter
      if (filters.bundle) {
        query = query.eq("is_bundle", true); //Match exact bundle status
      }

      //Execute the query and get response
      const { data, error } = await query;

      //Handle errors from the query
      if (error) {
        setError("Error fetching products"); //Set error message if query fails
      } else {
        setProducts(data); //Update products state with fetched data
      }

      //Update loading state to show that fetching is complete
      setLoading(false);
    };

    fetchProducts(); //Call the fetchProducts function to execute the query
  }, [filters]); //Run the fetch operation whenever the filters prop changes

  //Conditional rendering based on state
  if (loading) return <div>Loading...</div>; //Show loading indicator while fetching data
  if (error) return <div>Error: {error}</div>; //Show error message if query fails
  if (products.length === 0) return <div>No products found</div>; //Show message if no products are found

  //Render the product list
  return (
    <div>
      {products.map((product) => (
        <div key={product.productID}>
          {" "}
          {/*Unique key for each product */}
          <h3>{product.name}</h3> {/* Display product name */}
          <p>Price: ${product.price}</p> {/* Display product price */}
          <p>Condition: {product.condition}</p>{" "}
          {/* Display product condition */}
        </div>
      ))}
    </div>
  );
}

export default ProductList;
