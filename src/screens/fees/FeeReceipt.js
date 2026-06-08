import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Share,
  Platform,
  StatusBar,
  Animated,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { FontAwesome } from "@expo/vector-icons";
import api from "../../services/api";

const C = {
  primary: "#1a4b6d",
  primaryDark: "#0f3a4a",
  white: "#ffffff",
  bg: "#f0f4f8",
  success: "#16a34a",
  successLight: "#e6f9f0",
  danger: "#ef4444",
  warning: "#f59e0b",
  text: "#1a2e3b",
  textSec: "#64748b",
  border: "#e2e8f0",
};

const FeeReceipt = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();

  const { installmentId } = route.params || {};

  const [receipt, setReceipt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  // ─── Fetch receipt ─────────────────────────────────────────────────────────
  const fetchReceipt = async () => {
    if (!installmentId) {
      setError({
        message: "Payment ID is missing. Please go back and try again.",
      });
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const res = await api.get(`/student/payments/receipt/${installmentId}`);

      if (!res.data) throw new Error("Invalid response from server");

      setReceipt(res.data);

      Animated.parallel([
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
    } catch (err) {
      let msg = "Unable to fetch receipt.";
      if (err.response?.status === 404) msg = "Receipt not found.";
      else if (err.response?.status === 403)
        msg = "You don't have permission to view this receipt.";
      else if (err.response?.status === 401)
        msg = "Session expired. Please login again.";
      else if (err.message) msg = err.message;
      setError({ message: msg, statusCode: err.response?.status });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReceipt();
  }, [installmentId]);

  const handleRetry = async () => {
    if (retryCount >= 3) return;
    setIsRetrying(true);
    setRetryCount((prev) => prev + 1);
    await fetchReceipt();
    setIsRetrying(false);
  };

  // ─── Share receipt ─────────────────────────────────────────────────────────
  const handleShare = async () => {
    if (!receipt) return;
    try {
      await Share.share({
        message:
          `Fee Payment Receipt\n\n` +
          `College: ${receipt.college?.name || "N/A"}\n` +
          `Student: ${receipt.student?.name || "N/A"}\n` +
          `Installment: ${receipt.installmentName || "N/A"}\n` +
          `Amount: ₹${receipt.amount?.toLocaleString() || "N/A"}\n` +
          `Transaction ID: ${receipt.transactionId || "N/A"}\n` +
          `Paid On: ${receipt.paidAt ? new Date(receipt.paidAt).toLocaleString("en-IN") : "N/A"}\n` +
          `Status: ${receipt.status || "PAID"}`,
        title: "Fee Payment Receipt",
      });
    } catch (e) {}
  };

  // ─── Payment method label ──────────────────────────────────────────────────
  const getPaymentMethod = () => {
    const gateway = receipt?.paymentGateway || "STRIPE";
    const mode = receipt?.paymentMode || "ONLINE";
    if (gateway === "OFFLINE") {
      const modes = {
        CASH: "💵 Cash",
        CHEQUE: "📝 Cheque",
        DD: "🏦 Demand Draft",
      };
      return modes[mode] || "💵 Cash";
    }
    const gateways = {
      STRIPE: "💳 Card (Stripe)",
      RAZORPAY: "📱 UPI/Card (Razorpay)",
      MOCK: "🧪 Mock Payment",
    };
    return gateways[gateway] || "💳 Card";
  };

  // ─── Loading ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={styles.loadingRoot}>
        <StatusBar barStyle="dark-content" backgroundColor={C.bg} />
        <ActivityIndicator size="large" color={C.primary} />
        <Text style={styles.loadingText}>Loading Receipt...</Text>
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
        <StatusBar barStyle="dark-content" backgroundColor={C.bg} />
        <View style={styles.errorCard}>
          <FontAwesome
            name="exclamation-triangle"
            size={48}
            color={C.warning}
          />
          <Text style={styles.errorTitle}>Unable to Load Receipt</Text>
          <Text style={styles.errorMsg}>{error.message}</Text>
          <View style={styles.errorActions}>
            {retryCount < 3 && (
              <TouchableOpacity
                style={[styles.retryBtn, isRetrying && { opacity: 0.6 }]}
                onPress={handleRetry}
                disabled={isRetrying}
              >
                {isRetrying ? (
                  <ActivityIndicator size="small" color={C.white} />
                ) : (
                  <>
                    <FontAwesome name="refresh" size={13} color={C.white} />
                    <Text style={styles.retryBtnText}>Retry</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={styles.backBtn}
              onPress={() => navigation.goBack()}
            >
              <Text style={styles.backBtnText}>← Back to Fees</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  // ─── Empty ─────────────────────────────────────────────────────────────────
  if (!receipt) {
    return (
      <View
        style={[
          styles.errorRoot,
          { paddingTop: insets.top, paddingBottom: insets.bottom },
        ]}
      >
        <View style={styles.errorCard}>
          <FontAwesome name="file-text-o" size={48} color={C.textSec} />
          <Text style={styles.errorTitle}>Receipt Not Found</Text>
          <Text style={styles.errorMsg}>
            The receipt you're looking for doesn't exist.
          </Text>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backBtnText}>← Back to Fees</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ─── Success ───────────────────────────────────────────────────────────────
  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" backgroundColor={C.primaryDark} />

      {/* ── HEADER ── */}
      <View style={styles.header}>
        <View style={styles.headerDecor1} />
        <View style={styles.headerDecor2} />
        <View style={styles.headerRow}>
          <TouchableOpacity
            style={styles.headerBackBtn}
            onPress={() => navigation.goBack()}
            hitSlop={{ top: 8, left: 8, right: 8, bottom: 8 }}
          >
            <Text style={styles.headerBackBtnText}>←</Text>
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Fee Payment Receipt</Text>
          </View>
          <TouchableOpacity style={styles.shareBtn} onPress={handleShare}>
            <FontAwesome name="share-alt" size={16} color={C.white} />
          </TouchableOpacity>
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
        <Animated.View
          style={[
            styles.receiptCard,
            { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
          ]}
        >
          {/* ── WATERMARK ── */}
          <View style={styles.watermark} pointerEvents="none">
            <Text style={styles.watermarkText}>PAID</Text>
          </View>

          {/* ── COLLEGE HEADER ── */}
          <View style={styles.collegeHeader}>
            <View style={styles.collegeIconWrap}>
              <FontAwesome name="university" size={28} color={C.primary} />
            </View>
            <Text style={styles.collegeName}>
              {receipt.college?.name || "College Name"}
            </Text>
            {receipt.college?.address && (
              <Text style={styles.collegeAddress}>
                {receipt.college.address}
              </Text>
            )}
            <Text style={styles.collegeContact}>
              {[receipt.college?.email, receipt.college?.contact]
                .filter(Boolean)
                .join("  |  ")}
            </Text>
          </View>

          <View style={styles.divider} />

          {/* ── PAID STATUS ── */}
          <View style={styles.statusSection}>
            <View style={styles.statusIconWrap}>
              <FontAwesome name="check-circle" size={40} color={C.success} />
            </View>
            <Text style={styles.statusTitle}>Payment Successful</Text>
            <View style={styles.receiptNoBadge}>
              <Text style={styles.receiptNoText}>
                Receipt No: {receipt.transactionId}
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          {/* ── DETAILS GRID ── */}
          <View style={styles.detailsGrid}>
            {/* Student Details */}
            <View style={styles.detailSection}>
              <Text style={styles.sectionTitle}>Student Details</Text>
              <InfoRow label="Name" value={receipt.student?.name} />
              <InfoRow label="Course" value={receipt.student?.course} />
              <InfoRow label="Department" value={receipt.student?.department} />
              <InfoRow
                label="Academic Year"
                value={receipt.student?.academicYear}
              />
            </View>

            <View style={styles.gridDivider} />

            {/* Payment Details */}
            <View style={styles.detailSection}>
              <Text style={styles.sectionTitle}>Payment Details</Text>
              <InfoRow label="Installment" value={receipt.installmentName} />
              <InfoRow
                label="Amount"
                value={`₹ ${receipt.amount?.toLocaleString()}`}
                bold
              />
              <InfoRow label="Payment Method" value={getPaymentMethod()} />
              <InfoRow
                label="Paid On"
                value={new Date(receipt.paidAt).toLocaleString("en-IN")}
              />
              <InfoRow
                label="Status"
                value={receipt.status || "PAID"}
                success
              />
            </View>
          </View>

          <View style={styles.divider} />

          <Text style={styles.footerNote}>
            This is a system-generated receipt. No signature required.
          </Text>
        </Animated.View>

        {/* ── ACTION BUTTONS ── */}
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={styles.shareActionBtn}
            onPress={handleShare}
            activeOpacity={0.85}
          >
            <FontAwesome name="share-alt" size={14} color={C.primary} />
            <Text style={styles.shareActionBtnText}>Share</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.backToFeesBtn}
            onPress={() => navigation.navigate("Fees")}
            activeOpacity={0.85}
          >
            <FontAwesome name="arrow-left" size={14} color={C.white} />
            <Text style={styles.backToFeesBtnText}>Back to Fees</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

// ─── InfoRow Helper ───────────────────────────────────────────────────────────
const InfoRow = ({ label, value, bold, success }) => (
  <View style={infoStyles.row}>
    <Text style={infoStyles.label}>{label}</Text>
    <Text
      style={[
        infoStyles.value,
        bold && { fontWeight: "700", color: C.primary },
        success && { color: "#16a34a", fontWeight: "700" },
      ]}
    >
      {value || "N/A"}
    </Text>
  </View>
);
const C2 = { primary: "#1a4b6d" };
const infoStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  label: { fontSize: 13, color: "#64748b", flex: 1 },
  value: {
    fontSize: 13,
    color: "#1a2e3b",
    fontWeight: "500",
    flex: 1.2,
    textAlign: "right",
  },
});

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },

  // Loading
  loadingRoot: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: C.bg,
    gap: 12,
  },
  loadingText: { fontSize: 14, color: C.textSec },

  // Error
  errorRoot: {
    flex: 1,
    backgroundColor: C.bg,
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
    gap: 12,
  },
  errorTitle: { fontSize: 18, fontWeight: "700", color: C.text },
  errorMsg: { fontSize: 13, color: C.textSec, textAlign: "center" },
  errorActions: { flexDirection: "row", gap: 12, marginTop: 4 },
  retryBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: C.primary,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
  },
  retryBtnText: { color: C.white, fontWeight: "600", fontSize: 14 },
  backBtn: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: C.textSec,
  },
  backBtnText: { color: C.textSec, fontWeight: "600", fontSize: 14 },

  // Header
  header: {
    backgroundColor: C.primary,
    paddingHorizontal: 16,
    paddingBottom: 14,
    paddingTop: 12,
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
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  headerDecor2: {
    position: "absolute",
    bottom: -20,
    left: 20,
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  headerRow: { flexDirection: "row", alignItems: "center" },
  headerBackBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.15)",
    justifyContent: "center",
    alignItems: "center",
  },
  headerBackBtnText: {
    color: C.white,
    fontSize: 22,
    fontWeight: "700",
    lineHeight: 26,
  },
  headerCenter: { flex: 1, paddingHorizontal: 12 },
  headerTitle: { fontSize: 16, fontWeight: "700", color: C.white },
  shareBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.15)",
    justifyContent: "center",
    alignItems: "center",
  },

  // Scroll
  scroll: { flex: 1 },
  scrollContent: { padding: 16, gap: 16 },

  // Receipt Card
  receiptCard: {
    backgroundColor: C.white,
    borderRadius: 20,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.07,
    shadowRadius: 20,
    elevation: 5,
    position: "relative",
    overflow: "hidden",
  },

  // Watermark
  watermark: {
    position: "absolute",
    top: "38%",
    left: "15%",
    transform: [{ rotate: "-30deg" }],
    zIndex: 0,
  },
  watermarkText: {
    fontSize: 80,
    fontWeight: "900",
    color: "rgba(0,128,0,0.05)",
    letterSpacing: 4,
  },

  // College Header
  collegeHeader: { alignItems: "center", paddingBottom: 16, zIndex: 1 },
  collegeIconWrap: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "rgba(26,75,109,0.08)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },
  collegeName: {
    fontSize: 17,
    fontWeight: "700",
    color: C.text,
    textAlign: "center",
    marginBottom: 4,
  },
  collegeAddress: {
    fontSize: 12,
    color: C.textSec,
    textAlign: "center",
    marginBottom: 2,
  },
  collegeContact: { fontSize: 11, color: C.textSec, textAlign: "center" },

  divider: { height: 1, backgroundColor: C.border, marginVertical: 16 },

  // Status Section
  statusSection: { alignItems: "center", zIndex: 1 },
  statusIconWrap: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: C.successLight,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: C.success,
    marginBottom: 8,
  },
  receiptNoBadge: {
    backgroundColor: "#f8fafc",
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.border,
  },
  receiptNoText: { fontSize: 12, color: C.textSec, fontWeight: "600" },

  // Details Grid
  detailsGrid: { zIndex: 1 },
  detailSection: { marginBottom: 8 },
  gridDivider: { height: 1, backgroundColor: C.border, marginVertical: 14 },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: C.primary,
    marginBottom: 10,
    letterSpacing: 0.3,
  },

  footerNote: {
    fontSize: 11,
    color: C.textSec,
    textAlign: "center",
    fontStyle: "italic",
    zIndex: 1,
  },

  // Action Buttons
  actionRow: { flexDirection: "row", gap: 12 },
  shareActionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 13,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: C.border,
    backgroundColor: C.white,
  },
  shareActionBtnText: { fontSize: 14, color: C.primary, fontWeight: "600" },
  backToFeesBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 13,
    borderRadius: 12,
    backgroundColor: C.primary,
  },
  backToFeesBtnText: { fontSize: 14, color: C.white, fontWeight: "600" },
});

export default FeeReceipt;
