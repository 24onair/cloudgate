"use client";

import { useState, useEffect } from "react";
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
  X,
} from "lucide-react";
import Link from "next/link";
import {
  useSlotConfig,
  useBlockedSlots,
  generateSlotTimes,
  countAvailablePilots,
} from "@/lib/slotStore";
import { useSchedules } from "@/lib/scheduleStore";

// ─── 타입 (DB) ─────────────────────────────────────────────────────────────────

interface DbProduct {
  id: string;           // UUID
  slug: string;
  name: string;
  subtitle: string | null;
  price: number;
  duration_min: number | null;
  features: string[] | null;
  badge: string | null;
}
interface DbOption {
  id: string;           // UUID
  product_id: string;   // UUID
  name: string;
  price: number;
}

// UI에서 쓰는 통합 상품 타입 (DB → 변환)
interface UiProduct {
  id: string;           // UUID (DB)
  slug: string;
  name: string;
  description: string;
  base_price: number;
  deposit_per_person: number;
  duration_minutes: number;
  options: { id: string; name: string; description: string; price: number }[];
}

function toUiProduct(p: DbProduct, opts: DbOption[]): UiProduct {
  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    description: p.subtitle ?? `${p.duration_min ?? 0}분 체험비행`,
    base_price: p.price,
    deposit_per_person: 10000,
    duration_minutes: p.duration_min ?? 0,
    options: opts
      .filter((o) => o.product_id === p.id)
      .map((o) => ({ id: o.id, name: o.name, description: "", price: o.price })),
  };
}

const CHANNEL_OPTIONS = [
  { value: "phone",   label: "📞 전화" },
  { value: "walk-in", label: "🚶 현장" },
  { value: "online",  label: "💻 온라인" },
];

function formatPhone(value: string) {
  const d = value.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 7)  return `${d.slice(0, 3)}-${d.slice(3)}`;
  return `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7)}`;
}
function formatPrice(n: number) {
  return n.toLocaleString("ko-KR") + "원";
}

// ─── 타입 ──────────────────────────────────────────────────────────────────────

type Step = "product" | "schedule" | "customer" | "confirm" | "done";

interface FormData {
  product_id: string;
  selected_options: string[];
  date: string;
  time_slot: string;
  customer_name: string;
  customer_phone: string;
  headcount: number;
  channel: string;
  memo: string;
}

// ─── Step Indicator ────────────────────────────────────────────────────────────

const STEPS: { key: Step; label: string }[] = [
  { key: "product",  label: "상품" },
  { key: "schedule", label: "일정" },
  { key: "customer", label: "고객" },
  { key: "confirm",  label: "확인" },
];

