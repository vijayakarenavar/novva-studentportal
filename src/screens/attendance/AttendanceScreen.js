import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Platform,
  StatusBar,
} from "react-native";
import api from "../../services/api";
import { COLORS, SIZES, SHADOWS } from "../../constants/theme";

const C = {
  primary: "#1a4b6d",
  primaryDark: "#0f3a4a",
  white: "#ffffff",
  bg: "#f0f4f8",
  border: "#e2e8f0",
};

const AttendanceScreen = ({ navigation }) => {
  const [attendanceData, setAttendanceData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchAttendance();
  }, []);

  const fetchAttendance = async () => {
    try {
      const res = await api.get("/dashboard/student");
      const dashData = res.data?.data || res.data;
      setAttendanceData({
        summary: dashData?.attendanceSummary || {
          present: 0,
          absent: 0,
          total: 0,
          percentage: 0,
          warning: false,
        },
        subjects: dashData?.subjectWiseAttendance || [],
      });
    } catch (err) {
      console.error("Attendance error:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchAttendance();
  };

  const getAttendanceColor = (pct) => {
    if (pct >= 75) return COLORS.success;
    if (pct >= 60) return COLORS.warning;
    return COLORS.danger;
  };

  const getAttendanceBg = (pct) => {
    if (pct >= 75) return "#d4edda";
    if (pct >= 60) return "#fff3cd";
    return "#f8d7da";
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={{ fontSize: 48 }}>📊</Text>
        <ActivityIndicator
          size="large"
          color={COLORS.primary}
          style={{ marginTop: 16 }}
        />
        <Text style={styles.loadingText}>Loading attendance...</Text>
      </View>
    );
  }

  const summary = attendanceData?.summary || {};
  const subjects = attendanceData?.subjects || [];

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={C.primaryDark} />

      {/* ── NAVY APP BAR ── */}
      <View style={styles.topBar}>
        <View style={styles.circle1} />
        <View style={styles.circle2} />
        <View style={styles.topBarRow}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.goBack()}
            hitSlop={{ top: 8, left: 8, right: 8, bottom: 8 }}
          >
            <Text style={styles.backBtnText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.topBarTitle}>My Attendance</Text>
          <View style={{ width: 36 }} />
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[COLORS.primary]}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* ── SUMMARY CARDS ── */}
        <View style={styles.summaryRow}>
          <View
            style={[styles.summaryCard, { borderTopColor: COLORS.success }]}
          >
            <View style={[styles.summaryIcon, { backgroundColor: "#d4edda" }]}>
              <Text style={styles.summaryIconText}>✅</Text>
            </View>
            <Text style={styles.summaryValue}>{summary.present || 0}</Text>
            <Text style={styles.summaryLabel}>Present</Text>
          </View>
          <View style={[styles.summaryCard, { borderTopColor: COLORS.danger }]}>
            <View style={[styles.summaryIcon, { backgroundColor: "#f8d7da" }]}>
              <Text style={styles.summaryIconText}>❌</Text>
            </View>
            <Text style={styles.summaryValue}>{summary.absent || 0}</Text>
            <Text style={styles.summaryLabel}>Absent</Text>
          </View>
          <View
            style={[styles.summaryCard, { borderTopColor: COLORS.primary }]}
          >
            <View style={[styles.summaryIcon, { backgroundColor: "#d1ecf1" }]}>
              <Text style={styles.summaryIconText}>🕐</Text>
            </View>
            <Text style={styles.summaryValue}>{summary.total || 0}</Text>
            <Text style={styles.summaryLabel}>Total</Text>
          </View>
        </View>

        {/* ── OVERALL PROGRESS ── */}
        <View style={styles.overallCard}>
          <Text style={styles.overallTitle}>Overall Attendance</Text>
          <Text
            style={[
              styles.overallPct,
              { color: getAttendanceColor(summary.percentage || 0) },
            ]}
          >
            {summary.percentage || 0}%
          </Text>
          <View style={styles.progressBg}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${Math.min(summary.percentage || 0, 100)}%`,
                  backgroundColor: getAttendanceColor(summary.percentage || 0),
                },
              ]}
            />
            <View style={styles.markerLine} />
          </View>
          <View style={styles.markerRow}>
            <Text style={styles.markerText}>0%</Text>
            <Text style={[styles.markerText, { color: COLORS.danger }]}>
              75% Min
            </Text>
            <Text style={styles.markerText}>100%</Text>
          </View>
          {summary.warning && (
            <View style={styles.warningBox}>
              <Text style={styles.warningText}>
                ⚠️ Low Attendance! Minimum 75% required for exam eligibility.
              </Text>
            </View>
          )}
        </View>

        {/* ── SUBJECT WISE ── */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionIcon}>📚</Text>
            <Text style={styles.sectionTitle}>Subject-wise Attendance</Text>
          </View>
          {subjects.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyIcon}>📊</Text>
              <Text style={styles.emptyTitle}>No Subject Data</Text>
              <Text style={styles.emptyText}>
                Attendance records will appear once classes begin
              </Text>
            </View>
          ) : (
            subjects
              .sort((a, b) => (a.percentage || 0) - (b.percentage || 0))
              .map((subject, index) => (
                <View key={index} style={styles.subjectItem}>
                  <View style={styles.subjectHeader}>
                    <View style={styles.subjectInfo}>
                      <Text style={styles.subjectName}>
                        {subject.subject || subject.name || "Unknown"}
                      </Text>
                      <Text style={styles.subjectCode}>
                        {subject.code || "N/A"}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.subjectPctBadge,
                        {
                          backgroundColor: getAttendanceBg(
                            subject.percentage || 0,
                          ),
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.subjectPctText,
                          {
                            color: getAttendanceColor(subject.percentage || 0),
                          },
                        ]}
                      >
                        {subject.percentage || 0}%
                      </Text>
                    </View>
                  </View>
                  <View style={styles.subjectProgressBg}>
                    <View
                      style={[
                        styles.subjectProgressFill,
                        {
                          width: `${Math.min(subject.percentage || 0, 100)}%`,
                          backgroundColor: getAttendanceColor(
                            subject.percentage || 0,
                          ),
                        },
                      ]}
                    />
                  </View>
                  <View style={styles.subjectStatsRow}>
                    <Text style={styles.subjectStat}>
                      ✅ {subject.present || 0} Present
                    </Text>
                    <Text style={styles.subjectStat}>
                      {subject.present || 0}/{subject.total || 0} Classes
                    </Text>
                    <Text
                      style={[styles.subjectStat, { color: COLORS.danger }]}
                    >
                      ❌ {subject.absent || 0} Absent
                    </Text>
                  </View>
                  {(subject.percentage || 0) < 75 && (
                    <View style={styles.attentionBadge}>
                      <Text style={styles.attentionText}>
                        ⚠ Needs Attention
                      </Text>
                    </View>
                  )}
                </View>
              ))
          )}
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.background,
  },
  loadingText: { marginTop: 12, color: COLORS.textSecondary, fontSize: 14 },

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
  topBarTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: C.white,
    flex: 1,
    textAlign: "center",
  },

  scrollContent: { padding: 16, paddingBottom: 24 },

  summaryRow: { flexDirection: "row", gap: 8, marginBottom: 12 },
  summaryCard: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: SIZES.radius,
    padding: 14,
    alignItems: "center",
    borderTopWidth: 3,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.small,
  },
  summaryIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  summaryIconText: { fontSize: 20 },
  summaryValue: { fontSize: 26, fontWeight: "700", color: COLORS.text },
  summaryLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontWeight: "600",
    letterSpacing: 0.5,
    marginTop: 2,
  },

  overallCard: {
    backgroundColor: COLORS.white,
    borderRadius: SIZES.radiusLg,
    padding: 20,
    marginBottom: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.small,
  },
  overallTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 8,
  },
  overallPct: { fontSize: 48, fontWeight: "700", marginBottom: 16 },
  progressBg: {
    width: "100%",
    height: 14,
    backgroundColor: "#e9ecef",
    borderRadius: 7,
    overflow: "hidden",
    position: "relative",
    marginBottom: 6,
  },
  progressFill: { height: "100%", borderRadius: 7 },
  markerLine: {
    position: "absolute",
    left: "75%",
    top: 0,
    bottom: 0,
    width: 2,
    backgroundColor: COLORS.danger,
  },
  markerRow: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  markerText: { fontSize: 11, color: COLORS.textSecondary, fontWeight: "600" },
  warningBox: {
    backgroundColor: "#fff3cd",
    borderRadius: 8,
    padding: 12,
    width: "100%",
    marginTop: 8,
  },
  warningText: {
    fontSize: 12,
    color: "#856404",
    fontWeight: "600",
    textAlign: "center",
  },

  sectionCard: {
    backgroundColor: COLORS.white,
    borderRadius: SIZES.radiusLg,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: "hidden",
    ...SHADOWS.small,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 16,
    backgroundColor: "#f8f9fa",
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  sectionIcon: { fontSize: 18 },
  sectionTitle: { fontSize: 15, fontWeight: "700", color: COLORS.primary },

  subjectItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  subjectHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 10,
  },
  subjectInfo: { flex: 1, marginRight: 12 },
  subjectName: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 3,
  },
  subjectCode: {
    fontSize: 11,
    color: COLORS.textSecondary,
    backgroundColor: "#e9ecef",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: "flex-start",
  },
  subjectPctBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  subjectPctText: { fontSize: 14, fontWeight: "700" },
  subjectProgressBg: {
    height: 8,
    backgroundColor: "#e9ecef",
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: 8,
  },
  subjectProgressFill: { height: "100%", borderRadius: 4 },
  subjectStatsRow: { flexDirection: "row", justifyContent: "space-between" },
  subjectStat: { fontSize: 12, color: COLORS.textSecondary, fontWeight: "500" },
  attentionBadge: {
    backgroundColor: "#f8d7da",
    borderRadius: 6,
    padding: 6,
    marginTop: 8,
    alignItems: "center",
  },
  attentionText: { fontSize: 11, color: COLORS.danger, fontWeight: "700" },

  emptyBox: {
    alignItems: "center",
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyIcon: { fontSize: 48, marginBottom: 8 },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 4,
  },
  emptyText: { fontSize: 13, color: COLORS.textSecondary, textAlign: "center" },
});

export default AttendanceScreen;
