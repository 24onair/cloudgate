"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { useSchedules, useScheduleNotes, updatePilotSchedule, updatePilotNote, type AllSchedules } from "@/lib/scheduleStore";
import { getSettlementConfig } from "@/lib/settlementStore";
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
  Camera,
  ShieldCheck,
  UserX,
  ChevronDown,
  ChevronUp,
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

type InactiveReason = "resignation" | "retirement" | "contract_end" | "other";

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
  // 사진
  photoUrl?: string;
  // 퇴직 관련
  active: boolean;
  inactiveReason?: InactiveReason;
  inactiveNote?: string;
  inactiveDate?: string;
}

// ── DB → UI 매핑 ─────────────────────────────────────────────────
const AVATAR_COLORS = ["#2A7AE2", "#10B981", "#FF8A00", "#8B5CF6", "#EF4444", "#F59E0B", "#06B6D4"];
function avatarColorFromId(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) & 0xffffff;
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

/** 만료일 → status + daysLeft 계산 */
function computeLicenseStatus(expiresAt: string): { status: LicenseStatus; daysLeft: number } {
  const today = new Date();
  const exp = new Date(expiresAt);
  const daysLeft = Math.ceil((exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  let status: LicenseStatus;
  if (daysLeft < 0)       status = "expired";
  else if (daysLeft <= 7) status = "expiring_critical";
  else if (daysLeft <= 30) status = "expiring_soon";
  else                    status = "valid";
  return { status, daysLeft };
}

function mapDbPilot(p: any): Pilot {
  const rawLicenses: any[] = Array.isArray(p.licenses) ? p.licenses : [];
  return {
    id: p.id,
    name: p.name ?? "",
    initials: (p.name ?? "?")[0],
    avatarColor: avatarColorFromId(p.id ?? ""),
    phone: p.phone ?? "",
    email: p.email ?? "",
    joinDate: p.join_date ?? "",
    todayStatus: "working" as ScheduleStatus,
    flightsTotal: p.flights_total ?? 0,
    flightsThisMonth: p.flights_this_month ?? 0,
    flightsToday: p.flights_today ?? 0,
    maxFlightsPerDay: p.max_flights_per_day ?? 6,
    memo: p.memo ?? "",
    photoUrl: p.photo_url ?? undefined,
    active: p.status !== "inactive",
    inactiveReason: p.inactive_reason as InactiveReason | undefined,
    inactiveNote: p.inactive_note ?? undefined,
    inactiveDate: p.inactive_date ?? undefined,
    licenses: rawLicenses.map((l) => {
      const { status, daysLeft } = computeLicenseStatus(l.expiresAt ?? "");
      return { id: l.id ?? String(Math.random()), name: l.name ?? "", number: l.number ?? "", issuedBy: l.issuedBy ?? "", expiresAt: l.expiresAt ?? "", status, daysLeft } as License;
    }),
    schedule: {},
  };
}

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

const INACTIVE_REASON_CFG: Record<InactiveReason, { label: string; color: string }> = {
  resignation:   { label: "이직",     color: "#6366F1" },
  retirement:    { label: "퇴사",     color: "#EF4444" },
  contract_end:  { label: "계약만료", color: "#F59E0B" },
  other:         { label: "기타",     color: "#6B7280" },
};

const DAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];
const TODAY_STR = new Date().toISOString().slice(0, 10);
const TODAY_YEAR = Number(TODAY_STR.slice(0, 4));
const TODAY_MONTH = Number(TODAY_STR.slice(5, 7));

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
            className="w-12 h-12 rounded-xl flex-shrink-0 overflow-hidden flex items-center justify-center text-white text-lg font-bold"
            style={{ background: pilot.avatarColor }}
          >
            {pilot.photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={pilot.photoUrl} alt={pilot.name} className="w-full h-full object-cover" />
            ) : (
              pilot.initials
            )}
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

