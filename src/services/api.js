import axios from "axios";
import { Platform } from "react-native";
import storage from "../utils/storage";

// ─── BASE URL ─────────────────────────────────────────────────────────────────
// Android Emulator  → 10.0.2.2  (PC का localhost)
// iOS Simulator     → 127.0.0.1
// Real Device       → PC चा actual IP (e.g. 192.168.1.5)
// Web (Expo Web)    → localhost
// ─────────────────────────────────────────────────────────────────────────────

const getBaseUrl = () => {
  if (Platform.OS === "android") return "http://10.0.2.2:5000/api";
  if (Platform.OS === "ios") return "http://127.0.0.1:5000/api";
  return "http://localhost:5000/api"; // expo web
};

// ─── REAL DEVICE साठी ─────────────────────────────────────────────────────────
// Windows: CMD → ipconfig → IPv4 Address बघा
// खाली IP तुमचा टाका:
// const BASE_URL = "http://192.168.1.5:5000/api";
// ─────────────────────────────────────────────────────────────────────────────

const BASE_URL = getBaseUrl();

const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: true, // React Native मध्ये cookies नाही, token वापरतो
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
  },
});

// ─── REQUEST INTERCEPTOR ──────────────────────────────────────────────────────
// प्रत्येक request ला token attach करतो
api.interceptors.request.use(
  async (config) => {
    try {
      const token = await storage.getItem("authToken");
      if (token) {
        config.headers["Authorization"] = `Bearer ${token}`;
      }
    } catch (e) {
      // AsyncStorage error - ignore
    }
    console.log(
      `[API] ${config.method?.toUpperCase()} → ${config.baseURL}${config.url}`,
    );
    return config;
  },
  (error) => Promise.reject(error),
);

// ─── RESPONSE INTERCEPTOR ─────────────────────────────────────────────────────
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error.response?.status;
    const url = error.config?.url;
    console.log(`[API ERROR] ${status} on ${url}`, error.message);

    // 401 आला म्हणजे token expire - clear करा
    if (status === 401 && url !== "/auth/login") {
      await storage.removeItem("authToken");
      delete api.defaults.headers.common["Authorization"];
    }

    return Promise.reject(error);
  },
);

export default api;
