"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Wind,
  Eye,
  Thermometer,
  CheckCircle2,
  Clock,
  Plane,
  Users,
  TrendingUp,
  Bell,
  PlusCircle,
  BookOpen,
  Calculator,
  AlertTriangle,
  ChevronRight,
  CloudSun,
} from "lucide-react";

// ─── Mock Data ────────────────────────────────────────────────────────────────

type FlightStatus = "completed" | "flying" | "waiting" | "confirmed" | "cancelled";

interface Flight {
  id: string;
  time: string;
  customer: string;
  product: string;
  pilot: string;
  status: FlightStatus;
  landed_at?: string;
}

const TODAY_FLIGHTS: Flight[] = [
  { id: "BK-20260501-1021", time: "09:00", customer: "이수진",  product: "베이직",           pilot: "박구름", status: "completed", landed_at: "09:14" },
  { id: "BK-20260501-1045", time: "10:30", customer: "최현우",  product: "베이직+사진",       pilot: "박구름", status: "completed", landed_at: "10:43" },
  { id: "BK-20260501-2233", time: "12:00", customer: "서지훈",  product: "익스트림",          pilot: "김하늘", status: "completed", landed_at: "12:18" },
  { id: "BK-20260501-9970", time: "13:00", customer: "김민준",  product: "베이직+사진",       pilot: "박구름", status: "flying" },
  { id: "BK-20260501-5511", time: "14:00", customer: "강미라",  product: "베이직",            pilot: "—",     status: "cancelled" },
  { id: "BK-20260501-3012", time: "15:00", customer: "박지연",  product: "VIP+사진+영상",     pilot: "이바람", status: "waiting" },
  { id: "BK-20260501-7788", time: "17:00", customer: "김태현",  product: "베이직",            pilot: "김하늘", status: "confirmed" },
  { id: "BK-20260501-4422", time: "16:30", customer: "정성민",  product: "익스트림",          pilot: "이바람", status: "waiting" },
];

const PILOTS = [
  { name: "박구름", total: 4, completed: 2, flying: 1, status: "flying" as const },
  { name: "김하늘", total: 2, completed: 1, flying: 0, status: "idle" as const },
  { name: "이바람", total: 2, completed: 0, flying: 0, status: "idle" as const },
];

const NOTIFICATIONS = [
  { type: "info",    time: "13:02", message: "김민준 고객 비행 시작 — 박구름 파일럿" },
  { type: "success", time: "12:18", message: "서지훈 고객 착륙 완료 — 김하늘 파일럿" },
  { type: "warning", time: "11:45", message: "강미라 고객 예약 취소 접수" },
  { type: "success", time: "10:43", message: "최현우 고객 착륙 완료 — 박구름 파일럿" },
];

// ─── Status Helpers ───────────────────────────────────────────────────────────

const STATUS_CFG: Record<FlightStatus, { label: string; color: string; bg: string; dot: string }> = {
  completed: { label: "완료",   color: "#15803D", bg: "#DCFCE7", dot: "#22C55E" },
  flying:    { label: "비행중", color: "#C2410C", bg: "#FFF7ED", dot: "#FF8A00" },
  waiting:   { label: "대기중", color: "#0369A1", bg: "#E0F2FE", dot: "#0EA5E9" },
  confirmed: { label: "확정",   color: "#1D4ED8", bg: "#DBEAFE", dot: "#3B82F6" },
  cancelled: { label: "취소",   color: "#9CA3AF", bg: "#F3F4F6", dot: "#D1D5DB" },
};

function StatusBadge({ status }: { status: FlightStatus }) {
  const c = STATUS_CFG[status];
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
      style={{ color: c.color, backgroundColor: c.bg }}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: c.dot }} />
      {c.label}
    </span>
  );
}

// ─── Timeline Dot ─────────────────────────────────────────────────────────────

