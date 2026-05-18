import { Dimensions, Platform } from "react-native";

export const COLORS = {
  // Existing colors (same ठेवले)
  primary: "#1a4b6d",
  primaryLight: "#2d6f8f",
  secondary: "#64748b",
  success: "#28a745",
  successLight: "#d4edda",
  danger: "#dc3545",
  dangerLight: "#f8d7da",
  warning: "#ffc107",
  warningLight: "#fff3cd",
  info: "#0ea5e9",
  light: "#f8fafc",
  dark: "#1e293b",
  white: "#ffffff",
  gray: "#6b7280",
  background: "#f5f7fa",
  card: "#ffffff",
  text: "#1a2e3b",
  textSecondary: "#4a5568",
  textMuted: "#94a3b8",
  border: "#e2e8f0",
  borderLight: "#f0f4f8",

  // Icon colors
  iconBlueBg: "#e3f2fd",
  iconGreenBg: "#d4edda",
  iconPurpleBg: "#ede7f6",
  iconOrangeBg: "#fff3e0",
};

export const SIZES = {
  base: 8,
  small: 12,
  medium: 16,
  large: 20,
  xlarge: 24,
  xxlarge: 32,
  radius: 12,
  radiusLg: 16,
  ...Dimensions.get("window"),
};

export const FONTS = {
  regular: "System",
  medium: "System",
  bold: "System",
};

// ✅ Web-compatible SHADOWS using Platform.select
export const SHADOWS = Platform.select({
  web: {
    small: {
      boxShadow: "0px 2px 4px rgba(0, 0, 0, 0.06)",
    },
    medium: {
      boxShadow: "0px 4px 8px rgba(0, 0, 0, 0.08)",
    },
    large: {
      boxShadow: "0px 8px 16px rgba(0, 0, 0, 0.12)",
    },
  },
  default: {
    small: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 4,
      elevation: 2,
    },
    medium: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 8,
      elevation: 4,
    },
    large: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.12,
      shadowRadius: 16,
      elevation: 8,
    },
  },
});
