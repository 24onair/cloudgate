"use client";

import { useState, useMemo, useEffect } from "react";
import {
  TrendingUp,
  TrendingDown,
  Plane,
  CreditCard,
  Users,
  ArrowUpRight,
  CheckCircle2,
  Clock,
  ChevronRight,
  Percent,
  Plus,
  X,
  Save,
  Trash2,
  Info,
} from "lucide-react";
import {
  useSettlement,
  updateSettlementConfig,
  setPilotOverride,
  removePilotOverride,
  type PilotShareOverride,
} from "@/lib/settlementStore";
import { PILOTS_META } from "@/lib/scheduleStore";

// ─── Mock Data ────────────────────────────────────────────────────────────────

const DAILY_DATA = [
  { date: "04/28", day: "월", flights: 5, revenue: 430000, deposit: 150000, pilot_fee: 75000 },
  { date: "04/29", day: "화", flights: 8, revenue: 720000, deposit: 240000, pilot_fee: 120000 },
  { date: "04/30", day: "수", flights: 3, revenue: 285000, deposit: 120000, pilot_fee: 45000 },
  { date: "05/01", day: "목", flights: 3, revenue: 310000, deposit: 100000, pilot_fee: 45000 },
  { date: "05/02", day: "금", flights: 0, revenue: 0, deposit: 0, pilot_fee: 0 },
  { date: "05/03", day: "토", flights: 0, revenue: 0, deposit: 0, pilot_fee: 0 },
  { date: "05/04", day: "일", flights: 0, revenue: 0, deposit: 0, pilot_fee: 0 },
];

const PILOT_SETTLEMENT = [
  { name: "박구름", flights: 8, rate: 15000, amount: 120000, status: "draft" },
  { name: "김하늘", flights: 6, rate: 15000, amount: 90000, status: "draft" },
  { name: "이바람", flights: 5, rate: 15000, amount: 75000, status: "confirmed" },
];

const PRODUCT_BREAKDOWN = [
  { name: "베이직", flights: 11, revenue: 880000, color: "#2A7AE2" },
  { name: "익스트림", flights: 4, revenue: 480000, color: "#FF8A00" },
  { name: "VIP", flights: 4, revenue: 640000, color: "#0D2B52" },
];

const RECENT_COMPLETED = [
  { id: "BK-20260501-2233", customer: "서지훈", product: "익스트림", time: "12:18", pilot: "김하늘", total: 120000, deposit: 40000 },
  { id: "BK-20260501-1045", customer: "최현우", product: "베이직 + 사진", time: "10:43", pilot: "박구름", total: 110000, deposit: 30000 },
  { id: "BK-20260501-1021", customer: "이수진", product: "베이직", time: "09:14", pilot: "박구름", total: 80000, deposit: 30000 },
];

const PERIOD_TABS = [
  { label: "오늘", value: "today" },
  { label: "이번 주", value: "week" },
  { label: "이번 달", value: "month" },
];

// ─── Period Stats ─────────────────────────────────────────────────────────────

function getPeriodStats(period: string) {
  const days = period === "today" ? DAILY_DATA.slice(3, 4) : period === "week" ? DAILY_DATA : DAILY_DATA;
  return {
    revenue:   days.reduce((s, d) => s + d.revenue, 0),
    deposit:   days.reduce((s, d) => s + d.deposit, 0),
    flights:   days.reduce((s, d) => s + d.flights, 0),
    pilot_fee: days.reduce((s, d) => s + d.pilot_fee, 0),
  };
}

// ─── Bar Chart ────────────────────────────────────────────────────────────────

