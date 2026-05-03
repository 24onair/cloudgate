"use client";

import { useState, useMemo } from "react";
import {
  Search,
  Filter,
  Phone,
  User,
  Calendar,
  Clock,
  ChevronRight,
  X,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Plane,
  Users,
  CreditCard,
  MessageSquare,
  RefreshCw,
} from "lucide-react";
import Link from "next/link";

// ─── Types ────────────────────────────────────────────────────────────────────

type BookingStatus =
  | "new"
  | "pending_payment"
  | "confirmed"
  | "waiting"
  | "boarding"
  | "flying"
  | "landed"
  | "completed"
  | "cancelled";

interface Booking {
  id: string;
  customer_name: string;
  customer_phone: string;
  headcount: number;
  product_name: string;
  options: string[];
  date: string;
  time: string;
  pilot: string | null;
  deposit: number;
  total_price: number;
  status: BookingStatus;
  source: "phone" | "walk_in" | "online" | "other";
  memo?: string;
  landed_at?: string;
  created_at: string;
}

// ─── Mock Data ────────────────────────────────────────────────────────────────

const BOOKINGS: Booking[] = [
  {
    id: "BK-20260501-1021",
    customer_name: "이수진",
    customer_phone: "010-3421-8812",
    headcount: 1,
    product_name: "베이직",
    options: [],
    date: "2026-05-01",
    time: "09:00",
    pilot: "박구름",
    deposit: 30000,
    total_price: 80000,
    status: "completed",
    source: "phone",
    landed_at: "09:14",
    created_at: "2026-04-30",
  },
  {
    id: "BK-20260501-1045",
    customer_name: "최현우",
    customer_phone: "010-5533-2241",
    headcount: 1,
    product_name: "베이직",
    options: ["사진 패키지"],
    date: "2026-05-01",
    time: "10:30",
    pilot: "박구름",
    deposit: 30000,
    total_price: 110000,
    status: "completed",
    source: "online",
    landed_at: "10:43",
    created_at: "2026-04-29",
  },
  {
    id: "BK-20260501-2233",
    customer_name: "서지훈",
    customer_phone: "010-8877-1122",
    headcount: 1,
    product_name: "익스트림",
    options: [],
    date: "2026-05-01",
    time: "12:00",
    pilot: "김하늘",
    deposit: 40000,
    total_price: 120000,
    status: "completed",
    source: "phone",
    landed_at: "12:18",
    created_at: "2026-04-30",
  },
  {
    id: "BK-20260501-9970",
    customer_name: "김민준",
    customer_phone: "010-2244-6677",
    headcount: 1,
    product_name: "베이직",
    options: ["사진 패키지"],
    date: "2026-05-01",
    time: "13:00",
    pilot: "박구름",
    deposit: 30000,
    total_price: 110000,
    status: "flying",
    source: "online",
    created_at: "2026-04-28",
  },
  {
    id: "BK-20260501-5511",
    customer_name: "강미라",
    customer_phone: "010-9900-4455",
    headcount: 1,
    product_name: "베이직",
    options: [],
    date: "2026-05-01",
    time: "14:00",
    pilot: null,
    deposit: 30000,
    total_price: 80000,
    status: "cancelled",
    source: "phone",
    memo: "개인 사정으로 취소 요청",
    created_at: "2026-04-29",
  },
  {
    id: "BK-20260501-3012",
    customer_name: "박지연",
    customer_phone: "010-7788-3344",
    headcount: 2,
    product_name: "VIP",
    options: ["사진 패키지", "영상 풀 패키지"],
    date: "2026-05-01",
    time: "15:00",
    pilot: "이바람",
    deposit: 60000,
    total_price: 320000,
    status: "waiting",
    source: "online",
    created_at: "2026-04-27",
  },
  {
    id: "BK-20260501-7788",
    customer_name: "김태현",
    customer_phone: "010-6644-9988",
    headcount: 1,
    product_name: "베이직",
    options: [],
    date: "2026-05-01",
    time: "17:00",
    pilot: "김하늘",
    deposit: 30000,
    total_price: 80000,
    status: "confirmed",
    source: "walk_in",
    created_at: "2026-05-01",
  },
  {
    id: "BK-20260501-4422",
    customer_name: "정성민",
    customer_phone: "010-1133-5577",
    headcount: 1,
    product_name: "익스트림",
    options: [],
    date: "2026-05-01",
    time: "16:30",
    pilot: "이바람",
    deposit: 40000,
    total_price: 120000,
    status: "waiting",
    source: "phone",
    created_at: "2026-04-30",
  },
  {
    id: "BK-20260502-1001",
    customer_name: "홍길동",
    customer_phone: "010-4455-7788",
    headcount: 1,
    product_name: "익스트림",
    options: [],
    date: "2026-05-02",
    time: "10:00",
    pilot: null,
    deposit: 40000,
    total_price: 120000,
    status: "confirmed",
    source: "online",
    created_at: "2026-04-30",
  },
  {
    id: "BK-20260502-1002",
    customer_name: "김영희",
    customer_phone: "010-2211-6655",
    headcount: 1,
    product_name: "VIP",
    options: ["사진 패키지"],
    date: "2026-05-02",
    time: "11:00",
    pilot: null,
    deposit: 60000,
    total_price: 230000,
    status: "pending_payment",
    source: "online",
    created_at: "2026-05-01",
  },
];

