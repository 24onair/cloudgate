"use client";

/**
 * 모바일 어드민 — 전화 응대용 예약 입력.
 *
 * 디자인 결정:
 *  - 단일 페이지 세로 스크롤 (step indicator 없음). 통화 순서대로 위→아래 입력.
 *  - 하단 sticky 바에 합계 금액 + "예약 확정" 버튼. 필수 미충족 시 비활성화.
 *  - 1초 디바운스 localStorage 임시저장. 진입 시 24h 이내 draft 있으면 복원 배너.
 *  - 확정: POST /api/bookings → 성공 시 즉시 POST /api/admin/booking-pilots/auto-assign
 *    → 결과를 BottomSheet로 표시 (이월/exhausted 시각화).
 *  - 알림톡·SMS 결제링크 발송은 토글만 노출. 실제 발송 인프라는 추후 PR에서 연동.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Info,
  MessageSquare,
  RefreshCw,
  Save,
  Trash2,
} from "lucide-react";
import BottomSheet from "@/components/mobile/BottomSheet";
import StickyActionBar from "@/components/mobile/StickyActionBar";
import { clearDraft, formatAge, loadDraft, saveDraft } from "@/lib/admin-m/draft";

// ─── 타입 ─────────────────────────────────────────────────────────

interface DbProduct {
  id: string;
  slug: string;
  name: string;
  subtitle: string | null;
  price: number;
  duration_min: number | null;
}
interface DbOption {
  id: string;
  product_id: string;
  name: string;
  price: number;
}
interface UiProduct {
  id: string;
  name: string;
  subtitle: string;
  base_price: number;
  deposit_per_person: number;
  duration_min: number;
  options: { id: string; name: string; price: number }[];
}

interface DayCapacitySlot {
  time: string;        // "HH:MM"
  occupied: number;    // 이미 배정된 파일럿 수
  free: number;        // active_pilots - occupied (그 시각에 더 받을 수 있는 비행 수)
  exhausted: boolean;  // free === 0
}

interface DayCapacity {
  date: string;
  active_pilots: number;
  slot_count: number;
  slots?: DayCapacitySlot[];
  total: number;
  booked: number;
  remaining: number;
  exhausted: boolean;
}

interface SlotConfigValue {
  startTime: string;
  endTime: string;
  intervalMinutes: number;
}

interface FormState {
  product_id: string;
  selected_option_ids: string[];
  date: string;        // YYYY-MM-DD
  time_slot: string;   // "HH:MM"
  headcount: number;
  customer_name: string;
  customer_phone: string;
  memo: string;
  send_kakao: boolean;
  // 결제링크 SMS는 전화 예약에서 항상 발송(예약금 필수)이라 토글 없음.
}

// 현장 도착 모델: 예약 단계에서는 파일럿을 배정하지 않으므로 결과 페이로드는
// 예약 식별자만 보관한다. (자동 배정 결과 표시는 today 보드 [현장 도착] 액션으로 이동)
interface ResultPayload {
  booking_no: string;
  booking_id: string;
}

const DRAFT_SLOT = "new_booking_v1";

const INIT_FORM: FormState = {
  product_id: "",
  selected_option_ids: [],
  date: "",
  time_slot: "",
  headcount: 1,
  customer_name: "",
  customer_phone: "",
  memo: "",
  send_kakao: true,
};

// ─── 유틸 ─────────────────────────────────────────────────────────

function toUiProduct(p: DbProduct, opts: DbOption[]): UiProduct {
  return {
    id: p.id,
    name: p.name,
    subtitle: p.subtitle ?? `${p.duration_min ?? 0}분 체험비행`,
    base_price: p.price,
    deposit_per_person: 10000,
    duration_min: p.duration_min ?? 0,
    options: opts
      .filter((o) => o.product_id === p.id)
      .map((o) => ({ id: o.id, name: o.name, price: o.price })),
  };
}

function formatPhone(value: string) {
  const d = value.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 7) return `${d.slice(0, 3)}-${d.slice(3)}`;
  return `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7)}`;
}

function formatPrice(n: number) {
  return n.toLocaleString("ko-KR") + "원";
}

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function offsetISO(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function dayLabel(iso: string): { num: string; weekday: string; isToday: boolean } {
  const d = new Date(iso + "T00:00:00");
  const days = ["일", "월", "화", "수", "목", "금", "토"];
  return {
    num: `${d.getMonth() + 1}/${d.getDate()}`,
    weekday: days[d.getDay()],
    isToday: iso === todayISO(),
  };
}

function timeToMin(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}
function minToTime(min: number): string {
  return `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
}
function generateSlots(cfg: SlotConfigValue): string[] {
  const start = timeToMin(cfg.startTime);
  const end = timeToMin(cfg.endTime);
  const out: string[] = [];
  for (let t = start; t <= end; t += cfg.intervalMinutes) out.push(minToTime(t));
  return out;
}

/**
 * 결제 링크 SMS 본문 미리보기.
 * 실제 발송 시 PG에서 결제 링크 URL이 자리에 들어감.
 */