function StepIndicator({ current }: { current: Step }) {
  const idx = STEPS.findIndex((s) => s.key === current);
  return (
    <div className="flex items-center gap-1 mb-8">
      {STEPS.map((step, i) => {
        const done   = i < idx;
        const active = i === idx;
        return (
          <div key={step.key} className="flex items-center gap-1">
            <div className="flex items-center gap-2">
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
                style={
                  done   ? { backgroundColor: "#2A7AE2", color: "white" }
                  : active ? { backgroundColor: "#FF8A00", color: "white" }
                  : { backgroundColor: "#F3F4F6", color: "#9CA3AF" }
                }
              >
                {done ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
              </div>
              <span className={`text-sm font-medium ${active ? "text-gray-900" : done ? "text-gray-500" : "text-gray-400"}`}>
                {step.label}
              </span>
            </div>
            {i < STEPS.length - 1 && <ChevronRight className="w-4 h-4 text-gray-300 mx-1" />}
          </div>
        );
      })}
    </div>
  );
}

// ─── Step 1: 상품 선택 ────────────────────────────────────────────────────────
// top-level 컴포넌트 — form 변경 시 unmount 없음

interface ProductStepProps {
  form: FormData;
  onChange: (f: FormData) => void;
  onNext: () => void;
  products: UiProduct[];
  loadingProducts: boolean;
}

function ProductStep({ form, onChange, onNext, products, loadingProducts }: ProductStepProps) {
  const product = products.find((p) => p.id === form.product_id);
  const selOpts = product?.options.filter((o) => form.selected_options.includes(o.id)) ?? [];
  const totalPrice   = (product?.base_price ?? 0) + selOpts.reduce((s, o) => s + o.price, 0);
  const depositTotal = (product?.deposit_per_person ?? 0) * form.headcount
                     + selOpts.reduce((s, o) => s + o.price, 0);

  return (
    <div>
      <h2 className="text-lg font-bold text-gray-900 mb-1">체험 상품 선택</h2>
      <p className="text-sm text-gray-500 mb-6">고객이 원하는 상품을 선택하세요.</p>

      {loadingProducts && (
        <div className="py-12 flex justify-center">
          <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin border-blue-400" />
        </div>
      )}

      <div className="grid gap-4 mb-6">
        {products.map((p) => {
          const sel = form.product_id === p.id;
          return (
            <div key={p.id}>
              <button
                onClick={() => onChange({ ...form, product_id: p.id, selected_options: [] })}
                className="w-full text-left p-5 rounded-xl border-2 transition-all"
                style={{
                  borderColor: sel ? "#2A7AE2" : "#E5E7EB",
                  backgroundColor: sel ? "#EFF6FF" : "white",
                }}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold text-gray-900">{p.name}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
                        {p.duration_minutes}분
                      </span>
                    </div>
                    <p className="text-sm text-gray-500">{p.description}</p>
                  </div>
                  <div className="text-right ml-4 flex-shrink-0">
                    <p className="font-bold text-gray-900">{formatPrice(p.base_price)}</p>
                    <p className="text-xs text-gray-400">1인 기준</p>
                  </div>
                </div>
              </button>

              {sel && p.options.length > 0 && (
                <div className="mt-2 ml-4 p-4 rounded-lg bg-gray-50 border border-gray-200">
                  <p className="text-xs font-semibold text-gray-500 mb-3 uppercase tracking-wide">추가 옵션 (선택)</p>
                  {p.options.map((opt) => {
                    const checked = form.selected_options.includes(opt.id);
                    return (
                      <label key={opt.id} className="flex items-center justify-between py-2 cursor-pointer">
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => {
                              const next = checked
                                ? form.selected_options.filter((id) => id !== opt.id)
                                : [...form.selected_options, opt.id];
                              onChange({ ...form, selected_options: next });
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

      {product && (
        <div className="rounded-xl p-4 mb-6" style={{ backgroundColor: "#F4F8FF" }}>
          <div className="flex justify-between text-sm text-gray-600 mb-1">
            <span>기본 {form.headcount}인</span>
            <span>{formatPrice(product.base_price * form.headcount)}</span>
          </div>
          {selOpts.map((o) => (
            <div key={o.id} className="flex justify-between text-sm text-gray-600 mb-1">
              <span>+ {o.name}</span>
              <span>{formatPrice(o.price)}</span>
            </div>
          ))}
          <div className="border-t border-blue-200 mt-2 pt-2 flex justify-between font-bold">
            <span className="text-gray-900">총액</span>
            <span style={{ color: "#2A7AE2" }}>{formatPrice(totalPrice)}</span>
          </div>
          <div className="flex justify-between text-sm text-gray-500 mt-1">
            <span>예약금 (지금 결제)</span>
            <span>{formatPrice(depositTotal)}</span>
          </div>
        </div>
      )}

      <button
        onClick={onNext}
        disabled={!form.product_id}
        className="w-full py-3.5 rounded-xl font-bold text-white disabled:opacity-40 disabled:cursor-not-allowed"
        style={{ backgroundColor: "#2A7AE2" }}
      >
        다음 — 일정 선택
      </button>
    </div>
  );
}

// ─── Step 2: 일정 선택 ────────────────────────────────────────────────────────

interface ScheduleStepProps {
  form: FormData;
  onChange: (f: FormData) => void;
  onNext: () => void;
  onPrev: () => void;
  slotTimes: string[];
  blockedSlots: Record<string, string[]>;
  schedules: ReturnType<typeof useSchedules>;
}

function ScheduleStep({ form, onChange, onNext, onPrev, slotTimes, blockedSlots, schedules }: ScheduleStepProps) {
  const today         = new Date().toISOString().slice(0, 10);
  const blockedForDate = form.date ? (blockedSlots[form.date] ?? []) : [];
  const pilotCount    = form.date ? countAvailablePilots(form.date, schedules) : 0;
  const noPilot       = form.date && pilotCount === 0;

  return (
    <div>
      <h2 className="text-lg font-bold text-gray-900 mb-1">일정 선택</h2>
      <p className="text-sm text-gray-500 mb-6">비행 날짜와 시간대를 선택하세요.</p>

      <div className="mb-6">
        <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
          <Calendar className="w-4 h-4" style={{ color: "#2A7AE2" }} />
          비행 날짜
        </label>
        <input
          type="date"
          min={today}
          value={form.date}
          onChange={(e) => onChange({ ...form, date: e.target.value, time_slot: "" })}
          className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:outline-none focus:border-blue-400 text-gray-900 bg-white"
        />
        {form.date && noPilot && (
          <div className="mt-2 rounded-xl px-3 py-2 text-xs flex items-center gap-2 bg-amber-50 text-amber-700">
            <Users className="w-3.5 h-3.5 flex-shrink-0" />
            이 날짜에 출근 등록된 파일럿이 없습니다. 예약은 가능하나 파일럿 배정이 필요합니다.
          </div>
        )}
        {form.date && !noPilot && (
          <div className="mt-2 rounded-xl px-3 py-2 text-xs flex items-center gap-2 bg-blue-50 text-blue-700">
            <Users className="w-3.5 h-3.5 flex-shrink-0" />
            가용 파일럿 {pilotCount}명
          </div>
        )}
      </div>

      {form.date && (
        <div className="mb-8">
          <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-3">
            <Clock className="w-4 h-4" style={{ color: "#2A7AE2" }} />
            시간대 선택
          </label>
          {slotTimes.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">
              운영 시간이 설정되지 않았습니다. 예약슬롯 메뉴에서 설정해주세요.
            </p>
          ) : (
            <div className="grid grid-cols-4 gap-2">
              {slotTimes.map((slot) => {
                const blocked  = blockedForDate.includes(slot);
                const selected = form.time_slot === slot;
                return (
                  <button
                    key={slot}
                    disabled={blocked}
                    onClick={() => onChange({ ...form, time_slot: slot })}
                    className="py-2.5 rounded-lg text-sm font-medium transition-all border-2"
                    style={
                      blocked   ? { backgroundColor: "#FEE2E2", borderColor: "#FECACA", color: "#B91C1C", cursor: "not-allowed" }
                      : selected ? { backgroundColor: "#2A7AE2", borderColor: "#2A7AE2", color: "white" }
                      : { borderColor: "#E5E7EB", backgroundColor: "white", color: "#374151" }
                    }
                  >
                    {slot}
                    {blocked && <span className="block text-xs">차단</span>}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      <div className="flex gap-3">
        <button onClick={onPrev} className="px-5 py-3.5 rounded-xl font-bold text-gray-600 bg-gray-100 hover:bg-gray-200">
          이전
        </button>
        <button
          onClick={onNext}
          disabled={!form.date || !form.time_slot}
          className="flex-1 py-3.5 rounded-xl font-bold text-white disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ backgroundColor: "#2A7AE2" }}
        >
          다음 — 고객 정보
        </button>
      </div>
    </div>
  );
}

// ─── Step 3: 고객 정보 ────────────────────────────────────────────────────────
// ★ 반드시 top-level — 내부 정의 시 한글 IME 깨짐

interface CustomerStepProps {
  form: FormData;
  onChange: (f: FormData) => void;
  onNext: () => void;
  onPrev: () => void;
}

function CustomerStep({ form, onChange, onNext, onPrev }: CustomerStepProps) {
  const nameOk  = form.customer_name.trim().length >= 1;
  const phoneOk = form.customer_phone.replace(/\D/g, "").length >= 9; // 9~11자리 허용
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
            onChange={(e) => onChange({ ...form, customer_name: e.target.value })}
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
            onChange={(e) => onChange({ ...form, customer_phone: formatPhone(e.target.value) })}
            className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:outline-none focus:border-blue-400 text-gray-900 bg-white"
          />
        </div>

        {/* 인원 */}
        <div>
          <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
            <Users className="w-4 h-4" style={{ color: "#2A7AE2" }} />
            체험 인원
          </label>
          <div className="flex items-center gap-3">
            <button
              onClick={() => onChange({ ...form, headcount: Math.max(1, form.headcount - 1) })}
              className="w-10 h-10 rounded-lg bg-gray-100 hover:bg-gray-200 font-bold text-gray-700"
            >
              −
            </button>
            <span className="text-2xl font-black text-gray-900 w-8 text-center">{form.headcount}</span>
            <button
              onClick={() => onChange({ ...form, headcount: form.headcount + 1 })}
              className="w-10 h-10 rounded-lg font-bold text-white"
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
            {CHANNEL_OPTIONS.map((c) => (
              <button
                key={c.value}
                onClick={() => onChange({ ...form, channel: c.value })}
                className="px-4 py-2 rounded-lg text-sm font-medium border-2 transition-all"
                style={
                  form.channel === c.value
                    ? { backgroundColor: "#2A7AE2", borderColor: "#2A7AE2", color: "white" }
                    : { borderColor: "#E5E7EB", color: "#6B7280" }
                }
              >
                {c.label}
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
            onChange={(e) => onChange({ ...form, memo: e.target.value })}
            rows={3}
            className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:outline-none focus:border-blue-400 text-gray-900 bg-white resize-none"
          />
        </div>
      </div>

      <div className="flex gap-3">
        <button onClick={onPrev} className="px-5 py-3.5 rounded-xl font-bold text-gray-600 bg-gray-100 hover:bg-gray-200">
          이전
        </button>
        <button
          onClick={onNext}
          disabled={!canNext}
          className="flex-1 py-3.5 rounded-xl font-bold text-white disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ backgroundColor: "#2A7AE2" }}
        >
          다음 — 예약 확인
        </button>
      </div>
    </div>
  );
}

// ─── Step 4: 예약 확인 ────────────────────────────────────────────────────────

interface ConfirmStepProps {
  form: FormData;
  product: UiProduct | undefined;
  selOpts: UiProduct["options"];
  totalPrice: number;
  depositTotal: number;
  saving: boolean;
  saveError: string;
  onConfirm: () => void;
  onPrev: () => void;
}

function ConfirmStep({
  form, product, selOpts, totalPrice, depositTotal,
  saving, saveError, onConfirm, onPrev,
}: ConfirmStepProps) {
  const dateLabel = form.date
    ? new Date(form.date + "T00:00:00").toLocaleDateString("ko-KR", {
        year: "numeric", month: "long", day: "numeric", weekday: "short",
      })
    : "";
  const channelLabel = CHANNEL_OPTIONS.find((c) => c.value === form.channel)?.label ?? form.channel;

  return (
    <div>
      <h2 className="text-lg font-bold text-gray-900 mb-1">예약 확인</h2>
      <p className="text-sm text-gray-500 mb-6">입력 내용을 확인하고 예약을 확정하세요.</p>

      <div className="rounded-2xl border-2 border-gray-200 overflow-hidden mb-6 bg-white">
        <div className="px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2 mb-2">
            <Package className="w-4 h-4" style={{ color: "#FF8A00" }} />
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">상품</span>
          </div>
          <p className="font-bold text-gray-900">{product?.name} × {form.headcount}인</p>
          <p className="text-sm text-gray-500">{product?.duration_minutes}분 체험비행</p>
          {selOpts.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-1">
              {selOpts.map((o) => (
                <span key={o.id} className="text-xs px-2 py-0.5 rounded-full text-blue-700 bg-blue-50">
                  {o.name}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="w-4 h-4" style={{ color: "#FF8A00" }} />
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">일정</span>
          </div>
          <p className="font-semibold text-gray-900">{dateLabel}</p>
          <p className="text-sm text-gray-500">{form.time_slot}</p>
        </div>

        <div className="px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2 mb-2">
            <User className="w-4 h-4" style={{ color: "#FF8A00" }} />
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">고객 정보</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div><p className="text-gray-400">이름</p><p className="font-medium text-gray-900">{form.customer_name}</p></div>
            <div><p className="text-gray-400">연락처</p><p className="font-medium text-gray-900">{form.customer_phone}</p></div>
            <div><p className="text-gray-400">인원</p><p className="font-medium text-gray-900">{form.headcount}인</p></div>
            <div><p className="text-gray-400">접수 경로</p><p className="font-medium text-gray-900">{channelLabel}</p></div>
            {form.memo && (
              <div className="col-span-2">
                <p className="text-gray-400">메모</p>
                <p className="font-medium text-gray-900">{form.memo}</p>
              </div>
            )}
          </div>
        </div>

        <div className="px-5 py-4 bg-amber-50">
          <div className="flex justify-between text-sm mb-1">
            <span className="text-gray-600">총액</span>
            <span className="font-semibold text-gray-900">{formatPrice(totalPrice)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">예약금 (지금 결제)</span>
            <span className="font-bold" style={{ color: "#2A7AE2" }}>{formatPrice(depositTotal)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">현장 결제 (잔금)</span>
            <span className="text-gray-500">{formatPrice(Math.max(0, totalPrice - depositTotal))}</span>
          </div>
        </div>
      </div>

      {saveError && (
        <div className="flex items-center gap-2 rounded-xl px-4 py-3 mb-4 bg-red-50 text-red-600 text-sm">
          <X className="w-4 h-4 flex-shrink-0" />
          {saveError}
        </div>
      )}

      <div className="flex gap-3">
        <button onClick={onPrev} className="px-5 py-3.5 rounded-xl font-bold text-gray-600 bg-gray-100 hover:bg-gray-200">
          이전
        </button>
        <button
          onClick={onConfirm}
          disabled={saving}
          className="flex-1 py-3.5 rounded-xl font-bold text-white disabled:opacity-60"
          style={{ backgroundColor: "#FF8A00" }}
        >
          {saving ? "저장 중..." : "예약 확정"}
        </button>
      </div>
    </div>
  );
}

// ─── Step 5: 완료 ─────────────────────────────────────────────────────────────

interface DoneStepProps {
  bookingNo: string;
  form: FormData;
  product: UiProduct | undefined;
  onReset: () => void;
}

function DoneStep({ bookingNo, form, product, onReset }: DoneStepProps) {
  const dateLabel = form.date
    ? new Date(form.date + "T00:00:00").toLocaleDateString("ko-KR", { month: "long", day: "numeric", weekday: "short" })
    : "";

  return (
    <div className="text-center py-4">
      <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6" style={{ backgroundColor: "#F4F8FF" }}>
        <CheckCircle2 className="w-10 h-10" style={{ color: "#2A7AE2" }} />
      </div>
      <h2 className="text-2xl font-bold text-gray-900 mb-2">예약 확정 완료!</h2>
      <p className="text-gray-500 mb-8">예약이 저장되었습니다.</p>

      <div className="rounded-2xl p-5 mb-6 text-left" style={{ backgroundColor: "#F4F8FF" }}>
        <p className="text-xs text-gray-400 mb-1">예약 번호</p>
        <p className="text-xl font-bold font-mono" style={{ color: "#0D2B52" }}>{bookingNo}</p>
      </div>

      <div className="rounded-2xl border-2 border-gray-100 bg-white p-5 mb-4 text-left">
        <div className="flex items-center gap-2 mb-3">
          <Plane className="w-4 h-4" style={{ color: "#FF8A00" }} />
          <span className="text-sm font-semibold text-gray-600">파일럿 배정 필요</span>
        </div>
        <p className="text-sm text-gray-500">예약대장에서 파일럿을 배정해 주세요.</p>
      </div>

      <div className="rounded-2xl bg-gray-50 p-4 mb-8 text-sm text-left">
        <div className="grid grid-cols-2 gap-2">
          <div><span className="text-gray-400">상품</span><p className="font-medium">{product?.name} × {form.headcount}인</p></div>
          <div><span className="text-gray-400">일정</span><p className="font-medium">{dateLabel} {form.time_slot}</p></div>
          <div><span className="text-gray-400">고객</span><p className="font-medium">{form.customer_name}</p></div>
          <div><span className="text-gray-400">연락처</span><p className="font-medium">{form.customer_phone}</p></div>
        </div>
      </div>

      <div className="flex gap-3">
        <Link
          href="/admin/bookings"
          className="flex-1 py-3.5 rounded-xl font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 text-center"
        >
          예약대장 보기
        </Link>
        <button
          onClick={onReset}
          className="flex-1 py-3.5 rounded-xl font-bold text-white"
          style={{ backgroundColor: "#2A7AE2" }}
        >
          새 예약 입력
        </button>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const INIT_FORM: FormData = {
  product_id: "", selected_options: [],
  date: "", time_slot: "",
  customer_name: "", customer_phone: "",
  headcount: 1, channel: "phone", memo: "",
};

export default function NewBookingPage() {
  const [step, setStep]       = useState<Step>("product");
  const [form, setForm]       = useState<FormData>(INIT_FORM);
  const [bookingNo, setBookingNo] = useState("");
  const [saving, setSaving]   = useState(false);
  const [saveError, setSaveError] = useState("");

  // ── DB 상품/옵션 ────────────────────────────────────────────────
  const [uiProducts, setUiProducts]     = useState<UiProduct[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);

  useEffect(() => {
    (async () => {
      setLoadingProducts(true);
      try {
        const [pRes, oRes] = await Promise.all([
          fetch("/api/products"),
          fetch("/api/product-options"),
        ]);
        const dbProducts: DbProduct[] = pRes.ok ? await pRes.json() : [];
        const dbOptions:  DbOption[]  = oRes.ok ? await oRes.json() : [];
        setUiProducts(dbProducts.map((p) => toUiProduct(p, dbOptions)));
      } finally {
        setLoadingProducts(false);
      }
    })();
  }, []);

  const slotCfg    = useSlotConfig();
  const blocked    = useBlockedSlots();
  const schedules  = useSchedules();
  const slotTimes  = generateSlotTimes(slotCfg);

  const product    = uiProducts.find((p) => p.id === form.product_id);
  const selOpts    = product?.options.filter((o) => form.selected_options.includes(o.id)) ?? [];
  const totalPrice = ((product?.base_price ?? 0) + selOpts.reduce((s, o) => s + o.price, 0)) * form.headcount;
  const depositTotal = (product?.deposit_per_person ?? 0) * form.headcount
                     + selOpts.reduce((s, o) => s + o.price, 0);

  async function handleConfirm() {
    if (!product) return;
    setSaving(true);
    setSaveError("");
    try {
      const opts = selOpts.map((o) => ({ name: o.name, price: o.price }));
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer_name:  form.customer_name,
          customer_phone: form.customer_phone,
          product_id:     product.id,       // UUID
          product_name:   product.name,
          product_price:  product.base_price,
          headcount:      form.headcount,
          flight_date:    form.date,
          flight_time:    form.time_slot,
          options:        opts,
          total_price:    totalPrice,
          deposit_amount: depositTotal,
          balance_amount: Math.max(0, totalPrice - depositTotal),
          channel:        form.channel,
          memo:           form.memo || null,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "저장 실패");
      }
      const data = await res.json();
      setBookingNo(data.booking_no);
      setStep("done");
    } catch (e: unknown) {
      setSaveError(e instanceof Error ? e.message : "오류가 발생했습니다.");
    } finally {
      setSaving(false);
    }
  }

  function handleReset() {
    setStep("product");
    setForm(INIT_FORM);
    setBookingNo("");
    setSaveError("");
  }

  return (
    <div className="p-8">
      <div className="flex items-center gap-3 mb-8">
        <Link href="/admin/bookings" className="p-2 rounded-lg hover:bg-gray-200 text-gray-500">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">새 예약 입력</h1>
          <p className="text-sm text-gray-500">유선 상담 후 예약을 직접 입력합니다.</p>
        </div>
      </div>

      <div className="max-w-xl">
        {step !== "done" && <StepIndicator current={step} />}

        {step === "product" && (
          <ProductStep
            form={form} onChange={setForm} onNext={() => setStep("schedule")}
            products={uiProducts} loadingProducts={loadingProducts}
          />
        )}
        {step === "schedule" && (
          <ScheduleStep
            form={form} onChange={setForm}
            onNext={() => setStep("customer")} onPrev={() => setStep("product")}
            slotTimes={slotTimes} blockedSlots={blocked} schedules={schedules}
          />
        )}
        {step === "customer" && (
          <CustomerStep
            form={form} onChange={setForm}
            onNext={() => setStep("confirm")} onPrev={() => setStep("schedule")}
          />
        )}
        {step === "confirm" && (
          <ConfirmStep
            form={form} product={product} selOpts={selOpts}
            totalPrice={totalPrice} depositTotal={depositTotal}
            saving={saving} saveError={saveError}
            onConfirm={handleConfirm} onPrev={() => setStep("customer")}
          />
        )}
        {step === "done" && (
          <DoneStep bookingNo={bookingNo} form={form} product={product} onReset={handleReset} />
        )}
      </div>
    </div>
  );
}
