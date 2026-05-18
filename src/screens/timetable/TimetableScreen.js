import React, { useState, useEffect, useRef, useContext } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  FlatList,
  Dimensions,
  Animated,
  Platform,
  StatusBar,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useAuth } from "../../context/AuthContext"; // adjust path
import api from "../../services/api"; // adjust path

const { width } = Dimensions.get("window");

// ─── COLORS ────────────────────────────────────────────────────────────────
const C = {
  primary: "#1a4b6d",
  primaryLight: "#2d6f8f",
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
  card: "#ffffff",
  border: "#e2e8f0",
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
  const base =
    C[
      `slot${slot?.slotType?.charAt(0) + slot?.slotType?.slice(1).toLowerCase()}`
    ] || C.slotLecture;
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

  // Default date range: current week Mon→Sun
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

  // Clock tick
  useEffect(() => {
    const t = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(t);
  }, []);

  // Initial load
  useEffect(() => {
    if (hasLoadedRef.current) return;
    hasLoadedRef.current = true;
    loadTimetable(false);
  }, []);

  // Re-load on week change
  useEffect(() => {
    if (isFirstRenderRef.current) {
      isFirstRenderRef.current = false;
      return;
    }
    if (!hasLoadedRef.current) return;
    loadTimetable(true);
  }, [dateRange.startDate, dateRange.endDate]);

  // ── data helpers ──
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

  // ── week navigation ──
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

  // ── derived ──
  const today = new Date();
  const currentDayAbbr = DAY_MAP[today.getDay()];
  const todayDisplaySlots = weekly[selectedDay] || [];

  const courseName =
    scheduleData?.timetable?.course_id?.name ||
    todaySlots[0]?.course_id?.name ||
    "";
  const semester =
    scheduleData?.timetable?.semester ||
    todaySlots[0]?.timetable_id?.semester ||
    "";

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

  // ─── LOADING ────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={s.loadingContainer}>
        <Text style={s.loadingEmoji}>📅</Text>
        <ActivityIndicator
          size="large"
          color={C.primary}
          style={{ marginTop: 16 }}
        />
        <Text style={s.loadingText}>Loading Your Timetable...</Text>
      </View>
    );
  }

  // ─── RENDER ─────────────────────────────────────────────────────────────
  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor={C.primary} />

      {/* ── HEADER ── */}
      <View style={s.header}>
        <View style={s.headerTop}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={s.backBtn}
          >
            <Text style={s.backBtnText}>←</Text>
          </TouchableOpacity>
          <View style={s.headerCenter}>
            <Text style={s.headerTitle}>My Timetable</Text>
            {courseName || semester ? (
              <Text style={s.headerSub} numberOfLines={1}>
                {courseName}
                {semester ? `  •  Sem ${semester}` : ""}
              </Text>
            ) : null}
          </View>
          <View style={s.headerClock}>
            <Text style={s.headerClockTime}>
              {currentTime.toLocaleTimeString("en-US", {
                hour: "2-digit",
                minute: "2-digit",
                hour12: true,
              })}
            </Text>
            <Text style={s.headerClockLabel}>Now</Text>
          </View>
        </View>

        {/* Week Navigation */}
        <View style={s.weekNav}>
          <TouchableOpacity style={s.weekArrow} onPress={() => shiftWeek(-1)}>
            <Text style={s.weekArrowText}>‹</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.weekLabel} onPress={goCurrentWeek}>
            <Text style={s.weekLabelText}>
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
            <Text style={s.weekCurrentHint}>Tap for current week</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.weekArrow} onPress={() => shiftWeek(1)}>
            <Text style={s.weekArrowText}>›</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── MAIN SCROLL ── */}
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
        {/* Outside Range Banner */}
        {isOutsideRange && (
          <View style={s.rangeBanner}>
            <Text style={s.rangeBannerIcon}>⚠️</Text>
            <View style={{ flex: 1 }}>
              <Text style={s.rangeBannerTitle}>No Timetable for This Week</Text>
              {activePeriod.startDate && activePeriod.endDate && (
                <Text style={s.rangeBannerSub}>
                  Active:{" "}
                  {parseLocalDate(activePeriod.startDate).toLocaleDateString(
                    "en-US",
                    { day: "numeric", month: "short", year: "numeric" },
                  )}
                  {" – "}
                  {parseLocalDate(activePeriod.endDate).toLocaleDateString(
                    "en-US",
                    { day: "numeric", month: "short", year: "numeric" },
                  )}
                </Text>
              )}
            </View>
            <TouchableOpacity style={s.rangeBannerBtn} onPress={goCurrentWeek}>
              <Text style={s.rangeBannerBtnText}>Current Week</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Error Banner */}
        {error && (
          <View style={s.errorBanner}>
            <Text style={s.errorText}>⚠ {error}</Text>
            <TouchableOpacity onPress={() => loadTimetable(false)}>
              <Text style={s.errorRetry}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── STATS STRIP ── */}
        <View style={s.statsStrip}>
          <StatPill
            icon="📅"
            value={
              scheduleSummary?.totalScheduledSlots ||
              Object.values(weekly).flat().length
            }
            label="This Week"
            color={C.primary}
          />
          <StatPill
            icon="☀️"
            value={todaySlots.length}
            label="Today"
            color={C.success}
          />
          <StatPill
            icon="🗓"
            value={
              scheduleSummary?.workingDays ||
              DAYS.filter((d) => weekly[d]?.length > 0).length
            }
            label="Working Days"
            color={C.info}
          />
          {scheduleSummary?.cancelledSlots > 0 && (
            <StatPill
              icon="❌"
              value={scheduleSummary.cancelledSlots}
              label="Cancelled"
              color={C.danger}
            />
          )}
          {scheduleSummary?.extraClasses > 0 && (
            <StatPill
              icon="✅"
              value={scheduleSummary.extraClasses}
              label="Extra"
              color={C.success}
            />
          )}
          {scheduleSummary?.holidays > 0 && (
            <StatPill
              icon="🎉"
              value={scheduleSummary.holidays}
              label="Holidays"
              color={C.warning}
            />
          )}
        </View>

        {/* ── NAV LOADING OVERLAY (inline) ── */}
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
          style={s.dayTabsWrap}
          contentContainerStyle={s.dayTabsContent}
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
                {isToday && <Text style={s.dayTabTodayBadge}>Today</Text>}
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* ── SELECTED DAY'S SLOTS ── */}
        <View style={s.sectionCard}>
          <View style={s.sectionHeader}>
            <Text style={s.sectionTitle}>
              {selectedDay === currentDayAbbr
                ? "☀️ Today's Classes"
                : `📅 ${DAY_NAMES[DAYS.indexOf(selectedDay)]} Classes`}
            </Text>
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

        {/* ── WEEKLY OVERVIEW (compact) ── */}
        <View style={[s.sectionCard, { marginBottom: 32 }]}>
          <View style={s.sectionHeader}>
            <Text style={s.sectionTitle}>📋 Weekly Overview</Text>
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
                        s.weekMiniChip,
                        {
                          backgroundColor: C.warningLight,
                          borderColor: C.warning,
                        },
                      ]}
                    >
                      <Text style={[s.weekMiniChipText, { color: "#b45309" }]}>
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
                            s.weekMiniChip,
                            {
                              backgroundColor: colors.bg,
                              borderColor: colors.border,
                            },
                          ]}
                        >
                          <Text
                            style={[s.weekMiniChipText, { color: colors.text }]}
                            numberOfLines={1}
                          >
                            {formatTime12(slot.startTime)} ·{" "}
                            {slot.subject_id?.name}
                          </Text>
                          {exc && (
                            <Text
                              style={[s.weekMiniExcBadge, { color: exc.color }]}
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
                <Text style={s.weekRowArrow}>›</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

// ─── STAT PILL ───────────────────────────────────────────────────────────────
function StatPill({ icon, value, label, color }) {
  return (
    <View style={[sp.pill, { borderColor: color + "44" }]}>
      <Text style={sp.icon}>{icon}</Text>
      <Text style={[sp.value, { color }]}>{value}</Text>
      <Text style={sp.label}>{label}</Text>
    </View>
  );
}
const sp = StyleSheet.create({
  pill: {
    alignItems: "center",
    backgroundColor: C.white,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginRight: 8,
    borderWidth: 1.5,
    minWidth: 72,
  },
  icon: { fontSize: 18, marginBottom: 2 },
  value: { fontSize: 20, fontWeight: "700" },
  label: {
    fontSize: 10,
    color: C.textSecondary,
    marginTop: 1,
    textAlign: "center",
  },
});

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
    fontSize: 17,
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
          <Text style={hc.mainIcon}>🎉</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={hc.title}>Full Day Holiday</Text>
          <Text style={hc.reason}>{reason}</Text>
        </View>
      </View>
      <View style={hc.detailRow}>
        <Text style={hc.detailIcon}>🕐</Text>
        <View>
          <Text style={hc.detailLabel}>Duration</Text>
          <Text style={hc.detailValue}>12:00 AM – 11:59 PM (Full Day)</Text>
        </View>
      </View>
      {slot.exception?.approvedBy && (
        <View style={hc.detailRow}>
          <Text style={hc.detailIcon}>✅</Text>
          <View>
            <Text style={hc.detailLabel}>Approved By</Text>
            <Text style={hc.detailValue}>
              {slot.exception.approvedBy.name || "HOD"}
            </Text>
          </View>
        </View>
      )}
      <View style={hc.msgBox}>
        <Text style={hc.msgText}>
          🌟 Enjoy your holiday! No classes today. Use this time to rest and
          prepare for upcoming sessions.
        </Text>
      </View>
    </View>
  );
}
const hc = StyleSheet.create({
  card: {
    backgroundColor: C.warningLight,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: C.warning,
    padding: 16,
    margin: 4,
  },
  banner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 14,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#fcd34d",
    borderStyle: "dashed",
  },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: C.warning,
    justifyContent: "center",
    alignItems: "center",
  },
  mainIcon: { fontSize: 26 },
  title: { fontSize: 18, fontWeight: "700", color: "#92400e", marginBottom: 2 },
  reason: { fontSize: 14, color: "#b45309", fontWeight: "500" },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "rgba(255,255,255,0.55)",
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
  },
  detailIcon: { fontSize: 20 },
  detailLabel: {
    fontSize: 10,
    color: "#92400e",
    fontWeight: "700",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  detailValue: {
    fontSize: 13,
    color: "#78350f",
    fontWeight: "500",
    marginTop: 1,
  },
  msgBox: {
    backgroundColor: "rgba(255,255,255,0.5)",
    borderRadius: 8,
    padding: 12,
    borderLeftWidth: 4,
    borderLeftColor: C.warning,
    marginTop: 4,
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
        { borderLeftColor: colors.text, opacity: isCancelled ? 0.72 : 1 },
      ]}
    >
      {/* Time row */}
      <View style={sc.topRow}>
        <View style={[sc.timeChip]}>
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

      {/* Subject */}
      <Text style={[sc.subject, isCancelled && sc.strikethrough]}>
        {slot.subject_id?.name}
      </Text>

      {/* Meta */}
      <View style={sc.metaRow}>
        {slot.teacher_id?.name && (
          <Text style={sc.metaItem}>👨‍🏫 {slot.teacher_id.name}</Text>
        )}
        {slot.room && <Text style={sc.metaItem}>📍 Room {slot.room}</Text>}
      </View>

      {/* Exception reason */}
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
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
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
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
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

