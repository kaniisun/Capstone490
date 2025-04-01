import { useState } from "react";

export const useTabManagement = () => {
  // Tab selection state
  const [tabValue, setTabValue] = useState(0);

  // Function to handle tab changes
  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  return {
    tabValue,
    handleTabChange,
  };
};
