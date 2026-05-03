"use client";

import { useState } from "react";
import {
  ChevronRight,
  CheckCircle2,
  User,
  Phone,
  Calendar,
  Clock,
  MessageSquare,
  Users,
  Package,
  Bell,
  ArrowLeft,
  Plane,
} from "lucide-react";
import Link from "next/link";

// ─── Mock Data ────────────────────────────────────────────────────────────────

const PRODUCTS = [
  {
    id: "PRD-001",
    name: "베이직",
    description: "10분 탠덤 체험비행, 초보자 추천",
    base_price: 80000,
    deposit_amount: 30000,
    duration_minutes: 10,
    max_headcount: 1,
    options: [
      { id: "OPT-001", name: "사진 패키지", description: "비행 중 전문 사진 10장", price: 30000 },
      { id: "OPT-002", name: "영상 패키지", description: "비행 풀영상 편집본 (3분)", price: 50000 },
    ],
  },
  {
    id: "PRD-002",
    name: "익스트림",
    description: "20분 고공 체험비행, 아크로 동작 포함",
    base_price: 120000,
    deposit_amount: 50000,
    duration_minutes: 20,
    max_headcount: 1,
    options: [
      { id: "OPT-003", name: "사진 패키지", description: "비행 중 전문 사진 10장", price: 30000 },
      { id: "OPT-004", name: "영상 패키지", description: "비행 풀영상 편집본 (5분)", price: 60000 },
      { id: "OPT-005", name: "GoPro 마운트", description: "고객 직접 촬영용 마운트 제공", price: 15000 },
    ],
  },
  {
    id: "PRD-003",
    name: "VIP",
    description: "30분 프리미엄 비행 + 전용 서비스, 2인 가능",
    base_price: 200000,
    deposit_amount: 80000,
    duration_minutes: 30,
    max_headcount: 2,
    options: [
      { id: "OPT-006", name: "사진+영상 풀 패키지", description: "고화질 사진 20장 + 영상 풀편집", price: 70000 },
      { id: "OPT-007", name: "전용 픽업 서비스", description: "지정 장소 픽업 (10km 이내)", price: 30000 },
    ],
  },
];

const PILOTS = [
  { id: "P001", name: "김하늘", flights_today: 3, available: true },
  { id: "P002", name: "이비행", flights_today: 5, available: true },
  { id: "P003", name: "박구름", flights_today: 2, available: true },
  { id: "P004", name: "최솔바람", flights_today: 7, available: false },
];

const TIME_SLOTS = [
  "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
  "12:00", "12:30", "13:00", "13:30", "14:00", "14:30",
  "15:00", "15:30", "16:00", "16:30", "17:00",
];

const TAKEN_SLOTS = ["10:00", "11:00", "14:00"];

// ─── Types ────────────────────────────────────────────────────────────────────

type Step = "product" | "schedule" | "customer" | "confirm" | "done";

