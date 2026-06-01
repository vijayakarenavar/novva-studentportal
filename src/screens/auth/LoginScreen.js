import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Animated,
  Dimensions,
} from "react-native";
import { useAuth } from "../../context/AuthContext";
import { FontAwesome } from "@expo/vector-icons";

const { width, height } = Dimensions.get("window");

const LoginScreen = ({ navigation }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState("");
  const [error, setError] = useState("");

  const { login } = useAuth();

  const cardAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(cardAnim, {
        toValue: 1,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleLogin = async () => {
    if (!email || !password) {
      setError("All fields are required");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const result = await login({ email, password });
      if (!result.success) {
        if (result.code === "MUST_CHANGE_PASSWORD") {
          navigation.navigate("ChangePassword");
          return;
        }
        const msg = result.message || "Invalid credentials";
        if (msg.includes("awaiting admin approval")) {
          setError("⏳ Your account is awaiting admin approval.");
        } else if (
          msg.includes("deactivated") ||
          result.code === "ACCOUNT_DEACTIVATED"
        ) {
          setError(
            "🚫 Your account has been deactivated. Contact administrator.",
          );
        } else {
          setError(msg);
        }
      }
    } catch (e) {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const cardTranslate = cardAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [40, 0],
  });

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.root}
    >
      <View style={styles.bg}>
        <View style={styles.bgOrb1} />
        <View style={styles.bgOrb2} />
        <View style={styles.bgOrb3} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Animated.View
          style={[
            styles.card,
            {
              opacity: fadeAnim,
              transform: [{ translateY: cardTranslate }],
            },
          ]}
        >
          <View style={styles.formIcon}>
            <Text style={styles.formIconText}>👤</Text>
          </View>

          <Text style={styles.formTitle}>Sign In</Text>
          <Text style={styles.formSub}>Enter your credentials to continue</Text>

          <View style={styles.secureBadge}>
            <View style={styles.secureBadgeInner}>
              <Text style={styles.secureBadgeText}>🔒 SECURE LOGIN</Text>
            </View>
          </View>

          {error ? (
            <View style={styles.alertError}>
              <Text style={styles.alertText}>⚠ {error}</Text>
              <TouchableOpacity
                onPress={() => setError("")}
                style={styles.alertClose}
              >
                <Text style={styles.alertCloseText}>✕</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          <View style={styles.fieldGroup}>
            <Text
              style={[
                styles.label,
                focusedField === "email" && styles.labelFocus,
              ]}
            >
              ✉ EMAIL ADDRESS
            </Text>
            <View
              style={[
                styles.inputWrap,
                focusedField === "email" && styles.inputWrapFocus,
              ]}
            >
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="you@example.com"
                placeholderTextColor="#94b4c8"
                keyboardType="email-address"
                autoCapitalize="none"
                onFocus={() => setFocusedField("email")}
                onBlur={() => setFocusedField("")}
              />
            </View>
            {focusedField === "email" && <View style={styles.inputBar} />}
          </View>

          <View style={styles.fieldGroup}>
            <Text
              style={[
                styles.label,
                focusedField === "password" && styles.labelFocus,
              ]}
            >
              🔒 PASSWORD
            </Text>
            <View
              style={[
                styles.inputWrap,
                focusedField === "password" && styles.inputWrapFocus,
              ]}
            >
              <TextInput
                style={[styles.input, { flex: 1 }]}
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••••"
                placeholderTextColor="#94b4c8"
                secureTextEntry={!showPassword}
                onFocus={() => setFocusedField("password")}
                onBlur={() => setFocusedField("")}
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                style={styles.eyeBtn}
              >
                <FontAwesome
                  name={showPassword ? "eye" : "eye-slash"}
                  size={16}
                  color="#4a6577"
                />
              </TouchableOpacity>
            </View>
            {focusedField === "password" && <View style={styles.inputBar} />}
          </View>

          <TouchableOpacity
            style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.submitText}>Sign In →</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.forgotBtn}
            onPress={() => navigation.navigate("ForgotPassword")}
          >
            <Text style={styles.forgotText}>🔒 Forgot Password?</Text>
          </TouchableOpacity>

          <View style={styles.footerDivider} />

          <View style={styles.footer}>
            <View style={styles.securityBadge}>
              <View style={styles.securityDot} />
              <Text style={styles.securityText}>Secured by NOVAA</Text>
            </View>
          </View>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#060e17",
  },
  bg: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  bgOrb1: {
    position: "absolute",
    width: 400,
    height: 400,
    borderRadius: 200,
    backgroundColor: "rgba(26,75,109,0.08)",
    top: -150,
    left: -100,
  },
  bgOrb2: {
    position: "absolute",
    width: 350,
    height: 350,
    borderRadius: 175,
    backgroundColor: "rgba(26,75,109,0.06)",
    bottom: -100,
    right: -80,
  },
  bgOrb3: {
    position: "absolute",
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: "rgba(26,75,109,0.04)",
    top: height * 0.4,
    left: width * 0.3,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    paddingVertical: 40,
  },
  card: {
    width: "100%",
    maxWidth: 400,
    backgroundColor: "#ffffff",
    borderRadius: 24,
    padding: 28,
    borderWidth: 1,
    borderColor: "rgba(26,75,109,0.18)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.5,
    shadowRadius: 40,
    elevation: 20,
  },
  formIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: "rgba(26,75,109,0.12)",
    borderWidth: 1,
    borderColor: "rgba(26,75,109,0.25)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  formIconText: { fontSize: 20 },
  formTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1a2e3b",
    marginBottom: 4,
    letterSpacing: -0.5,
  },
  formSub: {
    fontSize: 13,
    color: "#5c7a8a",
    marginBottom: 16,
  },
  secureBadge: {
    alignItems: "center",
    marginBottom: 20,
  },
  secureBadgeInner: {
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: "rgba(26,75,109,0.3)",
    backgroundColor: "rgba(26,75,109,0.07)",
  },
  secureBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#1a4b6d",
    letterSpacing: 1.5,
  },
  alertError: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(239,68,68,0.07)",
    borderWidth: 1,
    borderColor: "rgba(239,68,68,0.2)",
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  alertText: {
    flex: 1,
    fontSize: 13,
    color: "#dc2626",
    fontWeight: "500",
  },
  alertClose: { padding: 4 },
  alertCloseText: { color: "#dc2626", fontSize: 14 },
  fieldGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 10,
    fontWeight: "700",
    color: "#4a6577",
    marginBottom: 7,
    letterSpacing: 1.2,
  },
  labelFocus: { color: "#1a4b6d" },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f4f8fb",
    borderWidth: 1.5,
    borderColor: "#c8d8e8",
    borderRadius: 10,
    overflow: "hidden",
  },
  inputWrapFocus: {
    borderColor: "#1a4b6d",
    backgroundColor: "#e8f0f6",
    shadowColor: "#1a4b6d",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 2,
  },
  input: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 14,
    color: "#1a2e3b",
  },
  inputBar: {
    height: 2,
    backgroundColor: "#1a4b6d",
    borderRadius: 1,
    marginTop: 2,
  },
  eyeBtn: {
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  eyeIcon: { fontSize: 16 },
  submitBtn: {
    backgroundColor: "#1a4b6d",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 6,
    shadowColor: "#1a4b6d",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 8,
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  forgotBtn: {
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 10,
    alignSelf: "center",
  },
  forgotText: {
    fontSize: 13,
    color: "#5c7a8a",
    fontWeight: "500",
  },
  footerDivider: {
    height: 1,
    backgroundColor: "#e4eef4",
    marginBottom: 14,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  securityBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  securityDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#10b981",
    marginRight: 5,
  },
  securityText: {
    fontSize: 10,
    color: "#8da8b8",
    letterSpacing: 0.5,
  },
  homeLink: {
    fontSize: 12,
    color: "#1a4b6d",
    fontWeight: "600",
  },
});

export default LoginScreen;
