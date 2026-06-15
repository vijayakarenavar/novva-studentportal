import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import api from "../../services/api";

const C = {
  primary: "#1a4b6d",
  primaryDark: "#0f3a4a",
  white: "#ffffff",
  bg: "#f1f5f9",
  border: "#e2e8f0",
};

const TYPE_CONFIG = {
  GENERAL: { icon: "ℹ️", label: "General", color: "#3b82f6", bg: "#dbeafe" },
  ACADEMIC: { icon: "🎓", label: "Academic", color: "#8b5cf6", bg: "#ede9fe" },
  EXAM: { icon: "📅", label: "Exam", color: "#ec4899", bg: "#fce7f3" },
  FEE: { icon: "💰", label: "Fee", color: "#f59e0b", bg: "#ffedd5" },
  ATTENDANCE: {
    icon: "✅",
    label: "Attendance",
    color: "#10b981",
    bg: "#dcfce7",
  },
  EVENT: { icon: "📢", label: "Event", color: "#ef4444", bg: "#fee2e2" },
  ASSIGNMENT: {
    icon: "📋",
    label: "Assignment",
    color: "#6366f1",
    bg: "#eef2ff",
  },
  URGENT: { icon: "🚨", label: "Urgent", color: "#dc2626", bg: "#fee2e2" },
};

const PRIORITY_CONFIG = {
  LOW: { color: "#64748b", bg: "#f1f5f9", label: "Low" },
  NORMAL: { color: "#1e40af", bg: "#dbeafe", label: "Normal" },
  MEDIUM: { color: "#d97706", bg: "#fef3c7", label: "Medium" },
  HIGH: { color: "#b91c1c", bg: "#fee2e2", label: "High" },
  URGENT: { color: "#dc2626", bg: "#fecaca", label: "Urgent" },
};

const formatDate = (dateString) => {
  if (!dateString) return "";
  const date = new Date(dateString);
  const now = new Date();
  const diff = now - date;
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);
  if (hours < 1) return "Just now";
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

