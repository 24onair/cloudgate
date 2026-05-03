"use client";

import { useState } from "react";
import {
  Wind,
  Eye,
  Thermometer,
  Droplets,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Clock,
  ChevronUp,
  ChevronDown,
  Minus,
  Navigation,
} from "lucide-react";

// ── 타입 ────────────────────────────────────────────────────────
type Grade = "GREEN" | "YELLOW" | "RED";

interface HourlyForecast {
  hour: string;
  wind: number;
  windDir: string;
  temp: number;
  humidity: number;
  visibility: string;
  grade: Grade;
}

interface DailyForecast {
  date: string;
  label: string;
  windMin: number;
  windMax: number;
  tempMin: number;
  tempMax: number;
  grade: Grade;
  summary: string;
}

// ── 목업 데이터 ─────────────────────────────────────────────────
const CURRENT = {
  wind: 2.8,
  windDir: "북서",
  windDeg: 315,   // 나침반 각도 (0=북, 90=동, 180=남, 270=서)
  windGust: 4.1,
  temp: 18,
  humidity: 52,
  visibility: "최상",
  visibilityKm: 15,
  pressure: 1013,
  grade: "GREEN" as Grade,
  updatedAt: "13:00",
  nextUpdate: "13:30",
};

const HOURLY: HourlyForecast[] = [
  { hour: "10:00", wind: 1.8, windDir: "북",  temp: 14, humidity: 60, visibility: "양호", grade: "GREEN"  },
  { hour: "11:00", wind: 2.2, windDir: "북서", temp: 16, humidity: 57, visibility: "양호", grade: "GREEN"  },
  { hour: "12:00", wind: 2.5, windDir: "북서", temp: 17, humidity: 54, visibility: "최상", grade: "GREEN"  },
  { hour: "13:00", wind: 2.8, windDir: "북서", temp: 18, humidity: 52, visibility: "최상", grade: "GREEN"  },
  { hour: "14:00", wind: 3.2, windDir: "서북서",temp:19, humidity: 50, visibility: "최상", grade: "GREEN"  },
  { hour: "15:00", wind: 4.5, windDir: "서",   temp: 19, humidity: 51, visibility: "양호", grade: "YELLOW" },
  { hour: "16:00", wind: 5.8, windDir: "서",   temp: 18, humidity: 55, visibility: "보통", grade: "YELLOW" },
  { hour: "17:00", wind: 7.2, windDir: "서남서",temp:17, humidity: 60, visibility: "보통", grade: "RED"    },
  { hour: "18:00", wind: 6.9, windDir: "남서",  temp: 16, humidity: 63, visibility: "보통", grade: "RED"    },
];

const DAILY: DailyForecast[] = [
  { date: "2026-05-01", label: "오늘(목)", windMin: 1.8, windMax: 7.2, tempMin: 14, tempMax: 19, grade: "YELLOW", summary: "오후 강풍 주의" },
  { date: "2026-05-02", label: "내일(금)", windMin: 1.2, windMax: 3.8, tempMin: 13, tempMax: 20, grade: "GREEN",  summary: "전일 비행 가능" },
  { date: "2026-05-03", label: "모레(토)", windMin: 0.8, windMax: 2.9, tempMin: 15, tempMax: 22, grade: "GREEN",  summary: "최적 비행 조건" },
  { date: "2026-05-04", label: "일요일",   windMin: 2.1, windMax: 5.2, tempMin: 14, tempMax: 21, grade: "GREEN",  summary: "오후 약풍 증가" },
  { date: "2026-05-05", label: "월요일",   windMin: 3.5, windMax: 8.1, tempMin: 13, tempMax: 18, grade: "YELLOW", summary: "오전 강풍 주의" },
  { date: "2026-05-06", label: "화요일",   windMin: 5.2, windMax: 11.3,tempMin: 12, tempMax: 16, grade: "RED",    summary: "비행 불가 예상" },
  { date: "2026-05-07", label: "수요일",   windMin: 2.0, windMax: 4.1, tempMin: 14, tempMax: 19, grade: "GREEN",  summary: "비행 가능 회복" },
];

