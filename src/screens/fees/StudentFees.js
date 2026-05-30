import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  Alert,
  Dimensions,
  RefreshControl,
  Platform,
  StatusBar,
} from "react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { useAuth } from "../../context/AuthContext";
import api from "../../services/api";
import { FontAwesome } from "@expo/vector-icons";
import { COLORS, SIZES, SHADOWS } from "../../constants/theme";

const { width } = Dimensions.get("window");

const C = {
  primary: "#1a4b6d",
  primaryDark: "#0f3a4a",
  white: "#ffffff",
  bg: "#f0f4f8",
  border: "#e2e8f0",
};

const showAlert = (title, message) => {
  if (Platform.OS === "web") {
    window.alert(`${title}\n${message}`);
  } else {
    Alert.alert(title, message);
  }
};

const StudentFees = () => {
  const navigation = useNavigation();
  const { user } = useAuth();

  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [studentProfile, setStudentProfile] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadTimeoutRef = useRef(null);

  const validateFeeDashboard = (data) => {
    const errors = [];
    if (!data) {
      errors.push("Dashboard data is missing");
    } else {
      if (typeof data.totalFee === "undefined")
        errors.push("Total fee is missing");
      if (typeof data.totalPaid === "undefined")
        errors.push("Total paid is missing");
      if (typeof data.totalDue === "undefined")
        errors.push("Total due is missing");
      if (!Array.isArray(data.installments))
        errors.push("Installments array is missing");
      if (!data.course) errors.push("Course information is missing");
    }
    return errors;
  };

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await api.get("/students/my-profile");
        if (res.data?.student) setStudentProfile(res.data.student);
      } catch (err) {}
    };
    fetchProfile();
  }, []);

  useEffect(() => {
    return () => {
      if (loadTimeoutRef.current) clearTimeout(loadTimeoutRef.current);
    };
  }, []);

  const loadFees = async () => {
    if (loadTimeoutRef.current) clearTimeout(loadTimeoutRef.current);
    loadTimeoutRef.current = setTimeout(() => {
      setError({
        message:
          "Request timed out. Please check your connection and try again.",
        statusCode: 408,
      });
      setLoading(false);
      showAlert("Timeout", "Request timed out. Please try again.");
    }, 30000);

    try {
      setLoading(true);
      setError(null);
      const res = await api.get("/student/payments/my-fee-dashboard");
      if (!res.data) throw new Error("Invalid fee dashboard response");
      const validation = validateFeeDashboard(res.data);
      if (validation.length > 0)
        throw new Error(`Invalid dashboard data: ${validation.join(", ")}`);
      setDashboard(res.data);
      if (loadTimeoutRef.current) clearTimeout(loadTimeoutRef.current);
    } catch (err) {
      if (loadTimeoutRef.current) clearTimeout(loadTimeoutRef.current);
      const statusCode = err.response?.status;
      const errorMsg =
        statusCode === 401
          ? "Session expired. Please login again."
          : statusCode === 404
            ? "Fee structure not found. Contact administration."
            : err.response?.data?.message || "Unable to load fee dashboard.";
      setError({ message: errorMsg, statusCode });
      showAlert("Error", errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = async () => {
    if (retryCount >= 3) return;
    setIsRetrying(true);
    setRetryCount((prev) => prev + 1);
    await loadFees();
    setIsRetrying(false);
  };

  const handleGoBack = () => navigation.goBack();

  useFocusEffect(
    React.useCallback(() => {
      loadFees();
    }, []),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadFees();
    setRefreshing(false);
  };

  const progress =
    dashboard?.totalFee > 0
      ? Math.min(
          100,
          Math.round((dashboard.totalPaid / dashboard.totalFee) * 100),
        )
      : dashboard?.totalPaid === 0
        ? 100
        : 0;

  const isNearDue = (date) => {
    const dueDate = new Date(date);
    const today = new Date();
    const diffTime = dueDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 && diffDays <= 7;
  };

  const getInstallmentStatusColor = (status, dueDate) => {
    if (status === "PAID") return COLORS.success;
    if (status === "PENDING") {
      if (new Date(dueDate) < new Date()) return COLORS.danger;
      if (isNearDue(dueDate)) return COLORS.warning;
      return COLORS.info;
    }
    return COLORS.secondary;
  };

  const handleRedirectPayment = (installment) => {
    if (!installment?._id || installment.status !== "PENDING") {
      showAlert("Invalid Request", "Cannot process this payment");
      return;
    }
    navigation.navigate("MakePayment", {
      installmentId: installment._id,
      installmentName: installment.name,
      amount: installment.amount,
      dueDate: installment.dueDate,
    });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <FontAwesome name="money" size={48} color={COLORS.primary} />
        <ActivityIndicator
          size="large"
          color={COLORS.primary}
          style={{ marginTop: 16 }}
        />
        <Text style={styles.loadingText}>Loading Fee Dashboard...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <FontAwesome
          name="exclamation-triangle"
          size={48}
          color={COLORS.danger}
        />
        <Text style={styles.errorTitle}>Fee Dashboard Error</Text>
        <Text style={styles.errorMessage}>{error.message}</Text>
        <View style={styles.errorActions}>
          <TouchableOpacity
            style={[styles.retryBtn, isRetrying && styles.btnDisabled]}
            onPress={handleRetry}
            disabled={isRetrying || retryCount >= 3}
          >
            <Text style={styles.retryBtnText}>
              {isRetrying ? "Retrying..." : "Retry"}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.backBtn} onPress={handleGoBack}>
            <Text style={styles.backBtnText}>Back to Dashboard</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (!dashboard) {
    return (
      <View style={styles.emptyContainer}>
        <FontAwesome name="money" size={48} color={COLORS.textSecondary} />
        <Text style={styles.emptyTitle}>No Fee Data Available</Text>
        <Text style={styles.emptyMessage}>
          Your fee structure has not been configured yet. Please contact your
          college administration.
        </Text>
        <TouchableOpacity style={styles.backBtn} onPress={handleGoBack}>
          <Text style={styles.backBtnText}>← Back to Dashboard</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const renderInstallmentItem = ({ item: installment }) => {
    const statusColor = getInstallmentStatusColor(
      installment.status,
      installment.dueDate,
    );
    const isPaid = installment.status === "PAID";
    const isOverdue = new Date(installment.dueDate) < new Date() && !isPaid;
    const isDueSoon = isNearDue(installment.dueDate) && !isPaid;

    return (
      <View style={[styles.installmentRow, isPaid && styles.paidRow]}>
        <View style={styles.rowLeft}>
          <Text style={styles.installmentName}>{installment.name}</Text>
          <Text style={styles.installmentAmount}>
            ₹{installment.amount?.toLocaleString()}
          </Text>
        </View>
        <View style={styles.rowRight}>
          <View style={styles.dueSection}>
            <Text style={styles.dueDate}>
              {new Date(installment.dueDate).toLocaleDateString()}
            </Text>
            {isDueSoon && (
              <Text style={styles.dueWarning}>
                ⚠ Due in{" "}
                {Math.ceil(
                  (new Date(installment.dueDate) - new Date()) /
                    (1000 * 60 * 60 * 24),
                )}{" "}
                days
              </Text>
            )}
            {isOverdue && (
              <Text style={styles.dueOverdue}>
                ❌ Overdue by{" "}
                {Math.ceil(
                  (new Date() - new Date(installment.dueDate)) /
                    (1000 * 60 * 60 * 24),
                )}{" "}
                days
              </Text>
            )}
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
            <Text style={styles.statusText}>{installment.status}</Text>
          </View>
          {isPaid ? (
            <TouchableOpacity
              style={styles.receiptBtn}
              onPress={() =>
                navigation.navigate("FeeReceipt", {
                  installmentId: installment._id,
                })
              }
            >
              <FontAwesome name="file-text" size={14} color={COLORS.success} />
              <Text style={styles.receiptBtnText}>Receipt</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.payBtn}
              onPress={() => handleRedirectPayment(installment)}
            >
              <FontAwesome name="credit-card" size={14} color={COLORS.white} />
              <Text style={styles.payBtnText}>Pay Now</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={C.primaryDark} />

      {/* ── NAVY APP BAR ── */}
      <View style={styles.topBar}>
        <View style={styles.circle1} />
        <View style={styles.circle2} />
        <View style={styles.topBarRow}>
          <TouchableOpacity
            style={styles.topBackBtn}
            onPress={handleGoBack}
            hitSlop={{ top: 8, left: 8, right: 8, bottom: 8 }}
          >
            <Text style={styles.topBackBtnText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.topBarTitle}>Fee Management</Text>
          <TouchableOpacity
            style={styles.helpIconBtn}
            onPress={() => setShowHelp(!showHelp)}
          >
            <FontAwesome name="info-circle" size={18} color={C.white} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Help Section */}
      {showHelp && (
        <View style={styles.helpSection}>
          <View style={styles.helpHeader}>
            <FontAwesome name="info-circle" size={20} color={COLORS.primary} />
            <Text style={styles.helpTitle}>Fee Dashboard Guide</Text>
            <TouchableOpacity onPress={() => setShowHelp(false)}>
              <FontAwesome
                name="times-circle"
                size={18}
                color={COLORS.textSecondary}
              />
            </TouchableOpacity>
          </View>
          <View style={styles.helpBody}>
            <Text style={styles.helpItem}>
              • <Text style={styles.helpBold}>Fee Summary</Text>: Overview of
              total fees, paid & pending
            </Text>
            <Text style={styles.helpItem}>
              • <Text style={styles.helpBold}>Progress Bar</Text>: Visual
              payment completion status
            </Text>
            <Text style={styles.helpItem}>
              • <Text style={styles.helpBold}>Installments</Text>: Detailed
              payment schedule
            </Text>
            <Text style={styles.helpItem}>
              • <Text style={styles.helpBold}>Status</Text>: ✅ PAID | ⚠ PENDING
              (due soon) | ❌ PENDING (overdue)
            </Text>
            <Text style={styles.helpItem}>
              • Tap "Pay Now" for pending installments
            </Text>
          </View>
        </View>
      )}

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[COLORS.primary]}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Summary Cards */}
        <View style={styles.summaryGrid}>
          <View
            style={[styles.summaryCard, { borderLeftColor: COLORS.primary }]}
          >
            <FontAwesome name="university" size={28} color={COLORS.primary} />
            <Text style={styles.summaryLabel}>Total Fee</Text>
            <Text style={styles.summaryValue}>
              ₹{dashboard.totalFee?.toLocaleString()}
            </Text>
            <Text style={styles.summarySub}>Complete academic year</Text>
          </View>
          <View
            style={[styles.summaryCard, { borderLeftColor: COLORS.success }]}
          >
            <FontAwesome name="check-circle" size={28} color={COLORS.success} />
            <Text style={styles.summaryLabel}>Amount Paid</Text>
            <Text style={[styles.summaryValue, { color: COLORS.success }]}>
              ₹{dashboard.totalPaid?.toLocaleString()}
            </Text>
            <Text style={styles.summarySub}>Successfully paid</Text>
          </View>
          <View
            style={[styles.summaryCard, { borderLeftColor: COLORS.danger }]}
          >
            <FontAwesome name="times-circle" size={28} color={COLORS.danger} />
            <Text style={styles.summaryLabel}>Pending Due</Text>
            <Text style={[styles.summaryValue, { color: COLORS.danger }]}>
              ₹{dashboard.totalDue?.toLocaleString()}
            </Text>
            <Text style={styles.summarySub}>Remaining amount</Text>
          </View>
          <View
            style={[
              styles.summaryCard,
              {
                borderLeftColor:
                  progress === 100 ? COLORS.success : COLORS.warning,
              },
            ]}
          >
            <FontAwesome
              name="credit-card"
              size={28}
              color={progress === 100 ? COLORS.success : COLORS.warning}
            />
            <Text style={styles.summaryLabel}>Progress</Text>
            <Text
              style={[
                styles.summaryValue,
                { color: progress === 100 ? COLORS.success : COLORS.warning },
              ]}
            >
              {progress}%
            </Text>
            <Text style={styles.summarySub}>
              {dashboard.totalPaid?.toLocaleString()}/
              {dashboard.totalFee?.toLocaleString()} paid
            </Text>
          </View>
        </View>

        {/* Progress Bar */}
        <View style={styles.progressCard}>
          <View style={styles.progressHeader}>
            <FontAwesome name="credit-card" size={16} color={COLORS.primary} />
            <Text style={styles.progressTitle}>Payment Progress</Text>
          </View>
          <View style={styles.progressBody}>
            <View style={styles.progressInfo}>
              <Text style={styles.progressLabel}>Fee Payment Status</Text>
              <Text
                style={[
                  styles.progressValue,
                  { color: progress === 100 ? COLORS.success : COLORS.primary },
                ]}
              >
                {progress}% Complete
              </Text>
            </View>
            <View style={styles.progressBarBg}>
              <View
                style={[
                  styles.progressBarFill,
                  {
                    width: `${progress}%`,
                    backgroundColor:
                      progress === 100
                        ? COLORS.success
                        : progress > 75
                          ? COLORS.primary
                          : progress > 50
                            ? COLORS.warning
                            : COLORS.info,
                  },
                ]}
              >
                <Text style={styles.progressText}>{progress}%</Text>
              </View>
            </View>
            <View style={styles.progressStats}>
              <View style={styles.statItem}>
                <FontAwesome
                  name="check-circle"
                  size={12}
                  color={COLORS.success}
                />
                <Text style={styles.statText}>
                  {dashboard.installments?.filter((i) => i.status === "PAID")
                    .length || 0}{" "}
                  Paid
                </Text>
              </View>
              <View style={styles.statItem}>
                <FontAwesome name="clock-o" size={12} color={COLORS.warning} />
                <Text style={styles.statText}>
                  {dashboard.installments?.filter((i) => i.status === "PENDING")
                    .length || 0}{" "}
                  Pending
                </Text>
              </View>
              <View style={styles.statItem}>
                <FontAwesome name="money" size={12} color={COLORS.primary} />
                <Text style={styles.statText}>
                  {dashboard.installments?.length || 0} Total
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Installments List */}
        <View style={styles.installmentsCard}>
          <View style={styles.installmentsHeader}>
            <FontAwesome name="calendar" size={16} color={COLORS.white} />
            <Text style={styles.installmentsTitle}>Fee Installments</Text>
          </View>
          <View style={styles.installmentsBody}>
            {dashboard.installments?.length === 0 ? (
              <View style={styles.emptyInstallments}>
                <FontAwesome
                  name="money"
                  size={40}
                  color={COLORS.textSecondary}
                />
                <Text style={styles.emptyInstallmentsTitle}>
                  No Installments Found
                </Text>
                <Text style={styles.emptyInstallmentsMsg}>
                  Your fee structure has not been configured with installments.
                  Please contact administration.
                </Text>
                <TouchableOpacity style={styles.backBtn} onPress={handleGoBack}>
                  <Text style={styles.backBtnText}>← Back to Dashboard</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <FlatList
                data={dashboard.installments}
                renderItem={renderInstallmentItem}
                keyExtractor={(item) => item._id}
                scrollEnabled={false}
                ItemSeparatorComponent={() => <View style={styles.separator} />}
              />
            )}
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <View style={styles.footerInfo}>
            <Text style={styles.footerText}>Student Fee Dashboard</Text>
            <Text style={styles.footerText}>
              Last updated: {new Date().toLocaleString()}
            </Text>
          </View>
          <View style={styles.footerActions}>
            <TouchableOpacity
              style={styles.footerBtn}
              onPress={handleRetry}
              disabled={loading}
            >
              <FontAwesome
                name="refresh"
                size={12}
                color={COLORS.textSecondary}
              />
              <Text style={styles.footerBtnText}>
                {loading ? "Refreshing..." : "Refresh"}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.footerBtn} onPress={handleGoBack}>
              <FontAwesome
                name="arrow-left"
                size={12}
                color={COLORS.textSecondary}
              />
              <Text style={styles.footerBtnText}>Back</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.background,
  },
  loadingText: { marginTop: 12, color: COLORS.textSecondary, fontSize: 14 },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    backgroundColor: COLORS.background,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.text,
    marginTop: 16,
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: "center",
    marginBottom: 24,
  },
  errorActions: { flexDirection: "row", gap: 12 },
  retryBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryBtnText: { color: COLORS.white, fontWeight: "600", fontSize: 14 },
  backBtn: {
    backgroundColor: COLORS.white,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: COLORS.textSecondary,
  },
  backBtnText: { color: COLORS.textSecondary, fontWeight: "600", fontSize: 14 },
  btnDisabled: { opacity: 0.6 },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    backgroundColor: COLORS.background,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyMessage: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: "center",
    marginBottom: 24,
  },

  /* ── NAVY APP BAR ── */
  topBar: {
    backgroundColor: C.primary,
    paddingTop:
      Platform.OS === "ios" ? 44 : (StatusBar.currentHeight || 24) + 6,
    paddingHorizontal: 16,
    paddingBottom: 12,
    position: "relative",
    overflow: "hidden",
    borderRadius: 20,
    marginHorizontal: 8,
    marginTop: Platform.OS === "ios" ? 8 : (StatusBar.currentHeight || 24) - 10,
    marginBottom: 8,
  },
  circle1: {
    position: "absolute",
    top: -40,
    right: -40,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  circle2: {
    position: "absolute",
    bottom: -20,
    left: 20,
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  topBarRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  topBackBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.15)",
    justifyContent: "center",
    alignItems: "center",
  },
  topBackBtnText: {
    color: C.white,
    fontSize: 22,
    fontWeight: "700",
    lineHeight: 26,
  },
  topBarCenter: { flex: 1 },
  topBarTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: C.white,
    flex: 1,
    textAlign: "center",
  },
  topBarSub: { fontSize: 12, color: "rgba(255,255,255,0.75)", marginTop: 2 },
  helpIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.15)",
    justifyContent: "center",
    alignItems: "center",
  },

  helpSection: {
    margin: 12,
    marginTop: 8,
    backgroundColor: "rgba(23,162,184,0.1)",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "rgba(23,162,184,0.3)",
  },
  helpHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  helpTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.primary,
  },
  helpBody: { gap: 4 },
  helpItem: { fontSize: 12, color: COLORS.textSecondary, lineHeight: 18 },
  helpBold: { fontWeight: "700", color: COLORS.text },

  scrollView: { flex: 1 },
  summaryGrid: { flexDirection: "row", flexWrap: "wrap", padding: 12, gap: 12 },
  summaryCard: {
    flex: 1,
    minWidth: "48%",
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 14,
    borderLeftWidth: 4,
    ...SHADOWS.small,
  },
  summaryLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 8,
    fontWeight: "600",
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.text,
    marginVertical: 4,
  },
  summarySub: { fontSize: 10, color: COLORS.textSecondary },

  progressCard: {
    margin: 12,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    ...SHADOWS.small,
  },
  progressHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    backgroundColor: "#f8f9fa",
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  progressTitle: { fontSize: 14, fontWeight: "700", color: COLORS.primary },
  progressBody: { padding: 16 },
  progressInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  progressLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.textSecondary,
  },
  progressValue: { fontSize: 14, fontWeight: "700" },
  progressBarBg: {
    height: 20,
    backgroundColor: "#e9ecef",
    borderRadius: 10,
    overflow: "hidden",
    marginBottom: 12,
  },
  progressBarFill: {
    height: "100%",
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  progressText: { color: COLORS.white, fontSize: 11, fontWeight: "700" },
  progressStats: {
    flexDirection: "row",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 8,
  },
  statItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  statText: { fontSize: 11, color: COLORS.textSecondary },

  installmentsCard: {
    margin: 12,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    ...SHADOWS.small,
  },
  installmentsHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    backgroundColor: "#0f3a4a",
    borderRadius: 12,
  },
  installmentsTitle: { fontSize: 14, fontWeight: "700", color: COLORS.white },
  installmentsBody: { padding: 8 },
  emptyInstallments: { alignItems: "center", padding: 24 },
  emptyInstallmentsTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.text,
    marginTop: 12,
    marginBottom: 8,
  },
  emptyInstallmentsMsg: {
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: "center",
    marginBottom: 16,
  },
  separator: {
    height: 1,
    backgroundColor: COLORS.borderLight,
    marginHorizontal: 8,
  },

  installmentRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 12,
    backgroundColor: COLORS.white,
  },
  paidRow: { backgroundColor: "rgba(40,167,69,0.05)" },
  rowLeft: { flex: 1 },
  rowRight: { alignItems: "flex-end", gap: 6 },
  installmentName: { fontSize: 14, fontWeight: "700", color: COLORS.text },
  installmentAmount: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.primary,
    marginTop: 4,
  },
  dueSection: { alignItems: "flex-end" },
  dueDate: { fontSize: 12, fontWeight: "600", color: COLORS.text },
  dueWarning: { fontSize: 10, color: "#856404", marginTop: 2 },
  dueOverdue: { fontSize: 10, color: "#721c24", marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusText: {
    fontSize: 10,
    fontWeight: "700",
    color: COLORS.white,
    textTransform: "uppercase",
  },
  receiptBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: COLORS.success,
  },
  receiptBtnText: { fontSize: 11, fontWeight: "600", color: COLORS.success },
  payBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: COLORS.success,
  },
  payBtnText: { fontSize: 11, fontWeight: "600", color: COLORS.white },

  footer: {
    margin: 12,
    padding: 14,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    ...SHADOWS.small,
  },
  footerInfo: { gap: 4, marginBottom: 12 },
  footerText: { fontSize: 11, color: COLORS.textSecondary },
  footerActions: { flexDirection: "row", gap: 8 },
  footerBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.textSecondary,
  },
  footerBtnText: {
    fontSize: 11,
    fontWeight: "600",
    color: COLORS.textSecondary,
  },
});

export default StudentFees;
