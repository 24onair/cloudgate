"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  X,
  Check,
  Info,
  CalendarDays,
  Users,
} from "lucide-react";
import {
  useSchedules,
  useScheduleNotes,
  updatePilotSchedule,
  updatePilotNote,
  PILOTS_META,
  SCHEDULE_CFG,
  type ScheduleStatus,
} from "@/lib/scheduleStore";

// ── 상수 ─────────────────────────────────────────────────────────
const MY_PILOT_ID = "p1";
const TODAY = "2026-05-03";
const DAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];
const MY_OPTIONS: ScheduleStatus[] = ["working", "off", "etc"];

// ── 달력 헬퍼 ────────────────────────────────────────────────────
function daysInMonth(y: number, m: number) {
  return new Date(y, m, 0).getDate();
}
function startDOW(y: number, m: number) {
  return new Date(y, m - 1, 1).getDay();
}
function monthDates(y: number, m: number) {
  return Array.from({ length: daysInMonth(y, m) }, (_, i) => {
    const d = String(i + 1).padStart(2, "0");
    return `${y}-${String(m).padStart(2, "0")}-${d}`;
  });
}

type ViewMode = "my" | "team";

export default function PilotSchedulePage() {
  const router = useRouter();
  const schedules = useSchedules();
  const allNotes = useScheduleNotes();
  const mySchedule = schedules[MY_PILOT_ID] ?? {};
  const myNotes = allNotes[MY_PILOT_ID] ?? {};

  const [view, setView] = useState<ViewMode>("my");
  const [viewYear, setViewYear] = useState(2026);
  const [viewMonth, setViewMonth] = useState(5);
  const [pickerDate, setPickerDate] = useState<string | null>(null);
  const [pendingStatus, setPendingStatus] = useState<ScheduleStatus>("off");
  const [pendingNote, setPendingNote] = useState<string>("");
  const [savedDates, setSavedDates] = useState<Set<string>>(new Set());

  const allDates = monthDates(viewYear, viewMonth);
  const startDow = startDOW(viewYear, viewMonth);

  function goMonth(delta: number) {
    let m = viewMonth + delta;
    let y = viewYear;
    if (m > 12) { m = 1; y++; }
    if (m < 1)  { m = 12; y--; }
    setViewMonth(m);
    setViewYear(y);
  }

  const viewMonthKey = `${viewYear}-${String(viewMonth).padStart(2, "0")}`;
  const viewMonthSchedule = Object.fromEntries(
    Object.entries(mySchedule).filter(([k]) => k.startsWith(viewMonthKey))
  );
  const offCount  = Object.values(viewMonthSchedule).filter((v) => v === "off").length;
  const etcCount  = Object.values(viewMonthSchedule).filter((v) => v === "etc").length;
  const workCount = Object.values(viewMonthSchedule).filter((v) => v === "working").length;

  function openPicker(date: string) {
    if (date <= TODAY) return;
    setPickerDate(date);
    setPendingStatus((mySchedule[date] as ScheduleStatus) ?? "working");
    setPendingNote(myNotes[date] ?? "");
  }

  function confirmChange() {
    if (!pickerDate || !pendingStatus) return;
    updatePilotSchedule(MY_PILOT_ID, pickerDate, pendingStatus);
    updatePilotNote(MY_PILOT_ID, pickerDate, pendingStatus === "etc" ? pendingNote : "");
    setSavedDates((prev) => new Set(prev).add(pickerDate));
    setPickerDate(null);
  }

  // ── 내 스케줄 달력 ──────────────────────────────────────────────
  const MyCalendar = () => (
    <div className="rounded-2xl p-4 border" style={{ backgroundColor: "#fdfdf8", borderColor: "#bfc1b7" }}>
      <div className="grid grid-cols-7 mb-2">
        {DAY_LABELS.map((d, i) => (
          <div
            key={d}
            className="text-center text-xs font-medium py-1"
            style={{ color: i === 0 ? "#EF4444" : i === 6 ? "#4d4f46" : "#9ea096" }}
          >
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-0.5">
        {Array.from({ length: startDow }).map((_, i) => (
          <div key={`e${i}`} />
        ))}
        {allDates.map((date, idx) => {
          const day = idx + 1;
          const dow = (startDow + idx) % 7;
          const status = mySchedule[date] as ScheduleStatus | undefined;
          const cfg = status ? SCHEDULE_CFG[status] : null;
          const isPast   = date < TODAY;
          const isToday  = date === TODAY;
          const isFuture = date > TODAY;
          const wasJustSaved = savedDates.has(date);

          return (
            <button
              key={date}
              onClick={() => isFuture && openPicker(date)}
              disabled={!isFuture}
              className="flex flex-col items-center rounded-xl py-1.5 transition-all relative"
              style={{
                backgroundColor: cfg ? cfg.bg : "transparent",
                border: isToday
                  ? `1.5px solid ${cfg?.color ?? "#23251d"}`
                  : pickerDate === date
                  ? `1.5px solid #23251d`
                  : "1.5px solid transparent",
                opacity: isPast ? 0.3 : 1,
                cursor: isFuture ? "pointer" : "default",
              }}
            >
              <span
                className="text-xs"
                style={{
                  color:
                    dow === 0 ? "#EF4444"
                    : dow === 6 ? "#4d4f46"
                    : isToday ? (cfg?.color ?? "#23251d")
                    : "#374151",
                  fontWeight: isToday ? 700 : 400,
                  fontSize: 11,
                }}
              >
                {day}
              </span>
              {status && (
                <span
                  style={{
                    color: cfg!.color,
                    fontSize: 8,
                    lineHeight: 1.2,
                    marginTop: 1,
                    fontWeight: 500,
                    maxWidth: 32,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    textAlign: "center",
                  }}
                  title={status === "etc" && myNotes[date] ? myNotes[date] : undefined}
                >
                  {status === "etc" && myNotes[date]
                    ? myNotes[date].slice(0, 4)
                    : SCHEDULE_CFG[status].label}
                </span>
              )}
              {wasJustSaved && isFuture && (
                <span
                  className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: "#10B981" }}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* 범례 */}
      <div className="flex flex-wrap gap-3 mt-4 pt-3 border-t" style={{ borderColor: "#e5e7e0" }}>
        {(["working", "standby", "off", "etc"] as ScheduleStatus[]).map((s) => {
          const cfg = SCHEDULE_CFG[s];
          const count = Object.values(viewMonthSchedule).filter((v) => v === s).length;
          return (
            <span key={s} className="flex items-center gap-1 text-xs" style={{ color: "#65675e" }}>
              <span
                className="w-2.5 h-2.5 rounded-sm"
                style={{ background: cfg.bg, border: `1px solid ${cfg.color}` }}
              />
              {cfg.label}
              {count > 0 && <span style={{ color: "#9ea096" }}>{count}일</span>}
            </span>
          );
        })}
      </div>

      {/* 신청 안내 */}
      <div
        className="mt-3 rounded-xl px-3 py-2.5 text-xs flex items-start gap-2"
        style={{ backgroundColor: "#eeefe9", color: "#65675e" }}
      >
        <Info className="w-3 h-3 mt-0.5 flex-shrink-0" style={{ color: "#9ea096" }} />
        <span>
          오늘 이후 날짜를 터치하면 스케줄을 변경할 수 있습니다. 대기(초록)는 관리자가 설정합니다.
          변경 사항은 파일럿장에 즉시 반영됩니다.
        </span>
      </div>
    </div>
  );

  // ── 팀 전체 달력 ────────────────────────────────────────────────
  const TeamCalendar = () => (
    <div className="space-y-4">
      <div className="rounded-2xl p-4 border" style={{ backgroundColor: "#fdfdf8", borderColor: "#bfc1b7" }}>
        {/* 파일럿 색상 범례 */}
        <div className="flex flex-wrap gap-2 mb-4 pb-3 border-b" style={{ borderColor: "#e5e7e0" }}>
          {PILOTS_META.map((p) => (
            <span key={p.id} className="flex items-center gap-1.5 text-xs" style={{ color: "#4d4f46" }}>
              <span
                className="w-4 h-4 rounded flex items-center justify-center text-white font-bold"
                style={{ backgroundColor: p.avatarColor, fontSize: 9 }}
              >
                {p.initials}
              </span>
              {p.name}
            </span>
          ))}
        </div>

        <div className="grid grid-cols-7 mb-2">
          {DAY_LABELS.map((d, i) => (
            <div
              key={d}
              className="text-center text-xs font-medium py-1"
              style={{ color: i === 0 ? "#EF4444" : i === 6 ? "#4d4f46" : "#9ea096" }}
            >
              {d}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-0.5">
          {Array.from({ length: startDow }).map((_, i) => (
            <div key={`te${i}`} />
          ))}
          {allDates.map((date, idx) => {
            const day = idx + 1;
            const dow = (startDow + idx) % 7;
            const isToday = date === TODAY;

            return (
              <div
                key={date}
                className="flex flex-col items-center rounded-xl py-1 px-0.5"
                style={{ backgroundColor: isToday ? "#eeefe9" : "transparent" }}
              >
                <span
                  className="mb-1"
                  style={{
                    color:
                      dow === 0 ? "#EF4444"
                      : dow === 6 ? "#4d4f46"
                      : isToday ? "#23251d"
                      : "#65675e",
                    fontWeight: isToday ? 700 : 400,
                    fontSize: 10,
                  }}
                >
                  {day}
                </span>
                <div className="grid grid-cols-2 gap-0.5">
                  {PILOTS_META.map((pilot) => {
                    const ps = (schedules[pilot.id] ?? {})[date] as ScheduleStatus | undefined;
                    return (
                      <div
                        key={pilot.id}
                        className="w-2.5 h-2.5 rounded-sm"
                        style={{
                          backgroundColor: ps ? SCHEDULE_CFG[ps].bg : "#e5e7e0",
                          border: ps ? `1px solid ${SCHEDULE_CFG[ps].color}60` : "1px solid #bfc1b7",
                        }}
                        title={`${pilot.name}: ${ps ? SCHEDULE_CFG[ps].label : "미정"}`}
                      />
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 파일럿별 이번 달 요약 */}
      <div className="rounded-2xl p-4 border" style={{ backgroundColor: "#fdfdf8", borderColor: "#bfc1b7" }}>
        <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: "#9ea096" }}>
          파일럿별 {viewMonth}월 현황
        </p>
        <div className="space-y-3">
          {PILOTS_META.map((pilot) => {
            const ps = schedules[pilot.id] ?? {};
            const monthEntries = Object.fromEntries(
              Object.entries(ps).filter(([k]) => k.startsWith(viewMonthKey))
            );
            const workDays = Object.values(monthEntries).filter((v) => v === "working" || v === "standby").length;
            const offDays  = Object.values(monthEntries).filter((v) => v === "off").length;
            const etcDays  = Object.values(monthEntries).filter((v) => v === "etc").length;
            const total = workDays + offDays + etcDays;
            const workPct = total > 0 ? Math.round((workDays / total) * 100) : 0;

            return (
              <div key={pilot.id}>
                <div className="flex items-center gap-2 mb-1">
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                    style={{ backgroundColor: pilot.avatarColor }}
                  >
                    {pilot.initials}
                  </div>
                  <span className="text-sm font-medium flex-1" style={{ color: "#23251d" }}>{pilot.name}</span>
                  <div className="flex items-center gap-2 text-xs" style={{ color: "#9ea096" }}>
                    <span className="flex items-center gap-0.5">
                      <span className="w-2 h-2 rounded-sm" style={{ backgroundColor: SCHEDULE_CFG.working.bg, border: `1px solid ${SCHEDULE_CFG.working.color}` }} />
                      출근 {workDays}
                    </span>
                    <span className="flex items-center gap-0.5">
                      <span className="w-2 h-2 rounded-sm" style={{ backgroundColor: SCHEDULE_CFG.off.bg, border: `1px solid ${SCHEDULE_CFG.off.color}` }} />
                      휴무 {offDays}
                    </span>
                    {etcDays > 0 && (
                      <span className="flex items-center gap-0.5">
                        <span className="w-2 h-2 rounded-sm" style={{ backgroundColor: SCHEDULE_CFG.etc.bg, border: `1px solid ${SCHEDULE_CFG.etc.color}` }} />
                        기타 {etcDays}
                      </span>
                    )}
                  </div>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: "#e5e7e0" }}>
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${workPct}%`, backgroundColor: pilot.avatarColor }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 상태 범례 */}
      <div className="flex flex-wrap gap-3 px-1">
        {(["working", "standby", "off", "etc"] as ScheduleStatus[]).map((s) => {
          const cfg = SCHEDULE_CFG[s];
          return (
            <span key={s} className="flex items-center gap-1.5 text-xs" style={{ color: "#65675e" }}>
              <span className="w-3 h-3 rounded-sm" style={{ background: cfg.bg, border: `1px solid ${cfg.color}` }} />
              {cfg.label}
            </span>
          );
        })}
      </div>
    </div>
  );

  // ── Render ──────────────────────────────────────────────────────
  return (
    <div className="max-w-md mx-auto min-h-screen" style={{ backgroundColor: "#eeefe9" }}>
      {/* 헤더 */}
      <div className="px-4 pt-10 pb-5" style={{ backgroundColor: "#23251d" }}>
        <div className="flex items-center gap-3 mb-5">
          <button
            onClick={() => router.push("/pilot")}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
            style={{ backgroundColor: "rgba(255,255,255,0.12)" }}
          >
            <ChevronLeft className="w-4 h-4 text-white" />
          </button>
          <h1 className="text-white font-bold text-lg flex-1">스케줄 관리</h1>

          <div className="flex items-center gap-1">
            <button
              onClick={() => goMonth(-1)}
              className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
              style={{ backgroundColor: "rgba(255,255,255,0.12)" }}
            >
              <ChevronLeft className="w-3.5 h-3.5 text-white" />
            </button>
            <span className="text-white/80 text-sm whitespace-nowrap text-center">
              {viewYear}년 {viewMonth}월
            </span>
            <button
              onClick={() => goMonth(1)}
              className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
              style={{ backgroundColor: "rgba(255,255,255,0.12)" }}
            >
              <ChevronRight className="w-3.5 h-3.5 text-white" />
            </button>
          </div>
        </div>

        {/* 내 현황 요약 칩 */}
        <div className="flex gap-2">
          {[
            { label: "출근", value: workCount, color: "#e5e7e0" },
            { label: "휴무", value: offCount,  color: "#e5e7e0" },
            { label: "기타", value: etcCount,  color: "#e5e7e0" },
          ].map((s) => (
            <div
              key={s.label}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium text-white"
              style={{ backgroundColor: "rgba(255,255,255,0.1)" }}
            >
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
              {s.label} {s.value}일
            </div>
          ))}
        </div>
      </div>

      {/* 뷰 전환 탭 */}
      <div className="flex border-b sticky top-0 z-10" style={{ backgroundColor: "#fdfdf8", borderColor: "#bfc1b7" }}>
        {[
          { key: "my",   label: "내 스케줄",    icon: <CalendarDays className="w-4 h-4" /> },
          { key: "team", label: "팀 전체 달력", icon: <Users className="w-4 h-4" /> },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setView(t.key as ViewMode)}
            className="flex-1 flex flex-col items-center gap-1 py-3 text-xs font-medium transition-colors"
            style={
              view === t.key
                ? { color: "#23251d", borderBottom: "2px solid #23251d" }
                : { color: "#9ea096" }
            }
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {/* 컨텐츠 */}
      <div className="px-4 py-5">
        {view === "my"   && <MyCalendar />}
        {view === "team" && <TeamCalendar />}
      </div>

      {/* 상태 선택 바텀시트 */}
      {pickerDate && (
        <>
          <div
            className="fixed inset-0 bg-black/40 z-40"
            onClick={() => setPickerDate(null)}
          />
          <div
            className="fixed bottom-0 left-0 right-0 rounded-t-2xl z-50 p-5"
            style={{ backgroundColor: "#fdfdf8", maxWidth: 448, margin: "0 auto" }}
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="font-bold" style={{ color: "#23251d" }}>
                  {pickerDate.slice(5, 7)}월 {pickerDate.slice(8)}일 스케줄 등록
                </p>
                <p className="text-xs mt-0.5" style={{ color: "#9ea096" }}>변경 후 저장을 눌러주세요</p>
              </div>
              <button
                onClick={() => setPickerDate(null)}
                className="p-1.5 rounded-lg transition-colors"
                style={{ backgroundColor: "#e5e7e0" }}
              >
                <X className="w-4 h-4" style={{ color: "#65675e" }} />
              </button>
            </div>

            <div className="space-y-2 mb-4">
              {MY_OPTIONS.map((s) => {
                const cfg = SCHEDULE_CFG[s];
                const isSelected = pendingStatus === s;
                return (
                  <div key={s}>
                    <button
                      onClick={() => setPendingStatus(s)}
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all text-left"
                      style={{
                        borderColor: isSelected ? cfg.color : "#bfc1b7",
                        backgroundColor: isSelected ? cfg.bg : "#fdfdf8",
                      }}
                    >
                      <span
                        className="w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center"
                        style={{
                          borderColor: isSelected ? cfg.color : "#bfc1b7",
                          backgroundColor: isSelected ? cfg.color : "#fdfdf8",
                        }}
                      >
                        {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </span>
                      <span
                        className="font-medium text-sm flex-1"
                        style={{ color: isSelected ? cfg.color : "#4d4f46" }}
                      >
                        {cfg.label}
                      </span>
                      {isSelected && (
                        <Check className="w-4 h-4" style={{ color: cfg.color }} />
                      )}
                    </button>
                    {s === "etc" && isSelected && (
                      <div className="mt-1.5 px-1">
                        <input
                          value={pendingNote}
                          onChange={(e) => setPendingNote(e.target.value)}
                          placeholder="사유를 입력하세요 (예: 병원, 가족행사…)"
                          maxLength={30}
                          className="w-full border rounded-xl px-3 py-2.5 text-sm outline-none"
                          style={{ color: "#4d4f46", backgroundColor: "#eeefe9", borderColor: "#bfc1b7" }}
                        />
                        <p className="text-right text-xs mt-1" style={{ color: "#bfc1b7" }}>{pendingNote.length}/30</p>
                      </div>
                    )}
                  </div>
                );
              })}
              {/* 대기: 비활성 안내 */}
              <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-dashed opacity-50" style={{ borderColor: "#bfc1b7" }}>
                <span
                  className="w-3.5 h-3.5 rounded-full border-2"
                  style={{ borderColor: SCHEDULE_CFG.standby.color }}
                />
                <span className="text-sm" style={{ color: "#9ea096" }}>
                  대기 — 관리자만 설정 가능
                </span>
              </div>
            </div>

            <button
              onClick={confirmChange}
              className="w-full py-3.5 rounded-xl font-bold text-white text-sm transition-all active:scale-95"
              style={{ backgroundColor: "#1e1f23" }}
            >
              저장
            </button>
          </div>
        </>
      )}
    </div>
  );
}
