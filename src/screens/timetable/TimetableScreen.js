import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
  Animated,
  Platform,
  StatusBar,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useAuth } from "../../context/AuthContext";
import api from "../../services/api";

const { width } = Dimensions.get("window");

// ─── COLORS ────────────────────────────────────────────────────────────────
const C = {
  primary: "#1a4b6d",
  primaryDark: "#0f3a4a",
  accent: "#4fc3f7",
  accentLight: "#e3f2fd",
  success: "#28a745",
  successLight: "#e8f5e9",
  warning: "#f59e0b",
  warningLight: "#fef3c7",
  danger: "#dc2626",
  dangerLight: "#fee2e2",
  info: "#0097a7",
  infoLight: "#e0f7fa",
  white: "#ffffff",
  bg: "#f0f4f8",
  border: "#e2e8f0",
  borderLight: "#f0f4f8",
  textPrimary: "#1e293b",
  textSecondary: "#64748b",
  textMuted: "#94a3b8",
  slotLecture: { bg: "#e3f2fd", text: "#1565c0", border: "#90caf9" },
  slotLab: { bg: "#ffebee", text: "#c62828", border: "#ef9a9a" },
  slotTutorial: { bg: "#e8f5e9", text: "#2e7d32", border: "#a5d6a7" },
  slotPractical: { bg: "#f3e5f5", text: "#6a1b9a", border: "#ce93d8" },
};

// ─── CONSTANTS ──────────────────────────────────────────────────────────────
export const DAY_MAP = {
  0: "SUN",
  1: "MON",
  2: "TUE",
  3: "WED",
  4: "THU",
  5: "FRI",
  6: "SAT",
};
const DAYS = ["MON", "TUE", "WED", "THU", "FRI", "SAT"];
const DAY_NAMES = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];
const DAY_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// ─── HELPERS ────────────────────────────────────────────────────────────────
const toLocalDateStr = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const parseLocalDate = (dateStr) => {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d);
};

