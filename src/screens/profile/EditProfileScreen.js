import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  useWindowDimensions,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../../context/AuthContext";
import api from "../../services/api";

// ─── COLORS ──────────────────────────────────────────────────────────────────
const C = {
  primary: "#1a4b6d",
  primaryDark: "#0f3a4a",
  success: "#28a745",
  danger: "#dc2626",
  white: "#ffffff",
  bg: "#f0f4f8",
  card: "#ffffff",
  border: "#e2e8f0",
  borderFocus: "#4fc3f7",
  textPrimary: "#1e293b",
  textSecondary: "#64748b",
  inputBg: "#f8fafc",
};

// ─── RESPONSIVE SCALE ────────────────────────────────────────────────────────
const BASE_WIDTH = 390;
const useScale = () => {
  const { width } = useWindowDimensions();
  const scale = Math.min(Math.max(width / BASE_WIDTH, 0.75), 1.25);
  return (size) => Math.round(size * scale);
};

export default function EditProfileScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const rs = useScale();
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;

  const [form, setForm] = useState({
    fullName: "",
    email: "",
    mobileNumber: "",
    gender: "Male",
    dateOfBirth: "",
    addressLine: "",
    city: "",
    state: "",
    pincode: "",
    admissionYear: "",
    currentSemester: "",
  });

  const [department, setDepartment] = useState(null);
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [focusedField, setFocusedField] = useState("");

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const res = await api.get("/students/my-profile");
      const profileData = res.data?.data || res.data;
      const { student, department, course } = profileData;
      setForm({
        fullName: student.fullName || "",
        email: student.email || "",
        mobileNumber: student.mobileNumber || "",
        gender: student.gender || "Male",
        dateOfBirth: student.dateOfBirth?.slice(0, 10) || "",
        addressLine: student.addressLine || "",
        city: student.city || "",
        state: student.state || "",
        pincode: student.pincode || "",
        admissionYear: String(student.admissionYear || ""),
        currentSemester: String(student.currentSemester || ""),
      });
      setDepartment(department);
      setCourse(course);
    } catch {
      setError("Failed to load profile");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (name, value) => {
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async () => {
    if (!form.fullName || !form.email || !form.mobileNumber) {
      Alert.alert("Validation", "Name, Email and Mobile are required.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      await api.put("/students/update-my-profile", form);
      Alert.alert("Success ✅", "Profile updated successfully!", [
        { text: "OK", onPress: () => navigation.goBack() },
      ]);
    } catch (err) {
      const msg = err.response?.data?.message || "Failed to update profile";
      setError(msg);
      Alert.alert("Error ❌", msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View
        style={[
          styles.loadingContainer,
          {
            paddingTop: insets.top,
            paddingBottom: insets.bottom,
            paddingLeft: insets.left,
            paddingRight: insets.right,
          },
        ]}
      >
        <ActivityIndicator size="large" color={C.primary} />
        <Text
          style={[styles.loadingText, { fontSize: rs(14), marginTop: rs(12) }]}
        >
          Loading Profile...
        </Text>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.root,
        {
          paddingTop: insets.top,
          paddingLeft: insets.left,
          paddingRight: insets.right,
        },
      ]}
    >
      {/* ── HEADER CARD ── */}
      <View
        style={[
          styles.welcomeCard,
          {
            marginTop: rs(14),
            marginHorizontal: rs(14),
            marginBottom: rs(12),
            paddingHorizontal: rs(16),
            paddingTop: rs(22),
            paddingBottom: rs(22),
            borderRadius: rs(20),
          },
        ]}
      >
        <View style={styles.circleTop} />
        <View style={styles.circleBottom} />

        <View style={styles.welcomeRow}>
          <TouchableOpacity
            style={[
              styles.backBtn,
              { width: rs(34), height: rs(34), borderRadius: rs(10) },
            ]}
            onPress={() => navigation.goBack()}
            hitSlop={{ top: 8, left: 8, right: 8, bottom: 8 }}
          >
            <Text style={[styles.backBtnText, { fontSize: rs(20) }]}>←</Text>
          </TouchableOpacity>

          <View style={{ flex: 1, alignItems: "center" }}>
            <Text style={[styles.headerTitle, { fontSize: rs(16) }]}>
              ✏️ Edit Profile
            </Text>
            <Text
              style={[styles.headerSub, { fontSize: rs(12), marginTop: rs(2) }]}
            >
              Update your personal & academic details
            </Text>
          </View>

          <View style={{ width: rs(34) }} />
        </View>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[
            styles.scrollContent,
            {
              padding: rs(14),
              paddingTop: rs(16),
              paddingBottom: insets.bottom + rs(32),
            },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {error ? (
            <View
              style={[
                styles.errorBanner,
                {
                  borderRadius: rs(10),
                  padding: rs(12),
                  marginBottom: rs(12),
                },
              ]}
            >
              <Text style={[styles.errorText, { fontSize: rs(13) }]}>
                ⚠️ {error}
              </Text>
            </View>
          ) : null}

          {isLandscape ? (
            // ── LANDSCAPE: 2-column layout ──
            <View style={[styles.landscapeCols, { gap: rs(12) }]}>
              <View style={styles.landscapeCol}>
                <SectionCard title="Personal Details" icon="👤" rs={rs}>
                  <Field
                    label="Full Name *"
                    value={form.fullName}
                    onChangeText={(v) => handleChange("fullName", v)}
                    placeholder="Enter full name"
                    focused={focusedField === "fullName"}
                    onFocus={() => setFocusedField("fullName")}
                    onBlur={() => setFocusedField("")}
                    rs={rs}
                  />
                  <Field
                    label="Email *"
                    value={form.email}
                    onChangeText={(v) => handleChange("email", v)}
                    placeholder="Enter email"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    focused={focusedField === "email"}
                    onFocus={() => setFocusedField("email")}
                    onBlur={() => setFocusedField("")}
                    rs={rs}
                  />
                  <Field
                    label="Mobile Number *"
                    value={form.mobileNumber}
                    onChangeText={(v) => handleChange("mobileNumber", v)}
                    placeholder="Enter mobile number"
                    keyboardType="phone-pad"
                    focused={focusedField === "mobile"}
                    onFocus={() => setFocusedField("mobile")}
                    onBlur={() => setFocusedField("")}
                    rs={rs}
                  />
                  <Field
                    label="Date of Birth (YYYY-MM-DD)"
                    value={form.dateOfBirth}
                    onChangeText={(v) => handleChange("dateOfBirth", v)}
                    placeholder="e.g. 2002-05-15"
                    focused={focusedField === "dob"}
                    onFocus={() => setFocusedField("dob")}
                    onBlur={() => setFocusedField("")}
                    rs={rs}
                  />
                  <Text
                    style={[
                      styles.fieldLabel,
                      { fontSize: rs(12), marginBottom: rs(5) },
                    ]}
                  >
                    Gender
                  </Text>
                  <View
                    style={[
                      styles.genderRow,
                      { gap: rs(8), marginBottom: rs(12) },
                    ]}
                  >
                    {["Male", "Female", "Other"].map((g) => (
                      <TouchableOpacity
                        key={g}
                        style={[
                          styles.genderBtn,
                          form.gender === g && styles.genderBtnActive,
                          { paddingVertical: rs(10), borderRadius: rs(10) },
                        ]}
                        onPress={() => handleChange("gender", g)}
                      >
                        <Text
                          style={[
                            styles.genderBtnText,
                            form.gender === g && styles.genderBtnTextActive,
                            { fontSize: rs(13) },
                          ]}
                        >
                          {g === "Male"
                            ? "👨 "
                            : g === "Female"
                              ? "👩 "
                              : "🧑 "}
                          {g}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </SectionCard>
              </View>

              <View style={styles.landscapeCol}>
                <SectionCard title="Address" icon="📍" rs={rs}>
                  <Field
                    label="Address Line"
                    value={form.addressLine}
                    onChangeText={(v) => handleChange("addressLine", v)}
                    placeholder="Enter address"
                    multiline
                    focused={focusedField === "address"}
                    onFocus={() => setFocusedField("address")}
                    onBlur={() => setFocusedField("")}
                    rs={rs}
                  />
                  <View style={[styles.twoCol, { gap: rs(10) }]}>
                    <View style={{ flex: 1 }}>
                      <Field
                        label="City"
                        value={form.city}
                        onChangeText={(v) => handleChange("city", v)}
                        placeholder="City"
                        focused={focusedField === "city"}
                        onFocus={() => setFocusedField("city")}
                        onBlur={() => setFocusedField("")}
                        rs={rs}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Field
                        label="State"
                        value={form.state}
                        onChangeText={(v) => handleChange("state", v)}
                        placeholder="State"
                        focused={focusedField === "state"}
                        onFocus={() => setFocusedField("state")}
                        onBlur={() => setFocusedField("")}
                        rs={rs}
                      />
                    </View>
                  </View>
                  <Field
                    label="Pincode"
                    value={form.pincode}
                    onChangeText={(v) => handleChange("pincode", v)}
                    placeholder="Enter pincode"
                    keyboardType="numeric"
                    focused={focusedField === "pincode"}
                    onFocus={() => setFocusedField("pincode")}
                    onBlur={() => setFocusedField("")}
                    rs={rs}
                  />
                </SectionCard>

                <SectionCard title="Academic Details" icon="🎓" rs={rs}>
                  <Text style={[styles.fieldLabel, { fontSize: rs(12) }]}>
                    Department
                  </Text>
                  <View
                    style={[
                      styles.disabledField,
                      {
                        borderRadius: rs(10),
                        paddingHorizontal: rs(14),
                        paddingVertical: rs(12),
                        marginBottom: rs(12),
                      },
                    ]}
                  >
                    <Text style={[styles.disabledText, { fontSize: rs(14) }]}>
                      {department?.name || "N/A"}
                    </Text>
                  </View>
                  <Text style={[styles.fieldLabel, { fontSize: rs(12) }]}>
                    Course
                  </Text>
                  <View
                    style={[
                      styles.disabledField,
                      {
                        borderRadius: rs(10),
                        paddingHorizontal: rs(14),
                        paddingVertical: rs(12),
                        marginBottom: rs(12),
                      },
                    ]}
                  >
                    <Text style={[styles.disabledText, { fontSize: rs(14) }]}>
                      {course?.name || "N/A"}
                    </Text>
                  </View>
                  <View style={[styles.twoCol, { gap: rs(10) }]}>
                    <View style={{ flex: 1 }}>
                      <Field
                        label="Admission Year"
                        value={form.admissionYear}
                        onChangeText={(v) => handleChange("admissionYear", v)}
                        placeholder="e.g. 2023"
                        keyboardType="numeric"
                        focused={focusedField === "admYear"}
                        onFocus={() => setFocusedField("admYear")}
                        onBlur={() => setFocusedField("")}
                        rs={rs}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Field
                        label="Current Semester"
                        value={form.currentSemester}
                        onChangeText={(v) => handleChange("currentSemester", v)}
                        placeholder="e.g. 3"
                        keyboardType="numeric"
                        focused={focusedField === "sem"}
                        onFocus={() => setFocusedField("sem")}
                        onBlur={() => setFocusedField("")}
                        rs={rs}
                      />
                    </View>
                  </View>
                </SectionCard>
              </View>
            </View>
          ) : (
            // ── PORTRAIT: stacked layout ──
            <>
              <SectionCard title="Personal Details" icon="👤" rs={rs}>
                <Field
                  label="Full Name *"
                  value={form.fullName}
                  onChangeText={(v) => handleChange("fullName", v)}
                  placeholder="Enter full name"
                  focused={focusedField === "fullName"}
                  onFocus={() => setFocusedField("fullName")}
                  onBlur={() => setFocusedField("")}
                  rs={rs}
                />
                <Field
                  label="Email *"
                  value={form.email}
                  onChangeText={(v) => handleChange("email", v)}
                  placeholder="Enter email"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  focused={focusedField === "email"}
                  onFocus={() => setFocusedField("email")}
                  onBlur={() => setFocusedField("")}
                  rs={rs}
                />
                <Field
                  label="Mobile Number *"
                  value={form.mobileNumber}
                  onChangeText={(v) => handleChange("mobileNumber", v)}
                  placeholder="Enter mobile number"
                  keyboardType="phone-pad"
                  focused={focusedField === "mobile"}
                  onFocus={() => setFocusedField("mobile")}
                  onBlur={() => setFocusedField("")}
                  rs={rs}
                />
                <Field
                  label="Date of Birth (YYYY-MM-DD)"
                  value={form.dateOfBirth}
                  onChangeText={(v) => handleChange("dateOfBirth", v)}
                  placeholder="e.g. 2002-05-15"
                  focused={focusedField === "dob"}
                  onFocus={() => setFocusedField("dob")}
                  onBlur={() => setFocusedField("")}
                  rs={rs}
                />
                <Text
                  style={[
                    styles.fieldLabel,
                    { fontSize: rs(12), marginBottom: rs(5) },
                  ]}
                >
                  Gender
                </Text>
                <View
                  style={[
                    styles.genderRow,
                    { gap: rs(8), marginBottom: rs(12) },
                  ]}
                >
                  {["Male", "Female", "Other"].map((g) => (
                    <TouchableOpacity
                      key={g}
                      style={[
                        styles.genderBtn,
                        form.gender === g && styles.genderBtnActive,
                        { paddingVertical: rs(10), borderRadius: rs(10) },
                      ]}
                      onPress={() => handleChange("gender", g)}
                    >
                      <Text
                        style={[
                          styles.genderBtnText,
                          form.gender === g && styles.genderBtnTextActive,
                          { fontSize: rs(13) },
                        ]}
                      >
                        {g === "Male" ? "👨 " : g === "Female" ? "👩 " : "🧑 "}
                        {g}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </SectionCard>

              <SectionCard title="Address" icon="📍" rs={rs}>
                <Field
                  label="Address Line"
                  value={form.addressLine}
                  onChangeText={(v) => handleChange("addressLine", v)}
                  placeholder="Enter address"
                  multiline
                  focused={focusedField === "address"}
                  onFocus={() => setFocusedField("address")}
                  onBlur={() => setFocusedField("")}
                  rs={rs}
                />
                <View style={[styles.twoCol, { gap: rs(10) }]}>
                  <View style={{ flex: 1 }}>
                    <Field
                      label="City"
                      value={form.city}
                      onChangeText={(v) => handleChange("city", v)}
                      placeholder="City"
                      focused={focusedField === "city"}
                      onFocus={() => setFocusedField("city")}
                      onBlur={() => setFocusedField("")}
                      rs={rs}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Field
                      label="State"
                      value={form.state}
                      onChangeText={(v) => handleChange("state", v)}
                      placeholder="State"
                      focused={focusedField === "state"}
                      onFocus={() => setFocusedField("state")}
                      onBlur={() => setFocusedField("")}
                      rs={rs}
                    />
                  </View>
                </View>
                <Field
                  label="Pincode"
                  value={form.pincode}
                  onChangeText={(v) => handleChange("pincode", v)}
                  placeholder="Enter pincode"
                  keyboardType="numeric"
                  focused={focusedField === "pincode"}
                  onFocus={() => setFocusedField("pincode")}
                  onBlur={() => setFocusedField("")}
                  rs={rs}
                />
              </SectionCard>

              <SectionCard title="Academic Details" icon="🎓" rs={rs}>
                <Text style={[styles.fieldLabel, { fontSize: rs(12) }]}>
                  Department
                </Text>
                <View
                  style={[
                    styles.disabledField,
                    {
                      borderRadius: rs(10),
                      paddingHorizontal: rs(14),
                      paddingVertical: rs(12),
                      marginBottom: rs(12),
                    },
                  ]}
                >
                  <Text style={[styles.disabledText, { fontSize: rs(14) }]}>
                    {department?.name || "N/A"}
                  </Text>
                </View>
                <Text style={[styles.fieldLabel, { fontSize: rs(12) }]}>
                  Course
                </Text>
                <View
                  style={[
                    styles.disabledField,
                    {
                      borderRadius: rs(10),
                      paddingHorizontal: rs(14),
                      paddingVertical: rs(12),
                      marginBottom: rs(12),
                    },
                  ]}
                >
                  <Text style={[styles.disabledText, { fontSize: rs(14) }]}>
                    {course?.name || "N/A"}
                  </Text>
                </View>
                <View style={[styles.twoCol, { gap: rs(10) }]}>
                  <View style={{ flex: 1 }}>
                    <Field
                      label="Admission Year"
                      value={form.admissionYear}
                      onChangeText={(v) => handleChange("admissionYear", v)}
                      placeholder="e.g. 2023"
                      keyboardType="numeric"
                      focused={focusedField === "admYear"}
                      onFocus={() => setFocusedField("admYear")}
                      onBlur={() => setFocusedField("")}
                      rs={rs}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Field
                      label="Current Semester"
                      value={form.currentSemester}
                      onChangeText={(v) => handleChange("currentSemester", v)}
                      placeholder="e.g. 3"
                      keyboardType="numeric"
                      focused={focusedField === "sem"}
                      onFocus={() => setFocusedField("sem")}
                      onBlur={() => setFocusedField("")}
                      rs={rs}
                    />
                  </View>
                </View>
              </SectionCard>
            </>
          )}

          {/* ── SUBMIT ── */}
          <TouchableOpacity
            style={[
              styles.submitBtn,
              submitting && { opacity: 0.7 },
              {
                borderRadius: rs(14),
                paddingVertical: rs(16),
                marginTop: rs(8),
              },
            ]}
            onPress={handleSubmit}
            disabled={submitting}
            activeOpacity={0.85}
          >
            {submitting ? (
              <ActivityIndicator color={C.white} size="small" />
            ) : (
              <Text style={[styles.submitBtnText, { fontSize: rs(16) }]}>
                💾 Update Profile
              </Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

// ─── SECTION CARD ────────────────────────────────────────────────────────────
function SectionCard({ title, icon, rs, children }) {
  return (
    <View
      style={[
        sc.card,
        { borderRadius: rs(16), padding: rs(16), marginBottom: rs(12) },
      ]}
    >
      <View
        style={[
          sc.header,
          { gap: rs(8), marginBottom: rs(14), paddingBottom: rs(12) },
        ]}
      >
        <Text style={{ fontSize: rs(20) }}>{icon}</Text>
        <Text style={[sc.title, { fontSize: rs(15) }]}>{title}</Text>
      </View>
      {children}
    </View>
  );
}
const sc = StyleSheet.create({
  card: {
    backgroundColor: C.white,
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
    borderBottomColor: C.border,
  },
  title: { fontWeight: "700", color: C.textPrimary },
});

// ─── FIELD ───────────────────────────────────────────────────────────────────
function Field({ label, focused, multiline, rs, ...props }) {
  return (
    <View style={{ marginBottom: rs(12) }}>
      <Text style={[f.label, { fontSize: rs(12), marginBottom: rs(5) }]}>
        {label}
      </Text>
      <TextInput
        style={[
          f.input,
          focused && f.inputFocus,
          multiline && { minHeight: rs(72), textAlignVertical: "top" },
          {
            borderRadius: rs(10),
            paddingHorizontal: rs(14),
            paddingVertical: rs(11),
            fontSize: rs(14),
          },
        ]}
        placeholderTextColor={C.textSecondary}
        multiline={multiline}
        {...props}
      />
    </View>
  );
}
const f = StyleSheet.create({
  label: {
    fontWeight: "600",
    color: C.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: C.inputBg,
    borderWidth: 1.5,
    borderColor: C.border,
    color: C.textPrimary,
  },
  inputFocus: { borderColor: C.borderFocus, backgroundColor: "#f0f9ff" },
});

// ─── STYLES ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: C.bg,
  },
  loadingText: { color: C.textSecondary },
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
  backBtn: {
    backgroundColor: "rgba(255,255,255,0.15)",
    justifyContent: "center",
    alignItems: "center",
  },
  backBtnText: { color: C.white, fontWeight: "700", lineHeight: 24 },
  headerTitle: { fontWeight: "700", color: C.white },
  headerSub: { color: "rgba(255,255,255,0.75)", textAlign: "center" },
  scroll: { flex: 1 },
  scrollContent: {},
  errorBanner: {
    backgroundColor: "#fee2e2",
    borderWidth: 1,
    borderColor: "#fecaca",
  },
  errorText: { color: C.danger, fontWeight: "500" },
  fieldLabel: {
    fontWeight: "600",
    color: C.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  genderRow: { flexDirection: "row" },
  genderBtn: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: C.border,
    alignItems: "center",
    backgroundColor: C.inputBg,
  },
  genderBtnActive: { borderColor: C.primary, backgroundColor: "#e3f2fd" },
  genderBtnText: { color: C.textSecondary, fontWeight: "500" },
  genderBtnTextActive: { color: C.primary, fontWeight: "700" },
  twoCol: { flexDirection: "row" },
  disabledField: {
    backgroundColor: "#f1f5f9",
    borderWidth: 1.5,
    borderColor: C.border,
  },
  disabledText: { color: C.textSecondary },
  submitBtn: {
    backgroundColor: C.primary,
    alignItems: "center",
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  submitBtnText: { color: C.white, fontWeight: "700", letterSpacing: 0.5 },
  landscapeCols: { flexDirection: "row" },
  landscapeCol: { flex: 1 },
});