// ─── STYLES ──────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },

  // Loading
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: C.bg,
  },
  loadingEmoji: { fontSize: 52 },
  loadingText: {
    marginTop: 12,
    fontSize: 15,
    color: C.textSecondary,
    fontWeight: "500",
  },

  // Header
  header: {
    backgroundColor: C.primary,
    paddingTop: Platform.OS === "ios" ? 52 : StatusBar.currentHeight + 12 || 28,
    paddingBottom: 0,
    paddingHorizontal: 16,
  },
  headerTop: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
    gap: 10,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.18)",
    justifyContent: "center",
    alignItems: "center",
  },
  backBtnText: {
    color: C.white,
    fontSize: 22,
    fontWeight: "700",
    lineHeight: 26,
  },
  headerCenter: { flex: 1 },
  headerTitle: { fontSize: 20, fontWeight: "700", color: C.white },
  headerSub: { fontSize: 12, color: "rgba(255,255,255,0.8)", marginTop: 2 },
  headerClock: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.18)",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  headerClockTime: { fontSize: 14, fontWeight: "700", color: C.white },
  headerClockLabel: {
    fontSize: 9,
    color: "rgba(255,255,255,0.75)",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  // Week nav
  weekNav: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.18)",
    borderRadius: 12,
    marginBottom: 12,
    overflow: "hidden",
  },
  weekArrow: { paddingHorizontal: 16, paddingVertical: 12 },
  weekArrowText: { color: C.white, fontSize: 22, fontWeight: "700" },
  weekLabel: { flex: 1, alignItems: "center", paddingVertical: 10 },
  weekLabelText: {
    color: C.white,
    fontSize: 13,
    fontWeight: "600",
    textAlign: "center",
  },
  weekCurrentHint: {
    color: "rgba(255,255,255,0.65)",
    fontSize: 10,
    marginTop: 2,
  },

  // Scroll
  scroll: { flex: 1 },
  scrollContent: { padding: 14 },

  // Range banner
  rangeBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.warningLight,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.warning,
    padding: 12,
    marginBottom: 12,
    gap: 8,
  },
  rangeBannerIcon: { fontSize: 20 },
  rangeBannerTitle: { fontSize: 13, fontWeight: "700", color: "#92400e" },
  rangeBannerSub: { fontSize: 11, color: "#b45309", marginTop: 2 },
  rangeBannerBtn: {
    backgroundColor: C.warning,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  rangeBannerBtnText: { color: C.white, fontSize: 11, fontWeight: "700" },

  // Error
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.dangerLight,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#fecaca",
    padding: 12,
    marginBottom: 12,
  },
  errorText: { flex: 1, color: C.danger, fontSize: 13 },
  errorRetry: {
    color: C.danger,
    fontWeight: "700",
    fontSize: 13,
    marginLeft: 8,
  },

  // Stats
  statsStrip: { flexDirection: "row", marginBottom: 14 },

  // Nav loading
  navLoading: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 10,
    marginBottom: 6,
  },
  navLoadingText: { color: C.textSecondary, fontSize: 13 },

  // Day tabs
  dayTabsWrap: { marginBottom: 12 },
  dayTabsContent: { paddingRight: 8, gap: 8 },
  dayTab: {
    alignItems: "center",
    backgroundColor: C.white,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1.5,
    borderColor: C.border,
    minWidth: 60,
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
  dayTabTodayBadge: {
    fontSize: 8,
    color: C.accent,
    fontWeight: "700",
    marginTop: 1,
  },

  // Section cards
  sectionCard: {
    backgroundColor: C.white,
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
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
    borderBottomColor: C.border,
  },
  sectionTitle: { fontSize: 15, fontWeight: "700", color: C.textPrimary },
  sectionBadge: {
    backgroundColor: C.accentLight,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  sectionBadgeText: { fontSize: 11, color: C.primary, fontWeight: "600" },

  // Weekly overview rows
  weekRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    gap: 10,
  },
  weekRowToday: {
    backgroundColor: C.accentLight,
    borderRadius: 10,
    paddingHorizontal: 8,
    marginHorizontal: -4,
  },
  weekRowDay: {
    width: 44,
    alignItems: "center",
    backgroundColor: C.bg,
    borderRadius: 8,
    paddingVertical: 6,
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
  weekMiniChip: {
    borderRadius: 6,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 4,
  },
  weekMiniChipText: { fontSize: 11, fontWeight: "500", flex: 1 },
  weekMiniExcBadge: { fontSize: 9, fontWeight: "700" },
});
