"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Wind,
  Eye,
  Thermometer,
  CheckCircle2,
  Clock,
  Plane,
  TrendingUp,
  Bell,
  PlusCircle,
  BookOpen,
  Calculator,
  AlertTriangle,
  ChevronRight,
  CloudSun,
  RefreshCw,
} from "lucide-react";

// ─── 타입 ────────────────────────────────────────────────────────
type BookingStatus = "pending" | "confirmed" | "flying" | "completed" | "cancelled";
type UIStatus = "completed" | "flying" | "waiting" | "confirmed" | "cancelled";

interface Booking {
  id: string;
  booking_no: string;
  customer_name: string;
  product_name: string;
  total_price: number;
  headcount: number;
  flight_date: string;
  flight_time: string;
  status: BookingStatus;
  pilot_id: string | null;
  pilots: { id: string; name: string } | null;
  memo: string | null;
}

interface WeatherInfo {
  grade: "GREEN" | "YELLOW" | "RED";
  wind?: number;
  temp?: number;
  windDir?: string;
  description?: string;
}

function calcGrade(wind: number, precipType: number): "GREEN" | "YELLOW" | "RED" {
  if (precipType > 0) return "RED";
  if (wind >= 8) return "RED";
  if (wind >= 5) return "YELLOW";
  return "GREEN";
}

