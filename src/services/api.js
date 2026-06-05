import axios from "axios";
import { Platform } from "react-native";
import Constants from "expo-constants";
import storage from "../utils/storage";

const API_BASE_URL =
  Constants.expoConfig?.extra?.API_BASE_URL ||
  "http://localhost:5000/api";

const getBaseUrl = () => {
  if (Platform.OS === "android" && __DEV__) {
    return "http://10.0.2.2:5000/api";
  }
  return API_BASE_URL;
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
  (error) => Promise.reject(error)
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

    if (__DEV__) {
      console.log(`[API ERROR] ${status}`, error.message);
    }

    if (status === 401) {
      try {
        await storage.deleteToken();
        delete api.defaults.headers.common["Authorization"];
      } catch (e) {}
    }

    return Promise.reject({
      status,
      message:
        error.response?.data?.message ||
        error.message ||
        "Something went wrong",
    });
  }
);

export const apiClient = {
  login: (email, password) =>
    api.post("/auth/login", { email, password }),

  register: (data) =>
    api.post("/auth/register", data),

  logout: () =>
    api.post("/auth/logout"),

  getProfile: () =>
    api.get("/auth/me"),

  updateProfile: (data) =>
    api.put("/user/profile", data),

  deleteAccount: () =>
    api.delete("/user/account"),

  getDashboard: () =>
    api.get("/dashboard/student"),

  getAttendance: () =>
    api.get("/attendance/student"),

  getStudentFees: () =>
    api.get("/fees/student"),

  getTimetable: () =>
    api.get("/timetable/student"),

  getNotifications: () =>
    api.get("/notifications"),

  markNotificationRead: (id) =>
    api.put(`/notifications/${id}/read`),

  uploadDocument: (formData) =>
    api.post("/documents/upload", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),

  getDocuments: () =>
    api.get("/documents"),

  downloadDocument: (id) =>
    api.get(`/documents/${id}/download`),
};

export default api;