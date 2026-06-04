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
  Platform,
  useWindowDimensions, // ✅ Responsive + Landscape
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context"; // ✅ Safe Area
import { useNavigation } from "@react-navigation/native";
import { useAuth } from "../../context/AuthContext";
import api from "../../services/api";

// ─── COLORS ─────────────────────────────────────────────────────────────────
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

// ─── CONSTANTS ───────────────────────────────────────────────────────────────
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

// ─── HELPERS ─────────────────────────────────────────────────────────────────
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

// ✅ Scale hook — base 390px
const useScale = () => {
  const { width } = useWindowDimensions();
  return Math.min(Math.max(width / 390, 0.75), 1.25);
};

// ─── MAIN SCREEN ─────────────────────────────────────────────────────────────
export default function StudentTimetableScreen() {
  const { user } = useAuth();
  const navigation = useNavigation();

  // ✅ Safe Area
  const insets = useSafeAreaInsets();
  // ✅ Responsive + Landscape
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;
  const scale = useScale();
  const rs = (size) => Math.round(size * scale);

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

  const currentDayAbbr = DAY_MAP[new Date().getDay()];
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

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <View
        style={[
          s.loadingContainer,
          { paddingTop: insets.top, paddingBottom: insets.bottom },
        ]}
      >
        <Text style={{ fontSize: rs(52) }}>📅</Text>
        <ActivityIndicator
          size="large"
          color={C.primary}
          style={{ marginTop: rs(16) }}
        />
        <Text style={[s.loadingText, { fontSize: rs(15) }]}>
          Loading Your Timetable...
        </Text>
      </View>
    );
  }

  // ── Landscape: show day tabs + slots side by side ─────────────────────────
  const mainContent = (
    <>
      {/* ── DAY TABS ── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ marginBottom: rs(12) }}
        contentContainerStyle={{ gap: rs(8), paddingRight: rs(8) }}
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
                {
                  borderRadius: rs(14),
                  paddingHorizontal: rs(14),
                  paddingVertical: rs(10),
                  minWidth: rs(62),
                },
              ]}
              onPress={() => setSelectedDay(day)}
            >
              <Text
                style={[
                  s.dayTabName,
                  isSelected && s.dayTabTextSelected,
                  { fontSize: rs(12) },
                ]}
              >
                {DAY_SHORT[idx]}
              </Text>
              <Text
                style={[
                  s.dayTabDate,
                  isSelected && s.dayTabTextSelected,
                  { fontSize: rs(10) },
                ]}
              >
                {formatShortDate(dayDate)}
              </Text>
              {hasSlots && (
                <View
                  style={[s.dayTabDot, isSelected && s.dayTabDotSelected]}
                />
              )}
              {isToday && (
                <Text style={[s.todayBadge, { fontSize: rs(8) }]}>Today</Text>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* ── TODAY'S CLASSES ── */}
      <View style={[s.sectionCard, { borderRadius: rs(18), padding: rs(14) }]}>
        <View
          style={[
            s.sectionHeader,
            { marginBottom: rs(12), paddingBottom: rs(10) },
          ]}
        >
          <View style={[s.sectionTitleWrap, { gap: rs(6) }]}>
            <Text style={{ fontSize: rs(16) }}>
              {selectedDay === currentDayAbbr ? "☀️" : "📅"}
            </Text>
            <Text style={[s.sectionTitle, { fontSize: rs(14) }]}>
              {selectedDay === currentDayAbbr
                ? "Today's Classes"
                : `${DAY_NAMES[DAYS.indexOf(selectedDay)]} Classes`}
            </Text>
          </View>
          <View
            style={[
              s.sectionBadge,
              {
                borderRadius: rs(20),
                paddingHorizontal: rs(10),
                paddingVertical: rs(4),
              },
            ]}
          >
            <Text style={[s.sectionBadgeText, { fontSize: rs(11) }]}>
              {todayDisplaySlots.length} classes
            </Text>
          </View>
        </View>
        {todayDisplaySlots.length === 0 ? (
          <EmptyDay
            day={DAYS.indexOf(selectedDay)}
            isToday={selectedDay === currentDayAbbr}
            rs={rs}
          />
        ) : (
          (() => {
            const isFullDayHoliday =
              todayDisplaySlots.length === 1 &&
              todayDisplaySlots[0].status === "HOLIDAY" &&
              todayDisplaySlots[0].startTime === "00:00" &&
              todayDisplaySlots[0].endTime === "23:59";
            if (isFullDayHoliday)
              return <HolidayCard slot={todayDisplaySlots[0]} rs={rs} />;
            return todayDisplaySlots.map((slot, idx) => (
              <SlotCard key={slot._id || idx} slot={slot} index={idx} rs={rs} />
            ));
          })()
        )}
      </View>

      {/* ── WEEKLY OVERVIEW ── */}
      <View
        style={[
          s.sectionCard,
          { marginBottom: rs(32), borderRadius: rs(18), padding: rs(14) },
        ]}
      >
        <View
          style={[
            s.sectionHeader,
            { marginBottom: rs(12), paddingBottom: rs(10) },
          ]}
        >
          <View style={[s.sectionTitleWrap, { gap: rs(6) }]}>
            <Text style={{ fontSize: rs(16) }}>📋</Text>
            <Text style={[s.sectionTitle, { fontSize: rs(14) }]}>
              Weekly Overview
            </Text>
          </View>
          <View
            style={[
              s.sectionBadge,
              {
                borderRadius: rs(20),
                paddingHorizontal: rs(10),
                paddingVertical: rs(4),
              },
            ]}
          >
            <Text style={[s.sectionBadgeText, { fontSize: rs(11) }]}>
              All days
            </Text>
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
              style={[
                s.weekRow,
                isToday && s.weekRowToday,
                { gap: rs(10), paddingVertical: rs(10) },
              ]}
              onPress={() => setSelectedDay(day)}
              activeOpacity={0.75}
            >
              <View
                style={[
                  s.weekRowDay,
                  isToday && s.weekRowDayToday,
                  {
                    width: rs(46),
                    borderRadius: rs(10),
                    paddingVertical: rs(8),
                  },
                ]}
              >
                <Text
                  style={[
                    s.weekRowDayName,
                    isToday && s.weekRowDayTextToday,
                    { fontSize: rs(12) },
                  ]}
                >
                  {DAY_SHORT[idx]}
                </Text>
                <Text
                  style={[
                    s.weekRowDayDate,
                    isToday && s.weekRowDayTextToday,
                    { fontSize: rs(9) },
                  ]}
                >
                  {formatShortDate(dayDate)}
                </Text>
              </View>
              <View style={[s.weekRowSlots, { gap: rs(4) }]}>
                {isFullHoliday ? (
                  <View
                    style={[
                      s.miniChip,
                      {
                        borderRadius: rs(8),
                        paddingHorizontal: rs(8),
                        paddingVertical: rs(5),
                        backgroundColor: C.warningLight,
                        borderColor: C.warning,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        s.miniChipText,
                        { fontSize: rs(11), color: "#b45309" },
                      ]}
                    >
                      🎉 Holiday
                    </Text>
                  </View>
                ) : slots.length === 0 ? (
                  <Text style={[s.weekRowEmpty, { fontSize: rs(12) }]}>
                    — No classes
                  </Text>
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
                            borderRadius: rs(8),
                            paddingHorizontal: rs(8),
                            paddingVertical: rs(5),
                            backgroundColor: colors.bg,
                            borderColor: colors.border,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            s.miniChipText,
                            { fontSize: rs(11), color: colors.text },
                          ]}
                          numberOfLines={1}
                        >
                          {formatTime12(slot.startTime)} ·{" "}
                          {slot.subject_id?.name}
                        </Text>
                        {exc && (
                          <Text
                            style={[
                              s.miniExcBadge,
                              { fontSize: rs(9), color: exc.color },
                            ]}
                          >
                            {exc.label}
                          </Text>
                        )}
                      </View>
                    );
                  })
                )}
                {slots.length > 3 && (
                  <Text style={[s.weekRowMore, { fontSize: rs(10) }]}>
                    +{slots.length - 3} more
                  </Text>
                )}
              </View>
              <Text style={[s.weekRowArrow, { fontSize: rs(18) }]}>›</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </>
  );

  return (
    // ✅ Root View with safe area insets — no more hardcoded marginTop
    <View
      style={[
        s.root,
        {
          paddingTop: insets.top,
          paddingLeft: insets.left,
          paddingRight: insets.right,
        },
      ]}
    >
      <ScrollView
        style={s.scroll}
        contentContainerStyle={[
          s.scrollContent,
          {
            paddingHorizontal: rs(14),
            paddingTop: rs(14), // ✅ Profile sarkha gap — card top la chipkat nahi
            paddingBottom: rs(32),
            gap: rs(12),
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
        {/* ── WELCOME CARD ── */}
        <View
          style={[
            s.welcomeCard,
            {
              borderRadius: rs(16),
              paddingHorizontal: rs(16),
              paddingTop: rs(14), // ✅ insets.top root View la aahe, card la fakt internal padding
              paddingBottom: rs(14),
              marginBottom: rs(2),
            },
          ]}
        >
          <View style={s.circleTop} />
          <View style={s.circleBottom} />

          <View style={[s.welcomeRow, { marginBottom: rs(12) }]}>
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
              My Timetable
            </Text>
            <View
              style={[
                s.timeChipCard,
                {
                  borderRadius: rs(10),
                  paddingHorizontal: rs(10),
                  paddingVertical: rs(6),
                },
              ]}
            >
              <Text style={[s.timeChipText, { fontSize: rs(13) }]}>
                {currentTime.toLocaleTimeString("en-US", {
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: true,
                })}
              </Text>
            </View>
          </View>

          {/* Week nav */}
          <View style={[s.weekNav, { borderRadius: rs(12) }]}>
            <TouchableOpacity
              style={[
                s.weekArrowBtn,
                { paddingHorizontal: rs(14), paddingVertical: rs(10) },
              ]}
              onPress={() => shiftWeek(-1)}
            >
              <Text style={[s.weekArrowText, { fontSize: rs(22) }]}>‹</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.weekCenter} onPress={goCurrentWeek}>
              <Text style={[s.weekRangeText, { fontSize: rs(12) }]}>
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
              <Text style={[s.weekHint, { fontSize: rs(10) }]}>
                Tap for current week
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                s.weekArrowBtn,
                { paddingHorizontal: rs(14), paddingVertical: rs(10) },
              ]}
              onPress={() => shiftWeek(1)}
            >
              <Text style={[s.weekArrowText, { fontSize: rs(22) }]}>›</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Outside Range Banner */}
        {isOutsideRange && (
          <View
            style={[
              s.rangeBanner,
              { borderRadius: rs(12), padding: rs(12), gap: rs(8) },
            ]}
          >
            <Text style={{ fontSize: rs(20) }}>⚠️</Text>
            <View style={{ flex: 1 }}>
              <Text style={[s.rangeBannerTitle, { fontSize: rs(13) }]}>
                No Timetable for This Week
              </Text>
              {activePeriod.startDate && activePeriod.endDate && (
                <Text style={[s.rangeBannerSub, { fontSize: rs(11) }]}>
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
            <TouchableOpacity
              style={[
                s.rangeBannerBtn,
                {
                  borderRadius: rs(8),
                  paddingHorizontal: rs(10),
                  paddingVertical: rs(6),
                },
              ]}
              onPress={goCurrentWeek}
            >
              <Text style={[s.rangeBannerBtnText, { fontSize: rs(11) }]}>
                Current Week
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {error && (
          <View
            style={[s.errorBanner, { borderRadius: rs(10), padding: rs(12) }]}
          >
            <Text style={[s.errorText, { fontSize: rs(13) }]}>⚠ {error}</Text>
            <TouchableOpacity onPress={() => loadTimetable(false)}>
              <Text style={[s.errorRetry, { fontSize: rs(13) }]}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        {navLoading && (
          <View style={[s.navLoading, { gap: rs(8), paddingVertical: rs(10) }]}>
            <ActivityIndicator size="small" color={C.primary} />
            <Text style={[s.navLoadingText, { fontSize: rs(13) }]}>
              Loading timetable...
            </Text>
          </View>
        )}

        {/* ✅ Landscape: day tabs + weekly side by side */}
        {isLandscape ? (
          <View style={{ flexDirection: "row", gap: rs(12) }}>
            {/* Left col: day selector */}
            <ScrollView
              style={{ width: rs(80) }}
              showsVerticalScrollIndicator={false}
            >
              <View style={{ gap: rs(6) }}>
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
                        {
                          borderRadius: rs(10),
                          paddingVertical: rs(10),
                          minWidth: 0,
                        },
                      ]}
                      onPress={() => setSelectedDay(day)}
                    >
                      <Text
                        style={[
                          s.dayTabName,
                          isSelected && s.dayTabTextSelected,
                          { fontSize: rs(11) },
                        ]}
                      >
                        {DAY_SHORT[idx]}
                      </Text>
                      <Text
                        style={[
                          s.dayTabDate,
                          isSelected && s.dayTabTextSelected,
                          { fontSize: rs(9) },
                        ]}
                      >
                        {formatShortDate(dayDate)}
                      </Text>
                      {hasSlots && (
                        <View
                          style={[
                            s.dayTabDot,
                            isSelected && s.dayTabDotSelected,
                          ]}
                        />
                      )}
                      {isToday && (
                        <Text style={[s.todayBadge, { fontSize: rs(7) }]}>
                          Today
                        </Text>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>
            {/* Right col: classes */}
            <View style={{ flex: 1 }}>
              <View
                style={[
                  s.sectionCard,
                  { borderRadius: rs(18), padding: rs(14) },
                ]}
              >
                <View
                  style={[
                    s.sectionHeader,
                    { marginBottom: rs(12), paddingBottom: rs(10) },
                  ]}
                >
                  <View style={[s.sectionTitleWrap, { gap: rs(6) }]}>
                    <Text style={{ fontSize: rs(15) }}>
                      {selectedDay === currentDayAbbr ? "☀️" : "📅"}
                    </Text>
                    <Text style={[s.sectionTitle, { fontSize: rs(13) }]}>
                      {selectedDay === currentDayAbbr
                        ? "Today's Classes"
                        : `${DAY_NAMES[DAYS.indexOf(selectedDay)]} Classes`}
                    </Text>
                  </View>
                  <View
                    style={[
                      s.sectionBadge,
                      {
                        borderRadius: rs(20),
                        paddingHorizontal: rs(10),
                        paddingVertical: rs(4),
                      },
                    ]}
                  >
                    <Text style={[s.sectionBadgeText, { fontSize: rs(10) }]}>
                      {todayDisplaySlots.length} classes
                    </Text>
                  </View>
                </View>
                {todayDisplaySlots.length === 0 ? (
                  <EmptyDay
                    day={DAYS.indexOf(selectedDay)}
                    isToday={selectedDay === currentDayAbbr}
                    rs={rs}
                  />
                ) : (
                  todayDisplaySlots.map((slot, idx) => (
                    <SlotCard
                      key={slot._id || idx}
                      slot={slot}
                      index={idx}
                      rs={rs}
                    />
                  ))
                )}
              </View>
            </View>
          </View>
        ) : (
          mainContent
        )}

        {/* Portrait: show full mainContent */}
        {!isLandscape && null /* already rendered above as mainContent */}
      </ScrollView>
    </View>
  );
}

// ─── SUB-COMPONENTS ──────────────────────────────────────────────────────────

function EmptyDay({ day, isToday, rs }) {
  return (
    <View style={{ alignItems: "center", paddingVertical: rs(32) }}>
      <Text style={{ fontSize: rs(44), marginBottom: rs(10) }}>
        {isToday ? "☀️" : "📅"}
      </Text>
      <Text
        style={{
          fontSize: rs(16),
          fontWeight: "700",
          color: C.textPrimary,
          marginBottom: rs(4),
        }}
      >
        {isToday ? "No Classes Today" : "No Classes"}
      </Text>
      <Text
        style={{
          fontSize: rs(13),
          color: C.textSecondary,
          textAlign: "center",
        }}
      >
        {isToday
          ? "Enjoy your free day!"
          : `${DAY_NAMES[day]} is free this week.`}
      </Text>
    </View>
  );
}

function HolidayCard({ slot, rs }) {
  const reason = slot.exception?.reason || slot.subject_id?.name || "Holiday";
  return (
    <View
      style={{
        backgroundColor: C.warningLight,
        borderRadius: rs(14),
        borderWidth: 1.5,
        borderColor: C.warning,
        padding: rs(16),
        margin: rs(4),
      }}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: rs(12),
          marginBottom: rs(12),
        }}
      >
        <View
          style={{
            width: rs(52),
            height: rs(52),
            borderRadius: rs(26),
            backgroundColor: C.warning,
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <Text style={{ fontSize: rs(26) }}>🎉</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text
            style={{
              fontSize: rs(17),
              fontWeight: "700",
              color: "#92400e",
              marginBottom: rs(2),
            }}
          >
            Full Day Holiday
          </Text>
          <Text
            style={{ fontSize: rs(13), color: "#b45309", fontWeight: "500" }}
          >
            {reason}
          </Text>
        </View>
      </View>
      <View
        style={{
          backgroundColor: "rgba(255,255,255,0.5)",
          borderRadius: rs(8),
          padding: rs(12),
          borderLeftWidth: 4,
          borderLeftColor: C.warning,
        }}
      >
        <Text
          style={{ fontSize: rs(13), color: "#78350f", lineHeight: rs(20) }}
        >
          🌟 Enjoy your holiday! No classes today.
        </Text>
      </View>
    </View>
  );
}

function SlotCard({ slot, index, rs }) {
  const colors = getSlotColors(slot);
  const exc = getExceptionLabel(slot);
  const isCancelled =
    slot.status === "CANCELLED" || slot.exception?.type === "CANCELLED";
  return (
    <View
      style={{
        borderLeftWidth: 4,
        borderLeftColor: colors.text,
        backgroundColor: "#f8fafc",
        borderRadius: rs(14),
        padding: rs(14),
        marginBottom: rs(10),
        opacity: isCancelled ? 0.75 : 1,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
        elevation: 1,
      }}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "flex-start",
          justifyContent: "space-between",
          marginBottom: rs(8),
          flexWrap: "wrap",
          gap: rs(6),
        }}
      >
        <View
          style={{
            backgroundColor: "#e3f2fd",
            borderRadius: rs(8),
            paddingHorizontal: rs(10),
            paddingVertical: rs(5),
          }}
        >
          <Text
            style={{ fontSize: rs(12), fontWeight: "600", color: C.primary }}
          >
            🕐 {formatTime12(slot.startTime)} – {formatTime12(slot.endTime)}
          </Text>
        </View>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: rs(4) }}>
          <View
            style={{
              borderRadius: rs(6),
              paddingHorizontal: rs(8),
              paddingVertical: rs(3),
              backgroundColor: colors.bg,
            }}
          >
            <Text
              style={{
                fontSize: rs(10),
                fontWeight: "700",
                textTransform: "uppercase",
                color: colors.text,
              }}
            >
              {slot.slotType || "LECTURE"}
            </Text>
          </View>
          {exc && (
            <View
              style={{
                borderRadius: rs(6),
                paddingHorizontal: rs(7),
                paddingVertical: rs(3),
                borderWidth: 1,
                backgroundColor: exc.color + "18",
                borderColor: exc.color + "44",
              }}
            >
              <Text
                style={{
                  fontSize: rs(10),
                  fontWeight: "700",
                  color: exc.color,
                }}
              >
                {exc.label}
              </Text>
            </View>
          )}
        </View>
      </View>
      <Text
        style={{
          fontSize: rs(15),
          fontWeight: "700",
          color: C.textPrimary,
          marginBottom: rs(8),
          textDecorationLine: isCancelled ? "line-through" : "none",
          opacity: isCancelled ? 0.6 : 1,
        }}
      >
        {slot.subject_id?.name}
      </Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: rs(12) }}>
        {slot.teacher_id?.name && (
          <Text style={{ fontSize: rs(12), color: C.textSecondary }}>
            👨‍🏫 {slot.teacher_id.name}
          </Text>
        )}
        {slot.room && (
          <Text style={{ fontSize: rs(12), color: C.textSecondary }}>
            📍 Room {slot.room}
          </Text>
        )}
      </View>
      {slot.exception?.reason && (
        <View
          style={{
            borderLeftWidth: 3,
            borderLeftColor: exc?.color || C.info,
            borderRadius: rs(6),
            padding: rs(8),
            marginTop: rs(8),
            backgroundColor: (exc?.color || C.info) + "12",
          }}
        >
          <Text
            style={{
              fontSize: rs(12),
              lineHeight: rs(18),
              color: exc?.color || C.info,
            }}
          >
            ℹ️ {slot.exception.reason}
            {slot.exception.rescheduledTo &&
              ` → ${new Date(slot.exception.rescheduledTo).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`}
          </Text>
        </View>
      )}
    </View>
  );
}