// ─── Status Config ────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  BookingStatus,
  { label: string; color: string; bg: string; dot: string }
> = {
  new:             { label: "신규",    color: "#6B7280", bg: "#F3F4F6", dot: "#9CA3AF" },
  pending_payment: { label: "결제대기", color: "#D97706", bg: "#FEF3C7", dot: "#F59E0B" },
  confirmed:       { label: "확정",    color: "#1D4ED8", bg: "#DBEAFE", dot: "#3B82F6" },
  waiting:         { label: "대기중",  color: "#0369A1", bg: "#E0F2FE", dot: "#0EA5E9" },
  boarding:        { label: "탑승중",  color: "#7C3AED", bg: "#EDE9FE", dot: "#8B5CF6" },
  flying:          { label: "비행중",  color: "#C2410C", bg: "#FFF7ED", dot: "#FF8A00" },
  landed:          { label: "착륙",    color: "#0F766E", bg: "#CCFBF1", dot: "#14B8A6" },
  completed:       { label: "완료",    color: "#15803D", bg: "#DCFCE7", dot: "#22C55E" },
  cancelled:       { label: "취소",    color: "#9CA3AF", bg: "#F9FAFB", dot: "#D1D5DB" },
};

const SOURCE_LABEL: Record<string, string> = {
  phone: "전화",
  walk_in: "현장",
  online: "온라인",
  other: "기타",
};

const DATE_TABS = [
  { label: "오늘", value: "today" },
  { label: "내일", value: "tomorrow" },
  { label: "이번 주", value: "week" },
  { label: "전체", value: "all" },
];

