import { createAsyncThunk } from "@reduxjs/toolkit";
import { supabase } from "../supabaseClient";
import {
  setLoading,
  setError,
  clearCommunityForm,
  setCommunities,
  setCurrentCommunity,
} from "./communitySlice";

// Thunk to fetch communities
export const fetchCommunities = createAsyncThunk(
  "communities/fetchCommunities",
  async (_, { dispatch }) => {
    try {
      dispatch(setLoading(true));
      const { data, error } = await supabase
        .from("communities")
        .select("*")
        .order("created_at", { ascending: true });

      if (error) throw error;

      // Process the communities
      const processedCommunities = data.map((item) => ({
        name: item.name,
        community_id: item.community_id,
        creator_id: item.creator_id,
        created_at: item.created_at,
        description: item.description,
      }));

      // Add "all" as a special view
      const allCommunities = [
        {
          name: "all",
          description: "All posts from all communities",
          isDefault: true,
          isView: true, // Mark this as a view, not a real community
        },
        ...processedCommunities,
      ];

      dispatch(setCommunities(allCommunities));
      return allCommunities;
    } catch (error) {
      console.error("Error fetching communities:", error);
      dispatch(setError(error.message));
      return [];
    } finally {
      dispatch(setLoading(false));
    }
  }
);

// Thunk to create a new community
export const createCommunity = createAsyncThunk(
  "communities/createCommunity",
  async (_, { dispatch, getState }) => {
    try {
      dispatch(setLoading(true));

      const { communities } = getState();
      const { name, description } = communities.newCommunityForm;
      const userId = localStorage.getItem("userId");

      // Validate
      if (!name.trim()) {
        throw new Error("Please provide a name for your community");
      }

      // Check if community exists
      const { data: existingCommunities, error: checkError } = await supabase
        .from("communities")
        .select("community_id")
        .eq("name", name.trim());

      if (checkError) throw checkError;

      if (existingCommunities && existingCommunities.length > 0) {
        throw new Error("A community with this name already exists");
      }

      // Create community
      const { data, error } = await supabase
        .from("communities")
        .insert([
          {
            name: name.trim(),
            description: description.trim() || `Welcome to ${name}!`,
            creator_id: userId,
            created_at: new Date().toISOString(),
            status: "active",
          },
        ])
        .select();

      if (error) throw error;

      // Clear form
      dispatch(clearCommunityForm());

      // Refresh communities list
      await dispatch(fetchCommunities());

      // Navigate to new community
      if (data && data[0]) {
        dispatch(setCurrentCommunity(data[0].name));
      }

      return data;
    } catch (error) {
      console.error("Error creating community:", error);
      dispatch(setError(error.message));
      throw error;
    } finally {
      dispatch(setLoading(false));
    }
  }
);
