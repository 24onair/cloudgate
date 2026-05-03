"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  BarChart2,
  PieChart,
  ArrowUpRight,
  ArrowDownRight,
  ChevronDown,
  ChevronUp,
  FileText,
  Layers,
  Wind,
  ShieldCheck,
  Megaphone,
  Wrench,
  Users,
  Package,
  Plus,
  Receipt,
  Lock,
  Shuffle,
} from "lucide-react";
import { useCosts, CATEGORY_META, CostCategory } from "@/lib/costStore";
import { useFixedCosts } from "@/lib/fixedCostStore";

// ── 타입 ────────────────────────────────────────────────────────
type Period = "daily" | "weekly" | "monthly" | "yearly";

interface DayData {
  date: string;
  label: string;
  revenue: number;
  flights: number;
  basic: number;
  extreme: number;
  vip: number;
  fuel: number;
  insurance: number;
  marketing: number;
  maintenance: number;
  salary: number;
  other: number;
}

// ── 목업 데이터 ─────────────────────────────────────────────────
const DAILY_DATA: DayData[] = [
  { date: "2026-04-25", label: "4/25", revenue: 1200000, flights: 12, basic: 600000, extreme: 360000, vip: 240000, fuel: 80000, insurance: 30000, marketing: 20000, maintenance: 15000, salary: 180000, other: 10000 },
  { date: "2026-04-26", label: "4/26", revenue: 980000, flights: 10, basic: 500000, extreme: 280000, vip: 200000, fuel: 70000, insurance: 30000, marketing: 15000, maintenance: 10000, salary: 150000, other: 8000 },
  { date: "2026-04-27", label: "4/27", revenue: 1450000, flights: 14, basic: 700000, extreme: 440000, vip: 310000, fuel: 90000, insurance: 30000, marketing: 25000, maintenance: 20000, salary: 210000, other: 12000 },
  { date: "2026-04-28", label: "4/28", revenue: 1680000, flights: 16, basic: 800000, extreme: 520000, vip: 360000, fuel: 100000, insurance: 30000, marketing: 30000, maintenance: 25000, salary: 240000, other: 15000 },
  { date: "2026-04-29", label: "4/29", revenue: 1320000, flights: 13, basic: 640000, extreme: 400000, vip: 280000, fuel: 85000, insurance: 30000, marketing: 22000, maintenance: 18000, salary: 195000, other: 11000 },
  { date: "2026-04-30", label: "4/30", revenue: 1560000, flights: 15, basic: 750000, extreme: 480000, vip: 330000, fuel: 95000, insurance: 30000, marketing: 28000, maintenance: 22000, salary: 225000, other: 14000 },
  { date: "2026-05-01", label: "오늘", revenue: 1750000, flights: 19, basic: 770000, extreme: 420000, vip: 560000, fuel: 110000, insurance: 30000, marketing: 35000, maintenance: 28000, salary: 285000, other: 17000 },
];

const MONTHLY_DATA = [
  { label: "11월", revenue: 18500000, cost: 10200000, flights: 185 },
  { label: "12월", revenue: 15200000, cost: 8800000, flights: 152 },
  { label: "1월", revenue: 12800000, cost: 7500000, flights: 128 },
  { label: "2월", revenue: 16400000, cost: 9100000, flights: 164 },
  { label: "3월", revenue: 22100000, cost: 11800000, flights: 221 },
  { label: "4월", revenue: 28600000, cost: 14200000, flights: 286 },
  { label: "5월(현재)", revenue: 1750000, cost: 505000, flights: 19 },
];

// ── 숫자 포맷 ───────────────────────────────────────────────────
const fmt    = (n: number) => n.toLocaleString("ko-KR") + "원";
const fmtWon = (n: number) => n.toLocaleString("ko-KR") + "원";

