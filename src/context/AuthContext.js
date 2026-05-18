import { createContext, useContext, useEffect, useState } from "react";
import storage from "../utils/storage";
import api from "../services/api";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // ─── LOGIN ────────────────────────────────────────────────────────────────
  const login = async (credentials) => {
    try {
      const res = await api.post("/auth/login", credentials);

      // Token save करा (backend JWT पाठवत असेल तर)
      const token = res.data.token || res.data.accessToken || null;
      if (token) {
        await storage.setItem("authToken", token);
        // api instance ला पण लगेच set करा
        api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
      }

      // User info
      const userInfo = res.data.user || {
        id: res.data.id,
        role: res.data.role,
        college_id: res.data.college_id,
      };

      // /auth/me ने fresh profile घ्या
      try {
        const profileRes = await api.get("/auth/me");
        const profileData = profileRes.data.data || profileRes.data;
        setUser({
          id: profileData.id,
          role: profileData.role,
          college_id: profileData.college_id || null,
          email: profileData.email || null,
          name: profileData.name || null,
        });
      } catch (profileError) {
        // /auth/me नाही चालले तरी login success मानतो
        setUser({
          id: userInfo.id,
          role: userInfo.role,
          college_id: userInfo.college_id || null,
          email: userInfo.email || null,
          name: userInfo.name || null,
        });
      }

      return { success: true, user: userInfo };
    } catch (error) {
      const errorData = error?.response?.data || {};
      return {
        success: false,
        message:
          errorData.message || errorData.error?.message || "Login failed",
        code: errorData.code || errorData.error?.code || null,
      };
    }
  };

  // ─── LOGOUT ───────────────────────────────────────────────────────────────
  const logout = async () => {
    try {
      await api.post("/auth/logout");
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      // Token clear करा
      await storage.removeItem("authToken");
      delete api.defaults.headers.common["Authorization"];
      setUser(null);
    }
  };

  // ─── APP START - TOKEN CHECK ──────────────────────────────────────────────
  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        // AsyncStorage मधून token घ्या
        const token = await storage.getItem("authToken");

        if (token) {
          // Token असेल तर api ला set करा
          api.defaults.headers.common["Authorization"] = `Bearer ${token}`;

          // Server वर verify करा
          const res = await api.get("/auth/me");
          const profileData = res.data.data || res.data;

          setUser({
            id: profileData.id,
            role: profileData.role,
            college_id: profileData.college_id || null,
            email: profileData.email || null,
            name: profileData.name || null,
          });
        } else {
          // Token नाही → logout state
          setUser(null);
        }
      } catch (error) {
        if (error.response?.status !== 401) {
          console.error(
            "Auth check error:",
            error.response?.status || error.message,
          );
        }
        // Token invalid असेल तर clear करा
        await storage.removeItem("authToken");
        delete api.defaults.headers.common["Authorization"];
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    checkAuthStatus();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        logout,
        isAuthenticated: Boolean(user),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
