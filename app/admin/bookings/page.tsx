"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import {
  Search,
  Phone,
  Calendar,
  Clock,
  ChevronRight,
  X,
  XCircle,
  Plane,
  CreditCard,
  MessageSquare,
  RefreshCw,
} from "lucide-react";
import Link from "next/link";

// ─── Types ────────────────────────────────────────────────────────────────────

type BookingStatus = "pending" | "confirmed" | "flying" | "completed" | "cancelled";

interface ApiBooking {
  id: string;
  booking_no: string;
  created_at: string;
  customer_name: string;
  customer_phone: string;
  headcount: number;
  product_name: string;
  product_price: number;
  options: { name: string; price: number }[];
  flight_date: string;
  flight_time: string;
  deposit_amount: number;
  balance_amount: number;
  total_price: number;
  status: BookingStatus;
  channel: "online" | "phone" | "walk-in";
  pilot_id: string | null;
  memo: string | null;
  pilots: { id: string; name: string } | null;
  // 멀티 파일럿 배정 (booking_pilots 조인)
  booking_pilots: { slot_no: number; pilot_id: string; pilots: { id: string; name: string } | null }[] | null;
}

// ─── Status Config ────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<BookingStatus, { label: string; color: string; bg: string; dot: string }> = {
  pending:   { label: "대기",       color: "#D97706", bg: "#FEF3C7", dot: "#F59E0B" },
  confirmed: { label: "파일럿배정", color: "#1D4ED8", bg: "#DBEAFE", dot: "#3B82F6" },
  flying:    { label: "비행",       color: "#C2410C", bg: "#FFF7ED", dot: "#FF8A00" },
  completed: { label: "비행완료",   color: "#15803D", bg: "#DCFCE7", dot: "#22C55E" },
  cancelled: { label: "취소",       color: "#9CA3AF", bg: "#F9FAFB", dot: "#D1D5DB" },
};

const CHANNEL_LABEL: Record<string, string> = {
  phone: "전화",
  "walk-in": "현장",
  online: "온라인",
};

const DATE_TABS = [
  { label: "오늘",   value: "today" },
  { label: "내일",   value: "tomorrow" },
  { label: "이번 주", value: "week" },
  { label: "전체",   value: "all" },
];

const STATUS_FILTER_TABS: { label: string; value: BookingStatus | "all" }[] = [
  { label: "전체",       value: "all" },
  { label: "대기",       value: "pending" },
  { label: "파일럿배정", value: "confirmed" },
  { label: "비행",       value: "flying" },
  { label: "비행완료",   value: "completed" },
  { label: "취소",       value: "cancelled" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** YYYY-MM-DD 반환 */
function isoDate(offset = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 10);
}

function weekRange(): { from: string; to: string } {
  const now  = new Date();
  const dow  = now.getDay(); // 0=Sun
  const from = new Date(now);
  from.setDate(now.getDate() - dow);
  const to   = new Date(from);
  to.setDate(from.getDate() + 6);
  return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) };
}

function StatusBadge({ status }: { status: BookingStatus }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
      style={{ color: cfg.color, backgroundColor: cfg.bg }}
    >
      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: cfg.dot }} />
      {cfg.label}
    </span>
  );
}

// ─── Detail Panel ─────────────────────────────────────────────────────────────

interface PilotOption { id: string; name: string; }

// 배정된 파일럿 목록을 slot_no 기준으로 정규화
function normalizeAssignedPilots(
  booking: ApiBooking,
): { slot_no: number; pilot_id: string; name: string }[] {
  const bpList = Array.isArray(booking.booking_pilots) ? booking.booking_pilots : [];
  return bpList
    .map((bp) => ({
      slot_no:  bp.slot_no,
      pilot_id: bp.pilot_id,
      name:     bp.pilots?.name ?? "미배정",
    }))
    .sort((a, b) => a.slot_no - b.slot_no);
}

