import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
  StatusBar,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { FontAwesome } from "@expo/vector-icons";
import api from "../../services/api";

const C = {
  primary: "#1a4b6d",
  primaryDark: "#0f3a4a",
  white: "#ffffff",
  bg: "#eef2f7",
  success: "#16a34a",
  successLight: "#e6f9f0",
  danger: "#ef4444",
  dangerLight: "#fee2e2",
  text: "#1a2e3b",
  textSec: "#6b7280",
  border: "#f1f5f9",
  accent: "#3db5e6",
};

const PaymentSuccess = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();

  const {
    paymentGateway = "razorpay",
    orderId,
    paymentId,
  } = route.params || {};

  const [loading, setLoading] = useState(true);
  const [payment, setPayment] = useState(null);
  const [error, setError] = useState(null);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  // ─── Poll for payment status ───────────────────────────────────────────────
  useEffect(() => {
    if (!orderId && !paymentId) {
      setError("No payment information provided.");
      setLoading(false);
      return;
    }

    const maxAttempts = 30;
    let attempts = 0;

    const interval = setInterval(async () => {
      attempts++;
      try {
        const queryParam =
          paymentGateway === "razorpay"
            ? `orderId=${orderId}&gateway=razorpay`
            : `paymentId=${paymentId}`;

        const res = await api.get(`/student/payments/status?${queryParam}`);

        if (res.data.status === "PAID") {
          clearInterval(interval);
          setPayment({
            ...res.data,
            paymentGateway: paymentGateway?.toUpperCase(),
          });
          setLoading(false);
          // Animate in
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
          ]).start();
        } else if (attempts >= maxAttempts) {
          clearInterval(interval);
          setError(
            "Payment is still processing. Please check back in a few moments.",
          );
          setLoading(false);
        }
      } catch (err) {
        if (attempts >= maxAttempts) {
          clearInterval(interval);
          setError(
            err.response?.data?.message || "Payment confirmation timeout.",
          );
          setLoading(false);
        }
      }
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  // ─── Loading ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={styles.loadingRoot}>
        <StatusBar barStyle="dark-content" backgroundColor={C.bg} />
        <View style={styles.loadingCard}>
          <ActivityIndicator size="large" color={C.primary} />
          <Text style={styles.loadingTitle}>Confirming your payment...</Text>
          <Text style={styles.loadingSubtitle}>
            Please do not close this screen
          </Text>
        </View>
      </View>
    );
  }

  // ─── Error ─────────────────────────────────────────────────────────────────
  if (error) {
    return (
      <View
        style={[
          styles.errorRoot,
          { paddingTop: insets.top, paddingBottom: insets.bottom },
        ]}
      >
        <StatusBar barStyle="dark-content" backgroundColor={C.dangerLight} />
        <View style={styles.errorCard}>
          <View style={styles.errorIconWrap}>
            <FontAwesome name="times-circle" size={50} color={C.danger} />
          </View>
          <Text style={styles.errorTitle}>Payment Failed</Text>
          <Text style={styles.errorMsg}>{error}</Text>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.navigate("Fees")}
          >
            <FontAwesome name="arrow-left" size={14} color={C.white} />
            <Text style={styles.backBtnText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ─── Success ───────────────────────────────────────────────────────────────
  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 24 },
        ]}
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
          {/* ── SUCCESS ICON ── */}
          <View style={styles.successIconWrap}>
            <FontAwesome name="check-circle" size={44} color={C.success} />
          </View>
          <Text style={styles.successTitle}>Payment Successful</Text>
          <Text style={styles.successSubtitle}>
            Your payment has been processed securely.
          </Text>

          {/* ── GATEWAY BADGE ── */}
          {payment?.paymentGateway && (
            <View
              style={[
                styles.gatewayBadge,
                payment.paymentGateway === "RAZORPAY"
                  ? styles.gatewayRazorpay
                  : styles.gatewayStripe,
              ]}
            >
              <FontAwesome name="credit-card" size={12} color={C.white} />
              <Text style={styles.gatewayBadgeText}>
                {payment.paymentGateway}
              </Text>
            </View>
          )}

          {/* ── INSTALLMENT INFO ── */}
          <View style={styles.infoBox}>
            <InfoRow label="Installment" value={payment?.installment?.name} />
            <InfoRow
              label="Amount Paid"
              value={`₹${payment?.installment?.amount?.toLocaleString()}`}
              valueStyle={{ color: C.success, fontWeight: "700" }}
            />
            <InfoRow
              label="Paid On"
              value={
                payment?.installment?.paidAt
                  ? new Date(payment.installment.paidAt).toLocaleString("en-IN")
                  : "N/A"
              }
            />
            <InfoRow
              label="Transaction ID"
              value={payment?.installment?.transactionId || "N/A"}
              valueStyle={{ color: "#3b82f6", fontSize: 12 }}
            />
          </View>

          {/* ── SUMMARY GRID ── */}
          <View style={styles.summaryGrid}>
            <View style={[styles.summaryBox, { backgroundColor: "#e0f2fe" }]}>
              <Text style={styles.summaryVal}>
                ₹{payment?.totalFee?.toLocaleString()}
              </Text>
              <Text style={styles.summaryLabel}>Total Fee</Text>
            </View>
            <View style={[styles.summaryBox, { backgroundColor: "#dcfce7" }]}>
              <Text style={[styles.summaryVal, { color: C.success }]}>
                ₹{payment?.paidAmount?.toLocaleString()}
              </Text>
              <Text style={styles.summaryLabel}>Total Paid</Text>
            </View>
            <View
              style={[styles.summaryBox, { backgroundColor: C.dangerLight }]}
            >
              <Text style={[styles.summaryVal, { color: C.danger }]}>
                ₹{payment?.remainingAmount?.toLocaleString()}
              </Text>
              <Text style={styles.summaryLabel}>Remaining</Text>
            </View>
          </View>

          {/* ── ACTION BUTTONS ── */}
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={styles.outlineBtn}
              onPress={() => navigation.navigate("Fees")}
              activeOpacity={0.85}
            >
              <FontAwesome name="arrow-left" size={13} color={C.primary} />
              <Text style={styles.outlineBtnText}>Back to Fees</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={() =>
                navigation.navigate("FeeReceipt", {
                  installmentId: payment?.installment?._id,
                })
              }
              activeOpacity={0.85}
            >
              <FontAwesome name="file-text-o" size={13} color={C.white} />
              <Text style={styles.primaryBtnText}>View Receipt</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </ScrollView>
    </View>
  );
};

