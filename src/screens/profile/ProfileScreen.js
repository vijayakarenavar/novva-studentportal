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
  Alert,
  useWindowDimensions, // ✅ Responsive + Landscape
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context"; // ✅ Safe Area
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

// ✅ Scale hook
const useScale = () => {
  const { width } = useWindowDimensions();
  return Math.min(Math.max(width / 390, 0.75), 1.25);
};

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const navigation = useNavigation();

  // ✅ Safe Area
  const insets = useSafeAreaInsets();
  // ✅ Responsive + Landscape
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;
  const scale = useScale();
  const rs = (size) => Math.round(size * scale);

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

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <View
        style={[
          s.loadingContainer,
          { paddingTop: insets.top, paddingBottom: insets.bottom },
        ]}
      >
        <Text style={{ fontSize: rs(52) }}>👤</Text>
        <ActivityIndicator
          size="large"
          color={C.primary}
          style={{ marginTop: rs(16) }}
        />
        <Text style={[s.loadingText, { fontSize: rs(15) }]}>
          Loading Profile...
        </Text>
      </View>
    );
  }

  // ── Error ──────────────────────────────────────────────────────────────────
  if (error) {
    return (
      <View
        style={[s.errorContainer, { paddingTop: insets.top, padding: rs(24) }]}
      >
        <Text style={{ fontSize: rs(52), marginBottom: rs(12) }}>⚠️</Text>
        <Text style={[s.errorTitle, { fontSize: rs(18) }]}>
          Failed to Load Profile
        </Text>
        <Text style={[s.errorMsg, { fontSize: rs(13) }]}>{error}</Text>
        <TouchableOpacity
          style={[
            s.retryBtn,
            {
              paddingHorizontal: rs(24),
              paddingVertical: rs(12),
              borderRadius: rs(10),
            },
          ]}
          onPress={() => {
            setLoading(true);
            fetchProfile();
          }}
        >
          <Text style={[s.retryBtnText, { fontSize: rs(14) }]}>🔄 Retry</Text>
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

  // ── Tab content ────────────────────────────────────────────────────────────
  const tabContent = (
    <>
      {activeTab === "personal" && (
        <Section title="Personal Information" icon="👤" rs={rs}>
          <InfoRow
            label="Full Name"
            value={student?.fullName}
            icon="👤"
            rs={rs}
          />
          <InfoRow label="Gender" value={student?.gender} icon="⚧" rs={rs} />
          <InfoRow
            label="Date of Birth"
            value={
              student?.dateOfBirth
                ? new Date(student.dateOfBirth).toLocaleDateString()
                : null
            }
            icon="🗓"
            rs={rs}
          />
          <InfoRow
            label="Nationality"
            value={student?.nationality}
            icon="🌐"
            rs={rs}
          />
          <InfoRow
            label="Religion"
            value={student?.religion}
            icon="🕌"
            rs={rs}
          />
          <InfoRow
            label="Category"
            value={student?.category}
            icon="👥"
            rs={rs}
          />
          <InfoRow
            label="Blood Group"
            value={student?.bloodGroup}
            icon="🩸"
            rs={rs}
          />
        </Section>
      )}
      {activeTab === "parent" && (
        <Section title="Parent / Guardian" icon="👨‍👩‍👧" rs={rs}>
          <InfoRow
            label="Father's Name"
            value={student?.fatherName}
            icon="👨"
            rs={rs}
          />
          <InfoRow
            label="Father's Mobile"
            value={student?.fatherMobile}
            icon="📞"
            rs={rs}
          />
          <InfoRow
            label="Mother's Name"
            value={student?.motherName}
            icon="👩"
            rs={rs}
          />
          <InfoRow
            label="Mother's Mobile"
            value={student?.motherMobile}
            icon="📞"
            rs={rs}
          />
        </Section>
      )}
      {activeTab === "academic" && (
        <Section title="Academic Information" icon="📚" rs={rs}>
          <InfoRow
            label="Department"
            value={department?.name}
            icon="🏛"
            rs={rs}
          />
          <InfoRow label="Course" value={course?.name} icon="🎓" rs={rs} />
          <InfoRow label="Course Code" value={course?.code} icon="🔢" rs={rs} />
          <InfoRow
            label="Current Semester"
            value={
              student?.currentSemester
                ? `Semester ${student.currentSemester}`
                : null
            }
            icon="📅"
            rs={rs}
          />
          <InfoRow
            label="Admission Year"
            value={student?.admissionYear}
            icon="📆"
            rs={rs}
          />
          <InfoRow
            label="Academic Status"
            value={student?.status}
            icon="✅"
            rs={rs}
          />
        </Section>
      )}
      {activeTab === "contact" && (
        <Section title="Contact Information" icon="📞" rs={rs}>
          <InfoRow label="Email" value={student?.email} icon="✉️" rs={rs} />
          <InfoRow
            label="Mobile"
            value={student?.mobileNumber}
            icon="📱"
            rs={rs}
          />
        </Section>
      )}
      {activeTab === "address" && (
        <Section title="Address Information" icon="🏠" rs={rs}>
          <InfoRow
            label="Address"
            value={student?.addressLine}
            icon="📍"
            full
            rs={rs}
          />
          <InfoRow label="City" value={student?.city} icon="🏙" rs={rs} />
          <InfoRow label="State" value={student?.state} icon="🗺" rs={rs} />
          <InfoRow label="Pincode" value={student?.pincode} icon="📮" rs={rs} />
          <InfoRow label="Country" value={student?.country} icon="🌐" rs={rs} />
        </Section>
      )}
      {activeTab === "documents" && (
        <Section title="Uploaded Documents" icon="📄" rs={rs}>
          <Text style={[s.docSubtitle, { fontSize: rs(13) }]}>
            Documents uploaded during registration, verified by college admin.
          </Text>
          {isDocEnabled("10th_marksheet") && (
            <DocCard
              rs={rs}
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
              rs={rs}
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
              rs={rs}
              icon="🖼"
              type="Passport Photo"
              name="Passport Size Photograph"
              filePath={student?.passportPhotoPath}
            />
          )}
          {isDocEnabled("aadhar_card") && (
            <DocCard
              rs={rs}
              icon="🪪"
              type="Aadhar Card"
              name="Aadhar Card"
              board="UIDAI"
              filePath={student?.aadharCardPath}
            />
          )}
          {isDocEnabled("income_certificate") && (
            <DocCard
              rs={rs}
              icon="💰"
              type="Income Certificate"
              name="Family Income Certificate"
              filePath={student?.incomeCertificatePath}
            />
          )}
          {isDocEnabled("character_certificate") && (
            <DocCard
              rs={rs}
              icon="📜"
              type="Character Certificate"
              name="Character Certificate"
              board={student?.sscSchoolName}
              filePath={student?.characterCertificatePath}
            />
          )}
          {isDocEnabled("transfer_certificate") && (
            <DocCard
              rs={rs}
              icon="📝"
              type="Transfer Certificate"
              name="School Leaving Certificate"
              filePath={student?.transferCertificatePath}
            />
          )}
          {isDocEnabled("migration_certificate") && (
            <DocCard
              rs={rs}
              icon="📃"
              type="Migration Certificate"
              name="Migration Certificate"
              filePath={student?.migrationCertificatePath}
            />
          )}
          {isDocEnabled("domicile_certificate") && (
            <DocCard
              rs={rs}
              icon="🏠"
              type="Domicile Certificate"
              name="Domicile Certificate"
              filePath={student?.domicileCertificatePath}
            />
          )}
          {isDocEnabled("caste_certificate") && student?.category !== "GEN" && (
            <DocCard
              rs={rs}
              icon="📋"
              type="Caste Certificate"
              name="Caste Certificate"
              filePath={student?.casteCertificatePath}
            />
          )}
          {isDocEnabled("entrance_exam_score") && (
            <DocCard
              rs={rs}
              icon="📊"
              type="Entrance Exam Score"
              name="Entrance Exam Score Card"
              filePath={student?.entranceExamScorePath}
            />
          )}
          {documentConfig.filter((d) => d.enabled).length === 0 && (
            <View
              style={[
                s.noDocBox,
                { borderRadius: rs(10), padding: rs(12), marginBottom: rs(12) },
              ]}
            >
              <Text style={[s.noDocText, { fontSize: rs(13) }]}>
                ⚠️ No documents configured by your college for this batch.
              </Text>
            </View>
          )}
          <View
            style={[
              s.docGuidelines,
              { borderRadius: rs(10), padding: rs(12), marginTop: rs(8) },
            ]}
          >
            <Text style={[s.docGuidelinesTitle, { fontSize: rs(13) }]}>
              ℹ️ Document Guidelines
            </Text>
            {[
              "All documents must be in PDF format",
              "Maximum file size: 5MB per document",
              "Ensure documents are clear and legible",
              "Contact administration for verification",
            ].map((t, i) => (
              <Text
                key={i}
                style={[
                  s.docGuidelinesItem,
                  { fontSize: rs(12), marginBottom: rs(3) },
                ]}
              >
                • {t}
              </Text>
            ))}
          </View>
        </Section>
      )}
      {activeTab === "college" && (
        <Section title="College Information" icon="🏛" rs={rs}>
          <InfoRow
            label="College Name"
            value={college?.name}
            icon="🏛"
            full
            rs={rs}
          />
          <InfoRow label="Email" value={college?.email} icon="✉️" rs={rs} />
          <InfoRow
            label="Contact Number"
            value={college?.contactNumber}
            icon="📞"
            rs={rs}
          />
          <InfoRow
            label="Established Year"
            value={college?.establishedYear}
            icon="📅"
            rs={rs}
          />
          <InfoRow
            label="Address"
            value={college?.address}
            icon="📍"
            full
            rs={rs}
          />
        </Section>
      )}

      <TouchableOpacity
        style={[
          s.logoutBottomBtn,
          {
            marginTop: rs(4),
            marginBottom: rs(16),
            borderRadius: rs(14),
            paddingVertical: rs(14),
          },
        ]}
        onPress={handleLogout}
      >
        <Text style={[s.logoutBottomBtnText, { fontSize: rs(15) }]}>
          🚪 Logout
        </Text>
      </TouchableOpacity>
    </>
  );

  // ── Tab bar ────────────────────────────────────────────────────────────────
  const tabBar = (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={[s.tabBar, { borderRadius: rs(14), maxHeight: rs(64) }]}
      contentContainerStyle={[s.tabBarContent, { paddingHorizontal: rs(8) }]}
    >
      {visibleTabs.map((tab) => (
        <TouchableOpacity
          key={tab.id}
          style={[
            s.tab,
            activeTab === tab.id && s.tabActive,
            {
              paddingHorizontal: rs(14),
              paddingVertical: rs(10),
              minWidth: rs(64),
            },
          ]}
          onPress={() => setActiveTab(tab.id)}
        >
          <Text style={{ fontSize: rs(18), marginBottom: rs(2) }}>
            {tab.icon}
          </Text>
          <Text
            style={[
              s.tabLabel,
              activeTab === tab.id && s.tabLabelActive,
              { fontSize: rs(10) },
            ]}
          >
            {tab.label}
          </Text>
          {activeTab === tab.id && <View style={s.tabIndicator} />}
        </TouchableOpacity>
      ))}
    </ScrollView>
  );

  return (
    <View
      style={[s.root, { paddingLeft: insets.left, paddingRight: insets.right }]}
    >
      <Animated.ScrollView
        style={[s.scroll, { opacity: fadeAnim }]}
        contentContainerStyle={[
          s.scrollContent,
          {
            padding: rs(14),
            gap: rs(12),
            paddingBottom: insets.bottom + rs(32),
          },
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
        {/* ── WELCOME CARD — ✅ paddingTop = insets.top, NO hardcoded hacks ── */}
        <View
          style={[
            s.welcomeCard,
            {
              borderRadius: rs(16),
              paddingHorizontal: rs(16),
              paddingTop: insets.top + rs(14),
              paddingBottom: rs(16),
              marginBottom: rs(2),
            },
          ]}
        >
          <View style={s.circleTop} />
          <View style={s.circleBottom} />
          <View style={s.welcomeRow}>
            <TouchableOpacity
              style={[
                s.backBtn,
                { width: rs(34), height: rs(34), borderRadius: rs(10) },
              ]}
              onPress={() => navigation.goBack()}
              hitSlop={{ top: 8, left: 8, right: 8, bottom: 8 }}
            >
              <Text style={[s.backBtnText, { fontSize: rs(20) }]}>←</Text>
            </TouchableOpacity>
            <Text style={[s.welcomeTitle, { fontSize: rs(16) }]}>
              My Profile
            </Text>
            <TouchableOpacity
              style={[
                s.editBtn,
                { width: rs(34), height: rs(34), borderRadius: rs(10) },
              ]}
              onPress={() => navigation.navigate("EditProfile")}
              hitSlop={{ top: 8, left: 8, right: 8, bottom: 8 }}
            >
              <Text style={{ fontSize: rs(16) }}>✏️</Text>
            </TouchableOpacity>
          </View>
        </View>

        {tabBar}

        {/* ✅ Landscape: 2-col layout — tab content fills right pane */}
        {isLandscape ? (
          <View style={{ flexDirection: "row", gap: rs(12) }}>
            {/* Left: vertical tab list */}
            <View style={{ width: rs(90), gap: rs(4) }}>
              {visibleTabs.map((tab) => (
                <TouchableOpacity
                  key={tab.id}
                  style={[
                    {
                      borderRadius: rs(10),
                      padding: rs(10),
                      alignItems: "center",
                      backgroundColor: C.white,
                      borderWidth: 1,
                      borderColor: C.border,
                    },
                    activeTab === tab.id && {
                      backgroundColor: C.primary,
                      borderColor: C.primary,
                    },
                  ]}
                  onPress={() => setActiveTab(tab.id)}
                >
                  <Text style={{ fontSize: rs(16) }}>{tab.icon}</Text>
                  <Text
                    style={[
                      {
                        fontSize: rs(9),
                        color: C.textMuted,
                        marginTop: rs(2),
                        fontWeight: "600",
                      },
                      activeTab === tab.id && { color: C.white },
                    ]}
                  >
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            {/* Right: content */}
            <View style={{ flex: 1 }}>{tabContent}</View>
          </View>
        ) : (
          tabContent
        )}
      </Animated.ScrollView>
    </View>
  );
}

// ─── SECTION ─────────────────────────────────────────────────────────────────
function Section({ title, icon, children, rs }) {
  return (
    <View style={[sec.card, { borderRadius: rs(18), padding: rs(16) }]}>
      <View
        style={[
          sec.header,
          { gap: rs(10), marginBottom: rs(14), paddingBottom: rs(12) },
        ]}
      >
        <View
          style={[
            sec.iconWrap,
            { width: rs(34), height: rs(34), borderRadius: rs(10) },
          ]}
        >
          <Text style={{ fontSize: rs(16) }}>{icon}</Text>
        </View>
        <Text style={[sec.title, { fontSize: rs(15) }]}>{title}</Text>
      </View>
      {children}
    </View>
  );
}
const sec = StyleSheet.create({
  card: {
    backgroundColor: C.white,
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
    borderBottomWidth: 1,
    borderBottomColor: C.borderLight,
  },
  iconWrap: {
    backgroundColor: "#e3f2fd",
    justifyContent: "center",
    alignItems: "center",
  },
  title: { fontWeight: "700", color: C.primary },
});

// ─── INFO ROW ─────────────────────────────────────────────────────────────────
function InfoRow({ label, value, icon, full, rs }) {
  return (
    <View style={[ir.row, { gap: rs(10), paddingVertical: rs(10) }]}>
      <View
        style={[
          ir.iconWrap,
          {
            width: rs(28),
            height: rs(28),
            borderRadius: rs(8),
            marginTop: rs(2),
          },
        ]}
      >
        <Text style={{ fontSize: rs(14) }}>{icon}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[ir.label, { fontSize: rs(10), marginBottom: rs(2) }]}>
          {label}
        </Text>
        <Text style={[ir.value, { fontSize: rs(14) }]}>{value || "N/A"}</Text>
      </View>
    </View>
  );
}
const ir = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  iconWrap: {
    backgroundColor: "#f8fafc",
    justifyContent: "center",
    alignItems: "center",
  },
  label: {
    color: C.textMuted,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  value: { color: C.textPrimary, fontWeight: "500" },
});

// ─── DOC CARD ─────────────────────────────────────────────────────────────────
function DocCard({ icon, type, name, board, year, percentage, filePath, rs }) {
  const hasFile =
    filePath && String(filePath).trim() !== "" && filePath !== "null";
  const baseUrl = "http://localhost:5000";
  const handleView = () => {
    if (!hasFile) {
      Alert.alert("Not Available", "Document not uploaded yet.");
      return;
    }
    const fileName = filePath.split("/").pop();
    Linking.openURL(`${baseUrl}/api/students/documents/${fileName}`).catch(() =>
      Alert.alert("Error", "Could not open document."),
    );
  };
  return (
    <View
      style={[
        dc.card,
        { borderRadius: rs(14), padding: rs(12), marginBottom: rs(10) },
      ]}
    >
      <View style={[dc.topRow, { gap: rs(10), marginBottom: rs(8) }]}>
        <View
          style={[
            dc.iconBox,
            { width: rs(44), height: rs(44), borderRadius: rs(12) },
          ]}
        >
          <Text style={{ fontSize: rs(22) }}>{icon}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[dc.type, { fontSize: rs(11) }]}>{type}</Text>
          <Text style={[dc.name, { fontSize: rs(13), marginTop: rs(2) }]}>
            {name}
          </Text>
        </View>
        <View
          style={[
            dc.statusPill,
            {
              borderRadius: rs(20),
              paddingHorizontal: rs(8),
              paddingVertical: rs(3),
              backgroundColor: hasFile ? "#dcfce7" : "#fee2e2",
            },
          ]}
        >
          <Text
            style={[
              dc.statusPillText,
              { fontSize: rs(10), color: hasFile ? C.success : C.danger },
            ]}
          >
            {hasFile ? "✓ Uploaded" : "✗ Missing"}
          </Text>
        </View>
      </View>
      {(board || year || percentage) && (
        <View style={[dc.metaRow, { gap: rs(10), marginBottom: rs(8) }]}>
          {board && (
            <Text style={[dc.meta, { fontSize: rs(11) }]}>🏫 {board}</Text>
          )}
          {year && (
            <Text style={[dc.meta, { fontSize: rs(11) }]}>📅 {year}</Text>
          )}
          {percentage && (
            <Text
              style={[
                dc.meta,
                { fontSize: rs(11), color: C.success, fontWeight: "700" },
              ]}
            >
              {percentage}
            </Text>
          )}
        </View>
      )}
      <TouchableOpacity
        style={[
          dc.viewBtn,
          { borderRadius: rs(10), paddingVertical: rs(10) },
          !hasFile && { opacity: 0.45 },
        ]}
        onPress={handleView}
        disabled={!hasFile}
      >
        <Text style={[dc.viewBtnText, { fontSize: rs(13) }]}>
          {hasFile ? "📂 View Document" : "❌ Not Uploaded"}
        </Text>
      </TouchableOpacity>
    </View>
  );
}
const dc = StyleSheet.create({
  card: { backgroundColor: "#f8fafc", borderWidth: 1, borderColor: C.border },
  topRow: { flexDirection: "row", alignItems: "flex-start" },
  iconBox: {
    backgroundColor: "#e3f2fd",
    justifyContent: "center",
    alignItems: "center",
  },
  type: {
    fontWeight: "700",
    color: C.primary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  name: { color: C.textPrimary, fontWeight: "500" },
  statusPill: { alignSelf: "flex-start" },
  statusPillText: { fontWeight: "700" },
  metaRow: { flexDirection: "row", flexWrap: "wrap" },
  meta: { color: C.textSecondary },
  viewBtn: { backgroundColor: C.primary, alignItems: "center" },
  viewBtnText: { color: C.white, fontWeight: "600" },
});

// ─── MAIN STYLES ──────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: C.bg,
  },
  loadingText: { marginTop: 12, color: C.textSecondary },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: C.bg,
  },
  errorTitle: { fontWeight: "700", color: C.textPrimary, marginBottom: 6 },
  errorMsg: { color: C.textSecondary, textAlign: "center", marginBottom: 20 },
  retryBtn: { backgroundColor: C.primary },
  retryBtnText: { color: C.white, fontWeight: "700" },

  welcomeCard: {
    backgroundColor: C.primary,
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
  welcomeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  welcomeTitle: {
    fontWeight: "700",
    color: C.white,
    flex: 1,
    textAlign: "center",
  },
  backBtn: {
    backgroundColor: "rgba(255,255,255,0.15)",
    justifyContent: "center",
    alignItems: "center",
  },
  backBtnText: { color: C.white, fontWeight: "700", lineHeight: 24 },
  editBtn: {
    backgroundColor: "rgba(255,255,255,0.15)",
    justifyContent: "center",
    alignItems: "center",
  },

  scroll: { flex: 1 },
  scrollContent: { flexGrow: 1 },

  tabBar: { backgroundColor: C.white, borderWidth: 0.5, borderColor: C.border },
  tabBarContent: { alignItems: "center" },
  tab: { alignItems: "center", position: "relative" },
  tabActive: {},
  tabLabel: { color: C.textMuted, fontWeight: "500" },
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

  docSubtitle: { color: C.textSecondary, lineHeight: 18 },
  noDocBox: { backgroundColor: "#fef3c7" },
  noDocText: { color: "#92400e" },
  docGuidelines: { backgroundColor: "#f0f4f8" },
  docGuidelinesTitle: {
    fontWeight: "700",
    color: C.textPrimary,
    marginBottom: 6,
  },
  docGuidelinesItem: { color: C.textSecondary },

  logoutBottomBtn: {
    backgroundColor: "#fee2e2",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#fecaca",
  },
  logoutBottomBtnText: { color: C.danger, fontWeight: "700" },
});