function buildSmsPreview(p: {
  customer_name: string;
  product_name: string;
  headcount: number;
  date: string;
  time_slot: string;
  total_price: number;
  deposit: number;
  balance: number;
}): string {
  const name = p.customer_name?.trim() || "고객";
  const when =
    p.date && p.time_slot
      ? `${p.date.slice(5).replace("-", "/")} ${p.time_slot}`
      : "(일정 미정)";
  return [
    `[구름상회] ${name}님 예약 안내`,
    `· 상품: ${p.product_name} × ${p.headcount}명`,
    `· 일시: ${when}`,
    `· 총 ${p.total_price.toLocaleString("ko-KR")}원`,
    `  └ 예약금 ${p.deposit.toLocaleString("ko-KR")}원 (지금 결제)`,
    `  └ 잔금 ${p.balance.toLocaleString("ko-KR")}원 (현장 결제)`,
    `결제 링크 ▶ https://pay.guruem-shop.example/...`,
  ].join("\n");
}

// ─── 페이지 ───────────────────────────────────────────────────────

export default function NewMobileBookingPage() {
  // 데이터 로드
  const [products, setProducts] = useState<UiProduct[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [slotConfig, setSlotConfig] = useState<SlotConfigValue>({
    startTime: "09:00",
    endTime: "17:00",
    intervalMinutes: 30,
  });

  // 폼
  const [form, setForm] = useState<FormState>(INIT_FORM);

  // 임시저장 복원
  const [restorePrompt, setRestorePrompt] = useState<{ ageMs: number; data: FormState } | null>(null);
  const restoreCheckedRef = useRef(false);

  // 날짜·슬롯 보조 상태
  const [dayCap, setDayCap] = useState<DayCapacity | null>(null);
  const [dayCapLoading, setDayCapLoading] = useState(false);

  // 메모 섹션 펼침
  const [memoOpen, setMemoOpen] = useState(false);

  // 제출 상태
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [result, setResult] = useState<ResultPayload | null>(null);

  // ── 초기 데이터 로드 ────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      setLoadingProducts(true);
      try {
        const [pRes, oRes, sRes] = await Promise.all([
          fetch("/api/products", { cache: "no-store" }),
          fetch("/api/product-options", { cache: "no-store" }),
          fetch("/api/site-settings/slot_config", { cache: "no-store" }).catch(() => null),
        ]);
        const dbProducts: DbProduct[] = pRes.ok ? await pRes.json() : [];
        const dbOptions: DbOption[] = oRes.ok ? await oRes.json() : [];
        setProducts(dbProducts.map((p) => toUiProduct(p, dbOptions)));
        if (sRes && sRes.ok) {
          const j = await sRes.json();
          const v = j?.value;
          if (v?.startTime && v?.endTime && v?.intervalMinutes) {
            setSlotConfig({
              startTime: v.startTime,
              endTime: v.endTime,
              intervalMinutes: Number(v.intervalMinutes),
            });
          }
        }
      } finally {
        setLoadingProducts(false);
      }
    })();
  }, []);

  // ── 임시저장 진입 시 복원 프롬프트 ──────────────────────────────
  useEffect(() => {
    if (restoreCheckedRef.current) return;
    restoreCheckedRef.current = true;
    const draft = loadDraft<FormState>(DRAFT_SLOT);
    if (draft && (draft.data.customer_name || draft.data.customer_phone || draft.data.product_id)) {
      setRestorePrompt({ ageMs: draft.ageMs, data: draft.data });
    }
  }, []);

  // ── 폼 변경 시 1초 디바운스 임시저장 ────────────────────────────
  useEffect(() => {
    const hasContent =
      form.product_id ||
      form.customer_name ||
      form.customer_phone ||
      form.date ||
      form.time_slot ||
      form.memo;
    if (!hasContent) return;
    const tid = setTimeout(() => saveDraft(DRAFT_SLOT, form), 1000);
    return () => clearTimeout(tid);
  }, [form]);

  // ── 날짜 변경 시 day-capacity 조회 ──────────────────────────────
  useEffect(() => {
    if (!form.date) {
      setDayCap(null);
      return;
    }
    let cancelled = false;
    setDayCapLoading(true);
    fetch(`/api/bookings/day-capacity?date=${form.date}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (!cancelled) setDayCap(j);
      })
      .finally(() => {
        if (!cancelled) setDayCapLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [form.date]);

  // ── 파생 ──────────────────────────────────────────────────────────
  const selectedProduct = useMemo(
    () => products.find((p) => p.id === form.product_id) ?? null,
    [products, form.product_id],
  );
  const selectedOptions = useMemo(
    () =>
      (selectedProduct?.options ?? []).filter((o) =>
        form.selected_option_ids.includes(o.id),
      ),
    [selectedProduct, form.selected_option_ids],
  );

  const optionsTotal = selectedOptions.reduce((s, o) => s + o.price, 0);
  const perPersonPrice = (selectedProduct?.base_price ?? 0) + optionsTotal;
  const totalPrice = perPersonPrice * form.headcount;
  const depositTotal =
    (selectedProduct?.deposit_per_person ?? 0) * form.headcount + optionsTotal;
  const balance = Math.max(0, totalPrice - depositTotal);

  const slotTimes = useMemo(() => generateSlots(slotConfig), [slotConfig]);
  const dateChoices = useMemo(() => Array.from({ length: 14 }, (_, i) => offsetISO(i)), []);

  // 폰 통화 형식 검증 (010xxxxxxxx 11자리만 통과)
  const phoneDigits = form.customer_phone.replace(/\D/g, "");
  const phoneValid = phoneDigits.length === 10 || phoneDigits.length === 11;
  const isComplete =
    !!form.product_id &&
    !!form.date &&
    !!form.time_slot &&
    form.headcount >= 1 &&
    form.customer_name.trim().length >= 1 &&
    phoneValid;

  // ── 액션 ──────────────────────────────────────────────────────────
  function patch(p: Partial<FormState>) {
    setForm((f) => ({ ...f, ...p }));
  }
  function toggleOption(id: string) {
    setForm((f) => ({
      ...f,
      selected_option_ids: f.selected_option_ids.includes(id)
        ? f.selected_option_ids.filter((x) => x !== id)
        : [...f.selected_option_ids, id],
    }));
  }

  function restoreFromPrompt() {
    if (!restorePrompt) return;
    setForm(restorePrompt.data);
    setRestorePrompt(null);
  }
  function discardDraft() {
    clearDraft(DRAFT_SLOT);
    setRestorePrompt(null);
  }

  async function handleConfirm() {
    if (!isComplete || !selectedProduct) return;
    setSubmitting(true);
    setSubmitError("");
    try {
      // 예약만 생성 — 파일럿 배정은 손님 현장 도착 시 today 보드에서 진행.
      const opts = selectedOptions.map((o) => ({ name: o.name, price: o.price }));
      const createRes = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer_name: form.customer_name.trim(),
          customer_phone: formatPhone(form.customer_phone),
          product_id: selectedProduct.id,
          product_name: selectedProduct.name,
          product_price: selectedProduct.base_price,
          headcount: form.headcount,
          flight_date: form.date,
          flight_time: form.time_slot,
          options: opts,
          total_price: totalPrice,
          deposit_amount: depositTotal,
          balance_amount: balance,
          channel: "phone",
          memo: form.memo.trim() || null,
        }),
      });
      if (!createRes.ok) {
        const err = await createRes.json().catch(() => ({}));
        throw new Error(err.error ?? "예약 저장 실패");
      }
      const created = await createRes.json();
      setResult({ booking_no: created.booking_no, booking_id: created.id });
      clearDraft(DRAFT_SLOT);
    } catch (e: unknown) {
      setSubmitError(e instanceof Error ? e.message : "오류가 발생했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  function startNew() {
    setResult(null);
    setForm(INIT_FORM);
    setSubmitError("");
  }

  // ─── 렌더 ────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col w-full flex-1 pb-4">
      {/* 상단 헤더 */}
      <header className="px-5 pt-4 pb-3 flex items-center gap-2">
        <Link
          href="/admin/m"
          className="w-11 h-11 rounded-full bg-white shadow-sm flex items-center justify-center active:scale-95 transition"
          aria-label="뒤로"
        >
          <ArrowLeft size={20} style={{ color: "#0D2B52" }} />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="text-lg font-bold" style={{ color: "#0D2B52" }}>
            전화 예약 받기
          </div>
          <div className="text-xs" style={{ color: "#65675e" }}>
            통화하며 위에서 아래로 입력
          </div>
        </div>
      </header>

      {/* 임시저장 복원 배너 */}
      {restorePrompt && (
        <div className="px-5 mb-2">
          <div
            className="rounded-xl p-3 flex items-start gap-3"
            style={{ backgroundColor: "#FFFBEB", border: "1px solid #FCD34D" }}
          >
            <Save size={18} style={{ color: "#B45309" }} className="shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold" style={{ color: "#92400E" }}>
                작성 중이던 예약이 있습니다
              </div>
              <div className="text-xs mt-0.5" style={{ color: "#92400E" }}>
                {formatAge(restorePrompt.ageMs)}
              </div>
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  onClick={restoreFromPrompt}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold text-white"
                  style={{ backgroundColor: "#B45309" }}
                >
                  복원
                </button>
                <button
                  type="button"
                  onClick={discardDraft}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold"
                  style={{ backgroundColor: "white", color: "#92400E", border: "1px solid #FCD34D" }}
                >
                  버리기
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 섹션 ①: 고객 (성명·연락처·메모) — 통화 첫 질문 순서대로 */}
      <Section title="① 고객" required>
        <label className="block mb-3">
          <div className="text-xs font-semibold mb-1" style={{ color: "#65675e" }}>
            성명
          </div>
          <input
            type="text"
            autoComplete="name"
            inputMode="text"
            placeholder="예: 김구름"
            value={form.customer_name}
            onChange={(e) => patch({ customer_name: e.target.value })}
            className="w-full px-4 py-3 rounded-xl bg-white text-base outline-none transition focus:border-blue-400"
            style={{ border: "1px solid #E5E7EB" }}
          />
        </label>
        <label className="block">
          <div className="text-xs font-semibold mb-1" style={{ color: "#65675e" }}>
            연락처
          </div>
          <input
            type="tel"
            inputMode="numeric"
            autoComplete="tel"
            placeholder="010-1234-5678"
            value={form.customer_phone}
            onChange={(e) => patch({ customer_phone: formatPhone(e.target.value) })}
            className="w-full px-4 py-3 rounded-xl bg-white text-base outline-none transition tracking-wider"
            style={{
              border: `1px solid ${
                form.customer_phone && !phoneValid ? "#F87171" : "#E5E7EB"
              }`,
            }}
          />
          {form.customer_phone && !phoneValid && (
            <div className="text-xs mt-1" style={{ color: "#B91C1C" }}>
              10~11자리 숫자여야 합니다
            </div>
          )}
        </label>

        {/* 메모 (접힘) */}
        <button
          type="button"
          onClick={() => setMemoOpen((v) => !v)}
          className="mt-3 w-full flex items-center justify-between text-sm font-medium px-1"
          style={{ color: "#65675e" }}
        >
          <span className="flex items-center gap-1">
            <MessageSquare size={14} /> 메모 (선택)
          </span>
          {memoOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
        {memoOpen && (
          <textarea
            rows={2}
            value={form.memo}
            onChange={(e) => patch({ memo: e.target.value })}
            placeholder="예: 임산부 동반, 카메라 추가 요청, 알레르기 등"
            className="mt-2 w-full px-4 py-3 rounded-xl bg-white text-sm outline-none"
            style={{ border: "1px solid #E5E7EB" }}
          />
        )}
      </Section>

      {/* 섹션 ②: 날짜·시간 */}
      <Section title="② 날짜·시간" required>
        {/* 날짜 가로 스크롤 */}
        <div className="text-xs font-semibold mb-2" style={{ color: "#65675e" }}>
          날짜
        </div>
        <div className="-mx-5 px-5 overflow-x-auto">
          <div className="flex gap-2 pb-2 w-max">
            {dateChoices.map((iso) => {
              const sel = form.date === iso;
              const lbl = dayLabel(iso);
              return (
                <button
                  key={iso}
                  type="button"
                  onClick={() => patch({ date: iso, time_slot: "" })}
                  className="px-3 py-2 rounded-xl text-center transition active:scale-95 shrink-0"
                  style={{
                    backgroundColor: sel ? "#0D2B52" : "white",
                    color: sel ? "white" : "#4d4f46",
                    border: `1px solid ${sel ? "#0D2B52" : "#E5E7EB"}`,
                    minWidth: 64,
                  }}
                >
                  <div className="text-[10px] font-medium" style={{ opacity: 0.7 }}>
                    {lbl.weekday}
                    {lbl.isToday ? " · 오늘" : ""}
                  </div>
                  <div className="text-base font-bold mt-0.5">{lbl.num}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* day-capacity 정보 */}
        {form.date && (
          <div className="mt-2 text-xs flex items-center gap-2">
            {dayCapLoading ? (
              <span style={{ color: "#9ea096" }}>자리 확인 중…</span>
            ) : dayCap ? (
              dayCap.exhausted ? (
                <span
                  className="px-2 py-1 rounded-md font-bold"
                  style={{ backgroundColor: "#FEE2E2", color: "#B91C1C" }}
                >
                  ⚠ 그날 자리 마감
                </span>
              ) : (
                <span
                  className="px-2 py-1 rounded-md font-medium"
                  style={{ backgroundColor: "#ECFDF5", color: "#047857" }}
                >
                  남은 자리 {dayCap.remaining}명
                </span>
              )
            ) : null}
          </div>
        )}

        {/* 슬롯 가로 스크롤 */}
        {form.date && (
          <>
            <div className="text-xs font-semibold mt-4 mb-2" style={{ color: "#65675e" }}>
              시간
            </div>
            <div className="-mx-5 px-5 overflow-x-auto">
              <div className="flex gap-2 pb-2 w-max">
                {slotTimes.map((t) => {
                  const sel = form.time_slot === t;
                  const slotInfo = dayCap?.slots?.find((s) => s.time === t);
                  // 슬롯 정보가 아직 없으면(로딩 등) 자리 정보는 비표시.
                  // 마감(free=0)이어도 클릭은 허용 — 자동 배정 알고리즘이 다음 슬롯으로 spillover.
                  const full = slotInfo?.exhausted ?? false;
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => patch({ time_slot: t })}
                      className="px-4 py-2 rounded-xl transition active:scale-95 shrink-0 flex flex-col items-center gap-0.5"
                      style={{
                        backgroundColor: sel
                          ? "#0D2B52"
                          : full
                            ? "#F3F4F6"
                            : "white",
                        color: sel ? "white" : full ? "#9CA3AF" : "#0D2B52",
                        border: `1px solid ${
                          sel ? "#0D2B52" : full ? "#E5E7EB" : "#E5E7EB"
                        }`,
                        minWidth: 68,
                      }}
                    >
                      <span className="text-sm font-bold leading-tight">{t}</span>
                      {slotInfo && (
                        <span
                          className="text-[10px] font-medium leading-tight"
                          style={{
                            color: sel
                              ? "rgba(255,255,255,0.85)"
                              : full
                                ? "#B91C1C"
                                : "#15803D",
                          }}
                        >
                          {full ? "마감" : `${slotInfo.free}석`}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="mt-2 text-xs" style={{ color: "#9ea096" }}>
              마감된 시각을 선택해도 자동 배정이 이후 시각으로 이월합니다.
            </div>
          </>
        )}
      </Section>

      {/* 섹션 ③: 인원 */}
      <Section title="③ 인원" required>
        <div className="flex items-center justify-between bg-white rounded-xl p-3 border border-gray-100">
          <div>
            <div className="text-sm font-semibold" style={{ color: "#0D2B52" }}>
              체험하실 손님 수
            </div>
            <div className="text-xs mt-0.5" style={{ color: "#65675e" }}>
              −/+ 로 조정
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => patch({ headcount: Math.max(1, form.headcount - 1) })}
              className="w-10 h-10 rounded-full bg-gray-100 text-2xl font-bold active:scale-95 disabled:opacity-40"
              disabled={form.headcount <= 1}
              aria-label="인원 감소"
            >
              −
            </button>
            <div className="w-10 text-center text-2xl font-bold" style={{ color: "#0D2B52" }}>
              {form.headcount}
            </div>
            <button
              type="button"
              onClick={() => patch({ headcount: Math.min(20, form.headcount + 1) })}
              className="w-10 h-10 rounded-full text-2xl font-bold text-white active:scale-95"
              style={{ backgroundColor: "#0D2B52" }}
              aria-label="인원 증가"
            >
              +
            </button>
          </div>
        </div>
      </Section>

      {/* 섹션 ④: 코스 (상품 + 옵션) */}
      <Section title="④ 코스" required>
        {loadingProducts ? (
          <div className="text-sm" style={{ color: "#9ea096" }}>상품 불러오는 중…</div>
        ) : products.length === 0 ? (
          <div className="text-sm" style={{ color: "#B91C1C" }}>등록된 상품이 없습니다.</div>
        ) : (
          <div className="space-y-2">
            {products.map((p) => {
              const sel = form.product_id === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => patch({ product_id: p.id, selected_option_ids: [] })}
                  className="w-full text-left p-3 rounded-xl border-2 transition active:scale-[0.99]"
                  style={{
                    borderColor: sel ? "#2A7AE2" : "#E5E7EB",
                    backgroundColor: sel ? "#EFF6FF" : "white",
                  }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-bold" style={{ color: "#0D2B52" }}>
                        {p.name}
                      </div>
                      <div className="text-xs mt-0.5" style={{ color: "#65675e" }}>
                        {p.subtitle}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-bold" style={{ color: "#0D2B52" }}>
                        {formatPrice(p.base_price)}
                      </div>
                      <div className="text-xs" style={{ color: "#9ea096" }}>
                        1인 기준
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {selectedProduct && selectedProduct.options.length > 0 && (
          <div className="mt-3">
            <div className="text-xs font-semibold mb-2" style={{ color: "#65675e" }}>
              추가 옵션 (1회 적용)
            </div>
            <div className="flex flex-wrap gap-2">
              {selectedProduct.options.map((o) => {
                const sel = form.selected_option_ids.includes(o.id);
                return (
                  <button
                    key={o.id}
                    type="button"
                    onClick={() => toggleOption(o.id)}
                    className="px-3 py-2 rounded-full text-xs font-medium transition active:scale-95"
                    style={{
                      backgroundColor: sel ? "#0D2B52" : "white",
                      color: sel ? "white" : "#4d4f46",
                      border: `1px solid ${sel ? "#0D2B52" : "#E5E7EB"}`,
                    }}
                  >
                    {sel && "✓ "}
                    {o.name} +{formatPrice(o.price)}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </Section>

      {/* 섹션 ⑤: 결제·알림 */}
      <Section title="⑤ 결제·알림">
        {/* 결제 링크 SMS 안내 — 전화 예약은 예약금 필수라 토글 X, 항상 발송 */}
        <div
          className="rounded-xl p-3 mb-3"
          style={{ backgroundColor: "#EFF6FF", border: "1.5px solid #2A7AE2" }}
        >
          <div className="flex items-start gap-2">
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
              style={{ backgroundColor: "#2A7AE2" }}
            >
              <MessageSquare size={14} style={{ color: "white" }} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-bold" style={{ color: "#0D2B52" }}>
                결제 링크 SMS 자동 발송
              </div>
              <div className="text-[11px] mt-0.5" style={{ color: "#4d4f46" }}>
                예약 확정 시 고객에게 토스·카카오페이 결제 링크를 SMS로 전송합니다.
                총액 / 예약금 / 잔금이 함께 안내됩니다.
              </div>
            </div>
          </div>

          {/* SMS 본문 미리보기 (가격 정보 있을 때만) */}
          {selectedProduct && (
            <div
              className="mt-3 p-3 rounded-lg text-[11px] leading-relaxed whitespace-pre-wrap font-mono"
              style={{ backgroundColor: "white", border: "1px dashed #93C5FD", color: "#4d4f46" }}
            >
              {buildSmsPreview({
                customer_name: form.customer_name,
                product_name: selectedProduct.name,
                headcount: form.headcount,
                date: form.date,
                time_slot: form.time_slot,
                total_price: totalPrice,
                deposit: depositTotal,
                balance,
              })}
            </div>
          )}

          <div className="text-[11px] mt-2" style={{ color: "#65675e" }}>
            ※ 결제 PG 연동 전이라 지금은 발송 기록만 남고 실제 SMS는 전송되지 않습니다.
          </div>
        </div>

        {/* 카톡 알림톡 (별개 안내 메시지) */}
        <label
          className="flex items-center justify-between p-3 rounded-xl bg-white"
          style={{ border: "1px solid #E5E7EB" }}
        >
          <div>
            <div className="text-sm font-semibold" style={{ color: "#0D2B52" }}>
              카톡 알림톡 자동 발송
            </div>
            <div className="text-[11px] mt-0.5" style={{ color: "#65675e" }}>
              예약 확정 안내 (이용 시각·장소·유의사항)
            </div>
          </div>
          <input
            type="checkbox"
            checked={form.send_kakao}
            onChange={(e) => patch({ send_kakao: e.target.checked })}
            className="w-6 h-6 accent-blue-600"
          />
        </label>
        <div className="text-[11px] mt-1.5" style={{ color: "#9ea096" }}>
          ※ 알림톡 채널 연동 전이라 지금은 기록만 남습니다.
        </div>
      </Section>

      {/* 합계 카드 */}
      {selectedProduct && (
        <div className="mx-5 mt-2 mb-2 rounded-2xl bg-white p-4" style={{ border: "1px solid #E5E7EB" }}>
          <div className="text-xs font-semibold mb-2" style={{ color: "#65675e" }}>
            합계
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-sm" style={{ color: "#4d4f46" }}>
              {selectedProduct.name} × {form.headcount}
            </span>
            <span className="font-bold" style={{ color: "#0D2B52" }}>
              {formatPrice(perPersonPrice * form.headcount)}
            </span>
          </div>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xs" style={{ color: "#65675e" }}>
              예약금 (예약 시 결제분)
            </span>
            <span className="font-semibold text-sm" style={{ color: "#2A7AE2" }}>
              {formatPrice(depositTotal)}
            </span>
          </div>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xs" style={{ color: "#65675e" }}>
              잔금 (현장 결제분)
            </span>
            <span className="font-semibold text-sm" style={{ color: "#65675e" }}>
              {formatPrice(balance)}
            </span>
          </div>
        </div>
      )}

      {submitError && (
        <div className="mx-5 mt-2 rounded-xl p-3 flex items-start gap-2" style={{ backgroundColor: "#FEF2F2" }}>
          <AlertTriangle size={16} style={{ color: "#B91C1C" }} className="shrink-0 mt-0.5" />
          <div className="text-sm" style={{ color: "#B91C1C" }}>{submitError}</div>
        </div>
      )}

      {/* 하단 sticky 액션 바 */}
      <StickyActionBar>
        <button
          type="button"
          onClick={() => {
            if (confirm("작성 중인 내용을 모두 비우시겠어요?")) {
              clearDraft(DRAFT_SLOT);
              setForm(INIT_FORM);
            }
          }}
          className="w-12 h-12 rounded-xl flex items-center justify-center bg-gray-100 active:scale-95"
          aria-label="비우기"
        >
          <Trash2 size={18} style={{ color: "#65675e" }} />
        </button>
        <button
          type="button"
          onClick={handleConfirm}
          disabled={!isComplete || submitting}
          className="flex-1 h-12 rounded-xl font-bold text-base text-white active:scale-[0.99] disabled:opacity-40 disabled:active:scale-100"
          style={{ backgroundColor: "#0D2B52" }}
        >
          {submitting ? "처리 중…" : isComplete ? "예약 확정 + 자동 배정" : "필수 항목 입력"}
        </button>
      </StickyActionBar>

      {/* 결과 BottomSheet */}
      <BottomSheet
        open={!!result}
        onClose={() => {
          /* close=새 예약 — 명시적 시작 버튼만 허용 */
        }}
        title="예약접수 완료"
      >
        {result && (
          <ResultBody
            result={result}
            customer_name={form.customer_name}
            send_kakao={form.send_kakao}
            onStartNew={startNew}
          />
        )}
      </BottomSheet>
    </div>
  );
}

// ─── 섹션 래퍼 ──────────────────────────────────────────────────────

function Section({
  title,
  required,
  children,
}: {
  title: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section className="px-5 mt-4">
      <div className="text-xs font-bold mb-2 flex items-center gap-1" style={{ color: "#0D2B52" }}>
        {title}
        {required && <span style={{ color: "#EF4444" }}>*</span>}
      </div>
      <div>{children}</div>
    </section>
  );
}

// ─── 결과 시트 본문 ─────────────────────────────────────────────────

function ResultBody({
  result,
  customer_name,
  send_kakao,
  onStartNew,
}: {
  result: ResultPayload;
  customer_name: string;
  send_kakao: boolean;
  onStartNew: () => void;
}) {
  return (
    <div>
      {/* 성공 헤더 */}
      <div className="flex items-center gap-2 mb-3">
        <CheckCircle2 size={22} style={{ color: "#047857" }} />
        <div className="text-base font-bold" style={{ color: "#0D2B52" }}>
          예약번호 <span className="font-mono">{result.booking_no}</span>
        </div>
      </div>

      {/* 현장 도착 모델 안내 */}
      <div
        className="rounded-xl p-3 mb-3 flex items-start gap-2"
        style={{ backgroundColor: "#EFF6FF" }}
      >
        <Info size={16} style={{ color: "#1D4ED8" }} className="shrink-0 mt-0.5" />
        <div className="text-xs leading-relaxed" style={{ color: "#1D4ED8" }}>
          파일럿 배정은 손님이 현장 도착한 시점에 진행됩니다.
          <br />
          오늘 배정 보드에서 해당 예약의 <b>[현장 도착]</b> 버튼을 눌러주세요.
        </div>
      </div>

      {/* 알림 발송 라벨 */}
      <div className="flex flex-wrap gap-1.5">
        <StatusChip on label="✓ 결제 링크 SMS 발송 예정" />
        <StatusChip
          on={send_kakao}
          label={send_kakao ? "✓ 카톡 알림톡 발송 예정" : "카톡 알림 없음"}
        />
      </div>

      <div className="text-[11px] mt-2" style={{ color: "#9ea096" }}>
        {customer_name ? `고객 ${customer_name}님 ` : ""}예약이 접수되었습니다. 알림 발송 인프라 연동 후 실제 전송됩니다.
      </div>

      <div className="mt-5 flex gap-2">
        <Link
          href={`/admin/bookings`}
          className="px-4 h-12 rounded-xl flex items-center justify-center font-bold text-sm"
          style={{ backgroundColor: "white", color: "#0D2B52", border: "1px solid #E5E7EB" }}
        >
          예약대장
        </Link>
        <button
          type="button"
          onClick={onStartNew}
          className="flex-1 h-12 rounded-xl font-bold text-base text-white flex items-center justify-center gap-1.5"
          style={{ backgroundColor: "#0D2B52" }}
        >
          <RefreshCw size={16} />
          다음 예약 받기
        </button>
      </div>
    </div>
  );
}

function StatusChip({ on, label }: { on: boolean; label: string }) {
  return (
    <span
      className="px-2 py-1 rounded-full text-[11px] font-semibold"
      style={{
        backgroundColor: on ? "#ECFDF5" : "#F3F4F6",
        color: on ? "#047857" : "#65675e",
      }}
    >
      {label}
    </span>
  );
}

