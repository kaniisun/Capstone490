import React, { useEffect, useState } from "react"; // Add React to the import
import { supabase } from "../../../supabaseClient"; // Import the Supabase client for database access
import { Grid, Pagination, Box } from "@mui/material"; // Import pagination components

function ProductList({ filters }) {
  //State to store list of products fetched from supabase
  const [products, setProducts] = useState([]);

  //State to track if data is currently being fetched
  const [loading, setLoading] = useState(false);

  //State to store any error messages from the fetch operation
  const [error, setError] = useState(null);

  // Pagination states
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const productsPerPage = 8; // Show 8 products per page (2 rows of 4)

  //useEffect hook to fetch data whenever the filters prop changes
  useEffect(() => {
    //Async function to fetch products based on filters
    const fetchProducts = async () => {
      setLoading(true); //Show loading indicator while fetching data
      setError(null); //Clear any previous error messages

      //Base query to select all columns from products table with count
      let query = supabase
        .from("products")
        .select("*", { count: "exact" })
        .eq("is_deleted", false)
        .eq("moderation_status", "approved");

      // Use OR filter with multiple lowercase/uppercase variations of status
      // Status can be: available, Available, sold, Sold
      query = query.or("status.eq.available,status.eq.Available");

      console.log("Initial query with status filter applied");

      //Apply category filter
      if (filters.category) {
        query = query.ilike("category", `%${filters.category}%`); // Use ilike for case-insensitive matching
        console.log("After category filter:", filters.category);
      }

      //Apply min price filter
      if (filters.minPrice) {
        query = query.gte("price", filters.minPrice); //Greater than or equal to min price
        console.log("After min price filter:", filters.minPrice);
      }

      //Apply max price filter
      if (filters.maxPrice) {
        query = query.lte("price", filters.maxPrice); //Less than or equal to max price
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

      //Update loading state to show that fetching is complete
      setLoading(false);
    };

    fetchProducts(); //Call the fetchProducts function to execute the query
  }, [filters, page]); // Add page to dependencies so query reruns when page changes

  // Handle page change
  const handlePageChange = (event, value) => {
    setPage(value);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  //Conditional rendering based on state
  if (loading) return <div>Loading...</div>; //Show loading indicator while fetching data
  if (error) return <div>Error: {error}</div>; //Show error message if query fails
  if (products.length === 0) return <div>No products found</div>; //Show message if no products are found

  //Render the product list
  return (
    <Box sx={{ width: "100%" }}>
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
        <Box sx={{ display: "flex", justifyContent: "center", mt: 4, mb: 4 }}>
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
