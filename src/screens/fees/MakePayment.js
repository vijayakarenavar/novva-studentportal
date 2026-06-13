import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
  Platform,
  StatusBar,
  Modal,
  useWindowDimensions,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { FontAwesome } from "@expo/vector-icons";
import api from "../../services/api";
import RazorpayCheckout from "react-native-razorpay";

// ─── COLORS ──────────────────────────────────────────────────────────────────
const C = {
  primary: "#1a4b6d",
  primaryDark: "#0f3a4a",
  accent: "#3db5e6",
  white: "#ffffff",
  bg: "#f0f4f8",
  success: "#10b981",
  danger: "#ef4444",
  warning: "#f59e0b",
  text: "#1a2e3b",
  textSec: "#5c7a8a",
  border: "#e2e8f0",
};

const showAlert = (title, message) => {
  Alert.alert(title, message);
};

const MakePayment = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  // ─── Params from navigation ───────────────────────────────────────────────
  const { installmentId, installmentName, amount, dueDate } =
    route.params || {};

  // ─── State ────────────────────────────────────────────────────────────────
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("Processing payment...");
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [selectedGateway, setSelectedGateway] = useState(null);
  const [availableGateways, setAvailableGateways] = useState([]);
  const [defaultGateway, setDefaultGateway] = useState(null);
  const [allowChoice, setAllowChoice] = useState(false);
  const [gatewaysLoading, setGatewaysLoading] = useState(true);
  const [showError, setShowError] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const isRequestInProgressRef = useRef(false);
  const sessionTimeoutRef = useRef(null);

  // ─── Validate params ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!installmentId || !installmentName) {
      showAlert(
        "Error",
        "No installment selected. Please go back and try again.",
      );
      navigation.goBack();
      return;
    }

    // 15 min session timeout
    sessionTimeoutRef.current = setTimeout(
      () => {
        showAlert(
          "Session Expired",
          "Payment session expired. Please try again.",
        );
        navigation.goBack();
      },
      15 * 60 * 1000,
    );

    return () => {
      if (sessionTimeoutRef.current) clearTimeout(sessionTimeoutRef.current);
    };
  }, []);

  // ─── Fetch available gateways ─────────────────────────────────────────────
  useEffect(() => {
    const fetchGateways = async () => {
      try {
        setGatewaysLoading(true);
        const response = await api.get("/admin/payment/gateways");
        if (response.data.success) {
          const gateways = response.data.gateways || [];
          setAvailableGateways(gateways.map((g) => g.code));
          setDefaultGateway(response.data.defaultGateway);
          setAllowChoice(response.data.allowChoice || false);
        }
      } catch (error) {
        // Default fallback
        setAvailableGateways(["razorpay"]);
        setAllowChoice(true);
      } finally {
        setGatewaysLoading(false);
      }
    };
    fetchGateways();
  }, []);

  // ─── Razorpay Handler ─────────────────────────────────────────────────────
  const handleRazorpayPayment = async () => {
    if (isRequestInProgressRef.current) return;
    if (!installmentId || !amount || amount <= 0) {
      showAlert("Error", "Invalid payment details.");
      return;
    }

    try {
      setLoading(true);
      setLoadingMessage("Initializing Razorpay...");
      isRequestInProgressRef.current = true;

      const res = await api.post("/razorpay/create-order", { installmentName });
      const { orderId, amount: orderAmount, currency, keyId } = res.data;

      if (!orderId || !keyId) {
        throw new Error("Payment configuration error. Contact administrator.");
      }

      // React Native Razorpay integration
      // Install: npm install react-native-razorpay
      // Then import RazorpayCheckout from 'react-native-razorpay';
      //const RazorpayCheckout = require("react-native-razorpay").default;

      const options = {
        description: `Fee Payment - ${installmentName}`,
        currency: currency || "INR",
        key: keyId,
        amount: orderAmount,
        order_id: orderId,
        name: "College Fee Payment",
        theme: { color: C.primary },
      };

      RazorpayCheckout.open(options)
        .then((data) => {
          setLoadingMessage("Payment successful! Confirming...");
          setTimeout(() => {
            setLoading(false);
            isRequestInProgressRef.current = false;
            navigation.navigate("PaymentSuccess", {
              paymentGateway: "RAZORPAY",
              orderId: data.razorpay_order_id,
              paymentId: data.razorpay_payment_id,
            });
          }, 1000);
        })
        .catch((error) => {
          showAlert(
            "Payment Cancelled",
            error.description || "Payment was cancelled.",
          );
          setLoading(false);
          isRequestInProgressRef.current = false;
        });
    } catch (err) {
      const errorMsg =
        err.response?.data?.error?.message ||
        err.response?.data?.message ||
        err.message ||
        "Payment initiation failed.";
      setErrorMessage(errorMsg);
      setShowError(true);
      showAlert("Payment Error", errorMsg);
      setLoading(false);
      isRequestInProgressRef.current = false;
    }
  };

  // ─── Gateway button press ─────────────────────────────────────────────────
  const handleGatewayPress = (gateway) => {
    setSelectedGateway(gateway);
    setShowConfirmModal(true);
  };

  // ─── Confirm payment ──────────────────────────────────────────────────────
  const confirmPayment = () => {
    setShowConfirmModal(false);
    if (selectedGateway === "razorpay") {
      handleRazorpayPayment();
    } else {
      showAlert(
        "Info",
        "Stripe is not supported in mobile app. Please use Razorpay.",
      );
    }
  };

  // ─── Retry ────────────────────────────────────────────────────────────────
  const handleRetry = () => {
    setShowError(false);
    setErrorMessage("");
  };

  // ─── Format date ──────────────────────────────────────────────────────────
  const formatDate = (date) => {
    if (!date) return "N/A";
    return new Date(date).toLocaleDateString("en-IN");
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={C.primaryDark} />

      {/* ── HEADER ── */}
      <View
        style={[
          styles.header,
          {
            paddingTop:
              Platform.OS === "ios"
                ? insets.top + 12
                : (StatusBar.currentHeight || 24) + 12,
          },
        ]}
      >
        <View style={styles.headerDecor1} />
        <View style={styles.headerDecor2} />
        <View style={styles.headerRow}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.goBack()}
            hitSlop={{ top: 8, left: 8, right: 8, bottom: 8 }}
          >
            <Text style={styles.backBtnText}>←</Text>
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Make Payment</Text>
            <Text style={styles.headerSub}>Secure online fee payment</Text>
          </View>
          <View style={styles.secureIcon}>
            <FontAwesome name="lock" size={14} color={C.accent} />
          </View>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 24 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── INSTALLMENT BADGE + AMOUNT ── */}
        <View style={styles.amountCard}>
          <View style={styles.installmentBadge}>
            <FontAwesome name="file-text-o" size={12} color={C.white} />
            <Text style={styles.installmentBadgeText}>{installmentName}</Text>
          </View>
          <Text style={styles.amountText}>₹{amount?.toLocaleString()}</Text>
          <Text style={styles.dueDateText}>Due on {formatDate(dueDate)}</Text>
        </View>

        {/* ── PAYMENT SUMMARY BOX ── */}
        <View style={styles.summaryBox}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Installment</Text>
            <Text style={styles.summaryValue}>{installmentName}</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Amount</Text>
            <Text
              style={[
                styles.summaryValue,
                { color: C.primary, fontWeight: "700" },
              ]}
            >
              ₹{amount?.toLocaleString()}
            </Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Status</Text>
            <View style={styles.pendingBadge}>
              <Text style={styles.pendingBadgeText}>PENDING</Text>
            </View>
          </View>
        </View>

        {/* ── PAYMENT METHOD HEADING ── */}
        <Text style={styles.sectionTitle}>Select Payment Method</Text>
        <View style={styles.sectionDivider} />

        {/* ── GATEWAYS ── */}
        {gatewaysLoading ? (
          <View style={styles.centerBox}>
            <ActivityIndicator size="large" color={C.primary} />
            <Text style={styles.loadingText}>Loading payment options...</Text>
          </View>
        ) : availableGateways.length === 0 ? (
          <View style={styles.warningBox}>
            <FontAwesome
              name="exclamation-triangle"
              size={18}
              color={C.warning}
            />
            <Text style={styles.warningText}>
              No payment gateway configured. Please contact your college
              administrator.
            </Text>
          </View>
        ) : (
          <View style={styles.gatewaysContainer}>
            {availableGateways.includes("razorpay") && (
              <TouchableOpacity
                style={styles.gatewayBtn}
                onPress={() => handleGatewayPress("razorpay")}
                disabled={loading}
                activeOpacity={0.85}
              >
                <View
                  style={[
                    styles.gatewayIconWrap,
                    { backgroundColor: C.primary },
                  ]}
                >
                  <FontAwesome name="money" size={22} color={C.white} />
                </View>
                <View style={styles.gatewayContent}>
                  <Text style={styles.gatewayName}>Razorpay</Text>
                  <Text style={styles.gatewayDesc}>
                    UPI / Cards / Wallets / Net Banking
                  </Text>
                </View>
                <View style={styles.gatewayArrow}>
                  <FontAwesome
                    name="chevron-right"
                    size={14}
                    color={C.primary}
                  />
                </View>
              </TouchableOpacity>
            )}

            {availableGateways.includes("stripe") && (
              <TouchableOpacity
                style={styles.gatewayBtn}
                onPress={() => handleGatewayPress("stripe")}
                disabled={loading}
                activeOpacity={0.85}
              >
                <View
                  style={[
                    styles.gatewayIconWrap,
                    { backgroundColor: C.accent },
                  ]}
                >
                  <FontAwesome name="credit-card" size={22} color={C.white} />
                </View>
                <View style={styles.gatewayContent}>
                  <Text style={styles.gatewayName}>Stripe</Text>
                  <Text style={styles.gatewayDesc}>
                    Card / UPI / Net Banking
                  </Text>
                </View>
                <View style={styles.gatewayArrow}>
                  <FontAwesome
                    name="chevron-right"
                    size={14}
                    color={C.primary}
                  />
                </View>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* ── SECURITY BADGES ── */}
        <View style={styles.securityRow}>
          <View style={styles.securityItem}>
            <FontAwesome name="lock" size={14} color={C.success} />
            <Text style={styles.securityText}>100% Secure</Text>
          </View>
          <View style={styles.securityItem}>
            <FontAwesome name="shield" size={14} color={C.success} />
            <Text style={styles.securityText}>PCI Certified</Text>
          </View>
          <View style={styles.securityItem}>
            <FontAwesome name="check-circle" size={14} color={C.success} />
            <Text style={styles.securityText}>Verified</Text>
          </View>
        </View>

        {/* ── ERROR STATE ── */}
        {showError && (
          <View style={styles.errorCard}>
            <FontAwesome name="times-circle" size={40} color={C.danger} />
            <Text style={styles.errorTitle}>Payment Failed</Text>
            <Text style={styles.errorMsg}>{errorMessage}</Text>
            <View style={styles.errorActions}>
              <TouchableOpacity style={styles.retryBtn} onPress={handleRetry}>
                <FontAwesome name="refresh" size={14} color={C.white} />
                <Text style={styles.retryBtnText}>Retry</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.backToFeesBtn}
                onPress={() => navigation.goBack()}
              >
                <Text style={styles.backToFeesBtnText}>Back to Fees</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>

      {/* ── LOADING OVERLAY ── */}
      {loading && (
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingCard}>
            <ActivityIndicator size="large" color={C.primary} />
            <Text style={styles.loadingCardTitle}>{loadingMessage}</Text>
            <Text style={styles.loadingCardSub}>
              Please do not close this screen
            </Text>
            <View style={styles.loadingBadges}>
              <View style={styles.loadingBadgeItem}>
                <FontAwesome name="lock" size={12} color={C.success} />
                <Text style={styles.loadingBadgeText}>SSL Secured</Text>
              </View>
              <View style={styles.loadingBadgeItem}>
                <FontAwesome name="shield" size={12} color={C.success} />
                <Text style={styles.loadingBadgeText}>PCI Compliant</Text>
              </View>
            </View>
          </View>
        </View>
      )}

      {/* ── CONFIRM MODAL ── */}
      <Modal
        visible={showConfirmModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowConfirmModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Payment Confirmation</Text>

            <View style={styles.modalInfoRow}>
              <Text style={styles.modalLabel}>Installment</Text>
              <Text style={styles.modalValue}>{installmentName}</Text>
            </View>
            <View style={styles.modalInfoRow}>
              <Text style={styles.modalLabel}>Amount</Text>
              <Text
                style={[
                  styles.modalValue,
                  { color: C.primary, fontWeight: "700" },
                ]}
              >
                ₹{amount?.toLocaleString()}
              </Text>
            </View>
            <View style={styles.modalInfoRow}>
              <Text style={styles.modalLabel}>Due Date</Text>
              <Text style={styles.modalValue}>{formatDate(dueDate)}</Text>
            </View>
            <View style={styles.modalInfoRow}>
              <Text style={styles.modalLabel}>Gateway</Text>
              <View style={styles.gatewayBadge}>
                <Text style={styles.gatewayBadgeText}>
                  {selectedGateway === "stripe" ? "Stripe" : "Razorpay"}
                </Text>
              </View>
            </View>

            <View style={styles.modalWarning}>
              <FontAwesome name="info-circle" size={14} color={C.warning} />
              <Text style={styles.modalWarningText}>
                {selectedGateway === "stripe"
                  ? "A secure payment modal will open to complete your payment."
                  : "Razorpay checkout will open. Pay via UPI, Card, or Net Banking."}
              </Text>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setShowConfirmModal(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalConfirmBtn}
                onPress={confirmPayment}
              >
                <Text style={styles.modalConfirmText}>Proceed →</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },

  // ── Header ──
  header: {
    backgroundColor: C.primary,
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderRadius: 20,
    marginHorizontal: 8,
    marginTop: 8,
    overflow: "hidden",
    position: "relative",
  },
  headerDecor1: {
    position: "absolute",
    top: -40,
    right: -40,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  headerDecor2: {
    position: "absolute",
    bottom: -20,
    left: 20,
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  headerRow: { flexDirection: "row", alignItems: "center" },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.15)",
    justifyContent: "center",
    alignItems: "center",
  },
  backBtnText: {
    color: C.white,
    fontSize: 22,
    fontWeight: "700",
    lineHeight: 26,
  },
  headerCenter: { flex: 1, paddingHorizontal: 12 },
  headerTitle: { fontSize: 16, fontWeight: "700", color: C.white },
  headerSub: { fontSize: 11, color: "rgba(255,255,255,0.7)", marginTop: 2 },
  secureIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.1)",
    justifyContent: "center",
    alignItems: "center",
  },

  // ── Scroll ──
  scroll: { flex: 1 },
  scrollContent: { padding: 16, gap: 16 },

  // ── Amount Card ──
  amountCard: {
    backgroundColor: C.white,
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    borderWidth: 1,
    borderColor: C.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  installmentBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: C.primary,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 50,
    marginBottom: 12,
  },
  installmentBadgeText: { color: C.white, fontSize: 13, fontWeight: "600" },
  amountText: {
    fontSize: 32,
    fontWeight: "700",
    color: C.text,
    marginBottom: 4,
  },
  dueDateText: { fontSize: 13, color: C.textSec },

  // ── Summary Box ──
  summaryBox: {
    backgroundColor: C.white,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(61,181,230,0.15)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
  },
  summaryDivider: { height: 1, backgroundColor: C.border },
  summaryLabel: { fontSize: 13, color: C.textSec },
  summaryValue: { fontSize: 13, color: C.text, fontWeight: "600" },
  pendingBadge: {
    backgroundColor: "#fef3c7",
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 20,
  },
  pendingBadgeText: { fontSize: 11, fontWeight: "700", color: "#92400e" },

  // ── Section ──
  sectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: C.textSec,
    textAlign: "center",
    letterSpacing: 0.5,
  },
  sectionDivider: {
    height: 3,
    width: 60,
    backgroundColor: C.accent,
    borderRadius: 2,
    alignSelf: "center",
    marginTop: 6,
  },

  // ── Gateways ──
  gatewaysContainer: { gap: 12 },
  gatewayBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.white,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1.5,
    borderColor: C.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },
  gatewayIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  gatewayContent: { flex: 1, paddingHorizontal: 14 },
  gatewayName: {
    fontSize: 15,
    fontWeight: "700",
    color: C.text,
    marginBottom: 3,
  },
  gatewayDesc: { fontSize: 12, color: C.textSec },
  gatewayArrow: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: C.bg,
    justifyContent: "center",
    alignItems: "center",
  },

  // ── Security ──
  securityRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 24,
    flexWrap: "wrap",
    backgroundColor: "rgba(16,185,129,0.05)",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(16,185,129,0.15)",
  },
  securityItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  securityText: { fontSize: 12, color: C.primary, fontWeight: "600" },

  // ── Warning ──
  warningBox: {
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-start",
    backgroundColor: "#fffbeb",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#fde68a",
  },
  warningText: { flex: 1, fontSize: 13, color: "#92400e" },

  // ── Center Box ──
  centerBox: { alignItems: "center", paddingVertical: 24, gap: 12 },
  loadingText: { fontSize: 13, color: C.textSec },

  // ── Error Card ──
  errorCard: {
    backgroundColor: C.white,
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#fca5a5",
    gap: 10,
  },
  errorTitle: { fontSize: 16, fontWeight: "700", color: C.danger },
  errorMsg: { fontSize: 13, color: C.textSec, textAlign: "center" },
  errorActions: { flexDirection: "row", gap: 12, marginTop: 8 },
  retryBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: C.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },
  retryBtnText: { color: C.white, fontWeight: "600", fontSize: 14 },
  backToFeesBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: C.textSec,
  },
  backToFeesBtnText: { color: C.textSec, fontWeight: "600", fontSize: 14 },

  // ── Loading Overlay ──
  loadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  loadingCard: {
    backgroundColor: C.white,
    borderRadius: 20,
    padding: 36,
    alignItems: "center",
    gap: 12,
    width: "80%",
    maxWidth: 320,
  },
  loadingCardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: C.text,
    textAlign: "center",
  },
  loadingCardSub: { fontSize: 12, color: C.textSec, textAlign: "center" },
  loadingBadges: { flexDirection: "row", gap: 20, marginTop: 8 },
  loadingBadgeItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  loadingBadgeText: { fontSize: 12, color: C.success, fontWeight: "600" },

  // ── Modal ──
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalCard: {
    backgroundColor: C.white,
    borderRadius: 20,
    padding: 24,
    width: "100%",
    maxWidth: 360,
    gap: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: C.text,
    marginBottom: 4,
  },
  modalInfoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  modalLabel: { fontSize: 13, color: C.textSec },
  modalValue: { fontSize: 13, color: C.text, fontWeight: "600" },
  gatewayBadge: {
    backgroundColor: C.primary,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 20,
  },
  gatewayBadgeText: { fontSize: 11, color: C.white, fontWeight: "700" },
  modalWarning: {
    flexDirection: "row",
    gap: 8,
    alignItems: "flex-start",
    backgroundColor: "#fffbeb",
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: "#fde68a",
  },
  modalWarningText: { flex: 1, fontSize: 12, color: "#92400e", lineHeight: 18 },
  modalActions: { flexDirection: "row", gap: 12, marginTop: 4 },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: C.border,
    alignItems: "center",
  },
  modalCancelText: { fontSize: 14, color: C.textSec, fontWeight: "600" },
  modalConfirmBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: C.primary,
    alignItems: "center",
  },
  modalConfirmText: { fontSize: 14, color: C.white, fontWeight: "700" },
});

export default MakePayment;
