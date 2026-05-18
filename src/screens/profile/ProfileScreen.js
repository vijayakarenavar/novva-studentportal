import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Animated,
  RefreshControl,
  Linking,
  Platform,
  StatusBar,
  Alert,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useAuth } from "../../context/AuthContext";
import api from "../../services/api";

// ─── COLORS ──────────────────────────────────────────────────────────────────
const C = {
  primary: "#1a4b6d",
  primaryDark: "#0f3a4a",
  success: "#28a745",
  danger: "#dc2626",
  warning: "#f59e0b",
  white: "#ffffff",
  bg: "#f0f4f8",
  card: "#ffffff",
  border: "#e2e8f0",
  textPrimary: "#1e293b",
  textSecondary: "#64748b",
  textMuted: "#94a3b8",
};

// ─── TABS CONFIG ─────────────────────────────────────────────────────────────
const TABS = [
  { id: "personal", icon: "👤", label: "Personal" },
  { id: "parent", icon: "👨‍👩‍👧", label: "Parents" },
  { id: "academic", icon: "📚", label: "Academic" },
  { id: "contact", icon: "📞", label: "Contact" },
  { id: "address", icon: "🏠", label: "Address" },
  { id: "documents", icon: "📄", label: "Documents" },
  { id: "college", icon: "🏛", label: "College" },
];

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const navigation = useNavigation();

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("personal");
  const [documentConfig, setDocumentConfig] = useState([]);

  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setError(null);
      const res = await api.get("/students/my-profile");

      console.log("PROFILE RESPONSE STATUS:", res.status);
      console.log("PROFILE DATA KEYS:", Object.keys(res.data || {}));
      const profileData = res.data?.data || res.data;
      console.log("PROFILE DATA KEYS (inner):", Object.keys(profileData || {}));
      console.log("HAS STUDENT?", !!profileData?.student);

      if (!profileData?.student) throw new Error("Invalid profile response");
      setProfile(profileData);
      setDocumentConfig(
        Array.isArray(profileData.documentConfig)
          ? profileData.documentConfig
          : [],
      );
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }).start();
    } catch (err) {
      console.log("PROFILE ERROR STATUS:", err.response?.status);
      console.log("PROFILE ERROR DATA:", JSON.stringify(err.response?.data));
      console.log("PROFILE ERROR MSG:", err.message);

      const status = err.response?.status;
      let msg = "Failed to load profile.";

      if (status === 401) msg = "Session expired. Please login again.";
      else if (status === 403) msg = "Access denied.";
      else if (status === 404) msg = "Profile not found. Contact admin.";
      else if (status === 500) msg = "Server error. Try again later.";
      else if (err.message === "Network Error")
        msg = "Network error. Check your connection.";
      else
        msg =
          err.response?.data?.message ||
          err.message ||
          "Failed to load profile.";

      setError(msg);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchProfile();
  };

  const handleLogout = () => {
    if (Platform.OS === "web") {
      // Web साठी
      const confirmed = window.confirm("Are you sure you want to logout?");
      if (confirmed) logout();
    } else {
      // Mobile साठी
      Alert.alert("Logout", "Are you sure you want to logout?", [
        { text: "Cancel", style: "cancel" },
        {
          text: "Logout",
          style: "destructive",
          onPress: async () => await logout(),
        },
      ]);
    }
  };

  const isDocEnabled = (type) =>
    documentConfig.some((d) => d.type === type && d.enabled);

  if (loading) {
    return (
      <View style={s.loadingContainer}>
        <Text style={s.loadingEmoji}>👤</Text>
        <ActivityIndicator
          size="large"
          color={C.primary}
          style={{ marginTop: 16 }}
        />
        <Text style={s.loadingText}>Loading Profile...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={s.errorContainer}>
        <Text style={s.errorEmoji}>⚠️</Text>
        <Text style={s.errorTitle}>Failed to Load Profile</Text>
        <Text style={s.errorMsg}>{error}</Text>
        <TouchableOpacity
          style={s.retryBtn}
          onPress={() => {
            setLoading(true);
            fetchProfile();
          }}
        >
          <Text style={s.retryBtnText}>🔄 Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!profile) return null;

  const { student, college, department, course } = profile;

  const statusColor =
    student?.status === "APPROVED"
      ? C.success
      : student?.status === "REJECTED"
        ? C.danger
        : C.warning;

  const visibleTabs = TABS.filter((tab) => {
    if (tab.id === "ssc") return isDocEnabled("10th_marksheet");
    if (tab.id === "hsc") return isDocEnabled("12th_marksheet");
    return true;
  });

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor={C.primaryDark} />

      {/* ── HEADER ── */}
      <View style={s.header}>
        <View style={s.headerTop}>
          {/* Back Button */}
          <TouchableOpacity
            style={s.backBtn}
            onPress={() => navigation.goBack()}
          >
            <Text style={s.backBtnText}>←</Text>
          </TouchableOpacity>

          <Text style={s.headerTitle}>My Profile</Text>

          {/* Edit + Logout Buttons */}
          <View style={s.headerActions}>
            <TouchableOpacity
              style={s.editBtn}
              onPress={() => navigation.navigate("EditProfile")}
            >
              <Text style={s.editBtnText}>✏️ Edit</Text>
            </TouchableOpacity>

            <TouchableOpacity style={s.logoutBtn} onPress={handleLogout}>
              <Text style={s.logoutBtnText}>🚪 Logout</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Profile Card in Header */}
        <View style={s.profileCard}>
          <View style={s.avatarCircle}>
            <Text style={s.avatarText}>
              {(student?.fullName || "S")[0].toUpperCase()}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.profileName}>{student?.fullName || "N/A"}</Text>
            <Text style={s.profileSub} numberOfLines={1}>
              {course?.name || "N/A"} • {department?.name || "N/A"}
            </Text>
            <View style={s.profileBadges}>
              <View style={[s.statusBadge, { backgroundColor: statusColor }]}>
                <Text style={s.statusBadgeText}>
                  {student?.status || "PENDING"}
                </Text>
              </View>
              {student?.currentSemester && (
                <View style={s.semBadge}>
                  <Text style={s.semBadgeText}>
                    Sem {student.currentSemester}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Quick Info */}
        <View style={s.quickInfo}>
          {student?.email && (
            <Text style={s.quickInfoText} numberOfLines={1}>
              ✉️ {student.email}
            </Text>
          )}
          {student?.mobileNumber && (
            <Text style={s.quickInfoText}>📞 {student.mobileNumber}</Text>
          )}
        </View>
      </View>

      {/* ── TAB BAR ── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={s.tabBar}
        contentContainerStyle={s.tabBarContent}
      >
        {visibleTabs.map((tab) => (
          <TouchableOpacity
            key={tab.id}
            style={[s.tab, activeTab === tab.id && s.tabActive]}
            onPress={() => setActiveTab(tab.id)}
          >
            <Text style={s.tabIcon}>{tab.icon}</Text>
            <Text
              style={[s.tabLabel, activeTab === tab.id && s.tabLabelActive]}
            >
              {tab.label}
            </Text>
            {activeTab === tab.id && <View style={s.tabIndicator} />}
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* ── CONTENT ── */}
      <Animated.ScrollView
        style={[s.scroll, { opacity: fadeAnim }]}
        contentContainerStyle={s.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[C.primary]}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {activeTab === "personal" && (
          <Section title="Personal Information" icon="👤">
            <InfoRow label="Full Name" value={student?.fullName} icon="👤" />
            <InfoRow label="Gender" value={student?.gender} icon="⚧" />
            <InfoRow
              label="Date of Birth"
              value={
                student?.dateOfBirth
                  ? new Date(student.dateOfBirth).toLocaleDateString()
                  : null
              }
              icon="🗓"
            />
            <InfoRow
              label="Nationality"
              value={student?.nationality}
              icon="🌐"
            />
            <InfoRow label="Religion" value={student?.religion} icon="🕌" />
            <InfoRow label="Category" value={student?.category} icon="👥" />
            <InfoRow
              label="Blood Group"
              value={student?.bloodGroup}
              icon="🩸"
            />
          </Section>
        )}

        {activeTab === "parent" && (
          <Section title="Parent / Guardian" icon="👨‍👩‍👧">
            <InfoRow
              label="Father's Name"
              value={student?.fatherName}
              icon="👨"
            />
            <InfoRow
              label="Father's Mobile"
              value={student?.fatherMobile}
              icon="📞"
            />
            <InfoRow
              label="Mother's Name"
              value={student?.motherName}
              icon="👩"
            />
            <InfoRow
              label="Mother's Mobile"
              value={student?.motherMobile}
              icon="📞"
            />
          </Section>
        )}

        {activeTab === "academic" && (
          <Section title="Academic Information" icon="📚">
            <InfoRow label="Department" value={department?.name} icon="🏛" />
            <InfoRow label="Course" value={course?.name} icon="🎓" />
            <InfoRow label="Course Code" value={course?.code} icon="🔢" />
            <InfoRow
              label="Current Semester"
              value={
                student?.currentSemester
                  ? `Semester ${student.currentSemester}`
                  : null
              }
              icon="📅"
            />
            <InfoRow
              label="Admission Year"
              value={student?.admissionYear}
              icon="📆"
            />
            <InfoRow
              label="Academic Status"
              value={student?.status}
              icon="✅"
            />
          </Section>
        )}

        {activeTab === "contact" && (
          <Section title="Contact Information" icon="📞">
            <InfoRow label="Email" value={student?.email} icon="✉️" />
            <InfoRow label="Mobile" value={student?.mobileNumber} icon="📱" />
          </Section>
        )}

        {activeTab === "address" && (
          <Section title="Address Information" icon="🏠">
            <InfoRow
              label="Address"
              value={student?.addressLine}
              icon="📍"
              full
            />
            <InfoRow label="City" value={student?.city} icon="🏙" />
            <InfoRow label="State" value={student?.state} icon="🗺" />
            <InfoRow label="Pincode" value={student?.pincode} icon="📮" />
            <InfoRow label="Country" value={student?.country} icon="🌐" />
          </Section>
        )}

        {activeTab === "documents" && (
          <Section title="Uploaded Documents" icon="📄">
            <Text style={s.docSubtitle}>
              Documents uploaded during registration, verified by college admin.
            </Text>
            {isDocEnabled("10th_marksheet") && (
              <DocCard
                icon="📄"
                type="10th Marksheet"
                name="Secondary School Certificate"
                board={student?.sscBoard}
                year={student?.sscPassingYear}
                percentage={
                  student?.sscPercentage ? `${student.sscPercentage}%` : ""
                }
                filePath={student?.sscMarksheetPath}
              />
            )}
            {isDocEnabled("12th_marksheet") && (
              <DocCard
                icon="📋"
                type="12th Marksheet"
                name="Higher Secondary Certificate"
                board={student?.hscBoard}
                year={student?.hscPassingYear}
                percentage={
                  student?.hscPercentage ? `${student.hscPercentage}%` : ""
                }
                filePath={student?.hscMarksheetPath}
              />
            )}
            {isDocEnabled("passport_photo") && (
              <DocCard
                icon="🖼"
                type="Passport Photo"
                name="Passport Size Photograph"
                filePath={student?.passportPhotoPath}
              />
            )}
            {isDocEnabled("aadhar_card") && (
              <DocCard
                icon="🪪"
                type="Aadhar Card"
                name="Aadhar Card"
                board="UIDAI"
                filePath={student?.aadharCardPath}
              />
            )}
            {isDocEnabled("income_certificate") && (
              <DocCard
                icon="💰"
                type="Income Certificate"
                name="Family Income Certificate"
                filePath={student?.incomeCertificatePath}
              />
            )}
            {isDocEnabled("character_certificate") && (
              <DocCard
                icon="📜"
                type="Character Certificate"
                name="Character Certificate"
                board={student?.sscSchoolName}
                filePath={student?.characterCertificatePath}
              />
            )}
            {isDocEnabled("transfer_certificate") && (
              <DocCard
                icon="📝"
                type="Transfer Certificate"
                name="School Leaving Certificate"
                filePath={student?.transferCertificatePath}
              />
            )}
            {isDocEnabled("migration_certificate") && (
              <DocCard
                icon="📃"
                type="Migration Certificate"
                name="Migration Certificate"
                filePath={student?.migrationCertificatePath}
              />
            )}
            {isDocEnabled("domicile_certificate") && (
              <DocCard
                icon="🏠"
                type="Domicile Certificate"
                name="Domicile Certificate"
                filePath={student?.domicileCertificatePath}
              />
            )}
            {isDocEnabled("caste_certificate") &&
              student?.category !== "GEN" && (
                <DocCard
                  icon="📋"
                  type="Caste Certificate"
                  name="Caste Certificate"
                  filePath={student?.casteCertificatePath}
                />
              )}
            {isDocEnabled("entrance_exam_score") && (
              <DocCard
                icon="📊"
                type="Entrance Exam Score"
                name="Entrance Exam Score Card"
                filePath={student?.entranceExamScorePath}
              />
            )}
            {documentConfig.filter((d) => d.enabled).length === 0 && (
              <View style={s.noDocBox}>
                <Text style={s.noDocText}>
                  ⚠️ No documents configured by your college for this batch.
                </Text>
              </View>
            )}
            <View style={s.docGuidelines}>
              <Text style={s.docGuidelinesTitle}>ℹ️ Document Guidelines</Text>
              <Text style={s.docGuidelinesItem}>
                • All documents must be in PDF format
              </Text>
              <Text style={s.docGuidelinesItem}>
                • Maximum file size: 5MB per document
              </Text>
              <Text style={s.docGuidelinesItem}>
                • Ensure documents are clear and legible
              </Text>
              <Text style={s.docGuidelinesItem}>
                • Contact administration for verification
              </Text>
            </View>
          </Section>
        )}

        {activeTab === "college" && (
          <Section title="College Information" icon="🏛">
            <InfoRow
              label="College Name"
              value={college?.name}
              icon="🏛"
              full
            />
            <InfoRow label="Email" value={college?.email} icon="✉️" />
            <InfoRow
              label="Contact Number"
              value={college?.contactNumber}
              icon="📞"
            />
            <InfoRow
              label="Established Year"
              value={college?.establishedYear}
              icon="📅"
            />
            <InfoRow label="Address" value={college?.address} icon="📍" full />
          </Section>
        )}

        {/* ── LOGOUT BUTTON (Bottom) ── */}
        <TouchableOpacity style={s.logoutBottomBtn} onPress={handleLogout}>
          <Text style={s.logoutBottomBtnText}>🚪 Logout</Text>
        </TouchableOpacity>
      </Animated.ScrollView>
    </View>
  );
}