const GRADE_CFG: Record<Grade, {
  label: string; sub: string; color: string; bg: string; border: string;
  windLimit: string; icon: typeof CheckCircle2;
}> = {
  GREEN:  { label: "비행 가능",   sub: "현재 조건 양호",     color: "#10B981", bg: "#ECFDF5", border: "#A7F3D0", windLimit: "5m/s 이하", icon: CheckCircle2 },
  YELLOW: { label: "주의 필요",   sub: "기상 변화 모니터링", color: "#F59E0B", bg: "#FFFBEB", border: "#FDE68A", windLimit: "5~8m/s",   icon: AlertTriangle },
  RED:    { label: "비행 불가",   sub: "비행 중단 권고",     color: "#EF4444", bg: "#FEF2F2", border: "#FECACA", windLimit: "8m/s 초과", icon: XCircle },
};

// 나침반 방향 화살표 컴포넌트
function WindCompass({ deg, speed }: { deg: number; speed: number }) {
  return (
    <div className="relative w-28 h-28 mx-auto">
      {/* 외부 링 */}
      <div
        className="absolute inset-0 rounded-full border-2"
        style={{ borderColor: "#E5E7EB" }}
      />
      {/* 눈금 */}
      {["N", "E", "S", "W"].map((dir, i) => {
        const angle = i * 90;
        const rad = (angle - 90) * (Math.PI / 180);
        const r = 48;
        const x = 56 + r * Math.cos(rad);
        const y = 56 + r * Math.sin(rad);
        return (
          <span
            key={dir}
            className="absolute text-xs font-bold"
            style={{
              left: x - 5,
              top: y - 7,
              color: dir === "N" ? "#EF4444" : "#9CA3AF",
              fontSize: 10,
            }}
          >
            {dir}
          </span>
        );
      })}
      {/* 중심 */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center"
          style={{ background: "#F5F7FA" }}
        >
          {/* 방향 화살표 */}
          <Navigation
            size={22}
            style={{
              color: "#2A7AE2",
              transform: `rotate(${deg}deg)`,
              transition: "transform 0.5s",
            }}
          />
        </div>
      </div>
      {/* 풍속 표시 */}
      <div
        className="absolute -bottom-1 left-1/2 -translate-x-1/2 text-xs font-bold px-2 py-0.5 rounded-full text-white"
        style={{ background: "#2A7AE2", whiteSpace: "nowrap" }}
      >
        {speed}m/s
      </div>
    </div>
  );
}

// 시간별 바 차트
function HourlyChart({ data }: { data: HourlyForecast[] }) {
  const maxWind = Math.max(...data.map((d) => d.wind));
  const BAR_H = 80;

  return (
    <div className="flex items-end gap-1">
      {data.map((d, i) => {
        const h = Math.round((d.wind / Math.max(maxWind, 8)) * BAR_H);
        const gcfg = GRADE_CFG[d.grade];
        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-1">
            <span className="text-xs font-medium" style={{ color: gcfg.color }}>
              {d.wind}
            </span>
            <div
              className="w-full rounded-t-md transition-all"
              style={{
                height: h,
                background: gcfg.color,
                opacity: 0.85,
                minHeight: 4,
              }}
              title={`${d.hour} ${d.wind}m/s (${d.windDir})`}
            />
            <span className="text-xs text-gray-400" style={{ fontSize: 10 }}>
              {d.hour.slice(0, 2)}시
            </span>
          </div>
        );
      })}
    </div>
  );
}

// 풍향 트렌드 아이콘
function TrendIcon({ prev, curr }: { prev: number; curr: number }) {
  const diff = curr - prev;
  if (diff > 0.5) return <ChevronUp size={14} style={{ color: "#EF4444" }} />;
  if (diff < -0.5) return <ChevronDown size={14} style={{ color: "#10B981" }} />;
  return <Minus size={14} className="text-gray-400" />;
}

