import axios from "axios";
import { Platform } from "react-native";
import storage from "../utils/storage";

const getBaseUrl = () => {
  if (__DEV__) {
    if (Platform.OS === "android") return "http://10.0.2.2:5000/api";
    if (Platform.OS === "ios") return "http://127.0.0.1:5000/api";
    return "http://localhost:5000/api";
  }
  return "https://edu-novaa.in/api";
};

const BASE_URL = getBaseUrl();

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use(
  async (config) => {
    try {
      const token = await storage.getToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (err) {}

    if (__DEV__) {
      console.log(`[API] ${config.method?.toUpperCase()} → ${config.url}`);
    }
    return config;
  },
  (error) => Promise.reject(error),
);

api.interceptors.response.use(
  (response) => {
    if (__DEV__) {
      console.log(`[API SUCCESS] ${response.status} ← ${response.config.url}`);
    }
    return response;
  },
  async (error) => {
    const status = error.response?.status;
    const url = error.config?.url;

    if (__DEV__) {
      console.log(`[API ERROR] ${status}`, error.message);
    }

    // Clear token on 401 (except login endpoint)
    if (status === 401 && url !== "/auth/login") {
      await storage.deleteToken();
      delete api.defaults.headers.common["Authorization"];
    }

    return Promise.reject({
      status,
      message:
        error.response?.data?.message ||
        error.message ||
        "Something went wrong",
    });
  },
);

export default api;