function DetailPanel({
  booking,
  onClose,
  onStatusChange,
  onBookingUpdate,
}: {
  booking: ApiBooking;
  onClose: () => void;
  onStatusChange: (id: string, status: BookingStatus) => Promise<void>;
  onBookingUpdate: (updated: ApiBooking) => void;
}) {
  const [pilots, setPilots]             = useState<PilotOption[]>([]);
  const [assigning, setAssigning]       = useState<number | null>(null); // slot_no
  const [assignedPilots, setAssignedPilots] = useState(() => normalizeAssignedPilots(booking));

  // booking prop이 바뀌면 (외부에서 새로고침 후 업데이트) 동기화
  useEffect(() => {
    setAssignedPilots(normalizeAssignedPilots(booking));
  }, [booking.id, booking.booking_pilots]); // eslint-disable-line react-hooks/exhaustive-deps

  // 패널 열릴 때 파일럿 목록 조회
  useEffect(() => {
    fetch("/api/pilots?status=active")
      .then((r) => r.json())
      .then((data: PilotOption[]) => setPilots(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  // slot_no 슬롯에 파일럿 배정 또는 변경
  async function handleAssignSlot(slotNo: number, pilotId: string) {
    setAssigning(slotNo);
    try {
      // 기존 슬롯에 다른 파일럿이 있으면 먼저 제거
      const existing = assignedPilots.find((a) => a.slot_no === slotNo);
      if (existing && existing.pilot_id !== pilotId) {
        await fetch("/api/booking-pilots", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ booking_id: booking.id, pilot_id: existing.pilot_id }),
        });
      }
      if (!pilotId) {
        // 선택 해제 — 해당 슬롯 제거
        if (existing) {
          await fetch("/api/booking-pilots", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ booking_id: booking.id, pilot_id: existing.pilot_id }),
          });
        }
        setAssignedPilots((prev) => prev.filter((a) => a.slot_no !== slotNo));
      } else {
        // 배정
        const res = await fetch("/api/booking-pilots", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ booking_id: booking.id, pilot_id: pilotId, slot_no: slotNo }),
        });
        if (res.ok) {
          const pilot = pilots.find((p) => p.id === pilotId);
          setAssignedPilots((prev) => {
            const filtered = prev.filter((a) => a.slot_no !== slotNo && a.pilot_id !== pilotId);
            return [...filtered, { slot_no: slotNo, pilot_id: pilotId, name: pilot?.name ?? "" }]
              .sort((a, b) => a.slot_no - b.slot_no);
          });
          // 상위 상태도 업데이트 (booking_pilots 동기화)
          const bookingRes = await fetch(`/api/bookings/${booking.id}`);
          if (bookingRes.ok) onBookingUpdate(await bookingRes.json());
        }
      }
    } finally {
      setAssigning(null);
    }
  }

  const nextActions: { label: string; status: BookingStatus; color: string }[] = [];
  if (booking.status === "pending")
    nextActions.push({ label: "파일럿 배정", status: "confirmed", color: "#2A7AE2" });
  if (booking.status === "confirmed")
    nextActions.push({ label: "비행 시작", status: "flying", color: "#FF8A00" });
  if (booking.status === "flying")
    nextActions.push({ label: "비행 완료 처리", status: "completed", color: "#15803D" });

  const optionNames = (booking.options ?? []).map((o) =>
    typeof o === "string" ? o : o.name
  );

  return (
    <div className="fixed inset-0 z-40 flex" onClick={onClose}>
      <div className="flex-1 bg-black/20" />
      <div
        className="w-[400px] min-h-full bg-white shadow-2xl flex flex-col overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <p className="text-xs text-gray-400 font-mono">{booking.booking_no}</p>
            <p className="font-semibold text-gray-900 mt-0.5">{booking.customer_name} 고객</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-100 transition-colors"
          >
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        <div className="flex-1 p-5 space-y-5">
          {/* Status + channel */}
          <div className="flex items-center justify-between">
            <StatusBadge status={booking.status} />
            <span className="text-xs text-gray-400">
              {CHANNEL_LABEL[booking.channel] ?? booking.channel} 예약 ·{" "}
              {booking.created_at?.slice(0, 16).replace("T", " ")} 접수
            </span>
          </div>

          {/* Customer */}
          <div className="bg-gray-50 rounded-xl p-4 space-y-2.5">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">고객 정보</p>
            <div className="flex items-center gap-3">
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
                style={{ backgroundColor: "#0D2B52" }}
              >
                {booking.customer_name[0]}
              </div>
              <div>
                <p className="font-semibold text-gray-900 text-sm">
                  {booking.customer_name}
                  {booking.headcount > 1 && (
                    <span
                      className="ml-1.5 px-1.5 py-0.5 rounded-full text-xs font-bold text-white"
                      style={{ backgroundColor: "#FF8A00" }}
                    >
                      {booking.headcount}인
                    </span>
                  )}
                </p>
                <p className="text-sm text-gray-500">{booking.customer_phone}</p>
              </div>
            </div>
            <a
              href={`tel:${booking.customer_phone.replace(/-/g, "")}`}
              className="flex items-center justify-center gap-2 w-full py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-100 transition-colors"
            >
              <Phone className="w-3.5 h-3.5" />
              전화 연결
            </a>
          </div>

          {/* Schedule */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">체험 비행 일정</p>
            <div className="flex items-center gap-3 text-sm text-gray-700">
              <Calendar className="w-4 h-4 text-gray-400" />
              <span className="font-medium">{booking.flight_date}</span>
              <span className="text-gray-400">·</span>
              <Clock className="w-4 h-4 text-gray-400" />
              <span className="font-medium">{booking.flight_time}</span>
            </div>
          </div>

          {/* 파일럿 배정 — headcount 기준 멀티 슬롯 */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">파일럿 배정</p>
              <span
                className="text-xs font-bold px-2 py-0.5 rounded-full"
                style={{
                  background: assignedPilots.length >= booking.headcount ? "#DCFCE7" : "#FEF3C7",
                  color:      assignedPilots.length >= booking.headcount ? "#15803D" : "#D97706",
                }}
              >
                {assignedPilots.length}/{booking.headcount}명 배정
              </span>
            </div>
            <div className="space-y-2">
              {Array.from({ length: booking.headcount }, (_, i) => {
                const slotNo    = i + 1;
                const assigned  = assignedPilots.find((a) => a.slot_no === slotNo);
                const isLoading = assigning === slotNo;
                // 이미 다른 슬롯에 배정된 파일럿 제외
                const usedIds = assignedPilots
                  .filter((a) => a.slot_no !== slotNo)
                  .map((a) => a.pilot_id);
                return (
                  <div
                    key={slotNo}
                    className="rounded-xl px-3 py-2.5"
                    style={{
                      background: assigned ? "#F0FDF4" : "#FAFAFA",
                      border: `1px solid ${assigned ? "#BBF7D0" : "#E5E7EB"}`,
                    }}
                  >
                    <div className="flex items-center gap-2 mb-1.5">
                      <span
                        className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                        style={{ background: assigned ? "#059669" : "#9CA3AF" }}
                      >
                        {slotNo}
                      </span>
                      <span className="text-xs font-medium" style={{ color: assigned ? "#065F46" : "#6B7280" }}>
                        {assigned ? `${assigned.name} 배정됨` : `${slotNo}번 탑승객 — 미배정`}
                      </span>
                    </div>
                    <select
                      disabled={isLoading}
                      value={assigned?.pilot_id ?? ""}
                      onChange={(e) => handleAssignSlot(slotNo, e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-gray-200 text-sm bg-white text-gray-800 focus:outline-none focus:border-blue-400 disabled:opacity-60"
                    >
                      <option value="">— 파일럿 선택 —</option>
                      {pilots
                        .filter((p) => !usedIds.includes(p.id))
                        .map((p) => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                    </select>
                    {isLoading && <p className="text-xs text-gray-400 mt-1">배정 중...</p>}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Product */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">상품 정보</p>
            <div className="bg-gray-50 rounded-xl p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="font-medium text-gray-800">{booking.product_name}</span>
                <span className="text-gray-600">{booking.product_price?.toLocaleString()}원</span>
              </div>
              {optionNames.map((opt) => (
                <div key={opt} className="flex justify-between text-sm">
                  <span className="text-gray-600">+ {opt}</span>
                  <span className="text-gray-400">옵션</span>
                </div>
              ))}
              <div className="border-t border-gray-200 pt-2 flex justify-between text-sm font-semibold">
                <span>총 금액</span>
                <span style={{ color: "#0D2B52" }}>{booking.total_price?.toLocaleString()}원</span>
              </div>
            </div>
          </div>

          {/* Payment */}
          <div className="bg-amber-50 rounded-xl p-4 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-amber-600" />
                <span className="text-sm text-gray-700">예약금 결제</span>
              </div>
              <span className="font-semibold text-sm" style={{ color: "#0D2B52" }}>
                {booking.deposit_amount?.toLocaleString()}원
              </span>
            </div>
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>현장 결제 (잔금)</span>
              <span className="font-medium">{booking.balance_amount?.toLocaleString()}원</span>
            </div>
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>총액</span>
              <span className="font-medium" style={{ color: "#0D2B52" }}>
                {booking.total_price?.toLocaleString()}원
              </span>
            </div>
          </div>

          {/* Memo */}
          {booking.memo && (
            <div className="flex gap-2 bg-gray-50 rounded-xl p-4">
              <MessageSquare className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-gray-600">{booking.memo}</p>
            </div>
          )}

          {/* Actions */}
          {nextActions.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">상태 변경</p>
              {nextActions.map((action) => (
                <button
                  key={action.status}
                  onClick={() => onStatusChange(booking.id, action.status)}
                  className="flex items-center justify-between w-full px-4 py-3 rounded-xl text-sm font-medium text-white transition-opacity hover:opacity-90"
                  style={{ backgroundColor: action.color }}
                >
                  <span>{action.label}</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              ))}
            </div>
          )}

          {/* Cancel */}
          {booking.status !== "cancelled" && booking.status !== "completed" && (
            <button
              onClick={() => onStatusChange(booking.id, "cancelled")}
              className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl border border-red-200 text-sm text-red-500 hover:bg-red-50 transition-colors"
            >
              <XCircle className="w-4 h-4" />
              예약 취소
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function BookingsPage() {
  const [dateTab, setDateTab]         = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<BookingStatus | "all">("all");
  const [search, setSearch]           = useState("");
  const [bookings, setBookings]       = useState<ApiBooking[]>([]);
  const [loading, setLoading]         = useState(true);
  const [selectedBooking, setSelectedBooking] = useState<ApiBooking | null>(null);

  // 오늘 날짜 기준 표시
  const todayLabel = new Date().toLocaleDateString("ko-KR", {
    year: "numeric", month: "long", day: "numeric", weekday: "short",
  });

  // ── 데이터 패치 ─────────────────────────────────────────────────
  const fetchBookings = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (dateTab === "today")    params.set("date", isoDate(0));
      if (dateTab === "tomorrow") params.set("date", isoDate(1));
      if (dateTab === "week") {
        const { from, to } = weekRange();
        params.set("date_from", from);
        params.set("date_to", to);
      }
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (search.trim()) params.set("search", search.trim());

      const res  = await fetch(`/api/bookings?${params.toString()}`);
      const data = await res.json();
      setBookings(Array.isArray(data) ? data : []);
    } catch {
      setBookings([]);
    } finally {
      setLoading(false);
    }
  }, [dateTab, statusFilter, search]);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  // ── 상태 변경 ────────────────────────────────────────────────────
  const handleStatusChange = async (id: string, status: BookingStatus) => {
    const res = await fetch(`/api/bookings/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      const updated = await res.json();
      setBookings((prev) => prev.map((b) => (b.id === id ? updated : b)));
      setSelectedBooking((prev) => (prev?.id === id ? updated : prev));
    }
  };

  // ── 예약 데이터 업데이트 (멀티 파일럿 배정 후 동기화용) ────────
  const handleBookingUpdate = (updated: ApiBooking) => {
    setBookings((prev) => prev.map((b) => (b.id === updated.id ? updated : b)));
    setSelectedBooking((prev) => (prev?.id === updated.id ? updated : prev));
  };

  // ── 클라이언트 필터 (검색은 API에서 처리하지만 즉각 반응용) ────
  const filtered = useMemo(() => {
    if (!search.trim()) return bookings;
    const q = search.toLowerCase();
    return bookings.filter(
      (b) =>
        b.customer_name.toLowerCase().includes(q) ||
        b.customer_phone.includes(q) ||
        b.booking_no.toLowerCase().includes(q)
    );
  }, [bookings, search]);

  // ── 통계 ─────────────────────────────────────────────────────────
  const stats = useMemo(() => ({
    total:     bookings.length,
    waiting:   bookings.filter((b) => b.status === "pending" || b.status === "confirmed").length,
    flying:    bookings.filter((b) => b.status === "flying").length,
    completed: bookings.filter((b) => b.status === "completed").length,
    cancelled: bookings.filter((b) => b.status === "cancelled").length,
  }), [bookings]);

  return (
    <>
      <div className="p-6 max-w-7xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: "#0D2B52" }}>예약대장</h1>
            <p className="text-sm text-gray-400 mt-0.5">{todayLabel}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchBookings}
              className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
              title="새로고침"
            >
              <RefreshCw className="w-4 h-4 text-gray-500" />
            </button>
            <Link
              href="/admin/bookings/new"
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90"
              style={{ backgroundColor: "#2A7AE2" }}
            >
              + 새 예약 입력
            </Link>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-5 gap-3 mb-5">
          {[
            { label: "총 예약",   value: stats.total,     color: "#0D2B52" },
            { label: "대기",      value: stats.waiting,   color: "#6B7280" },
            { label: "비행",      value: stats.flying,    color: "#FF8A00" },
            { label: "비행완료",  value: stats.completed, color: "#15803D" },
            { label: "취소",      value: stats.cancelled, color: "#9CA3AF" },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
              <p className="text-2xl font-bold" style={{ color: s.color }}>
                {s.value}
                <span className="text-sm font-normal text-gray-400 ml-1">건</span>
              </p>
              <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Date Tabs */}
        <div className="flex gap-1 mb-4 bg-white rounded-xl p-1 w-fit shadow-sm border border-gray-100">
          {DATE_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setDateTab(tab.value)}
              className="px-4 py-1.5 rounded-lg text-sm font-medium transition-all"
              style={
                dateTab === tab.value
                  ? { backgroundColor: "#0D2B52", color: "white" }
                  : { color: "#6B7280" }
              }
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 mb-4">
          <div className="flex gap-1 flex-wrap">
            {STATUS_FILTER_TABS.map((tab) => (
              <button
                key={tab.value}
                onClick={() => setStatusFilter(tab.value)}
                className="px-3 py-1 rounded-full text-xs font-medium border transition-all"
                style={
                  statusFilter === tab.value
                    ? { borderColor: "#2A7AE2", backgroundColor: "#EEF4FD", color: "#2A7AE2" }
                    : { borderColor: "#E5E7EB", color: "#6B7280" }
                }
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="ml-auto relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="이름 / 연락처 / 예약번호"
              className="pl-8 pr-4 py-1.5 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-blue-400 w-56"
            />
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div
            className="grid text-xs font-semibold text-white px-5 py-3"
            style={{
              backgroundColor: "#0D2B52",
              gridTemplateColumns: "1.6fr 1.3fr 1fr 1.2fr 0.6fr 0.9fr 1.4fr 0.8fr",
            }}
          >
            <span>예약번호</span>
            <span>예약일시</span>
            <span>예약자명</span>
            <span>전화번호</span>
            <span>인원</span>
            <span>상품</span>
            <span>체험비행일시</span>
            <span>상태</span>
          </div>

          {loading ? (
            <div className="py-16 text-center text-gray-400 text-sm">불러오는 중...</div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center text-gray-400 text-sm">
              해당 조건의 예약이 없습니다.
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {filtered.map((b) => {
                const optionNames = (b.options ?? []).map((o) =>
                  typeof o === "string" ? o : o.name
                );
                return (
                  <div
                    key={b.id}
                    className="grid items-center px-5 py-3.5 hover:bg-gray-50 cursor-pointer transition-colors"
                    style={{ gridTemplateColumns: "1.6fr 1.3fr 1fr 1.2fr 0.6fr 0.9fr 1.4fr 0.8fr" }}
                    onClick={() => setSelectedBooking(b)}
                  >
                    {/* 예약번호 */}
                    <div>
                      <p className="text-xs font-mono text-gray-500">{b.booking_no}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{CHANNEL_LABEL[b.channel] ?? b.channel}</p>
                    </div>

                    {/* 예약일시 */}
                    <p className="text-xs text-gray-600">
                      {b.created_at?.slice(0, 16).replace("T", " ")}
                    </p>

                    {/* 예약자명 */}
                    <div className="flex items-center gap-1.5">
                      <div
                        className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                        style={{ backgroundColor: "#0D2B52" }}
                      >
                        {b.customer_name[0]}
                      </div>
                      <span className="text-sm font-medium text-gray-900">{b.customer_name}</span>
                    </div>

                    {/* 전화번호 */}
                    <p className="text-xs text-gray-600">{b.customer_phone}</p>

                    {/* 인원 + 파일럿 배정 현황 */}
                    <div className="flex items-center gap-1">
                      <span
                        className="text-sm font-bold"
                        style={{ color: b.headcount > 1 ? "#FF8A00" : "#374151" }}
                      >
                        {b.headcount}
                      </span>
                      <span className="text-xs text-gray-400">명</span>
                      {(() => {
                        const assigned = Array.isArray(b.booking_pilots) ? b.booking_pilots.length : (b.pilot_id ? 1 : 0);
                        const full     = assigned >= b.headcount;
                        return (
                          <span
                            className="w-1.5 h-1.5 rounded-full ml-0.5 flex-shrink-0"
                            style={{ backgroundColor: full ? "#22C55E" : assigned > 0 ? "#F59E0B" : "#D1D5DB" }}
                            title={full ? `파일럿 ${assigned}/${b.headcount}명 배정 완료` : assigned > 0 ? `파일럿 ${assigned}/${b.headcount}명 배정 중` : "미배정"}
                          />
                        );
                      })()}
                    </div>

                    {/* 상품 */}
                    <div>
                      <p className="text-xs font-medium text-gray-800">{b.product_name}</p>
                      {optionNames.length > 0 && (
                        <p className="text-xs text-gray-400 truncate">+옵션</p>
                      )}
                    </div>

                    {/* 체험비행일시 */}
                    <div>
                      <p className="text-sm font-semibold text-gray-800">
                        {b.flight_date?.slice(5)} {b.flight_time}
                      </p>
                    </div>

                    {/* 상태 */}
                    <StatusBadge status={b.status} />
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <p className="text-xs text-gray-400 mt-3 text-right">
          총 {filtered.length}건 표시 중 (전체 {bookings.length}건)
        </p>
      </div>

      {/* Detail Panel */}
      {selectedBooking && (
        <DetailPanel
          booking={selectedBooking}
          onClose={() => setSelectedBooking(null)}
          onStatusChange={handleStatusChange}
          onBookingUpdate={handleBookingUpdate}
        />
      )}
    </>
  );
}
