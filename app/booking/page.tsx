"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Wind,
  ChevronLeft,
  ChevronRight,
  Check,
  Clock,
  Camera,
  Video,
  CheckCircle2,
  Phone,
  User,
  CreditCard,
  X,
} from "lucide-react";

import { useSchedules } from "@/lib/scheduleStore";
import {
  useSlotConfig,
  generateSlotTimes,
  countAvailablePilots as _countPilots,
} from "@/lib/slotStore";
import { usePageContent } from "@/lib/pageContentStore";

// ── 상수 ─────────────────────────────────────────────────────────
// TODO: API — PRODUCTS 목업 → GET /api/products (active=true 필터)
// TODO: API — OPTIONS 목업 → GET /api/product-options (active=true 필터)
// TODO: API — handleSubmit → POST /api/bookings { productId, options, date, time, name, phone, headcount }
const PRODUCTS = [
  {
    id: "basic",
    name: "베이직",
    subtitle: "첫 패러글라이딩 입문",
    price: 75000,
    duration: "약 10분",
    color: "#4d4f46",
    features: ["탠덤 비행", "안전 교육", "기념 스티커"],
  },
  {
    id: "extreme",
    name: "익스트림",
    subtitle: "스릴 넘치는 고고도 비행",
    price: 120000,
    duration: "약 20분",
    color: "#23251d",
    features: ["고고도 탠덤 비행", "스릴 기동", "안전 교육"],
    popular: true,
  },
  {
    id: "vip",
    name: "VIP",
    subtitle: "프리미엄 풀 패키지",
    price: 180000,
    duration: "약 30분",
    color: "#F54E00",
    features: ["파노라마 코스", "VIP 라운지", "사진+영상 포함"],
  },
];

const OPTIONS = [
  { id: "photo", label: "사진 패키지", desc: "고프로 사진 30장", price: 30000, icon: Camera, forProducts: ["basic", "extreme"] },
  { id: "video", label: "영상 촬영", desc: "고프로 영상 편집본", price: 20000, icon: Video, forProducts: ["basic", "extreme"] },
];


const TODAY = "2026-05-02";
const MAY_START_DOW = 5;
const DAYS_IN_MAY = 31;
const DAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];

function dateStr(day: number) {
  return `2026-05-${String(day).padStart(2, "0")}`;
}
function formatPrice(n: number) {
  return n.toLocaleString("ko-KR") + "원";
}