// ─── 헬퍼 ────────────────────────────────────────────────────────
function toUIStatus(s: BookingStatus): UIStatus {
  return s === "pending" ? "waiting" : (s as UIStatus);
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function formatDateKo(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  const days = ["일", "월", "화", "수", "목", "금", "토"];
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일 (${days[d.getDay()]})`;
}

function formatTime() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

// ─── 날씨 설정 ───────────────────────────────────────────────────
const GRADE_CFG = {
  GREEN:  { label: "비행하기 좋은 날씨", bg: "#DCFCE7", color: "#15803D", iconBg: "#DCFCE7" },
  YELLOW: { label: "비행 주의 필요",     bg: "#FFFBEB", color: "#D97706", iconBg: "#FFFBEB" },
  RED:    { label: "비행 불가 날씨",     bg: "#FEF2F2", color: "#DC2626", iconBg: "#FEF2F2" },
};

// ─── 상태 배지 ────────────────────────────────────────────────────
const STATUS_CFG: Record<UIStatus, { label: string; color: string; bg: string; dot: string }> = {
  completed: { label: "완료",   color: "#15803D", bg: "#DCFCE7", dot: "#22C55E" },
  flying:    { label: "비행중", color: "#C2410C", bg: "#FFF7ED", dot: "#FF8A00" },
  waiting:   { label: "대기중", color: "#0369A1", bg: "#E0F2FE", dot: "#0EA5E9" },
  confirmed: { label: "확정",   color: "#1D4ED8", bg: "#DBEAFE", dot: "#3B82F6" },
  cancelled: { label: "취소",   color: "#9CA3AF", bg: "#F3F4F6", dot: "#D1D5DB" },
};

function StatusBadge({ status }: { status: UIStatus }) {
  const c = STATUS_CFG[status];
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
      style={{ color: c.color, backgroundColor: c.bg }}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: c.dot }} />
      {c.label}
    </span>
  );
}

function TimelineDot({ status }: { status: UIStatus }) {
  if (status === "completed") return (
    <div className="w-8 h-8 rounded-full flex items-center justify-center z-10 flex-shrink-0" style={{ backgroundColor: "#DCFCE7" }}>
      <CheckCircle2 className="w-4 h-4" style={{ color: "#22C55E" }} />
    </div>
  );
  if (status === "flying") return (
    <div className="w-8 h-8 rounded-full flex items-center justify-center z-10 flex-shrink-0 animate-pulse" style={{ backgroundColor: "#FFF7ED" }}>
      <Plane className="w-4 h-4" style={{ color: "#FF8A00" }} />
    </div>
  );
  if (status === "cancelled") return (
    <div className="w-8 h-8 rounded-full flex items-center justify-center z-10 flex-shrink-0" style={{ backgroundColor: "#F3F4F6" }}>
      <span className="text-gray-300 text-xs font-bold">✕</span>
    </div>
  );
  return (
    <div className="w-8 h-8 rounded-full flex items-center justify-center z-10 flex-shrink-0" style={{ backgroundColor: "#EEF4FD", border: "2px solid #2A7AE2" }}>
      <Clock className="w-3.5 h-3.5" style={{ color: "#2A7AE2" }} />
    </div>
  );
}

// ─── 메인 ────────────────────────────────────────────────────────
export default function DashboardPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [weather, setWeather] = useState<WeatherInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(formatTime());

  // 1분마다 시각 갱신
  useEffect(() => {
    const t = setInterval(() => setNow(formatTime()), 60_000);
    return () => clearInterval(t);
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [bRes, wRes] = await Promise.all([
        fetch(`/api/bookings?date=${todayStr()}`),
        fetch("/api/weather"),
      ]);
      if (bRes.ok) setBookings(await bRes.json());
      if (wRes.ok) {
        const w = await wRes.json();
        // /api/weather 응답: { current: { wind, temp, windDir, precipType, updatedAt }, ... }
        const cur = w.current ?? w;
        const wind = cur.wind ?? 0;
        const grade = calcGrade(wind, cur.precipType ?? 0);
        setWeather({
          grade,
          wind,
          temp:        cur.temp,
          windDir:     cur.windDir,
          description: cur.windDir ? `${cur.windDir} ${wind}m/s` : undefined,
        });
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── KPI 계산 ──
  const active    = bookings.filter(b => b.status !== "cancelled");
  const completed = bookings.filter(b => b.status === "completed").length;
  const flying    = bookings.filter(b => b.status === "flying").length;
  const waiting   = bookings.filter(b => b.status === "pending" || b.status === "confirmed").length;
  const total     = active.length;
  const cancelled = bookings.filter(b => b.status === "cancelled").length;
  const revenue   = active.reduce((s, b) => s + b.total_price, 0);

  // ── 파일럿별 집계 ──
  const pilotMap: Record<string, { name: string; total: number; completed: number; flying: boolean }> = {};
  for (const b of active) {
    const pName = b.pilots?.name ?? "미배정";
    if (!pilotMap[pName]) pilotMap[pName] = { name: pName, total: 0, completed: 0, flying: false };
    pilotMap[pName].total++;
    if (b.status === "completed") pilotMap[pName].completed++;
    if (b.status === "flying")   pilotMap[pName].flying = true;
  }
  const pilots = Object.values(pilotMap).sort((a, b) => b.total - a.total);

  const sortedBookings = [...bookings].sort((a, b) => a.flight_time.localeCompare(b.flight_time));

  const grade   = weather?.grade ?? "GREEN";
  const gradeCfg = GRADE_CFG[grade];

  return (
    <div className="p-6 max-w-7xl">

      {/* ── 헤더 ── */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <p className="text-sm text-gray-400">{formatDateKo(todayStr())} · 현재 {now}</p>
          <h1 className="text-2xl font-bold mt-0.5" style={{ color: "#0D2B52" }}>
            오늘의 구름상회 ☁️
          </h1>
        </div>
        <div className="flex items-center gap-3">
          {/* 날씨 배지 */}
          <div className="flex items-center gap-3 bg-white rounded-2xl px-5 py-3 shadow-sm border border-gray-100">
            <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ backgroundColor: gradeCfg.iconBg }}>
              <CloudSun className="w-5 h-5" style={{ color: gradeCfg.color }} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: gradeCfg.bg, color: gradeCfg.color }}>
                  {grade}
                </span>
                <span className="text-sm font-semibold text-gray-800">{gradeCfg.label}</span>
              </div>
              <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-400">
                {weather?.wind != null && <span className="flex items-center gap-1"><Wind className="w-3 h-3" /> {weather.windDir} {weather.wind}m/s</span>}
                {weather?.temp != null && <span className="flex items-center gap-1"><Thermometer className="w-3 h-3" /> {weather.temp}°C</span>}
              </div>
            </div>
          </div>
          {/* 새로고침 */}
          <button onClick={fetchData} className="p-2 rounded-xl bg-white border border-gray-100 shadow-sm hover:bg-gray-50">
            <RefreshCw className={`w-4 h-4 text-gray-400 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* ── KPI ── */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          {
            label: "오늘 총 예약", value: total, unit: "건",
            icon: BookOpen, iconBg: "#EEF4FD", iconColor: "#2A7AE2",
            sub: `취소 ${cancelled}건 제외`,
          },
          {
            label: "비행 완료", value: completed, unit: "건",
            icon: CheckCircle2, iconBg: "#DCFCE7", iconColor: "#22C55E",
            sub: total > 0 ? `오늘 목표 ${total}건 중` : "예약 없음",
          },
          {
            label: "현재 비행 중", value: flying, unit: "명",
            icon: Plane, iconBg: "#FFF7ED", iconColor: "#FF8A00",
            sub: "실시간",
          },
          {
            label: "오늘 매출", value: Math.floor(revenue / 10000), unit: "만원",
            icon: TrendingUp, iconBg: "#F0FDF4", iconColor: "#15803D",
            sub: `${revenue.toLocaleString()}원 확정`,
          },
        ].map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <div className="flex items-start justify-between mb-3">
                <p className="text-xs text-gray-400">{card.label}</p>
                <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: card.iconBg }}>
                  <Icon className="w-4 h-4" style={{ color: card.iconColor }} />
                </div>
              </div>
              <p className="text-2xl font-bold" style={{ color: "#0D2B52" }}>
                {loading ? "—" : card.value}
                <span className="text-sm font-normal text-gray-400 ml-1">{card.unit}</span>
              </p>
              <p className="text-xs text-gray-400 mt-1">{card.sub}</p>
            </div>
          );
        })}
      </div>

      {/* ── 본문 ── */}
      <div className="grid grid-cols-3 gap-4">

        {/* 왼쪽: 비행 타임라인 */}
        <div className="col-span-2 space-y-4">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
              <div>
                <h2 className="font-semibold text-gray-900">오늘 비행 일정</h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  {completed}건 완료 · {flying}건 비행 중 · {waiting}건 대기
                </p>
              </div>
              {total > 0 && (
                <div className="flex items-center gap-2">
                  <div className="w-32 h-2 rounded-full bg-gray-100 overflow-hidden">
                    <div className="h-full rounded-full transition-all"
                      style={{ width: `${Math.round((completed / total) * 100)}%`, backgroundColor: "#FF8A00" }} />
                  </div>
                  <span className="text-xs text-gray-400">{completed}/{total}</span>
                </div>
              )}
            </div>

            <div className="px-5 py-4">
              {loading ? (
                <p className="text-sm text-gray-400 text-center py-8">불러오는 중…</p>
              ) : sortedBookings.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8">오늘 예약이 없습니다</p>
              ) : (
                <div className="relative">
                  <div className="absolute left-[15px] top-4 bottom-4 w-px bg-gray-100" />
                  <div className="space-y-3">
                    {sortedBookings.map((b) => {
                      const ui = toUIStatus(b.status);
                      const isCurrent = ui === "flying";
                      const isPast    = ui === "completed" || ui === "cancelled";
                      const pilotName = b.pilots?.name ?? "미배정";
                      return (
                        <div key={b.id}
                          className={`flex items-center gap-4 p-3 rounded-xl transition-colors ${isCurrent ? "border" : "hover:bg-gray-50"}`}
                          style={isCurrent ? { backgroundColor: "#FFF7ED", borderColor: "#FDBA74" } : {}}>
                          <TimelineDot status={ui} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className={`text-sm font-bold tabular-nums ${isPast && ui !== "cancelled" ? "text-gray-400" : isCurrent ? "" : "text-gray-800"}`}
                                style={isCurrent ? { color: "#FF8A00" } : {}}>
                                {b.flight_time}
                              </span>
                              <span className={`text-sm font-medium truncate ${ui === "cancelled" ? "text-gray-300 line-through" : "text-gray-800"}`}>
                                {b.customer_name}
                                {b.headcount > 1 && <span className="text-gray-400 text-xs ml-1">{b.headcount}인</span>}
                              </span>
                              {ui !== "cancelled" && (
                                <span className="text-xs text-gray-400 truncate">{b.product_name}</span>
                              )}
                            </div>
                            {ui !== "cancelled" && (
                              <p className="text-xs text-gray-400 mt-0.5">
                                파일럿 {pilotName}
                                {isCurrent && <span className="animate-pulse" style={{ color: "#FF8A00" }}> · 비행 중...</span>}
                              </p>
                            )}
                          </div>
                          <StatusBadge status={ui} />
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 빠른 이동 */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "새 예약 입력", sub: "유선·현장 접수", href: "/admin/bookings/new", icon: PlusCircle, color: "#2A7AE2", bg: "#EEF4FD" },
              { label: "예약대장",     sub: "전체 예약 조회", href: "/admin/bookings",     icon: BookOpen,   color: "#0369A1", bg: "#E0F2FE" },
              { label: "계산대",       sub: "매출 & 정산",   href: "/admin/settlement",   icon: Calculator, color: "#15803D", bg: "#DCFCE7" },
            ].map((action) => {
              const Icon = action.icon;
              return (
                <Link key={action.href} href={action.href}
                  className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center gap-3 hover:shadow-md transition-shadow group">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: action.bg }}>
                    <Icon className="w-5 h-5" style={{ color: action.color }} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-800 group-hover:text-blue-600 transition-colors">{action.label}</p>
                    <p className="text-xs text-gray-400">{action.sub}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-300 ml-auto flex-shrink-0 group-hover:text-blue-400 transition-colors" />
                </Link>
              );
            })}
          </div>
        </div>

        {/* 오른쪽 */}
        <div className="space-y-4">

          {/* 파일럿 현황 */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-50">
              <h2 className="font-semibold text-gray-900">파일럿 현황</h2>
              <p className="text-xs text-gray-400 mt-0.5">오늘 배정 현황</p>
            </div>
            <div className="p-4 space-y-4">
              {loading ? (
                <p className="text-sm text-gray-400 text-center py-4">불러오는 중…</p>
              ) : pilots.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">배정된 파일럿 없음</p>
              ) : pilots.map((p) => {
                const ratio = p.total > 0 ? p.completed / p.total : 0;
                return (
                  <div key={p.name}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                          style={{ backgroundColor: "#0D2B52" }}>
                          {p.name[0]}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-800">{p.name}</p>
                          <p className="text-xs text-gray-400">{p.completed}/{p.total}건</p>
                        </div>
                      </div>
                      {p.flying ? (
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium animate-pulse" style={{ backgroundColor: "#FFF7ED", color: "#FF8A00" }}>비행 중</span>
                      ) : p.completed === p.total && p.total > 0 ? (
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: "#DCFCE7", color: "#15803D" }}>완료</span>
                      ) : (
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: "#F3F4F6", color: "#9CA3AF" }}>대기</span>
                      )}
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-gray-100 overflow-hidden">
                      <div className="h-full rounded-full transition-all"
                        style={{ width: `${Math.round(ratio * 100)}%`, backgroundColor: p.flying ? "#FF8A00" : "#22C55E" }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 최근 알림 (정적 — 추후 알림 API 연동) */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
              <h2 className="font-semibold text-gray-900">최근 알림</h2>
              <Bell className="w-4 h-4 text-gray-300" />
            </div>
            <div className="px-5 py-8 text-center">
              <p className="text-xs text-gray-400">알림 기능 준비 중</p>
            </div>
            <div className="px-5 py-3 border-t border-gray-50">
              <Link href="/admin/notifications"
                className="text-xs font-medium flex items-center gap-1 hover:underline" style={{ color: "#2A7AE2" }}>
                전체 알림 보기 <ChevronRight className="w-3 h-3" />
              </Link>
            </div>
          </div>

          {/* 날씨 주의 */}
          {grade !== "GREEN" && (
            <div className="rounded-2xl p-4 border" style={{
              backgroundColor: grade === "RED" ? "#FEF2F2" : "#FFFBEB",
              borderColor: grade === "RED" ? "#FCA5A5" : "#FCD34D",
            }}>
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: gradeCfg.color }} />
                <div>
                  <p className="text-xs font-semibold" style={{ color: gradeCfg.color }}>날씨 주의</p>
                  <p className="text-xs mt-1" style={{ color: gradeCfg.color }}>
                    현재 날씨 등급 {grade} — {gradeCfg.label}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
