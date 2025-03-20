//filter.js
//This is the filter component that allows the user to filter the products

import React, { useState, useEffect } from "react";
import { supabase } from "../../../supabaseClient";
import "./Filter.css";

//Define the Filter component, accepting filters and setFilters as props from the parent
function Filter({ filters, setFilters }) {
  const [priceRanges, setPriceRanges] = useState([]);

  // Fetch all products and calculate price ranges on component mount
  useEffect(() => {
    const calculatePriceRanges = async () => {
      const { data: products } = await supabase
        .from("products")
        .select("price")
        .order("price");

      if (!products?.length) return;

      // Get all prices and round them to whole numbers
      const prices = products.map((p) => Math.round(p.price));
      const minPrice = Math.min(...prices);
      const maxPrice = Math.max(...prices);

      // Calculate range size based on the data
      const rangeCount = 5; // Number of ranges we want
      const rangeSize = Math.ceil((maxPrice - minPrice) / rangeCount);
      const roundedRangeSize = Math.ceil(rangeSize / 10) * 10;

      // Generate ranges
      const ranges = [];
      let currentMin = Math.floor(minPrice / 10) * 10; // Round down to nearest 10

      // Store currentMin in a separate variable to avoid the loop-func error
      while (currentMin < maxPrice) {
        const rangeMin = currentMin;
        const currentMax = Math.min(rangeMin + roundedRangeSize, maxPrice);

        // Only add range if there are products in it
        // eslint-disable-next-line no-loop-func
        const productsInRange = products.filter(
          (p) =>
            Math.round(p.price) >= rangeMin && Math.round(p.price) <= currentMax
        );

        if (productsInRange.length > 0) {
          ranges.push({
            label:
              currentMax === maxPrice
                ? `$${rangeMin} and up`
                : `$${rangeMin} - $${currentMax}`,
            min: rangeMin,
            max: currentMax === maxPrice ? null : currentMax,
          });
        }

        currentMin = currentMax + 1;
      }

      setPriceRanges(ranges);
    };

    calculatePriceRanges();
  }, []);

  // eslint-disable-next-line no-unused-vars
  const priceInputs = {
    min: filters.minPrice,
    max: filters.maxPrice,
  };

  // eslint-disable-next-line no-unused-vars
  const handlePriceChange = (type, value) => {
    let numValue = value;

    if (value !== "") {
      numValue = parseFloat(value);
      if (isNaN(numValue) || numValue < 0) return;
    }

    // Update temporary price inputs instead of filters directly
    setFilters((prev) => ({
      ...prev,
      [type === "min" ? "min" : "max"]: value === "" ? "" : numValue,
    }));
  };

  // Handle custom price input
  const handlePriceSubmit = (e) => {
    e.preventDefault();
    const min = e.target.min.value;
    const max = e.target.max.value;
    setFilters((prev) => ({
      ...prev,
      minPrice: min,
      maxPrice: max,
      selectedPriceRange: null,
    }));
  };

  // Handle price range selection
  const handlePriceRangeSelect = (min, max) => {
    // Toggle the price range selection - if already selected, clear it
    if (
      filters.minPrice === min.toString() &&
      (max ? filters.maxPrice === max.toString() : true)
    ) {
      setFilters((prev) => ({
        ...prev,
        minPrice: "",
        maxPrice: "",
      }));
    } else {
      setFilters((prev) => ({
        ...prev,
        minPrice: min,
        maxPrice: max,
      }));
    }
  };

  // eslint-disable-next-line no-unused-vars
  const handleRangeChange = (value) => {
    const numValue = parseFloat(value);

    setFilters((prev) => ({
      ...prev,
      maxPrice: numValue,
      // If min price exists and is greater than new max, update min price
      minPrice:
        prev.minPrice !== "" && prev.minPrice > numValue
          ? numValue
          : prev.minPrice,
    }));
  };

  //Render the filter UI
  return (
    <div className="filter-sidebar">
      <div className="filter-section">
        <h2>Categories</h2>
        <div className="checkbox-group">
          <label>
            <input
              type="checkbox"
              value="Textbooks"
              checked={filters.categories.includes("Textbooks")}
              onChange={(e) => {
                const { value, checked } = e.target;
                setFilters((prev) => ({
                  ...prev,
                  categories: checked
                    ? [...prev.categories, value]
                    : prev.categories.filter((cat) => cat !== value),
                }));
              }}
            />
            Textbooks
          </label>
          <label>
            <input
              type="checkbox"
              value="Electronics"
              checked={filters.categories.includes("Electronics")}
              onChange={(e) => {
                const { value, checked } = e.target;
                setFilters((prev) => ({
                  ...prev,
                  categories: checked
                    ? [...prev.categories, value]
                    : prev.categories.filter((cat) => cat !== value),
                }));
              }}
            />
            Electronics
          </label>
          <label>
            <input
              type="checkbox"
              value="Furniture"
              checked={filters.categories.includes("Furniture")}
              onChange={(e) => {
                const { value, checked } = e.target;
                setFilters((prev) => ({
                  ...prev,
                  categories: checked
                    ? [...prev.categories, value]
                    : prev.categories.filter((cat) => cat !== value),
                }));
              }}
            />
            Furniture
          </label>
          <label>
            <input
              type="checkbox"
              value="Clothing"
              checked={filters.categories.includes("Clothing")}
              onChange={(e) => {
                const { value, checked } = e.target;
                setFilters((prev) => ({
                  ...prev,
                  categories: checked
                    ? [...prev.categories, value]
                    : prev.categories.filter((cat) => cat !== value),
                }));
              }}
            />
            Clothing
          </label>
          <label>
            <input
              type="checkbox"
              value="Miscellaneous"
              checked={filters.categories.includes("Miscellaneous")}
              onChange={(e) => {
                const { value, checked } = e.target;
                setFilters((prev) => ({
                  ...prev,
                  categories: checked
                    ? [...prev.categories, value]
                    : prev.categories.filter((cat) => cat !== value),
                }));
              }}
            />
            Miscellaneous
          </label>
        </div>
      </div>

      <div className="filter-section">
        <h2>Price</h2>
        <form onSubmit={handlePriceSubmit} className="price-filter-form">
          <div className="custom-price-range">
            <input
              type="number"
              name="min"
              placeholder="min."
              value={filters.minPrice}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, minPrice: e.target.value }))
              }
            />
            <span>to</span>
            <input
              type="number"
              name="max"
              placeholder="max."
              value={filters.maxPrice}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, maxPrice: e.target.value }))
              }
            />
          </div>
        </form>

        <div className="price-ranges">
          {priceRanges.map((range, index) => (
            <label key={index} className="price-range-option">
              <input
                type="checkbox"
                checked={
                  filters.minPrice === range.min.toString() &&
                  (range.max ? filters.maxPrice === range.max.toString() : true)
                }
                onChange={() =>
                  handlePriceRangeSelect(
                    range.min.toString(),
                    range.max?.toString() ?? ""
                  )
                }
              />
              {range.label}
            </label>
          ))}
        </div>
      </div>

      <div className="filter-section">
        <h2>Condition</h2>
        <div className="checkbox-group">
          <label>
            <input
              type="checkbox"
              value="New"
              checked={
                Array.isArray(filters.conditions)
                  ? filters.conditions.includes("New")
                  : false
              }
              onChange={(e) => {
                const { value, checked } = e.target;
                setFilters((prev) => ({
                  ...prev,
                  conditions: checked
                    ? [
                        ...(Array.isArray(prev.conditions)
                          ? prev.conditions
                          : []),
                        value,
                      ]
                    : Array.isArray(prev.conditions)
                    ? prev.conditions.filter((c) => c !== value)
                    : [],
                }));
              }}
            />
            New
          </label>
          <label>
            <input
              type="checkbox"
              value="Like New"
              checked={
                Array.isArray(filters.conditions)
                  ? filters.conditions.includes("Like New")
                  : false
              }
              onChange={(e) => {
                const { value, checked } = e.target;
                setFilters((prev) => ({
                  ...prev,
                  conditions: checked
                    ? [
                        ...(Array.isArray(prev.conditions)
                          ? prev.conditions
                          : []),
                        value,
                      ]
                    : Array.isArray(prev.conditions)
                    ? prev.conditions.filter((c) => c !== value)
                    : [],
                }));
              }}
            />
            Like New
          </label>
          <label>
            <input
              type="checkbox"
              value="Good"
              checked={
                Array.isArray(filters.conditions)
                  ? filters.conditions.includes("Good")
                  : false
              }
              onChange={(e) => {
                const { value, checked } = e.target;
                setFilters((prev) => ({
                  ...prev,
                  conditions: checked
                    ? [
                        ...(Array.isArray(prev.conditions)
                          ? prev.conditions
                          : []),
                        value,
                      ]
                    : Array.isArray(prev.conditions)
                    ? prev.conditions.filter((c) => c !== value)
                    : [],
                }));
              }}
            />
            Good
          </label>
          <label>
            <input
              type="checkbox"
              value="Fair"
              checked={
                Array.isArray(filters.conditions)
                  ? filters.conditions.includes("Fair")
                  : false
              }
              onChange={(e) => {
                const { value, checked } = e.target;
                setFilters((prev) => ({
                  ...prev,
                  conditions: checked
                    ? [
                        ...(Array.isArray(prev.conditions)
                          ? prev.conditions
                          : []),
                        value,
                      ]
                    : Array.isArray(prev.conditions)
                    ? prev.conditions.filter((c) => c !== value)
                    : [],
                }));
              }}
            />
            Fair
          </label>
          <label>
            <input
              type="checkbox"
              value="Poor"
              checked={
                Array.isArray(filters.conditions)
                  ? filters.conditions.includes("Poor")
                  : false
              }
              onChange={(e) => {
                const { value, checked } = e.target;
                setFilters((prev) => ({
                  ...prev,
                  conditions: checked
                    ? [
                        ...(Array.isArray(prev.conditions)
                          ? prev.conditions
                          : []),
                        value,
                      ]
                    : Array.isArray(prev.conditions)
                    ? prev.conditions.filter((c) => c !== value)
                    : [],
                }));
              }}
            />
            Poor
          </label>
        </div>
      </div>

      <div className="filter-section">
        <label className="bundle-checkbox">
          <input
            type="checkbox"
            checked={filters.isBundle}
            onChange={(e) =>
              setFilters((prev) => ({ ...prev, isBundle: e.target.checked }))
            }
          />
          Bundle Items Only
        </label>
      </div>
    </div>
  );
}

export default Filter;