const STATUS_FILTER_TABS: { label: string; value: BookingStatus | "all" }[] = [
  { label: "전체", value: "all" },
  { label: "대기중", value: "waiting" },
  { label: "확정", value: "confirmed" },
  { label: "결제대기", value: "pending_payment" },
  { label: "비행중", value: "flying" },
  { label: "완료", value: "completed" },
  { label: "취소", value: "cancelled" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatPhone(phone: string) {
  return phone;
}

function StatusBadge({ status }: { status: BookingStatus }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
      style={{ color: cfg.color, backgroundColor: cfg.bg }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full flex-shrink-0"
        style={{ backgroundColor: cfg.dot }}
      />
      {cfg.label}
    </span>
  );
}

// ─── Detail Panel ─────────────────────────────────────────────────────────────

function DetailPanel({
  booking,
  onClose,
  onStatusChange,
}: {
  booking: Booking;
  onClose: () => void;
  onStatusChange: (id: string, status: BookingStatus) => void;
}) {
  const cfg = STATUS_CONFIG[booking.status];

  const nextActions: { label: string; status: BookingStatus; color: string }[] = [];
  if (booking.status === "pending_payment")
    nextActions.push({ label: "결제 확인 → 확정", status: "confirmed", color: "#2A7AE2" });
  if (booking.status === "confirmed")
    nextActions.push({ label: "대기중으로 변경", status: "waiting", color: "#0369A1" });
  if (booking.status === "waiting")
    nextActions.push({ label: "탑승 시작", status: "boarding", color: "#7C3AED" });
  if (booking.status === "boarding")
    nextActions.push({ label: "비행 시작", status: "flying", color: "#FF8A00" });
  if (booking.status === "flying")
    nextActions.push({ label: "착륙 완료", status: "landed", color: "#0F766E" });
  if (booking.status === "landed")
    nextActions.push({ label: "완료 처리", status: "completed", color: "#15803D" });

  return (
    <div className="fixed inset-0 z-40 flex" onClick={onClose}>
      {/* backdrop */}
      <div className="flex-1 bg-black/20" />

      {/* panel */}
      <div
        className="w-[400px] min-h-full bg-white shadow-2xl flex flex-col overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Panel Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <p className="text-xs text-gray-400 font-mono">{booking.id}</p>
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
          {/* Status */}
          <div className="flex items-center justify-between">
            <StatusBadge status={booking.status} />
            <span className="text-xs text-gray-400">
              {SOURCE_LABEL[booking.source]} 예약 · {booking.created_at} 접수
            </span>
          </div>

          {/* Customer Info */}
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
                <p className="text-sm text-gray-500">{formatPhone(booking.customer_phone)}</p>
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
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">비행 일정</p>
            <div className="flex items-center gap-3 text-sm text-gray-700">
              <Calendar className="w-4 h-4 text-gray-400" />
              {booking.date} ({booking.time})
            </div>
            <div className="flex items-center gap-3 text-sm text-gray-700">
              <User className="w-4 h-4 text-gray-400" />
              {booking.pilot ? (
                <span>
                  파일럿{" "}
                  <span className="font-medium" style={{ color: "#0D2B52" }}>
                    {booking.pilot}
                  </span>
                </span>
              ) : (
                <span className="text-amber-600">파일럿 미배정</span>
              )}
            </div>
            {booking.landed_at && (
              <div className="flex items-center gap-3 text-sm text-gray-700">
                <CheckCircle2 className="w-4 h-4" style={{ color: "#22C55E" }} />
                착륙 완료 {booking.landed_at}
              </div>
            )}
          </div>

          {/* Product */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">상품 정보</p>
            <div className="bg-gray-50 rounded-xl p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="font-medium text-gray-800">{booking.product_name}</span>
                <span className="text-gray-600">기본</span>
              </div>
              {booking.options.map((opt) => (
                <div key={opt} className="flex justify-between text-sm">
                  <span className="text-gray-600">+ {opt}</span>
                  <span className="text-gray-400">옵션</span>
                </div>
              ))}
              <div className="border-t border-gray-200 pt-2 flex justify-between text-sm font-semibold">
                <span>총 금액</span>
                <span style={{ color: "#0D2B52" }}>
                  {booking.total_price.toLocaleString()}원
                </span>
              </div>
            </div>
          </div>

          {/* Payment */}
          <div className="flex items-center justify-between bg-amber-50 rounded-xl p-4">
            <div className="flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-amber-600" />
              <span className="text-sm text-gray-700">예약금</span>
            </div>
            <span className="font-semibold text-sm" style={{ color: "#0D2B52" }}>
              {booking.deposit.toLocaleString()}원 납부
            </span>
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
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                상태 변경
              </p>
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
  const [dateTab, setDateTab] = useState<string>("today");
  const [statusFilter, setStatusFilter] = useState<BookingStatus | "all">("all");
  const [search, setSearch] = useState("");
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [bookings, setBookings] = useState<Booking[]>(BOOKINGS);

  const filtered = useMemo(() => {
    return bookings.filter((b) => {
      // Date filter
      if (dateTab === "today" && b.date !== "2026-05-01") return false;
      if (dateTab === "tomorrow" && b.date !== "2026-05-02") return false;
      if (dateTab === "week" && (b.date < "2026-04-28" || b.date > "2026-05-04")) return false;

      // Status filter
      if (statusFilter !== "all" && b.status !== statusFilter) return false;

      // Search
      if (search) {
        const q = search.toLowerCase();
        if (
          !b.customer_name.includes(search) &&
          !b.customer_phone.includes(search) &&
          !b.id.toLowerCase().includes(q)
        )
          return false;
      }

      return true;
    });
  }, [bookings, dateTab, statusFilter, search]);

  // Stats for current date filter
  const stats = useMemo(() => {
    const base = bookings.filter((b) => {
      if (dateTab === "today") return b.date === "2026-05-01";
      if (dateTab === "tomorrow") return b.date === "2026-05-02";
      if (dateTab === "week") return b.date >= "2026-04-28" && b.date <= "2026-05-04";
      return true;
    });
    return {
      total: base.length,
      waiting: base.filter((b) => b.status === "waiting" || b.status === "confirmed").length,
      flying: base.filter((b) => b.status === "flying" || b.status === "boarding").length,
      completed: base.filter((b) => b.status === "completed").length,
      cancelled: base.filter((b) => b.status === "cancelled").length,
    };
  }, [bookings, dateTab]);

  const handleStatusChange = (id: string, status: BookingStatus) => {
    setBookings((prev) =>
      prev.map((b) =>
        b.id === id
          ? {
              ...b,
              status,
              ...(status === "landed" || status === "completed"
                ? { landed_at: new Date().toTimeString().slice(0, 5) }
                : {}),
            }
          : b
      )
    );
    setSelectedBooking((prev) =>
      prev?.id === id
        ? {
            ...prev,
            status,
            ...(status === "landed" || status === "completed"
              ? { landed_at: new Date().toTimeString().slice(0, 5) }
              : {}),
          }
        : prev
    );
  };

  return (
    <>
      <div className="p-6 max-w-7xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: "#0D2B52" }}>
              예약대장
            </h1>
            <p className="text-sm text-gray-400 mt-0.5">2026년 5월 1일 (금)</p>
          </div>
          <Link
            href="/admin/bookings/new"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90"
            style={{ backgroundColor: "#2A7AE2" }}
          >
            + 새 예약 입력
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-5 gap-3 mb-5">
          {[
            { label: "총 예약", value: stats.total, color: "#0D2B52" },
            { label: "대기/확정", value: stats.waiting, color: "#0369A1" },
            { label: "비행 중", value: stats.flying, color: "#FF8A00" },
            { label: "완료", value: stats.completed, color: "#15803D" },
            { label: "취소", value: stats.cancelled, color: "#9CA3AF" },
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
          {/* Status filter */}
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

          {/* Search */}
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
          {/* Table Header */}
          <div
            className="grid text-xs font-semibold text-white px-5 py-3"
            style={{
              backgroundColor: "#0D2B52",
              gridTemplateColumns: "1fr 1.4fr 1.6fr 1fr 1fr 1fr 0.8fr 0.6fr",
            }}
          >
            <span>예약번호</span>
            <span>고객</span>
            <span>상품</span>
            <span>일정</span>
            <span>파일럿</span>
            <span>예약금</span>
            <span>상태</span>
            <span></span>
          </div>

          {filtered.length === 0 ? (
            <div className="py-16 text-center text-gray-400 text-sm">
              해당 조건의 예약이 없습니다.
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {filtered.map((b) => (
                <div
                  key={b.id}
                  className="grid items-center px-5 py-3.5 hover:bg-gray-50 cursor-pointer transition-colors group"
                  style={{
                    gridTemplateColumns: "1fr 1.4fr 1.6fr 1fr 1fr 1fr 0.8fr 0.6fr",
                  }}
                  onClick={() => setSelectedBooking(b)}
                >
                  {/* ID */}
                  <span className="text-xs font-mono text-gray-400">{b.id.slice(-9)}</span>

                  {/* Customer */}
                  <div className="flex items-center gap-2">
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                      style={{ backgroundColor: "#0D2B52" }}
                    >
                      {b.customer_name[0]}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {b.customer_name}
                        {b.headcount > 1 && (
                          <span
                            className="ml-1 px-1.5 py-0.5 rounded-full text-xs font-bold text-white"
                            style={{ backgroundColor: "#FF8A00" }}
                          >
                            {b.headcount}인
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-gray-400">{b.customer_phone}</p>
                    </div>
                  </div>

                  {/* Product */}
                  <div>
                    <p className="text-sm font-medium text-gray-800">{b.product_name}</p>
                    {b.options.length > 0 && (
                      <p className="text-xs text-gray-400 truncate">
                        + {b.options.join(", ")}
                      </p>
                    )}
                  </div>

                  {/* Schedule */}
                  <div>
                    <p className="text-sm text-gray-800 font-medium">{b.time}</p>
                    <p className="text-xs text-gray-400">{b.date.slice(5)}</p>
                  </div>

                  {/* Pilot */}
                  <div>
                    {b.pilot ? (
                      <p className="text-sm text-gray-800">{b.pilot}</p>
                    ) : (
                      <span className="text-xs text-amber-600 font-medium">미배정</span>
                    )}
                  </div>

                  {/* Deposit */}
                  <p className="text-sm font-medium" style={{ color: "#0D2B52" }}>
                    {b.deposit.toLocaleString()}원
                  </p>

                  {/* Status */}
                  <StatusBadge status={b.status} />

                  {/* Arrow */}
                  <div className="flex justify-end">
                    <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500 transition-colors" />
                  </div>
                </div>
              ))}
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
        />
      )}
    </>
  );
}
