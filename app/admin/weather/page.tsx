"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Wind, Thermometer, Droplets, AlertTriangle, CheckCircle2, XCircle,
  RefreshCw, ChevronUp, ChevronDown, Minus, Plus, X, Edit3,
  MapPin, Trash2, Mountain, Navigation, Sunrise, Sunset,
} from "lucide-react";
import { getSunTimes, hmToMin, type SunTimes } from "@/lib/sunCalc";
import {
  useLaunchSites, updateLaunchSite, addLaunchSite, deleteLaunchSite,
  defaultWindDirs, calcFlightGrade, degToDir16, latlngToGrid, cycleGrade,
  WIND_DIR_16, WIND_DIR_GRADE_CFG,
  type LaunchSite, type WindDir16, type WindDirGrade, type FlightGrade,
} from "@/lib/launchSiteStore";
import type { WeatherCurrent, WeatherHourly } from "@/app/api/weather/route";

// ── 타입 ────────────────────────────────────────────────────────
interface WeatherData {
  isMock: boolean;
  current: WeatherCurrent;
  hourly: WeatherHourly[];
  fetchedAt: string;
  error?: string;
}

// ── 상수 ────────────────────────────────────────────────────────
const GRADE_CFG: Record<FlightGrade, {
  label: string; short: string; badge: string; sub: string;
  color: string; bg: string; border: string; icon: typeof CheckCircle2;
}> = {
  GREEN:  { label: "비행 가능", short: "양호", badge: "✅ 양호", sub: "현재 조건 양호",    color: "#059669", bg: "#ECFDF5", border: "#6EE7B7", icon: CheckCircle2 },
  YELLOW: { label: "주의 필요", short: "주의", badge: "⚠️ 주의", sub: "기상 변화 모니터링", color: "#D97706", bg: "#FFFBEB", border: "#FCD34D", icon: AlertTriangle },
  RED:    { label: "비행 불가", short: "불가", badge: "⛔ 불가", sub: "비행 중단 권고",    color: "#DC2626", bg: "#FEF2F2", border: "#FCA5A5", icon: XCircle       },
};

const SKY_LABEL: Record<number, string> = { 1: "맑음", 3: "구름많음", 4: "흐림" };
const PTY_LABEL: Record<number, string> = { 0: "", 1: "비", 2: "비/눈", 3: "눈", 5: "빗방울", 6: "빗방울/눈", 7: "눈날림" };

// ── 풍속 단위 ────────────────────────────────────────────────────
type WindUnit = "ms" | "kmh";
function toKmh(ms: number) { return +(ms * 3.6).toFixed(1); }
function fmtWind(ms: number, unit: WindUnit) {
  return unit === "kmh" ? `${toKmh(ms)}` : `${ms}`;
}
function unitLabel(unit: WindUnit) { return unit === "kmh" ? "km/h" : "m/s"; }
// 임계값 표시 (풍속 등급 경계)
function thresholdLabel(ms: number, unit: WindUnit) {
  return unit === "kmh" ? `${toKmh(ms)}km/h` : `${ms}m/s`;
}

