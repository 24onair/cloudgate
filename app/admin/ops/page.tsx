"use client";

import { useState, useMemo } from "react";
import {
  Wind,
  Eye,
  Thermometer,
  CheckCircle2,
  Clock,
  Plane,
  Users,
  AlertTriangle,
  ChevronRight,
  MapPin,
  Activity,
  Ban,
  RefreshCw,
  FileText,
  X,
  Plus,
} from "lucide-react";

// ── 타입 ────────────────────────────────────────────────────────
type FlightStatus = "confirmed" | "waiting" | "boarding" | "flying" | "landed" | "completed" | "cancelled";

interface Flight {
  id: string;
  bookingId: string;
  customerName: string;
  product: string;
  productColor: string;
  pilot: string;
  pilotInitial: string;
  pilotColor: string;
  scheduledTime: string;
  takeoffAt: string | null;
  landedAt: string | null;
  completedAt: string | null;
  status: FlightStatus;
  pax: number;
  memo: string;
}

interface Incident {
  id: string;
  time: string;
  flightId: string | null;
  customerName: string | null;
  content: string;
  severity: "info" | "warning" | "critical";
}

// ── 목업 데이터 ─────────────────────────────────────────────────
const WEATHER = {
  wind: 2.8,
  windDir: "북서",
  visibility: "최상",
  temp: 18,
  grade: "GREEN" as "GREEN" | "YELLOW" | "RED",
  updatedAt: "13:00",
};

const INITIAL_FLIGHTS: Flight[] = [
  { id: "f1", bookingId: "BK-20260501-1120", customerName: "이수진", product: "베이직", productColor: "#2A7AE2", pilot: "박구름", pilotInitial: "박", pilotColor: "#2A7AE2", scheduledTime: "10:00", takeoffAt: "10:05", landedAt: "10:18", completedAt: "10:20", status: "completed", pax: 1, memo: "" },
  { id: "f2", bookingId: "BK-20260501-2234", customerName: "최현우", product: "익스트림", productColor: "#FF8A00", pilot: "김하늘", pilotInitial: "김", pilotColor: "#10B981", scheduledTime: "11:00", takeoffAt: "11:03", landedAt: "11:22", completedAt: "11:25", status: "completed", pax: 1, memo: "" },
  { id: "f3", bookingId: "BK-20260501-3341", customerName: "서지훈", product: "VIP", productColor: "#0D2B52", pilot: "박구름", pilotInitial: "박", pilotColor: "#2A7AE2", scheduledTime: "12:00", takeoffAt: "12:02", landedAt: "12:28", completedAt: "12:30", status: "completed", pax: 2, memo: "" },
  { id: "f4", bookingId: "BK-20260501-9970", customerName: "김민준", product: "익스트림", productColor: "#FF8A00", pilot: "이바람", pilotInitial: "이", pilotColor: "#FF8A00", scheduledTime: "13:00", takeoffAt: "13:05", landedAt: null, completedAt: null, status: "flying", pax: 1, memo: "" },
  { id: "f5", bookingId: "BK-20260501-4452", customerName: "강미라", product: "베이직", productColor: "#2A7AE2", pilot: "김하늘", pilotInitial: "김", pilotColor: "#10B981", scheduledTime: "13:30", takeoffAt: null, landedAt: null, completedAt: null, status: "cancelled", pax: 1, memo: "고객 취소 (날씨 우려)" },
  { id: "f6", bookingId: "BK-20260501-5563", customerName: "박지연", product: "베이직", productColor: "#2A7AE2", pilot: "박구름", pilotInitial: "박", pilotColor: "#2A7AE2", scheduledTime: "14:00", takeoffAt: null, landedAt: null, completedAt: null, status: "boarding", pax: 1, memo: "" },
  { id: "f7", bookingId: "BK-20260501-6674", customerName: "정성민", product: "VIP", productColor: "#0D2B52", pilot: "김하늘", pilotInitial: "김", pilotColor: "#10B981", scheduledTime: "15:00", takeoffAt: null, landedAt: null, completedAt: null, status: "waiting", pax: 2, memo: "" },
  { id: "f8", bookingId: "BK-20260501-7785", customerName: "김태현", product: "베이직", productColor: "#2A7AE2", pilot: "이바람", pilotInitial: "이", pilotColor: "#FF8A00", scheduledTime: "16:00", takeoffAt: null, landedAt: null, completedAt: null, status: "confirmed", pax: 1, memo: "" },
];