// ── 메인 ────────────────────────────────────────────────────────
export default function WeatherPage() {
  const [refreshing, setRefreshing] = useState(false);

  function handleRefresh() {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1200);
  }

  const gcfg = GRADE_CFG[CURRENT.grade];
  const GradeIcon = gcfg.icon;

  // 오늘 비행 가능 시간대 (GREEN 시간)
  const flyableHours = HOURLY.filter((h) => h.grade === "GREEN");
  const firstYellow = HOURLY.find((h) => h.grade !== "GREEN");

  return (
    <div className="p-6 space-y-5" style={{ background: "#F5F7FA", minHeight: "100vh" }}>
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "#0D2B52" }}>바람판</h1>
          <p className="text-sm text-gray-500 mt-0.5">기상 현황 · 비행 등급 · 시간별 예보</p>
        </div>
        <button
          onClick={handleRefresh}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 text-sm text-gray-500 hover:bg-gray-50"
        >
          <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
          {refreshing ? "갱신 중…" : `${CURRENT.updatedAt} 기준`}
        </button>
      </div>

      {/* 현재 기상 + 비행 등급 */}
      <div className="grid grid-cols-3 gap-4">
        {/* 비행 등급 카드 (강조) */}
        <div
          className="col-span-1 rounded-2xl p-5 shadow-sm border flex flex-col justify-between"
          style={{ background: gcfg.bg, borderColor: gcfg.border }}
        >
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">비행 등급</span>
              <GradeIcon size={20} style={{ color: gcfg.color }} />
            </div>
            <div className="text-4xl font-black mb-1" style={{ color: gcfg.color }}>
              {CURRENT.grade}
            </div>
            <div className="text-lg font-bold mb-0.5" style={{ color: gcfg.color }}>
              {gcfg.label}
            </div>
            <div className="text-sm text-gray-500">{gcfg.sub}</div>
          </div>
          <div className="mt-4 pt-4 border-t" style={{ borderColor: gcfg.border }}>
            <div className="text-xs text-gray-400 space-y-1">
              <div className="flex items-center justify-between">
                <span>풍속 기준</span>
                <span className="font-medium" style={{ color: gcfg.color }}>{gcfg.windLimit}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>다음 갱신</span>
                <span className="font-medium text-gray-600">{CURRENT.nextUpdate}</span>
              </div>
            </div>
          </div>
        </div>

        {/* 현재 기상 상세 */}
        <div className="col-span-1 bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <h2 className="text-sm font-semibold text-gray-400 mb-4">현재 기상</h2>

          {/* 나침반 */}
          <WindCompass deg={CURRENT.windDeg} speed={CURRENT.wind} />

          <div className="mt-5 space-y-2.5">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 text-gray-500">
                <Wind size={14} style={{ color: "#2A7AE2" }} />
                풍향
              </span>
              <span className="font-semibold" style={{ color: "#0D2B52" }}>
                {CURRENT.windDir} {CURRENT.wind}m/s
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 text-gray-500">
                <Wind size={14} className="text-gray-300" />
                순간최대풍속
              </span>
              <span className="font-medium text-gray-600">{CURRENT.windGust}m/s</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 text-gray-500">
                <Thermometer size={14} style={{ color: "#FF8A00" }} />
                기온
              </span>
              <span className="font-semibold" style={{ color: "#0D2B52" }}>{CURRENT.temp}°C</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 text-gray-500">
                <Droplets size={14} style={{ color: "#60A5FA" }} />
                습도
              </span>
              <span className="font-medium text-gray-600">{CURRENT.humidity}%</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 text-gray-500">
                <Eye size={14} style={{ color: "#8B5CF6" }} />
                가시거리
              </span>
              <span className="font-semibold" style={{ color: "#0D2B52" }}>
                {CURRENT.visibility} ({CURRENT.visibilityKm}km)
              </span>
            </div>
          </div>
        </div>

        {/* 오늘 비행 창 요약 */}
        <div className="col-span-1 bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <h2 className="text-sm font-semibold text-gray-400 mb-4">오늘 비행 창</h2>

          {/* 비행 가능 시간대 */}
          <div
            className="rounded-xl p-3.5 mb-3"
            style={{ background: "#ECFDF5", border: "1px solid #A7F3D0" }}
          >
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle2 size={14} style={{ color: "#10B981" }} />
              <span className="text-sm font-semibold" style={{ color: "#065F46" }}>
                비행 가능 시간대
              </span>
            </div>
            <div className="text-lg font-bold" style={{ color: "#10B981" }}>
              {flyableHours[0]?.hour} ~ {flyableHours[flyableHours.length - 1]?.hour}
            </div>
            <div className="text-xs text-gray-500 mt-0.5">
              약 {flyableHours.length}시간 ({flyableHours.length * 60}분)
            </div>
          </div>

          {firstYellow && (
            <div
              className="rounded-xl p-3 mb-3"
              style={{ background: "#FFFBEB", border: "1px solid #FDE68A" }}
            >
              <div className="flex items-center gap-2 mb-0.5">
                <AlertTriangle size={13} style={{ color: "#D97706" }} />
                <span className="text-xs font-semibold" style={{ color: "#92400E" }}>
                  {firstYellow.hour}부터 주의
                </span>
              </div>
              <div className="text-xs text-gray-600">
                풍속 {firstYellow.wind}m/s — 모니터링 필요
              </div>
            </div>
          )}

          {/* 등급 기준 안내 */}
          <div className="space-y-2 mt-4">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">등급 기준</h3>
            {(["GREEN", "YELLOW", "RED"] as Grade[]).map((g) => {
              const cfg = GRADE_CFG[g];
              return (
                <div key={g} className="flex items-center gap-2 text-xs">
                  <span
                    className="w-14 text-center font-bold rounded-full px-1.5 py-0.5"
                    style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}
                  >
                    {g}
                  </span>
                  <span className="text-gray-500">{cfg.windLimit} · {cfg.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 시간별 예보 차트 */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold" style={{ color: "#0D2B52" }}>시간별 풍속 예보</h2>
          <div className="flex items-center gap-3 text-xs text-gray-400">
            {(["GREEN", "YELLOW", "RED"] as Grade[]).map((g) => (
              <span key={g} className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-sm" style={{ background: GRADE_CFG[g].color }} />
                {GRADE_CFG[g].label}
              </span>
            ))}
          </div>
        </div>

        {/* 막대 차트 */}
        <div className="mb-2">
          <HourlyChart data={HOURLY} />
        </div>

        {/* 기준선 표시 */}
        <div className="flex items-center gap-4 text-xs mt-2 pl-1">
          <span className="flex items-center gap-1 text-gray-400">
            <span className="inline-block w-4 border-t-2 border-dashed border-amber-400" />
            주의 (5m/s)
          </span>
          <span className="flex items-center gap-1 text-gray-400">
            <span className="inline-block w-4 border-t-2 border-dashed border-red-400" />
            위험 (8m/s)
          </span>
        </div>
      </div>

      {/* 시간별 상세 테이블 + 7일 예보 */}
      <div className="grid grid-cols-5 gap-4">
        {/* 시간별 상세 */}
        <div className="col-span-3 bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <h2 className="font-semibold mb-4" style={{ color: "#0D2B52" }}>시간별 상세 예보</h2>
          <div
            className="grid text-xs text-gray-400 font-medium pb-2 border-b border-gray-100"
            style={{ gridTemplateColumns: "0.7fr 1fr 1fr 0.8fr 0.8fr 0.8fr 0.8fr" }}
          >
            <span>시간</span>
            <span>풍속 (변화)</span>
            <span>풍향</span>
            <span>기온</span>
            <span>습도</span>
            <span>가시거리</span>
            <span className="text-right">등급</span>
          </div>
          <div className="divide-y divide-gray-50">
            {HOURLY.map((h, i) => {
              const gcfg = GRADE_CFG[h.grade];
              const isNow = h.hour === "13:00";
              return (
                <div
                  key={h.hour}
                  className="grid py-2.5 text-sm items-center"
                  style={{
                    gridTemplateColumns: "0.7fr 1fr 1fr 0.8fr 0.8fr 0.8fr 0.8fr",
                    background: isNow ? "#F0F9FF" : "transparent",
                    borderRadius: isNow ? 8 : 0,
                  }}
                >
                  <span className="font-medium" style={{ color: isNow ? "#2A7AE2" : "#0D2B52" }}>
                    {h.hour}
                    {isNow && <span className="ml-1 text-xs text-blue-400">▶ 현재</span>}
                  </span>
                  <span className="flex items-center gap-1 font-semibold" style={{ color: gcfg.color }}>
                    {h.wind}m/s
                    {i > 0 && <TrendIcon prev={HOURLY[i - 1].wind} curr={h.wind} />}
                  </span>
                  <span className="text-gray-600">{h.windDir}</span>
                  <span className="text-gray-600">{h.temp}°C</span>
                  <span className="text-gray-600">{h.humidity}%</span>
                  <span className="text-gray-600">{h.visibility}</span>
                  <span className="flex justify-end">
                    <span
                      className="text-xs font-bold px-2 py-0.5 rounded-full"
                      style={{ background: gcfg.bg, color: gcfg.color }}
                    >
                      {h.grade}
                    </span>
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* 7일 예보 */}
        <div className="col-span-2 bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <h2 className="font-semibold mb-4" style={{ color: "#0D2B52" }}>7일 예보</h2>
          <div className="space-y-2.5">
            {DAILY.map((d) => {
              const gcfg = GRADE_CFG[d.grade];
              const isToday = d.label.includes("오늘");
              return (
                <div
                  key={d.date}
                  className="flex items-center gap-3 rounded-xl px-3 py-2.5"
                  style={{ background: isToday ? gcfg.bg : "#F9FAFB", border: isToday ? `1px solid ${gcfg.border}` : "1px solid transparent" }}
                >
                  {/* 날짜 */}
                  <div className="w-20 flex-shrink-0">
                    <div
                      className="text-sm font-semibold"
                      style={{ color: isToday ? gcfg.color : "#0D2B52" }}
                    >
                      {d.label}
                    </div>
                  </div>

                  {/* 등급 뱃지 */}
                  <span
                    className="text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0 w-14 text-center"
                    style={{ background: gcfg.bg, color: gcfg.color, border: `1px solid ${gcfg.border}` }}
                  >
                    {d.grade}
                  </span>

                  {/* 풍속 바 */}
                  <div className="flex-1">
                    <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
                      <span>{d.windMin}~{d.windMax}m/s</span>
                      <span>{d.tempMin}~{d.tempMax}°C</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          marginLeft: `${(d.windMin / 12) * 100}%`,
                          width: `${((d.windMax - d.windMin) / 12) * 100}%`,
                          background: gcfg.color,
                          opacity: 0.7,
                        }}
                      />
                    </div>
                  </div>

                  {/* 요약 */}
                  <div className="text-xs text-gray-400 w-24 text-right flex-shrink-0">
                    {d.summary}
                  </div>
                </div>
              );
            })}
          </div>

          {/* 기준선 범례 */}
          <div className="mt-4 pt-3 border-t border-gray-100">
            <div className="h-2 rounded-full overflow-hidden flex">
              <div className="flex-1" style={{ background: "#10B981" }} title="GREEN: 0~5m/s" />
              <div style={{ width: "25%", background: "#F59E0B" }} title="YELLOW: 5~8m/s" />
              <div style={{ width: "12%", background: "#EF4444" }} title="RED: 8m/s+" />
            </div>
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>0</span>
              <span>5m/s</span>
              <span>8m/s</span>
              <span>12m/s+</span>
            </div>
          </div>
        </div>
      </div>

      {/* 기상 메모 */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
        <div className="flex items-center gap-2 mb-3">
          <Clock size={15} className="text-gray-400" />
          <h2 className="font-semibold" style={{ color: "#0D2B52" }}>운영 메모</h2>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div
            className="rounded-xl p-3.5 text-sm"
            style={{ background: "#FFFBEB", border: "1px solid #FDE68A" }}
          >
            <div className="font-semibold mb-1" style={{ color: "#92400E" }}>⚠️ 15:00 이후 주의</div>
            <div className="text-gray-600">서풍 계열로 전환 예정. 풍속 4~6m/s 증가 가능. 14:30 이후 신규 비행 배정 시 기상 재확인 필요.</div>
          </div>
          <div
            className="rounded-xl p-3.5 text-sm"
            style={{ background: "#EFF6FF", border: "1px solid #BFDBFE" }}
          >
            <div className="font-semibold mb-1" style={{ color: "#1E40AF" }}>📋 내일 예보</div>
            <div className="text-gray-600">내일(금) 전일 GREEN 등급 예상. 최적 비행 조건. 오전 예약 집중 권장. 모레(토)까지 양호 지속.</div>
          </div>
        </div>
      </div>
    </div>
  );
}