// ── 스텝 인디케이터 ───────────────────────────────────────────────
function StepIndicator({ current }: { current: number }) {
  const steps = ["날짜·시간", "상품 선택", "정보 입력", "예약 확인"];
  return (
    <div className="flex items-center gap-0">
      {steps.map((label, i) => {
        const idx = i + 1;
        const done = idx < current;
        const active = idx === current;
        return (
          <div key={label} className="flex items-center">
            <div className="flex flex-col items-center">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all"
                style={{
                  backgroundColor: done ? "#4d4f46" : active ? "#23251d" : "#e5e7e0",
                  color: done || active ? "white" : "#9ea096",
                }}
              >
                {done ? <Check className="w-4 h-4" /> : idx}
              </div>
              <span
                className="text-xs mt-1 font-medium"
                style={{ color: active ? "#23251d" : "#9ea096" }}
              >
                {label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div
                className="h-0.5 w-12 md:w-16 mb-4 mx-1"
                style={{ backgroundColor: done ? "#4d4f46" : "#bfc1b7" }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── 메인 (inner) ──────────────────────────────────────────────────
function BookingInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initProduct = searchParams.get("product") ?? "";

  // ── 파일럿 스케줄 & 슬롯 설정 ──────────────────────────────────
  const schedules  = useSchedules();
  const slotCfg    = useSlotConfig();
  const timeSlots  = generateSlotTimes(slotCfg);
  const content    = usePageContent();

  const [step, setStep] = useState(1);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [selectedProduct, setSelectedProduct] = useState(initProduct);
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [headcount, setHeadcount] = useState(1);

  // 선택 날짜 기준 가용 파일럿 수 (= 최대 예약 인원)
  const availablePilots = selectedDate ? _countPilots(selectedDate, schedules) : 0;
  const maxHeadcount = Math.max(1, availablePilots);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [requests, setRequests] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [bookingNo, setBookingNo] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const product = PRODUCTS.find((p) => p.id === selectedProduct);
  const optionTotal = selectedOptions.reduce((s, oid) => {
    const opt = OPTIONS.find((o) => o.id === oid);
    return s + (opt?.price ?? 0);
  }, 0);
  const productTotal = (product?.price ?? 0) * headcount + optionTotal;
  const deposit = headcount * 10000;   // 1인당 10,000원
  const remaining = productTotal - deposit;

  // 날짜 바뀌면 headcount가 새 max를 초과하지 않도록 보정
  useEffect(() => {
    if (availablePilots > 0 && headcount > availablePilots) {
      setHeadcount(availablePilots);
    }
  }, [availablePilots]); // eslint-disable-line react-hooks/exhaustive-deps

  const canNext1 = selectedDate && selectedTime;
  const canNext2 = selectedProduct !== "";
  const canNext3 = name.trim() && phone.trim() && agreed;

  function toggleOption(oid: string) {
    setSelectedOptions((prev) =>
      prev.includes(oid) ? prev.filter((o) => o !== oid) : [...prev, oid]
    );
  }

  // ── Step 1: 날짜·시간 ────────────────────────────────────────
  const step1 = (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold mb-1" style={{ color: "#23251d" }}>날짜를 선택해 주세요</h2>
      </div>

      {/* 달력 */}
      <div className="rounded-2xl p-4 border" style={{ backgroundColor: "#fdfdf8", borderColor: "#bfc1b7" }}>
        <div className="flex items-center justify-between mb-4">
          <p className="font-bold" style={{ color: "#23251d" }}>2026년 5월</p>
        </div>
        <div className="grid grid-cols-7 mb-2">
          {DAY_LABELS.map((d, i) => (
            <div key={d} className="text-center text-xs font-medium py-1"
              style={{ color: i === 0 ? "#EF4444" : i === 6 ? "#4d4f46" : "#9ea096" }}>
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: MAY_START_DOW }).map((_, i) => <div key={`e${i}`} />)}
          {Array.from({ length: DAYS_IN_MAY }, (_, i) => {
            const date = dateStr(i + 1);
            const day = i + 1;
            const dow = (MAY_START_DOW + i) % 7;
            const isPast = date <= TODAY;
            const pilotCount = _countPilots(date, schedules);
            const noFlight = !isPast && pilotCount === 0;
            const isDisabled = isPast || noFlight;
            const isSelected = date === selectedDate;

            return (
              <button
                key={date}
                disabled={isDisabled}
                onClick={() => { setSelectedDate(date); setSelectedTime(""); }}
                className="flex flex-col items-center rounded-xl py-1.5 transition-all"
                style={{
                  backgroundColor: isSelected ? "#23251d" : "transparent",
                  opacity: isDisabled ? 0.3 : 1,
                  cursor: isDisabled ? "not-allowed" : "pointer",
                }}
              >
                <span className="text-xs" style={{
                  color: isSelected ? "white" : dow === 0 ? "#EF4444" : dow === 6 ? "#4d4f46" : "#374151",
                  fontWeight: isSelected ? 700 : 400,
                  fontSize: 12,
                }}>
                  {day}
                </span>
                {!isPast && pilotCount > 0 && (
                  <span style={{
                    fontSize: 8,
                    lineHeight: 1,
                    color: isSelected ? "rgba(255,255,255,0.7)" : "#9ea096",
                    marginTop: 1,
                  }}>
                    {pilotCount}팀
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 시간 선택 */}
      {selectedDate && availablePilots > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold" style={{ color: "#23251d" }}>시간을 선택해 주세요</p>
            <span className="text-xs px-2 py-1 rounded-full font-medium"
              style={{ background: "#F0FDF4", color: "#15803D" }}>
              최대 {availablePilots}팀 동시 비행 가능
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {timeSlots.map((t) => (
              <button
                key={t}
                onClick={() => setSelectedTime(t)}
                className="py-3 rounded-xl text-sm font-medium border-2 transition-all"
                style={{
                  borderColor: selectedTime === t ? "#23251d" : "#bfc1b7",
                  backgroundColor: selectedTime === t ? "#23251d" : "#fdfdf8",
                  color: selectedTime === t ? "white" : "#4d4f46",
                }}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  // ── Step 2: 상품 선택 ─────────────────────────────────────────
  const step2 = (
    <div className="space-y-5">
      <h2 className="text-lg font-bold" style={{ color: "#23251d" }}>상품을 선택해 주세요</h2>

      <div className="space-y-3">
        {PRODUCTS.map((p) => (
          <button
            key={p.id}
            onClick={() => {
              setSelectedProduct(p.id);
              setSelectedOptions([]);
            }}
            className="w-full text-left rounded-2xl p-5 border-2 transition-all"
            style={{
              borderColor: selectedProduct === p.id ? p.color : "#bfc1b7",
              backgroundColor: selectedProduct === p.id ? `${p.color}0d` : "#fdfdf8",
            }}
          >
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-bold text-base" style={{ color: "#23251d" }}>{p.name}</span>
                  {"popular" in p && p.popular && (
                    <span className="text-xs px-2 py-0.5 rounded-full font-bold text-white" style={{ backgroundColor: "#F54E00" }}>
                      인기
                    </span>
                  )}
                </div>
                <p className="text-xs mb-2" style={{ color: "#65675e" }}>{p.subtitle}</p>
                <div className="flex items-center gap-3 text-xs" style={{ color: "#9ea096" }}>
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{p.duration}</span>
                </div>
              </div>
              <div className="text-right flex-shrink-0 ml-4">
                <p className="text-xl font-black" style={{ color: p.color }}>{formatPrice(p.price)}</p>
                <p className="text-xs" style={{ color: "#9ea096" }}>1인 기준</p>
                <div
                  className="w-5 h-5 rounded-full border-2 mt-2 ml-auto flex items-center justify-center"
                  style={{
                    borderColor: selectedProduct === p.id ? p.color : "#bfc1b7",
                    backgroundColor: selectedProduct === p.id ? p.color : "#fdfdf8",
                  }}
                >
                  {selectedProduct === p.id && <Check className="w-3 h-3 text-white" />}
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* 인원 */}
      <div className="rounded-2xl p-5 border" style={{ backgroundColor: "#fdfdf8", borderColor: "#bfc1b7" }}>
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold" style={{ color: "#23251d" }}>인원 선택</p>
          {selectedDate && availablePilots > 0 && (
            <span className="text-xs" style={{ color: "#9ea096" }}>
              최대 {maxHeadcount}명
            </span>
          )}
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setHeadcount(Math.max(1, headcount - 1))}
            className="w-10 h-10 rounded-xl border-2 flex items-center justify-center font-bold transition-all"
            style={{ borderColor: "#bfc1b7", color: "#4d4f46" }}
          >
            −
          </button>
          <div className="text-center">
            <p className="text-2xl font-black" style={{ color: "#23251d" }}>{headcount}</p>
            <p className="text-xs" style={{ color: "#9ea096" }}>명</p>
          </div>
          <button
            onClick={() => setHeadcount(Math.min(maxHeadcount, headcount + 1))}
            disabled={headcount >= maxHeadcount}
            className="w-10 h-10 rounded-xl border-2 flex items-center justify-center font-bold transition-all"
            style={{
              borderColor: headcount >= maxHeadcount ? "#e5e7eb" : "#bfc1b7",
              color: headcount >= maxHeadcount ? "#d1d5db" : "#4d4f46",
              cursor: headcount >= maxHeadcount ? "not-allowed" : "pointer",
            }}
          >
            +
          </button>
        </div>
        {selectedDate && availablePilots > 0 && headcount === maxHeadcount && (
          <p className="text-xs mt-2" style={{ color: "#9ea096" }}>
            선택 날짜 기준 최대 인원입니다
          </p>
        )}
      </div>

      {/* 옵션 */}
      {selectedProduct && (
        <div className="rounded-2xl p-5 border" style={{ backgroundColor: "#fdfdf8", borderColor: "#bfc1b7" }}>
          <p className="text-sm font-semibold mb-3" style={{ color: "#23251d" }}>추가 옵션 (선택)</p>
          {selectedProduct === "vip" ? (
            <p className="text-sm" style={{ color: "#65675e" }}>VIP 상품에는 사진+영상 풀 패키지가 포함되어 있습니다.</p>
          ) : (
            <div className="space-y-2">
              {OPTIONS.filter((o) => o.forProducts.includes(selectedProduct)).map((opt) => {
                const Icon = opt.icon;
                const isSelected = selectedOptions.includes(opt.id);
                return (
                  <button
                    key={opt.id}
                    onClick={() => toggleOption(opt.id)}
                    className="w-full flex items-center gap-3 p-3.5 rounded-xl border-2 transition-all text-left"
                    style={{
                      borderColor: isSelected ? "#23251d" : "#bfc1b7",
                      backgroundColor: isSelected ? "#eeefe9" : "#fdfdf8",
                    }}
                  >
                    <Icon className="w-4 h-4 flex-shrink-0" style={{ color: isSelected ? "#23251d" : "#9ea096" }} />
                    <div className="flex-1">
                      <p className="text-sm font-medium" style={{ color: isSelected ? "#23251d" : "#4d4f46" }}>
                        {opt.label}
                      </p>
                      <p className="text-xs" style={{ color: "#9ea096" }}>{opt.desc}</p>
                    </div>
                    <p className="text-sm font-bold" style={{ color: isSelected ? "#23251d" : "#4d4f46" }}>
                      +{formatPrice(opt.price)}
                    </p>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 소계 */}
      {product && (
        <div className="rounded-2xl p-4 border" style={{ backgroundColor: "#eeefe9", borderColor: "#bfc1b7" }}>
          <div className="flex justify-between text-sm mb-1" style={{ color: "#65675e" }}>
            <span>{product.name} × {headcount}인</span>
            <span>{formatPrice(product.price * headcount)}</span>
          </div>
          {selectedOptions.map((oid) => {
            const opt = OPTIONS.find((o) => o.id === oid);
            if (!opt) return null;
            return (
              <div key={oid} className="flex justify-between text-sm mb-1" style={{ color: "#65675e" }}>
                <span>{opt.label}</span>
                <span>+{formatPrice(opt.price)}</span>
              </div>
            );
          })}
          <div className="border-t mt-2 pt-2 flex justify-between font-bold" style={{ borderColor: "#bfc1b7", color: "#23251d" }}>
            <span>합계</span>
            <span>{formatPrice(productTotal)}</span>
          </div>
        </div>
      )}
    </div>
  );

  // ── Step 3: 정보 입력 ─────────────────────────────────────────
  const step3 = (
    <div className="space-y-5">
      <h2 className="text-lg font-bold" style={{ color: "#23251d" }}>예약자 정보를 입력해 주세요</h2>

      <div className="rounded-2xl p-5 border space-y-4" style={{ backgroundColor: "#fdfdf8", borderColor: "#bfc1b7" }}>
        <div>
          <label className="block text-sm font-medium mb-1.5" style={{ color: "#4d4f46" }}>
            이름 <span className="text-red-500">*</span>
          </label>
          <div className="flex items-center gap-3 border rounded-xl px-4 py-3 focus-within:border-[#23251d] transition-colors" style={{ borderColor: "#bfc1b7" }}>
            <User className="w-4 h-4 flex-shrink-0" style={{ color: "#9ea096" }} />
            <input
              type="text"
              placeholder="홍길동"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="flex-1 text-sm outline-none bg-transparent"
              style={{ color: "#23251d" }}
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5" style={{ color: "#4d4f46" }}>
            연락처 <span className="text-red-500">*</span>
          </label>
          <div className="flex items-center gap-3 border rounded-xl px-4 py-3 focus-within:border-[#23251d] transition-colors" style={{ borderColor: "#bfc1b7" }}>
            <Phone className="w-4 h-4 flex-shrink-0" style={{ color: "#9ea096" }} />
            <input
              type="tel"
              placeholder="010-0000-0000"
              value={phone}
              onChange={(e) => {
                const digits = e.target.value.replace(/\D/g, "").slice(0, 11);
                let formatted = digits;
                if (digits.length > 3 && digits.length <= 7) {
                  formatted = `${digits.slice(0, 3)}-${digits.slice(3)}`;
                } else if (digits.length > 7) {
                  formatted = `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
                }
                setPhone(formatted);
              }}
              className="flex-1 text-sm outline-none bg-transparent"
              style={{ color: "#23251d" }}
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5" style={{ color: "#4d4f46" }}>
            요청 사항 (선택)
          </label>
          <textarea
            placeholder="알레르기, 공포증, 체중 외 특이 사항 등"
            value={requests}
            onChange={(e) => setRequests(e.target.value)}
            className="w-full border rounded-xl px-4 py-3 text-sm outline-none resize-none focus:border-[#bfc1b7] bg-transparent"
            style={{ color: "#23251d", minHeight: 80, borderColor: "#bfc1b7" }}
          />
        </div>
      </div>

      {/* 안전 수칙 동의 */}
      <div className="rounded-2xl p-5 border" style={{ backgroundColor: "#fdfdf8", borderColor: "#bfc1b7" }}>
        <p className="text-sm font-semibold mb-3" style={{ color: "#23251d" }}>안전 수칙 확인</p>
        <div className="space-y-2 mb-4">
          {[
            "체중 40kg~90kg 이내 탑승",
            "심장질환·고혈압·간질 병력 없음",
            "임신 중이 아님",
            "음주 상태가 아님",
          ].map((rule) => (
            <div key={rule} className="flex items-center gap-2 text-sm" style={{ color: "#4d4f46" }}>
              <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-green-500" />
              {rule}
            </div>
          ))}
        </div>
        <label className="flex items-start gap-3 cursor-pointer">
          <div
            onClick={() => setAgreed(!agreed)}
            className="w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-all"
            style={{
              borderColor: agreed ? "#23251d" : "#bfc1b7",
              backgroundColor: agreed ? "#23251d" : "#fdfdf8",
            }}
          >
            {agreed && <Check className="w-3 h-3 text-white" />}
          </div>
          <span className="text-sm leading-relaxed" style={{ color: "#4d4f46" }}>
            위 안전 수칙을 모두 확인하였으며, 예약 취소 및 환불 정책에 동의합니다.
            <span className="ml-1 underline cursor-pointer" style={{ color: "#4d4f46" }}>환불 정책 보기</span>
          </span>
        </label>
      </div>

      {/* 예약 요약 */}
      <div className="rounded-2xl p-4 border" style={{ backgroundColor: "#eeefe9", borderColor: "#bfc1b7" }}>
        <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: "#9ea096" }}>예약 요약</p>
        {[
          { label: "날짜·시간", value: `${selectedDate.slice(5).replace("-", "월 ")}일 ${selectedTime}` },
          { label: "상품", value: `${product?.name} × ${headcount}인` },
          { label: `예약금 (${headcount}인 × 10,000원)`, value: formatPrice(deposit) },
          { label: "현장 결제", value: formatPrice(remaining) },
        ].map((row) => (
          <div key={row.label} className="flex justify-between text-sm mb-1.5">
            <span style={{ color: "#65675e" }}>{row.label}</span>
            <span className="font-medium" style={{ color: "#23251d" }}>{row.value}</span>
          </div>
        ))}
        <div className="border-t mt-2 pt-2 flex justify-between font-bold text-base" style={{ borderColor: "#bfc1b7", color: "#23251d" }}>
          <span>총 결제금액</span>
          <span>{formatPrice(productTotal)}</span>
        </div>
      </div>
    </div>
  );

  // ── Step 4: 확인 / 완료 ──────────────────────────────────────
  const step4 = submitted ? (
    <div className="flex flex-col items-center justify-center py-10 text-center">
      <div
        className="w-20 h-20 rounded-full flex items-center justify-center mb-6"
        style={{ backgroundColor: "#eeefe9" }}
      >
        <CheckCircle2 className="w-10 h-10" style={{ color: "#23251d" }} />
      </div>
      <h2 className="text-2xl font-black mb-2" style={{ color: "#23251d" }}>예약 완료!</h2>
      <p className="text-sm mb-6" style={{ color: "#65675e" }}>
        예약번호 <span className="font-bold" style={{ color: "#23251d" }}>{bookingNo}</span>
      </p>
      <div className="w-full rounded-2xl p-5 border text-left mb-6" style={{ backgroundColor: "#fdfdf8", borderColor: "#bfc1b7" }}>
        {[
          { label: "예약자",   value: name },
          { label: "연락처",   value: phone },
          { label: "날짜·시간", value: `${selectedDate.slice(5).replace("-", "월 ")}일 ${selectedTime}` },
          { label: "상품",     value: `${product?.name} × ${headcount}인` },
        ].map((row) => (
          <div key={row.label} className="flex justify-between text-sm py-2 border-b" style={{ borderColor: "#e5e7e0" }}>
            <span style={{ color: "#9ea096" }}>{row.label}</span>
            <span className="font-medium" style={{ color: "#23251d" }}>{row.value}</span>
          </div>
        ))}
        {/* 결제 요약 */}
        <div className="pt-3 space-y-1.5">
          <div className="flex justify-between text-sm">
            <span style={{ color: "#9ea096" }}>예약금 (지금 결제)</span>
            <span className="font-bold" style={{ color: "#23251d" }}>{formatPrice(deposit)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span style={{ color: "#9ea096" }}>현장 결제 금액</span>
            <span className="font-medium" style={{ color: "#65675e" }}>{formatPrice(remaining)}</span>
          </div>
          <div className="flex justify-between text-sm border-t pt-2 mt-1" style={{ borderColor: "#e5e7e0" }}>
            <span className="font-semibold" style={{ color: "#23251d" }}>총액</span>
            <span className="font-bold" style={{ color: "#23251d" }}>{formatPrice(productTotal)}</span>
          </div>
        </div>
      </div>
      <div
        className="w-full rounded-2xl px-5 py-4 text-sm text-left mb-6"
        style={{ backgroundColor: "#eeefe9", borderColor: "#bfc1b7" }}
      >
        <p className="font-bold mb-2" style={{ color: "#23251d" }}>{content.bookingCompleteTitle}</p>
        {content.bookingCompleteSteps.split("\n").filter(Boolean).map((line, i) => (
          <p key={i} style={{ color: "#4d4f46" }}>
            {"• "}{line.replace("{phone}", phone)}
          </p>
        ))}
      </div>
      <button
        onClick={() => router.push(`/review?name=${encodeURIComponent(name)}&product=${encodeURIComponent(product?.name ?? "")}`)}
        className="w-full py-3.5 rounded-2xl font-bold border-2 mb-3 transition-colors hover:bg-gray-50"
        style={{ borderColor: "#bfc1b7", color: "#23251d" }}
      >
        ✍️ 후기 작성하기
      </button>
      <button
        onClick={() => router.push("/")}
        className="w-full py-4 rounded-2xl font-bold text-white"
        style={{ backgroundColor: "#1e1f23" }}
      >
        홈으로 돌아가기
      </button>
    </div>
  ) : (
    <div className="space-y-5">
      <h2 className="text-lg font-bold" style={{ color: "#23251d" }}>예약 내용을 확인해 주세요</h2>
      <div className="rounded-2xl p-5 border space-y-3" style={{ backgroundColor: "#fdfdf8", borderColor: "#bfc1b7" }}>
        {[
          { label: "예약자", value: name },
          { label: "연락처", value: phone },
          { label: "날짜·시간", value: `${selectedDate.slice(5).replace("-", "월 ")}일 ${selectedTime}` },
          { label: "상품", value: `${product?.name} × ${headcount}인` },
          { label: "추가 옵션", value: selectedOptions.length > 0 ? selectedOptions.map((oid) => OPTIONS.find((o) => o.id === oid)?.label).join(", ") : "없음" },
        ].map((row) => (
          <div key={row.label} className="flex justify-between text-sm border-b pb-2 last:border-0 last:pb-0" style={{ borderColor: "#e5e7e0" }}>
            <span style={{ color: "#9ea096" }}>{row.label}</span>
            <span className="font-medium" style={{ color: "#23251d" }}>{row.value}</span>
          </div>
        ))}
      </div>

      {/* 결제 요약 */}
      <div className="rounded-2xl p-5 border" style={{ backgroundColor: "#eeefe9", borderColor: "#bfc1b7" }}>
        <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: "#9ea096" }}>결제 정보</p>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span style={{ color: "#65675e" }}>{product?.name} × {headcount}인</span>
            <span style={{ color: "#23251d" }}>{formatPrice((product?.price ?? 0) * headcount)}</span>
          </div>
          {selectedOptions.map((oid) => {
            const opt = OPTIONS.find((o) => o.id === oid);
            return opt ? (
              <div key={oid} className="flex justify-between">
                <span style={{ color: "#65675e" }}>{opt.label}</span>
                <span style={{ color: "#23251d" }}>+{formatPrice(opt.price)}</span>
              </div>
            ) : null;
          })}
          <div className="border-t pt-2 mt-1 space-y-1" style={{ borderColor: "#bfc1b7" }}>
            <div className="flex justify-between font-bold text-base">
              <span style={{ color: "#23251d" }}>총액</span>
              <span style={{ color: "#23251d" }}>{formatPrice(productTotal)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span style={{ color: "#9ea096" }}>지금 결제 (예약금 30%)</span>
              <span className="font-bold" style={{ color: "#23251d" }}>{formatPrice(deposit)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span style={{ color: "#9ea096" }}>현장 결제</span>
              <span style={{ color: "#65675e" }}>{formatPrice(remaining)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 결제 수단 */}
      <div className="rounded-2xl p-5 border" style={{ backgroundColor: "#fdfdf8", borderColor: "#bfc1b7" }}>
        <p className="text-sm font-semibold mb-3" style={{ color: "#23251d" }}>결제 수단</p>
        <div className="flex gap-2">
          {["카드 결제", "카카오페이", "네이버페이"].map((method, i) => (
            <button
              key={method}
              className="flex-1 py-3 rounded-xl text-xs font-medium border-2 transition-all"
              style={{
                borderColor: i === 0 ? "#23251d" : "#bfc1b7",
                backgroundColor: i === 0 ? "#1e1f23" : "#fdfdf8",
                color: i === 0 ? "white" : "#65675e",
              }}
            >
              {method}
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  // ── Render ──────────────────────────────────────────────────────
  return (
    <div className="min-h-screen" style={{ backgroundColor: "#eeefe9" }}>
      {/* 헤더 */}
      <div
        className="sticky top-0 z-30 px-4 h-14 flex items-center justify-between border-b"
        style={{ backgroundColor: "#fdfdf8", borderColor: "#bfc1b7" }}
      >
        <div className="flex items-center gap-3">
          {!submitted && (
            <button
              onClick={() => (step === 1 ? router.push("/") : setStep(step - 1))}
              className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
              style={{ backgroundColor: "#e5e7e0" }}
            >
              <ChevronLeft className="w-4 h-4" style={{ color: "#4d4f46" }} />
            </button>
          )}
          <div className="flex items-center gap-2">
            <Wind className="w-4 h-4" style={{ color: "#F54E00" }} />
            <span className="font-bold text-sm" style={{ color: "#23251d" }}>구름상회 예약</span>
          </div>
        </div>
        <button
          onClick={() => router.push("/")}
          className="p-1.5 rounded-lg transition-colors"
          style={{ backgroundColor: "transparent" }}
        >
          <X className="w-4 h-4" style={{ color: "#9ea096" }} />
        </button>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6">
        {/* 스텝 인디케이터 */}
        {!submitted && (
          <div className="flex justify-center mb-8">
            <StepIndicator current={step} />
          </div>
        )}

        {/* 스텝 컨텐츠 */}
        {step === 1 && step1}
        {step === 2 && step2}
        {step === 3 && step3}
        {step === 4 && step4}

        {/* 하단 버튼 */}
        {!submitted && (
          <div className="mt-8">
            {step < 4 ? (
              <button
                onClick={() => setStep(step + 1)}
                disabled={
                  (step === 1 && !canNext1) ||
                  (step === 2 && !canNext2) ||
                  (step === 3 && !canNext3)
                }
                className="w-full py-4 rounded-2xl font-bold text-white text-base transition-all flex items-center justify-center gap-2 disabled:opacity-40"
                style={{ backgroundColor: "#1e1f23" }}
              >
                다음 단계
                <ChevronRight className="w-5 h-5" />
              </button>
            ) : (
              <>
              {submitError && (
                <p className="text-sm text-red-500 text-center mb-2">{submitError}</p>
              )}
              <button
                disabled={submitting}
                onClick={async () => {
                  if (!product) return;
                  setSubmitting(true);
                  setSubmitError("");
                  try {
                    const opts = selectedOptions.map((oid) => {
                      const o = OPTIONS.find((x) => x.id === oid);
                      return o ? { name: o.label, price: o.price } : null;
                    }).filter(Boolean);

                    const res = await fetch("/api/bookings", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        customer_name:   name,
                        customer_phone:  phone,
                        product_name:    product.name,
                        product_price:   product.price,
                        headcount,
                        flight_date:     selectedDate,
                        flight_time:     selectedTime,
                        options:         opts,
                        total_price:     productTotal,
                        deposit_amount:  deposit,
                        balance_amount:  remaining,
                        channel:         "online",
                        memo:            requests || null,
                      }),
                    });
                    if (!res.ok) {
                      const err = await res.json();
                      throw new Error(err.error ?? "예약 저장 실패");
                    }
                    const data = await res.json();
                    setBookingNo(data.booking_no);
                    setSubmitted(true);
                  } catch (e: unknown) {
                    setSubmitError(e instanceof Error ? e.message : "오류가 발생했습니다. 다시 시도해 주세요.");
                  } finally {
                    setSubmitting(false);
                  }
                }}
                className="w-full py-4 rounded-2xl font-bold text-white text-base transition-all flex items-center justify-center gap-2 disabled:opacity-60"
                style={{ backgroundColor: "#F54E00" }}
              >
                <CreditCard className="w-5 h-5" />
                {submitting ? "처리 중..." : `${formatPrice(deposit)} 예약금 결제하기`}
              </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function BookingPage() {
  return (
    <Suspense>
      <BookingInner />
    </Suspense>
  );
}
