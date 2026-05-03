"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Wind,
  ChevronLeft,
  ChevronRight,
  Check,
  Clock,
  Mountain,
  Camera,
  Video,
  AlertTriangle,
  CheckCircle2,
  Phone,
  User,
  Users,
  CreditCard,
  ArrowRight,
  X,
} from "lucide-react";

// ── 상수 ─────────────────────────────────────────────────────────
const PRODUCTS = [
  {
    id: "basic",
    name: "베이직",
    subtitle: "첫 패러글라이딩 입문",
    price: 75000,
    duration: "약 10분",
    altitude: "300m",
    color: "#2A7AE2",
    features: ["탠덤 비행", "안전 교육", "기념 스티커"],
  },
  {
    id: "extreme",
    name: "익스트림",
    subtitle: "스릴 넘치는 고고도 비행",
    price: 120000,
    duration: "약 20분",
    altitude: "500m",
    color: "#0D2B52",
    features: ["고고도 탠덤 비행", "스릴 기동", "안전 교육"],
    popular: true,
  },
  {
    id: "vip",
    name: "VIP",
    subtitle: "프리미엄 풀 패키지",
    price: 180000,
    duration: "약 30분",
    altitude: "800m",
    color: "#FF8A00",
    features: ["파노라마 코스", "VIP 라운지", "사진+영상 포함"],
  },
];

const OPTIONS = [
  { id: "photo", label: "사진 패키지", desc: "고프로 사진 30장", price: 30000, icon: Camera, forProducts: ["basic", "extreme"] },
  { id: "video", label: "영상 촬영", desc: "고프로 영상 편집본", price: 20000, icon: Video, forProducts: ["basic", "extreme"] },
];

// 날씨 등급 모의 데이터 (5월 2026)
const WEATHER: Record<string, "green" | "yellow" | "red" | null> = {
  "2026-05-03": "green", "2026-05-04": "green", "2026-05-05": "yellow",
  "2026-05-06": "green", "2026-05-07": "green", "2026-05-08": "yellow",
  "2026-05-09": "green", "2026-05-10": "green", "2026-05-11": "red",
  "2026-05-12": "green", "2026-05-13": "green", "2026-05-14": "green",
  "2026-05-15": "yellow", "2026-05-16": "green", "2026-05-17": "green",
  "2026-05-18": "green", "2026-05-19": "yellow", "2026-05-20": "green",
  "2026-05-21": "green", "2026-05-22": "green", "2026-05-23": "red",
  "2026-05-24": "green", "2026-05-25": "green", "2026-05-26": "yellow",
  "2026-05-27": "green", "2026-05-28": "green", "2026-05-29": "green",
  "2026-05-30": "yellow", "2026-05-31": "green",
};

const WEATHER_CFG = {
  green:  { label: "최적",   dot: "#22C55E", bg: "#F0FDF4", text: "#15803D" },
  yellow: { label: "보통",   dot: "#FBBF24", bg: "#FFFBEB", text: "#D97706" },
  red:    { label: "불가",   dot: "#EF4444", bg: "#FEF2F2", text: "#DC2626" },
};

const TIME_SLOTS = ["09:00", "10:30", "12:00", "13:30", "15:00", "16:30"];
const TODAY = "2026-05-02";

// 5월 달력
const MAY_START_DOW = 5; // 금
const DAYS_IN_MAY = 31;
const DAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];

function dateStr(day: number) {
  return `2026-05-${String(day).padStart(2, "0")}`;
}

