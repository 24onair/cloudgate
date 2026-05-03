"use client";

import { useState, useMemo } from "react";
import { useSchedules, useScheduleNotes, updatePilotSchedule, updatePilotNote, type AllSchedules } from "@/lib/scheduleStore";
import {
  Plus,
  X,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Clock,
  Phone,
  Mail,
  Calendar,
  Award,
  Plane,
  ChevronLeft,
  ChevronRight,
  Edit3,
  User,
  TrendingUp,
  Coffee,
  Home,
  Ban,
} from "lucide-react";

// ── 타입 ────────────────────────────────────────────────────────
type ScheduleStatus = "working" | "standby" | "off" | "etc";
type LicenseStatus = "valid" | "expiring_soon" | "expiring_critical" | "expired";

interface License {
  id: string;
  name: string;
  number: string;
  issuedBy: string;
  expiresAt: string; // YYYY-MM-DD
  status: LicenseStatus;
  daysLeft: number;
}

interface MonthSchedule {
  [date: string]: ScheduleStatus; // "2026-05-DD" → status
}

interface Pilot {
  id: string;
  name: string;
  initials: string;
  avatarColor: string;
  phone: string;
  email: string;
  joinDate: string;
  todayStatus: ScheduleStatus;
  licenses: License[];
  flightsTotal: number;
  flightsThisMonth: number;
  flightsToday: number;
  maxFlightsPerDay: number;
  schedule: MonthSchedule;
  memo: string;
}

// ── 목업 데이터 ─────────────────────────────────────────────────
const PILOTS: Pilot[] = [
  {
    id: "p1",
    name: "박구름",
    initials: "박",
    avatarColor: "#2A7AE2",
    phone: "010-1234-5678",
    email: "park@gureum.co.kr",
    joinDate: "2022-03-15",
    todayStatus: "working",
    flightsTotal: 1284,
    flightsThisMonth: 52,
    flightsToday: 4,
    maxFlightsPerDay: 6,
    memo: "시니어 파일럿. VIP 담당 우선.",
    licenses: [
      { id: "l1", name: "패러글라이딩 조종면허", number: "PG-2019-0341", issuedBy: "한국활공협회", expiresAt: "2026-09-30", status: "valid", daysLeft: 152 },
      { id: "l2", name: "민간항공조종사 자격증", number: "CA-2021-1102", issuedBy: "국토교통부", expiresAt: "2026-05-22", status: "expiring_critical", daysLeft: 21 },
      { id: "l3", name: "비행안전 교관 자격", number: "IS-2023-0088", issuedBy: "한국항공안전협회", expiresAt: "2027-03-01", status: "valid", daysLeft: 304 },
    ],
    schedule: {
      "2026-05-01": "working", "2026-05-02": "working", "2026-05-03": "off",
      "2026-05-04": "working", "2026-05-05": "working", "2026-05-06": "working",
      "2026-05-07": "working", "2026-05-08": "standby", "2026-05-09": "working",
      "2026-05-10": "off", "2026-05-11": "working", "2026-05-12": "working",
    },
  },
  {
    id: "p2",
    name: "김하늘",
    initials: "김",
    avatarColor: "#10B981",
    phone: "010-2345-6789",
    email: "kim@gureum.co.kr",
    joinDate: "2023-06-01",
    todayStatus: "working",
    flightsTotal: 628,
    flightsThisMonth: 38,
    flightsToday: 2,
    maxFlightsPerDay: 5,
    memo: "주말 체험비행 전담. SNS 홍보 담당.",
    licenses: [
      { id: "l4", name: "패러글라이딩 조종면허", number: "PG-2021-0812", issuedBy: "한국활공협회", expiresAt: "2026-05-08", status: "expiring_critical", daysLeft: 7 },
      { id: "l5", name: "레저스포츠 지도자", number: "LS-2022-0459", issuedBy: "문화체육관광부", expiresAt: "2026-06-15", status: "expiring_soon", daysLeft: 45 },
    ],
    schedule: {
      "2026-05-01": "working", "2026-05-02": "standby", "2026-05-03": "off",
      "2026-05-04": "working", "2026-05-05": "working", "2026-05-06": "etc",
      "2026-05-07": "etc", "2026-05-08": "working", "2026-05-09": "working",
      "2026-05-10": "off", "2026-05-11": "standby", "2026-05-12": "working",
    },
  },
  {
    id: "p3",
    name: "이바람",
    initials: "이",
    avatarColor: "#FF8A00",
    phone: "010-3456-7890",
    email: "lee@gureum.co.kr",
    joinDate: "2024-01-10",
    todayStatus: "standby",
    flightsTotal: 312,
    flightsThisMonth: 24,
    flightsToday: 0,
    maxFlightsPerDay: 4,
    memo: "신규 파일럿. 교육비행 진행 중.",
    licenses: [
      { id: "l6", name: "패러글라이딩 조종면허", number: "PG-2023-1241", issuedBy: "한국활공협회", expiresAt: "2027-01-20", status: "valid", daysLeft: 264 },
    ],
    schedule: {
      "2026-05-01": "standby", "2026-05-02": "working", "2026-05-03": "off",
      "2026-05-04": "standby", "2026-05-05": "working", "2026-05-06": "working",
      "2026-05-07": "working", "2026-05-08": "off", "2026-05-09": "standby",
      "2026-05-10": "off", "2026-05-11": "working", "2026-05-12": "working",
    },
  },
  {
    id: "p4",
    name: "최하람",
    initials: "최",
    avatarColor: "#8B5CF6",
    phone: "010-4567-8901",
    email: "choi@gureum.co.kr",
    joinDate: "2021-09-20",
    todayStatus: "etc",
    flightsTotal: 1891,
    flightsThisMonth: 0,
    flightsToday: 0,
    maxFlightsPerDay: 6,
    memo: "시즌 휴가 중 (5/1~5/15). 복직 후 VIP 배정 예정.",
    licenses: [
      { id: "l7", name: "패러글라이딩 조종면허", number: "PG-2017-0122", issuedBy: "한국활공협회", expiresAt: "2026-05-03", status: "expiring_critical", daysLeft: 2 },
      { id: "l8", name: "민간항공조종사 자격증", number: "CA-2019-0573", issuedBy: "국토교통부", expiresAt: "2027-08-10", status: "valid", daysLeft: 466 },
      { id: "l9", name: "비행안전 교관 자격", number: "IS-2020-0211", issuedBy: "한국항공안전협회", expiresAt: "2026-06-30", status: "expiring_soon", daysLeft: 60 },
    ],
    schedule: {
      "2026-05-01": "etc", "2026-05-02": "etc", "2026-05-03": "etc",
      "2026-05-04": "etc", "2026-05-05": "etc", "2026-05-06": "etc",
      "2026-05-07": "etc", "2026-05-08": "etc", "2026-05-09": "etc",
      "2026-05-10": "etc", "2026-05-11": "etc", "2026-05-12": "etc",
    },
  },
];