// ── WindRose SVG 컴포넌트 ────────────────────────────────────────
function WindRose({
  windDirections,
  currentDeg,
  currentDir16,
  size = 240,
}: {
  windDirections: Record<WindDir16, WindDirGrade>;
  currentDeg: number | null;
  currentDir16: WindDir16 | null;
  size?: number;
}) {
  const cx = size / 2, cy = size / 2;
  const outerR = size * 0.40;
  const innerR = size * 0.20;
  const labelR = size * 0.47;

  const toRad = (deg: number) => ((deg - 90) * Math.PI) / 180;

  const gradeColor: Record<WindDirGrade, string> = {
    best: "#34D399", conditional: "#60A5FA", caution: "#FBBF24", reject: "#F87171",
  };
  const gradeStroke: Record<WindDirGrade, string> = {
    best: "#059669", conditional: "#2563EB", caution: "#D97706", reject: "#DC2626",
  };

  const sectors = WIND_DIR_16.map((dir, i) => {
    const grade = windDirections[dir];
    const centerDeg = i * 22.5;
    const sRad = toRad(centerDeg - 11.25);
    const eRad = toRad(centerDeg + 11.25);
    const isCurrent = dir === currentDir16;

    const ox1 = cx + outerR * Math.cos(sRad);
    const oy1 = cy + outerR * Math.sin(sRad);
    const ox2 = cx + outerR * Math.cos(eRad);
    const oy2 = cy + outerR * Math.sin(eRad);
    const ix2 = cx + innerR * Math.cos(eRad);
    const iy2 = cy + innerR * Math.sin(eRad);
    const ix1 = cx + innerR * Math.cos(sRad);
    const iy1 = cy + innerR * Math.sin(sRad);

    const d = [
      `M ${ox1.toFixed(1)} ${oy1.toFixed(1)}`,
      `A ${outerR} ${outerR} 0 0 1 ${ox2.toFixed(1)} ${oy2.toFixed(1)}`,
      `L ${ix2.toFixed(1)} ${iy2.toFixed(1)}`,
      `A ${innerR} ${innerR} 0 0 0 ${ix1.toFixed(1)} ${iy1.toFixed(1)}`,
      "Z",
    ].join(" ");

    const lRad = toRad(centerDeg);
    const lx = cx + labelR * Math.cos(lRad);
    const ly = cy + labelR * Math.sin(lRad);
    const isMajor = ["N","NE","E","SE","S","SW","W","NW"].includes(dir);

    return { dir, grade, color: gradeColor[grade], stroke: gradeStroke[grade], d, lx, ly, isMajor, isCurrent };
  });

  // 현재 풍향 포인터
  let pointer: string | null = null;
  if (currentDeg !== null) {
    const pRad = toRad(currentDeg);
    const tipR  = innerR * 1.05;
    const baseR = outerR * 0.82;
    const spread = 0.18;
    const tip  = { x: cx + tipR  * Math.cos(pRad), y: cy + tipR  * Math.sin(pRad) };
    const b1   = { x: cx + baseR * Math.cos(pRad - spread), y: cy + baseR * Math.sin(pRad - spread) };
    const b2   = { x: cx + baseR * Math.cos(pRad + spread), y: cy + baseR * Math.sin(pRad + spread) };
    pointer = `${tip.x.toFixed(1)},${tip.y.toFixed(1)} ${b1.x.toFixed(1)},${b1.y.toFixed(1)} ${b2.x.toFixed(1)},${b2.y.toFixed(1)}`;
  }

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {/* 외부 링 */}
      <circle cx={cx} cy={cy} r={outerR + 2} fill="none" stroke="#E5E7EB" strokeWidth="1" />
      {/* 섹터 */}
      {sectors.map(({ dir, color, stroke, d, lx, ly, isMajor, isCurrent }) => (
        <g key={dir}>
          <path
            d={d}
            fill={color}
            stroke={isCurrent ? "#1e1f23" : "white"}
            strokeWidth={isCurrent ? 2 : 1}
            opacity={isCurrent ? 1 : 0.8}
          />
          <text
            x={lx} y={ly}
            textAnchor="middle" dominantBaseline="central"
            fontSize={isMajor ? size * 0.052 : size * 0.042}
            fontWeight={isMajor ? "700" : "500"}
            fill={isCurrent ? "#1e1f23" : isMajor ? "#374151" : "#6B7280"}
          >
            {dir}
          </text>
        </g>
      ))}
      {/* 내부 흰 원 */}
      <circle cx={cx} cy={cy} r={innerR - 1} fill="white" stroke="#F3F4F6" strokeWidth="1" />
      {/* 포인터 */}
      {pointer && (
        <polygon points={pointer} fill="#1e1f23" opacity={0.9} />
      )}
      {/* 중앙 방향 표시 */}
      {currentDir16 && (
        <text
          x={cx} y={cy}
          textAnchor="middle" dominantBaseline="central"
          fontSize={size * 0.09} fontWeight="800"
          fill="#1e1f23"
        >
          {currentDir16}
        </text>
      )}
    </svg>
  );
}

