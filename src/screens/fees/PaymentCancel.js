import React, { useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Platform,
  StatusBar,
  ScrollView,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { FontAwesome } from "@expo/vector-icons";

const C = {
  primary: "#1a4b6d",
  primaryDark: "#0f3a4a",
  white: "#ffffff",
  danger: "#ef4444",
  dangerLight: "#fee2e2",
  text: "#1a2e3b",
  textSec: "#6b7280",
  border: "#e2e8f0",
  bg: "#fff5f5",
};

const PaymentCancel = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  const scaleAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start(() => {
      // Shake animation after appear
      Animated.sequence([
        Animated.timing(shakeAnim, {
          toValue: -10,
          duration: 60,
          useNativeDriver: true,
        }),
        Animated.timing(shakeAnim, {
          toValue: 10,
          duration: 60,
          useNativeDriver: true,
        }),
        Animated.timing(shakeAnim, {
          toValue: -10,
          duration: 60,
          useNativeDriver: true,
        }),
        Animated.timing(shakeAnim, {
          toValue: 10,
          duration: 60,
          useNativeDriver: true,
        }),
        Animated.timing(shakeAnim, {
          toValue: 0,
          duration: 60,
          useNativeDriver: true,
        }),
      ]).start();
    });
  }, []);

  return (
    <View
      style={[
        styles.root,
        { paddingTop: insets.top, paddingBottom: insets.bottom },
      ]}
    >
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View
          style={[
            styles.card,
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }, { translateY: slideAnim }],
            },
          ]}
        >
          {/* ── ERROR ICON ── */}
          <Animated.View
            style={[
              styles.iconWrap,
              { transform: [{ translateX: shakeAnim }] },
            ]}
          >
            <FontAwesome name="times-circle" size={56} color={C.danger} />
          </Animated.View>

          {/* ── TITLE ── */}
          <Text style={styles.title}>Payment Cancelled</Text>
          <View style={styles.subtitleRow}>
            <FontAwesome name="info-circle" size={13} color="#3b82f6" />
            <Text style={styles.subtitle}>
              Your payment was not completed. You can try again anytime.
            </Text>
          </View>

          {/* ── INFO BOX ── */}
          <View style={styles.infoBox}>
            <View style={styles.infoRow}>
              <Text style={styles.infoEmoji}>💡</Text>
              <Text style={styles.infoLabel}>Tip:</Text>
              <Text style={styles.infoValue}>
                Check your internet connection and try again
              </Text>
            </View>
            <View style={styles.infoDivider} />
            <View style={styles.infoRow}>
              <Text style={styles.infoEmoji}>⏰</Text>
              <Text style={styles.infoLabel}>Session:</Text>
              <Text style={styles.infoValue}>Valid for 15 minutes</Text>
            </View>
          </View>

          {/* ── ACTION BUTTONS ── */}
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={styles.retryBtn}
              onPress={() => navigation.navigate("Fees")}
              activeOpacity={0.85}
            >
              <FontAwesome name="arrow-left" size={14} color={C.white} />
              <Text style={styles.retryBtnText}>Back to Fees</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.helpBtn}
              onPress={() => navigation.navigate("Support")}
              activeOpacity={0.85}
            >
              <Text style={styles.helpBtnText}>Need Help?</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  card: {
    backgroundColor: C.white,
    borderRadius: 20,
    padding: 32,
    width: "100%",
    maxWidth: 440,
    alignItems: "center",
    shadowColor: C.danger,
    shadowOffset: { width: 0, height: 15 },
    shadowOpacity: 0.18,
    shadowRadius: 30,
    elevation: 10,
  },
  iconWrap: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: C.dangerLight,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: C.danger,
    marginBottom: 10,
    textAlign: "center",
  },
  subtitleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
    marginBottom: 24,
    paddingHorizontal: 8,
  },
  subtitle: {
    flex: 1,
    fontSize: 13,
    color: C.textSec,
    lineHeight: 20,
  },
  infoBox: {
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    padding: 14,
    width: "100%",
    marginBottom: 24,
    borderWidth: 1,
    borderColor: C.border,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
    paddingVertical: 6,
  },
  infoDivider: { height: 1, backgroundColor: C.border },
  infoEmoji: { fontSize: 14 },
  infoLabel: { fontSize: 13, fontWeight: "700", color: C.text },
  infoValue: { flex: 1, fontSize: 13, color: C.textSec },
  actionRow: {
    flexDirection: "row",
    gap: 12,
    flexWrap: "wrap",
    justifyContent: "center",
  },
  retryBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: C.primary,
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 10,
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 5,
  },
  retryBtnText: { color: C.white, fontWeight: "600", fontSize: 14 },
  helpBtn: {
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: C.primary,
    backgroundColor: C.white,
  },
  helpBtnText: { color: C.primary, fontWeight: "600", fontSize: 14 },
});

export default PaymentCancel;
