import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  Platform,
  StatusBar,
  Alert,
  KeyboardAvoidingView,
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
  white: "#ffffff",
  bg: "#f0f4f8",
  card: "#ffffff",
  border: "#e2e8f0",
  borderFocus: "#4fc3f7",
  textPrimary: "#1e293b",
  textSecondary: "#64748b",
  inputBg: "#f8fafc",
};

export default function EditProfileScreen() {
  const navigation = useNavigation();

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
      const { student, department, course } = res.data;
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
      <View style={s.loadingContainer}>
        <ActivityIndicator size="large" color={C.primary} />
        <Text style={s.loadingText}>Loading Profile...</Text>
      </View>
    );
  }

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor={C.primaryDark} />

      {/* ── HEADER ── */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
          <Text style={s.backBtnText}>←</Text>
        </TouchableOpacity>
        <View>
          <Text style={s.headerTitle}>✏️ Edit Profile</Text>
          <Text style={s.headerSub}>
            Update your personal & academic details
          </Text>
        </View>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          style={s.scroll}
          contentContainerStyle={s.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Error */}
          {error ? (
            <View style={s.errorBanner}>
              <Text style={s.errorText}>⚠️ {error}</Text>
            </View>
          ) : null}

          {/* ── PERSONAL DETAILS ── */}
          <SectionCard title="Personal Details" icon="👤">
            <Field
              label="Full Name *"
              value={form.fullName}
              onChangeText={(v) => handleChange("fullName", v)}
              placeholder="Enter full name"
              focused={focusedField === "fullName"}
              onFocus={() => setFocusedField("fullName")}
              onBlur={() => setFocusedField("")}
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
            />
            <Field
              label="Date of Birth (YYYY-MM-DD)"
              value={form.dateOfBirth}
              onChangeText={(v) => handleChange("dateOfBirth", v)}
              placeholder="e.g. 2002-05-15"
              focused={focusedField === "dob"}
              onFocus={() => setFocusedField("dob")}
              onBlur={() => setFocusedField("")}
            />

            {/* Gender Selector */}
            <Text style={s.fieldLabel}>Gender</Text>
            <View style={s.genderRow}>
              {["Male", "Female", "Other"].map((g) => (
                <TouchableOpacity
                  key={g}
                  style={[s.genderBtn, form.gender === g && s.genderBtnActive]}
                  onPress={() => handleChange("gender", g)}
                >
                  <Text
                    style={[
                      s.genderBtnText,
                      form.gender === g && s.genderBtnTextActive,
                    ]}
                  >
                    {g === "Male" ? "👨 " : g === "Female" ? "👩 " : "🧑 "}
                    {g}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </SectionCard>

          {/* ── ADDRESS ── */}
          <SectionCard title="Address" icon="📍">
            <Field
              label="Address Line"
              value={form.addressLine}
              onChangeText={(v) => handleChange("addressLine", v)}
              placeholder="Enter address"
              multiline
              focused={focusedField === "address"}
              onFocus={() => setFocusedField("address")}
              onBlur={() => setFocusedField("")}
            />
            <View style={s.twoCol}>
              <View style={{ flex: 1 }}>
                <Field
                  label="City"
                  value={form.city}
                  onChangeText={(v) => handleChange("city", v)}
                  placeholder="City"
                  focused={focusedField === "city"}
                  onFocus={() => setFocusedField("city")}
                  onBlur={() => setFocusedField("")}
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
            />
          </SectionCard>

          {/* ── ACADEMIC ── */}
          <SectionCard title="Academic Details" icon="🎓">
            {/* Read-only fields */}
            <Text style={s.fieldLabel}>Department</Text>
            <View style={s.disabledField}>
              <Text style={s.disabledText}>{department?.name || "N/A"}</Text>
            </View>

            <Text style={s.fieldLabel}>Course</Text>
            <View style={s.disabledField}>
              <Text style={s.disabledText}>{course?.name || "N/A"}</Text>
            </View>

            <View style={s.twoCol}>
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
                />
              </View>
            </View>
          </SectionCard>

          {/* ── SUBMIT ── */}
          <TouchableOpacity
            style={[s.submitBtn, submitting && { opacity: 0.7 }]}
            onPress={handleSubmit}
            disabled={submitting}
            activeOpacity={0.85}
          >
            {submitting ? (
              <ActivityIndicator color={C.white} size="small" />
            ) : (
              <Text style={s.submitBtnText}>💾 Update Profile</Text>
            )}
          </TouchableOpacity>

          <View style={{ height: 32 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

// ─── SECTION CARD ────────────────────────────────────────────────────────────
function SectionCard({ title, icon, children }) {
  return (
    <View style={sc.card}>
      <View style={sc.header}>
        <Text style={sc.icon}>{icon}</Text>
        <Text style={sc.title}>{title}</Text>
      </View>
      {children}
    </View>
  );
}
const sc = StyleSheet.create({
  card: {
    backgroundColor: C.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
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
  title: { fontSize: 15, fontWeight: "700", color: C.textPrimary },
});

// ─── FIELD ───────────────────────────────────────────────────────────────────
function Field({ label, focused, multiline, ...props }) {
  return (
    <View style={f.wrap}>
      <Text style={f.label}>{label}</Text>
      <TextInput
        style={[f.input, focused && f.inputFocus, multiline && f.inputMulti]}
        placeholderTextColor={C.textSecondary}
        multiline={multiline}
        {...props}
      />
    </View>
  );
}
const f = StyleSheet.create({
  wrap: { marginBottom: 12 },
  label: {
    fontSize: 12,
    fontWeight: "600",
    color: C.textSecondary,
    marginBottom: 5,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: C.inputBg,
    borderWidth: 1.5,
    borderColor: C.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 14,
    color: C.textPrimary,
  },
  inputFocus: { borderColor: C.borderFocus, backgroundColor: "#f0f9ff" },
  inputMulti: { minHeight: 72, textAlignVertical: "top" },
});

// ─── STYLES ──────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },

  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: C.bg,
  },
  loadingText: { marginTop: 12, color: C.textSecondary, fontSize: 14 },

  // Header
  header: {
    backgroundColor: C.primaryDark,
    paddingTop: Platform.OS === "ios" ? 52 : StatusBar.currentHeight + 12 || 28,
    paddingBottom: 20,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
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
  headerSub: { fontSize: 12, color: "rgba(255,255,255,0.75)", marginTop: 2 },

  // Scroll
  scroll: { flex: 1 },
  scrollContent: { padding: 14 },

  // Error
  errorBanner: {
    backgroundColor: "#fee2e2",
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#fecaca",
  },
  errorText: { color: C.danger, fontSize: 13, fontWeight: "500" },

  // Gender
  fieldLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: C.textSecondary,
    marginBottom: 5,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  genderRow: { flexDirection: "row", gap: 8, marginBottom: 12 },
  genderBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: C.border,
    alignItems: "center",
    backgroundColor: C.inputBg,
  },
  genderBtnActive: { borderColor: C.primary, backgroundColor: "#e3f2fd" },
  genderBtnText: { fontSize: 13, color: C.textSecondary, fontWeight: "500" },
  genderBtnTextActive: { color: C.primary, fontWeight: "700" },

  // Two column
  twoCol: { flexDirection: "row", gap: 10 },

  // Disabled field
  disabledField: {
    backgroundColor: "#f1f5f9",
    borderWidth: 1.5,
    borderColor: C.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 12,
  },
  disabledText: { fontSize: 14, color: C.textSecondary },

  // Submit
  submitBtn: {
    backgroundColor: C.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 8,
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  submitBtnText: {
    color: C.white,
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
});