// ── 풍향 편집기 (이륙장 모달 내부) ─────────────────────────────
function WindDirEditor({
  value,
  onChange,
}: {
  value: Record<WindDir16, WindDirGrade>;
  onChange: (next: Record<WindDir16, WindDirGrade>) => void;
}) {
  const size = 260;
  const cx = size / 2, cy = size / 2, r = 100;

  function handleClick(dir: WindDir16) {
    onChange({ ...value, [dir]: cycleGrade(value[dir]) });
  }

  return (
    <div>
      {/* 원형 버튼 배치 */}
      <div className="relative mx-auto" style={{ width: size, height: size }}>
        {WIND_DIR_16.map((dir, i) => {
          const angleDeg = i * 22.5;
          const angleRad = ((angleDeg - 90) * Math.PI) / 180;
          const bx = cx + r * Math.cos(angleRad);
          const by = cy + r * Math.sin(angleRad);
          const grade = value[dir];
          const cfg = WIND_DIR_GRADE_CFG[grade];
          return (
            <button
              key={dir}
              onClick={() => handleClick(dir)}
              title={`${dir}: ${cfg.label} → 클릭으로 변경`}
              className="absolute rounded-md text-xs font-bold transition-all hover:scale-110 shadow-sm"
              style={{
                left: bx - 18, top: by - 13,
                width: 36, height: 26,
                background: cfg.bg,
                color: cfg.color,
                border: `1.5px solid ${cfg.border}`,
              }}
            >
              {dir}
            </button>
          );
        })}
        {/* 중앙 안내 */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-xs text-gray-400 text-center leading-tight">클릭으로<br />등급 변경</span>
        </div>
      </div>

      {/* 범례 */}
      <div className="flex justify-center gap-3 mt-3 flex-wrap">
        {(Object.entries(WIND_DIR_GRADE_CFG) as [WindDirGrade, typeof WIND_DIR_GRADE_CFG[WindDirGrade]][]).map(([g, cfg]) => {
          const count = WIND_DIR_16.filter((d) => value[d] === g).length;
          return (
            <span key={g} className="flex items-center gap-1 text-xs">
              <span className="w-3 h-3 rounded-sm" style={{ background: cfg.bg, border: `1px solid ${cfg.border}` }} />
              <span style={{ color: cfg.color }} className="font-semibold">{cfg.label}</span>
              <span className="text-gray-400">{count}개</span>
            </span>
          );
        })}
      </div>

      {/* 방향별 요약 */}
      <div className="mt-3 grid grid-cols-2 gap-1.5">
        {(Object.entries(WIND_DIR_GRADE_CFG) as [WindDirGrade, typeof WIND_DIR_GRADE_CFG[WindDirGrade]][]).map(([g, cfg]) => {
          const dirs = WIND_DIR_16.filter((d) => value[d] === g);
          if (dirs.length === 0) return null;
          return (
            <div key={g} className="rounded-lg p-2 text-xs" style={{ background: cfg.bg, border: `1px solid ${cfg.border}` }}>
              <span className="font-bold" style={{ color: cfg.color }}>{cfg.label}</span>
              <span className="text-gray-500 ml-1">{dirs.join(", ")}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── 이륙장 등록/편집 모달 ────────────────────────────────────────
function LaunchSiteModal({
  initial,
  onSave,
  onDelete,
  onClose,
}: {
  initial: LaunchSite | null;
  onSave: (site: Omit<LaunchSite, "id" | "createdAt">) => void;
  onDelete?: () => void;
  onClose: () => void;
}) {
  const isNew = !initial;
  const [name, setName] = useState(initial?.name ?? "");
  const [location, setLocation] = useState(initial?.location ?? "");
  const [nx, setNx] = useState(String(initial?.nx ?? ""));
  const [ny, setNy] = useState(String(initial?.ny ?? ""));
  const [altitude, setAltitude] = useState(String(initial?.altitude ?? ""));
  const [lat, setLat] = useState(initial?.lat != null ? String(initial.lat) : "");
  const [lng, setLng] = useState(initial?.lng != null ? String(initial.lng) : "");
  const [windDirs, setWindDirs] = useState<Record<WindDir16, WindDirGrade>>(
    initial?.windDirections ?? defaultWindDirs()
  );
  const [confirmDelete, setConfirmDelete] = useState(false);

  function handleAutoGrid() {
    const la = parseFloat(lat), ln = parseFloat(lng);
    if (isNaN(la) || isNaN(ln)) return;
    const g = latlngToGrid(la, ln);
    setNx(String(g.nx));
    setNy(String(g.ny));
  }

  function handleSave() {
    if (!name.trim()) return;
    const latNum = parseFloat(lat);
    const lngNum = parseFloat(lng);
    onSave({
      name: name.trim(),
      location: location.trim(),
      nx: parseInt(nx) || 96,
      ny: parseInt(ny) || 98,
      lat: isNaN(latNum) ? undefined : latNum,
      lng: isNaN(lngNum) ? undefined : lngNum,
      altitude: parseInt(altitude) || 0,
      windDirections: windDirs,
      active: initial?.active ?? true,
    });
  }

  const inputCls = "w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-gray-400 bg-white";
  const labelCls = "block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5";

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl max-h-[95vh] overflow-y-auto">
        {/* 헤더 */}
        <div className="sticky top-0 bg-white z-10 flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-bold" style={{ color: "#0D2B52" }}>
            {isNew ? "이륙장 등록" : "이륙장 편집"}
          </h2>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg">
            <X size={18} className="text-gray-400" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-6">
          {/* 기본 정보 */}
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
              <MapPin size={12} /> 기본 정보
            </p>
            <div className="space-y-3">
              <div>
                <label className={labelCls}>이륙장 이름 *</label>
                <input value={name} onChange={(e) => setName(e.target.value)}
                  placeholder="예: 문경 이륙장" className={inputCls} style={{ color: "#0D2B52" }} />
              </div>
              <div>
                <label className={labelCls}>위치</label>
                <input value={location} onChange={(e) => setLocation(e.target.value)}
                  placeholder="예: 경북 문경시 가은읍" className={inputCls} style={{ color: "#0D2B52" }} />
              </div>
              <div>
                <label className={labelCls}>고도 (m)</label>
                <input type="number" value={altitude} onChange={(e) => setAltitude(e.target.value)}
                  placeholder="850" className={inputCls} style={{ color: "#0D2B52" }} />
              </div>
            </div>
          </div>

          {/* 기상청 격자 좌표 */}
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Navigation size={12} /> 기상청 격자 좌표 (nx / ny)
            </p>
            <p className="text-xs text-gray-400 mb-3">
              기상청 데이터 조회에 사용되는 격자 좌표입니다. 위경도를 입력하면 자동 변환됩니다.
            </p>
            {/* 위경도 자동변환 */}
            <div className="bg-gray-50 rounded-xl p-3 mb-3">
              <p className="text-xs font-medium text-gray-500 mb-2">위경도 → 자동 변환</p>
              <div className="flex gap-2">
                <input type="number" step="0.0001" value={lat} onChange={(e) => setLat(e.target.value)}
                  placeholder="위도 (예: 36.5921)" className="flex-1 border border-gray-200 rounded-lg px-2 py-1.5 text-sm bg-white" />
                <input type="number" step="0.0001" value={lng} onChange={(e) => setLng(e.target.value)}
                  placeholder="경도 (예: 128.0745)" className="flex-1 border border-gray-200 rounded-lg px-2 py-1.5 text-sm bg-white" />
                <button onClick={handleAutoGrid}
                  className="px-3 py-1.5 rounded-lg text-sm font-medium text-white"
                  style={{ background: "#4d4f46" }}>
                  변환
                </button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>nx</label>
                <input type="number" value={nx} onChange={(e) => setNx(e.target.value)}
                  placeholder="96" className={inputCls} style={{ color: "#0D2B52" }} />
              </div>
              <div>
                <label className={labelCls}>ny</label>
                <input type="number" value={ny} onChange={(e) => setNy(e.target.value)}
                  placeholder="98" className={inputCls} style={{ color: "#0D2B52" }} />
              </div>
            </div>
          </div>

          {/* 풍향별 비행 등급 */}
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1 flex items-center gap-2">
              <Wind size={12} /> 이륙장 권장 풍향 설정
            </p>
            <p className="text-xs text-gray-400 mb-4">
              각 방향을 클릭하여 등급을 순환합니다.
              <span className="font-semibold text-green-600 ml-1">최적</span> →
              <span className="font-semibold text-blue-600 ml-1">가능</span> →
              <span className="font-semibold text-amber-600 ml-1">주의</span> →
              <span className="font-semibold text-red-600 ml-1">불가</span>
            </p>
            <WindDirEditor value={windDirs} onChange={setWindDirs} />
          </div>
        </div>

        {/* 푸터 */}
        <div className="sticky bottom-0 bg-white border-t border-gray-100 px-6 py-4">
          {!isNew && !confirmDelete && (
            <button onClick={() => setConfirmDelete(true)}
              className="w-full mb-2 py-2 rounded-xl border border-dashed border-red-200 text-sm text-red-400 hover:bg-red-50 flex items-center justify-center gap-1">
              <Trash2 size={13} /> 이륙장 삭제
            </button>
          )}
          {confirmDelete && (
            <div className="mb-2 rounded-xl bg-red-50 border border-red-200 p-3 flex items-center gap-2">
              <span className="text-sm text-red-600 flex-1">정말 삭제하시겠습니까?</span>
              <button onClick={onDelete} className="px-3 py-1.5 rounded-lg text-sm font-bold text-white bg-red-500">삭제</button>
              <button onClick={() => setConfirmDelete(false)} className="px-3 py-1.5 rounded-lg text-sm text-gray-500 border border-gray-200">취소</button>
            </div>
          )}
          <div className="flex gap-2">
            <button onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-500 hover:bg-gray-50">
              취소
            </button>
            <button onClick={handleSave}
              className="flex-1 py-2.5 rounded-xl text-sm font-medium text-white"
              style={{ background: "#1e1f23" }}>
              {isNew ? "등록" : "저장"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── 시간별 풍속 바 차트 ──────────────────────────────────────────
function HourlyChart({
  data, site, windUnit, nowHourStr,
}: {
  data: WeatherHourly[];
  site: LaunchSite | null;
  windUnit: WindUnit;
  nowHourStr: string;
}) {
  const maxWind = Math.max(...data.map((d) => d.wind), 8);
  const BAR_H = 80;

  return (
    <div className="flex items-end gap-0.5">
      {data.map((d, i) => {
        const dir16 = degToDir16(d.windDeg);
        const { grade } = calcFlightGrade(d.wind, dir16, site);
        const barH = Math.max(Math.round((d.wind / maxWind) * BAR_H), 4);
        const color = GRADE_CFG[grade].color;
        const borderColor = GRADE_CFG[grade].border;
        const isNow = d.hour === nowHourStr;
        return (
          <div key={i} className="flex-1 flex flex-col items-center"
            style={{ gap: isNow ? 2 : 2 }}>
            {/* 풍속 수치 */}
            <span style={{
              fontSize: 9,
              color: isNow ? "#0D2B52" : color,
              fontWeight: isNow ? 800 : 500,
              lineHeight: 1.2,
            }}>
              {fmtWind(d.wind, windUnit)}
            </span>
            {/* 바 */}
            <div
              className="w-full rounded-t-sm"
              style={{
                height: barH,
                minHeight: 4,
                background: color,
                opacity: isNow ? 1 : 0.72,
                border: isNow
                  ? `2px solid ${color}`
                  : `1px solid ${borderColor}`,
                boxShadow: isNow
                  ? `0 0 0 2px white, 0 0 0 3.5px ${color}`
                  : undefined,
              }}
              title={`${d.hour} ${d.wind}m/s (${fmtWind(d.wind, windUnit)}${unitLabel(windUnit)}) · ${d.windDir} · ${GRADE_CFG[grade].short}`}
            />
            {/* 시간 레이블 */}
            <span style={{
              fontSize: 9,
              fontWeight: isNow ? 700 : 400,
              color: isNow ? color : "#9CA3AF",
              lineHeight: 1.2,
            }}>
              {isNow ? "▲지금" : `${d.hour.slice(0, 2)}시`}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function TrendIcon({ prev, curr }: { prev: number; curr: number }) {
  const diff = curr - prev;
  if (diff > 0.3) return <ChevronUp size={12} style={{ color: "#DC2626" }} />;
  if (diff < -0.3) return <ChevronDown size={12} style={{ color: "#059669" }} />;
  return <Minus size={12} className="text-gray-300" />;
}

// ── 메인 페이지 ──────────────────────────────────────────────────
export default function WeatherPage() {
  const sites = useLaunchSites();
  const [selectedId, setSelectedId] = useState<string>("");
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastFetch, setLastFetch] = useState<Date | null>(null);
  const [windUnit, setWindUnit] = useState<WindUnit>("ms");

  // 모달 상태
  const [editSite, setEditSite] = useState<LaunchSite | null | "new">(null);

  // 현재 KST 시각 → "HH:00" 형식 (테이블·차트 현재 행 강조용)
  const nowKST = new Date(Date.now() + 9 * 60 * 60 * 1000);
  const nowHourStr = `${String(nowKST.getUTCHours()).padStart(2, "0")}:00`;

  const selectedSite = sites.find((s) => s.id === selectedId) ?? sites[0] ?? null;

  // 날씨 데이터 조회
  const fetchWeather = useCallback(async (site: LaunchSite) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/weather?nx=${site.nx}&ny=${site.ny}`);
      const data: WeatherData = await res.json();
      setWeather(data);
      setLastFetch(new Date());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedSite) fetchWeather(selectedSite);
  }, [selectedSite?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // 선택 이륙장 초기화
  useEffect(() => {
    if (!selectedId && sites.length > 0) setSelectedId(sites[0].id);
  }, [sites, selectedId]);

  // 등급 계산
  const cur = weather?.current;
  const curDir16 = cur ? degToDir16(cur.windDeg) : null;
  const gradeResult = cur && curDir16
    ? calcFlightGrade(cur.wind, curDir16, selectedSite)
    : null;
  const gcfg = gradeResult ? GRADE_CFG[gradeResult.grade] : GRADE_CFG.GREEN;
  const GradeIcon = gcfg.icon;

  // 일출/일몰 계산 (이륙장 lat/lng 우선, 없으면 문경 기본값)
  const sunTimes: SunTimes = getSunTimes(
    selectedSite?.lat ?? 36.59,
    selectedSite?.lng ?? 128.07
  );
  const flightWindowStart = sunTimes.sunriseMin - 60; // 일출 1시간 전
  const flightWindowEnd   = sunTimes.sunsetMin  + 60; // 일몰 1시간 후

  // 일출-1h ~ 일몰+1h 범위로 시간별 예보 필터
  const windowedHourly = (weather?.hourly ?? []).filter((h) => {
    const min = hmToMin(h.hour);
    return min >= flightWindowStart && min <= flightWindowEnd;
  });

  // 오늘 비행 가능 시간대: 양호(GREEN)+주의(YELLOW) = 비행 가능 / 불가(RED) = 비행 불가
  const flyableHours = windowedHourly.filter((h) => {
    const d16 = degToDir16(h.windDeg);
    return calcFlightGrade(h.wind, d16, selectedSite).grade !== "RED";
  });
  const greenCount  = flyableHours.filter((h) =>
    calcFlightGrade(h.wind, degToDir16(h.windDeg), selectedSite).grade === "GREEN"
  ).length;
  const yellowCount = flyableHours.filter((h) =>
    calcFlightGrade(h.wind, degToDir16(h.windDeg), selectedSite).grade === "YELLOW"
  ).length;
  const firstRed = windowedHourly.find((h) => {
    const d16 = degToDir16(h.windDeg);
    return calcFlightGrade(h.wind, d16, selectedSite).grade === "RED";
  });

  const fmtTime = (iso: string) => {
    try { return new Date(iso).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" }); }
    catch { return ""; }
  };

  return (
    <div className="p-6 space-y-5" style={{ background: "#F5F7FA", minHeight: "100vh" }}>

      {/* ── 헤더 ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "#0D2B52" }}>바람판</h1>
          <p className="text-sm text-gray-500 mt-0.5">기상청 실황 · 이륙장별 풍향 등급 · 비행 판단</p>
        </div>
        <div className="flex items-center gap-2">
          {/* 풍속 단위 토글 */}
          <div className="flex rounded-xl border border-gray-200 overflow-hidden text-sm">
            {(["ms", "kmh"] as WindUnit[]).map((u) => (
              <button
                key={u}
                onClick={() => setWindUnit(u)}
                className="px-3 py-2 font-medium transition-colors"
                style={{
                  background: windUnit === u ? "#1e1f23" : "white",
                  color:      windUnit === u ? "white"   : "#6B7280",
                }}
              >
                {u === "ms" ? "m/s" : "km/h"}
              </button>
            ))}
          </div>
          <button
            onClick={() => setEditSite("new")}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 text-sm text-gray-500 hover:bg-gray-50"
          >
            <Plus size={14} /> 이륙장
          </button>
          <button
            onClick={() => selectedSite && fetchWeather(selectedSite)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 text-sm text-gray-500 hover:bg-gray-50"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            {lastFetch ? fmtTime(lastFetch.toISOString()) + " 기준" : "새로고침"}
          </button>
        </div>
      </div>

      {/* ── Mock 배너 ── */}
      {weather?.isMock && (
        <div className="rounded-xl px-4 py-3 flex items-center gap-3 text-sm"
          style={{ background: "#FFF7ED", border: "1px solid #FED7AA" }}>
          <AlertTriangle size={15} style={{ color: "#D97706", flexShrink: 0 }} />
          <span style={{ color: "#92400E" }}>
            <strong>.env.local</strong>에 <code className="bg-amber-100 px-1 rounded">KMA_API_KEY</code>를 설정하면 기상청 실시간 데이터가 표시됩니다. 현재 목업 데이터 표시 중.
            {weather.error && <span className="ml-1 text-xs text-amber-700">({weather.error})</span>}
          </span>
        </div>
      )}

      {/* ── 이륙장 탭 ── */}
      {sites.length > 0 ? (
        <div className="flex items-center gap-2 flex-wrap">
          {sites.map((site) => (
            <button
              key={site.id}
              onClick={() => setSelectedId(site.id)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium border-2 transition-all"
              style={{
                borderColor: site.id === selectedSite?.id ? "#1e1f23" : "#E5E7EB",
                background:  site.id === selectedSite?.id ? "#1e1f23" : "white",
                color:       site.id === selectedSite?.id ? "white"   : "#4d4f46",
              }}
            >
              <Mountain size={13} />
              {site.name}
              <span
                role="button"
                onClick={(e) => { e.stopPropagation(); setEditSite(site); }}
                className="ml-0.5 opacity-60 hover:opacity-100 cursor-pointer"
              >
                <Edit3 size={11} />
              </span>
            </button>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-2xl p-8 text-center border border-dashed border-gray-200">
          <Mountain size={28} className="text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-500 mb-3">등록된 이륙장이 없습니다</p>
          <button onClick={() => setEditSite("new")}
            className="px-4 py-2 rounded-xl text-sm font-medium text-white"
            style={{ background: "#1e1f23" }}>
            이륙장 등록하기
          </button>
        </div>
      )}

      {weather && selectedSite && (
        <>
          {/* ── 현재 기상 3열 ── */}
          <div className="grid grid-cols-3 gap-4">

            {/* 비행 등급 카드 */}
            <div className="rounded-2xl p-5 shadow-sm border flex flex-col justify-between"
              style={{ background: gcfg.bg, borderColor: gcfg.border }}>
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">비행 등급</span>
                  <GradeIcon size={20} style={{ color: gcfg.color }} />
                </div>
                <div className="text-4xl font-black mb-1" style={{ color: gcfg.color }}>
                  {gradeResult ? gcfg.short : "—"}
                </div>
                <div className="text-lg font-bold mb-0.5" style={{ color: gcfg.color }}>{gcfg.label}</div>
                <div className="text-sm text-gray-500">{gcfg.sub}</div>
              </div>

              {/* 등급 분해 */}
              {gradeResult && (
                <div className="mt-4 pt-4 space-y-2 border-t" style={{ borderColor: gcfg.border }}>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-500">풍속 ({cur?.wind}m/s)</span>
                    <span className="font-bold px-2 py-0.5 rounded-full"
                      style={{ color: GRADE_CFG[gradeResult.speedGrade].color, background: GRADE_CFG[gradeResult.speedGrade].bg }}>
                      {gradeResult.speedGrade}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-500">
                      풍향 ({cur?.windDir16} · {WIND_DIR_GRADE_CFG[gradeResult.dirWindGrade].label})
                    </span>
                    <span className="font-bold px-2 py-0.5 rounded-full"
                      style={{ color: GRADE_CFG[gradeResult.dirGrade].color, background: GRADE_CFG[gradeResult.dirGrade].bg }}>
                      {gradeResult.dirGrade}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* 현재 기상 + 풍향 로즈 */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-gray-400">현재 기상 · {selectedSite.name}</h2>
                <span className="text-xs px-1.5 py-0.5 rounded font-medium"
                  style={{ background: "#EFF6FF", color: "#2563EB" }}>실황</span>
              </div>
              <div className="flex flex-col items-center">
                <WindRose
                  windDirections={selectedSite.windDirections}
                  currentDeg={cur?.windDeg ?? null}
                  currentDir16={curDir16}
                  size={200}
                />
              </div>
              <div className="mt-3 space-y-1.5">
                <div className="flex justify-between text-sm">
                  <span className="flex items-center gap-1.5 text-gray-500"><Wind size={13} style={{ color: "#2A7AE2" }} />풍속</span>
                  <span className="font-bold" style={{ color: "#0D2B52" }}>
                    {cur?.windDir} {cur ? fmtWind(cur.wind, windUnit) : "—"}{unitLabel(windUnit)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="flex items-center gap-1.5 text-gray-500"><Thermometer size={13} style={{ color: "#F54E00" }} />기온</span>
                  <span className="font-semibold" style={{ color: "#0D2B52" }}>{cur?.temp}°C</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="flex items-center gap-1.5 text-gray-500"><Droplets size={13} style={{ color: "#60A5FA" }} />습도</span>
                  <span className="font-medium text-gray-600">{cur?.humidity}%</span>
                </div>
              </div>
            </div>

            {/* 비행 가능 창 + 풍향 범례 */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <h2 className="text-sm font-semibold text-gray-400 mb-3">오늘 비행 창</h2>

              {/* 일출/일몰 + 예보 범위 */}
              <div className="flex items-center justify-between text-xs rounded-xl px-3 py-2 mb-3"
                style={{ background: "#F8F9FA", border: "1px solid #E5E7EB" }}>
                <span className="flex items-center gap-1.5" style={{ color: "#D97706" }}>
                  <Sunrise size={13} />
                  <span className="font-semibold">{sunTimes.sunrise}</span>
                  <span className="text-gray-400">일출</span>
                </span>
                <span className="text-gray-300 text-xs">│</span>
                <span className="flex items-center gap-1.5" style={{ color: "#7C3AED" }}>
                  <Sunset size={13} />
                  <span className="font-semibold">{sunTimes.sunset}</span>
                  <span className="text-gray-400">일몰</span>
                </span>
              </div>

              {/* 시간별 등급 타임라인 스트립 */}
              {windowedHourly.length > 0 && (
                <div className="mb-3">
                  <div className="flex rounded-lg overflow-hidden h-4 mb-1">
                    {windowedHourly.map((h, i) => {
                      const d16 = degToDir16(h.windDeg);
                      const { grade } = calcFlightGrade(h.wind, d16, selectedSite);
                      return (
                        <div key={i} className="flex-1"
                          style={{ background: GRADE_CFG[grade].color, opacity: 0.75 }}
                          title={`${h.hour} ${GRADE_CFG[grade].short} ${h.wind}m/s`}
                        />
                      );
                    })}
                  </div>
                  <div className="flex justify-between text-xs text-gray-400">
                    <span>{windowedHourly[0]?.hour}</span>
                    <span>{windowedHourly[windowedHourly.length - 1]?.hour}</span>
                  </div>
                </div>
              )}

              {flyableHours.length > 0 ? (
                <div className="rounded-xl p-3.5 mb-3" style={{ background: "#ECFDF5", border: "1px solid #6EE7B7" }}>
                  <div className="flex items-center gap-2 mb-1.5">
                    <CheckCircle2 size={14} style={{ color: "#059669" }} />
                    <span className="text-sm font-semibold" style={{ color: "#065F46" }}>비행 가능 시간대</span>
                  </div>
                  <div className="text-lg font-bold mb-1.5" style={{ color: "#059669" }}>
                    {flyableHours[0]?.hour} ~ {flyableHours[flyableHours.length - 1]?.hour}
                  </div>
                  <div className="flex gap-3 text-xs">
                    {greenCount > 0 && (
                      <span className="flex items-center gap-1" style={{ color: "#059669" }}>
                        ✅ 양호 {greenCount}시간
                      </span>
                    )}
                    {yellowCount > 0 && (
                      <span className="flex items-center gap-1" style={{ color: "#D97706" }}>
                        ⚠️ 주의 {yellowCount}시간
                      </span>
                    )}
                  </div>
                </div>
              ) : (
                <div className="rounded-xl p-3.5 mb-3" style={{ background: "#FEF2F2", border: "1px solid #FCA5A5" }}>
                  <div className="flex items-center gap-2">
                    <XCircle size={14} style={{ color: "#DC2626" }} />
                    <span className="text-sm font-semibold" style={{ color: "#991B1B" }}>비행 가능 시간 없음</span>
                  </div>
                </div>
              )}

              {firstRed && (
                <div className="rounded-xl p-3 mb-4" style={{ background: "#FEF2F2", border: "1px solid #FCA5A5" }}>
                  <div className="flex items-center gap-2 mb-0.5">
                    <XCircle size={13} style={{ color: "#DC2626" }} />
                    <span className="text-xs font-semibold" style={{ color: "#991B1B" }}>
                      {firstRed.hour}부터 비행 불가
                    </span>
                  </div>
                  <div className="text-xs text-gray-600">
                    {fmtWind(firstRed.wind, windUnit)}{unitLabel(windUnit)} · {firstRed.windDir} ({degToDir16(firstRed.windDeg)})
                  </div>
                </div>
              )}

              {/* 풍향 등급 범례 */}
              <div className="space-y-1.5">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">풍향 등급</p>
                {(Object.entries(WIND_DIR_GRADE_CFG) as [WindDirGrade, typeof WIND_DIR_GRADE_CFG[WindDirGrade]][]).map(([g, cfg]) => {
                  const dirs = WIND_DIR_16.filter((d) => selectedSite.windDirections[d] === g);
                  if (dirs.length === 0) return null;
                  return (
                    <div key={g} className="flex items-start gap-2 text-xs">
                      <span className="w-10 font-bold flex-shrink-0" style={{ color: cfg.color }}>{cfg.label}</span>
                      <span className="text-gray-500">{dirs.join(", ")}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ── 시간별 풍속 차트 ── */}
          {windowedHourly.length > 0 && (
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="font-semibold" style={{ color: "#0D2B52" }}>시간별 풍속 예보</h2>
                  <p className="text-xs text-gray-400 mt-0.5">
                    <Sunrise size={11} className="inline mr-0.5" style={{ color: "#D97706" }} />
                    일출 {sunTimes.sunrise} 기준 · 비행 예보 범위:{" "}
                    <span className="font-medium text-gray-600">
                      {windowedHourly[0]?.hour} ~ {windowedHourly[windowedHourly.length - 1]?.hour}
                    </span>
                  </p>
                </div>
                <div className="flex items-center gap-3 text-xs text-gray-400">
                  {(["GREEN","YELLOW","RED"] as FlightGrade[]).map((g) => (
                    <span key={g} className="flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded-sm" style={{ background: GRADE_CFG[g].color }} />
                      {GRADE_CFG[g].short}
                    </span>
                  ))}
                </div>
              </div>
              <HourlyChart data={windowedHourly} site={selectedSite} windUnit={windUnit} nowHourStr={nowHourStr} />
              <div className="flex items-center gap-4 text-xs mt-3">
                <span className="flex items-center gap-1 text-gray-400">
                  <span className="inline-block w-4 border-t-2 border-dashed border-amber-400" />
                  주의 ({thresholdLabel(5, windUnit)})
                </span>
                <span className="flex items-center gap-1 text-gray-400">
                  <span className="inline-block w-4 border-t-2 border-dashed border-red-400" />
                  위험 ({thresholdLabel(8, windUnit)})
                </span>
              </div>
            </div>
          )}

          {/* ── 시간별 상세 테이블 ── */}
          {windowedHourly.length > 0 && (
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <h2 className="font-semibold" style={{ color: "#0D2B52" }}>시간별 상세 예보</h2>
                  <span className="text-xs px-1.5 py-0.5 rounded font-medium text-gray-400"
                    style={{ background: "#F3F4F6", border: "1px solid #E5E7EB" }}>
                    현재 행 = 실황 · 나머지 = 단기예보
                  </span>
                </div>
                <span className="text-xs text-gray-400 flex items-center gap-1">
                  <Sunrise size={11} style={{ color: "#D97706" }} />{sunTimes.sunrise}
                  <span className="mx-1 text-gray-200">·</span>
                  <Sunset size={11} style={{ color: "#7C3AED" }} />{sunTimes.sunset}
                </span>
              </div>
              <div
                className="grid text-xs text-gray-400 font-medium pb-2 border-b border-gray-100"
                style={{ gridTemplateColumns: "0.7fr 1.1fr 1.1fr 0.7fr 0.7fr 0.9fr 0.9fr 0.8fr" }}
              >
                <span>시간</span>
                <span>풍속 ({unitLabel(windUnit)})</span>
                <span>풍향</span>
                <span>기온</span>
                <span>습도</span>
                <span>날씨</span>
                <span>방향등급</span>
                <span className="text-right">비행등급</span>
              </div>
              <div className="divide-y divide-gray-50">
                {windowedHourly.map((h, i) => {
                  const isNow = h.hour === nowHourStr;

                  // 현재 시간 행은 실황(초단기실황) 데이터로 교체 → 풍향 그림과 동일 소스
                  const row = isNow && cur
                    ? { wind: cur.wind, windDeg: cur.windDeg, windDir: cur.windDir,
                        temp: cur.temp, humidity: cur.humidity,
                        precipType: cur.precipType, sky: h.sky }
                    : h;

                  const d16 = degToDir16(row.windDeg);
                  const gr = calcFlightGrade(row.wind, d16, selectedSite);
                  const gcf = GRADE_CFG[gr.grade];
                  const dirGradeCfg = WIND_DIR_GRADE_CFG[gr.dirWindGrade];
                  const sky = PTY_LABEL[row.precipType] || SKY_LABEL[row.sky] || "";
                  const isNearSunrise = !isNow && Math.abs(hmToMin(h.hour) - sunTimes.sunriseMin) <= 60;
                  const isNearSunset  = !isNow && Math.abs(hmToMin(h.hour) - sunTimes.sunsetMin)  <= 60;
                  return (
                    <div key={h.hour}
                      className="grid py-2.5 text-sm items-center"
                      style={{
                        gridTemplateColumns: "0.7fr 1.1fr 1.1fr 0.7fr 0.7fr 0.9fr 0.9fr 0.8fr",
                        background: isNow ? "#EFF6FF" : isNearSunrise ? "#FFFBF0" : isNearSunset ? "#F5F3FF" : undefined,
                        borderLeft: isNow ? "3px solid #2563EB" : "3px solid transparent",
                        paddingLeft: isNow ? "calc(0.625rem - 3px)" : undefined,
                      }}
                    >
                      <span className="font-medium text-xs flex items-center gap-1" style={{ color: isNow ? "#1D4ED8" : "#0D2B52" }}>
                        {h.hour}
                        {isNow        && <span className="text-white font-bold px-1 py-0 rounded" style={{ background: "#2563EB", fontSize: 8 }}>실황</span>}
                        {isNearSunrise && <Sunrise size={9} style={{ color: "#D97706" }} />}
                        {isNearSunset  && <Sunset  size={9} style={{ color: "#7C3AED" }} />}
                      </span>
                      <span className="flex items-center gap-1 font-semibold text-xs" style={{ color: gcf.color }}>
                        {fmtWind(row.wind, windUnit)}{unitLabel(windUnit)}
                        {!isNow && i > 0 && <TrendIcon prev={windowedHourly[i-1].wind} curr={h.wind} />}
                      </span>
                      <span className="text-xs text-gray-600">{row.windDir} ({d16})</span>
                      <span className="text-xs text-gray-600">{row.temp}°C</span>
                      <span className="text-xs text-gray-600">{row.humidity}%</span>
                      <span className="text-xs text-gray-500">{sky}</span>
                      <span>
                        <span className="text-xs font-medium px-1.5 py-0.5 rounded-full"
                          style={{ background: dirGradeCfg.bg, color: dirGradeCfg.color }}>
                          {dirGradeCfg.label}
                        </span>
                      </span>
                      <span className="flex justify-end">
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                          style={{ background: gcf.bg, color: gcf.color }}>
                          {gcf.badge}
                        </span>
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}

      {/* 로딩 */}
      {loading && !weather && (
        <div className="flex items-center justify-center py-20">
          <RefreshCw size={24} className="animate-spin text-gray-300" />
        </div>
      )}

      {/* ── 이륙장 등록/편집 모달 ── */}
      {editSite !== null && (
        <LaunchSiteModal
          initial={editSite === "new" ? null : editSite}
          onSave={async (data) => {
            if (editSite === "new") {
              const next = await addLaunchSite(data);
              setSelectedId(next?.id ?? "");
            } else {
              await updateLaunchSite({ ...(editSite as LaunchSite), ...data });
            }
            setEditSite(null);
          }}
          onDelete={editSite !== "new" ? () => {
            deleteLaunchSite((editSite as LaunchSite).id);
            setSelectedId(sites[0]?.id ?? "");
            setEditSite(null);
          } : undefined}
          onClose={() => setEditSite(null)}
        />
      )}
    </div>
  );
}