const INITIAL_INCIDENTS: Incident[] = [
  { id: "i1", time: "10:20", flightId: null, customerName: null, content: "이수진 고객 착륙 후 발목 경미한 통증 호소. 처치 후 귀가.", severity: "warning" },
  { id: "i2", time: "11:00", flightId: null, customerName: null, content: "오전 바람 체크 완료. 북서 2.8m/s 양호.", severity: "info" },
];

// ── 상수 ────────────────────────────────────────────────────────
const STATUS_CFG: Record<FlightStatus, { label: string; color: string; bg: string; dot: string }> = {
  confirmed:  { label: "예약확정", color: "#6B7280", bg: "#F3F4F6", dot: "#9CA3AF" },
  waiting:    { label: "대기중",   color: "#2A7AE2", bg: "#EFF6FF", dot: "#2A7AE2" },
  boarding:   { label: "탑승중",   color: "#F59E0B", bg: "#FFFBEB", dot: "#F59E0B" },
  flying:     { label: "비행중",   color: "#FF8A00", bg: "#FFF7ED", dot: "#FF8A00" },
  landed:     { label: "착륙",     color: "#8B5CF6", bg: "#F5F3FF", dot: "#8B5CF6" },
  completed:  { label: "완료",     color: "#10B981", bg: "#ECFDF5", dot: "#10B981" },
  cancelled:  { label: "취소",     color: "#EF4444", bg: "#FEF2F2", dot: "#EF4444" },
};

// 다음 상태 → 버튼 텍스트
const NEXT_ACTION: Partial<Record<FlightStatus, { next: FlightStatus; label: string; color: string }>> = {
  confirmed: { next: "waiting",  label: "체크인",      color: "#2A7AE2" },
  waiting:   { next: "boarding", label: "탑승 시작",   color: "#F59E0B" },
  boarding:  { next: "flying",   label: "비행 시작",   color: "#FF8A00" },
  flying:    { next: "landed",   label: "착륙완료",    color: "#8B5CF6" },
  landed:    { next: "completed",label: "처리완료",    color: "#10B981" },
};

function now() {
  return new Date().toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", hour12: false });
}

