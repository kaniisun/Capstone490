import React, { useEffect, useState } from "react";
import { supabase } from "../../../supabaseClient";
import { Grid, Pagination, Box } from "@mui/material";
import "./products.css"; 

function ProductList({ filters }) {
  //State to store list of products fetched from supabase
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);

  //State to store any error messages from the fetch operation
  const [error, setError] = useState(null);

  // Pagination states
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const productsPerPage = 8;

  useEffect(() => {
    //Async function to fetch products based on filters
    const fetchProducts = async () => {
      setLoading(true);
      setError(null); 

      //Base query to select all columns from products table with count
      let query = supabase
        .from("products")
        .select("*", { count: "exact" })
        .eq("is_deleted", false)
        .eq("moderation_status", "approved");

      // Use OR filter with multiple lowercase/uppercase variations of status
      query = query.or("status.eq.available,status.eq.Available");

      console.log("Initial query with status filter applied");

      //Apply category filter
      if (filters.category) {
        query = query.ilike("category", `%${filters.category}%`);
        console.log("After category filter:", filters.category);
      }

      //Apply min price filter
      if (filters.minPrice) {
        query = query.gte("price", filters.minPrice);
        console.log("After min price filter:", filters.minPrice);
      }

      //Apply max price filter
      if (filters.maxPrice) {
        query = query.lte("price", filters.maxPrice);
        console.log("After max price filter:", filters.maxPrice);
      }

      //Apply condition filter - use case-insensitive matching
      if (
        filters.conditions &&
        Array.isArray(filters.conditions) &&
        filters.conditions.length > 0
      ) {
        // Build an OR condition for case-insensitive matches on each condition
        const conditionFilters = filters.conditions
          .map((cond) => `condition.ilike.%${cond}%`)
          .join(",");
        query = query.or(conditionFilters);
        console.log("After conditions filter:", filters.conditions);
      }

      //Apply bundle filter
      if (filters.bundle) {
        query = query.eq("is_bundle", true); //Match exact bundle status
        console.log("After bundle filter:", filters.bundle);
      }

      // Add pagination
      const start = (page - 1) * productsPerPage;

      // Order by most recent first
      query = query
        .order("created_at", { ascending: false })
        .range(start, start + productsPerPage - 1);

      //Execute the query and get response
      const { data, error: queryError, count } = await query;

      //Handle errors from the query
      if (queryError) {
        console.error("Error fetching products:", queryError);
        setError("Error fetching products"); //Set error message if query fails
      } else {
        console.log("Fetched products data:", data);
        console.log("Total count:", count);
        console.log("Number of products fetched:", data?.length || 0);
        console.log("Current page:", page);

        // Log status values for debugging
        if (data && data.length > 0) {
          console.log(
            "Product status values:",
            data.map((p) => p.status)
          );
          console.log(
            "Product moderation status values:",
            data.map((p) => p.moderation_status)
          );
        }

        setProducts(data || []); //Update products state with fetched data
        setTotalPages(Math.ceil(count / productsPerPage));
      }


      setLoading(false);
    };

    fetchProducts(); //Call the fetchProducts
  }, [filters, page]); // Add page to dependencies 

  // Handle page change
  const handlePageChange = (event, value) => {
    setPage(value);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  //Conditional rendering based on state
  if (loading) return <div className="loading-message">Loading...</div>; //Show loading indicator while fetching data
  if (error) return <div className="error-message">Error: {error}</div>; //Show error message if query fails
  if (products.length === 0) return <div className="no-products-message">No products found</div>; //Show message if no products are found

  //Render the product list
  return (
    <Box className="product-list-container">
      <Grid container spacing={2}>
        {products.map((product) => (
          <Grid item xs={12} sm={6} md={3} key={product.productID}>
            <div>
              <h3>{product.name}</h3> {/* Display product name */}
              <p>Price: ${product.price}</p> {/* Display product price */}
              <p>Condition: {product.condition}</p>{" "}
              {/* Display product condition */}
            </div>
          </Grid>
        ))}
      </Grid>

      {/* Pagination controls */}
      {totalPages > 1 && (
        <Box className="pagination-container">
          <Pagination
            count={totalPages}
            page={page}
            onChange={handlePageChange}
            color="primary"
            size="large"
          />
        </Box>
      )}
    </Box>
  );
}

export default ProductList;