// ── 상수 ────────────────────────────────────────────────────────
const SCHEDULE_CFG: Record<ScheduleStatus, { label: string; color: string; bg: string; icon: typeof Clock }> = {
  working: { label: "출근", color: "#2A7AE2", bg: "#EFF6FF", icon: Plane },
  standby: { label: "대기", color: "#10B981", bg: "#ECFDF5", icon: Clock },
  off: { label: "휴무", color: "#6B7280", bg: "#F3F4F6", icon: Coffee },
  etc:   { label: "기타", color: "#8B5CF6", bg: "#F5F3FF", icon: Home },
};

const LICENSE_CFG: Record<LicenseStatus, { label: string; color: string; bg: string; icon: typeof CheckCircle2 }> = {
  valid: { label: "유효", color: "#10B981", bg: "#ECFDF5", icon: CheckCircle2 },
  expiring_soon: { label: "만료예정", color: "#F59E0B", bg: "#FFFBEB", icon: AlertTriangle },
  expiring_critical: { label: "긴급만료", color: "#EF4444", bg: "#FEF2F2", icon: AlertCircle },
  expired: { label: "만료됨", color: "#6B7280", bg: "#F3F4F6", icon: Ban },
};

const DAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];
const TODAY_STR = "2026-05-03";

function daysInMonth(y: number, m: number) { return new Date(y, m, 0).getDate(); }
function startDOW(y: number, m: number) { return new Date(y, m - 1, 1).getDay(); }
function monthDates(y: number, m: number) {
  return Array.from({ length: daysInMonth(y, m) }, (_, i) => {
    const d = String(i + 1).padStart(2, "0");
    return `${y}-${String(m).padStart(2, "0")}-${d}`;
  });
}

// ── 서브 컴포넌트 ────────────────────────────────────────────────
function ScheduleBadge({ status }: { status: ScheduleStatus }) {
  const cfg = SCHEDULE_CFG[status];
  const Icon = cfg.icon;
  return (
    <span
      className="flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full"
      style={{ color: cfg.color, background: cfg.bg }}
    >
      <Icon size={11} />
      {cfg.label}
    </span>
  );
}

function LicenseBadge({ status }: { status: LicenseStatus }) {
  const cfg = LICENSE_CFG[status];
  const Icon = cfg.icon;
  return (
    <span
      className="flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full"
      style={{ color: cfg.color, background: cfg.bg }}
    >
      <Icon size={11} />
      {cfg.label}
    </span>
  );
}