// ── 서브 컴포넌트 ────────────────────────────────────────────────
function StatusBadge({ status }: { status: FlightStatus }) {
  const cfg = STATUS_CFG[status];
  return (
    <span
      className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full"
      style={{ color: cfg.color, background: cfg.bg }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full flex-shrink-0"
        style={{
          background: cfg.dot,
          boxShadow: status === "flying" ? `0 0 0 3px ${cfg.dot}33` : "none",
        }}
      />
      {cfg.label}
    </span>
  );
}

// 타임라인 스텝
function StatusTimeline({ status }: { status: FlightStatus }) {
  const steps: FlightStatus[] = ["confirmed", "waiting", "boarding", "flying", "landed", "completed"];
  if (status === "cancelled") return (
    <div className="flex items-center gap-1">
      <Ban size={12} style={{ color: "#EF4444" }} />
      <span className="text-xs" style={{ color: "#EF4444" }}>취소됨</span>
    </div>
  );
  const current = steps.indexOf(status);
  return (
    <div className="flex items-center gap-0.5">
      {steps.map((s, i) => {
        const done = i < current;
        const active = i === current;
        const cfg = STATUS_CFG[s];
        return (
          <div key={s} className="flex items-center">
            <div
              className="w-2 h-2 rounded-full"
              style={{
                background: done ? "#10B981" : active ? cfg.dot : "#E5E7EB",
                boxShadow: active ? `0 0 0 2px ${cfg.dot}44` : "none",
              }}
              title={STATUS_CFG[s].label}
            />
            {i < steps.length - 1 && (
              <div className="w-3 h-0.5" style={{ background: done ? "#10B981" : "#E5E7EB" }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// 비행 카드
function FlightCard({
  flight,
  onAdvance,
  onIncident,
}: {
  flight: Flight;
  onAdvance: (id: string) => void;
  onIncident: (flightId: string, name: string) => void;
}) {
  const action = NEXT_ACTION[flight.status];
  const isFlying = flight.status === "flying";
  const isCancelled = flight.status === "cancelled";
  const isCompleted = flight.status === "completed";

  return (
    <div
      className="bg-white rounded-2xl p-4 shadow-sm border transition-all"
      style={{
        borderColor: isFlying ? "#FF8A00" : isCancelled ? "#FCA5A5" : "#E5E7EB",
        background: isFlying ? "#FFFBF5" : isCancelled ? "#FFF9F9" : "#fff",
        opacity: isCancelled ? 0.8 : 1,
      }}
    >
      {/* 상단 행 */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2.5">
          {/* 시간 */}
          <div
            className="text-center rounded-lg px-2.5 py-1.5 min-w-[48px]"
            style={{ background: isFlying ? "#FFF7ED" : "#F5F7FA" }}
          >
            <div className="text-sm font-bold" style={{ color: isFlying ? "#FF8A00" : "#0D2B52" }}>
              {flight.scheduledTime}
            </div>
          </div>
          <div>
            <div className="font-semibold text-sm" style={{ color: "#0D2B52" }}>
              {flight.customerName}
              {flight.pax > 1 && (
                <span className="ml-1 text-xs text-gray-400">+{flight.pax - 1}명</span>
              )}
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-xs font-medium" style={{ color: flight.productColor }}>
                {flight.product}
              </span>
              <span className="text-gray-300">·</span>
              <span className="flex items-center gap-1 text-xs text-gray-400">
                <span
                  className="w-4 h-4 rounded-md flex items-center justify-center text-white text-xs font-bold"
                  style={{ background: flight.pilotColor, fontSize: 9 }}
                >
                  {flight.pilotInitial}
                </span>
                {flight.pilot}
              </span>
            </div>
          </div>
        </div>
        <StatusBadge status={flight.status} />
      </div>

      {/* 타임라인 */}
      <div className="mb-3">
        <StatusTimeline status={flight.status} />
      </div>

      {/* 시간 기록 */}
      {(flight.takeoffAt || flight.landedAt) && (
        <div className="flex gap-3 mb-3 text-xs text-gray-500">
          {flight.takeoffAt && (
            <span className="flex items-center gap-1">
              <Plane size={11} style={{ color: "#FF8A00" }} />
              이륙 {flight.takeoffAt}
            </span>
          )}
          {flight.landedAt && (
            <span className="flex items-center gap-1">
              <MapPin size={11} style={{ color: "#8B5CF6" }} />
              착륙 {flight.landedAt}
            </span>
          )}
          {flight.completedAt && (
            <span className="flex items-center gap-1">
              <CheckCircle2 size={11} style={{ color: "#10B981" }} />
              완료 {flight.completedAt}
            </span>
          )}
        </div>
      )}

      {/* 메모 */}
      {flight.memo && (
        <div
          className="text-xs rounded-lg px-2.5 py-1.5 mb-3"
          style={{ background: "#FEF2F2", color: "#991B1B" }}
        >
          {flight.memo}
        </div>
      )}

      {/* 액션 버튼 */}
      {!isCancelled && !isCompleted && (
        <div className="flex gap-2 mt-1">
          {action && (
            <button
              onClick={() => onAdvance(flight.id)}
              className="flex-1 py-2 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90"
              style={{ background: action.color }}
            >
              {action.label}
            </button>
          )}
          <button
            onClick={() => onIncident(flight.id, flight.customerName)}
            className="px-3 py-2 rounded-xl border border-gray-200 text-gray-400 hover:border-amber-300 hover:text-amber-500 transition-colors"
            title="이상 상황 기록"
          >
            <AlertTriangle size={15} />
          </button>
        </div>
      )}
      {isCompleted && (
        <div className="flex items-center justify-center gap-1.5 py-2 text-xs text-green-500">
          <CheckCircle2 size={13} />
          비행 완료
        </div>
      )}
    </div>
  );
}

// 이상 상황 기록 모달
function IncidentModal({
  flightId,
  customerName,
  onClose,
  onSubmit,
}: {
  flightId: string | null;
  customerName: string | null;
  onClose: () => void;
  onSubmit: (content: string, severity: Incident["severity"]) => void;
}) {
  const [content, setContent] = useState("");
  const [severity, setSeverity] = useState<Incident["severity"]>("info");

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
      <div className="bg-white rounded-2xl w-full max-w-md mx-4 p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold" style={{ color: "#0D2B52" }}>
            이상 상황 기록
            {customerName && <span className="text-gray-400 font-normal text-sm ml-2">— {customerName}</span>}
          </h2>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg">
            <X size={16} className="text-gray-400" />
          </button>
        </div>

        <div className="flex gap-2 mb-3">
          {(["info", "warning", "critical"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setSeverity(s)}
              className="flex-1 py-1.5 rounded-lg text-xs font-medium border transition-all"
              style={{
                background: severity === s ? (s === "info" ? "#EFF6FF" : s === "warning" ? "#FFFBEB" : "#FEF2F2") : "#fff",
                borderColor: severity === s ? (s === "info" ? "#2A7AE2" : s === "warning" ? "#F59E0B" : "#EF4444") : "#E5E7EB",
                color: severity === s ? (s === "info" ? "#2A7AE2" : s === "warning" ? "#D97706" : "#EF4444") : "#6B7280",
              }}
            >
              {s === "info" ? "일반" : s === "warning" ? "주의" : "긴급"}
            </button>
          ))}
        </div>

        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="상황을 상세히 기록해주세요..."
          className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2"
          style={{ minHeight: 100, color: "#0D2B52" }}
          autoFocus
        />

        <div className="flex gap-2 mt-4">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-500 hover:bg-gray-50"
          >
            취소
          </button>
          <button
            onClick={() => { if (content.trim()) { onSubmit(content.trim(), severity); onClose(); } }}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white"
            style={{ background: severity === "critical" ? "#EF4444" : severity === "warning" ? "#F59E0B" : "#2A7AE2" }}
          >
            기록
          </button>
        </div>
      </div>
    </div>
  );
}

// ── 메인 ────────────────────────────────────────────────────────
export default function OpsPage() {
  const [flights, setFlights] = useState<Flight[]>(INITIAL_FLIGHTS);
  const [incidents, setIncidents] = useState<Incident[]>(INITIAL_INCIDENTS);
  const [filter, setFilter] = useState<FlightStatus | "all">("all");
  const [incidentModal, setIncidentModal] = useState<{ flightId: string | null; name: string | null } | null>(null);
  const [showIncidentDirect, setShowIncidentDirect] = useState(false);

  // 상태 집계
  const stats = useMemo(() => {
    const counts: Record<FlightStatus, number> = {
      confirmed: 0, waiting: 0, boarding: 0, flying: 0, landed: 0, completed: 0, cancelled: 0,
    };
    flights.forEach((f) => { counts[f.status]++; });
    return counts;
  }, [flights]);

  // 필터된 비행 목록 (시간 순)
  const visibleFlights = useMemo(() => {
    return flights
      .filter((f) => filter === "all" || f.status === filter)
      .sort((a, b) => a.scheduledTime.localeCompare(b.scheduledTime));
  }, [flights, filter]);

  // 상태 전진
  function handleAdvance(id: string) {
    setFlights((prev) =>
      prev.map((f) => {
        if (f.id !== id) return f;
        const action = NEXT_ACTION[f.status];
        if (!action) return f;
        const t = now();
        return {
          ...f,
          status: action.next,
          takeoffAt: action.next === "flying" ? t : f.takeoffAt,
          landedAt: action.next === "landed" ? t : f.landedAt,
          completedAt: action.next === "completed" ? t : f.completedAt,
        };
      })
    );
  }

  // 이상 상황 기록
  function handleIncidentSubmit(content: string, severity: Incident["severity"]) {
    const flight = incidentModal?.flightId
      ? flights.find((f) => f.id === incidentModal.flightId)
      : null;
    setIncidents((prev) => [
      {
        id: `i${Date.now()}`,
        time: now(),
        flightId: incidentModal?.flightId ?? null,
        customerName: incidentModal?.name ?? null,
        content,
        severity,
      },
      ...prev,
    ]);
  }

  const WEATHER_GRADE_CFG = {
    GREEN:  { label: "비행 가능", color: "#10B981", bg: "#ECFDF5" },
    YELLOW: { label: "주의 필요", color: "#F59E0B", bg: "#FFFBEB" },
    RED:    { label: "비행 불가", color: "#EF4444", bg: "#FEF2F2" },
  };
  const wCfg = WEATHER_GRADE_CFG[WEATHER.grade];

  const FILTER_TABS: { key: FlightStatus | "all"; label: string; count: number }[] = [
    { key: "all", label: "전체", count: flights.length },
    { key: "flying", label: "비행중", count: stats.flying },
    { key: "boarding", label: "탑승중", count: stats.boarding },
    { key: "waiting", label: "대기", count: stats.waiting + stats.confirmed },
    { key: "completed", label: "완료", count: stats.completed },
    { key: "cancelled", label: "취소", count: stats.cancelled },
  ];

  return (
    <div className="p-6 space-y-5" style={{ background: "#F5F7FA", minHeight: "100vh" }}>
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "#0D2B52" }}>착륙완료</h1>
          <p className="text-sm text-gray-500 mt-0.5">당일 비행 운영 현황 · 실시간 상태 관리</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowIncidentDirect(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-amber-200 text-sm font-medium hover:bg-amber-50 transition-colors"
            style={{ color: "#D97706" }}
          >
            <AlertTriangle size={14} />
            이상 기록
          </button>
          <button className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 text-sm text-gray-500 hover:bg-gray-50">
            <RefreshCw size={14} />
            새로고침
          </button>
        </div>
      </div>

      {/* 날씨 + KPI */}
      <div className="grid grid-cols-5 gap-3">
        {/* 날씨 카드 */}
        <div
          className="col-span-1 rounded-2xl p-4 shadow-sm border flex flex-col justify-between"
          style={{ background: wCfg.bg, borderColor: wCfg.color + "44" }}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold" style={{ color: wCfg.color }}>
              {WEATHER.grade} · {wCfg.label}
            </span>
            <span className="text-xs text-gray-400">{WEATHER.updatedAt} 기준</span>
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-sm">
              <Wind size={14} style={{ color: wCfg.color }} />
              <span className="text-gray-600">
                {WEATHER.windDir} {WEATHER.wind}m/s
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Eye size={14} className="text-gray-400" />
              <span className="text-gray-600">가시거리 {WEATHER.visibility}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Thermometer size={14} className="text-gray-400" />
              <span className="text-gray-600">{WEATHER.temp}°C</span>
            </div>
          </div>
        </div>

        {/* KPI 카드 */}
        {[
          { label: "비행중", value: stats.flying, icon: Plane, color: "#FF8A00", bg: "#FFF7ED", pulse: stats.flying > 0 },
          { label: "탑승중", value: stats.boarding, icon: Users, color: "#F59E0B", bg: "#FFFBEB", pulse: false },
          { label: "대기", value: stats.waiting + stats.confirmed, icon: Clock, color: "#2A7AE2", bg: "#EFF6FF", pulse: false },
          { label: "완료", value: stats.completed, icon: CheckCircle2, color: "#10B981", bg: "#ECFDF5", pulse: false },
        ].map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="rounded-2xl p-4 shadow-sm bg-white border border-gray-100 flex items-center gap-3">
              <span
                className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: card.bg }}
              >
                <Icon
                  size={18}
                  style={{ color: card.color }}
                  className={card.pulse ? "animate-pulse" : ""}
                />
              </span>
              <div>
                <div className="text-2xl font-bold" style={{ color: "#0D2B52" }}>{card.value}</div>
                <div className="text-xs text-gray-400">{card.label}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 진행 바 */}
      <div className="bg-white rounded-2xl px-5 py-3.5 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium" style={{ color: "#0D2B52" }}>
            오늘 진행률
          </span>
          <span className="text-sm text-gray-500">
            {stats.completed}완료 / {flights.filter((f) => f.status !== "cancelled").length}건
          </span>
        </div>
        <div className="flex rounded-full overflow-hidden h-3">
          {(["completed", "landed", "flying", "boarding", "waiting", "confirmed"] as FlightStatus[]).map((s) => {
            const cnt = stats[s];
            if (!cnt) return null;
            const pct = (cnt / flights.length) * 100;
            return (
              <div
                key={s}
                title={`${STATUS_CFG[s].label}: ${cnt}건`}
                style={{ width: `${pct}%`, background: STATUS_CFG[s].dot, transition: "width 0.5s" }}
              />
            );
          })}
          {stats.cancelled > 0 && (
            <div
              style={{ width: `${(stats.cancelled / flights.length) * 100}%`, background: "#FCA5A5" }}
              title={`취소: ${stats.cancelled}건`}
            />
          )}
        </div>
        <div className="flex flex-wrap gap-3 mt-2">
          {(Object.entries(STATUS_CFG) as [FlightStatus, typeof STATUS_CFG[FlightStatus]][])
            .filter(([s]) => stats[s] > 0)
            .map(([s, cfg]) => (
              <span key={s} className="flex items-center gap-1 text-xs text-gray-500">
                <span className="w-2 h-2 rounded-full" style={{ background: cfg.dot }} />
                {cfg.label} {stats[s]}
              </span>
            ))}
        </div>
      </div>

      {/* 필터 탭 + 비행 카드 */}
      <div className="grid grid-cols-3 gap-5">
        {/* 좌: 비행 목록 */}
        <div className="col-span-2 space-y-4">
          {/* 필터 */}
          <div className="flex gap-1.5 flex-wrap">
            {FILTER_TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => setFilter(t.key)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium transition-all"
                style={{
                  background: filter === t.key ? "#0D2B52" : "#fff",
                  color: filter === t.key ? "#fff" : "#6B7280",
                  border: `1px solid ${filter === t.key ? "#0D2B52" : "#E5E7EB"}`,
                }}
              >
                {t.label}
                {t.count > 0 && (
                  <span
                    className="text-xs rounded-full px-1.5 py-0.5 font-semibold"
                    style={{
                      background: filter === t.key ? "#ffffff33" : "#F3F4F6",
                      color: filter === t.key ? "#fff" : "#374151",
                    }}
                  >
                    {t.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* 비행 카드 목록 */}
          <div className="space-y-3">
            {visibleFlights.map((flight) => (
              <FlightCard
                key={flight.id}
                flight={flight}
                onAdvance={handleAdvance}
                onIncident={(fid, name) => setIncidentModal({ flightId: fid, name })}
              />
            ))}
            {visibleFlights.length === 0 && (
              <div className="text-center py-10 text-gray-400 text-sm">
                해당 상태의 비행이 없습니다.
              </div>
            )}
          </div>
        </div>

        {/* 우: 이상 상황 로그 */}
        <div className="col-span-1">
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 sticky top-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-sm" style={{ color: "#0D2B52" }}>
                이상 상황 기록
              </h2>
              <button
                onClick={() => setShowIncidentDirect(true)}
                className="p-1.5 hover:bg-gray-100 rounded-lg"
              >
                <Plus size={14} className="text-gray-400" />
              </button>
            </div>

            {incidents.length === 0 ? (
              <div className="text-center py-8 text-gray-300 text-sm">
                <FileText size={28} className="mx-auto mb-2 opacity-40" />
                기록 없음
              </div>
            ) : (
              <div className="space-y-3">
                {incidents.map((inc) => {
                  const sColor = inc.severity === "critical" ? "#EF4444" : inc.severity === "warning" ? "#F59E0B" : "#2A7AE2";
                  const sBg = inc.severity === "critical" ? "#FEF2F2" : inc.severity === "warning" ? "#FFFBEB" : "#EFF6FF";
                  return (
                    <div
                      key={inc.id}
                      className="rounded-xl p-3 text-xs"
                      style={{ background: sBg, borderLeft: `3px solid ${sColor}` }}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold" style={{ color: sColor }}>
                          {inc.severity === "critical" ? "긴급" : inc.severity === "warning" ? "주의" : "일반"}
                          {inc.customerName && ` · ${inc.customerName}`}
                        </span>
                        <span className="text-gray-400">{inc.time}</span>
                      </div>
                      <p className="text-gray-600 leading-relaxed">{inc.content}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 이상 상황 모달 */}
      {(incidentModal || showIncidentDirect) && (
        <IncidentModal
          flightId={incidentModal?.flightId ?? null}
          customerName={incidentModal?.name ?? null}
          onClose={() => { setIncidentModal(null); setShowIncidentDirect(false); }}
          onSubmit={handleIncidentSubmit}
        />
      )}
    </div>
  );
}