function TimelineDot({ status }: { status: FlightStatus }) {
  if (status === "completed") {
    return (
      <div className="w-8 h-8 rounded-full flex items-center justify-center z-10 flex-shrink-0"
        style={{ backgroundColor: "#DCFCE7" }}>
        <CheckCircle2 className="w-4 h-4" style={{ color: "#22C55E" }} />
      </div>
    );
  }
  if (status === "flying") {
    return (
      <div className="w-8 h-8 rounded-full flex items-center justify-center z-10 flex-shrink-0 animate-pulse"
        style={{ backgroundColor: "#FFF7ED" }}>
        <Plane className="w-4 h-4" style={{ color: "#FF8A00" }} />
      </div>
    );
  }
  if (status === "cancelled") {
    return (
      <div className="w-8 h-8 rounded-full flex items-center justify-center z-10 flex-shrink-0"
        style={{ backgroundColor: "#F3F4F6" }}>
        <span className="text-gray-300 text-xs font-bold">✕</span>
      </div>
    );
  }
  return (
    <div className="w-8 h-8 rounded-full flex items-center justify-center z-10 flex-shrink-0"
      style={{ backgroundColor: "#EEF4FD", border: "2px solid #2A7AE2" }}>
      <Clock className="w-3.5 h-3.5" style={{ color: "#2A7AE2" }} />
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const [now] = useState("13:05");

  const completed = TODAY_FLIGHTS.filter(f => f.status === "completed").length;
  const flying    = TODAY_FLIGHTS.filter(f => f.status === "flying").length;
  const remaining = TODAY_FLIGHTS.filter(f => f.status === "waiting" || f.status === "confirmed").length;
  const total     = TODAY_FLIGHTS.filter(f => f.status !== "cancelled").length;

  const sortedFlights = [...TODAY_FLIGHTS].sort((a, b) => a.time.localeCompare(b.time));

  return (
    <div className="p-6 max-w-7xl">

      {/* ── Header ── */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <p className="text-sm text-gray-400">2026년 5월 1일 (금) · 현재 {now}</p>
          <h1 className="text-2xl font-bold mt-0.5" style={{ color: "#0D2B52" }}>
            오늘의 구름상회 ☁️
          </h1>
        </div>
        {/* Weather badge */}
        <div className="flex items-center gap-3 bg-white rounded-2xl px-5 py-3 shadow-sm border border-gray-100">
          <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ backgroundColor: "#DCFCE7" }}>
            <CloudSun className="w-5 h-5" style={{ color: "#15803D" }} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: "#DCFCE7", color: "#15803D" }}>
                GREEN
              </span>
              <span className="text-sm font-semibold text-gray-800">비행하기 좋은 날씨</span>
            </div>
            <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-400">
              <span className="flex items-center gap-1"><Wind className="w-3 h-3" /> 2.8m/s</span>
              <span className="flex items-center gap-1"><Eye className="w-3 h-3" /> 가시거리 최상</span>
              <span className="flex items-center gap-1"><Thermometer className="w-3 h-3" /> 18°C</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: "오늘 총 예약", value: total,     unit: "건", icon: BookOpen,    iconBg: "#EEF4FD", iconColor: "#2A7AE2", sub: `취소 ${TODAY_FLIGHTS.filter(f=>f.status==="cancelled").length}건 제외` },
          { label: "비행 완료",   value: completed,  unit: "건", icon: CheckCircle2, iconBg: "#DCFCE7", iconColor: "#22C55E", sub: `오늘 목표 ${total}건 중` },
          { label: "현재 비행 중", value: flying,     unit: "명", icon: Plane,       iconBg: "#FFF7ED", iconColor: "#FF8A00", sub: "실시간" },
          { label: "오늘 매출",   value: "31",       unit: "만원", icon: TrendingUp, iconBg: "#F0FDF4", iconColor: "#15803D", sub: "310,000원 확정" },
        ].map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <div className="flex items-start justify-between mb-3">
                <p className="text-xs text-gray-400">{card.label}</p>
                <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: card.iconBg }}>
                  <Icon className="w-4 h-4" style={{ color: card.iconColor }} />
                </div>
              </div>
              <p className="text-2xl font-bold" style={{ color: "#0D2B52" }}>
                {card.value}
                <span className="text-sm font-normal text-gray-400 ml-1">{card.unit}</span>
              </p>
              <p className="text-xs text-gray-400 mt-1">{card.sub}</p>
            </div>
          );
        })}
      </div>

      {/* ── Main Content ── */}
      <div className="grid grid-cols-3 gap-4">

        {/* Left: Timeline (2/3) */}
        <div className="col-span-2 space-y-4">

          {/* Today's flight timeline */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
              <div>
                <h2 className="font-semibold text-gray-900">오늘 비행 일정</h2>
                <p className="text-xs text-gray-400 mt-0.5">{completed}건 완료 · {flying}건 비행 중 · {remaining}건 대기</p>
              </div>
              <div className="flex items-center gap-2">
                {/* Progress bar */}
                <div className="w-32 h-2 rounded-full bg-gray-100 overflow-hidden">
                  <div className="h-full rounded-full transition-all"
                    style={{ width: `${Math.round((completed / total) * 100)}%`, backgroundColor: "#FF8A00" }} />
                </div>
                <span className="text-xs text-gray-400">{completed}/{total}</span>
              </div>
            </div>

            <div className="px-5 py-4">
              <div className="relative">
                {/* Vertical line */}
                <div className="absolute left-[15px] top-4 bottom-4 w-px bg-gray-100" />

                <div className="space-y-3">
                  {sortedFlights.map((f) => {
                    const isCurrent = f.status === "flying";
                    const isPast = f.status === "completed" || f.status === "cancelled";
                    return (
                      <div key={f.id}
                        className={`flex items-center gap-4 p-3 rounded-xl transition-colors ${isCurrent ? "border" : "hover:bg-gray-50"}`}
                        style={isCurrent ? { backgroundColor: "#FFF7ED", borderColor: "#FDBA74" } : {}}>
                        <TimelineDot status={f.status} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className={`text-sm font-bold tabular-nums ${isPast && f.status !== "cancelled" ? "text-gray-400" : isCurrent ? "" : "text-gray-800"}`}
                              style={isCurrent ? { color: "#FF8A00" } : {}}>
                              {f.time}
                            </span>
                            <span className={`text-sm font-medium truncate ${f.status === "cancelled" ? "text-gray-300 line-through" : "text-gray-800"}`}>
                              {f.customer}
                            </span>
                            {f.status !== "cancelled" && (
                              <span className="text-xs text-gray-400 truncate">{f.product}</span>
                            )}
                          </div>
                          {f.status !== "cancelled" && (
                            <p className="text-xs text-gray-400 mt-0.5">
                              파일럿 {f.pilot}
                              {f.landed_at && <span style={{ color: "#22C55E" }}> · 착륙 {f.landed_at}</span>}
                              {isCurrent && <span className="animate-pulse" style={{ color: "#FF8A00" }}> · 비행 중...</span>}
                            </p>
                          )}
                        </div>
                        <StatusBadge status={f.status} />
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
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
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: action.bg }}>
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

        {/* Right Column (1/3) */}
        <div className="space-y-4">

          {/* Pilot Status */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-50">
              <h2 className="font-semibold text-gray-900">파일럿 현황</h2>
              <p className="text-xs text-gray-400 mt-0.5">오늘 배정 현황</p>
            </div>
            <div className="p-4 space-y-4">
              {PILOTS.map((p) => {
                const doneRatio = p.total > 0 ? (p.completed / p.total) : 0;
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
                      {p.status === "flying" ? (
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium animate-pulse"
                          style={{ backgroundColor: "#FFF7ED", color: "#FF8A00" }}>비행 중</span>
                      ) : p.completed === p.total && p.total > 0 ? (
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                          style={{ backgroundColor: "#DCFCE7", color: "#15803D" }}>완료</span>
                      ) : (
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                          style={{ backgroundColor: "#F3F4F6", color: "#9CA3AF" }}>대기</span>
                      )}
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-gray-100 overflow-hidden">
                      <div className="h-full rounded-full transition-all"
                        style={{
                          width: `${Math.round(doneRatio * 100)}%`,
                          backgroundColor: p.status === "flying" ? "#FF8A00" : "#22C55E",
                        }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Notifications */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
              <h2 className="font-semibold text-gray-900">최근 알림</h2>
              <Bell className="w-4 h-4 text-gray-300" />
            </div>
            <div className="divide-y divide-gray-50">
              {NOTIFICATIONS.map((n, i) => (
                <div key={i} className="px-4 py-3 flex items-start gap-3">
                  <div className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${
                    n.type === "success" ? "" : n.type === "warning" ? "" : ""
                  }`} style={{
                    backgroundColor:
                      n.type === "success" ? "#22C55E" :
                      n.type === "warning" ? "#F59E0B" : "#3B82F6",
                  }} />
                  <div className="min-w-0">
                    <p className="text-xs text-gray-600 leading-snug">{n.message}</p>
                    <p className="text-xs text-gray-300 mt-0.5">{n.time}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="px-5 py-3 border-t border-gray-50">
              <Link href="/admin/notifications"
                className="text-xs font-medium flex items-center gap-1 hover:underline"
                style={{ color: "#2A7AE2" }}>
                전체 알림 보기 <ChevronRight className="w-3 h-3" />
              </Link>
            </div>
          </div>

          {/* Today's Tip */}
          <div className="rounded-2xl p-4 border" style={{ backgroundColor: "#F0F7FF", borderColor: "#BFDBFE" }}>
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: "#2A7AE2" }} />
              <div>
                <p className="text-xs font-semibold" style={{ color: "#1D4ED8" }}>오늘 운영 메모</p>
                <p className="text-xs mt-1" style={{ color: "#3B82F6" }}>
                  오후 3시 이후 서풍 3–4m/s 예보. 15시 이후 예약 시 고객에게 사전 안내 권장.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