// ── 유틸 ─────────────────────────────────────────────────────────
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
                  backgroundColor: done ? "#2A7AE2" : active ? "#0D2B52" : "#E5E7EB",
                  color: done || active ? "white" : "#9CA3AF",
                }}
              >
                {done ? <Check className="w-4 h-4" /> : idx}
              </div>
              <span
                className="text-xs mt-1 font-medium"
                style={{ color: active ? "#0D2B52" : "#9CA3AF" }}
              >
                {label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div
                className="h-0.5 w-12 md:w-16 mb-4 mx-1"
                style={{ backgroundColor: done ? "#2A7AE2" : "#E5E7EB" }}
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

  const [step, setStep] = useState(1);

  // Step 1
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");

  // Step 2
  const [selectedProduct, setSelectedProduct] = useState(initProduct);
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [headcount, setHeadcount] = useState(1);

  // Step 3
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [requests, setRequests] = useState("");
  const [agreed, setAgreed] = useState(false);

  // Step 4
  const [submitted, setSubmitted] = useState(false);
  const [bookingNo] = useState(`BK-${Date.now().toString().slice(-8)}`);

  // 상품 정보
  const product = PRODUCTS.find((p) => p.id === selectedProduct);
  const optionTotal = selectedOptions.reduce((s, oid) => {
    const opt = OPTIONS.find((o) => o.id === oid);
    return s + (opt?.price ?? 0);
  }, 0);
  const productTotal = (product?.price ?? 0) * headcount + optionTotal;
  const deposit = Math.round(productTotal * 0.3);
  const remaining = productTotal - deposit;

  const weather = WEATHER[selectedDate];
  const canNext1 = selectedDate && selectedTime && weather !== "red";
  const canNext2 = selectedProduct !== "";
  const canNext3 = name.trim() && phone.trim() && agreed;

  function toggleOption(oid: string) {
    setSelectedOptions((prev) =>
      prev.includes(oid) ? prev.filter((o) => o !== oid) : [...prev, oid]
    );
  }

  function handleSubmit() {
    setSubmitted(true);
  }

  // ── Step 1: 날짜·시간 ────────────────────────────────────────
  const step1 = (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold mb-1" style={{ color: "#0D2B52" }}>날짜를 선택해 주세요</h2>
        <p className="text-sm text-gray-400">🟢 최적 🟡 보통 🔴 비행 불가 (기상 예보 기준)</p>
      </div>

      {/* 달력 */}
      <div className="bg-white rounded-2xl p-4 border border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <p className="font-bold" style={{ color: "#0D2B52" }}>2026년 5월</p>
        </div>
        <div className="grid grid-cols-7 mb-2">
          {DAY_LABELS.map((d, i) => (
            <div key={d} className="text-center text-xs font-medium py-1"
              style={{ color: i === 0 ? "#EF4444" : i === 6 ? "#2A7AE2" : "#9CA3AF" }}>
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
            const w = WEATHER[date];
            const isPast = date <= TODAY;
            const isSelected = date === selectedDate;

            return (
              <button
                key={date}
                disabled={isPast || !w || w === "red"}
                onClick={() => { setSelectedDate(date); setSelectedTime(""); }}
                className="flex flex-col items-center rounded-xl py-1.5 transition-all"
                style={{
                  backgroundColor: isSelected ? "#0D2B52" : "transparent",
                  opacity: isPast || w === "red" ? 0.3 : 1,
                  cursor: isPast || !w || w === "red" ? "not-allowed" : "pointer",
                }}
              >
                <span className="text-xs mb-0.5" style={{
                  color: isSelected ? "white" : dow === 0 ? "#EF4444" : dow === 6 ? "#2A7AE2" : "#374151",
                  fontWeight: isSelected ? 700 : 400,
                  fontSize: 12,
                }}>
                  {day}
                </span>
                {w && (
                  <span
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ backgroundColor: isSelected ? "rgba(255,255,255,0.7)" : WEATHER_CFG[w].dot }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 날씨 상태 */}
      {selectedDate && weather && (
        <div
          className="flex items-center gap-3 rounded-xl px-4 py-3"
          style={{ backgroundColor: WEATHER_CFG[weather].bg }}
        >
          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: WEATHER_CFG[weather].dot }} />
          <div>
            <p className="text-sm font-bold" style={{ color: WEATHER_CFG[weather].text }}>
              {selectedDate.slice(5).replace("-", "월 ")}일 · 비행 {WEATHER_CFG[weather].label}
            </p>
            {weather === "yellow" && (
              <p className="text-xs" style={{ color: WEATHER_CFG.yellow.text }}>
                비행은 가능하나 기상 변화 시 조정될 수 있습니다
              </p>
            )}
          </div>
        </div>
      )}

      {/* 시간 선택 */}
      {selectedDate && weather !== "red" && (
        <div>
          <p className="text-sm font-semibold mb-3" style={{ color: "#0D2B52" }}>시간을 선택해 주세요</p>
          <div className="grid grid-cols-3 gap-2">
            {TIME_SLOTS.map((t) => (
              <button
                key={t}
                onClick={() => setSelectedTime(t)}
                className="py-3 rounded-xl text-sm font-medium border-2 transition-all"
                style={{
                  borderColor: selectedTime === t ? "#0D2B52" : "#E5E7EB",
                  backgroundColor: selectedTime === t ? "#0D2B52" : "white",
                  color: selectedTime === t ? "white" : "#374151",
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
      <h2 className="text-lg font-bold" style={{ color: "#0D2B52" }}>상품을 선택해 주세요</h2>

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
              borderColor: selectedProduct === p.id ? p.color : "#E5E7EB",
              backgroundColor: selectedProduct === p.id ? `${p.color}08` : "white",
            }}
          >
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-bold text-base" style={{ color: "#0D2B52" }}>{p.name}</span>
                  {"popular" in p && p.popular && (
                    <span className="text-xs px-2 py-0.5 rounded-full font-bold text-white" style={{ backgroundColor: "#FF8A00" }}>
                      인기
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-400 mb-2">{p.subtitle}</p>
                <div className="flex items-center gap-3 text-xs text-gray-500">
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{p.duration}</span>
                  <span className="flex items-center gap-1"><Mountain className="w-3 h-3" />{p.altitude}</span>
                </div>
              </div>
              <div className="text-right flex-shrink-0 ml-4">
                <p className="text-xl font-black" style={{ color: p.color }}>{formatPrice(p.price)}</p>
                <p className="text-xs text-gray-400">1인 기준</p>
                <div
                  className="w-5 h-5 rounded-full border-2 mt-2 ml-auto flex items-center justify-center"
                  style={{
                    borderColor: selectedProduct === p.id ? p.color : "#D1D5DB",
                    backgroundColor: selectedProduct === p.id ? p.color : "white",
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
      <div className="bg-white rounded-2xl p-5 border border-gray-100">
        <p className="text-sm font-semibold mb-3" style={{ color: "#0D2B52" }}>인원 선택</p>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setHeadcount(Math.max(1, headcount - 1))}
            className="w-10 h-10 rounded-xl border-2 border-gray-200 flex items-center justify-center text-gray-500 font-bold hover:border-gray-400"
          >
            −
          </button>
          <div className="text-center">
            <p className="text-2xl font-black" style={{ color: "#0D2B52" }}>{headcount}</p>
            <p className="text-xs text-gray-400">명</p>
          </div>
          <button
            onClick={() => setHeadcount(Math.min(4, headcount + 1))}
            className="w-10 h-10 rounded-xl border-2 border-gray-200 flex items-center justify-center text-gray-500 font-bold hover:border-gray-400"
          >
            +
          </button>
          <p className="text-xs text-gray-400 ml-2">최대 4인</p>
        </div>
      </div>

      {/* 옵션 */}
      {selectedProduct && (
        <div className="bg-white rounded-2xl p-5 border border-gray-100">
          <p className="text-sm font-semibold mb-3" style={{ color: "#0D2B52" }}>추가 옵션 (선택)</p>
          {selectedProduct === "vip" ? (
            <p className="text-sm text-gray-400">VIP 상품에는 사진+영상 풀 패키지가 포함되어 있습니다.</p>
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
                      borderColor: isSelected ? "#2A7AE2" : "#E5E7EB",
                      backgroundColor: isSelected ? "#EFF6FF" : "white",
                    }}
                  >
                    <Icon className="w-4 h-4 flex-shrink-0" style={{ color: isSelected ? "#2A7AE2" : "#9CA3AF" }} />
                    <div className="flex-1">
                      <p className="text-sm font-medium" style={{ color: isSelected ? "#2A7AE2" : "#374151" }}>
                        {opt.label}
                      </p>
                      <p className="text-xs text-gray-400">{opt.desc}</p>
                    </div>
                    <p className="text-sm font-bold" style={{ color: isSelected ? "#2A7AE2" : "#374151" }}>
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
        <div className="rounded-2xl p-4" style={{ backgroundColor: "#F5F7FA", border: "1px solid #E5E7EB" }}>
          <div className="flex justify-between text-sm text-gray-500 mb-1">
            <span>{product.name} × {headcount}인</span>
            <span>{formatPrice(product.price * headcount)}</span>
          </div>
          {selectedOptions.map((oid) => {
            const opt = OPTIONS.find((o) => o.id === oid);
            if (!opt) return null;
            return (
              <div key={oid} className="flex justify-between text-sm text-gray-500 mb-1">
                <span>{opt.label}</span>
                <span>+{formatPrice(opt.price)}</span>
              </div>
            );
          })}
          <div className="border-t border-gray-200 mt-2 pt-2 flex justify-between font-bold" style={{ color: "#0D2B52" }}>
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
      <h2 className="text-lg font-bold" style={{ color: "#0D2B52" }}>예약자 정보를 입력해 주세요</h2>

      <div className="bg-white rounded-2xl p-5 border border-gray-100 space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1.5" style={{ color: "#374151" }}>
            이름 <span className="text-red-500">*</span>
          </label>
          <div className="flex items-center gap-3 border border-gray-200 rounded-xl px-4 py-3 focus-within:border-blue-400">
            <User className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <input
              type="text"
              placeholder="홍길동"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="flex-1 text-sm outline-none"
              style={{ color: "#0D2B52" }}
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5" style={{ color: "#374151" }}>
            연락처 <span className="text-red-500">*</span>
          </label>
          <div className="flex items-center gap-3 border border-gray-200 rounded-xl px-4 py-3 focus-within:border-blue-400">
            <Phone className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <input
              type="tel"
              placeholder="010-0000-0000"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="flex-1 text-sm outline-none"
              style={{ color: "#0D2B52" }}
            />
          </div>
          <p className="text-xs text-gray-400 mt-1.5">비행 가능 여부 확인 문자를 발송합니다</p>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5" style={{ color: "#374151" }}>
            요청 사항 (선택)
          </label>
          <textarea
            placeholder="알레르기, 공포증, 체중 외 특이 사항 등"
            value={requests}
            onChange={(e) => setRequests(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none resize-none focus:border-blue-400"
            style={{ color: "#0D2B52", minHeight: 80 }}
          />
        </div>
      </div>

      {/* 안전 수칙 동의 */}
      <div className="bg-white rounded-2xl p-5 border border-gray-100">
        <p className="text-sm font-semibold mb-3" style={{ color: "#0D2B52" }}>안전 수칙 확인</p>
        <div className="space-y-2 mb-4">
          {[
            "체중 40kg~90kg 이내 탑승",
            "심장질환·고혈압·간질 병력 없음",
            "임신 중이 아님",
            "음주 상태가 아님",
          ].map((rule) => (
            <div key={rule} className="flex items-center gap-2 text-sm text-gray-600">
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
              borderColor: agreed ? "#2A7AE2" : "#D1D5DB",
              backgroundColor: agreed ? "#2A7AE2" : "white",
            }}
          >
            {agreed && <Check className="w-3 h-3 text-white" />}
          </div>
          <span className="text-sm text-gray-600 leading-relaxed">
            위 안전 수칙을 모두 확인하였으며, 예약 취소 및 환불 정책에 동의합니다.
            <span className="text-blue-500 ml-1 underline cursor-pointer">환불 정책 보기</span>
          </span>
        </label>
      </div>

      {/* 예약 요약 */}
      <div className="rounded-2xl p-4" style={{ backgroundColor: "#F5F7FA" }}>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">예약 요약</p>
        {[
          { label: "날짜·시간", value: `${selectedDate.slice(5).replace("-", "월 ")}일 ${selectedTime}` },
          { label: "상품", value: `${product?.name} × ${headcount}인` },
          { label: "예약금 (30%)", value: formatPrice(deposit) },
          { label: "현장 결제", value: formatPrice(remaining) },
        ].map((row) => (
          <div key={row.label} className="flex justify-between text-sm mb-1.5">
            <span className="text-gray-500">{row.label}</span>
            <span className="font-medium" style={{ color: "#0D2B52" }}>{row.value}</span>
          </div>
        ))}
        <div className="border-t border-gray-200 mt-2 pt-2 flex justify-between font-bold text-base" style={{ color: "#0D2B52" }}>
          <span>총 결제금액</span>
          <span style={{ color: "#2A7AE2" }}>{formatPrice(productTotal)}</span>
        </div>
      </div>
    </div>
  );

  // ── Step 4: 확인 / 완료 ──────────────────────────────────────
  const step4 = submitted ? (
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center mb-6"
            style={{ backgroundColor: "#EFF6FF" }}
          >
            <CheckCircle2 className="w-10 h-10" style={{ color: "#2A7AE2" }} />
          </div>
          <h2 className="text-2xl font-black mb-2" style={{ color: "#0D2B52" }}>예약 완료!</h2>
          <p className="text-gray-500 text-sm mb-6">
            예약번호 <span className="font-bold" style={{ color: "#2A7AE2" }}>{bookingNo}</span>
          </p>
          <div className="w-full bg-white rounded-2xl p-5 border border-gray-100 text-left space-y-3 mb-6">
            {[
              { label: "예약자", value: name },
              { label: "연락처", value: phone },
              { label: "날짜·시간", value: `${selectedDate.slice(5).replace("-", "월 ")}일 ${selectedTime}` },
              { label: "상품", value: `${product?.name} × ${headcount}인` },
              { label: "예약금", value: formatPrice(deposit) },
            ].map((row) => (
              <div key={row.label} className="flex justify-between text-sm">
                <span className="text-gray-400">{row.label}</span>
                <span className="font-medium" style={{ color: "#0D2B52" }}>{row.value}</span>
              </div>
            ))}
          </div>
          <div
            className="w-full rounded-2xl px-5 py-4 text-sm text-blue-700 text-left mb-6"
            style={{ backgroundColor: "#EFF6FF" }}
          >
            <p className="font-bold mb-1">다음 단계</p>
            <p className="text-blue-600">• 예약금 결제 링크가 {phone}으로 발송됩니다</p>
            <p className="text-blue-600">• 비행 당일 오전 7시에 날씨 확인 문자를 드립니다</p>
            <p className="text-blue-600">• 현장 도착 20분 전 체크인 부탁드립니다</p>
          </div>
          <button
            onClick={() => router.push("/")}
            className="w-full py-4 rounded-2xl font-bold text-white"
            style={{ backgroundColor: "#0D2B52" }}
          >
            홈으로 돌아가기
          </button>
        </div>
  ) : (
      <div className="space-y-5">
        <h2 className="text-lg font-bold" style={{ color: "#0D2B52" }}>예약 내용을 확인해 주세요</h2>
        <div className="bg-white rounded-2xl p-5 border border-gray-100 space-y-3">
          {[
            { label: "예약자", value: name },
            { label: "연락처", value: phone },
            { label: "날짜·시간", value: `${selectedDate.slice(5).replace("-", "월 ")}일 ${selectedTime}` },
            { label: "상품", value: `${product?.name} × ${headcount}인` },
            { label: "추가 옵션", value: selectedOptions.length > 0 ? selectedOptions.map((oid) => OPTIONS.find((o) => o.id === oid)?.label).join(", ") : "없음" },
          ].map((row) => (
            <div key={row.label} className="flex justify-between text-sm border-b border-gray-50 pb-2 last:border-0 last:pb-0">
              <span className="text-gray-400">{row.label}</span>
              <span className="font-medium" style={{ color: "#0D2B52" }}>{row.value}</span>
            </div>
          ))}
        </div>

        {/* 결제 요약 */}
        <div className="rounded-2xl p-5" style={{ backgroundColor: "#F5F7FA" }}>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">결제 정보</p>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">{product?.name} × {headcount}인</span>
              <span style={{ color: "#0D2B52" }}>{formatPrice((product?.price ?? 0) * headcount)}</span>
            </div>
            {selectedOptions.map((oid) => {
              const opt = OPTIONS.find((o) => o.id === oid);
              return opt ? (
                <div key={oid} className="flex justify-between">
                  <span className="text-gray-500">{opt.label}</span>
                  <span style={{ color: "#0D2B52" }}>+{formatPrice(opt.price)}</span>
                </div>
              ) : null;
            })}
            <div className="border-t border-gray-200 pt-2 mt-1 space-y-1">
              <div className="flex justify-between font-bold text-base">
                <span style={{ color: "#0D2B52" }}>총액</span>
                <span style={{ color: "#0D2B52" }}>{formatPrice(productTotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">지금 결제 (예약금 30%)</span>
                <span className="font-bold" style={{ color: "#2A7AE2" }}>{formatPrice(deposit)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">현장 결제</span>
                <span style={{ color: "#6B7280" }}>{formatPrice(remaining)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* 결제 수단 (Mock UI) */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100">
          <p className="text-sm font-semibold mb-3" style={{ color: "#0D2B52" }}>결제 수단</p>
          <div className="flex gap-2">
            {["카드 결제", "카카오페이", "네이버페이"].map((method, i) => (
              <button
                key={method}
                className="flex-1 py-3 rounded-xl text-xs font-medium border-2 transition-all"
                style={{
                  borderColor: i === 0 ? "#0D2B52" : "#E5E7EB",
                  backgroundColor: i === 0 ? "#0D2B52" : "white",
                  color: i === 0 ? "white" : "#6B7280",
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
    <div className="min-h-screen" style={{ backgroundColor: "#F5F7FA" }}>
      {/* 헤더 */}
      <div
        className="sticky top-0 z-30 px-4 h-14 flex items-center justify-between border-b"
        style={{ backgroundColor: "white", borderColor: "#F3F4F6" }}
      >
        <div className="flex items-center gap-3">
          {!submitted && (
            <button
              onClick={() => (step === 1 ? router.push("/") : setStep(step - 1))}
              className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-100"
            >
              <ChevronLeft className="w-4 h-4 text-gray-500" />
            </button>
          )}
          <div className="flex items-center gap-2">
            <Wind className="w-4 h-4" style={{ color: "#FF8A00" }} />
            <span className="font-bold text-sm" style={{ color: "#0D2B52" }}>구름상회 예약</span>
          </div>
        </div>
        <button onClick={() => router.push("/")} className="p-1.5 hover:bg-gray-100 rounded-lg">
          <X className="w-4 h-4 text-gray-400" />
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
                style={{ backgroundColor: "#0D2B52" }}
              >
                다음 단계
                <ChevronRight className="w-5 h-5" />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                className="w-full py-4 rounded-2xl font-bold text-white text-base transition-all flex items-center justify-center gap-2"
                style={{ backgroundColor: "#FF8A00" }}
              >
                <CreditCard className="w-5 h-5" />
                {formatPrice(deposit)} 예약금 결제하기
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Suspense 래퍼 ─────────────────────────────────────────────────
export default function BookingPage() {
  return (
    <Suspense>
      <BookingInner />
    </Suspense>
  );
}