// ── 퇴직 처리 확인 모달 ─────────────────────────────────────────
function DeactivateModal({
  pilot,
  onConfirm,
  onCancel,
}: {
  pilot: Pilot;
  onConfirm: (reason: InactiveReason, note: string) => void;
  onCancel: () => void;
}) {
  const [reason, setReason] = useState<InactiveReason>("resignation");
  const [note, setNote] = useState("");

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-[60]" onClick={onCancel} />
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 pointer-events-none">
        <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl pointer-events-auto">
          {/* 헤더 */}
          <div className="px-6 pt-6 pb-4 flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "#FEF2F2" }}>
              <UserX size={18} style={{ color: "#EF4444" }} />
            </div>
            <div>
              <h3 className="font-bold text-base" style={{ color: "#0D2B52" }}>퇴직 처리</h3>
              <p className="text-sm text-gray-500 mt-0.5">
                <span className="font-semibold" style={{ color: "#0D2B52" }}>{pilot.name}</span> 파일럿을 비활성 처리합니다
              </p>
            </div>
          </div>

          <div className="px-6 pb-4 space-y-4">
            {/* 안내 */}
            <div className="rounded-xl px-4 py-3 text-xs" style={{ background: "#FFF7ED", color: "#92400E" }}>
              퇴직 처리 후 파일럿은 목록에서 숨겨지지만, 비행 기록·정산 이력은 보존됩니다. 필요 시 복직 처리할 수 있습니다.
            </div>

            {/* 사유 선택 */}
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">퇴직 사유</p>
              <div className="grid grid-cols-2 gap-2">
                {(Object.entries(INACTIVE_REASON_CFG) as [InactiveReason, { label: string; color: string }][]).map(([key, cfg]) => (
                  <button
                    key={key}
                    onClick={() => setReason(key)}
                    className="py-2.5 rounded-xl text-sm font-medium border-2 transition-all"
                    style={{
                      borderColor: reason === key ? cfg.color : "#E5E7EB",
                      background: reason === key ? `${cfg.color}12` : "white",
                      color: reason === key ? cfg.color : "#9CA3AF",
                    }}
                  >
                    {cfg.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 메모 */}
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">비고 <span className="normal-case font-normal">(선택)</span></p>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="예: 타사 이직, 개인사정 등"
                maxLength={50}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-gray-400"
                style={{ color: "#0D2B52" }}
              />
            </div>
          </div>

          {/* 버튼 */}
          <div className="flex gap-2 px-6 pb-6">
            <button
              onClick={onCancel}
              className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-500 hover:bg-gray-50"
            >
              취소
            </button>
            <button
              onClick={() => onConfirm(reason, note)}
              className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white"
              style={{ background: "#EF4444" }}
            >
              퇴직 처리
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// 상세 패널
function DetailPanel({
  pilot,
  onClose,
  onDeactivate,
  onReactivate,
  onDelete,
}: {
  pilot: Pilot;
  onClose: () => void;
  onDeactivate: (reason: InactiveReason, note: string) => void;
  onReactivate: () => void;
  onDelete: () => void;
}) {
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [memo, setMemo] = useState(pilot.memo);
  const [showDeactivate, setShowDeactivate] = useState(false);

  // 상세 패널 달력 월 상태 (동적 현재 월 기준)
  const [calYear, setCalYear] = useState(TODAY_YEAR);
  const [calMonth, setCalMonth] = useState(TODAY_MONTH);

  function goCalMonth(delta: number) {
    let m = calMonth + delta;
    let y = calYear;
    if (m > 12) { m = 1; y++; }
    if (m < 1)  { m = 12; y--; }
    setCalMonth(m);
    setCalYear(y);
  }

  async function handleSave() {
    setSaving(true);
    await fetch(`/api/pilots/${pilot.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ memo }),
    });
    setSaving(false);
    setEditMode(false);
  }

  // 자격증 로컬 상태 (편집 후 DB 저장)
  const [licenses, setLicenses] = useState<License[]>(pilot.licenses);
  const [showAddLic, setShowAddLic] = useState(false);
  const [newLic, setNewLic] = useState({ name: "", number: "", issuedBy: "", expiresAt: "" });

  async function saveLicenses(updated: License[]) {
    setLicenses(updated);
    await fetch(`/api/pilots/${pilot.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ licenses: updated }),
    });
  }

  function handleAddLicense() {
    if (!newLic.name.trim() || !newLic.expiresAt) return;
    const { status, daysLeft } = computeLicenseStatus(newLic.expiresAt);
    const lic: License = {
      id: Date.now().toString(),
      name: newLic.name.trim(),
      number: newLic.number.trim(),
      issuedBy: newLic.issuedBy.trim(),
      expiresAt: newLic.expiresAt,
      status,
      daysLeft,
    };
    saveLicenses([...licenses, lic]);
    setNewLic({ name: "", number: "", issuedBy: "", expiresAt: "" });
    setShowAddLic(false);
  }

  function handleDeleteLicense(id: string) {
    saveLicenses(licenses.filter((l) => l.id !== id));
  }

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
              className="w-10 h-10 rounded-xl overflow-hidden flex items-center justify-center text-white font-bold flex-shrink-0"
              style={{ background: pilot.avatarColor }}
            >
              {pilot.photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={pilot.photoUrl} alt={pilot.name} className="w-full h-full object-cover" />
              ) : (
                pilot.initials
              )}
            </div>
            <div>
              <div className="font-bold" style={{ color: "#0D2B52" }}>{pilot.name}</div>
              <ScheduleBadge status={pilot.todayStatus} />
            </div>
          </div>
          <div className="flex items-center gap-2">
            {pilot.active ? (
              <button
                onClick={editMode ? handleSave : () => setEditMode(true)}
                disabled={saving}
                className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50"
                style={{ color: editMode ? "#2A7AE2" : "#0D2B52", borderColor: editMode ? "#2A7AE2" : "#E5E7EB" }}
              >
                <Edit3 size={13} />
                {saving ? "저장 중…" : editMode ? "저장" : "편집"}
              </button>
            ) : null}
            <button
              onClick={() => {
                if (confirm(`${pilot.name} 파일럿을 완전히 삭제하시겠습니까?\n비행 기록이 있으면 삭제되지 않을 수 있습니다.`)) {
                  onDelete();
                }
              }}
              className="p-1.5 hover:bg-red-50 rounded-lg"
              title="파일럿 삭제"
            >
              <Ban size={16} className="text-red-300 hover:text-red-500" />
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
              {licenses.map((lic) => {
                const cfg = LICENSE_CFG[lic.status];
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
                      <div className="flex items-center gap-2">
                        <LicenseBadge status={lic.status} />
                        {editMode && (
                          <button
                            onClick={() => handleDeleteLicense(lic.id)}
                            className="p-0.5 rounded hover:bg-red-100"
                          >
                            <X size={12} className="text-red-400" />
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="text-xs text-gray-500 space-y-0.5">
                      {lic.number && <div>번호: {lic.number}</div>}
                      {lic.issuedBy && <div>발급: {lic.issuedBy}</div>}
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

              {/* 자격증 추가 폼 */}
              {editMode && showAddLic && (
                <div className="rounded-xl border-2 border-blue-200 p-4 space-y-2.5 bg-blue-50">
                  <p className="text-xs font-semibold text-blue-500 mb-1">새 자격증</p>
                  <input
                    type="text"
                    placeholder="자격증명 *"
                    value={newLic.name}
                    onChange={(e) => setNewLic((v) => ({ ...v, name: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-blue-300"
                    style={{ color: "#0D2B52" }}
                  />
                  <input
                    type="text"
                    placeholder="자격증 번호"
                    value={newLic.number}
                    onChange={(e) => setNewLic((v) => ({ ...v, number: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-blue-300"
                    style={{ color: "#0D2B52" }}
                  />
                  <input
                    type="text"
                    placeholder="발급기관"
                    value={newLic.issuedBy}
                    onChange={(e) => setNewLic((v) => ({ ...v, issuedBy: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-blue-300"
                    style={{ color: "#0D2B52" }}
                  />
                  <div>
                    <label className="text-xs text-gray-400 block mb-1">만료일 *</label>
                    <input
                      type="date"
                      value={newLic.expiresAt}
                      onChange={(e) => setNewLic((v) => ({ ...v, expiresAt: e.target.value }))}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-blue-300"
                      style={{ color: "#0D2B52" }}
                    />
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => { setShowAddLic(false); setNewLic({ name: "", number: "", issuedBy: "", expiresAt: "" }); }}
                      className="flex-1 py-2 rounded-lg border border-gray-200 text-sm text-gray-500 hover:bg-gray-50"
                    >
                      취소
                    </button>
                    <button
                      onClick={handleAddLicense}
                      disabled={!newLic.name.trim() || !newLic.expiresAt}
                      className="flex-1 py-2 rounded-lg text-sm text-white font-medium disabled:opacity-40"
                      style={{ background: "#0D2B52" }}
                    >
                      추가
                    </button>
                  </div>
                </div>
              )}

              {editMode && !showAddLic && (
                <button
                  onClick={() => setShowAddLic(true)}
                  className="w-full border-2 border-dashed border-gray-200 rounded-xl py-3 text-sm text-gray-400 hover:border-blue-300 hover:text-blue-400 transition-colors flex items-center justify-center gap-1"
                >
                  <Plus size={14} />
                  자격증 추가
                </button>
              )}
            </div>
          </section>

          {/* 스케줄 달력 */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-1">
                <button onClick={() => goCalMonth(-1)} className="p-1 rounded hover:bg-gray-100">
                  <ChevronLeft size={13} className="text-gray-400" />
                </button>
                <h3 className="text-xs font-semibold text-gray-500">{calYear}년 {calMonth}월 스케줄</h3>
                <button onClick={() => goCalMonth(1)} className="p-1 rounded hover:bg-gray-100">
                  <ChevronRight size={13} className="text-gray-400" />
                </button>
              </div>
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
              {Array.from({ length: startDOW(calYear, calMonth) }).map((_, i) => (
                <div key={`empty-${i}`} />
              ))}
              {monthDates(calYear, calMonth).map((date, idx) => {
                const day = idx + 1;
                const dow = (startDOW(calYear, calMonth) + idx) % 7;
                const status = scheduleData[date] || "off";
                const cfg = SCHEDULE_CFG[status];
                const isToday = date === TODAY_STR;

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

          {/* ── 퇴직 / 복직 ── */}
          <section className="border-t border-gray-100 pt-5">
            {pilot.active ? (
              <button
                onClick={() => setShowDeactivate(true)}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 border-dashed text-sm font-medium transition-colors hover:bg-red-50"
                style={{ borderColor: "#FCA5A5", color: "#EF4444" }}
              >
                <UserX size={15} />
                퇴직 처리
              </button>
            ) : (
              <div className="space-y-3">
                {/* 퇴직 정보 배너 */}
                <div className="rounded-xl px-4 py-3 text-sm" style={{ background: "#F3F4F6", border: "1px solid #E5E7EB" }}>
                  <div className="flex items-center gap-2 mb-1">
                    <UserX size={14} className="text-gray-400" />
                    <span className="font-semibold text-gray-500">비활성 파일럿</span>
                    {pilot.inactiveReason && (
                      <span
                        className="text-xs px-2 py-0.5 rounded-full font-medium"
                        style={{
                          background: `${INACTIVE_REASON_CFG[pilot.inactiveReason].color}15`,
                          color: INACTIVE_REASON_CFG[pilot.inactiveReason].color,
                        }}
                      >
                        {INACTIVE_REASON_CFG[pilot.inactiveReason].label}
                      </span>
                    )}
                  </div>
                  {pilot.inactiveDate && (
                    <p className="text-xs text-gray-400">{pilot.inactiveDate} 처리</p>
                  )}
                  {pilot.inactiveNote && (
                    <p className="text-xs text-gray-500 mt-0.5">사유: {pilot.inactiveNote}</p>
                  )}
                </div>
                <button
                  onClick={onReactivate}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 border-dashed text-sm font-medium transition-colors hover:bg-green-50"
                  style={{ borderColor: "#6EE7B7", color: "#10B981" }}
                >
                  <CheckCircle2 size={15} />
                  복직 처리
                </button>
              </div>
            )}
          </section>
        </div>
      </div>

      {/* 퇴직 확인 모달 */}
      {showDeactivate && (
        <DeactivateModal
          pilot={pilot}
          onConfirm={(reason, note) => {
            setShowDeactivate(false);
            onDeactivate(reason, note);
          }}
          onCancel={() => setShowDeactivate(false)}
        />
      )}
    </>
  );
}

// ── 날짜 편집 모달 ──────────────────────────────────────────────
function TeamScheduleEditModal({
  date,
  allSchedules,
  allNotes,
  activePilots,
  onClose,
}: {
  date: string;
  allSchedules: AllSchedules;
  allNotes: Record<string, Record<string, string>>;
  activePilots: Pilot[];
  onClose: () => void;
}) {
  const PILOT_META = activePilots.map((p) => ({ id: p.id, name: p.name, color: p.avatarColor, initials: p.initials, fallback: p.schedule }));

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
function TeamCalendar({ allSchedules, allNotes, activePilots }: { allSchedules: AllSchedules; allNotes: Record<string, Record<string, string>>; activePilots: Pilot[] }) {
  const PILOT_META = activePilots.map((p) => ({ id: p.id, name: p.name, color: p.avatarColor, fallback: p.schedule }));

  const [viewYear, setViewYear] = useState(TODAY_YEAR);
  const [viewMonth, setViewMonth] = useState(TODAY_MONTH);
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

  function goToday() { setViewYear(TODAY_YEAR); setViewMonth(TODAY_MONTH); }

  const isCurrentMonth = viewYear === TODAY_YEAR && viewMonth === TODAY_MONTH;

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
          activePilots={activePilots}
          onClose={() => setEditDate(null)}
        />
      )}
    </div>
  );
}

// ── 등록 모달 ────────────────────────────────────────────────────
function AddPilotModal({ onClose, onSaved }: { onClose: () => void; onSaved?: () => void }) {
  const defaultShare = typeof window !== "undefined"
    ? getSettlementConfig().defaultPilotShare : 60;

  // 기본 정보
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [joinDate, setJoinDate] = useState("");
  const [errors, setErrors] = useState<{ name?: string; phone?: string }>({});
  // 자격 · 보험
  const [licenseNo, setLicenseNo] = useState("");
  const [insuranceNo, setInsuranceNo] = useState("");
  const [insuranceExpiry, setInsuranceExpiry] = useState("");
  // 사진
  const [photo, setPhoto] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  // 정산
  const [useCustomShare, setUseCustomShare] = useState(false);
  const [customShare, setCustomShare] = useState(defaultShare);
  const [reason, setReason] = useState("");

  // 전화번호 자동 포맷 (숫자만 입력 → 010-0000-0000)
  function handlePhone(raw: string) {
    const d = raw.replace(/\D/g, "").slice(0, 11);
    let fmt = d;
    if (d.length > 7)      fmt = `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7)}`;
    else if (d.length > 3) fmt = `${d.slice(0, 3)}-${d.slice(3)}`;
    setPhone(fmt);
  }

  // 사진 선택
  function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const MAX = 400;
      let { width, height } = img;
      if (width > MAX || height > MAX) {
        if (width > height) { height = Math.round((height * MAX) / width); width = MAX; }
        else { width = Math.round((width * MAX) / height); height = MAX; }
      }
      const canvas = document.createElement("canvas");
      canvas.width = width; canvas.height = height;
      canvas.getContext("2d")!.drawImage(img, 0, 0, width, height);
      setPhoto(canvas.toDataURL("image/jpeg", 0.75));
    };
    img.src = url;
  }

  async function submit() {
    const errs: { name?: string; phone?: string } = {};
    if (!name.trim()) errs.name = "이름을 입력해주세요.";
    if (!phone.trim()) errs.phone = "전화번호를 입력해주세요.";
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setErrors({});
    const res = await fetch("/api/pilots", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim() || null,
        join_date: joinDate || null,
        photo_url: photo ?? null,
        memo: reason.trim() || null,
        status: "active",
      }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setErrors({ name: data.error ?? "등록에 실패했습니다. 다시 시도해주세요." });
      return;
    }
    onSaved?.();
    onClose();
  }

  // 공통 인풋 스타일
  const inputCls = "w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-gray-400 bg-white";
  const inputStyle = { color: "#0D2B52" };
  const labelCls = "block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5";

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl max-h-[92vh] overflow-y-auto">

        {/* 헤더 */}
        <div className="sticky top-0 bg-white z-10 flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-bold" style={{ color: "#0D2B52" }}>파일럿 등록</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg">
            <X size={18} className="text-gray-400" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-6">

          {/* ── 프로필 사진 ── */}
          <div className="flex flex-col items-center">
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhoto} />
            <button
              onClick={() => fileRef.current?.click()}
              className="relative w-24 h-24 rounded-2xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center gap-1.5 overflow-hidden hover:border-gray-400 transition-colors group"
              style={{ backgroundColor: photo ? "transparent" : "#F9FAFB" }}
            >
              {photo ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={photo} alt="프로필" className="absolute inset-0 w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Camera size={18} className="text-white" />
                  </div>
                </>
              ) : (
                <>
                  <Camera size={20} className="text-gray-300" />
                  <span className="text-xs text-gray-400">사진 등록</span>
                </>
              )}
            </button>
            <p className="text-xs text-gray-400 mt-2">클릭하여 프로필 사진 등록 (1장)</p>
          </div>

          {/* ── 기본 정보 ── */}
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
              <User size={12} /> 기본 정보
            </p>
            <div className="space-y-3">
              <div>
                <label className={labelCls}>이름 <span className="text-red-400 normal-case">*</span></label>
                <input
                  type="text"
                  placeholder="홍길동"
                  value={name}
                  onChange={(e) => { setName(e.target.value); setErrors((p) => ({ ...p, name: undefined })); }}
                  className={`${inputCls} ${errors.name ? "border-red-400" : ""}`}
                  style={inputStyle}
                />
                {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
              </div>
              <div>
                <label className={labelCls}>전화번호 <span className="text-red-400 normal-case">*</span></label>
                <input
                  type="tel"
                  placeholder="01012345678"
                  value={phone}
                  onChange={(e) => { handlePhone(e.target.value); setErrors((p) => ({ ...p, phone: undefined })); }}
                  className={`${inputCls} ${errors.phone ? "border-red-400" : ""}`}
                  style={inputStyle}
                />
                {errors.phone
                  ? <p className="text-xs text-red-500 mt-1">{errors.phone}</p>
                  : <p className="text-xs text-gray-400 mt-1">숫자만 입력하면 자동으로 000-0000-0000 형식으로 변환됩니다</p>
                }
              </div>
              <div>
                <label className={labelCls}>이메일</label>
                <input
                  type="email"
                  placeholder="pilot@gureum.co.kr"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={inputCls}
                  style={inputStyle}
                />
              </div>
              <div>
                <label className={labelCls}>입사일</label>
                <input
                  type="date"
                  value={joinDate}
                  onChange={(e) => setJoinDate(e.target.value)}
                  className={inputCls}
                  style={inputStyle}
                />
              </div>
            </div>
          </div>

          {/* ── 자격 · 보험 ── */}
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
              <ShieldCheck size={12} /> 자격 · 보험
            </p>
            <div className="space-y-3">
              <div>
                <label className={labelCls}>자격증 번호</label>
                <input
                  type="text"
                  placeholder="PG-2024-0000"
                  value={licenseNo}
                  onChange={(e) => setLicenseNo(e.target.value)}
                  className={inputCls}
                  style={inputStyle}
                />
              </div>
              <div>
                <label className={labelCls}>보험증서 번호</label>
                <input
                  type="text"
                  placeholder="INS-2024-000000"
                  value={insuranceNo}
                  onChange={(e) => setInsuranceNo(e.target.value)}
                  className={inputCls}
                  style={inputStyle}
                />
              </div>
              <div>
                <label className={labelCls}>보험 유효기간</label>
                <input
                  type="date"
                  value={insuranceExpiry}
                  onChange={(e) => setInsuranceExpiry(e.target.value)}
                  className={inputCls}
                  style={inputStyle}
                />
              </div>
            </div>
          </div>

          {/* ── 정산 설정 ── */}
          <div className="border-t border-gray-100 pt-4">
            <label className="flex items-center gap-2 cursor-pointer mb-2">
              <input
                type="checkbox"
                checked={useCustomShare}
                onChange={(e) => setUseCustomShare(e.target.checked)}
                className="w-4 h-4 rounded"
              />
              <span className="text-sm font-medium text-gray-700">개별 분배 비율 적용</span>
              <span className="text-xs text-gray-400">기본 {defaultShare}% / {100 - defaultShare}%</span>
            </label>
            {useCustomShare && (
              <div className="space-y-2 pl-6 mt-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 w-14">파일럿</span>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={customShare}
                    onChange={(e) => setCustomShare(Math.max(0, Math.min(100, Number(e.target.value) || 0)))}
                    className="flex-1 border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-center bg-white"
                    style={{ color: "#0D2B52" }}
                  />
                  <span className="text-xs text-gray-500">%</span>
                  <span className="text-xs text-gray-300">/</span>
                  <span className="text-xs text-gray-500">회사 {100 - customShare}%</span>
                </div>
                <input
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="사유 (선택)"
                  maxLength={40}
                  className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs"
                  style={{ color: "#374151" }}
                />
              </div>
            )}
          </div>
        </div>

        {/* 푸터 버튼 */}
        <div className="sticky bottom-0 bg-white border-t border-gray-100 flex gap-2 px-6 py-4">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-500 hover:bg-gray-50"
          >
            취소
          </button>
          <button
            onClick={submit}
            className="flex-1 py-2.5 rounded-xl text-sm font-medium text-white"
            style={{ background: "#0D2B52" }}
          >
            등록
          </button>
        </div>
      </div>
    </div>
  );
}

// ── 메인 ────────────────────────────────────────────────────────
export default function PilotsPage() {
  const [pilots, setPilots] = useState<Pilot[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Pilot | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [showInactive, setShowInactive] = useState(false);
  const allSchedules = useSchedules();
  const allNotes = useScheduleNotes();

  const fetchPilots = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/pilots");
      const data = await res.json();
      if (Array.isArray(data)) setPilots(data.map(mapDbPilot));
    } catch (e) {
      console.error("파일럿 조회 실패", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPilots(); }, [fetchPilots]);

  const activePilots   = useMemo(() => pilots.filter((p) => p.active), [pilots]);
  const inactivePilots = useMemo(() => pilots.filter((p) => !p.active), [pilots]);

  async function deactivatePilot(id: string, reason: InactiveReason, note: string) {
    // 낙관적 UI 업데이트
    setPilots((prev) =>
      prev.map((p) =>
        p.id === id
          ? { ...p, active: false, inactiveReason: reason, inactiveNote: note, inactiveDate: TODAY_STR }
          : p
      )
    );
    setSelected(null);
    // API 저장
    await fetch(`/api/pilots/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: "inactive",
        inactive_reason: reason,
        inactive_note: note,
        inactive_date: TODAY_STR,
      }),
    });
  }

  async function reactivatePilot(id: string) {
    // 낙관적 UI 업데이트
    setPilots((prev) =>
      prev.map((p) =>
        p.id === id
          ? { ...p, active: true, inactiveReason: undefined, inactiveNote: undefined, inactiveDate: undefined }
          : p
      )
    );
    setSelected(null);
    // API 저장
    await fetch(`/api/pilots/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: "active",
        inactive_reason: null,
        inactive_note: null,
        inactive_date: null,
      }),
    });
  }

  const alerts = useMemo(() => {
    const result: { pilot: Pilot; license: License }[] = [];
    for (const pilot of activePilots) {
      for (const lic of pilot.licenses) {
        if (lic.status === "expiring_critical" || lic.status === "expired") {
          result.push({ pilot, license: lic });
        }
      }
    }
    return result.sort((a, b) => a.license.daysLeft - b.license.daysLeft);
  }, [activePilots]);

  const warnAlerts = useMemo(() => {
    const result: { pilot: Pilot; license: License }[] = [];
    for (const pilot of activePilots) {
      for (const lic of pilot.licenses) {
        if (lic.status === "expiring_soon") {
          result.push({ pilot, license: lic });
        }
      }
    }
    return result;
  }, [activePilots]);

  const todaySummary = useMemo(() => {
    const working = activePilots.filter((p) => p.todayStatus === "working").length;
    const standby = activePilots.filter((p) => p.todayStatus === "standby").length;
    const totalFlights = activePilots.reduce((s, p) => s + p.flightsToday, 0);
    return { working, standby, totalFlights };
  }, [activePilots]);

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
          { label: "재직 파일럿", value: `${activePilots.length}명`, icon: User, color: "#2A7AE2" },
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
      <TeamCalendar allSchedules={allSchedules} allNotes={allNotes} activePilots={activePilots} />

      {/* 재직 파일럿 카드 그리드 */}
      {/* 첫 로드(목록 없음)일 때만 전체 로딩 표시, 이후엔 기존 목록 유지 */}
      {loading && pilots.length === 0 ? (
        <div className="flex items-center justify-center py-16 text-sm text-gray-400">파일럿 목록 불러오는 중…</div>
      ) : !loading && activePilots.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-sm text-gray-400 gap-2">
          <User size={32} className="text-gray-200" />
          <p>등록된 파일럿이 없습니다</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {activePilots.map((pilot) => (
            <PilotCard key={pilot.id} pilot={pilot} onClick={() => setSelected(pilot)} />
          ))}
        </div>
      )}

      {/* 퇴직 파일럿 토글 */}
      {inactivePilots.length > 0 && (
        <div>
          <button
            onClick={() => setShowInactive((v) => !v)}
            className="flex items-center gap-2 text-sm text-gray-400 hover:text-gray-600 transition-colors w-full py-2"
          >
            {showInactive ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
            <span>퇴직 파일럿 {inactivePilots.length}명</span>
            <span className="ml-auto text-xs text-gray-300">{showInactive ? "접기" : "펼치기"}</span>
          </button>
          {showInactive && (
            <div className="grid grid-cols-2 gap-4 mt-2">
              {inactivePilots.map((pilot) => (
                <button
                  key={pilot.id}
                  onClick={() => setSelected(pilot)}
                  className="w-full text-left rounded-2xl p-5 border border-dashed border-gray-200 bg-gray-50 hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center text-white text-lg font-bold flex-shrink-0 opacity-40"
                      style={{ background: pilot.avatarColor }}
                    >
                      {pilot.initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-base text-gray-400">{pilot.name}</div>
                      <div className="text-xs text-gray-400 mt-0.5">{pilot.joinDate.slice(0, 7)} 입사</div>
                    </div>
                    {pilot.inactiveReason && (
                      <span
                        className="text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0"
                        style={{
                          background: `${INACTIVE_REASON_CFG[pilot.inactiveReason].color}15`,
                          color: INACTIVE_REASON_CFG[pilot.inactiveReason].color,
                        }}
                      >
                        {INACTIVE_REASON_CFG[pilot.inactiveReason].label}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 text-xs text-gray-400">
                    <UserX size={11} />
                    <span>{pilot.inactiveDate} 퇴직 처리</span>
                    {pilot.inactiveNote && <span className="text-gray-300">· {pilot.inactiveNote}</span>}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

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
          {activePilots.flatMap((pilot) =>
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
        <DetailPanel
          pilot={selected}
          onClose={() => setSelected(null)}
          onDeactivate={(reason, note) => deactivatePilot(selected.id, reason, note)}
          onReactivate={() => reactivatePilot(selected.id)}
          onDelete={async () => {
            const id = selected.id;
            const name = selected.name;
            setSelected(null);
            // 낙관적 제거
            setPilots((prev) => prev.filter((p) => p.id !== id));
            const res = await fetch(`/api/pilots/${id}?hard=1`, { method: "DELETE" });
            if (!res.ok) {
              const err = await res.json().catch(() => ({}));
              alert(`삭제 실패: ${err.error ?? "예약 배정 이력이 있는 파일럿은 삭제 대신 퇴직 처리를 사용하세요."}\n\n파일럿: ${name}`);
            }
            // 성공/실패 모두 DB 상태로 재동기화
            await fetchPilots();
          }}
        />
      )}

      {/* 등록 모달 */}
      {showAdd && <AddPilotModal onClose={() => setShowAdd(false)} onSaved={fetchPilots} />}
    </div>
  );
}