// 파일럿 카드
function PilotCard({ pilot, onClick }: { pilot: Pilot; onClick: () => void }) {
  const criticalLicenses = pilot.licenses.filter(
    (l) => l.status === "expiring_critical" || l.status === "expired"
  );
  const warnLicenses = pilot.licenses.filter((l) => l.status === "expiring_soon");

  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-white rounded-2xl p-5 shadow-sm border hover:shadow-md transition-shadow"
      style={{ borderColor: criticalLicenses.length > 0 ? "#FCA5A5" : "#E5E7EB" }}
    >
      {/* 상단 */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center text-white text-lg font-bold flex-shrink-0"
            style={{ background: pilot.avatarColor }}
          >
            {pilot.initials}
          </div>
          <div>
            <div className="font-bold text-base" style={{ color: "#0D2B52" }}>
              {pilot.name}
            </div>
            <div className="text-xs text-gray-400 mt-0.5">{pilot.joinDate.slice(0, 7)} 입사</div>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <ScheduleBadge status={pilot.todayStatus} />
          <ChevronRight size={14} className="text-gray-300" />
        </div>
      </div>

      {/* 자격증 경보 */}
      {criticalLicenses.length > 0 && (
        <div
          className="flex items-center gap-2 rounded-lg px-3 py-2 mb-3 text-xs"
          style={{ background: "#FEF2F2", color: "#EF4444" }}
        >
          <AlertCircle size={13} />
          <span>
            {criticalLicenses[0].name} — D-{criticalLicenses[0].daysLeft}일
          </span>
        </div>
      )}
      {criticalLicenses.length === 0 && warnLicenses.length > 0 && (
        <div
          className="flex items-center gap-2 rounded-lg px-3 py-2 mb-3 text-xs"
          style={{ background: "#FFFBEB", color: "#D97706" }}
        >
          <AlertTriangle size={13} />
          <span>
            {warnLicenses[0].name} — D-{warnLicenses[0].daysLeft}일
          </span>
        </div>
      )}

      {/* 자격증 현황 */}
      <div className="flex gap-1 mb-4 flex-wrap">
        {pilot.licenses.map((l) => (
          <LicenseBadge key={l.id} status={l.status} />
        ))}
      </div>

      {/* 통계 */}
      <div className="grid grid-cols-3 gap-2 text-center pt-3 border-t border-gray-100">
        <div>
          <div className="text-base font-bold" style={{ color: "#0D2B52" }}>{pilot.flightsToday}</div>
          <div className="text-xs text-gray-400">오늘</div>
        </div>
        <div>
          <div className="text-base font-bold" style={{ color: "#0D2B52" }}>{pilot.flightsThisMonth}</div>
          <div className="text-xs text-gray-400">이번 달</div>
        </div>
        <div>
          <div className="text-base font-bold" style={{ color: "#0D2B52" }}>{pilot.flightsTotal.toLocaleString()}</div>
          <div className="text-xs text-gray-400">누적</div>
        </div>
      </div>
    </button>
  );
}

