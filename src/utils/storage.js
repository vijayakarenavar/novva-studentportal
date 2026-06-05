// src/utils/storage.js - PRODUCTION READY
// ============================================
// ✅ Fixed: AsyncStorage → expo-secure-store (for tokens)
// ✅ Fixed: Proper error handling
// ============================================

import { Platform } from "react-native";

let SecureStore = null;
let AsyncStorage = null;

/**
 * 🔐 Secure Storage Utility
 *
 * - authToken → expo-secure-store (encrypted)
 * - Other data → AsyncStorage (can be device-specific)
 */

const storage = {
  /**
   * Token को SECURELY store करो (encrypted)
   * @param {string} value - Token value
   */
  setToken: async (value) => {
    try {
      if (Platform.OS === "web") {
        // Web पर localStorage का use करो (पर production में HTTPS होना चाहिए)
        localStorage.setItem("authToken", value);
        return true;
      }

      // Mobile पर SecureStore का use करो
      if (!SecureStore) {
        SecureStore = require("expo-secure-store");
      }

      await SecureStore.setItemAsync("authToken", value);
      return true;
    } catch (e) {
      console.error("[Storage] Token save failed:", e);
      return false;
    }
  },

  /**
   * Token को SECURELY retrieve करो
   */
  getToken: async () => {
    try {
      if (Platform.OS === "web") {
        return localStorage.getItem("authToken");
      }

      if (!SecureStore) {
        SecureStore = require("expo-secure-store");
      }

      return await SecureStore.getItemAsync("authToken");
    } catch (e) {
      console.error("[Storage] Token get failed:", e);
      return null;
    }
  },

  /**
   * Token को remove करो
   */
  deleteToken: async () => {
    try {
      if (Platform.OS === "web") {
        localStorage.removeItem("authToken");
        return true;
      }

      if (!SecureStore) {
        SecureStore = require("expo-secure-store");
      }

      await SecureStore.deleteItemAsync("authToken");
      return true;
    } catch (e) {
      console.error("[Storage] Token delete failed:", e);
      return false;
    }
  },

  // 📝 Generic Item Methods (for other data - not sensitive)
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
      console.error(`[Storage] setItem ${key} failed:`, e);
      return false;
    }
  },

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
      console.error(`[Storage] getItem ${key} failed:`, e);
      return null;
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
      console.error(`[Storage] removeItem ${key} failed:`, e);
      return false;
    }
  },

  // 🧹 Clear all data
  clear: async () => {
    try {
      if (Platform.OS === "web") {
        localStorage.clear();
        return true;
      }

      if (!AsyncStorage) {
        AsyncStorage =
          require("@react-native-async-storage/async-storage").default;
      }

      await AsyncStorage.clear();

      // Token को भी clear करो
      if (!SecureStore) {
        SecureStore = require("expo-secure-store");
      }
      await SecureStore.deleteItemAsync("authToken");

      return true;
    } catch (e) {
      console.error("[Storage] Clear failed:", e);
      return false;
    }
  },
};

export default storage;