interface FormData {
  product_id: string;
  selected_options: string[];
  date: string;
  time_slot: string;
  customer_name: string;
  customer_phone: string;
  headcount: number;
  source: string;
  memo: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatPhone(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
}

function formatPrice(n: number) {
  return n.toLocaleString("ko-KR") + "원";
}

function generateBookingId() {
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const rand = String(Math.floor(Math.random() * 9000) + 1000);
  return `BK-${today}-${rand}`;
}

function assignPilot() {
  const available = PILOTS.filter((p) => p.available);
  if (!available.length) return null;
  return available.sort((a, b) => a.flights_today - b.flights_today)[0];
}

// ─── Step Indicator ───────────────────────────────────────────────────────────

const STEPS: { key: Step; label: string }[] = [
  { key: "product", label: "상품 선택" },
  { key: "schedule", label: "일정 선택" },
  { key: "customer", label: "고객 정보" },
  { key: "confirm", label: "예약 확인" },
];

function StepIndicator({ current }: { current: Step }) {
  const idx = STEPS.findIndex((s) => s.key === current);
  return (
    <div className="flex items-center gap-1 mb-8">
      {STEPS.map((step, i) => {
        const done = i < idx;
        const active = i === idx;
        return (
          <div key={step.key} className="flex items-center gap-1">
            <div className="flex items-center gap-2">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                  done
                    ? "text-white"
                    : active
                    ? "text-white"
                    : "text-gray-400 bg-gray-100"
                }`}
                style={
                  done
                    ? { backgroundColor: "#2A7AE2" }
                    : active
                    ? { backgroundColor: "#FF8A00" }
                    : {}
                }
              >
                {done ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
              </div>
              <span
                className={`text-sm font-medium ${
                  active ? "text-gray-900" : done ? "text-gray-500" : "text-gray-400"
                }`}
              >
                {step.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <ChevronRight className="w-4 h-4 text-gray-300 mx-1" />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function NewBookingPage() {
  const [step, setStep] = useState<Step>("product");
  const [form, setForm] = useState<FormData>({
    product_id: "",
    selected_options: [],
    date: "",
    time_slot: "",
    customer_name: "",
    customer_phone: "",
    headcount: 1,
    source: "phone",
    memo: "",
  });
  const [bookingId] = useState(generateBookingId);
  const [assignedPilot] = useState(() => assignPilot());

  const selectedProduct = PRODUCTS.find((p) => p.id === form.product_id);
  const selectedOptionDetails = selectedProduct?.options.filter((o) =>
    form.selected_options.includes(o.id)
  ) ?? [];
  const totalDeposit =
    (selectedProduct?.deposit_amount ?? 0) +
    selectedOptionDetails.reduce((s, o) => s + o.price, 0);
  const totalPrice =
    (selectedProduct?.base_price ?? 0) +
    selectedOptionDetails.reduce((s, o) => s + o.price, 0);

  // ── Step 1: 상품 선택 ──────────────────────────────────────────────────────

  const ProductStep = () => (
    <div>
      <h2 className="text-lg font-bold text-gray-900 mb-1">체험 상품 선택</h2>
      <p className="text-sm text-gray-500 mb-6">고객이 원하는 상품을 선택하세요.</p>
      <div className="grid grid-cols-1 gap-4 mb-8">
        {PRODUCTS.map((product) => {
          const selected = form.product_id === product.id;
          return (
            <div key={product.id}>
              <button
                onClick={() => setForm({ ...form, product_id: product.id, selected_options: [], headcount: 1 })}
                className={`w-full text-left p-5 rounded-xl border-2 transition-all ${
                  selected
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-200 bg-white hover:border-blue-300"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold text-gray-900 text-base">{product.name}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
                        {product.duration_minutes}분
                      </span>
                      {product.max_headcount > 1 && (
                        <span className="text-xs px-2 py-0.5 rounded-full text-white"
                          style={{ backgroundColor: "#FF8A00" }}>
                          최대 {product.max_headcount}인
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500">{product.description}</p>
                  </div>
                  <div className="text-right ml-4">
                    <p className="font-bold text-gray-900">{formatPrice(product.base_price)}</p>
                    <p className="text-xs text-gray-400">예약금 {formatPrice(product.deposit_amount)}</p>
                  </div>
                </div>
              </button>

              {/* 옵션 */}
              {selected && product.options.length > 0 && (
                <div className="mt-2 ml-4 p-4 rounded-lg bg-gray-50 border border-gray-200">
                  <p className="text-xs font-semibold text-gray-500 mb-3 uppercase tracking-wide">추가 옵션 (선택)</p>
                  {product.options.map((opt) => {
                    const checked = form.selected_options.includes(opt.id);
                    return (
                      <label key={opt.id} className="flex items-center justify-between py-2 cursor-pointer group">
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => {
                              const next = checked
                                ? form.selected_options.filter((id) => id !== opt.id)
                                : [...form.selected_options, opt.id];
                              setForm({ ...form, selected_options: next });
                            }}
                            className="w-4 h-4 rounded accent-blue-500"
                          />
                          <div>
                            <p className="text-sm font-medium text-gray-800">{opt.name}</p>
                            <p className="text-xs text-gray-400">{opt.description}</p>
                          </div>
                        </div>
                        <span className="text-sm font-semibold" style={{ color: "#2A7AE2" }}>
                          +{formatPrice(opt.price)}
                        </span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 금액 요약 */}
      {selectedProduct && (
        <div className="rounded-xl p-4 mb-6" style={{ backgroundColor: "#F4F8FF" }}>
          <div className="flex justify-between text-sm text-gray-600 mb-1">
            <span>기본 가격</span>
            <span>{formatPrice(selectedProduct.base_price)}</span>
          </div>
          {selectedOptionDetails.map((o) => (
            <div key={o.id} className="flex justify-between text-sm text-gray-600 mb-1">
              <span>{o.name}</span>
              <span>+{formatPrice(o.price)}</span>
            </div>
          ))}
          <div className="border-t border-blue-200 mt-2 pt-2 flex justify-between font-bold">
            <span className="text-gray-900">예약금</span>
            <span style={{ color: "#2A7AE2" }}>{formatPrice(totalDeposit)}</span>
          </div>
          <div className="flex justify-between text-sm text-gray-500 mt-1">
            <span>총 금액 (잔금 포함)</span>
            <span>{formatPrice(totalPrice)}</span>
          </div>
        </div>
      )}

      <button
        onClick={() => setStep("schedule")}
        disabled={!form.product_id}
        className="w-full py-3.5 rounded-xl font-bold text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all"
        style={{ backgroundColor: form.product_id ? "#2A7AE2" : undefined }}
      >
        다음 — 일정 선택
      </button>
    </div>
  );

  // ── Step 2: 일정 선택 ──────────────────────────────────────────────────────

  const ScheduleStep = () => {
    const today = new Date().toISOString().split("T")[0];
    return (
      <div>
        <h2 className="text-lg font-bold text-gray-900 mb-1">일정 선택</h2>
        <p className="text-sm text-gray-500 mb-6">비행 날짜와 시간대를 선택하세요.</p>

        {/* 날짜 */}
        <div className="mb-6">
          <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
            <Calendar className="w-4 h-4" style={{ color: "#2A7AE2" }} />
            비행 날짜
          </label>
          <input
            type="date"
            min={today}
            value={form.date}
            onChange={(e) => setForm({ ...form, date: e.target.value, time_slot: "" })}
            className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:outline-none focus:border-blue-400 text-gray-900 bg-white"
          />
        </div>

        {/* 시간대 */}
        {form.date && (
          <div className="mb-8">
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-3">
              <Clock className="w-4 h-4" style={{ color: "#2A7AE2" }} />
              시간대 선택
            </label>
            <div className="grid grid-cols-4 gap-2">
              {TIME_SLOTS.map((slot) => {
                const taken = TAKEN_SLOTS.includes(slot);
                const selected = form.time_slot === slot;
                return (
                  <button
                    key={slot}
                    disabled={taken}
                    onClick={() => setForm({ ...form, time_slot: slot })}
                    className={`py-2.5 rounded-lg text-sm font-medium transition-all border-2 ${
                      taken
                        ? "border-gray-100 bg-gray-50 text-gray-300 cursor-not-allowed"
                        : selected
                        ? "text-white border-transparent"
                        : "border-gray-200 bg-white text-gray-700 hover:border-blue-300"
                    }`}
                    style={selected ? { backgroundColor: "#2A7AE2", borderColor: "#2A7AE2" } : {}}
                  >
                    {slot}
                    {taken && <span className="block text-xs text-gray-300">마감</span>}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={() => setStep("product")}
            className="px-5 py-3.5 rounded-xl font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors"
          >
            이전
          </button>
          <button
            onClick={() => setStep("customer")}
            disabled={!form.date || !form.time_slot}
            className="flex-1 py-3.5 rounded-xl font-bold text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            style={{ backgroundColor: form.date && form.time_slot ? "#2A7AE2" : undefined }}
          >
            다음 — 고객 정보
          </button>
        </div>
      </div>
    );
  };

  // ── Step 3: 고객 정보 ──────────────────────────────────────────────────────

  const CustomerStep = () => {
    const maxCount = selectedProduct?.max_headcount ?? 1;
    const nameOk = form.customer_name.trim().length >= 2;
    const phoneOk = form.customer_phone.replace(/\D/g, "").length === 11;
    const canNext = nameOk && phoneOk;

    return (
      <div>
        <h2 className="text-lg font-bold text-gray-900 mb-1">고객 정보 입력</h2>
        <p className="text-sm text-gray-500 mb-6">유선 상담에서 받은 고객 정보를 입력하세요.</p>

        <div className="space-y-4 mb-6">
          {/* 고객명 */}
          <div>
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
              <User className="w-4 h-4" style={{ color: "#2A7AE2" }} />
              고객명
            </label>
            <input
              type="text"
              placeholder="홍길동"
              value={form.customer_name}
              onChange={(e) => setForm({ ...form, customer_name: e.target.value })}
              className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:outline-none focus:border-blue-400 text-gray-900 bg-white"
            />
          </div>

          {/* 연락처 */}
          <div>
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
              <Phone className="w-4 h-4" style={{ color: "#2A7AE2" }} />
              연락처
            </label>
            <input
              type="tel"
              placeholder="010-1234-5678"
              value={form.customer_phone}
              onChange={(e) => setForm({ ...form, customer_phone: formatPhone(e.target.value) })}
              className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:outline-none focus:border-blue-400 text-gray-900 bg-white"
            />
          </div>

          {/* 인원 */}
          <div>
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
              <Users className="w-4 h-4" style={{ color: "#2A7AE2" }} />
              체험 인원 (최대 {maxCount}인)
            </label>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setForm({ ...form, headcount: Math.max(1, form.headcount - 1) })}
                className="w-10 h-10 rounded-lg bg-gray-100 hover:bg-gray-200 font-bold text-gray-700 transition-colors"
              >
                −
              </button>
              <span className="w-12 text-center text-xl font-bold text-gray-900">{form.headcount}</span>
              <button
                onClick={() => setForm({ ...form, headcount: Math.min(maxCount, form.headcount + 1) })}
                className="w-10 h-10 rounded-lg font-bold text-white transition-colors"
                style={{ backgroundColor: "#2A7AE2" }}
              >
                +
              </button>
              <span className="text-sm text-gray-400">인</span>
            </div>
          </div>

          {/* 접수 경로 */}
          <div>
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
              <Bell className="w-4 h-4" style={{ color: "#2A7AE2" }} />
              접수 경로
            </label>
            <div className="flex gap-2">
              {[
                { value: "phone", label: "📞 전화" },
                { value: "walk_in", label: "🚶 현장" },
                { value: "online", label: "💻 온라인" },
                { value: "other", label: "기타" },
              ].map((s) => (
                <button
                  key={s.value}
                  onClick={() => setForm({ ...form, source: s.value })}
                  className={`px-4 py-2 rounded-lg text-sm font-medium border-2 transition-all ${
                    form.source === s.value
                      ? "text-white border-transparent"
                      : "border-gray-200 text-gray-600 hover:border-blue-300 bg-white"
                  }`}
                  style={form.source === s.value ? { backgroundColor: "#2A7AE2", borderColor: "#2A7AE2" } : {}}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* 메모 */}
          <div>
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
              <MessageSquare className="w-4 h-4" style={{ color: "#2A7AE2" }} />
              메모 <span className="text-gray-400 font-normal">(선택)</span>
            </label>
            <textarea
              placeholder="특이사항, 요청사항 등"
              value={form.memo}
              onChange={(e) => setForm({ ...form, memo: e.target.value })}
              rows={3}
              className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:outline-none focus:border-blue-400 text-gray-900 bg-white resize-none"
            />
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => setStep("schedule")}
            className="px-5 py-3.5 rounded-xl font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors"
          >
            이전
          </button>
          <button
            onClick={() => setStep("confirm")}
            disabled={!canNext}
            className="flex-1 py-3.5 rounded-xl font-bold text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            style={{ backgroundColor: canNext ? "#2A7AE2" : undefined }}
          >
            다음 — 예약 확인
          </button>
        </div>
      </div>
    );
  };

  // ── Step 4: 예약 확인 ──────────────────────────────────────────────────────

  const ConfirmStep = () => {
    const sourceLabel: Record<string, string> = {
      phone: "📞 전화",
      walk_in: "🚶 현장",
      online: "💻 온라인",
      other: "기타",
    };
    const dateObj = form.date ? new Date(form.date + "T00:00:00") : null;
    const dateLabel = dateObj
      ? dateObj.toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric", weekday: "short" })
      : "";

    return (
      <div>
        <h2 className="text-lg font-bold text-gray-900 mb-1">예약 확인</h2>
        <p className="text-sm text-gray-500 mb-6">입력 내용을 확인하고 예약을 확정하세요.</p>

        <div className="rounded-2xl border-2 border-gray-200 overflow-hidden mb-6 bg-white">
          {/* 상품 */}
          <div className="px-5 py-4 border-b border-gray-100">
            <div className="flex items-center gap-2 mb-3">
              <Package className="w-4 h-4" style={{ color: "#FF8A00" }} />
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">상품</span>
            </div>
            <div className="flex justify-between items-start">
              <div>
                <p className="font-bold text-gray-900">{selectedProduct?.name}</p>
                <p className="text-sm text-gray-500">{selectedProduct?.duration_minutes}분 체험비행</p>
                {selectedOptionDetails.length > 0 && (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {selectedOptionDetails.map((o) => (
                      <span key={o.id} className="text-xs px-2 py-0.5 rounded-full text-blue-700 bg-blue-50">
                        {o.name}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className="text-right">
                <p className="font-bold" style={{ color: "#2A7AE2" }}>{formatPrice(totalDeposit)}</p>
                <p className="text-xs text-gray-400">예약금</p>
              </div>
            </div>
          </div>

          {/* 일정 */}
          <div className="px-5 py-4 border-b border-gray-100">
            <div className="flex items-center gap-2 mb-3">
              <Calendar className="w-4 h-4" style={{ color: "#FF8A00" }} />
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">일정</span>
            </div>
            <p className="font-semibold text-gray-900">{dateLabel}</p>
            <p className="text-sm text-gray-500">{form.time_slot}</p>
          </div>

          {/* 고객 */}
          <div className="px-5 py-4">
            <div className="flex items-center gap-2 mb-3">
              <User className="w-4 h-4" style={{ color: "#FF8A00" }} />
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">고객 정보</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <p className="text-gray-400">이름</p>
                <p className="font-medium text-gray-900">{form.customer_name}</p>
              </div>
              <div>
                <p className="text-gray-400">연락처</p>
                <p className="font-medium text-gray-900">{form.customer_phone}</p>
              </div>
              <div>
                <p className="text-gray-400">인원</p>
                <p className="font-medium text-gray-900">{form.headcount}인</p>
              </div>
              <div>
                <p className="text-gray-400">접수 경로</p>
                <p className="font-medium text-gray-900">{sourceLabel[form.source]}</p>
              </div>
              {form.memo && (
                <div className="col-span-2">
                  <p className="text-gray-400">메모</p>
                  <p className="font-medium text-gray-900">{form.memo}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => setStep("customer")}
            className="px-5 py-3.5 rounded-xl font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors"
          >
            이전
          </button>
          <button
            onClick={() => setStep("done")}
            className="flex-1 py-3.5 rounded-xl font-bold text-white transition-all"
            style={{ backgroundColor: "#FF8A00" }}
          >
            예약 확정
          </button>
        </div>
      </div>
    );
  };

  // ── Step 5: 완료 ──────────────────────────────────────────────────────────

  const DoneStep = () => {
    const dateObj = form.date ? new Date(form.date + "T00:00:00") : null;
    const dateLabel = dateObj
      ? dateObj.toLocaleDateString("ko-KR", { month: "long", day: "numeric", weekday: "short" })
      : "";

    return (
      <div className="text-center py-4">
        {/* 성공 아이콘 */}
        <div
          className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"
          style={{ backgroundColor: "#F4F8FF" }}
        >
          <CheckCircle2 className="w-10 h-10" style={{ color: "#2A7AE2" }} />
        </div>

        <h2 className="text-2xl font-bold text-gray-900 mb-2">예약 확정 완료!</h2>
        <p className="text-gray-500 mb-8">고객에게 확정 알림이 발송됩니다.</p>

        {/* 예약 번호 */}
        <div
          className="rounded-2xl p-5 mb-6 text-left"
          style={{ backgroundColor: "#F4F8FF" }}
        >
          <p className="text-xs text-gray-400 mb-1">예약 번호</p>
          <p className="text-xl font-bold font-mono" style={{ color: "#0D2B52" }}>{bookingId}</p>
        </div>

        {/* 파일럿 배정 */}
        <div className="rounded-2xl border-2 border-gray-100 bg-white p-5 mb-4 text-left">
          <div className="flex items-center gap-2 mb-3">
            <Plane className="w-4 h-4" style={{ color: "#FF8A00" }} />
            <span className="text-sm font-semibold text-gray-600">파일럿 자동 배정</span>
          </div>
          {assignedPilot ? (
            <div className="flex items-center justify-between">
              <div>
                <p className="font-bold text-gray-900 text-lg">{assignedPilot.name} 파일럿</p>
                <p className="text-sm text-gray-400">오늘 비행 {assignedPilot.flights_today}건 진행</p>
              </div>
              <span
                className="px-3 py-1 rounded-full text-xs font-bold text-white"
                style={{ backgroundColor: "#2A7AE2" }}
              >
                배정 완료
              </span>
            </div>
          ) : (
            <p className="text-sm text-red-500">가용 파일럿 없음 — 수동 배정 필요</p>
          )}
        </div>

        {/* 알림 발송 */}
        <div className="rounded-2xl border-2 border-gray-100 bg-white p-5 mb-8 text-left">
          <div className="flex items-center gap-2 mb-3">
            <Bell className="w-4 h-4" style={{ color: "#FF8A00" }} />
            <span className="text-sm font-semibold text-gray-600">알림 발송 현황</span>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-700">
                고객 확정 알림 → {form.customer_name} ({form.customer_phone})
              </p>
              <span className="text-xs text-green-600 font-semibold">✓ 발송</span>
            </div>
            {assignedPilot && (
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-700">파일럿 배정 알림 → {assignedPilot.name}</p>
                <span className="text-xs text-green-600 font-semibold">✓ 발송</span>
              </div>
            )}
          </div>
        </div>

        {/* 예약 요약 */}
        <div className="rounded-2xl bg-gray-50 p-4 mb-8 text-sm text-left">
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div><span className="text-gray-400">상품</span><p className="font-medium">{selectedProduct?.name}</p></div>
            <div><span className="text-gray-400">일정</span><p className="font-medium">{dateLabel} {form.time_slot}</p></div>
            <div><span className="text-gray-400">인원</span><p className="font-medium">{form.headcount}인</p></div>
            <div><span className="text-gray-400">예약금</span><p className="font-medium" style={{ color: "#2A7AE2" }}>{formatPrice(totalDeposit)}</p></div>
          </div>
        </div>

        <div className="flex gap-3">
          <Link
            href="/admin/bookings"
            className="flex-1 py-3.5 rounded-xl font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors text-center"
          >
            예약대장 보기
          </Link>
          <button
            onClick={() => {
              setStep("product");
              setForm({
                product_id: "", selected_options: [], date: "", time_slot: "",
                customer_name: "", customer_phone: "", headcount: 1, source: "phone", memo: "",
              });
            }}
            className="flex-1 py-3.5 rounded-xl font-bold text-white transition-all"
            style={{ backgroundColor: "#2A7AE2" }}
          >
            새 예약 입력
          </button>
        </div>
      </div>
    );
  };

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="p-8">
      {/* 페이지 헤더 */}
      <div className="flex items-center gap-3 mb-8">
        <Link
          href="/admin/bookings"
          className="p-2 rounded-lg hover:bg-gray-200 transition-colors text-gray-500"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">새 예약 입력</h1>
          <p className="text-sm text-gray-500">유선 상담 후 예약을 직접 입력합니다.</p>
        </div>
      </div>

      {/* 컨텐츠 */}
      <div className="max-w-xl">
        {step !== "done" && <StepIndicator current={step} />}
        {step === "product" && <ProductStep />}
        {step === "schedule" && <ScheduleStep />}
        {step === "customer" && <CustomerStep />}
        {step === "confirm" && <ConfirmStep />}
        {step === "done" && <DoneStep />}
      </div>
    </div>
  );
}