const formatTime12 = (t) => {
  if (!t) return "";
  const [h, m] = t.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, "0")} ${period}`;
};

const validateSlot = (slot) => {
  if (!slot) return false;
  if (!slot.day || !slot.startTime || !slot.endTime) return false;
  if (!slot.subject_id?.name) return false;
  if (slot.status === "HOLIDAY") return true;
  if (slot.startTime >= slot.endTime) return false;
  return true;
};

const getSlotColors = (slot) => {
  const key = `slot${slot?.slotType?.charAt(0) + slot?.slotType?.slice(1).toLowerCase()}`;
  const base = C[key] || C.slotLecture;
  const isCancelled =
    slot.status === "CANCELLED" || slot.exception?.type === "CANCELLED";
  const isExtra = slot.status === "EXTRA" || slot.exception?.type === "EXTRA";
  const isRescheduled =
    slot.status === "RESCHEDULED" || slot.exception?.type === "RESCHEDULED";
  const isHoliday = slot.status === "HOLIDAY";
  if (isCancelled) return { bg: "#fee2e2", text: "#c62828", border: "#ef9a9a" };
  if (isExtra) return { bg: "#dcfce7", text: "#16a34a", border: "#bbf7d0" };
  if (isRescheduled)
    return { bg: "#dbeafe", text: "#2563eb", border: "#bfdbfe" };
  if (isHoliday) return { bg: "#fef3c7", text: "#b45309", border: "#fcd34d" };
  return base;
};

const getExceptionLabel = (slot) => {
  if (slot.status === "CANCELLED" || slot.exception?.type === "CANCELLED")
    return { label: "CANCELLED", color: C.danger };
  if (slot.status === "EXTRA" || slot.exception?.type === "EXTRA")
    return { label: "EXTRA", color: C.success };
  if (slot.status === "RESCHEDULED" || slot.exception?.type === "RESCHEDULED")
    return { label: "RESCHEDULED", color: "#2563eb" };
  if (slot.status === "HOLIDAY") return { label: "HOLIDAY", color: C.warning };
  return null;
};

// ─── MAIN SCREEN ────────────────────────────────────────────────────────────
export default function StudentTimetableScreen() {
  const { user } = useAuth();
  const navigation = useNavigation();

  const [weekly, setWeekly] = useState({});
  const [todaySlots, setTodaySlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [navLoading, setNavLoading] = useState(false);
  const [error, setError] = useState(null);
  const [scheduleData, setScheduleData] = useState(null);
  const [scheduleSummary, setScheduleSummary] = useState(null);
  const [timetableId, setTimetableId] = useState(null);
  const [activePeriod, setActivePeriod] = useState({
    startDate: null,
    endDate: null,
  });
  const [isOutsideRange, setIsOutsideRange] = useState(false);
  const [selectedDay, setSelectedDay] = useState(
    DAY_MAP[new Date().getDay()] || "MON",
  );
  const [currentTime, setCurrentTime] = useState(new Date());

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const hasLoadedRef = useRef(false);
  const isFirstRenderRef = useRef(true);

  const [dateRange, setDateRange] = useState(() => {
    const today = new Date();
    const dow = today.getDay();
    const offset = dow === 0 ? -6 : 1 - dow;
    const mon = new Date(today);
    mon.setDate(today.getDate() + offset);
    const sun = new Date(mon);
    sun.setDate(mon.getDate() + 6);
    return { startDate: toLocalDateStr(mon), endDate: toLocalDateStr(sun) };
  });

  useEffect(() => {
    const t = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (hasLoadedRef.current) return;
    hasLoadedRef.current = true;
    loadTimetable(false);
  }, []);

  useEffect(() => {
    if (isFirstRenderRef.current) {
      isFirstRenderRef.current = false;
      return;
    }
    if (!hasLoadedRef.current) return;
    loadTimetable(true);
  }, [dateRange.startDate, dateRange.endDate]);

  const processOldFormat = (slots) => {
    const valid = slots.filter(validateSlot);
    const w = {};
    DAYS.forEach((d) => {
      w[d] = valid.filter((s) => s.day === d);
    });
    setWeekly(w);
    const todayAbbr = DAY_MAP[new Date().getDay()];
    setTodaySlots(w[todayAbbr] || []);
    setScheduleData(null);
    setScheduleSummary(null);
  };

  const processNewFormat = (schedule) => {
    const w = {};
    DAYS.forEach((d) => {
      w[d] = [];
    });
    const todayStr = new Date().toISOString().split("T")[0];
    let todayList = [];
    schedule.forEach((day) => {
      if (!day.slots?.length) return;
      const date = parseLocalDate(day.date);
      const dayName = DAY_MAP[date.getDay()];
      if (!w[dayName]) return;
      const withDate = day.slots.map((s) => ({
        ...s,
        day: dayName,
        exceptionDate: day.date,
        isHolidayOnly: day.isHoliday || false,
      }));
      w[dayName].push(...withDate);
      if (day.date === todayStr) todayList = withDate;
    });
    const allValid = Object.values(w).flat().filter(validateSlot);
    DAYS.forEach((d) => {
      w[d] = allValid.filter((s) => s.day === d);
    });
    todayList = todayList.filter(validateSlot);
    setWeekly(w);
    setTodaySlots(todayList);
  };

  const loadTimetable = async (isNav = false) => {
    try {
      isNav ? setNavLoading(true) : setLoading(true);
      setError(null);
      const ttRes = await api.get("/timetable/student");
      const resData = ttRes.data?.data || ttRes.data || {};
      const allSlots = resData.slots || resData || [];
      if (!allSlots?.length) {
        setWeekly({});
        setTodaySlots([]);
        setScheduleData(null);
        setTimetableId(null);
        setScheduleSummary(null);
        return;
      }
      const firstSlot = allSlots.find((s) => s.timetable_id);
      const tId =
        typeof firstSlot?.timetable_id === "object"
          ? firstSlot?.timetable_id?._id
          : firstSlot?.timetable_id;
      if (!tId) {
        processOldFormat(allSlots);
        return;
      }
      setTimetableId(tId);
      const schRes = await api.get(`/timetable/${tId}/schedule`, {
        params: { startDate: dateRange.startDate, endDate: dateRange.endDate },
      });
      const sch = schRes.data || {};
      const schedule = sch.schedule || [];
      const summary = sch.summary || null;
      const ttData = sch.timetable || null;
      const msg = sch.message || "";
      if (ttData?.startDate && ttData?.endDate)
        setActivePeriod({
          startDate: ttData.startDate,
          endDate: ttData.endDate,
        });
      const hasActive = !!(ttData?.startDate && ttData?.endDate);
      const outside = msg.includes("outside timetable active period");
      setIsOutsideRange(hasActive && outside);
      setScheduleData({ timetable: ttData });
      setScheduleSummary(summary);
      if (hasActive && outside) processOldFormat(allSlots);
      else if (schedule?.length) processNewFormat(schedule);
      else processOldFormat(allSlots);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }).start();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load timetable.");
    } finally {
      setLoading(false);
      setNavLoading(false);
      setRefreshing(false);
    }
  };

  const isWithinActive = (start, end) => {
    if (!activePeriod.startDate || !activePeriod.endDate) return true;
    const aS = parseLocalDate(activePeriod.startDate);
    const aE = parseLocalDate(activePeriod.endDate);
    const rS = parseLocalDate(start);
    const rE = parseLocalDate(end);
    return rS <= aE && rE >= aS;
  };

  const shiftWeek = (dir) => {
    const s = new Date(dateRange.startDate.replace(/-/g, "/"));
    s.setDate(s.getDate() + dir * 7);
    const e = new Date(dateRange.endDate.replace(/-/g, "/"));
    e.setDate(e.getDate() + dir * 7);
    const ns = toLocalDateStr(s),
      ne = toLocalDateStr(e);
    if (!isWithinActive(ns, ne)) {
      alert("No timetable available for this week.");
      return;
    }
    setDateRange({ startDate: ns, endDate: ne });
  };

  const goCurrentWeek = () => {
    const today = new Date();
    const dow = today.getDay();
    const off = dow === 0 ? -6 : 1 - dow;
    const mon = new Date(today);
    mon.setDate(today.getDate() + off);
    const sun = new Date(mon);
    sun.setDate(mon.getDate() + 6);
    setDateRange({
      startDate: toLocalDateStr(mon),
      endDate: toLocalDateStr(sun),
    });
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadTimetable(true);
  };

  const today = new Date();
  const currentDayAbbr = DAY_MAP[today.getDay()];
  const todayDisplaySlots = weekly[selectedDay] || [];

  const getDateForDay = (dayCode) => {
    const idx = DAYS.indexOf(dayCode);
    if (idx === -1) return null;
    const [y, m, d] = dateRange.startDate.split("-").map(Number);
    return new Date(y, m - 1, d + idx);
  };

  const formatShortDate = (date) => {
    if (!date) return "";
    return `${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(2, "0")}`;
  };

  if (loading) {
    return (
      <View style={s.loadingContainer}>
        <Text style={{ fontSize: 52 }}>📅</Text>
        <ActivityIndicator
          size="large"
          color={C.primary}
          style={{ marginTop: 16 }}
        />
        <Text style={s.loadingText}>Loading Your Timetable...</Text>
      </View>
    );
  }

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor={C.primary} />

      <ScrollView
        style={s.scroll}
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
        {/* ── PROFILE-STYLE WELCOME CARD ── */}
        <View style={s.welcomeCard}>
          {/* Decorative circles */}
          <View style={s.circleTop} />
          <View style={s.circleBottom} />

          {/* Row 1: back + title + time */}
          <View style={s.welcomeRow}>
            <TouchableOpacity
              style={s.backBtn}
              onPress={() => navigation.goBack()}
              hitSlop={{ top: 8, left: 8, right: 8, bottom: 8 }}
            >
              <Text style={s.backBtnText}>←</Text>
            </TouchableOpacity>

            <Text style={s.welcomeTitle}>My Timetable</Text>

            <View style={s.timeChipCard}>
              <Text style={s.timeChipText}>
                {currentTime.toLocaleTimeString("en-US", {
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: true,
                })}
              </Text>
            </View>
          </View>

          {/* Row 2: week navigation */}
          <View style={s.weekNav}>
            <TouchableOpacity
              style={s.weekArrowBtn}
              onPress={() => shiftWeek(-1)}
            >
              <Text style={s.weekArrowText}>‹</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.weekCenter} onPress={goCurrentWeek}>
              <Text style={s.weekRangeText}>
                {new Date(dateRange.startDate).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })}
                {" – "}
                {new Date(dateRange.endDate).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </Text>
              <Text style={s.weekHint}>Tap for current week</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={s.weekArrowBtn}
              onPress={() => shiftWeek(1)}
            >
              <Text style={s.weekArrowText}>›</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Outside Range Banner */}
        {isOutsideRange && (
          <View style={s.rangeBanner}>
            <Text style={{ fontSize: 20 }}>⚠️</Text>
            <View style={{ flex: 1 }}>
              <Text style={s.rangeBannerTitle}>No Timetable for This Week</Text>
              {activePeriod.startDate && activePeriod.endDate && (
                <Text style={s.rangeBannerSub}>
                  Active:{" "}
                  {parseLocalDate(activePeriod.startDate).toLocaleDateString(
                    "en-US",
                    {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    },
                  )}
                  {" – "}
                  {parseLocalDate(activePeriod.endDate).toLocaleDateString(
                    "en-US",
                    {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    },
                  )}
                </Text>
              )}
            </View>
            <TouchableOpacity style={s.rangeBannerBtn} onPress={goCurrentWeek}>
              <Text style={s.rangeBannerBtnText}>Current Week</Text>
            </TouchableOpacity>
          </View>
        )}

        {error && (
          <View style={s.errorBanner}>
            <Text style={s.errorText}>⚠ {error}</Text>
            <TouchableOpacity onPress={() => loadTimetable(false)}>
              <Text style={s.errorRetry}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        {navLoading && (
          <View style={s.navLoading}>
            <ActivityIndicator size="small" color={C.primary} />
            <Text style={s.navLoadingText}>Loading timetable...</Text>
          </View>
        )}

        {/* ── DAY SELECTOR TABS ── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ marginBottom: 12 }}
          contentContainerStyle={{ gap: 8, paddingRight: 8 }}
        >
          {DAYS.map((day, idx) => {
            const dayDate = getDateForDay(day);
            const isToday = day === currentDayAbbr;
            const isSelected = day === selectedDay;
            const hasSlots = (weekly[day] || []).length > 0;
            return (
              <TouchableOpacity
                key={day}
                style={[
                  s.dayTab,
                  isSelected && s.dayTabSelected,
                  isToday && !isSelected && s.dayTabToday,
                ]}
                onPress={() => setSelectedDay(day)}
              >
                <Text
                  style={[s.dayTabName, isSelected && s.dayTabTextSelected]}
                >
                  {DAY_SHORT[idx]}
                </Text>
                <Text
                  style={[s.dayTabDate, isSelected && s.dayTabTextSelected]}
                >
                  {formatShortDate(dayDate)}
                </Text>
                {hasSlots && (
                  <View
                    style={[s.dayTabDot, isSelected && s.dayTabDotSelected]}
                  />
                )}
                {isToday && <Text style={s.todayBadge}>Today</Text>}
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* ── TODAY'S CLASSES SECTION ── */}
        <View style={s.sectionCard}>
          <View style={s.sectionHeader}>
            <View style={s.sectionTitleWrap}>
              <Text style={{ fontSize: 16 }}>
                {selectedDay === currentDayAbbr ? "☀️" : "📅"}
              </Text>
              <Text style={s.sectionTitle}>
                {selectedDay === currentDayAbbr
                  ? "Today's Classes"
                  : `${DAY_NAMES[DAYS.indexOf(selectedDay)]} Classes`}
              </Text>
            </View>
            <View style={s.sectionBadge}>
              <Text style={s.sectionBadgeText}>
                {todayDisplaySlots.length} classes
              </Text>
            </View>
          </View>

          {todayDisplaySlots.length === 0 ? (
            <EmptyDay
              day={DAYS.indexOf(selectedDay)}
              isToday={selectedDay === currentDayAbbr}
            />
          ) : (
            (() => {
              const isFullDayHoliday =
                todayDisplaySlots.length === 1 &&
                todayDisplaySlots[0].status === "HOLIDAY" &&
                todayDisplaySlots[0].startTime === "00:00" &&
                todayDisplaySlots[0].endTime === "23:59";
              if (isFullDayHoliday)
                return <HolidayCard slot={todayDisplaySlots[0]} />;
              return todayDisplaySlots.map((slot, idx) => (
                <SlotCard key={slot._id || idx} slot={slot} index={idx} />
              ));
            })()
          )}
        </View>

        {/* ── WEEKLY OVERVIEW ── */}
        <View style={[s.sectionCard, { marginBottom: 32 }]}>
          <View style={s.sectionHeader}>
            <View style={s.sectionTitleWrap}>
              <Text style={{ fontSize: 16 }}>📋</Text>
              <Text style={s.sectionTitle}>Weekly Overview</Text>
            </View>
            <View style={s.sectionBadge}>
              <Text style={s.sectionBadgeText}>All days</Text>
            </View>
          </View>
          {DAYS.map((day, idx) => {
            const slots = weekly[day] || [];
            const dayDate = getDateForDay(day);
            const isToday = day === currentDayAbbr;
            const isFullHoliday =
              slots.length === 1 &&
              slots[0].status === "HOLIDAY" &&
              slots[0].startTime === "00:00";
            return (
              <TouchableOpacity
                key={day}
                style={[s.weekRow, isToday && s.weekRowToday]}
                onPress={() => setSelectedDay(day)}
                activeOpacity={0.75}
              >
                <View style={[s.weekRowDay, isToday && s.weekRowDayToday]}>
                  <Text
                    style={[s.weekRowDayName, isToday && s.weekRowDayTextToday]}
                  >
                    {DAY_SHORT[idx]}
                  </Text>
                  <Text
                    style={[s.weekRowDayDate, isToday && s.weekRowDayTextToday]}
                  >
                    {formatShortDate(dayDate)}
                  </Text>
                </View>
                <View style={s.weekRowSlots}>
                  {isFullHoliday ? (
                    <View
                      style={[
                        s.miniChip,
                        {
                          backgroundColor: C.warningLight,
                          borderColor: C.warning,
                        },
                      ]}
                    >
                      <Text style={[s.miniChipText, { color: "#b45309" }]}>
                        🎉 Holiday
                      </Text>
                    </View>
                  ) : slots.length === 0 ? (
                    <Text style={s.weekRowEmpty}>— No classes</Text>
                  ) : (
                    slots.slice(0, 3).map((slot, si) => {
                      const colors = getSlotColors(slot);
                      const exc = getExceptionLabel(slot);
                      return (
                        <View
                          key={si}
                          style={[
                            s.miniChip,
                            {
                              backgroundColor: colors.bg,
                              borderColor: colors.border,
                            },
                          ]}
                        >
                          <Text
                            style={[s.miniChipText, { color: colors.text }]}
                            numberOfLines={1}
                          >
                            {formatTime12(slot.startTime)} ·{" "}
                            {slot.subject_id?.name}
                          </Text>
                          {exc && (
                            <Text
                              style={[s.miniExcBadge, { color: exc.color }]}
                            >
                              {exc.label}
                            </Text>
                          )}
                        </View>
                      );
                    })
                  )}
                  {slots.length > 3 && (
                    <Text style={s.weekRowMore}>+{slots.length - 3} more</Text>
                  )}
                </View>
                <Text style={s.weekRowArrow}></Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

// ─── EMPTY DAY ────────────────────────────────────────────────────────────────
function EmptyDay({ day, isToday }) {
  return (
    <View style={ed.wrap}>
      <Text style={ed.icon}>{isToday ? "☀️" : "📅"}</Text>
      <Text style={ed.title}>
        {isToday ? "No Classes Today" : "No Classes"}
      </Text>
      <Text style={ed.sub}>
        {isToday
          ? "Enjoy your free day!"
          : `${DAY_NAMES[day]} is free this week.`}
      </Text>
    </View>
  );
}
const ed = StyleSheet.create({
  wrap: { alignItems: "center", paddingVertical: 32 },
  icon: { fontSize: 44, marginBottom: 10 },
  title: {
    fontSize: 16,
    fontWeight: "700",
    color: C.textPrimary,
    marginBottom: 4,
  },
  sub: { fontSize: 13, color: C.textSecondary, textAlign: "center" },
});

// ─── HOLIDAY CARD ─────────────────────────────────────────────────────────────
function HolidayCard({ slot }) {
  const reason = slot.exception?.reason || slot.subject_id?.name || "Holiday";
  return (
    <View style={hc.card}>
      <View style={hc.banner}>
        <View style={hc.iconWrap}>
          <Text style={{ fontSize: 26 }}>🎉</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={hc.title}>Full Day Holiday</Text>
          <Text style={hc.reason}>{reason}</Text>
        </View>
      </View>
      <View style={hc.msgBox}>
        <Text style={hc.msgText}>🌟 Enjoy your holiday! No classes today.</Text>
      </View>
    </View>
  );
}
const hc = StyleSheet.create({
  card: {
    backgroundColor: C.warningLight,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: C.warning,
    padding: 16,
    margin: 4,
  },
  banner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
  },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: C.warning,
    justifyContent: "center",
    alignItems: "center",
  },
  title: { fontSize: 17, fontWeight: "700", color: "#92400e", marginBottom: 2 },
  reason: { fontSize: 13, color: "#b45309", fontWeight: "500" },
  msgBox: {
    backgroundColor: "rgba(255,255,255,0.5)",
    borderRadius: 8,
    padding: 12,
    borderLeftWidth: 4,
    borderLeftColor: C.warning,
  },
  msgText: { fontSize: 13, color: "#78350f", lineHeight: 20 },
});

// ─── SLOT CARD ────────────────────────────────────────────────────────────────
function SlotCard({ slot, index }) {
  const colors = getSlotColors(slot);
  const exc = getExceptionLabel(slot);
  const isCancelled =
    slot.status === "CANCELLED" || slot.exception?.type === "CANCELLED";

  return (
    <View
      style={[
        sc.card,
        { borderLeftColor: colors.text, opacity: isCancelled ? 0.75 : 1 },
      ]}
    >
      <View style={sc.topRow}>
        <View style={sc.timeChip}>
          <Text style={sc.timeText}>
            🕐 {formatTime12(slot.startTime)} – {formatTime12(slot.endTime)}
          </Text>
        </View>
        <View style={sc.badges}>
          <View style={[sc.typeBadge, { backgroundColor: colors.bg }]}>
            <Text style={[sc.typeBadgeText, { color: colors.text }]}>
              {slot.slotType || "LECTURE"}
            </Text>
          </View>
          {exc && (
            <View
              style={[
                sc.excBadge,
                {
                  backgroundColor: exc.color + "18",
                  borderColor: exc.color + "44",
                },
              ]}
            >
              <Text style={[sc.excBadgeText, { color: exc.color }]}>
                {exc.label}
              </Text>
            </View>
          )}
        </View>
      </View>

      <Text style={[sc.subject, isCancelled && sc.strikethrough]}>
        {slot.subject_id?.name}
      </Text>

      <View style={sc.metaRow}>
        {slot.teacher_id?.name && (
          <Text style={sc.metaItem}>👨‍🏫 {slot.teacher_id.name}</Text>
        )}
        {slot.room && <Text style={sc.metaItem}>📍 Room {slot.room}</Text>}
      </View>

      {slot.exception?.reason && (
        <View
          style={[
            sc.reasonBox,
            {
              borderLeftColor: exc?.color || C.info,
              backgroundColor: (exc?.color || C.info) + "12",
            },
          ]}
        >
          <Text style={[sc.reasonText, { color: exc?.color || C.info }]}>
            ℹ️ {slot.exception.reason}
            {slot.exception.rescheduledTo &&
              ` → ${new Date(slot.exception.rescheduledTo).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`}
          </Text>
        </View>
      )}
    </View>
  );
}
const sc = StyleSheet.create({
  card: {
    borderLeftWidth: 4,
    backgroundColor: "#f8fafc",
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 8,
    flexWrap: "wrap",
    gap: 6,
  },
  timeChip: {
    backgroundColor: "#e3f2fd",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  timeText: { fontSize: 12, fontWeight: "600", color: C.primary },
  badges: { flexDirection: "row", flexWrap: "wrap", gap: 4 },
  typeBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  typeBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  excBadge: {
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderWidth: 1,
  },
  excBadgeText: { fontSize: 10, fontWeight: "700" },
  subject: {
    fontSize: 15,
    fontWeight: "700",
    color: C.textPrimary,
    marginBottom: 8,
  },
  strikethrough: { textDecorationLine: "line-through", opacity: 0.6 },
  metaRow: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  metaItem: { fontSize: 12, color: C.textSecondary },
  reasonBox: { borderLeftWidth: 3, borderRadius: 6, padding: 8, marginTop: 8 },
  reasonText: { fontSize: 12, lineHeight: 18 },
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
  loadingText: {
    marginTop: 12,
    fontSize: 15,
    color: C.textSecondary,
    fontWeight: "500",
  },

  // ── SCROLL ──
  scroll: { flex: 1 },
  scrollContent: { padding: 14, paddingTop: 0, gap: 12, paddingBottom: 32 },

  // ── PROFILE-STYLE WELCOME CARD ──
  welcomeCard: {
    backgroundColor: C.primary,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 14,
    overflow: "hidden",
    position: "relative",
    marginBottom: 2,
    marginTop: Platform.OS === "ios" ? 52 : (StatusBar.currentHeight || 24) + 2,
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
    marginBottom: 12,
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
  timeChipCard: {
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  timeChipText: { color: C.white, fontSize: 13, fontWeight: "600" },

  // ── WEEK NAV (inside welcome card) ──
  weekNav: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 12,
    overflow: "hidden",
  },
  weekArrowBtn: { paddingHorizontal: 14, paddingVertical: 10 },
  weekArrowText: { color: C.white, fontSize: 22, fontWeight: "700" },
  weekCenter: { flex: 1, alignItems: "center", paddingVertical: 8 },
  weekRangeText: {
    color: C.white,
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
  },
  weekHint: { color: "rgba(255,255,255,0.6)", fontSize: 10, marginTop: 2 },

  // ── BANNERS ──
  rangeBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.warningLight,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.warning,
    padding: 12,
    gap: 8,
  },
  rangeBannerTitle: { fontSize: 13, fontWeight: "700", color: "#92400e" },
  rangeBannerSub: { fontSize: 11, color: "#b45309", marginTop: 2 },
  rangeBannerBtn: {
    backgroundColor: C.warning,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  rangeBannerBtnText: { color: C.white, fontSize: 11, fontWeight: "700" },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.dangerLight,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#fecaca",
    padding: 12,
  },
  errorText: { flex: 1, color: C.danger, fontSize: 13 },
  errorRetry: {
    color: C.danger,
    fontWeight: "700",
    fontSize: 13,
    marginLeft: 8,
  },

  navLoading: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 10,
  },
  navLoadingText: { color: C.textSecondary, fontSize: 13 },

  // ── DAY TABS ──
  dayTab: {
    alignItems: "center",
    backgroundColor: C.white,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1.5,
    borderColor: C.border,
    minWidth: 62,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  dayTabSelected: { backgroundColor: C.primary, borderColor: C.primary },
  dayTabToday: { borderColor: C.accent, borderWidth: 2 },
  dayTabName: { fontSize: 12, fontWeight: "700", color: C.textSecondary },
  dayTabDate: { fontSize: 10, color: C.textMuted, marginTop: 1 },
  dayTabTextSelected: { color: C.white },
  dayTabDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: C.accent,
    marginTop: 3,
  },
  dayTabDotSelected: { backgroundColor: C.white },
  todayBadge: { fontSize: 8, color: C.accent, fontWeight: "700", marginTop: 1 },

  // ── SECTION CARD ──
  sectionCard: {
    backgroundColor: C.white,
    borderRadius: 18,
    padding: 14,
    borderWidth: 0.5,
    borderColor: C.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: C.borderLight,
  },
  sectionTitleWrap: { flexDirection: "row", alignItems: "center", gap: 6 },
  sectionTitle: { fontSize: 14, fontWeight: "700", color: C.primary },
  sectionBadge: {
    backgroundColor: C.accentLight,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  sectionBadgeText: { fontSize: 11, color: C.primary, fontWeight: "600" },

  // ── WEEKLY ROWS ──
  weekRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: C.borderLight,
    gap: 10,
  },
  weekRowToday: {
    backgroundColor: C.accentLight,
    borderRadius: 12,
    paddingHorizontal: 8,
    marginHorizontal: -4,
  },
  weekRowDay: {
    width: 46,
    alignItems: "center",
    backgroundColor: "#f8fafc",
    borderRadius: 10,
    paddingVertical: 8,
  },
  weekRowDayToday: { backgroundColor: C.primary },
  weekRowDayName: { fontSize: 12, fontWeight: "700", color: C.textSecondary },
  weekRowDayDate: { fontSize: 9, color: C.textMuted, marginTop: 1 },
  weekRowDayTextToday: { color: C.white },
  weekRowSlots: { flex: 1, gap: 4 },
  weekRowEmpty: {
    fontSize: 12,
    color: C.textMuted,
    fontStyle: "italic",
    paddingVertical: 4,
  },
  weekRowMore: {
    fontSize: 10,
    color: C.primary,
    fontWeight: "600",
    marginTop: 2,
  },
  weekRowArrow: { fontSize: 18, color: C.textMuted, alignSelf: "center" },
  miniChip: {
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 5,
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 4,
  },
  miniChipText: { fontSize: 11, fontWeight: "500", flex: 1 },
  miniExcBadge: { fontSize: 9, fontWeight: "700" },
});