// ─── STYLES ──────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: C.bg,
  },
  loadingText: { marginTop: 12, color: C.textSecondary, fontWeight: "500" },
  scroll: { flex: 1 },
  scrollContent: { flexGrow: 1 },

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
  timeChipCard: { backgroundColor: "rgba(255,255,255,0.15)" },
  timeChipText: { color: C.white, fontWeight: "600" },
  weekNav: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.1)",
    overflow: "hidden",
  },
  weekArrowBtn: {},
  weekArrowText: { color: C.white, fontWeight: "700" },
  weekCenter: { flex: 1, alignItems: "center", paddingVertical: 8 },
  weekRangeText: { color: C.white, fontWeight: "600", textAlign: "center" },
  weekHint: { color: "rgba(255,255,255,0.6)", marginTop: 2 },

  rangeBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.warningLight,
    borderWidth: 1,
    borderColor: C.warning,
  },
  rangeBannerTitle: { fontWeight: "700", color: "#92400e" },
  rangeBannerSub: { color: "#b45309", marginTop: 2 },
  rangeBannerBtn: { backgroundColor: C.warning },
  rangeBannerBtnText: { color: C.white, fontWeight: "700" },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.dangerLight,
    borderWidth: 1,
    borderColor: "#fecaca",
  },
  errorText: { flex: 1, color: C.danger },
  errorRetry: { color: C.danger, fontWeight: "700", marginLeft: 8 },
  navLoading: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  navLoadingText: { color: C.textSecondary },

  dayTab: {
    alignItems: "center",
    backgroundColor: C.white,
    borderWidth: 1.5,
    borderColor: C.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  dayTabSelected: { backgroundColor: C.primary, borderColor: C.primary },
  dayTabToday: { borderColor: C.accent, borderWidth: 2 },
  dayTabName: { fontWeight: "700", color: C.textSecondary },
  dayTabDate: { color: C.textMuted, marginTop: 1 },
  dayTabTextSelected: { color: C.white },
  dayTabDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: C.accent,
    marginTop: 3,
  },
  dayTabDotSelected: { backgroundColor: C.white },
  todayBadge: { color: C.accent, fontWeight: "700", marginTop: 1 },

  sectionCard: {
    backgroundColor: C.white,
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
    borderBottomWidth: 1,
    borderBottomColor: C.borderLight,
  },
  sectionTitleWrap: { flexDirection: "row", alignItems: "center" },
  sectionTitle: { fontWeight: "700", color: C.primary },
  sectionBadge: { backgroundColor: C.accentLight },
  sectionBadgeText: { color: C.primary, fontWeight: "600" },

  weekRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    borderBottomWidth: 1,
    borderBottomColor: C.borderLight,
  },
  weekRowToday: {
    backgroundColor: C.accentLight,
    borderRadius: 12,
    paddingHorizontal: 8,
    marginHorizontal: -4,
  },
  weekRowDay: { alignItems: "center", backgroundColor: "#f8fafc" },
  weekRowDayToday: { backgroundColor: C.primary },
  weekRowDayName: { fontWeight: "700", color: C.textSecondary },
  weekRowDayDate: { color: C.textMuted, marginTop: 1 },
  weekRowDayTextToday: { color: C.white },
  weekRowSlots: { flex: 1 },
  weekRowEmpty: { color: C.textMuted, fontStyle: "italic", paddingVertical: 4 },
  weekRowMore: { color: C.primary, fontWeight: "600", marginTop: 2 },
  weekRowArrow: { color: C.textMuted, alignSelf: "center" },
  miniChip: {
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
  },
  miniChipText: { fontWeight: "500", flex: 1 },
  miniExcBadge: { fontWeight: "700" },
});
