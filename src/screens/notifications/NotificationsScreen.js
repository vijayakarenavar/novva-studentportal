import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  Platform,
} from "react-native";
import api from "../../services/api";

// ── Type config ───────────────────────────────────────────────────────────────
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

// ── Format date ───────────────────────────────────────────────────────────────
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

// ── Single Notification Card ──────────────────────────────────────────────────
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
        styles.card,
        isUrgent && !isExpired && styles.urgentCard,
        isExpired && styles.expiredCard,
      ]}
    >
      {/* Top color bar */}
      <View
        style={[
          styles.cardBar,
          { backgroundColor: isExpired ? "#9ca3af" : typeInfo.color },
        ]}
      />

      {/* Header */}
      <View style={styles.cardHeader}>
        <View style={styles.badgeRow}>
          {/* Type badge */}
          <View
            style={[
              styles.badge,
              { backgroundColor: isExpired ? "#e5e7eb" : typeInfo.bg },
            ]}
          >
            <Text style={{ fontSize: 11 }}>{typeInfo.icon}</Text>
            <Text
              style={[
                styles.badgeText,
                { color: isExpired ? "#6b7280" : typeInfo.color },
              ]}
            >
              {typeInfo.label}
            </Text>
          </View>

          {/* Expired badge */}
          {isExpired && (
            <View style={[styles.badge, { backgroundColor: "#fee2e2" }]}>
              <Text style={[styles.badgeText, { color: "#dc2626" }]}>
                Expired
              </Text>
            </View>
          )}
        </View>

        {/* Priority badge */}
        <View
          style={[styles.priorityBadge, { backgroundColor: priorityInfo.bg }]}
        >
          {isUrgent && <Text style={{ fontSize: 10 }}>⚠️ </Text>}
          <Text style={[styles.badgeText, { color: priorityInfo.color }]}>
            {priorityInfo.label}
          </Text>
        </View>
      </View>

      {/* Body */}
      <View style={styles.cardBody}>
        <Text style={[styles.cardTitle, isExpired && { color: "#9ca3af" }]}>
          {note.title}
        </Text>

        <Text style={[styles.cardMessage, isExpired && { color: "#9ca3af" }]}>
          {needsTruncation && !expanded
            ? note.message.substring(0, MESSAGE_LIMIT) + "..."
            : note.message}
        </Text>

        {needsTruncation && (
          <TouchableOpacity onPress={() => setExpanded(!expanded)}>
            <Text style={styles.readMore}>
              {expanded ? "▲ Show Less" : "▼ Read More"}
            </Text>
          </TouchableOpacity>
        )}

        {/* Footer */}
        <View style={styles.cardFooter}>
          <Text style={styles.dateText}>🕐 {formatDate(note.createdAt)}</Text>
          {note.createdBy?.name && (
            <Text style={styles.senderText}>👤 {note.createdBy.name}</Text>
          )}
        </View>

        {/* Expiry */}
        {note.expiresAt && (
          <View
            style={[
              styles.expiryBox,
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

// ── Section Header ─────────────────────────────────────────────────────────────
const SectionHeader = ({ icon, title, count, color }) => (
  <View style={[styles.sectionHeader, { borderLeftColor: color }]}>
    <Text style={styles.sectionIcon}>{icon}</Text>
    <Text style={[styles.sectionTitle, { color }]}>{title}</Text>
    <View style={[styles.countBadge, { backgroundColor: color }]}>
      <Text style={styles.countText}>{count}</Text>
    </View>
  </View>
);

// ── Main Screen ───────────────────────────────────────────────────────────────
const NotificationsScreen = () => {
  const [adminNotifs, setAdminNotifs] = useState([]);
  const [teacherNotifs, setTeacherNotifs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const fetchNotifications = async () => {
    try {
      setError(null);
      const res = await api.get("/notifications/student/read");
      const data = res.data.data || res.data; // ← हा fix

      setAdminNotifs(data.adminNotifications || []);
      setTeacherNotifs(data.teacherNotifications || []);
    } catch (err) {
      console.error("Notifications error:", err);
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

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#1a4b6d" />
        <Text style={styles.loadingText}>Loading notifications...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Page Header */}
      <View style={styles.pageHeader}>
        <Text style={styles.pageTitle}>🔔 Notifications</Text>
        <View style={styles.totalBadge}>
          <Text style={styles.totalText}>{totalCount} total</Text>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#1a4b6d"]}
          />
        }
      >
        {error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>⚠️ {error}</Text>
            <TouchableOpacity
              onPress={fetchNotifications}
              style={styles.retryBtn}
            >
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        {totalCount === 0 && !error && (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyIcon}>🔕</Text>
            <Text style={styles.emptyTitle}>No Notifications</Text>
            <Text style={styles.emptySubtitle}>You're all caught up!</Text>
          </View>
        )}

        {/* Admin Notifications */}
        {adminNotifs.length > 0 && (
          <View style={styles.section}>
            <SectionHeader
              icon="🏫"
              title="From College Admin"
              count={adminNotifs.length}
              color="#1a4b6d"
            />
            {adminNotifs.map((note) => (
              <NotifCard key={note._id} note={note} />
            ))}
          </View>
        )}

        {/* Teacher Notifications */}
        {teacherNotifs.length > 0 && (
          <View style={styles.section}>
            <SectionHeader
              icon="👨‍🏫"
              title="From Teachers"
              count={teacherNotifs.length}
              color="#7c3aed"
            />
            {teacherNotifs.map((note) => (
              <NotifCard key={note._id} note={note} />
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
};

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f1f5f9",
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f1f5f9",
  },
  loadingText: {
    marginTop: 12,
    color: "#64748b",
    fontSize: 14,
  },

  // Header
  pageHeader: {
    backgroundColor: "#1a4b6d",
    paddingTop: 48,
    paddingBottom: 16,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    ...(Platform.OS === "web"
      ? { boxShadow: "0 2px 8px rgba(0,0,0,0.15)" }
      : { elevation: 4 }),
  },
  pageTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#ffffff",
  },
  totalBadge: {
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
  },
  totalText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "600",
  },

  // Scroll
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 32 },

  // Section
  section: { marginBottom: 24 },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    paddingLeft: 12,
    borderLeftWidth: 4,
  },
  sectionIcon: { fontSize: 18, marginRight: 8 },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    flex: 1,
  },
  countBadge: {
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: 12,
  },
  countText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },

  // Card
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 14,
    marginBottom: 12,
    overflow: "hidden",
    ...(Platform.OS === "web"
      ? { boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }
      : { elevation: 2 }),
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

  expiryBox: {
    marginTop: 10,
    padding: 8,
    borderRadius: 8,
  },

  // Error
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

  // Empty
  emptyBox: {
    alignItems: "center",
    paddingVertical: 60,
  },
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
