import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
  RefreshControl,
  Platform,
} from "react-native";
import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import { COLORS, SIZES, SHADOWS } from "../../constants/theme";

const formatTime12 = (t) => {
  if (!t) return "";
  const [h, m] = t.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, "0")} ${period}`;
};

const HomeScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [collegeName, setCollegeName] = useState("");

  const fadeAnim = useRef(new Animated.Value(0)).current;

  const navigateToFees = () => navigation.getParent()?.navigate("Fees");

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      const [dashRes, profileRes] = await Promise.allSettled([
        api.get("/dashboard/student"),
        api.get("/auth/me"),
      ]);

      const dashData =
        dashRes.status === "fulfilled"
          ? dashRes.value?.data?.data || dashRes.value?.data
          : null;

      const profileData =
        profileRes.status === "fulfilled"
          ? profileRes.value?.data?.data || profileRes.value?.data
          : null;

      if (dashData) setDashboardData(dashData);

      const collegeId = profileData?.college_id;
      if (collegeId) {
        for (const ep of [
          `/colleges/${collegeId}`,
          `/college/${collegeId}`,
          `/student/college`,
          `/dashboard/college`,
        ]) {
          try {
            const r = await api.get(ep);
            const d = r.data?.data || r.data;
            const n = d?.name || d?.collegeName || "";
            if (n) {
              setCollegeName(n);
              break;
            }
          } catch {}
        }
      }
    } catch (err) {
      console.error("Dashboard error:", err);
    } finally {
      setLoading(false);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: Platform.OS !== "web",
      }).start();
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchDashboard();
    setRefreshing(false);
  };

  const student = dashboardData?.student || {};
  const attendance = dashboardData?.attendanceSummary || {
    present: 0,
    absent: 0,
    total: 0,
    percentage: 0,
    warning: false,
  };
  const feeSummary = dashboardData?.feeSummary || {
    totalFee: 0,
    paid: 0,
    due: 0,
    paymentStatus: "NOT_GENERATED",
  };
  const notifications = dashboardData?.latestNotifications || [];
  const todaySlots = dashboardData?.todayTimetable || [];

  const formatCurrency = (amount) =>
    `\u20B9${Number(amount || 0).toLocaleString("en-IN")}`;

  const getAttColor = (pct) =>
    pct >= 75 ? COLORS.success : pct >= 60 ? COLORS.warning : COLORS.danger;

  if (loading) {
    return (
      <View style={s.loadingContainer}>
        <Text style={{ fontSize: 48 }}>🎓</Text>
        <ActivityIndicator
          size="large"
          color={COLORS.primary}
          style={{ marginTop: 16 }}
        />
        <Text style={s.loadingText}>Loading dashboard...</Text>
      </View>
    );
  }

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <View style={s.root}>
      {/* ── TOP BAR ── */}
      <View style={s.topBar}>
        <View style={{ width: 34 }} />
        <Text style={s.collegeName} numberOfLines={1}>
          {collegeName || "Smart College ERP"}
        </Text>
        <TouchableOpacity
          style={s.bellBtn}
          activeOpacity={0.7}
          hitSlop={{ top: 8, left: 8, right: 8, bottom: 8 }}
          onPress={() => navigation.navigate("Notifications")}
        >
          <Text style={{ fontSize: 18 }}>🔔</Text>
          {unreadCount > 0 && (
            <View style={s.badge}>
              <Text style={s.badgeText}>{unreadCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* ── SCROLL ── */}
      <Animated.ScrollView
        style={{ opacity: fadeAnim }}
        contentContainerStyle={s.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[COLORS.primary]}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* WELCOME CARD — horizontal like HTML */}
        <View style={s.welcomeCard}>
          <View style={s.avatar}>
            <Text style={{ fontSize: 24 }}>🎓</Text>
          </View>
          <View style={s.welcomeInfo}>
            <Text style={s.welcomeName} numberOfLines={1}>
              Welcome, {student.name || user?.name || "Student"}!
            </Text>
            {student.enrollmentNumber && student.enrollmentNumber !== "N/A" ? (
              <Text style={s.enrollText}>🪪 {student.enrollmentNumber}</Text>
            ) : (
              <Text style={s.enrollText}> </Text>
            )}
            <TouchableOpacity
              style={s.payBtn}
              activeOpacity={0.8}
              onPress={navigateToFees}
            >
              <Text style={s.payBtnText}>💳 Pay Fees</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* INFO CARDS */}
        <View style={s.infoRow}>
          <View style={[s.infoCard, { marginRight: 4 }]}>
            <View style={[s.infoIcon, { backgroundColor: COLORS.iconBlueBg }]}>
              <Text style={{ fontSize: 18 }}>🎓</Text>
            </View>
            <Text style={s.infoVal} numberOfLines={2}>
              {student.course || "N/A"}
            </Text>
            <Text style={s.infoLbl}>Course</Text>
          </View>
          <View style={[s.infoCard, { marginLeft: 4 }]}>
            <View
              style={[s.infoIcon, { backgroundColor: COLORS.iconPurpleBg }]}
            >
              <Text style={{ fontSize: 18 }}>🏛</Text>
            </View>
            <Text style={s.infoVal} numberOfLines={2}>
              {student.department || "N/A"}
            </Text>
            <Text style={s.infoLbl}>Department</Text>
          </View>
        </View>

        {/* ATTENDANCE */}
        <View style={s.sectionCard}>
          <View style={s.secHead}>
            <View style={s.secTitleWrap}>
              <Text style={{ fontSize: 15 }}>📊</Text>
              <Text style={s.secTitle}>Attendance Summary</Text>
            </View>
            <TouchableOpacity
              onPress={() => navigation.navigate("Attendance")}
              hitSlop={{ top: 8, left: 8, right: 8, bottom: 8 }}
            >
              <Text style={s.viewAll}>👁 View All</Text>
            </TouchableOpacity>
          </View>
          <View style={s.statsRow}>
            {[
              {
                icon: "✅",
                val: attendance.present,
                lbl: "PRESENT",
                bg: "#d4edda",
              },
              {
                icon: "❌",
                val: attendance.absent,
                lbl: "ABSENT",
                bg: "#f8d7da",
              },
              {
                icon: "🕐",
                val: attendance.total,
                lbl: "TOTAL",
                bg: "#e3f2fd",
              },
            ].map(({ icon, val, lbl, bg }) => (
              <View key={lbl} style={s.stat}>
                <View style={[s.statIcon, { backgroundColor: bg }]}>
                  <Text style={{ fontSize: 14 }}>{icon}</Text>
                </View>
                <Text style={s.statVal}>{val}</Text>
                <Text style={s.statLbl}>{lbl}</Text>
              </View>
            ))}
          </View>
          <View style={s.progWrap}>
            <Text
              style={[s.progPct, { color: getAttColor(attendance.percentage) }]}
            >
              {attendance.percentage}% Overall Attendance
            </Text>
            <View style={s.progTrack}>
              <View
                style={[
                  s.progFill,
                  {
                    width: `${Math.min(attendance.percentage, 100)}%`,
                    backgroundColor: getAttColor(attendance.percentage),
                  },
                ]}
              />
            </View>
            <Text style={s.progMin}>75% Min</Text>
          </View>
          {attendance.warning && (
            <View style={s.warnBox}>
              <Text style={s.warnText}>
                ⚠ Low Attendance! Minimum 75% required for exam eligibility.
              </Text>
            </View>
          )}
        </View>

        {/* TODAY'S CLASSES */}
        <View style={s.sectionCard}>
          <View style={s.secHead}>
            <View style={s.secTitleWrap}>
              <Text style={{ fontSize: 15 }}>📅</Text>
              <Text style={s.secTitle}>Today's Classes</Text>
            </View>
            <TouchableOpacity
              onPress={() => navigation.navigate("Timetable")}
              hitSlop={{ top: 8, left: 8, right: 8, bottom: 8 }}
            >
              <Text style={s.viewAll}>📋 Full Timetable</Text>
            </TouchableOpacity>
          </View>
          {todaySlots.length === 0 ? (
            <View style={s.emptyBox}>
              <Text style={{ fontSize: 32, marginBottom: 6 }}>☀️</Text>
              <Text style={s.emptyText}>No classes today</Text>
              <TouchableOpacity
                style={s.viewTTBtn}
                onPress={() => navigation.navigate("Timetable")}
              >
                <Text style={s.viewTTText}>📅 View Full Timetable →</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              {todaySlots.slice(0, 3).map((slot, i) => (
                <View key={i} style={s.slot}>
                  <View style={s.slotTimeBox}>
                    <Text style={s.slotTimeText}>
                      🕐 {formatTime12(slot.startTime)} –{" "}
                      {formatTime12(slot.endTime)}
                    </Text>
                  </View>
                  <Text style={s.slotSubject} numberOfLines={1}>
                    {slot.subject || "—"}
                  </Text>
                  <View style={s.slotMeta}>
                    <View style={s.slotBadge}>
                      <Text style={s.slotBadgeText}>
                        {slot.slotType || "LECTURE"}
                      </Text>
                    </View>
                    {slot.code ? (
                      <Text style={s.slotCode}>{slot.code}</Text>
                    ) : null}
                  </View>
                  <View style={s.slotInfo}>
                    <Text style={s.slotInfoItem}>
                      👨‍🏫 {slot.teacher || "TBA"}
                    </Text>
                    {slot.room ? (
                      <Text style={s.slotInfoItem}>📍 Room {slot.room}</Text>
                    ) : null}
                  </View>
                </View>
              ))}
              {todaySlots.length > 3 && (
                <TouchableOpacity
                  style={s.showMore}
                  onPress={() => navigation.navigate("Timetable")}
                >
                  <Text style={s.showMoreText}>
                    +{todaySlots.length - 3} more classes → View All
                  </Text>
                </TouchableOpacity>
              )}
            </>
          )}
        </View>

        {/* FEE SUMMARY */}
        <View style={s.sectionCard}>
          <View style={s.secHead}>
            <View style={s.secTitleWrap}>
              <Text style={{ fontSize: 15 }}>💰</Text>
              <Text style={s.secTitle}>Fee Summary</Text>
            </View>
            <TouchableOpacity
              onPress={navigateToFees}
              hitSlop={{ top: 8, left: 8, right: 8, bottom: 8 }}
            >
              <Text style={s.viewAll}>👁 View Details</Text>
            </TouchableOpacity>
          </View>
          <View style={s.feeRow}>
            {[
              {
                lbl: "Total Fee",
                val: formatCurrency(feeSummary.totalFee),
                color: COLORS.text,
              },
              {
                lbl: "Paid",
                val: formatCurrency(feeSummary.paid),
                color: COLORS.success,
              },
              {
                lbl: "Due",
                val: formatCurrency(feeSummary.due),
                color: COLORS.danger,
              },
            ].map(({ lbl, val, color }) => (
              <View key={lbl} style={s.feeStat}>
                <Text style={s.feeLbl}>{lbl}</Text>
                <Text style={[s.feeVal, { color }]}>{val}</Text>
              </View>
            ))}
          </View>
          <View style={s.feeStatusRow}>
            <View
              style={[
                s.feeStatusBadge,
                {
                  backgroundColor:
                    feeSummary.paymentStatus === "PAID"
                      ? COLORS.success
                      : feeSummary.paymentStatus === "PARTIAL"
                        ? "#fff3cd"
                        : COLORS.danger,
                  borderWidth: feeSummary.paymentStatus === "PARTIAL" ? 1 : 0,
                  borderColor:
                    feeSummary.paymentStatus === "PARTIAL"
                      ? "#ffc107"
                      : "transparent",
                },
              ]}
            >
              <Text
                style={[
                  s.feeStatusText,
                  {
                    color:
                      feeSummary.paymentStatus === "PARTIAL"
                        ? "#856404"
                        : COLORS.white,
                  },
                ]}
              >
                {feeSummary.paymentStatus}
              </Text>
            </View>
          </View>
          {feeSummary.paymentStatus !== "PAID" && (
            <TouchableOpacity
              style={s.payNowBtn}
              activeOpacity={0.8}
              onPress={navigateToFees}
            >
              <Text style={s.payNowText}>Pay Now</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* NOTIFICATIONS */}
        <View style={[s.sectionCard, { marginBottom: 24 }]}>
          <View style={s.secHead}>
            <View style={s.secTitleWrap}>
              <Text style={{ fontSize: 15 }}>🔔</Text>
              <Text style={s.secTitle}>Latest Notifications</Text>
            </View>
            <TouchableOpacity
              onPress={() => navigation.navigate("Notifications")}
              hitSlop={{ top: 8, left: 8, right: 8, bottom: 8 }}
            >
              <Text style={s.viewAll}>👁 View All</Text>
            </TouchableOpacity>
          </View>
          {notifications.length === 0 ? (
            <View style={s.emptyBox}>
              <Text style={{ fontSize: 32, marginBottom: 6 }}>🔔</Text>
              <Text style={s.emptyText}>No new notifications</Text>
            </View>
          ) : (
            notifications.slice(0, 3).map((notif, i) => (
              <View
                key={notif._id || i}
                style={[s.notifItem, !notif.isRead && s.notifUnread]}
              >
                <View style={s.notifIconWrap}>
                  <Text style={{ fontSize: 14 }}>🔔</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.notifTitle}>{notif.title}</Text>
                  <Text style={s.notifMsg} numberOfLines={2}>
                    {notif.message}
                  </Text>
                  <View style={s.notifMeta}>
                    <View style={s.notifTypeBadge}>
                      <Text style={s.notifTypeText}>{notif.type}</Text>
                    </View>
                    <Text style={s.notifDate}>
                      {new Date(notif.createdAt).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </Text>
                  </View>
                </View>
              </View>
            ))
          )}
        </View>
      </Animated.ScrollView>
    </View>
  );
};

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.background,
  },
  loadingText: { marginTop: 12, color: COLORS.textSecondary, fontSize: 14 },

  /* TOP BAR */
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: COLORS.white,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: COLORS.border,
    ...SHADOWS.small,
  },
  collegeName: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.primary,
    flex: 1,
    textAlign: "center",
  },
  bellBtn: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: COLORS.light,
    borderWidth: 0.5,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  badge: {
    position: "absolute",
    top: -3,
    right: -3,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: COLORS.danger,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: COLORS.white,
  },
  badgeText: { color: COLORS.white, fontSize: 9, fontWeight: "700" },

  scrollContent: { padding: 12, gap: 10 },

  /* WELCOME CARD — horizontal */
  welcomeCard: {
    backgroundColor: COLORS.white,
    borderRadius: SIZES.radiusLg,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 0.5,
    borderColor: COLORS.border,
    ...SHADOWS.medium,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 14,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  welcomeInfo: { flex: 1 },
  welcomeName: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 2,
  },
  enrollText: { fontSize: 11, color: COLORS.textMuted, marginBottom: 8 },
  payBtn: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  payBtnText: { color: COLORS.white, fontWeight: "700", fontSize: 12 },

  /* INFO CARDS */
  infoRow: { flexDirection: "row" },
  infoCard: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: SIZES.radius,
    padding: 12,
    borderWidth: 0.5,
    borderColor: COLORS.border,
    ...SHADOWS.small,
  },
  infoIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  infoVal: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 2,
  },
  infoLbl: {
    fontSize: 10,
    color: COLORS.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },

  /* SECTION CARD */
  sectionCard: {
    backgroundColor: COLORS.white,
    borderRadius: SIZES.radiusLg,
    borderWidth: 0.5,
    borderColor: COLORS.border,
    overflow: "hidden",
    ...SHADOWS.small,
  },
  secHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 10,
    paddingHorizontal: 14,
    backgroundColor: "#f8fafc",
    borderBottomWidth: 0.5,
    borderBottomColor: "#f0f4f8",
  },
  secTitleWrap: { flexDirection: "row", alignItems: "center", gap: 6 },
  secTitle: { fontSize: 13, fontWeight: "700", color: COLORS.primary },
  viewAll: { fontSize: 11, color: COLORS.primary, fontWeight: "600" },

  /* ATTENDANCE */
  statsRow: { flexDirection: "row", padding: 12, gap: 8 },
  stat: {
    flex: 1,
    backgroundColor: "#f8fafc",
    borderRadius: 10,
    padding: 10,
    alignItems: "center",
  },
  statIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  statVal: { fontSize: 20, fontWeight: "700", color: COLORS.text },
  statLbl: {
    fontSize: 9,
    color: COLORS.textMuted,
    letterSpacing: 0.5,
    marginTop: 2,
    fontWeight: "600",
  },
  progWrap: { paddingHorizontal: 14, paddingBottom: 14 },
  progPct: {
    fontSize: 12,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 6,
  },
  progTrack: {
    height: 10,
    backgroundColor: "#f0f4f8",
    borderRadius: 5,
    overflow: "hidden",
  },
  progFill: { height: "100%", borderRadius: 5 },
  progMin: {
    fontSize: 9,
    color: COLORS.danger,
    textAlign: "right",
    marginTop: 3,
    fontWeight: "600",
  },
  warnBox: {
    marginHorizontal: 14,
    marginBottom: 12,
    backgroundColor: COLORS.warningLight,
    borderRadius: 8,
    padding: 8,
  },
  warnText: {
    fontSize: 11,
    color: "#856404",
    fontWeight: "600",
    textAlign: "center",
  },

  /* TIMETABLE */
  slot: {
    padding: 12,
    paddingHorizontal: 14,
    borderBottomWidth: 0.5,
    borderBottomColor: "#f0f4f8",
  },
  slotTimeBox: {
    alignSelf: "flex-start",
    backgroundColor: "#e3f2fd",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginBottom: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  slotTimeText: { fontSize: 11, fontWeight: "600", color: "#1a4b6d" },
  slotSubject: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 4,
  },
  slotMeta: {
    flexDirection: "row",
    gap: 5,
    alignItems: "center",
    marginBottom: 4,
    flexWrap: "wrap",
  },
  slotBadge: {
    backgroundColor: COLORS.primary,
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  slotBadgeText: {
    color: COLORS.white,
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  slotCode: {
    fontSize: 10,
    color: COLORS.textMuted,
    backgroundColor: "#f0f4f8",
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 3,
  },
  slotInfo: { flexDirection: "row", gap: 10, flexWrap: "wrap" },
  slotInfoItem: { fontSize: 11, color: COLORS.textSecondary },
  showMore: { padding: 10, alignItems: "center", backgroundColor: "#f8fafc" },
  showMoreText: { fontSize: 12, color: COLORS.primary, fontWeight: "600" },

  emptyBox: { alignItems: "center", paddingVertical: 20 },
  emptyText: { fontSize: 13, color: COLORS.textMuted, marginBottom: 10 },
  viewTTBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  viewTTText: { color: COLORS.white, fontWeight: "700", fontSize: 12 },

  /* FEES */
  feeRow: { flexDirection: "row", padding: 12, gap: 8 },
  feeStat: {
    flex: 1,
    backgroundColor: "#f8fafc",
    borderRadius: 8,
    padding: 10,
    alignItems: "center",
  },
  feeLbl: {
    fontSize: 10,
    color: COLORS.textMuted,
    marginBottom: 3,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  feeVal: { fontSize: 13, fontWeight: "700" },
  feeStatusRow: { alignItems: "center", paddingBottom: 8 },
  feeStatusBadge: {
    paddingHorizontal: 16,
    paddingVertical: 4,
    borderRadius: 20,
  },
  feeStatusText: { fontSize: 11, fontWeight: "700", letterSpacing: 0.3 },
  payNowBtn: {
    marginHorizontal: 14,
    marginBottom: 14,
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: "center",
  },
  payNowText: { color: COLORS.white, fontWeight: "700", fontSize: 14 },

  /* NOTIFICATIONS */
  notifItem: {
    flexDirection: "row",
    gap: 10,
    padding: 12,
    paddingHorizontal: 14,
    borderBottomWidth: 0.5,
    borderBottomColor: "#f0f4f8",
  },
  notifUnread: {
    backgroundColor: "#e3f2fd",
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primary,
  },
  notifIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: COLORS.white,
    borderWidth: 0.5,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  notifTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 2,
  },
  notifMsg: {
    fontSize: 11,
    color: COLORS.textSecondary,
    lineHeight: 16,
    marginBottom: 4,
  },
  notifMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  notifTypeBadge: {
    backgroundColor: "#f0f4f8",
    borderRadius: 3,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  notifTypeText: {
    fontSize: 9,
    color: COLORS.textSecondary,
    fontWeight: "600",
    letterSpacing: 0.3,
  },
  notifDate: { fontSize: 9, color: COLORS.textMuted },
});

export default HomeScreen;