// ── 비용 항목 ───────────────────────────────────────────────────
const COST_ITEMS = [
  { key: "salary" as keyof DayData, label: "파일럿 급여", icon: Users, color: "#2A7AE2" },
  { key: "fuel" as keyof DayData, label: "연료비", icon: Wind, color: "#FF8A00" },
  { key: "insurance" as keyof DayData, label: "보험료", icon: ShieldCheck, color: "#10B981" },
  { key: "marketing" as keyof DayData, label: "마케팅", icon: Megaphone, color: "#8B5CF6" },
  { key: "maintenance" as keyof DayData, label: "장비유지", icon: Wrench, color: "#F59E0B" },
  { key: "other" as keyof DayData, label: "기타", icon: Package, color: "#6B7280" },
];

const PRODUCT_ITEMS = [
  { key: "basic" as keyof DayData, label: "베이직", color: "#2A7AE2", price: 50000 },
  { key: "extreme" as keyof DayData, label: "익스트림", color: "#FF8A00", price: 80000 },
  { key: "vip" as keyof DayData, label: "VIP", color: "#0D2B52", price: 120000 },
];

// ── 막대 차트 ───────────────────────────────────────────────────
function BarChart({ data, period }: { data: typeof DAILY_DATA | typeof MONTHLY_DATA; period: Period }) {
  const isMonthly = period === "monthly" || period === "yearly";
  const chartData = isMonthly ? MONTHLY_DATA : DAILY_DATA;
  const maxRevenue = Math.max(...chartData.map((d) => d.revenue));
  const maxCost = isMonthly
    ? Math.max(...MONTHLY_DATA.map((d) => d.cost))
    : Math.max(...DAILY_DATA.map((d) => {
        const d2 = d as DayData;
        return d2.fuel + d2.insurance + d2.marketing + d2.maintenance + d2.salary + d2.other;
      }));
  const maxVal = Math.max(maxRevenue, maxCost);
  const BAR_H = 120;

  return (
    <div className="overflow-x-auto">
      <div style={{ minWidth: chartData.length * 60 + 40 }}>
        {/* Y-axis labels */}
        <div className="flex">
          <div className="w-10 flex-shrink-0 flex flex-col justify-between pb-6 text-right pr-2">
            {[100, 75, 50, 25, 0].map((p) => (
              <span key={p} className="text-xs text-gray-400" style={{ fontSize: 10 }}>
                {p === 0 ? "0" : fmt((maxVal * p) / 100)}
              </span>
            ))}
          </div>
          {/* Bars */}
          <div className="flex items-end gap-1 flex-1" style={{ height: BAR_H + 24 }}>
            {chartData.map((d, i) => {
              const rev = d.revenue;
              const cost = isMonthly
                ? (d as typeof MONTHLY_DATA[0]).cost
                : (() => {
                    const dd = d as DayData;
                    return dd.fuel + dd.insurance + dd.marketing + dd.maintenance + dd.salary + dd.other;
                  })();
              const revH = Math.round((rev / maxVal) * BAR_H);
              const costH = Math.round((cost / maxVal) * BAR_H);
              const isToday = !isMonthly && (d as DayData).label === "오늘";
              const isCurrent = isMonthly && d.label.includes("현재");

              return (
                <div key={i} className="flex flex-col items-center gap-0 flex-1" style={{ minWidth: 44 }}>
                  <div className="flex items-end gap-0.5" style={{ height: BAR_H }}>
                    <div
                      title={`매출: ${fmtWon(rev)}`}
                      style={{
                        height: revH,
                        width: 16,
                        borderRadius: "3px 3px 0 0",
                        backgroundColor: isToday || isCurrent ? "#FF8A00" : "#2A7AE2",
                        cursor: "pointer",
                        transition: "opacity 0.15s",
                      }}
                    />
                    <div
                      title={`비용: ${fmtWon(cost)}`}
                      style={{
                        height: costH,
                        width: 16,
                        borderRadius: "3px 3px 0 0",
                        backgroundColor: isToday || isCurrent ? "#fbbf24" : "#93C5FD",
                        cursor: "pointer",
                        transition: "opacity 0.15s",
                      }}
                    />
                  </div>
                  <span
                    className="text-center mt-1"
                    style={{
                      fontSize: 10,
                      color: isToday || isCurrent ? "#FF8A00" : "#6B7280",
                      fontWeight: isToday || isCurrent ? 700 : 400,
                    }}
                  >
                    {d.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
        {/* Legend */}
        <div className="flex items-center gap-4 mt-2 pl-10">
          <span className="flex items-center gap-1 text-xs text-gray-500">
            <span className="inline-block w-3 h-3 rounded-sm" style={{ backgroundColor: "#2A7AE2" }} />
            매출
          </span>
          <span className="flex items-center gap-1 text-xs text-gray-500">
            <span className="inline-block w-3 h-3 rounded-sm" style={{ backgroundColor: "#93C5FD" }} />
            비용
          </span>
          <span className="flex items-center gap-1 text-xs text-gray-500">
            <span className="inline-block w-3 h-3 rounded-sm" style={{ backgroundColor: "#FF8A00" }} />
            오늘/이번달
          </span>
        </div>
      </div>
    </div>
  );
}

// ── 메인 ────────────────────────────────────────────────────────
export default function FinancePage() {
  const router = useRouter();
  const [period, setPeriod] = useState<Period>("daily");
  const [expandCost, setExpandCost] = useState(false);

  // 직접 입력된 비용 (localStorage)
  const userCosts = useCosts();
  const userCostTotal = userCosts.reduce((s, e) => s + e.amount, 0);

  // 고정비 스토어
  const { items: fixedCostItems, activeTotal: fixedActiveTotal } = useFixedCosts();

  // 카테고리별 합산
  const userCostByCategory = useMemo(() => {
    const map: Partial<Record<CostCategory, number>> = {};
    userCosts.forEach((e) => {
      map[e.category] = (map[e.category] ?? 0) + e.amount;
    });
    return map;
  }, [userCosts]);

  const stats = useMemo(() => {
    if (period === "daily") {
      const today = DAILY_DATA[DAILY_DATA.length - 1];
      const yesterday = DAILY_DATA[DAILY_DATA.length - 2];
      const totalCost = today.fuel + today.insurance + today.marketing + today.maintenance + today.salary + today.other;
      const prevCost = yesterday.fuel + yesterday.insurance + yesterday.marketing + yesterday.maintenance + yesterday.salary + yesterday.other;
      const profit = today.revenue - totalCost;
      const margin = Math.round((profit / today.revenue) * 100);
      const revenueChange = Math.round(((today.revenue - yesterday.revenue) / yesterday.revenue) * 100);
      const profitChange = Math.round(((profit - (yesterday.revenue - prevCost)) / (yesterday.revenue - prevCost)) * 100);
      return { revenue: today.revenue, cost: totalCost, profit, margin, flights: today.flights, revenueChange, profitChange, label: "오늘" };
    }
    if (period === "weekly") {
      const week = DAILY_DATA;
      const revenue = week.reduce((s, d) => s + d.revenue, 0);
      const cost = week.reduce((s, d) => s + d.fuel + d.insurance + d.marketing + d.maintenance + d.salary + d.other, 0);
      const flights = week.reduce((s, d) => s + d.flights, 0);
      const profit = revenue - cost;
      const margin = Math.round((profit / revenue) * 100);
      return { revenue, cost, profit, margin, flights, revenueChange: 8, profitChange: 11, label: "이번 주" };
    }
    if (period === "monthly") {
      const month = MONTHLY_DATA[MONTHLY_DATA.length - 1];
      const prev = MONTHLY_DATA[MONTHLY_DATA.length - 2];
      const profit = month.revenue - month.cost;
      const prevProfit = prev.revenue - prev.cost;
      const margin = Math.round((profit / month.revenue) * 100);
      const revenueChange = Math.round(((month.revenue - prev.revenue) / prev.revenue) * 100);
      const profitChange = Math.round(((profit - prevProfit) / prevProfit) * 100);
      return { revenue: month.revenue, cost: month.cost, profit, margin, flights: month.flights, revenueChange, profitChange, label: "5월 (현재)" };
    }
    // yearly
    const total = MONTHLY_DATA.reduce((s, d) => ({ revenue: s.revenue + d.revenue, cost: s.cost + d.cost, flights: s.flights + d.flights }), { revenue: 0, cost: 0, flights: 0 });
    const profit = total.revenue - total.cost;
    const margin = Math.round((profit / total.revenue) * 100);
    return { ...total, profit, margin, revenueChange: 18, profitChange: 22, label: "2025/26 시즌" };
  }, [period]);

  const todayData = DAILY_DATA[DAILY_DATA.length - 1];
  const totalCostToday = todayData.fuel + todayData.insurance + todayData.marketing + todayData.maintenance + todayData.salary + todayData.other;

  const productData = useMemo(() => {
    const src = period === "monthly" || period === "yearly"
      ? DAILY_DATA
      : period === "weekly"
      ? DAILY_DATA
      : [DAILY_DATA[DAILY_DATA.length - 1]];
    return PRODUCT_ITEMS.map((p) => ({
      ...p,
      total: src.reduce((s, d) => s + (d[p.key] as number), 0),
    }));
  }, [period]);

  const totalProductRevenue = productData.reduce((s, d) => s + d.total, 0);

  const costBreakdown = useMemo(() => {
    const src = period === "daily" ? [DAILY_DATA[DAILY_DATA.length - 1]] : DAILY_DATA;
    return COST_ITEMS.map((c) => ({
      ...c,
      // 직접 입력된 비용을 해당 카테고리에 합산
      total: src.reduce((s, d) => s + (d[c.key] as number), 0) + (userCostByCategory[c.key as CostCategory] ?? 0),
    }));
  }, [period, userCostByCategory]);

  const totalCostBreakdown = costBreakdown.reduce((s, c) => s + c.total, 0);

  const PERIOD_TABS: { key: Period; label: string }[] = [
    { key: "daily", label: "일간" },
    { key: "weekly", label: "주간" },
    { key: "monthly", label: "월간" },
    { key: "yearly", label: "시즌" },
  ];

  return (
    <div className="p-6 space-y-6" style={{ background: "#F5F7FA", minHeight: "100vh" }}>
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "#0D2B52" }}>
            장사리포트
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">매출·비용·수익 분석</p>
        </div>
        <div className="flex items-center gap-3">
          {/* 비용 입력 바로가기 */}
          <button
            onClick={() => router.push("/admin/finance/costs")}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium border border-gray-200 bg-white hover:bg-gray-50 shadow-sm"
            style={{ color: "#EF4444" }}
          >
            <Receipt size={14} />
            비용 관리
            {userCostTotal > 0 && (
              <span
                className="text-xs px-1.5 py-0.5 rounded-full font-bold"
                style={{ background: "#FEF2F2", color: "#EF4444" }}
              >
                +{userCostTotal.toLocaleString("ko-KR")}원
              </span>
            )}
          </button>
          {/* 기간 탭 */}
          <div className="flex items-center gap-1 bg-white rounded-xl p-1 shadow-sm border border-gray-100">
          {PERIOD_TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setPeriod(t.key)}
              className="px-4 py-1.5 rounded-lg text-sm font-medium transition-all"
              style={{
                background: period === t.key ? "#0D2B52" : "transparent",
                color: period === t.key ? "#fff" : "#6B7280",
              }}
            >
              {t.label}
            </button>
          ))}
          </div>
        </div>
      </div>

      {/* 직접 입력 비용 배너 */}
      {userCostTotal > 0 && (
        <div
          className="flex items-center justify-between rounded-xl px-4 py-3 border cursor-pointer hover:opacity-90"
          style={{ background: "#FEF2F2", borderColor: "#FECACA" }}
          onClick={() => router.push("/admin/finance/costs")}
        >
          <div className="flex items-center gap-2">
            <Receipt size={15} style={{ color: "#EF4444" }} />
            <span className="text-sm font-semibold" style={{ color: "#991B1B" }}>
              직접 입력 비용 {userCosts.length}건이 비용 분석에 반영되었습니다.
            </span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="font-bold" style={{ color: "#EF4444" }}>
              +{userCostTotal.toLocaleString()}원
            </span>
            <span className="text-xs text-red-300">항목 보기 →</span>
          </div>
        </div>
      )}

      {/* KPI 카드 4개 */}
      <div className="grid grid-cols-4 gap-4">
        {[
          {
            label: "총매출",
            value: fmt(stats.revenue),
            sub: `${stats.label} 기준`,
            change: stats.revenueChange,
            icon: DollarSign,
            bg: "#2A7AE2",
            light: "#EFF6FF",
          },
          {
            label: "총비용",
            value: fmt(stats.cost + fixedActiveTotal),
            sub: `비용률 ${Math.round(((stats.cost + fixedActiveTotal) / stats.revenue) * 100)}%`,
            change: -4,
            icon: BarChart2,
            bg: "#FF8A00",
            light: "#FFF7ED",
            invert: true,
          },
          {
            label: "순수익",
            value: fmt(stats.profit - fixedActiveTotal),
            sub: `마진 ${stats.revenue > 0 ? Math.round(((stats.profit - fixedActiveTotal) / stats.revenue) * 100) : 0}%`,
            change: stats.profitChange,
            icon: TrendingUp,
            bg: "#10B981",
            light: "#ECFDF5",
          },
          {
            label: "비행 횟수",
            value: `${stats.flights}건`,
            sub: `건당 ${fmt(Math.round(stats.revenue / stats.flights))}`,
            change: 6,
            icon: Layers,
            bg: "#0D2B52",
            light: "#EFF6FF",
          },
        ].map((card) => {
          const Icon = card.icon;
          const up = card.invert ? card.change < 0 : card.change > 0;
          return (
            <div key={card.label} className="rounded-2xl p-5 shadow-sm bg-white border border-gray-100">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-gray-500">{card.label}</span>
                <span
                  className="w-9 h-9 rounded-xl flex items-center justify-center"
                  style={{ background: card.light }}
                >
                  <Icon size={18} style={{ color: card.bg }} />
                </span>
              </div>
              <div className="text-2xl font-bold mb-1" style={{ color: "#0D2B52" }}>
                {card.value}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400">{card.sub}</span>
                <span
                  className="flex items-center gap-0.5 text-xs font-medium"
                  style={{ color: up ? "#10B981" : "#EF4444" }}
                >
                  {up ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
                  {Math.abs(card.change)}%
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* 차트 + 상품 분석 */}
      <div className="grid grid-cols-5 gap-4">
        {/* 매출 vs 비용 차트 */}
        <div className="col-span-3 bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold" style={{ color: "#0D2B52" }}>
              매출 vs 비용 추이
            </h2>
            <span className="text-xs text-gray-400">
              {period === "daily" ? "최근 7일" : period === "weekly" ? "이번 주 일별" : period === "monthly" ? "최근 7개월" : "2025/26 시즌"}
            </span>
          </div>
          <BarChart data={DAILY_DATA} period={period} />
        </div>

        {/* 상품별 매출 */}
        <div className="col-span-2 bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold" style={{ color: "#0D2B52" }}>
              상품별 매출
            </h2>
            <PieChart size={16} className="text-gray-400" />
          </div>

          {/* 스택 바 */}
          <div className="flex rounded-lg overflow-hidden h-5 mb-4">
            {productData.map((p) => (
              <div
                key={p.key}
                style={{
                  width: `${Math.round((p.total / totalProductRevenue) * 100)}%`,
                  backgroundColor: p.color,
                }}
                title={`${p.label}: ${fmtWon(p.total)}`}
              />
            ))}
          </div>

          {/* 상품 행 */}
          <div className="space-y-3">
            {productData.map((p) => {
              const pct = Math.round((p.total / totalProductRevenue) * 100);
              const flights = Math.round(p.total / p.price);
              return (
                <div key={p.key} className="flex items-center gap-3">
                  <span
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: p.color }}
                  />
                  <span className="text-sm text-gray-600 w-16">{p.label}</span>
                  <div className="flex-1">
                    <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${pct}%`, backgroundColor: p.color }}
                      />
                    </div>
                  </div>
                  <span className="text-xs text-gray-400 w-6 text-right">{pct}%</span>
                  <span className="text-xs font-medium text-gray-700 w-20 text-right">
                    {fmt(p.total)}
                  </span>
                  <span className="text-xs text-gray-400 w-10 text-right">{flights}건</span>
                </div>
              );
            })}
          </div>

          <div className="border-t border-gray-100 mt-4 pt-3 flex justify-between">
            <span className="text-sm text-gray-500">합계</span>
            <span className="text-sm font-bold" style={{ color: "#0D2B52" }}>
              {fmtWon(totalProductRevenue)}
            </span>
          </div>
        </div>
      </div>

      {/* 비용 분석 + 일별 매출 상세 */}
      <div className="grid grid-cols-5 gap-4">
        {/* 비용 분석 */}
        <div className="col-span-2 bg-white rounded-2xl p-5 shadow-sm border border-gray-100 space-y-4">
          <button
            className="w-full flex items-center justify-between"
            onClick={() => setExpandCost(!expandCost)}
          >
            <h2 className="font-semibold" style={{ color: "#0D2B52" }}>비용 분석</h2>
            <span className="flex items-center gap-1 text-xs text-gray-400">
              {fmtWon(totalCostBreakdown + fixedActiveTotal)}
              {expandCost ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </span>
          </button>

          {/* 고정비 / 변동비 합산 바 */}
          {(() => {
            const fixedTotal  = fixedActiveTotal;
            const variableTotal = totalCostBreakdown;
            const grandTotal  = fixedTotal + variableTotal;
            if (grandTotal === 0) return null;
            const fixedPct    = Math.round((fixedTotal  / grandTotal) * 100);
            const varPct      = 100 - fixedPct;
            return (
              <div>
                <div className="flex rounded-lg overflow-hidden h-5 mb-2">
                  <div
                    style={{ width: `${fixedPct}%`, background: "#2A7AE2" }}
                    title={`고정비: ${fmtWon(fixedTotal)}`}
                  />
                  <div
                    style={{ width: `${varPct}%`, background: "#FF8A00" }}
                    title={`변동비: ${fmtWon(variableTotal)}`}
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {/* 고정비 */}
                  <button
                    className="rounded-xl p-3 text-left hover:opacity-80 transition-opacity"
                    style={{ background: "#EFF6FF", border: "1.5px solid #BFDBFE" }}
                    onClick={() => router.push("/admin/finance/costs?tab=fixed")}
                  >
                    <div className="flex items-center gap-1.5 mb-1">
                      <Lock size={12} style={{ color: "#2A7AE2" }} />
                      <span className="text-xs font-semibold" style={{ color: "#2A7AE2" }}>고정비</span>
                      <span className="text-xs text-blue-400 ml-auto">{fixedPct}%</span>
                    </div>
                    <div className="text-base font-bold" style={{ color: "#1D4ED8" }}>{fmt(fixedTotal)}</div>
                    <div className="text-xs text-blue-400 mt-0.5">
                      {fixedCostItems.filter((i) => i.active).length}개 항목
                    </div>
                  </button>
                  {/* 변동비 */}
                  <button
                    className="rounded-xl p-3 text-left hover:opacity-80 transition-opacity"
                    style={{ background: "#FFF7ED", border: "1.5px solid #FED7AA" }}
                    onClick={() => router.push("/admin/finance/costs")}
                  >
                    <div className="flex items-center gap-1.5 mb-1">
                      <Shuffle size={12} style={{ color: "#FF8A00" }} />
                      <span className="text-xs font-semibold" style={{ color: "#FF8A00" }}>변동비</span>
                      <span className="text-xs text-orange-400 ml-auto">{varPct}%</span>
                    </div>
                    <div className="text-base font-bold" style={{ color: "#EA580C" }}>{fmt(variableTotal)}</div>
                    <div className="text-xs text-orange-400 mt-0.5">
                      {userCosts.length}건 입력
                    </div>
                  </button>
                </div>
              </div>
            );
          })()}

          {/* 카테고리별 상세 */}
          <div className="space-y-2">
            {costBreakdown.map((c) => {
              const Icon = c.icon;
              const pct = Math.round((c.total / totalCostBreakdown) * 100);
              return (
                <div key={c.key as string} className="flex items-center gap-2">
                  <span className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${c.color}18` }}>
                    <Icon size={13} style={{ color: c.color }} />
                  </span>
                  <span className="text-sm text-gray-600 flex-1">{c.label}</span>
                  <div className="w-14">
                    <div className="h-1 rounded-full bg-gray-100 overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: c.color }} />
                    </div>
                  </div>
                  <span className="text-xs text-gray-400 w-6 text-right">{pct}%</span>
                  <span className="text-xs font-medium text-gray-700 w-18 text-right">{fmt(c.total)}</span>
                </div>
              );
            })}
          </div>

          {/* 수익률 요약 */}
          <div className="rounded-xl p-3" style={{ background: "#F5F7FA" }}>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <div className="text-xs text-gray-400 mb-0.5">매출</div>
                <div className="text-sm font-bold" style={{ color: "#2A7AE2" }}>{fmt(stats.revenue)}</div>
              </div>
              <div>
                <div className="text-xs text-gray-400 mb-0.5">비용 합계</div>
                <div className="text-sm font-bold" style={{ color: "#FF8A00" }}>{fmt(stats.cost + fixedActiveTotal)}</div>
              </div>
              <div>
                <div className="text-xs text-gray-400 mb-0.5">순수익</div>
                <div className="text-sm font-bold" style={{ color: "#10B981" }}>{fmt(stats.profit - fixedActiveTotal)}</div>
              </div>
            </div>
          </div>

          {/* 고정비 관리 바로가기 */}
          <button
            onClick={() => router.push("/admin/finance/costs?tab=fixed")}
            className="w-full text-xs text-center py-2 rounded-lg border border-dashed border-blue-200 text-blue-400 hover:bg-blue-50 transition-colors"
          >
            고정비 항목 관리 →
          </button>
        </div>

        {/* 일별 매출 상세 테이블 */}
        <div className="col-span-3 bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold" style={{ color: "#0D2B52" }}>
              일별 매출 상세
            </h2>
            <button className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 border border-gray-200 rounded-lg px-3 py-1.5">
              <FileText size={13} />
              엑셀 내보내기
            </button>
          </div>

          {/* 헤더 */}
          <div
            className="grid text-xs text-gray-400 font-medium pb-2 border-b border-gray-100 mb-1"
            style={{ gridTemplateColumns: "1fr 1fr 0.8fr 0.8fr 0.8fr 0.8fr 0.8fr 0.8fr" }}
          >
            <span>날짜</span>
            <span className="text-right">매출</span>
            <span className="text-right">비행</span>
            <span className="text-right">베이직</span>
            <span className="text-right">익스트림</span>
            <span className="text-right">VIP</span>
            <span className="text-right">비용</span>
            <span className="text-right">순수익</span>
          </div>

          {/* 행 */}
          <div className="divide-y divide-gray-50">
            {[...DAILY_DATA].reverse().map((d) => {
              const cost = d.fuel + d.insurance + d.marketing + d.maintenance + d.salary + d.other;
              const profit = d.revenue - cost;
              const isToday = d.label === "오늘";
              return (
                <div
                  key={d.date}
                  className="grid py-2.5 text-sm"
                  style={{
                    gridTemplateColumns: "1fr 1fr 0.8fr 0.8fr 0.8fr 0.8fr 0.8fr 0.8fr",
                    background: isToday ? "#FFF7ED" : "transparent",
                    borderRadius: isToday ? 8 : 0,
                    padding: isToday ? "10px 8px" : "10px 0",
                    marginLeft: isToday ? -8 : 0,
                    marginRight: isToday ? -8 : 0,
                  }}
                >
                  <span className="font-medium" style={{ color: isToday ? "#FF8A00" : "#0D2B52" }}>
                    {isToday ? "오늘 (5/1)" : d.date.slice(5).replace("-", "/")}
                  </span>
                  <span className="text-right font-semibold" style={{ color: "#0D2B52" }}>
                    {fmt(d.revenue)}
                  </span>
                  <span className="text-right text-gray-500">{d.flights}건</span>
                  <span className="text-right" style={{ color: "#2A7AE2" }}>{fmt(d.basic)}</span>
                  <span className="text-right" style={{ color: "#FF8A00" }}>{fmt(d.extreme)}</span>
                  <span className="text-right" style={{ color: "#0D2B52" }}>{fmt(d.vip)}</span>
                  <span className="text-right text-gray-500">{fmt(cost)}</span>
                  <span className="text-right font-medium" style={{ color: "#10B981" }}>
                    {fmt(profit)}
                  </span>
                </div>
              );
            })}
          </div>

          {/* 합계 행 */}
          <div
            className="grid py-3 mt-2 border-t-2 border-gray-200 text-sm font-bold"
            style={{ gridTemplateColumns: "1fr 1fr 0.8fr 0.8fr 0.8fr 0.8fr 0.8fr 0.8fr" }}
          >
            <span style={{ color: "#0D2B52" }}>7일 합계</span>
            <span className="text-right" style={{ color: "#0D2B52" }}>
              {fmt(DAILY_DATA.reduce((s, d) => s + d.revenue, 0))}
            </span>
            <span className="text-right text-gray-600">
              {DAILY_DATA.reduce((s, d) => s + d.flights, 0)}건
            </span>
            <span className="text-right" style={{ color: "#2A7AE2" }}>
              {fmt(DAILY_DATA.reduce((s, d) => s + d.basic, 0))}
            </span>
            <span className="text-right" style={{ color: "#FF8A00" }}>
              {fmt(DAILY_DATA.reduce((s, d) => s + d.extreme, 0))}
            </span>
            <span className="text-right" style={{ color: "#0D2B52" }}>
              {fmt(DAILY_DATA.reduce((s, d) => s + d.vip, 0))}
            </span>
            <span className="text-right text-gray-600">
              {fmt(DAILY_DATA.reduce((s, d) => s + d.fuel + d.insurance + d.marketing + d.maintenance + d.salary + d.other, 0))}
            </span>
            <span className="text-right" style={{ color: "#10B981" }}>
              {fmt(DAILY_DATA.reduce((s, d) => s + d.revenue - (d.fuel + d.insurance + d.marketing + d.maintenance + d.salary + d.other), 0))}
            </span>
          </div>
        </div>
      </div>

      {/* 월별 누적 추이 */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold" style={{ color: "#0D2B52" }}>
            월별 누적 추이 (2025/26 시즌)
          </h2>
          <span className="text-xs text-gray-400">영업이익률 기준</span>
        </div>

        <div className="grid grid-cols-7 gap-2">
          {MONTHLY_DATA.map((m, i) => {
            const profit = m.revenue - m.cost;
            const margin = Math.round((profit / m.revenue) * 100);
            const isCurrent = m.label.includes("현재");
            return (
              <div
                key={i}
                className="rounded-xl p-3 text-center"
                style={{ background: isCurrent ? "#FFF7ED" : "#F5F7FA", border: isCurrent ? "1.5px solid #FF8A00" : "1.5px solid transparent" }}
              >
                <div
                  className="text-xs font-semibold mb-1"
                  style={{ color: isCurrent ? "#FF8A00" : "#6B7280" }}
                >
                  {m.label}
                </div>
                <div className="text-sm font-bold mb-0.5" style={{ color: "#0D2B52" }}>
                  {fmt(m.revenue)}
                </div>
                <div className="text-xs text-gray-400 mb-1">{m.flights}건</div>
                <div
                  className="text-xs font-semibold rounded-full px-1.5 py-0.5 inline-block"
                  style={{
                    background: margin >= 50 ? "#ECFDF5" : margin >= 40 ? "#FFF7ED" : "#FEF2F2",
                    color: margin >= 50 ? "#10B981" : margin >= 40 ? "#FF8A00" : "#EF4444",
                  }}
                >
                  {margin}%
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
