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

const C = {
  primary: "#1a4b6d",
  primaryDark: "#0f3a4a",
  success: "#28a745",
  danger: "#dc2626",
  warning: "#f59e0b",
  white: "#ffffff",
  bg: "#f0f4f8",
  border: "#e2e8f0",
  borderLight: "#f0f4f8",
  textPrimary: "#1e293b",
  textSecondary: "#64748b",
  textMuted: "#94a3b8",
};

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
      const profileData = res.data?.data || res.data;
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
      const confirmed = window.confirm("Are you sure you want to logout?");
      if (confirmed) logout();
    } else {
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
        <Text style={{ fontSize: 52 }}>👤</Text>
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
        <Text style={{ fontSize: 52, marginBottom: 12 }}>⚠️</Text>
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

  const visibleTabs = TABS.filter((tab) => {
    if (tab.id === "ssc") return isDocEnabled("10th_marksheet");
    if (tab.id === "hsc") return isDocEnabled("12th_marksheet");
    return true;
  });

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor={C.primary} />

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
        {/* ── SIMPLIFIED WELCOME CARD ── */}
        <View style={s.welcomeCard}>
          {/* Decorative circles */}
          <View style={s.circleTop} />
          <View style={s.circleBottom} />

          <View style={s.welcomeRow}>
            {/* Back button */}
            <TouchableOpacity
              style={s.backBtn}
              onPress={() => navigation.goBack()}
              hitSlop={{ top: 8, left: 8, right: 8, bottom: 8 }}
            >
              <Text style={s.backBtnText}>←</Text>
            </TouchableOpacity>

            {/* Title */}
            <Text style={s.welcomeTitle}>My Profile</Text>

            {/* Edit button */}
            <TouchableOpacity
              style={s.editBtn}
              onPress={() => navigation.navigate("EditProfile")}
              hitSlop={{ top: 8, left: 8, right: 8, bottom: 8 }}
            >
              <Text style={s.editBtnText}>✏️</Text>
            </TouchableOpacity>
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

        {/* ── TAB CONTENT ── */}
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

        {/* Logout Bottom Button */}
        <TouchableOpacity style={s.logoutBottomBtn} onPress={handleLogout}>
          <Text style={s.logoutBottomBtnText}>🚪 Logout</Text>
        </TouchableOpacity>
      </Animated.ScrollView>
    </View>
  );
}

// ─── SECTION ─────────────────────────────────────────────────────────────────
function Section({ title, icon, children }) {
  return (
    <View style={sec.card}>
      <View style={sec.header}>
        <View style={sec.iconWrap}>
          <Text style={{ fontSize: 16 }}>{icon}</Text>
        </View>
        <Text style={sec.title}>{title}</Text>
      </View>
      {children}
    </View>
  );
}
const sec = StyleSheet.create({
  card: {
    backgroundColor: C.white,
    borderRadius: 18,
    padding: 16,
    borderWidth: 0.5,
    borderColor: C.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 14,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.borderLight,
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: "#e3f2fd",
    justifyContent: "center",
    alignItems: "center",
  },
  title: { fontSize: 15, fontWeight: "700", color: C.primary },
});

// ─── INFO ROW ─────────────────────────────────────────────────────────────────
function InfoRow({ label, value, icon, full }) {
  return (
    <View style={ir.row}>
      <View style={ir.iconWrap}>
        <Text style={{ fontSize: 14 }}>{icon}</Text>
      </View>
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
  iconWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: "#f8fafc",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 2,
  },
  label: {
    fontSize: 10,
    color: C.textMuted,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  value: { fontSize: 14, color: C.textPrimary, fontWeight: "500" },
});

// ─── DOC CARD ─────────────────────────────────────────────────────────────────
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
          <Text style={{ fontSize: 22 }}>{icon}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={dc.type}>{type}</Text>
          <Text style={dc.name}>{name}</Text>
        </View>
        <View
          style={[
            dc.statusPill,
            { backgroundColor: hasFile ? "#dcfce7" : "#fee2e2" },
          ]}
        >
          <Text
            style={[
              dc.statusPillText,
              { color: hasFile ? C.success : C.danger },
            ]}
          >
            {hasFile ? "✓ Uploaded" : "✗ Missing"}
          </Text>
        </View>
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
    borderRadius: 14,
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
    borderRadius: 12,
    backgroundColor: "#e3f2fd",
    justifyContent: "center",
    alignItems: "center",
  },
  type: {
    fontSize: 11,
    fontWeight: "700",
    color: C.primary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  name: { fontSize: 13, color: C.textPrimary, fontWeight: "500", marginTop: 2 },
  statusPill: {
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 3,
    alignSelf: "flex-start",
  },
  statusPillText: { fontSize: 10, fontWeight: "700" },
  metaRow: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 8 },
  meta: { fontSize: 11, color: C.textSecondary },
  viewBtn: {
    backgroundColor: C.primary,
    borderRadius: 10,
    paddingVertical: 10,
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
  loadingText: { marginTop: 12, fontSize: 15, color: C.textSecondary },

  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: C.bg,
    padding: 24,
  },
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

  // ── SIMPLIFIED WELCOME CARD ──
  welcomeCard: {
    backgroundColor: C.primary,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingTop:
      Platform.OS === "ios" ? 52 : (StatusBar.currentHeight || 24) + 12,
    paddingBottom: 16,
    overflow: "hidden",
    position: "relative",
    marginBottom: 2,
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
  welcomeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  welcomeTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: C.white,
    flex: 1,
    textAlign: "center",
  },
  backBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.15)",
    justifyContent: "center",
    alignItems: "center",
  },
  backBtnText: {
    color: C.white,
    fontSize: 20,
    fontWeight: "700",
    lineHeight: 24,
  },
  editBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.15)",
    justifyContent: "center",
    alignItems: "center",
  },
  editBtnText: { fontSize: 16 },

  // ── SCROLL ──
  scroll: { flex: 1 },
  scrollContent: { padding: 14, gap: 12, paddingBottom: 32 },

  // ── TAB BAR ──
  tabBar: {
    backgroundColor: C.white,
    maxHeight: 64,
    borderRadius: 14,
    borderWidth: 0.5,
    borderColor: C.border,
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

  // ── DOCS ──
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

  // ── LOGOUT ──
  logoutBottomBtn: {
    marginTop: 4,
    marginBottom: 16,
    backgroundColor: "#fee2e2",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#fecaca",
  },
  logoutBottomBtnText: { color: C.danger, fontSize: 15, fontWeight: "700" },
});
