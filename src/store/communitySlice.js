import { createSlice } from "@reduxjs/toolkit";

const communitySlice = createSlice({
  name: "communities",
  initialState: {
    list: [],
    newCommunityForm: {
      name: "",
      description: "",
    },
    loading: false,
    error: null,
    currentCommunity: "all",
  },
  reducers: {
    // Update form fields
    updateCommunityForm(state, action) {
      state.newCommunityForm = {
        ...state.newCommunityForm,
        ...action.payload,
      };
    },
    // Set communities list
    setCommunities(state, action) {
      state.list = action.payload;
    },
    // Set current selected community
    setCurrentCommunity(state, action) {
      state.currentCommunity = action.payload;
    },
    // Set loading state
    setLoading(state, action) {
      state.loading = action.payload;
    },
    // Set error state
    setError(state, action) {
      state.error = action.payload;
    },
    // Clear form after submission
    clearCommunityForm(state) {
      state.newCommunityForm = {
        name: "",
        description: "",
      };
    },
  },
});

export const {
  updateCommunityForm,
  setCommunities,
  setCurrentCommunity,
  setLoading,
  setError,
  clearCommunityForm,
} = communitySlice.actions;

export default communitySlice.reducer;