// 상세 패널
function DetailPanel({ pilot, onClose }: { pilot: Pilot; onClose: () => void }) {
  const [editMode, setEditMode] = useState(false);
  const [memo, setMemo] = useState(pilot.memo);

  // 스케줄은 공유 스토어에서 읽기/쓰기
  const allSchedules = useSchedules();
  const scheduleData: MonthSchedule = allSchedules[pilot.id] ?? pilot.schedule;

  const SCHEDULE_OPTIONS: ScheduleStatus[] = ["working", "standby", "off", "etc"];

  function cycleSchedule(date: string) {
    const current = scheduleData[date] || "off";
    const idx = SCHEDULE_OPTIONS.indexOf(current);
    const next = SCHEDULE_OPTIONS[(idx + 1) % SCHEDULE_OPTIONS.length];
    updatePilotSchedule(pilot.id, date, next);
  }

  return (
    <>
      {/* 오버레이 */}
      <div
        className="fixed inset-0 bg-black/30 z-40"
        onClick={onClose}
      />
      {/* 패널 */}
      <div
        className="fixed top-0 right-0 h-full bg-white z-50 overflow-y-auto shadow-2xl"
        style={{ width: 480 }}
      >
        {/* 헤더 */}
        <div className="sticky top-0 bg-white z-10 border-b border-gray-100 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold"
              style={{ background: pilot.avatarColor }}
            >
              {pilot.initials}
            </div>
            <div>
              <div className="font-bold" style={{ color: "#0D2B52" }}>{pilot.name}</div>
              <ScheduleBadge status={pilot.todayStatus} />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setEditMode(!editMode)}
              className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50"
              style={{ color: "#0D2B52" }}
            >
              <Edit3 size={13} />
              {editMode ? "저장" : "편집"}
            </button>
            <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg">
              <X size={18} className="text-gray-400" />
            </button>
          </div>
        </div>

        <div className="px-6 py-5 space-y-6">
          {/* 연락처 */}
          <section>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">기본 정보</h3>
            <div className="space-y-2">
              <div className="flex items-center gap-3 text-sm">
                <Phone size={14} className="text-gray-400 flex-shrink-0" />
                <span style={{ color: "#0D2B52" }}>{pilot.phone}</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Mail size={14} className="text-gray-400 flex-shrink-0" />
                <span style={{ color: "#0D2B52" }}>{pilot.email}</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Calendar size={14} className="text-gray-400 flex-shrink-0" />
                <span className="text-gray-500">입사일 {pilot.joinDate}</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <TrendingUp size={14} className="text-gray-400 flex-shrink-0" />
                <span className="text-gray-500">
                  누적 {pilot.flightsTotal.toLocaleString()}건 · 이번달 {pilot.flightsThisMonth}건
                </span>
              </div>
            </div>
          </section>

          {/* 메모 */}
          <section>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">운영 메모</h3>
            {editMode ? (
              <textarea
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
                className="w-full text-sm rounded-xl border border-gray-200 px-3 py-2 resize-none focus:outline-none focus:ring-2"
                style={{ color: "#0D2B52", minHeight: 72 }}
              />
            ) : (
              <p className="text-sm text-gray-600 bg-gray-50 rounded-xl px-3 py-2">{memo}</p>
            )}
          </section>

          {/* 자격증 */}
          <section>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">자격증 현황</h3>
            <div className="space-y-3">
              {pilot.licenses.map((lic) => {
                const cfg = LICENSE_CFG[lic.status];
                const Icon = cfg.icon;
                return (
                  <div
                    key={lic.id}
                    className="rounded-xl p-3.5 border"
                    style={{
                      borderColor: lic.status === "expiring_critical" || lic.status === "expired" ? "#FCA5A5" : lic.status === "expiring_soon" ? "#FCD34D" : "#E5E7EB",
                      background: lic.status === "expiring_critical" || lic.status === "expired" ? "#FEF2F2" : lic.status === "expiring_soon" ? "#FFFBEB" : "#FAFAFA",
                    }}
                  >
                    <div className="flex items-start justify-between mb-1">
                      <span className="text-sm font-medium" style={{ color: "#0D2B52" }}>{lic.name}</span>
                      <LicenseBadge status={lic.status} />
                    </div>
                    <div className="text-xs text-gray-500 space-y-0.5">
                      <div>번호: {lic.number}</div>
                      <div>발급: {lic.issuedBy}</div>
                      <div className="flex items-center gap-1">
                        만료:
                        <span style={{ color: cfg.color, fontWeight: 600 }}>
                          {lic.expiresAt} (D-{lic.daysLeft})
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
              {editMode && (
                <button className="w-full border-2 border-dashed border-gray-200 rounded-xl py-3 text-sm text-gray-400 hover:border-blue-300 hover:text-blue-400 transition-colors flex items-center justify-center gap-1">
                  <Plus size={14} />
                  자격증 추가
                </button>
              )}
            </div>
          </section>

          {/* 5월 스케줄 */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">5월 스케줄</h3>
              {editMode && (
                <span className="text-xs text-blue-400">날짜를 클릭해서 변경</span>
              )}
            </div>

            {/* 요일 헤더 */}
            <div className="grid grid-cols-7 mb-1">
              {DAY_LABELS.map((d, i) => (
                <div
                  key={d}
                  className="text-center text-xs font-medium py-1"
                  style={{ color: i === 0 ? "#EF4444" : i === 6 ? "#2A7AE2" : "#6B7280" }}
                >
                  {d}
                </div>
              ))}
            </div>

            {/* 날짜 그리드 */}
            <div className="grid grid-cols-7 gap-1">
              {/* 앞 빈칸 */}
              {Array.from({ length: startDOW(2026, 5) }).map((_, i) => (
                <div key={`empty-${i}`} />
              ))}
              {monthDates(2026, 5).map((date, idx) => {
                const day = idx + 1;
                const dow = (startDOW(2026, 5) + idx) % 7;
                const status = scheduleData[date] || "off";
                const cfg = SCHEDULE_CFG[status];
                const isToday = date === "2026-05-01";

                return (
                  <button
                    key={date}
                    onClick={() => editMode && cycleSchedule(date)}
                    disabled={!editMode}
                    className="flex flex-col items-center py-1.5 rounded-lg transition-all"
                    style={{
                      background: isToday ? cfg.bg : scheduleData[date] ? cfg.bg : "transparent",
                      border: isToday ? `1.5px solid ${cfg.color}` : "1.5px solid transparent",
                      cursor: editMode ? "pointer" : "default",
                      opacity: scheduleData[date] ? 1 : 0.4,
                    }}
                    title={`${date}: ${cfg.label}`}
                  >
                    <span
                      className="text-xs"
                      style={{
                        color: dow === 0 ? "#EF4444" : dow === 6 ? "#2A7AE2" : isToday ? cfg.color : "#374151",
                        fontWeight: isToday ? 700 : 400,
                        fontSize: 11,
                      }}
                    >
                      {day}
                    </span>
                    {scheduleData[date] && (
                      <span className="text-xs mt-0.5" style={{ color: cfg.color, fontSize: 9 }}>
                        {cfg.label}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* 범례 */}
            <div className="flex flex-wrap gap-3 mt-3">
              {SCHEDULE_OPTIONS.map((s) => {
                const cfg = SCHEDULE_CFG[s];
                const count = Object.values(scheduleData).filter((v) => v === s).length;
                return (
                  <span key={s} className="flex items-center gap-1 text-xs text-gray-500">
                    <span className="w-2.5 h-2.5 rounded-sm" style={{ background: cfg.bg, border: `1px solid ${cfg.color}` }} />
                    {cfg.label} {count}일
                  </span>
                );
              })}
            </div>
          </section>
        </div>
      </div>
    </>
  );
}

// ── 날짜 편집 모달 ──────────────────────────────────────────────
function TeamScheduleEditModal({
  date,
  allSchedules,
  allNotes,
  onClose,
}: {
  date: string;
  allSchedules: AllSchedules;
  allNotes: Record<string, Record<string, string>>;
  onClose: () => void;
}) {
  const PILOT_META = PILOTS.map((p) => ({ id: p.id, name: p.name, color: p.avatarColor, initials: p.initials, fallback: p.schedule }));

  const [statuses, setStatuses] = useState<Record<string, ScheduleStatus>>(() => {
    const init: Record<string, ScheduleStatus> = {};
    PILOT_META.forEach((p) => {
      init[p.id] = (allSchedules[p.id]?.[date] ?? p.fallback[date] ?? "working") as ScheduleStatus;
    });
    return init;
  });

  const [notes, setNotes] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    PILOT_META.forEach((p) => { init[p.id] = allNotes[p.id]?.[date] ?? ""; });
    return init;
  });

  function save() {
    PILOT_META.forEach((p) => {
      updatePilotSchedule(p.id, date, statuses[p.id]);
      updatePilotNote(p.id, date, statuses[p.id] === "etc" ? notes[p.id] : "");
    });
    onClose();
  }

  const mm = date.slice(5, 7);
  const dd = date.slice(8);

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-50" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl pointer-events-auto">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <div>
              <h3 className="font-bold" style={{ color: "#0D2B52" }}>{mm}월 {dd}일 스케줄 설정</h3>
              <p className="text-xs text-gray-400 mt-0.5">파일럿별 스케줄을 변경하세요</p>
            </div>
            <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg">
              <X size={16} className="text-gray-400" />
            </button>
          </div>

          <div className="px-5 py-4 space-y-5 max-h-[60vh] overflow-y-auto">
            {PILOT_META.map((p) => {
              const status = statuses[p.id];
              const cfg = SCHEDULE_CFG[status];
              return (
                <div key={p.id}>
                  <div className="flex items-center gap-2 mb-2">
                    <div
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                      style={{ backgroundColor: p.color }}
                    >
                      {p.initials}
                    </div>
                    <span className="text-sm font-semibold flex-1" style={{ color: "#0D2B52" }}>{p.name}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ color: cfg.color, background: cfg.bg }}>
                      {cfg.label}
                    </span>
                  </div>
                  <div className="grid grid-cols-4 gap-1">
                    {(["working", "standby", "off", "etc"] as ScheduleStatus[]).map((s) => {
                      const c = SCHEDULE_CFG[s];
                      const isSel = status === s;
                      return (
                        <button
                          key={s}
                          onClick={() => setStatuses((prev) => ({ ...prev, [p.id]: s }))}
                          className="py-1.5 rounded-lg text-xs font-medium border-2 transition-all"
                          style={{
                            borderColor: isSel ? c.color : "#E5E7EB",
                            backgroundColor: isSel ? c.bg : "white",
                            color: isSel ? c.color : "#9CA3AF",
                          }}
                        >
                          {c.label}
                        </button>
                      );
                    })}
                  </div>
                  {status === "etc" && (
                    <input
                      value={notes[p.id]}
                      onChange={(e) => setNotes((prev) => ({ ...prev, [p.id]: e.target.value }))}
                      placeholder="사유 입력 (예: 병원, 가족행사)"
                      maxLength={30}
                      className="mt-1.5 w-full border border-purple-200 rounded-xl px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-purple-300"
                      style={{ color: "#374151" }}
                    />
                  )}
                </div>
              );
            })}
          </div>

          <div className="flex gap-2 px-5 pb-5">
            <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-500 hover:bg-gray-50">
              취소
            </button>
            <button onClick={save} className="flex-1 py-2.5 rounded-xl text-sm font-medium text-white" style={{ background: "#0D2B52" }}>
              저장
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// ── 팀 통합 달력 ────────────────────────────────────────────────
function TeamCalendar({ allSchedules, allNotes }: { allSchedules: AllSchedules; allNotes: Record<string, Record<string, string>> }) {
  const PILOT_META = PILOTS.map((p) => ({ id: p.id, name: p.name, color: p.avatarColor, fallback: p.schedule }));

  const [viewYear, setViewYear] = useState(2026);
  const [viewMonth, setViewMonth] = useState(5);
  const [editDate, setEditDate] = useState<string | null>(null);

  const dates = monthDates(viewYear, viewMonth);
  const sdow = startDOW(viewYear, viewMonth);

  function goMonth(delta: number) {
    let m = viewMonth + delta;
    let y = viewYear;
    if (m > 12) { m = 1; y++; }
    if (m < 1) { m = 12; y--; }
    setViewMonth(m);
    setViewYear(y);
  }

  function goToday() { setViewYear(2026); setViewMonth(5); }

  const isCurrentMonth = viewYear === 2026 && viewMonth === 5;

  function getAbsent(date: string) {
    return PILOT_META.flatMap((p) => {
      const status: ScheduleStatus = (allSchedules[p.id]?.[date] ?? p.fallback[date] ?? "working") as ScheduleStatus;
      if (status === "working") return [];
      const note = status === "etc" ? (allNotes[p.id]?.[date] ?? "") : "";
      return [{ ...p, status, note }];
    });
  }

  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-1">
          <button onClick={() => goMonth(-1)} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
            <ChevronLeft size={16} className="text-gray-500" />
          </button>
          <div className="text-center px-1">
            <h2 className="font-semibold" style={{ color: "#0D2B52" }}>
              {viewYear}년 {viewMonth}월
            </h2>
            <p className="text-xs text-gray-400">팀 스케줄 달력 · 비출근 파일럿만 표시</p>
          </div>
          <button onClick={() => goMonth(1)} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
            <ChevronRight size={16} className="text-gray-500" />
          </button>
          {!isCurrentMonth && (
            <button
              onClick={goToday}
              className="ml-1 text-xs px-2 py-1 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50"
            >
              오늘
            </button>
          )}
        </div>
        <div className="flex gap-3">
          {(["standby", "off", "etc"] as ScheduleStatus[]).map((s) => {
            const cfg = SCHEDULE_CFG[s];
            return (
              <span key={s} className="flex items-center gap-1 text-xs text-gray-400">
                <span className="w-2 h-2 rounded-full" style={{ background: cfg.color }} />
                {cfg.label}
              </span>
            );
          })}
        </div>
      </div>

      {/* 편집 안내 */}
      <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-3 px-0.5">
        <span className="w-1.5 h-1.5 rounded-full bg-gray-300" />
        과거 날짜는 조회만 가능 · 오늘 이후 날짜 클릭 시 스케줄 편집
      </div>

      {/* 요일 헤더 */}
      <div className="grid grid-cols-7 mb-1">
        {DAY_LABELS.map((d, i) => (
          <div key={d} className="text-center text-xs font-medium py-1"
            style={{ color: i === 0 ? "#EF4444" : i === 6 ? "#2A7AE2" : "#6B7280" }}>
            {d}
          </div>
        ))}
      </div>

      {/* 날짜 그리드 */}
      <div className="grid grid-cols-7 gap-px">
        {Array.from({ length: sdow }).map((_, i) => <div key={`e-${i}`} />)}
        {dates.map((date, idx) => {
          const day = idx + 1;
          const dow = (sdow + idx) % 7;
          const isToday = date === TODAY_STR;
          const isPast = date < TODAY_STR;
          const isFuture = date > TODAY_STR;
          const absent = getAbsent(date);

          return (
            <div
              key={date}
              onClick={() => isFuture && setEditDate(date)}
              className={`flex flex-col min-h-[52px] p-1 rounded-lg transition-colors ${
                isFuture ? "cursor-pointer hover:bg-blue-50 hover:border-blue-200" : ""
              }`}
              style={{
                background: isToday ? "#EFF6FF" : "transparent",
                border: isToday ? "1.5px solid #2A7AE2" : "1.5px solid transparent",
                opacity: isPast ? 0.45 : 1,
              }}
            >
              <span
                className="text-right block mb-1 pr-0.5"
                style={{
                  fontSize: 11,
                  fontWeight: isToday ? 700 : 400,
                  color: dow === 0 ? "#EF4444" : dow === 6 ? "#2A7AE2" : isToday ? "#2A7AE2" : "#374151",
                }}
              >
                {day}
              </span>
              <div className="flex flex-col gap-0.5">
                {absent.map((p) => {
                  const cfg = SCHEDULE_CFG[p.status];
                  return (
                    <span
                      key={p.id}
                      className="text-center rounded px-0.5 leading-tight"
                      style={{
                        fontSize: 9,
                        fontWeight: 600,
                        color: cfg.color,
                        background: cfg.bg,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                      title={p.status === "etc" && p.note ? `${p.name} — 기타: ${p.note}` : `${p.name} — ${cfg.label}`}
                    >
                      {p.name}{p.status === "etc" && p.note ? ` (${p.note.slice(0, 4)})` : ""}
                    </span>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* 날짜 편집 모달 */}
      {editDate && (
        <TeamScheduleEditModal
          date={editDate}
          allSchedules={allSchedules}
          allNotes={allNotes}
          onClose={() => setEditDate(null)}
        />
      )}
    </div>
  );
}

// ── 등록 모달 ────────────────────────────────────────────────────
function AddPilotModal({ onClose }: { onClose: () => void }) {
  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
        <div className="bg-white rounded-2xl w-full max-w-md mx-4 p-6 shadow-2xl">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-bold" style={{ color: "#0D2B52" }}>파일럿 등록</h2>
            <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg">
              <X size={18} className="text-gray-400" />
            </button>
          </div>
          <div className="space-y-3">
            {[
              { label: "이름", placeholder: "홍길동", type: "text" },
              { label: "전화번호", placeholder: "010-0000-0000", type: "tel" },
              { label: "이메일", placeholder: "pilot@gureum.co.kr", type: "email" },
              { label: "입사일", placeholder: "2026-05-01", type: "date" },
            ].map((f) => (
              <div key={f.label}>
                <label className="block text-sm font-medium text-gray-600 mb-1">{f.label}</label>
                <input
                  type={f.type}
                  placeholder={f.placeholder}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2"
                  style={{ color: "#0D2B52" }}
                />
              </div>
            ))}
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">일일 최대 비행 횟수</label>
              <select
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none"
                style={{ color: "#0D2B52" }}
              >
                {[3, 4, 5, 6].map((n) => (
                  <option key={n} value={n}>{n}회</option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex gap-2 mt-6">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-500 hover:bg-gray-50"
            >
              취소
            </button>
            <button
              className="flex-1 py-2.5 rounded-xl text-sm font-medium text-white"
              style={{ background: "#0D2B52" }}
              onClick={onClose}
            >
              등록
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// ── 메인 ────────────────────────────────────────────────────────
export default function PilotsPage() {
  const [selected, setSelected] = useState<Pilot | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const allSchedules = useSchedules();
  const allNotes = useScheduleNotes();

  const alerts = useMemo(() => {
    const result: { pilot: Pilot; license: License }[] = [];
    for (const pilot of PILOTS) {
      for (const lic of pilot.licenses) {
        if (lic.status === "expiring_critical" || lic.status === "expired") {
          result.push({ pilot, license: lic });
        }
      }
    }
    return result.sort((a, b) => a.license.daysLeft - b.license.daysLeft);
  }, []);

  const warnAlerts = useMemo(() => {
    const result: { pilot: Pilot; license: License }[] = [];
    for (const pilot of PILOTS) {
      for (const lic of pilot.licenses) {
        if (lic.status === "expiring_soon") {
          result.push({ pilot, license: lic });
        }
      }
    }
    return result;
  }, []);

  const todaySummary = useMemo(() => {
    const working = PILOTS.filter((p) => p.todayStatus === "working").length;
    const standby = PILOTS.filter((p) => p.todayStatus === "standby").length;
    const totalFlights = PILOTS.reduce((s, p) => s + p.flightsToday, 0);
    return { working, standby, totalFlights };
  }, []);

  return (
    <div className="p-6 space-y-5" style={{ background: "#F5F7FA", minHeight: "100vh" }}>
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "#0D2B52" }}>파일럿장</h1>
          <p className="text-sm text-gray-500 mt-0.5">파일럿 관리 · 자격증 · 스케줄</p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-sm font-medium shadow-sm hover:opacity-90"
          style={{ background: "#0D2B52" }}
        >
          <Plus size={16} />
          파일럿 등록
        </button>
      </div>

      {/* 오늘 요약 */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "전체 파일럿", value: `${PILOTS.length}명`, icon: User, color: "#2A7AE2" },
          { label: "오늘 출근", value: `${todaySummary.working}명`, icon: Plane, color: "#10B981" },
          { label: "대기", value: `${todaySummary.standby}명`, icon: Clock, color: "#F59E0B" },
          { label: "오늘 비행", value: `${todaySummary.totalFlights}건`, icon: TrendingUp, color: "#FF8A00" },
        ].map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="bg-white rounded-xl px-4 py-3.5 shadow-sm border border-gray-100 flex items-center gap-3">
              <span
                className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: `${card.color}18` }}
              >
                <Icon size={17} style={{ color: card.color }} />
              </span>
              <div>
                <div className="text-xl font-bold" style={{ color: "#0D2B52" }}>{card.value}</div>
                <div className="text-xs text-gray-400">{card.label}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 자격증 경보 */}
      {(alerts.length > 0 || warnAlerts.length > 0) && (
        <div className="space-y-2">
          {alerts.map(({ pilot, license }) => (
            <div
              key={`${pilot.id}-${license.id}`}
              className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm"
              style={{ background: "#FEF2F2", border: "1px solid #FCA5A5" }}
            >
              <AlertCircle size={16} style={{ color: "#EF4444", flexShrink: 0 }} />
              <span style={{ color: "#991B1B", fontWeight: 600 }}>
                [{pilot.name}] {license.name}
              </span>
              <span style={{ color: "#EF4444" }}>
                {license.expiresAt} 만료 — 남은 일수 D-{license.daysLeft}
              </span>
              <button
                onClick={() => setSelected(pilot)}
                className="ml-auto text-xs px-2.5 py-1 rounded-lg font-medium"
                style={{ background: "#EF4444", color: "#fff" }}
              >
                확인
              </button>
            </div>
          ))}
          {warnAlerts.map(({ pilot, license }) => (
            <div
              key={`${pilot.id}-${license.id}`}
              className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm"
              style={{ background: "#FFFBEB", border: "1px solid #FCD34D" }}
            >
              <AlertTriangle size={16} style={{ color: "#D97706", flexShrink: 0 }} />
              <span style={{ color: "#92400E", fontWeight: 600 }}>
                [{pilot.name}] {license.name}
              </span>
              <span style={{ color: "#D97706" }}>
                {license.expiresAt} 만료 예정 — D-{license.daysLeft}
              </span>
              <button
                onClick={() => setSelected(pilot)}
                className="ml-auto text-xs px-2.5 py-1 rounded-lg font-medium"
                style={{ background: "#F59E0B", color: "#fff" }}
              >
                확인
              </button>
            </div>
          ))}
        </div>
      )}

      {/* 팀 통합 달력 */}
      <TeamCalendar allSchedules={allSchedules} allNotes={allNotes} />

      {/* 파일럿 카드 그리드 */}
      <div className="grid grid-cols-2 gap-4">
        {PILOTS.map((pilot) => (
          <PilotCard key={pilot.id} pilot={pilot} onClick={() => setSelected(pilot)} />
        ))}
      </div>

      {/* 자격증 현황 테이블 */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold" style={{ color: "#0D2B52" }}>전체 자격증 현황</h2>
          <Award size={16} className="text-gray-400" />
        </div>
        <div
          className="grid text-xs text-gray-400 font-medium pb-2 border-b border-gray-100"
          style={{ gridTemplateColumns: "1fr 1.8fr 1.4fr 1fr 1fr 0.8fr" }}
        >
          <span>파일럿</span>
          <span>자격증명</span>
          <span>번호</span>
          <span>발급기관</span>
          <span>만료일</span>
          <span className="text-right">상태</span>
        </div>
        <div className="divide-y divide-gray-50">
          {PILOTS.flatMap((pilot) =>
            pilot.licenses.map((lic) => (
              <div
                key={`${pilot.id}-${lic.id}`}
                className="grid py-2.5 text-sm items-center"
                style={{
                  gridTemplateColumns: "1fr 1.8fr 1.4fr 1fr 1fr 0.8fr",
                  background: lic.status === "expiring_critical" ? "#FEF9F9" : lic.status === "expiring_soon" ? "#FFFDF5" : "transparent",
                }}
              >
                <span className="font-medium" style={{ color: "#0D2B52" }}>{pilot.name}</span>
                <span className="text-gray-700">{lic.name}</span>
                <span className="text-gray-400 text-xs font-mono">{lic.number}</span>
                <span className="text-gray-500 text-xs">{lic.issuedBy}</span>
                <span
                  className="text-xs font-medium"
                  style={{
                    color: lic.status === "expiring_critical" || lic.status === "expired" ? "#EF4444" : lic.status === "expiring_soon" ? "#D97706" : "#374151",
                  }}
                >
                  {lic.expiresAt}
                </span>
                <span className="flex justify-end">
                  <LicenseBadge status={lic.status} />
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* 상세 패널 */}
      {selected && (
        <DetailPanel pilot={selected} onClose={() => setSelected(null)} />
      )}

      {/* 등록 모달 */}
      {showAdd && <AddPilotModal onClose={() => setShowAdd(false)} />}
    </div>
  );
}