// ─── Helper ──────────────────────────────────────────────────────────────────
const InfoRow = ({ label, value, valueStyle }) => (
  <View style={infoStyles.row}>
    <Text style={infoStyles.label}>{label}</Text>
    <Text style={[infoStyles.value, valueStyle]}>{value || "N/A"}</Text>
  </View>
);
const infoStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  label: { fontSize: 13, color: "#6b7280" },
  value: {
    fontSize: 13,
    color: "#1a2e3b",
    fontWeight: "600",
    flexShrink: 1,
    textAlign: "right",
    maxWidth: "60%",
  },
});

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  scrollContent: { flexGrow: 1, alignItems: "center", padding: 20 },

  // Loading
  loadingRoot: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: C.bg,
    padding: 24,
  },
  loadingCard: {
    backgroundColor: C.white,
    borderRadius: 20,
    padding: 36,
    alignItems: "center",
    gap: 12,
    width: "85%",
    maxWidth: 320,
  },
  loadingTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: C.text,
    textAlign: "center",
  },
  loadingSubtitle: { fontSize: 12, color: C.textSec, textAlign: "center" },

  // Error
  errorRoot: {
    flex: 1,
    backgroundColor: C.dangerLight,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  errorCard: {
    backgroundColor: C.white,
    borderRadius: 20,
    padding: 32,
    alignItems: "center",
    width: "100%",
    maxWidth: 400,
    gap: 10,
  },
  errorIconWrap: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: C.dangerLight,
    justifyContent: "center",
    alignItems: "center",
  },
  errorTitle: { fontSize: 18, fontWeight: "700", color: C.danger },
  errorMsg: { fontSize: 13, color: C.textSec, textAlign: "center" },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: C.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 6,
  },
  backBtnText: { color: C.white, fontWeight: "600", fontSize: 14 },

  // Success Card
  card: {
    backgroundColor: C.white,
    borderRadius: 20,
    padding: 28,
    width: "100%",
    maxWidth: 500,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.07,
    shadowRadius: 20,
    elevation: 6,
  },
  successIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: C.successLight,
    justifyContent: "center",
    alignItems: "center",
    alignSelf: "center",
    marginBottom: 14,
  },
  successTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: C.text,
    textAlign: "center",
    marginBottom: 6,
  },
  successSubtitle: {
    fontSize: 13,
    color: C.textSec,
    textAlign: "center",
    marginBottom: 16,
  },

  // Gateway Badge
  gatewayBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "center",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 20,
  },
  gatewayRazorpay: { backgroundColor: "#3b82f6" },
  gatewayStripe: { backgroundColor: "#635bff" },
  gatewayBadgeText: {
    fontSize: 12,
    color: C.white,
    fontWeight: "700",
    letterSpacing: 0.5,
  },

  // Info Box
  infoBox: { marginBottom: 20 },

  // Summary Grid
  summaryGrid: { flexDirection: "row", gap: 10, marginBottom: 24 },
  summaryBox: { flex: 1, borderRadius: 12, padding: 12, alignItems: "center" },
  summaryVal: {
    fontSize: 15,
    fontWeight: "700",
    color: C.text,
    marginBottom: 4,
  },
  summaryLabel: { fontSize: 11, color: C.textSec },

  // Action Buttons
  actionRow: { flexDirection: "row", gap: 12 },
  outlineBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: C.border,
  },
  outlineBtnText: { fontSize: 13, color: C.primary, fontWeight: "600" },
  primaryBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: C.primary,
  },
  primaryBtnText: { fontSize: 13, color: C.white, fontWeight: "600" },
});

export default PaymentSuccess;
