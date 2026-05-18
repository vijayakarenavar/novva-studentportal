// src/utils/storage.js
import { Platform } from "react-native";

let AsyncStorage = null;

const storage = {
  getItem: async (key) => {
    try {
      if (Platform.OS === "web") {
        return Promise.resolve(localStorage.getItem(key));
      }
      if (!AsyncStorage) {
        AsyncStorage =
          require("@react-native-async-storage/async-storage").default;
      }
      return AsyncStorage.getItem(key);
    } catch (e) {
      console.log("storage.getItem error:", e);
      return null;
    }
  },

  setItem: async (key, value) => {
    try {
      if (Platform.OS === "web") {
        localStorage.setItem(key, value);
        return Promise.resolve();
      }
      if (!AsyncStorage) {
        AsyncStorage =
          require("@react-native-async-storage/async-storage").default;
      }
      return AsyncStorage.setItem(key, value);
    } catch (e) {
      console.log("storage.setItem error:", e);
    }
  },

  removeItem: async (key) => {
    try {
      if (Platform.OS === "web") {
        localStorage.removeItem(key);
        return Promise.resolve();
      }
      if (!AsyncStorage) {
        AsyncStorage =
          require("@react-native-async-storage/async-storage").default;
      }
      return AsyncStorage.removeItem(key);
    } catch (e) {
      console.log("storage.removeItem error:", e);
    }
  },
};

export default storage;