// ─── SECTION ────────────────────────────────────────────────────────────────
function Section({ title, icon, children }) {
  return (
    <View style={sec.card}>
      <View style={sec.header}>
        <Text style={sec.icon}>{icon}</Text>
        <Text style={sec.title}>{title}</Text>
      </View>
      {children}
    </View>
  );
}
const sec = StyleSheet.create({
  card: {
    backgroundColor: C.white,
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 14,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  icon: { fontSize: 20 },
  title: { fontSize: 16, fontWeight: "700", color: C.textPrimary },
});

// ─── INFO ROW ────────────────────────────────────────────────────────────────
function InfoRow({ label, value, icon, full }) {
  return (
    <View style={[ir.row, full && ir.rowFull]}>
      <Text style={ir.icon}>{icon}</Text>
      <View style={{ flex: 1 }}>
        <Text style={ir.label}>{label}</Text>
        <Text style={ir.value}>{value || "N/A"}</Text>
      </View>
    </View>
  );
}
const ir = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  rowFull: {},
  icon: { fontSize: 16, marginTop: 2 },
  label: {
    fontSize: 11,
    color: C.textSecondary,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  value: { fontSize: 14, color: C.textPrimary, fontWeight: "500" },
});

// ─── DOC CARD ────────────────────────────────────────────────────────────────
function DocCard({ icon, type, name, board, year, percentage, filePath }) {
  const hasFile =
    filePath && String(filePath).trim() !== "" && filePath !== "null";
  const baseUrl = "http://localhost:5000";

  const handleView = () => {
    if (!hasFile) {
      Alert.alert("Not Available", "Document not uploaded yet.");
      return;
    }
    const fileName = filePath.split("/").pop();
    const url = `${baseUrl}/api/students/documents/${fileName}`;
    Linking.openURL(url).catch(() =>
      Alert.alert("Error", "Could not open document."),
    );
  };

  return (
    <View style={dc.card}>
      <View style={dc.topRow}>
        <View style={dc.iconBox}>
          <Text style={dc.iconText}>{icon}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={dc.type}>{type}</Text>
          <Text style={dc.name}>{name}</Text>
        </View>
        <View
          style={[
            dc.statusDot,
            { backgroundColor: hasFile ? C.success : C.danger },
          ]}
        />
      </View>
      {(board || year || percentage) && (
        <View style={dc.metaRow}>
          {board && <Text style={dc.meta}>🏫 {board}</Text>}
          {year && <Text style={dc.meta}>📅 {year}</Text>}
          {percentage && (
            <Text style={[dc.meta, { color: C.success, fontWeight: "700" }]}>
              {percentage}
            </Text>
          )}
        </View>
      )}
      <TouchableOpacity
        style={[dc.viewBtn, !hasFile && { opacity: 0.45 }]}
        onPress={handleView}
        disabled={!hasFile}
      >
        <Text style={dc.viewBtnText}>
          {hasFile ? "📂 View Document" : "❌ Not Uploaded"}
        </Text>
      </TouchableOpacity>
    </View>
  );
}
const dc = StyleSheet.create({
  card: {
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    padding: 12,
    marginBottom: 10,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    marginBottom: 8,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: "#e3f2fd",
    justifyContent: "center",
    alignItems: "center",
  },
  iconText: { fontSize: 22 },
  type: {
    fontSize: 12,
    fontWeight: "700",
    color: C.primary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  name: { fontSize: 13, color: C.textPrimary, fontWeight: "500", marginTop: 2 },
  statusDot: { width: 10, height: 10, borderRadius: 5, marginTop: 4 },
  metaRow: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 8 },
  meta: { fontSize: 11, color: C.textSecondary },
  viewBtn: {
    backgroundColor: C.primary,
    borderRadius: 8,
    paddingVertical: 9,
    alignItems: "center",
  },
  viewBtnText: { color: C.white, fontSize: 13, fontWeight: "600" },
});

