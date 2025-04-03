import { configureStore } from "@reduxjs/toolkit";
import communitiesReducer from "./communitySlice";

export const store = configureStore({
  reducer: {
    communities: communitiesReducer,
    // Add other reducers as needed
  },
});

export default store;