function RevenueChart({ period }: { period: string }) {
  const data = period === "today" ? DAILY_DATA.slice(3, 4) : DAILY_DATA;
  const maxRevenue = Math.max(...data.map((d) => d.revenue), 1);

  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="font-semibold text-gray-900">매출 추이</h3>
          <p className="text-xs text-gray-400 mt-0.5">
            {period === "today" ? "오늘" : period === "week" ? "2026.04.28 – 05.04" : "2026년 5월"}
          </p>
        </div>
        <div className="flex items-center gap-4 text-xs text-gray-400">
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-sm inline-block" style={{ backgroundColor: "#2A7AE2" }} />
            매출
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-sm inline-block" style={{ backgroundColor: "#E5EDFD" }} />
            파일럿 정산
          </span>
        </div>
      </div>

      <div className="flex items-end gap-2 h-44">
        {data.map((d) => {
          const revenueH = d.revenue ? Math.round((d.revenue / maxRevenue) * 140) : 0;
          const feeH = d.pilot_fee ? Math.round((d.pilot_fee / maxRevenue) * 140) : 0;
          const isToday = d.date === "05/01";

          return (
            <div key={d.date} className="flex-1 flex flex-col items-center gap-1">
              <div className="w-full flex items-end gap-0.5 h-36">
                {/* Revenue bar */}
                <div className="flex-1 rounded-t-md transition-all" style={{
                  height: revenueH || 4,
                  backgroundColor: isToday ? "#FF8A00" : "#2A7AE2",
                  opacity: d.revenue === 0 ? 0.15 : 1,
                }} />
                {/* Pilot fee bar */}
                <div className="flex-1 rounded-t-md" style={{
                  height: feeH || 4,
                  backgroundColor: isToday ? "#FDD9A0" : "#E5EDFD",
                  opacity: d.pilot_fee === 0 ? 0.15 : 1,
                }} />
              </div>
              {d.revenue > 0 && (
                <p className="text-xs font-medium" style={{ color: isToday ? "#FF8A00" : "#2A7AE2" }}>
                  {d.revenue.toLocaleString("ko-KR")}원
                </p>
              )}
              <p className="text-xs text-gray-400">{d.date}</p>
              <p className="text-xs font-medium" style={{ color: isToday ? "#FF8A00" : "#9CA3AF" }}>
                {d.day}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── 분배 비율 관리 카드 ──────────────────────────────────────────────────
function SplitRatioCard() {
  const { cfg, overrides } = useSettlement();
  const [draft, setDraft] = useState(cfg.defaultPilotShare);
  const [dirty, setDirty] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [newOverride, setNewOverride] = useState<PilotShareOverride>({
    pilotId: "", pilotShare: cfg.defaultPilotShare, reason: "",
  });

  // cfg가 외부에서 변경되면 draft 동기화 (단, dirty 상태가 아닐 때만)
  useEffect(() => {
    if (!dirty) setDraft(cfg.defaultPilotShare);
  }, [cfg.defaultPilotShare, dirty]);

  const overrideList = Object.values(overrides);
  const availablePilots = PILOTS_META.filter((p) => !overrides[p.id]);

  function saveDefault() {
    updateSettlementConfig({ defaultPilotShare: draft });
    setDirty(false);
  }

  function addOverride() {
    if (!newOverride.pilotId) return;
    setPilotOverride(newOverride);
    setShowAdd(false);
    setNewOverride({ pilotId: "", pilotShare: cfg.defaultPilotShare, reason: "" });
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Percent className="w-4 h-4" style={{ color: "#2A7AE2" }} />
          <h3 className="font-semibold text-gray-900">분배 비율 관리</h3>
          <span className="text-xs text-gray-400">파일럿 ↔ 회사 매출 분배</span>
        </div>
      </div>

      {/* 기본 비율 (전체 일괄 적용) */}
      <div className="rounded-xl border border-gray-100 p-4 mb-4" style={{ backgroundColor: "#F8FAFC" }}>
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-bold text-gray-700">기본 분배 비율 (전체 파일럿 일괄 적용)</p>
          {dirty && (
            <button
              onClick={saveDefault}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white"
              style={{ backgroundColor: "#0D2B52" }}
            >
              <Save className="w-3.5 h-3.5" /> 저장
            </button>
          )}
        </div>

        <div className="flex items-center gap-3">
          <div className="flex-1">
            <input
              type="range"
              min={0}
              max={100}
              value={draft}
              onChange={(e) => { setDraft(Number(e.target.value)); setDirty(true); }}
              className="w-full"
            />
            <div className="flex justify-between text-[10px] text-gray-400 mt-0.5">
              <span>회사 100%</span>
              <span>파일럿 100%</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={0}
              max={100}
              value={draft}
              onChange={(e) => { setDraft(Math.max(0, Math.min(100, Number(e.target.value) || 0))); setDirty(true); }}
              className="w-16 border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-center font-bold outline-none focus:ring-2 focus:ring-blue-200"
            />
            <span className="text-sm text-gray-500">%</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 mt-3">
          <div className="rounded-lg p-2.5 text-center" style={{ backgroundColor: "#EFF6FF" }}>
            <p className="text-[10px] font-medium text-blue-700">파일럿</p>
            <p className="text-xl font-black mt-0.5" style={{ color: "#2A7AE2" }}>{draft}%</p>
          </div>
          <div className="rounded-lg p-2.5 text-center" style={{ backgroundColor: "#FFF7ED" }}>
            <p className="text-[10px] font-medium text-orange-700">회사</p>
            <p className="text-xl font-black mt-0.5" style={{ color: "#FF8A00" }}>{100 - draft}%</p>
          </div>
        </div>
      </div>

      {/* 예외 적용 (특정 파일럿만 다른 비율) */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-bold text-gray-700 flex items-center gap-1.5">
            예외 적용 파일럿
            <span className="text-xs font-normal text-gray-400">{overrideList.length}명</span>
          </p>
          {availablePilots.length > 0 && !showAdd && (
            <button
              onClick={() => {
                setNewOverride({ pilotId: availablePilots[0].id, pilotShare: cfg.defaultPilotShare, reason: "" });
                setShowAdd(true);
              }}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium text-white"
              style={{ backgroundColor: "#2A7AE2" }}
            >
              <Plus className="w-3 h-3" /> 추가
            </button>
          )}
        </div>

        {overrideList.length === 0 && !showAdd && (
          <p className="text-xs text-gray-400 px-3 py-3 rounded-lg bg-gray-50 text-center">
            모든 파일럿이 기본 비율로 정산됩니다
          </p>
        )}

        {overrideList.map((o) => {
          const pilot = PILOTS_META.find((p) => p.id === o.pilotId);
          if (!pilot) return null;
          return (
            <div key={o.pilotId} className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-amber-100 bg-amber-50 mb-2">
              <span
                className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                style={{ backgroundColor: pilot.avatarColor }}
              >
                {pilot.initials}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800">{pilot.name}</p>
                {o.reason && <p className="text-[10px] text-gray-500 truncate">{o.reason}</p>}
              </div>
              <div className="flex items-center gap-1 text-sm">
                <span className="font-bold" style={{ color: "#2A7AE2" }}>파일럿 {o.pilotShare}%</span>
                <span className="text-gray-300">/</span>
                <span className="font-bold" style={{ color: "#FF8A00" }}>회사 {100 - o.pilotShare}%</span>
              </div>
              <input
                type="number"
                min={0}
                max={100}
                value={o.pilotShare}
                onChange={(e) =>
                  setPilotOverride({ ...o, pilotShare: Math.max(0, Math.min(100, Number(e.target.value) || 0)) })
                }
                className="w-14 border border-gray-200 rounded-lg px-2 py-1 text-xs text-center bg-white"
              />
              <button
                onClick={() => removePilotOverride(o.pilotId)}
                className="p-1.5 rounded-lg hover:bg-red-100"
                title="기본 비율로 되돌리기"
              >
                <Trash2 className="w-3.5 h-3.5 text-red-500" />
              </button>
            </div>
          );
        })}

        {showAdd && availablePilots.length > 0 && (
          <div className="rounded-xl border-2 border-blue-200 p-3 bg-blue-50">
            <div className="grid grid-cols-2 gap-2 mb-2">
              <select
                value={newOverride.pilotId}
                onChange={(e) => setNewOverride({ ...newOverride, pilotId: e.target.value })}
                className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm bg-white"
              >
                {availablePilots.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={newOverride.pilotShare}
                  onChange={(e) =>
                    setNewOverride({ ...newOverride, pilotShare: Math.max(0, Math.min(100, Number(e.target.value) || 0)) })
                  }
                  className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-center bg-white"
                />
                <span className="text-sm text-gray-500">%</span>
              </div>
            </div>
            <input
              value={newOverride.reason ?? ""}
              onChange={(e) => setNewOverride({ ...newOverride, reason: e.target.value })}
              placeholder="사유 (선택, 예: 시니어 파일럿 인센티브)"
              maxLength={40}
              className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm bg-white"
            />
            <div className="flex gap-2 mt-2">
              <button
                onClick={() => setShowAdd(false)}
                className="flex-1 py-1.5 rounded-lg text-xs font-medium border border-gray-200 bg-white"
              >
                취소
              </button>
              <button
                onClick={addOverride}
                className="flex-1 py-1.5 rounded-lg text-xs font-bold text-white"
                style={{ backgroundColor: "#0D2B52" }}
              >
                저장
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="rounded-lg bg-gray-50 px-3 py-2 mt-3 text-[11px] text-gray-500 flex items-start gap-1.5">
        <Info className="w-3 h-3 mt-0.5 flex-shrink-0" />
        <span>
          비행 1건의 매출 = 파일럿 정산 + 회사 매출. 예외 적용된 파일럿은 본인 화면에 별도 표시되지 않으며,
          정산 확정 시 적용 비율로 자동 계산됩니다.
        </span>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

function getPeriodLabel(period: string): string {
  if (period === "today") return "2026.05.03";
  if (period === "week")  return "04.28 ~ 05.04";
  if (period === "month") return "2026년 5월";
  return "";
}

export default function SettlementPage() {
  const [period, setPeriod] = useState("week");
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const stats = useMemo(() => getPeriodStats(period), [period]);
  const netProfit = stats.revenue - stats.pilot_fee;
  const totalPilotFee = PILOT_SETTLEMENT.reduce((s, p) => s + p.amount, 0);
  const totalFlights = PILOT_SETTLEMENT.reduce((s, p) => s + p.flights, 0);
  const totalProductRevenue = PRODUCT_BREAKDOWN.reduce((s, p) => s + p.revenue, 0);

  const nowStr = `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, "0")}.${String(now.getDate()).padStart(2, "0")} ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

  return (
    <div className="p-6 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-baseline gap-3">
            <h1 className="text-2xl font-bold" style={{ color: "#0D2B52" }}>계산대</h1>
            <span className="text-sm font-medium" style={{ color: "#2A7AE2" }}>{nowStr}</span>
          </div>
          <p className="text-sm text-gray-400 mt-0.5">매출 & 정산 현황</p>
        </div>
        {/* Period tabs */}
        <div className="flex flex-col items-end gap-1">
          <div className="flex gap-1 bg-white rounded-xl p-1 shadow-sm border border-gray-100">
            {PERIOD_TABS.map((tab) => (
              <button
                key={tab.value}
                onClick={() => setPeriod(tab.value)}
                className="px-4 py-1.5 rounded-lg text-sm font-medium transition-all"
                style={
                  period === tab.value
                    ? { backgroundColor: "#0D2B52", color: "white" }
                    : { color: "#6B7280" }
                }
              >
                {tab.label}
              </button>
            ))}
          </div>
          <span className="text-xs font-medium pr-1" style={{ color: "#2A7AE2" }}>
            {getPeriodLabel(period)}
          </span>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {/* 총 매출 */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-gray-400 mb-1">총 매출</p>
              <p className="text-2xl font-bold" style={{ color: "#0D2B52" }}>
                {stats.revenue.toLocaleString("ko-KR")}
                <span className="text-sm font-normal text-gray-400 ml-1">원</span>
              </p>
            </div>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: "#EEF4FD" }}>
              <TrendingUp className="w-4 h-4" style={{ color: "#2A7AE2" }} />
            </div>
          </div>
          <div className="flex items-center gap-1 mt-3 text-xs" style={{ color: "#15803D" }}>
            <ArrowUpRight className="w-3 h-3" />
            <span>지난 주 대비 +12%</span>
          </div>
        </div>

        {/* 완료 비행 */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-gray-400 mb-1">완료 비행</p>
              <p className="text-2xl font-bold" style={{ color: "#0D2B52" }}>
                {stats.flights}
                <span className="text-sm font-normal text-gray-400 ml-1">건</span>
              </p>
              <p className="text-xs text-gray-500 mt-1">평균 {stats.flights > 0 ? Math.round(stats.revenue / stats.flights).toLocaleString() : 0}원/건</p>
            </div>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: "#FFF3E6" }}>
              <Plane className="w-4 h-4" style={{ color: "#FF8A00" }} />
            </div>
          </div>
          <div className="flex items-center gap-1 mt-3 text-xs" style={{ color: "#15803D" }}>
            <ArrowUpRight className="w-3 h-3" />
            <span>지난 주 대비 +3건</span>
          </div>
        </div>

        {/* 파일럿 정산 */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-gray-400 mb-1">파일럿 정산</p>
              <p className="text-2xl font-bold" style={{ color: "#0D2B52" }}>
                {stats.pilot_fee.toLocaleString("ko-KR")}
                <span className="text-sm font-normal text-gray-400 ml-1">원</span>
              </p>
            </div>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: "#F3F4F6" }}>
              <Users className="w-4 h-4 text-gray-500" />
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-3">
            매출 대비 {stats.revenue > 0 ? Math.round((stats.pilot_fee / stats.revenue) * 100) : 0}%
          </p>
        </div>

        {/* 순수익 */}
        <div className="rounded-2xl p-5 shadow-sm border" style={{ backgroundColor: "#0D2B52", borderColor: "#0D2B52" }}>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs mb-1" style={{ color: "rgba(255,255,255,0.6)" }}>순수익 추정</p>
              <p className="text-2xl font-bold text-white">
                {netProfit.toLocaleString("ko-KR")}
                <span className="text-sm font-normal ml-1" style={{ color: "rgba(255,255,255,0.6)" }}>원</span>
              </p>
            </div>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: "rgba(255,255,255,0.15)" }}>
              <CreditCard className="w-4 h-4 text-white" />
            </div>
          </div>
          <p className="text-xs mt-3" style={{ color: "rgba(255,255,255,0.5)" }}>
            매출 - 파일럿 정산액 기준
          </p>
        </div>
      </div>

      {/* Chart + Product Breakdown */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {/* Bar Chart (2/3) */}
        <div className="col-span-2">
          <RevenueChart period={period} />
        </div>

        {/* Product Breakdown (1/3) */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <h3 className="font-semibold text-gray-900 mb-1">상품별 매출</h3>
          <p className="text-xs text-gray-400 mb-4">이번 주 기준</p>

          {/* Stacked bar */}
          <div className="flex rounded-full h-3 overflow-hidden mb-4">
            {PRODUCT_BREAKDOWN.map((p) => (
              <div
                key={p.name}
                style={{
                  width: `${Math.round((p.revenue / totalProductRevenue) * 100)}%`,
                  backgroundColor: p.color,
                }}
              />
            ))}
          </div>

          <div className="space-y-3">
            {PRODUCT_BREAKDOWN.map((p) => (
              <div key={p.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: p.color }}
                  />
                  <span className="text-sm text-gray-700">{p.name}</span>
                  <span className="text-xs text-gray-400">{p.flights}건</span>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold" style={{ color: "#0D2B52" }}>
                    {p.revenue.toLocaleString("ko-KR")}원
                  </p>
                  <p className="text-xs text-gray-400">
                    {Math.round((p.revenue / totalProductRevenue) * 100)}%
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="border-t border-gray-100 mt-4 pt-3 flex justify-between text-sm">
            <span className="text-gray-500">합계</span>
            <span className="font-bold" style={{ color: "#0D2B52" }}>
              {totalProductRevenue.toLocaleString("ko-KR")}원
            </span>
          </div>
        </div>
      </div>

      {/* 분배 비율 관리 */}
      <SplitRatioCard />

      {/* Pilot Settlement + Recent Completed */}
      <div className="grid grid-cols-2 gap-4">
        {/* Pilot Settlement */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
            <div>
              <h3 className="font-semibold text-gray-900">파일럿 정산 현황</h3>
              <p className="text-xs text-gray-400">2026.04.28 – 05.04</p>
            </div>
            <span className="text-xs px-2 py-1 rounded-full font-medium" style={{ backgroundColor: "#FEF3C7", color: "#D97706" }}>
              검토 중
            </span>
          </div>

          {/* Table header */}
          <div className="grid px-5 py-2.5 text-xs font-semibold text-gray-400 border-b border-gray-50"
            style={{ gridTemplateColumns: "1fr 0.6fr 0.8fr 1fr 0.8fr" }}>
            <span>파일럿</span>
            <span className="text-right">건수</span>
            <span className="text-right">단가</span>
            <span className="text-right">정산액</span>
            <span className="text-right">상태</span>
          </div>

          {PILOT_SETTLEMENT.map((p) => (
            <div key={p.name}
              className="grid items-center px-5 py-3.5 border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors"
              style={{ gridTemplateColumns: "1fr 0.6fr 0.8fr 1fr 0.8fr" }}>
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                  style={{ backgroundColor: "#0D2B52" }}>
                  {p.name[0]}
                </div>
                <span className="text-sm font-medium text-gray-800">{p.name}</span>
              </div>
              <span className="text-sm text-gray-600 text-right">{p.flights}건</span>
              <span className="text-sm text-gray-600 text-right">{p.rate.toLocaleString()}원</span>
              <span className="text-sm font-semibold text-right" style={{ color: "#0D2B52" }}>
                {p.amount.toLocaleString()}원
              </span>
              <div className="flex justify-end">
                {p.status === "confirmed" ? (
                  <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                    style={{ backgroundColor: "#DCFCE7", color: "#15803D" }}>확정</span>
                ) : (
                  <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                    style={{ backgroundColor: "#F3F4F6", color: "#6B7280" }}>검토</span>
                )}
              </div>
            </div>
          ))}

          {/* Total */}
          <div className="grid px-5 py-3.5 border-t-2 border-gray-100"
            style={{ gridTemplateColumns: "1fr 0.6fr 0.8fr 1fr 0.8fr" }}>
            <span className="text-sm font-semibold text-gray-700">합계</span>
            <span className="text-sm font-semibold text-gray-700 text-right">{totalFlights}건</span>
            <span />
            <span className="text-sm font-bold text-right" style={{ color: "#0D2B52" }}>
              {totalPilotFee.toLocaleString()}원
            </span>
            <div className="flex justify-end">
              <button className="text-xs px-2 py-1 rounded-lg font-medium text-white transition-opacity hover:opacity-90"
                style={{ backgroundColor: "#2A7AE2" }}>
                정산 확정
              </button>
            </div>
          </div>
        </div>

        {/* Recent Completed */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
            <div>
              <h3 className="font-semibold text-gray-900">오늘 완료 내역</h3>
              <p className="text-xs text-gray-400">2026-05-01</p>
            </div>
            <div className="flex items-center gap-1 text-xs" style={{ color: "#2A7AE2" }}>
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{RECENT_COMPLETED.length}건 완료</span>
            </div>
          </div>

          {RECENT_COMPLETED.map((b, i) => (
            <div key={b.id} className={`px-5 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors ${i < RECENT_COMPLETED.length - 1 ? "border-b border-gray-50" : ""}`}>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                  style={{ backgroundColor: "#0D2B52" }}>
                  {b.customer[0]}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">{b.customer}</p>
                  <p className="text-xs text-gray-400">{b.product} · {b.pilot} 파일럿</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold" style={{ color: "#0D2B52" }}>
                  {b.total.toLocaleString()}원
                </p>
                <div className="flex items-center gap-1 justify-end mt-0.5">
                  <CheckCircle2 className="w-3 h-3" style={{ color: "#22C55E" }} />
                  <p className="text-xs text-gray-400">착륙 {b.time}</p>
                </div>
              </div>
            </div>
          ))}

          {/* Daily total */}
          <div className="px-5 py-3.5 border-t-2 border-gray-100 flex items-center justify-between"
            style={{ backgroundColor: "#F5F7FA" }}>
            <div className="flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-gray-400" />
              <span className="text-sm text-gray-500">오늘 매출 합계</span>
            </div>
            <span className="text-sm font-bold" style={{ color: "#0D2B52" }}>
              {RECENT_COMPLETED.reduce((s, b) => s + b.total, 0).toLocaleString()}원
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