// ─── MAIN STYLES ─────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: C.bg,
  },
  loadingEmoji: { fontSize: 52 },
  loadingText: { marginTop: 12, fontSize: 15, color: C.textSecondary },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: C.bg,
    padding: 24,
  },
  errorEmoji: { fontSize: 52, marginBottom: 12 },
  errorTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: C.textPrimary,
    marginBottom: 6,
  },
  errorMsg: {
    fontSize: 13,
    color: C.textSecondary,
    textAlign: "center",
    marginBottom: 20,
  },
  retryBtn: {
    backgroundColor: C.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
  },
  retryBtnText: { color: C.white, fontWeight: "700", fontSize: 14 },

  // ── HEADER ──
  header: {
    backgroundColor: C.primaryDark,
    paddingTop:
      Platform.OS === "ios" ? 52 : (StatusBar.currentHeight || 24) + 12,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  headerTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
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
  headerTitle: { fontSize: 18, fontWeight: "700", color: C.white },

  // Edit + Logout side by side
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  editBtn: {
    backgroundColor: "rgba(255,255,255,0.18)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  editBtnText: { color: C.white, fontSize: 13, fontWeight: "600" },
  logoutBtn: {
    backgroundColor: "rgba(220,38,38,0.25)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  logoutBtnText: { color: "#ff9999", fontSize: 13, fontWeight: "600" },

  // ── PROFILE CARD ──
  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginBottom: 12,
  },
  avatarCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: C.white,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: { fontSize: 28, fontWeight: "700", color: C.primary },
  profileName: {
    fontSize: 17,
    fontWeight: "700",
    color: C.white,
    marginBottom: 2,
  },
  profileSub: {
    fontSize: 12,
    color: "rgba(255,255,255,0.75)",
    marginBottom: 6,
  },
  profileBadges: { flexDirection: "row", gap: 6 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  statusBadgeText: { color: C.white, fontSize: 10, fontWeight: "700" },
  semBadge: {
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  semBadgeText: { color: C.white, fontSize: 10, fontWeight: "600" },
  quickInfo: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  quickInfoText: { color: "rgba(255,255,255,0.8)", fontSize: 12 },

  // ── TAB BAR ──
  tabBar: {
    backgroundColor: C.white,
    maxHeight: 64,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  tabBarContent: { paddingHorizontal: 8, alignItems: "center" },
  tab: {
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    position: "relative",
    minWidth: 64,
  },
  tabActive: {},
  tabIcon: { fontSize: 18, marginBottom: 2 },
  tabLabel: { fontSize: 10, color: C.textMuted, fontWeight: "500" },
  tabLabelActive: { color: C.primary, fontWeight: "700" },
  tabIndicator: {
    position: "absolute",
    bottom: 0,
    left: 8,
    right: 8,
    height: 2,
    backgroundColor: C.primary,
    borderRadius: 1,
  },

  // ── SCROLL ──
  scroll: { flex: 1 },
  scrollContent: { padding: 14, gap: 12, paddingBottom: 32 },

  // ── DOCUMENTS ──
  docSubtitle: {
    fontSize: 13,
    color: C.textSecondary,
    marginBottom: 12,
    lineHeight: 18,
  },
  noDocBox: {
    backgroundColor: "#fef3c7",
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  noDocText: { fontSize: 13, color: "#92400e" },
  docGuidelines: {
    backgroundColor: "#f0f4f8",
    borderRadius: 10,
    padding: 12,
    marginTop: 8,
  },
  docGuidelinesTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: C.textPrimary,
    marginBottom: 6,
  },
  docGuidelinesItem: { fontSize: 12, color: C.textSecondary, marginBottom: 3 },

  // ── LOGOUT BOTTOM BUTTON ──
  logoutBottomBtn: {
    marginTop: 8,
    marginBottom: 16,
    marginHorizontal: 0,
    backgroundColor: "#fee2e2",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#fecaca",
  },
  logoutBottomBtnText: {
    color: C.danger,
    fontSize: 15,
    fontWeight: "700",
  },
});
