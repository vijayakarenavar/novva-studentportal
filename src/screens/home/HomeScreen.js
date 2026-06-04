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
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import { COLORS, SIZES, SHADOWS } from "../../constants/theme";

// ─── Helpers ────────────────────────────────────────────────────────────────

const formatTime12 = (t) => {
  if (!t) return "";
  const [h, m] = t.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, "0")} ${period}`;
};

const useScale = () => {
  const { width } = useWindowDimensions();
  return Math.min(Math.max(width / 390, 0.75), 1.25);
};

// ─── Date Helpers ────────────────────────────────────────────────────────────

const toLocalDateStr = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;

const getWeekRange = () => {
  const today = new Date();
  const dow = today.getDay();
  const offset = dow === 0 ? -6 : 1 - dow;
  const mon = new Date(today);
  mon.setDate(today.getDate() + offset);
  const sun = new Date(mon);
  sun.setDate(mon.getDate() + 6);
  return { startDate: toLocalDateStr(mon), endDate: toLocalDateStr(sun) };
};

// ─── Component ──────────────────────────────────────────────────────────────

const HomeScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [collegeName, setCollegeName] = useState("");
  const [todaySlots, setTodaySlots] = useState([]); // ✅ Real timetable slots

  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;
  const scale = useScale();
  const rs = (size) => Math.round(size * scale);

  const fadeAnim = useRef(new Animated.Value(0)).current;

  const navigateToFees = () => navigation.getParent()?.navigate("Fees");

  useEffect(() => {
    fetchDashboard();
  }, []);

  // ✅ FIXED: fetchDashboard now also fetches real timetable slots
  const fetchDashboard = async () => {
    try {
      const todayStr = toLocalDateStr(new Date());
      const { startDate, endDate } = getWeekRange();

      // Step 1: Fetch dashboard + profile in parallel
      const [dashRes, profileRes] = await Promise.allSettled([
        api.get("/dashboard/student"),
        api.get("/students/my-profile"),
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

      const name =
        profileData?.college?.name ||
        dashData?.college?.name ||
        dashData?.student?.collegeName ||
        dashData?.collegeName ||
        "";
      if (name) setCollegeName(name);

      // Step 2: ✅ Fetch real timetable (same as TimetableScreen)
      try {
        const ttRes = await api.get("/timetable/student");
        const resData = ttRes.data?.data || ttRes.data || {};
        const allSlots = resData.slots || resData || [];

        if (allSlots?.length) {
          // Find timetable ID
          const firstSlot = allSlots.find((s) => s.timetable_id);
          const tId =
            typeof firstSlot?.timetable_id === "object"
              ? firstSlot?.timetable_id?._id
              : firstSlot?.timetable_id;

          if (tId) {
            // Fetch schedule for current week
            const schRes = await api.get(`/timetable/${tId}/schedule`, {
              params: { startDate, endDate },
            });
            const schedule = schRes.data?.schedule || [];

            // Find today's slots from schedule
            const todaySchedule = schedule.find((d) => d.date === todayStr);
            if (todaySchedule?.slots?.length) {
              // Map to HomeScreen-compatible format
              const mapped = todaySchedule.slots
                .filter((s) => s.subject_id?.name) // valid slots only
                .map((s) => ({
                  ...s,
                  subject: s.subject_id?.name,
                  teacher: s.teacher_id?.name,
                  code: s.subject_id?.code,
                  room: s.room,
                  slotType: s.slotType || "LECTURE",
                  startTime: s.startTime,
                  endTime: s.endTime,
                }));
              setTodaySlots(mapped);
            } else {
              // Fallback: use old format filtered by today's day
              const DAY_MAP = {
                0: "SUN",
                1: "MON",
                2: "TUE",
                3: "WED",
                4: "THU",
                5: "FRI",
                6: "SAT",
              };
              const todayAbbr = DAY_MAP[new Date().getDay()];
              const fallback = allSlots
                .filter((s) => s.day === todayAbbr && s.subject_id?.name)
                .map((s) => ({
                  ...s,
                  subject: s.subject_id?.name || s.subject,
                  teacher: s.teacher_id?.name || s.teacher,
                  code: s.subject_id?.code || s.code,
                }));
              setTodaySlots(fallback);
            }
          } else {
            // Old format — no timetable_id
            const DAY_MAP = {
              0: "SUN",
              1: "MON",
              2: "TUE",
              3: "WED",
              4: "THU",
              5: "FRI",
              6: "SAT",
            };
            const todayAbbr = DAY_MAP[new Date().getDay()];
            const fallback = allSlots
              .filter(
                (s) => s.day === todayAbbr && (s.subject_id?.name || s.subject),
              )
              .map((s) => ({
                ...s,
                subject: s.subject_id?.name || s.subject,
                teacher: s.teacher_id?.name || s.teacher,
                code: s.subject_id?.code || s.code,
              }));
            setTodaySlots(fallback);
          }
        } else {
          // No timetable at all — fallback to dashboard todayTimetable
          setTodaySlots(dashData?.todayTimetable || []);
        }
      } catch (ttErr) {
        console.warn(
          "Timetable fetch failed, using dashboard fallback:",
          ttErr,
        );
        // Fallback to dashboard data if timetable API fails
        setTodaySlots(dashData?.todayTimetable || []);
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

  const formatCurrency = (amount) =>
    `₹${Number(amount || 0).toLocaleString("en-IN")}`;

  const getAttColor = (pct) =>
    pct >= 75 ? COLORS.success : pct >= 60 ? COLORS.warning : COLORS.danger;

  // ── Loading ──────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <View
        style={[
          s.loadingContainer,
          {
            paddingTop: insets.top,
            paddingBottom: insets.bottom,
          },
        ]}
      >
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
  const twoCol = isLandscape;

  return (
    <View
      style={[
        s.root,
        {
          paddingTop: insets.top,
          paddingLeft: insets.left,
          paddingRight: insets.right,
        },
      ]}
    >
      <Animated.ScrollView
        style={{ opacity: fadeAnim }}
        contentContainerStyle={[
          s.scrollContent,
          {
            paddingHorizontal: rs(12),
            paddingBottom: insets.bottom + rs(24),
            paddingTop: rs(8),
            gap: rs(10),
          },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[COLORS.primary]}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* ── WELCOME CARD ── */}
        <View
          style={[
            s.welcomeCard,
            {
              borderRadius: rs(20),
              padding: rs(18),
              marginTop: rs(8),
            },
          ]}
        >
          <View style={s.circleTop} />
          <View style={s.circleBottom} />

          <View style={[s.welcomeRow, { gap: rs(14), marginBottom: rs(16) }]}>
            <View
              style={[
                s.welcomeAvatar,
                { width: rs(52), height: rs(52), borderRadius: rs(14) },
              ]}
            >
              <Text style={{ fontSize: rs(26) }}>🎓</Text>
            </View>
            <View style={s.welcomeInfo}>
              <Text style={[s.welcomeLabel, { fontSize: rs(11) }]}>
                Welcome back
              </Text>
              <Text
                style={[s.welcomeName, { fontSize: rs(17) }]}
                numberOfLines={1}
              >
                {student.name || user?.name || "Student"}!
              </Text>
              {student.enrollmentNumber &&
                student.enrollmentNumber !== "N/A" && (
                  <Text style={[s.enrollText, { fontSize: rs(11) }]}>
                    🪪 {student.enrollmentNumber}
                  </Text>
                )}
            </View>
          </View>

          {/* Bell button */}
          <TouchableOpacity
            style={[
              s.bellBtn,
              {
                top: rs(14),
                right: rs(14),
                width: rs(34),
                height: rs(34),
                borderRadius: rs(12),
              },
            ]}
            activeOpacity={0.7}
            onPress={() => navigation.navigate("Notifications")}
          >
            <Text style={{ fontSize: rs(18) }}>🔔</Text>
            {unreadCount > 0 && (
              <View style={s.badge}>
                <Text style={[s.badgeText, { fontSize: rs(9) }]}>
                  {unreadCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Pay Fees button */}
          <TouchableOpacity
            style={[
              s.payBtn,
              { borderRadius: rs(10), paddingVertical: rs(10) },
            ]}
            activeOpacity={0.8}
            onPress={navigateToFees}
          >
            <Text style={[s.payBtnText, { fontSize: rs(13) }]}>
              💳 Pay Fees
            </Text>
          </TouchableOpacity>
        </View>

        {/* ── LANDSCAPE: Attendance + Fees side-by-side ── */}
        {twoCol ? (
          <View style={{ flexDirection: "row", gap: rs(10) }}>
            <View style={[s.sectionCard, { flex: 1 }]}>
              {renderSectionHeader(
                "📊",
                "Attendance Summary",
                "👁 View All",
                () => navigation.navigate("Attendance"),
                rs,
              )}
              {renderAttendanceBody(attendance, getAttColor, rs)}
            </View>
            <View style={[s.sectionCard, { flex: 1 }]}>
              {renderSectionHeader(
                "💰",
                "Fee Summary",
                "👁 View Details",
                navigateToFees,
                rs,
              )}
              {renderFeesBody(feeSummary, formatCurrency, navigateToFees, rs)}
            </View>
          </View>
        ) : (
          <>
            <View style={s.sectionCard}>
              {renderSectionHeader(
                "📊",
                "Attendance Summary",
                "👁 View All",
                () => navigation.navigate("Attendance"),
                rs,
              )}
              {renderAttendanceBody(attendance, getAttColor, rs)}
            </View>
            <View style={s.sectionCard}>
              {renderSectionHeader(
                "💰",
                "Fee Summary",
                "👁 View Details",
                navigateToFees,
                rs,
              )}
              {renderFeesBody(feeSummary, formatCurrency, navigateToFees, rs)}
            </View>
          </>
        )}

        {/* ── TODAY'S CLASSES ── ✅ Now uses real timetable data */}
        <View style={s.sectionCard}>
          {renderSectionHeader(
            "📅",
            "Today's Classes",
            "📋 Full Timetable",
            () => navigation.navigate("Timetable"),
            rs,
          )}
          {todaySlots.length === 0 ? (
            <View style={[s.emptyBox, { paddingVertical: rs(20) }]}>
              <Text style={{ fontSize: rs(32), marginBottom: rs(6) }}>☀️</Text>
              <Text style={[s.emptyText, { fontSize: rs(13) }]}>
                No classes today
              </Text>
              <TouchableOpacity
                style={[
                  s.viewTTBtn,
                  {
                    paddingHorizontal: rs(16),
                    paddingVertical: rs(8),
                    borderRadius: rs(8),
                  },
                ]}
                onPress={() => navigation.navigate("Timetable")}
              >
                <Text style={[s.viewTTText, { fontSize: rs(12) }]}>
                  📅 View Full Timetable →
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              {todaySlots.slice(0, 3).map((slot, i) => (
                <View
                  key={slot._id || i}
                  style={[
                    s.slot,
                    { padding: rs(12), paddingHorizontal: rs(14) },
                  ]}
                >
                  <View
                    style={[
                      s.slotTimeBox,
                      {
                        borderRadius: rs(6),
                        paddingHorizontal: rs(8),
                        paddingVertical: rs(3),
                        marginBottom: rs(6),
                      },
                    ]}
                  >
                    <Text style={[s.slotTimeText, { fontSize: rs(11) }]}>
                      🕐 {formatTime12(slot.startTime)} –{" "}
                      {formatTime12(slot.endTime)}
                    </Text>
                  </View>
                  <Text
                    style={[
                      s.slotSubject,
                      { fontSize: rs(14), marginBottom: rs(4) },
                    ]}
                    numberOfLines={1}
                  >
                    {slot.subject || slot.subject_id?.name || "—"}
                  </Text>
                  <View
                    style={[s.slotMeta, { gap: rs(5), marginBottom: rs(4) }]}
                  >
                    <View
                      style={[
                        s.slotBadge,
                        {
                          borderRadius: rs(4),
                          paddingHorizontal: rs(8),
                          paddingVertical: rs(2),
                        },
                      ]}
                    >
                      <Text style={[s.slotBadgeText, { fontSize: rs(9) }]}>
                        {slot.slotType || "LECTURE"}
                      </Text>
                    </View>
                    {slot.code ? (
                      <Text
                        style={[
                          s.slotCode,
                          {
                            fontSize: rs(10),
                            paddingHorizontal: rs(5),
                            paddingVertical: rs(2),
                            borderRadius: rs(3),
                          },
                        ]}
                      >
                        {slot.code}
                      </Text>
                    ) : null}
                  </View>
                  <View style={[s.slotInfo, { gap: rs(10) }]}>
                    <Text style={[s.slotInfoItem, { fontSize: rs(11) }]}>
                      👨‍🏫 {slot.teacher || slot.teacher_id?.name || "TBA"}
                    </Text>
                    {slot.room ? (
                      <Text style={[s.slotInfoItem, { fontSize: rs(11) }]}>
                        📍 Room {slot.room}
                      </Text>
                    ) : null}
                  </View>
                </View>
              ))}
              {todaySlots.length > 3 && (
                <TouchableOpacity
                  style={s.showMore}
                  onPress={() => navigation.navigate("Timetable")}
                >
                  <Text style={[s.showMoreText, { fontSize: rs(12) }]}>
                    +{todaySlots.length - 3} more classes → View All
                  </Text>
                </TouchableOpacity>
              )}
            </>
          )}
        </View>

        {/* ── NOTIFICATIONS ── */}
        <View style={s.sectionCard}>
          {renderSectionHeader(
            "🔔",
            "Latest Notifications",
            "👁 View All",
            () => navigation.navigate("Notifications"),
            rs,
          )}
          {notifications.length === 0 ? (
            <View style={[s.emptyBox, { paddingVertical: rs(20) }]}>
              <Text style={{ fontSize: rs(32), marginBottom: rs(6) }}>🔔</Text>
              <Text style={[s.emptyText, { fontSize: rs(13) }]}>
                No new notifications
              </Text>
            </View>
          ) : (
            notifications.slice(0, 3).map((notif, i) => (
              <View
                key={notif._id || i}
                style={[
                  s.notifItem,
                  { gap: rs(10), padding: rs(12), paddingHorizontal: rs(14) },
                  !notif.isRead && s.notifUnread,
                ]}
              >
                <View
                  style={[
                    s.notifIconWrap,
                    { width: rs(32), height: rs(32), borderRadius: rs(8) },
                  ]}
                >
                  <Text style={{ fontSize: rs(14) }}>🔔</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text
                    style={[
                      s.notifTitle,
                      { fontSize: rs(12), marginBottom: rs(2) },
                    ]}
                  >
                    {notif.title}
                  </Text>
                  <Text
                    style={[
                      s.notifMsg,
                      { fontSize: rs(11), marginBottom: rs(4) },
                    ]}
                    numberOfLines={2}
                  >
                    {notif.message}
                  </Text>
                  <View style={s.notifMeta}>
                    <View style={s.notifTypeBadge}>
                      <Text style={[s.notifTypeText, { fontSize: rs(9) }]}>
                        {notif.type}
                      </Text>
                    </View>
                    <Text style={[s.notifDate, { fontSize: rs(9) }]}>
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

// ─── Pure render helpers ─────────────────────────────────────────────────────

function renderSectionHeader(icon, title, actionLabel, onPress, rs) {
  return (
    <View style={[s.secHead, { padding: rs(10), paddingHorizontal: rs(14) }]}>
      <View style={[s.secTitleWrap, { gap: rs(6) }]}>
        <Text style={{ fontSize: rs(15) }}>{icon}</Text>
        <Text style={[s.secTitle, { fontSize: rs(13) }]}>{title}</Text>
      </View>
      <TouchableOpacity
        onPress={onPress}
        hitSlop={{ top: 8, left: 8, right: 8, bottom: 8 }}
      >
        <Text style={[s.viewAll, { fontSize: rs(11) }]}>{actionLabel}</Text>
      </TouchableOpacity>
    </View>
  );
}

function renderAttendanceBody(attendance, getAttColor, rs) {
  return (
    <>
      <View style={[s.statsRow, { padding: rs(12), gap: rs(8) }]}>
        {[
          {
            icon: "✅",
            val: attendance.present,
            lbl: "PRESENT",
            bg: "#d4edda",
          },
          { icon: "❌", val: attendance.absent, lbl: "ABSENT", bg: "#f8d7da" },
          { icon: "🕐", val: attendance.total, lbl: "TOTAL", bg: "#e3f2fd" },
        ].map(({ icon, val, lbl, bg }) => (
          <View
            key={lbl}
            style={[s.stat, { borderRadius: rs(10), padding: rs(10) }]}
          >
            <View
              style={[
                s.statIcon,
                {
                  backgroundColor: bg,
                  width: rs(32),
                  height: rs(32),
                  borderRadius: rs(8),
                  marginBottom: rs(6),
                },
              ]}
            >
              <Text style={{ fontSize: rs(14) }}>{icon}</Text>
            </View>
            <Text style={[s.statVal, { fontSize: rs(20) }]}>{val}</Text>
            <Text style={[s.statLbl, { fontSize: rs(9), marginTop: rs(2) }]}>
              {lbl}
            </Text>
          </View>
        ))}
      </View>
      <View
        style={[
          s.progWrap,
          { paddingHorizontal: rs(14), paddingBottom: rs(14) },
        ]}
      >
        <Text
          style={[
            s.progPct,
            {
              fontSize: rs(12),
              marginBottom: rs(6),
              color: getAttColor(attendance.percentage),
            },
          ]}
        >
          {attendance.percentage}% Overall Attendance
        </Text>
        <View style={[s.progTrack, { height: rs(10), borderRadius: rs(5) }]}>
          <View
            style={[
              s.progFill,
              {
                width: `${Math.min(attendance.percentage, 100)}%`,
                backgroundColor: getAttColor(attendance.percentage),
                borderRadius: rs(5),
              },
            ]}
          />
        </View>
        <Text style={[s.progMin, { fontSize: rs(9), marginTop: rs(3) }]}>
          75% Min
        </Text>
      </View>
      {attendance.warning && (
        <View
          style={[
            s.warnBox,
            {
              marginHorizontal: rs(14),
              marginBottom: rs(12),
              borderRadius: rs(8),
              padding: rs(8),
            },
          ]}
        >
          <Text style={[s.warnText, { fontSize: rs(11) }]}>
            ⚠ Low Attendance! Minimum 75% required for exam eligibility.
          </Text>
        </View>
      )}
    </>
  );
}

function renderFeesBody(feeSummary, formatCurrency, navigateToFees, rs) {
  return (
    <>
      <View style={[s.feeRow, { padding: rs(12), gap: rs(8) }]}>
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
          <View
            key={lbl}
            style={[s.feeStat, { borderRadius: rs(8), padding: rs(10) }]}
          >
            <Text style={[s.feeLbl, { fontSize: rs(10), marginBottom: rs(3) }]}>
              {lbl}
            </Text>
            <Text style={[s.feeVal, { fontSize: rs(13), color }]}>{val}</Text>
          </View>
        ))}
      </View>
      <View style={[s.feeStatusRow, { paddingBottom: rs(8) }]}>
        <View
          style={[
            s.feeStatusBadge,
            {
              paddingHorizontal: rs(16),
              paddingVertical: rs(4),
              borderRadius: rs(20),
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
                fontSize: rs(11),
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
          style={[
            s.payNowBtn,
            {
              marginHorizontal: rs(14),
              marginBottom: rs(14),
              borderRadius: rs(8),
              paddingVertical: rs(12),
            },
          ]}
          activeOpacity={0.8}
          onPress={navigateToFees}
        >
          <Text style={[s.payNowText, { fontSize: rs(14) }]}>₹ Pay Now</Text>
        </TouchableOpacity>
      )}
    </>
  );
}

// ─── StyleSheet ──────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.background,
  },
  loadingText: { marginTop: 12, color: COLORS.textSecondary, fontSize: 14 },
  scrollContent: { flexGrow: 1 },

  welcomeCard: {
    backgroundColor: "#1a4b6d",
    overflow: "hidden",
    position: "relative",
  },
  circleTop: {
    position: "absolute",
    top: -35,
    right: -35,
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  circleBottom: {
    position: "absolute",
    bottom: -25,
    left: 30,
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  welcomeRow: { flexDirection: "row", alignItems: "center" },
  welcomeAvatar: {
    backgroundColor: "rgba(255,255,255,0.15)",
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.25)",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  welcomeInfo: { flex: 1 },
  welcomeLabel: {
    color: "rgba(255,255,255,0.6)",
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  welcomeName: { fontWeight: "700", color: "#fff", marginBottom: 4 },
  enrollText: { color: "rgba(255,255,255,0.55)" },
  payBtn: {
    backgroundColor: "rgba(255,255,255,0.18)",
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.3)",
    alignItems: "center",
    justifyContent: "center",
  },
  payBtnText: { color: "#fff", fontWeight: "700", letterSpacing: 0.3 },
  bellBtn: {
    position: "absolute",
    backgroundColor: "rgba(255,255,255,0.15)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
    alignItems: "center",
    justifyContent: "center",
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
  badgeText: { color: COLORS.white, fontWeight: "700" },

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
    backgroundColor: "#f8fafc",
    borderBottomWidth: 0.5,
    borderBottomColor: "#f0f4f8",
  },
  secTitleWrap: { flexDirection: "row", alignItems: "center" },
  secTitle: { fontWeight: "700", color: COLORS.primary },
  viewAll: { color: COLORS.primary, fontWeight: "600" },

  statsRow: { flexDirection: "row" },
  stat: { flex: 1, backgroundColor: "#f8fafc", alignItems: "center" },
  statIcon: { alignItems: "center", justifyContent: "center" },
  statVal: { fontWeight: "700", color: COLORS.text },
  statLbl: {
    color: COLORS.textMuted,
    letterSpacing: 0.5,
    fontWeight: "600",
    textTransform: "uppercase",
  },
  progWrap: {},
  progPct: { fontWeight: "700", textAlign: "center" },
  progTrack: { backgroundColor: "#f0f4f8", overflow: "hidden" },
  progFill: { height: "100%" },
  progMin: { color: COLORS.danger, textAlign: "right", fontWeight: "600" },
  warnBox: { backgroundColor: COLORS.warningLight },
  warnText: { color: "#856404", fontWeight: "600", textAlign: "center" },

  slot: { borderBottomWidth: 0.5, borderBottomColor: "#f0f4f8" },
  slotTimeBox: { alignSelf: "flex-start", backgroundColor: "#e3f2fd" },
  slotTimeText: { fontWeight: "600", color: "#1a4b6d" },
  slotSubject: { fontWeight: "700", color: COLORS.text },
  slotMeta: { flexDirection: "row", alignItems: "center", flexWrap: "wrap" },
  slotBadge: { backgroundColor: COLORS.primary },
  slotBadgeText: { color: COLORS.white, fontWeight: "700", letterSpacing: 0.3 },
  slotCode: { color: COLORS.textMuted, backgroundColor: "#f0f4f8" },
  slotInfo: { flexDirection: "row", flexWrap: "wrap" },
  slotInfoItem: { color: COLORS.textSecondary },
  showMore: { padding: 10, alignItems: "center", backgroundColor: "#f8fafc" },
  showMoreText: { color: COLORS.primary, fontWeight: "600" },
  emptyBox: { alignItems: "center" },
  emptyText: { color: COLORS.textMuted, marginBottom: 10 },
  viewTTBtn: { backgroundColor: COLORS.primary },
  viewTTText: { color: COLORS.white, fontWeight: "700" },

  feeRow: { flexDirection: "row" },
  feeStat: { flex: 1, backgroundColor: "#f8fafc", alignItems: "center" },
  feeLbl: {
    color: COLORS.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  feeVal: { fontWeight: "700" },
  feeStatusRow: { alignItems: "center" },
  feeStatusBadge: {},
  feeStatusText: { fontWeight: "700", letterSpacing: 0.3 },
  payNowBtn: { backgroundColor: COLORS.primary, alignItems: "center" },
  payNowText: { color: COLORS.white, fontWeight: "700" },

  notifItem: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: "#f0f4f8",
  },
  notifUnread: {
    backgroundColor: "#e3f2fd",
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primary,
  },
  notifIconWrap: {
    backgroundColor: COLORS.white,
    borderWidth: 0.5,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  notifTitle: { fontWeight: "700", color: COLORS.text },
  notifMsg: { color: COLORS.textSecondary, lineHeight: 16 },
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
    color: COLORS.textSecondary,
    fontWeight: "600",
    letterSpacing: 0.3,
  },
  notifDate: { color: COLORS.textMuted },
});

export default HomeScreen;
