// src/utils/storage.js - PRODUCTION READY
import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import AsyncStorage from "@react-native-async-storage/async-storage";

const storage = {
  setToken: async (value) => {
    try {
      if (Platform.OS === "web") {
        localStorage.setItem("authToken", value);
        return true;
      }
      await SecureStore.setItemAsync("authToken", value);
      return true;
    } catch (e) {
      return false;
    }
  },

  getToken: async () => {
    try {
      if (Platform.OS === "web") {
        return localStorage.getItem("authToken");
      }
      return await SecureStore.getItemAsync("authToken");
    } catch (e) {
      return null;
    }
  },

  deleteToken: async () => {
    try {
      if (Platform.OS === "web") {
        localStorage.removeItem("authToken");
        return true;
      }
      await SecureStore.deleteItemAsync("authToken");
      return true;
    } catch (e) {
      return false;
    }
  },

  setItem: async (key, value) => {
    try {
      if (Platform.OS === "web") {
        localStorage.setItem(key, value);
        return;
      }
      return AsyncStorage.setItem(key, value);
    } catch (e) {
      return false;
    }
  },

  getItem: async (key) => {
    try {
      if (Platform.OS === "web") {
        return localStorage.getItem(key);
      }
      return AsyncStorage.getItem(key);
    } catch (e) {
      return null;
    }
  },

  removeItem: async (key) => {
    try {
      if (Platform.OS === "web") {
        localStorage.removeItem(key);
        return;
      }
      return AsyncStorage.removeItem(key);
    } catch (e) {
      return false;
    }
  },

  clear: async () => {
    try {
      if (Platform.OS === "web") {
        localStorage.clear();
        return true;
      }
      await AsyncStorage.clear();
      await SecureStore.deleteItemAsync("authToken");
      return true;
    } catch (e) {
      return false;
    }
  },
};

export default storage;