// ─── NOTIF CARD ───────────────────────────────────────────────────────────────
const NotifCard = ({ note }) => {
  const [expanded, setExpanded] = useState(false);
  const type = note.type || "GENERAL";
  const priority = note.priority || "NORMAL";
  const typeInfo = TYPE_CONFIG[type] || TYPE_CONFIG.GENERAL;
  const priorityInfo = PRIORITY_CONFIG[priority] || PRIORITY_CONFIG.NORMAL;
  const isExpired = note.expiresAt && new Date(note.expiresAt) < new Date();
  const isUrgent = priority === "URGENT";
  const MESSAGE_LIMIT = 150;
  const needsTruncation = (note.message || "").length > MESSAGE_LIMIT;

  return (
    <View
      style={[
        st.card,
        isUrgent && !isExpired && st.urgentCard,
        isExpired && st.expiredCard,
      ]}
    >
      <View
        style={[
          st.cardBar,
          { backgroundColor: isExpired ? "#9ca3af" : typeInfo.color },
        ]}
      />
      <View style={st.cardHeader}>
        <View style={st.badgeRow}>
          <View
            style={[
              st.badge,
              { backgroundColor: isExpired ? "#e5e7eb" : typeInfo.bg },
            ]}
          >
            <Text style={{ fontSize: 11 }}>{typeInfo.icon}</Text>
            <Text
              style={[
                st.badgeText,
                { color: isExpired ? "#6b7280" : typeInfo.color },
              ]}
            >
              {typeInfo.label}
            </Text>
          </View>
          {isExpired && (
            <View style={[st.badge, { backgroundColor: "#fee2e2" }]}>
              <Text style={[st.badgeText, { color: "#dc2626" }]}>Expired</Text>
            </View>
          )}
        </View>
        <View style={[st.priorityBadge, { backgroundColor: priorityInfo.bg }]}>
          {isUrgent && <Text style={{ fontSize: 10 }}>⚠️ </Text>}
          <Text style={[st.badgeText, { color: priorityInfo.color }]}>
            {priorityInfo.label}
          </Text>
        </View>
      </View>
      <View style={st.cardBody}>
        <Text style={[st.cardTitle, isExpired && { color: "#9ca3af" }]}>
          {note.title}
        </Text>
        <Text style={[st.cardMessage, isExpired && { color: "#9ca3af" }]}>
          {needsTruncation && !expanded
            ? note.message.substring(0, MESSAGE_LIMIT) + "..."
            : note.message}
        </Text>
        {needsTruncation && (
          <TouchableOpacity onPress={() => setExpanded(!expanded)}>
            <Text style={st.readMore}>
              {expanded ? "▲ Show Less" : "▼ Read More"}
            </Text>
          </TouchableOpacity>
        )}
        <View style={st.cardFooter}>
          <Text style={st.dateText}>🕐 {formatDate(note.createdAt)}</Text>
          {note.createdBy?.name && (
            <Text style={st.senderText}>👤 {note.createdBy.name}</Text>
          )}
        </View>
        {note.expiresAt && (
          <View
            style={[
              st.expiryBox,
              { backgroundColor: isExpired ? "#fee2e2" : "#fef3c7" },
            ]}
          >
            <Text
              style={{ color: isExpired ? "#dc2626" : "#92400e", fontSize: 12 }}
            >
              📅 {isExpired ? "Expired: " : "Expires: "}
              {new Date(note.expiresAt).toLocaleDateString("en-GB", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
};

// ─── SECTION HEADER ───────────────────────────────────────────────────────────
const SectionHeader = ({ icon, title, count, color }) => (
  <View style={[st.sectionHeader, { borderLeftColor: color }]}>
    <Text style={st.sectionIcon}>{icon}</Text>
    <Text style={[st.sectionTitle, { color }]}>{title}</Text>
    <View style={[st.countBadge, { backgroundColor: color }]}>
      <Text style={st.countText}>{count}</Text>
    </View>
  </View>
);

// ─── MAIN SCREEN ─────────────────────────────────────────────────────────────
const NotificationsScreen = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets(); // ✅ Safe Area
  const { width } = useWindowDimensions(); // ✅ Responsive

  const [adminNotifs, setAdminNotifs] = useState([]);
  const [teacherNotifs, setTeacherNotifs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // ─── PARSE HELPER ───────────────────────────────────────────────────────────
  const parseNotifications = (raw) => {
    let adminList = [];
    let teacherList = [];

    // flat array: { data: [...] }
    if (Array.isArray(raw?.data)) {
      const all = raw.data;
      adminList = all.filter(
        (n) =>
          n.createdByRole === "COLLEGE_ADMIN" || n.createdByRole === "ADMIN",
      );
      teacherList = all.filter((n) => n.createdByRole === "TEACHER");
    }
    // nested object: { data: { adminNotifications[], teacherNotifications[] } }
    else if (
      raw?.data?.adminNotifications !== undefined ||
      raw?.data?.teacherNotifications !== undefined
    ) {
      adminList = raw.data.adminNotifications || [];
      teacherList = raw.data.teacherNotifications || [];
    }
    // direct object: { adminNotifications[], teacherNotifications[] }
    else if (
      raw?.adminNotifications !== undefined ||
      raw?.teacherNotifications !== undefined
    ) {
      adminList = raw.adminNotifications || [];
      teacherList = raw.teacherNotifications || [];
    }
    // direct flat array
    else if (Array.isArray(raw)) {
      adminList = raw.filter(
        (n) =>
          n.createdByRole === "COLLEGE_ADMIN" || n.createdByRole === "ADMIN",
      );
      teacherList = raw.filter((n) => n.createdByRole === "TEACHER");
    }

    return { adminList, teacherList };
  };

  // ─── FETCH ──────────────────────────────────────────────────────────────────
  const fetchNotifications = async () => {
    try {
      setError(null);

      // ✅ Donhi endpoints try karto — jo jast notifications detoy to vaprto
      const endpoints = [
        "/notifications/student",
        "/notifications/student/read",
      ];
      let bestAdmin = [];
      let bestTeacher = [];

      for (const endpoint of endpoints) {
        try {
          const res = await api.get(endpoint);
          const { adminList, teacherList } = parseNotifications(res.data);
          const total = adminList.length + teacherList.length;
          const bestTotal = bestAdmin.length + bestTeacher.length;

          console.log(
            `[${endpoint}] Admin: ${adminList.length}, Teacher: ${teacherList.length}`,
          );

          // Jo endpoint jast data detoy to vaprto
          if (total > bestTotal) {
            bestAdmin = adminList;
            bestTeacher = teacherList;
          }
        } catch (e) {
        }
      }

      setAdminNotifs(bestAdmin);
      setTeacherNotifs(bestTeacher);
    } catch (err) {
      setError("Failed to load notifications");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchNotifications();
  };

  const totalCount = adminNotifs.length + teacherNotifs.length;

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <View
        style={[
          st.centered,
          { paddingTop: insets.top, paddingBottom: insets.bottom },
        ]}
      >
        <ActivityIndicator size="large" color={C.primary} />
        <Text style={st.loadingText}>Loading notifications...</Text>
      </View>
    );
  }

  return (
    // ✅ Root handles left/right insets (landscape notch)
    <View
      style={[
        st.container,
        { paddingLeft: insets.left, paddingRight: insets.right },
      ]}
    >
      {/* ✅ TOP BAR — insets.top instead of StatusBar hack */}
      <View style={[st.topBar, { paddingTop: insets.top + 14 }]}>
        <View style={st.circle1} />
        <View style={st.circle2} />
        <View style={st.topBarRow}>
          <TouchableOpacity
            style={st.topBackBtn}
            onPress={() => navigation.goBack()}
            hitSlop={{ top: 8, left: 8, right: 8, bottom: 8 }}
          >
            <Text style={st.topBackBtnText}>←</Text>
          </TouchableOpacity>
          <Text style={st.topBarTitle}>Notifications</Text>
          <View style={st.totalBadge}>
            <Text style={st.totalText}>{totalCount}</Text>
          </View>
        </View>
      </View>

      <ScrollView
        style={st.scroll}
        contentContainerStyle={[
          st.scrollContent,
          { paddingBottom: insets.bottom + 32 },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[C.primary]}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Error */}
        {error && (
          <View style={st.errorBox}>
            <Text style={st.errorText}>⚠️ {error}</Text>
            <TouchableOpacity onPress={fetchNotifications} style={st.retryBtn}>
              <Text style={st.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Empty */}
        {totalCount === 0 && !error && (
          <View style={st.emptyBox}>
            <Text style={st.emptyIcon}>🔕</Text>
            <Text style={st.emptyTitle}>No Notifications</Text>
            <Text style={st.emptySubtitle}>You're all caught up!</Text>
          </View>
        )}

        {/* Admin notifications */}
        {adminNotifs.length > 0 && (
          <View style={st.section}>
            <SectionHeader
              icon="🏫"
              title="From College Admin"
              count={adminNotifs.length}
              color={C.primary}
            />
            {adminNotifs.map((note, i) => (
              <NotifCard key={note._id || i} note={note} />
            ))}
          </View>
        )}

        {/* Teacher notifications */}
        {teacherNotifs.length > 0 && (
          <View style={st.section}>
            <SectionHeader
              icon="👨‍🏫"
              title="From Teachers"
              count={teacherNotifs.length}
              color="#7c3aed"
            />
            {teacherNotifs.map((note, i) => (
              <NotifCard key={note._id || i} note={note} />
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
};

// ─── STYLES ──────────────────────────────────────────────────────────────────
const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: C.bg,
  },
  loadingText: { marginTop: 12, color: "#64748b", fontSize: 14 },

  // ✅ topBar — no StatusBar/Platform hacks, insets handle karato
  topBar: {
    backgroundColor: C.primary,
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderRadius: 20,
    marginHorizontal: 8,
    marginTop: 8,
    marginBottom: 8,
    overflow: "hidden",
    position: "relative",
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
  topBarTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: C.white,
    flex: 1,
    textAlign: "center",
  },
  totalBadge: {
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  totalText: { color: C.white, fontSize: 12, fontWeight: "700" },

  scroll: { flex: 1 },
  scrollContent: { padding: 16 },

  section: { marginBottom: 24 },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    paddingLeft: 12,
    borderLeftWidth: 4,
  },
  sectionIcon: { fontSize: 18, marginRight: 8 },
  sectionTitle: { fontSize: 16, fontWeight: "700", flex: 1 },
  countBadge: { paddingHorizontal: 10, paddingVertical: 2, borderRadius: 12 },
  countText: { color: "#fff", fontSize: 12, fontWeight: "700" },

  card: {
    backgroundColor: "#ffffff",
    borderRadius: 14,
    marginBottom: 12,
    overflow: "hidden",
    elevation: 2,
  },
  urgentCard: { borderWidth: 1.5, borderColor: "#dc2626" },
  expiredCard: { opacity: 0.75 },
  cardBar: { height: 3 },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 12,
    paddingBottom: 8,
    backgroundColor: "#f8fafc",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  badgeRow: { flexDirection: "row", gap: 6, flexWrap: "wrap" },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    gap: 4,
  },
  priorityBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: { fontSize: 11, fontWeight: "700" },
  cardBody: { padding: 14 },
  cardTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1e293b",
    marginBottom: 6,
    lineHeight: 20,
  },
  cardMessage: {
    fontSize: 13,
    color: "#64748b",
    lineHeight: 19,
    marginBottom: 6,
  },
  readMore: {
    fontSize: 13,
    color: "#3b82f6",
    fontWeight: "600",
    marginBottom: 10,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
    marginTop: 4,
  },
  dateText: { fontSize: 12, color: "#94a3b8" },
  senderText: { fontSize: 12, color: "#94a3b8" },
  expiryBox: { marginTop: 10, padding: 8, borderRadius: 8 },

  errorBox: {
    backgroundColor: "#fee2e2",
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    alignItems: "center",
  },
  errorText: { color: "#dc2626", fontSize: 14, marginBottom: 10 },
  retryBtn: {
    backgroundColor: "#dc2626",
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 8,
  },
  retryText: { color: "#fff", fontWeight: "700", fontSize: 13 },

  emptyBox: { alignItems: "center", paddingVertical: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1e293b",
    marginBottom: 6,
  },
  emptySubtitle: { fontSize: 14, color: "#64748b" },
});

export default NotificationsScreen;
