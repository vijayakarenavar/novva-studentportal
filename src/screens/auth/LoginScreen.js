import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Animated,
  useWindowDimensions,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../../context/AuthContext";
import { FontAwesome } from "@expo/vector-icons";

// ─── RESPONSIVE SCALE ────────────────────────────────────────────────────────
const BASE_WIDTH = 390;
const useScale = () => {
  const { width } = useWindowDimensions();
  const scale = Math.min(Math.max(width / BASE_WIDTH, 0.75), 1.25);
  return (size) => Math.round(size * scale);
};

const LoginScreen = ({ navigation }) => {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const rs = useScale();

  const isLandscape = width > height;

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
          try {
            navigation.navigate("ChangePassword");
          } catch (e) {
            setError("Navigation to Change Password screen failed. Please contact support.");
          }
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
      style={[
        styles.root,
        {
          paddingLeft: insets.left,
          paddingRight: insets.right,
        },
      ]}
    >
      {/* Background orbs — dynamic width/height, landscape-safe */}
      <View style={StyleSheet.absoluteFill}>
        <View
          style={[
            styles.bgOrb1,
            {
              width: width * 0.9,
              height: width * 0.9,
              borderRadius: width * 0.45,
            },
          ]}
        />
        <View
          style={[
            styles.bgOrb2,
            {
              width: width * 0.8,
              height: width * 0.8,
              borderRadius: width * 0.4,
            },
          ]}
        />
        <View
          style={[
            styles.bgOrb3,
            {
              width: width * 0.55,
              height: width * 0.55,
              borderRadius: width * 0.275,
              top: height * 0.4,
              left: width * 0.3,
            },
          ]}
        />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: insets.top + rs(24),
            paddingBottom: insets.bottom + rs(24),
            paddingHorizontal: isLandscape ? rs(48) : rs(20),
            justifyContent: isLandscape ? "flex-start" : "center",
          },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Animated.View
          style={[
            styles.card,
            {
              opacity: fadeAnim,
              transform: [{ translateY: cardTranslate }],
              maxWidth: isLandscape ? rs(520) : rs(400),
              padding: rs(28),
              borderRadius: rs(24),
            },
          ]}
        >
          <View
            style={[
              styles.formIcon,
              {
                width: rs(42),
                height: rs(42),
                borderRadius: rs(13),
                marginBottom: rs(12),
              },
            ]}
          >
            <Text style={{ fontSize: rs(20) }}>👤</Text>
          </View>

          <Text
            style={[
              styles.formTitle,
              { fontSize: rs(24), marginBottom: rs(4) },
            ]}
          >
            Sign In
          </Text>
          <Text
            style={[styles.formSub, { fontSize: rs(13), marginBottom: rs(16) }]}
          >
            Enter your credentials to continue
          </Text>

          <View style={[styles.secureBadge, { marginBottom: rs(20) }]}>
            <View
              style={[
                styles.secureBadgeInner,
                {
                  paddingHorizontal: rs(14),
                  paddingVertical: rs(5),
                  borderRadius: rs(100),
                },
              ]}
            >
              <Text style={[styles.secureBadgeText, { fontSize: rs(10) }]}>
                🔒 SECURE LOGIN
              </Text>
            </View>
          </View>

          {error ? (
            <View
              style={[
                styles.alertError,
                {
                  borderRadius: rs(10),
                  padding: rs(12),
                  marginBottom: rs(16),
                },
              ]}
            >
              <Text style={[styles.alertText, { fontSize: rs(13) }]}>
                ⚠ {error}
              </Text>
              <TouchableOpacity
                onPress={() => setError("")}
                style={{ padding: rs(4) }}
              >
                <Text style={[styles.alertCloseText, { fontSize: rs(14) }]}>
                  ✕
                </Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {/* Landscape: 2-column form */}
          {isLandscape ? (
            <View style={[styles.twoColForm, { gap: rs(12) }]}>
              <View style={{ flex: 1 }}>
                <FieldGroup
                  label="✉ EMAIL ADDRESS"
                  focused={focusedField === "email"}
                  rs={rs}
                >
                  <TextInput
                    style={[
                      styles.input,
                      {
                        paddingHorizontal: rs(14),
                        paddingVertical: rs(11),
                        fontSize: rs(14),
                      },
                    ]}
                    value={email}
                    onChangeText={setEmail}
                    placeholder="you@example.com"
                    placeholderTextColor="#94b4c8"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    onFocus={() => setFocusedField("email")}
                    onBlur={() => setFocusedField("")}
                  />
                </FieldGroup>
              </View>
              <View style={{ flex: 1 }}>
                <FieldGroup
                  label="🔒 PASSWORD"
                  focused={focusedField === "password"}
                  rs={rs}
                  row
                >
                  <TextInput
                    style={[
                      styles.input,
                      {
                        flex: 1,
                        paddingHorizontal: rs(14),
                        paddingVertical: rs(11),
                        fontSize: rs(14),
                      },
                    ]}
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
                    style={{
                      paddingHorizontal: rs(12),
                      paddingVertical: rs(11),
                    }}
                  >
                    <FontAwesome
                      name={showPassword ? "eye" : "eye-slash"}
                      size={rs(16)}
                      color="#4a6577"
                    />
                  </TouchableOpacity>
                </FieldGroup>
              </View>
            </View>
          ) : (
            <>
              <FieldGroup
                label="✉ EMAIL ADDRESS"
                focused={focusedField === "email"}
                rs={rs}
              >
                <TextInput
                  style={[
                    styles.input,
                    {
                      paddingHorizontal: rs(14),
                      paddingVertical: rs(11),
                      fontSize: rs(14),
                    },
                  ]}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="you@example.com"
                  placeholderTextColor="#94b4c8"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  onFocus={() => setFocusedField("email")}
                  onBlur={() => setFocusedField("")}
                />
              </FieldGroup>

              <FieldGroup
                label="🔒 PASSWORD"
                focused={focusedField === "password"}
                rs={rs}
                row
              >
                <TextInput
                  style={[
                    styles.input,
                    {
                      flex: 1,
                      paddingHorizontal: rs(14),
                      paddingVertical: rs(11),
                      fontSize: rs(14),
                    },
                  ]}
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
                  style={{
                    paddingHorizontal: rs(12),
                    paddingVertical: rs(11),
                  }}
                >
                  <FontAwesome
                    name={showPassword ? "eye" : "eye-slash"}
                    size={rs(16)}
                    color="#4a6577"
                  />
                </TouchableOpacity>
              </FieldGroup>
            </>
          )}

          <TouchableOpacity
            style={[
              styles.submitBtn,
              loading && styles.submitBtnDisabled,
              {
                borderRadius: rs(12),
                paddingVertical: rs(14),
                marginTop: rs(6),
              },
            ]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={[styles.submitText, { fontSize: rs(15) }]}>
                Sign In →
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.forgotBtn, { paddingVertical: rs(12) }]}
            onPress={() => navigation.navigate("ForgotPassword")}
          >
            <Text style={[styles.forgotText, { fontSize: rs(13) }]}>
              🔒 Forgot Password?
            </Text>
          </TouchableOpacity>

          <View style={[styles.footerDivider, { marginBottom: rs(14) }]} />

          <View style={styles.footer}>
            <View style={styles.securityBadge}>
              <View style={styles.securityDot} />
              <Text style={[styles.securityText, { fontSize: rs(10) }]}>
                Secured by NOVAA
              </Text>
            </View>
          </View>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

// ─── FIELD GROUP HELPER ──────────────────────────────────────────────────────
function FieldGroup({ label, focused, rs, row, children }) {
  return (
    <View style={{ marginBottom: rs(16) }}>
      <Text
        style={[
          styles.label,
          focused && styles.labelFocus,
          { fontSize: rs(10), marginBottom: rs(7) },
        ]}
      >
        {label}
      </Text>
      <View
        style={[
          styles.inputWrap,
          focused && styles.inputWrapFocus,
          { borderRadius: rs(10) },
          row && { flexDirection: "row", alignItems: "center" },
        ]}
      >
        {children}
      </View>
      {focused && (
        <View style={[styles.inputBar, { height: rs(2), marginTop: rs(2) }]} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#060e17",
  },
  bgOrb1: {
    position: "absolute",
    backgroundColor: "rgba(26,75,109,0.08)",
    top: -150,
    left: -100,
  },
  bgOrb2: {
    position: "absolute",
    backgroundColor: "rgba(26,75,109,0.06)",
    bottom: -100,
    right: -80,
  },
  bgOrb3: {
    position: "absolute",
    backgroundColor: "rgba(26,75,109,0.04)",
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: "center",
  },
  card: {
    width: "100%",
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "rgba(26,75,109,0.18)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.5,
    shadowRadius: 40,
    elevation: 20,
  },
  formIcon: {
    backgroundColor: "rgba(26,75,109,0.12)",
    borderWidth: 1,
    borderColor: "rgba(26,75,109,0.25)",
    justifyContent: "center",
    alignItems: "center",
  },
  formTitle: {
    fontWeight: "700",
    color: "#1a2e3b",
    letterSpacing: -0.5,
  },
  formSub: {
    color: "#5c7a8a",
  },
  secureBadge: { alignItems: "center" },
  secureBadgeInner: {
    borderWidth: 1,
    borderColor: "rgba(26,75,109,0.3)",
    backgroundColor: "rgba(26,75,109,0.07)",
  },
  secureBadgeText: {
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
  },
  alertText: {
    flex: 1,
    color: "#dc2626",
    fontWeight: "500",
  },
  alertCloseText: { color: "#dc2626" },
  twoColForm: {
    flexDirection: "row",
  },
  label: {
    fontWeight: "700",
    color: "#4a6577",
    letterSpacing: 1.2,
  },
  labelFocus: { color: "#1a4b6d" },
  inputWrap: {
    backgroundColor: "#f4f8fb",
    borderWidth: 1.5,
    borderColor: "#c8d8e8",
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
    color: "#1a2e3b",
  },
  inputBar: {
    backgroundColor: "#1a4b6d",
    borderRadius: 1,
  },
  submitBtn: {
    backgroundColor: "#1a4b6d",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#1a4b6d",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 8,
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitText: {
    color: "#fff",
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  forgotBtn: {
    alignItems: "center",
    paddingHorizontal: 10,
    alignSelf: "center",
  },
  forgotText: {
    color: "#5c7a8a",
    fontWeight: "500",
  },
  footerDivider: {
    height: 1,
    backgroundColor: "#e4eef4",
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  securityBadge: {
    flexDirection: "row",
    alignItems: "center",
  },
  securityDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#10b981",
    marginRight: 5,
  },
  securityText: {
    color: "#8da8b8",
    letterSpacing: 0.5,
  },
});

export default LoginScreen;
