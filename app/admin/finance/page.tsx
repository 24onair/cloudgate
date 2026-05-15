"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  TrendingUp,
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
  Receipt,
  Lock,
  Shuffle,
} from "lucide-react";
import { useCosts, type CostCategory } from "@/lib/costStore";
import { useFixedCosts } from "@/lib/fixedCostStore";
import { useCategories } from "@/lib/categoryStore";
import { useProducts } from "@/lib/productStore";

// ── 타입 ────────────────────────────────────────────────────────
type Period = "daily" | "weekly" | "monthly" | "custom";

type ProductBucket = {
  product_id: string | null;
  name: string;
  revenue: number;
  count: number;
};

interface DailyStat {
  date: string;
  flights: number;
  revenue: number;
  products: Record<string, ProductBucket>;
  costs: Record<string, number>;
}

interface MonthlyStat {
  year: number;
  month: number;
  label: string;
  revenue: number;
  cost: number;
  flights: number;
  isCurrent: boolean;
}

// ── 숫자 포맷 ───────────────────────────────────────────────────
const fmt    = (n: number) => n.toLocaleString("ko-KR") + "원";
const fmtWon = (n: number) => n.toLocaleString("ko-KR") + "원";

// ── 비용 카테고리 아이콘 매핑 ───────────────────────────────────
const CAT_ICONS: Record<string, React.ElementType> = {
  salary: Users, fuel: Wind, insurance: ShieldCheck,
  marketing: Megaphone, maintenance: Wrench, other: Package,
};

// ── 막대 차트 ───────────────────────────────────────────────────
type ChartDatum = { label: string; revenue: number; cost: number; isCurrent: boolean };

function BarChart({ data }: { data: ChartDatum[] }) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[120px] text-sm text-gray-400">
        표시할 데이터가 없습니다
      </div>
    );
  }
  const maxRevenue = Math.max(...data.map((d) => d.revenue));
  const maxCost    = Math.max(...data.map((d) => d.cost));
  const maxVal     = Math.max(maxRevenue, maxCost, 1);
  const BAR_H = 120;

  return (
    <div className="overflow-x-auto">
      <div style={{ minWidth: data.length * 60 + 40 }}>
        <div className="flex">
          <div className="w-10 flex-shrink-0 flex flex-col justify-between pb-6 text-right pr-2">
            {[100, 75, 50, 25, 0].map((p) => (
              <span key={p} className="text-xs text-gray-400" style={{ fontSize: 10 }}>
                {p === 0 ? "0" : fmt((maxVal * p) / 100)}
              </span>
            ))}
          </div>
          <div className="flex items-end gap-1 flex-1" style={{ height: BAR_H + 24 }}>
            {data.map((d, i) => {
              const revH  = Math.round((d.revenue / maxVal) * BAR_H);
              const costH = Math.round((d.cost    / maxVal) * BAR_H);
              return (
                <div key={i} className="flex flex-col items-center gap-0 flex-1" style={{ minWidth: 44 }}>
                  <div className="flex items-end gap-0.5" style={{ height: BAR_H }}>
                    <div
                      title={`매출: ${fmtWon(d.revenue)}`}
                      style={{
                        height: revH,
                        width: 16,
                        borderRadius: "3px 3px 0 0",
                        backgroundColor: d.isCurrent ? "#FF8A00" : "#2A7AE2",
                        cursor: "pointer",
                        transition: "opacity 0.15s",
                      }}
                    />
                    <div
                      title={`비용: ${fmtWon(d.cost)}`}
                      style={{
                        height: costH,
                        width: 16,
                        borderRadius: "3px 3px 0 0",
                        backgroundColor: d.isCurrent ? "#fbbf24" : "#93C5FD",
                        cursor: "pointer",
                        transition: "opacity 0.15s",
                      }}
                    />
                  </div>
                  <span
                    className="text-center mt-1"
                    style={{
                      fontSize: 10,
                      color: d.isCurrent ? "#FF8A00" : "#6B7280",
                      fontWeight: d.isCurrent ? 700 : 400,
                    }}
                  >
                    {d.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
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
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  // null on first render (SSR/CSR-safe), set after mount to avoid hydration mismatch
  const [now, setNow] = useState<Date | null>(null);

  const [dailyData, setDailyData]     = useState<DailyStat[]>([]);
  const [monthlyData, setMonthlyData] = useState<MonthlyStat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setNow(new Date());
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  // ── 신규 API 호출 ─────────────────────────────────────────────
  useEffect(() => {
    let mounted = true;
    setLoading(true);

    const dailyParams = new URLSearchParams();
    if (period === "custom" && customStart && customEnd) {
      dailyParams.set("from", customStart);
      dailyParams.set("to",   customEnd);
    }
    const dailyUrl   = `/api/finance/stats/daily${dailyParams.toString() ? `?${dailyParams}` : ""}`;
    const monthlyUrl = `/api/finance/stats/monthly`;

    Promise.all([
      fetch(dailyUrl).then((r) => (r.ok ? r.json() : [])).catch(() => []),
      fetch(monthlyUrl).then((r) => (r.ok ? r.json() : [])).catch(() => []),
    ]).then(([daily, monthly]) => {
      if (!mounted) return;
      setDailyData(Array.isArray(daily) ? daily : []);
      setMonthlyData(Array.isArray(monthly) ? monthly : []);
      setLoading(false);
    });

    return () => { mounted = false; };
  }, [period, customStart, customEnd]);

  // 직접 입력된 비용 (DB 기반 hook)
  const userCosts = useCosts();
  const userCostTotal = userCosts.reduce((s, e) => s + e.amount, 0);

  // 고정비 스토어
  const { items: fixedCostItems, activeTotal: fixedActiveTotal } = useFixedCosts();
  const { categories } = useCategories();

  // 동적 상품
  const { products } = useProducts();

  // 카테고리별 합산 (직접 입력 변동비)
  const userCostByCategory = useMemo(() => {
    const map: Partial<Record<CostCategory, number>> = {};
    userCosts.forEach((e) => {
      map[e.category] = (map[e.category] ?? 0) + e.amount;
    });
    return map;
  }, [userCosts]);

  // ── 오늘 / 직전 데이터 식별 ────────────────────────────────────
  const todayISO = (now ?? new Date()).toISOString().slice(0, 10);
  const todayIdx = useMemo(
    () => dailyData.findIndex((d) => d.date === todayISO),
    [dailyData, todayISO],
  );
  const todayStat = todayIdx >= 0 ? dailyData[todayIdx] : (dailyData[dailyData.length - 1] ?? null);
  const prevStat  = useMemo(() => {
    if (!todayStat) return null;
    const idx = dailyData.findIndex((d) => d.date === todayStat.date);
    return idx > 0 ? dailyData[idx - 1] : null;
  }, [dailyData, todayStat]);

  const sumCosts = (costs: Record<string, number>) =>
    Object.values(costs).reduce((s, n) => s + n, 0);

  // ── KPI 통계 ─────────────────────────────────────────────────
  const stats = useMemo(() => {
    const empty = { revenue: 0, cost: 0, profit: 0, margin: 0, flights: 0, revenueChange: 0, profitChange: 0, label: "데이터 없음" };

    if (period === "daily") {
      if (!todayStat) return { ...empty, label: "오늘" };
      const cost = sumCosts(todayStat.costs);
      const profit = todayStat.revenue - cost;
      const margin = todayStat.revenue > 0 ? Math.round((profit / todayStat.revenue) * 100) : 0;
      const prevRev  = prevStat?.revenue ?? 0;
      const prevCost = prevStat ? sumCosts(prevStat.costs) : 0;
      const prevProfit = prevRev - prevCost;
      const revenueChange = prevRev > 0 ? Math.round(((todayStat.revenue - prevRev) / prevRev) * 100) : 0;
      const profitChange  = prevProfit !== 0 ? Math.round(((profit - prevProfit) / Math.abs(prevProfit)) * 100) : 0;
      return { revenue: todayStat.revenue, cost, profit, margin, flights: todayStat.flights, revenueChange, profitChange, label: "오늘" };
    }

    if (period === "weekly") {
      const revenue = dailyData.reduce((s, d) => s + d.revenue, 0);
      const cost    = dailyData.reduce((s, d) => s + sumCosts(d.costs), 0);
      const flights = dailyData.reduce((s, d) => s + d.flights, 0);
      const profit  = revenue - cost;
      const margin  = revenue > 0 ? Math.round((profit / revenue) * 100) : 0;
      return { revenue, cost, profit, margin, flights, revenueChange: 0, profitChange: 0, label: "이번 주" };
    }

    if (period === "monthly") {
      if (monthlyData.length === 0) return { ...empty, label: "이번 달" };
      const month = monthlyData.find((m) => m.isCurrent) ?? monthlyData[monthlyData.length - 1];
      const idx = monthlyData.findIndex((m) => m.year === month.year && m.month === month.month);
      const prev = idx > 0 ? monthlyData[idx - 1] : null;
      const profit     = month.revenue - month.cost;
      const margin     = month.revenue > 0 ? Math.round((profit / month.revenue) * 100) : 0;
      const prevProfit = prev ? prev.revenue - prev.cost : 0;
      const revenueChange = prev && prev.revenue > 0 ? Math.round(((month.revenue - prev.revenue) / prev.revenue) * 100) : 0;
      const profitChange  = prevProfit !== 0 ? Math.round(((profit - prevProfit) / Math.abs(prevProfit)) * 100) : 0;
      return { revenue: month.revenue, cost: month.cost, profit, margin, flights: month.flights, revenueChange, profitChange, label: `${month.month}월${month.isCurrent ? " (현재)" : ""}` };
    }

    // custom
    const total = dailyData.reduce(
      (s, d) => ({ revenue: s.revenue + d.revenue, cost: s.cost + sumCosts(d.costs), flights: s.flights + d.flights }),
      { revenue: 0, cost: 0, flights: 0 },
    );
    const profit = total.revenue - total.cost;
    const margin = total.revenue > 0 ? Math.round((profit / total.revenue) * 100) : 0;
    const customLabel = customStart && customEnd ? `${customStart} ~ ${customEnd}` : "범위 미설정";
    return { ...total, profit, margin, revenueChange: 0, profitChange: 0, label: customLabel };
  }, [period, dailyData, monthlyData, todayStat, prevStat, customStart, customEnd]);

  // ── 비용 카테고리별 ─────────────────────────────────────────────
  const costItems = useMemo(() =>
    categories.filter((c) => c.active).map((cat) => ({
      key: cat.id,
      label: cat.label,
      color: cat.color,
      icon: CAT_ICONS[cat.id] ?? Package,
    })),
  [categories]);

  const costBreakdown = useMemo(() => {
    const src: DailyStat[] = period === "daily" ? (todayStat ? [todayStat] : []) : dailyData;
    return costItems.map((c) => {
      const apiTotal = src.reduce((s, d) => s + (d.costs[c.key] ?? 0), 0);
      // userCostByCategory는 이미 costs 테이블에서 hook으로 로드되므로 기간 필터 없이 카테고리 합산을 그대로 사용
      // (중복 합산 방지: 신규 API는 같은 costs 테이블을 집계 → userCostByCategory와 합치면 이중계상)
      // → API 응답을 단일 출처로 사용
      void apiTotal;
      void userCostByCategory;
      return { ...c, total: apiTotal };
    });
  }, [period, dailyData, todayStat, costItems, userCostByCategory]);

  const totalCostBreakdown = costBreakdown.reduce((s, c) => s + c.total, 0);

  // ── 상품별 매출 (동적) ─────────────────────────────────────────
  const productData = useMemo(() => {
    const src: DailyStat[] = period === "daily" ? (todayStat ? [todayStat] : []) : dailyData;
    const agg: Record<string, ProductBucket & { color: string; sortOrder: number }> = {};

    for (const day of src) {
      for (const [key, p] of Object.entries(day.products)) {
        if (!agg[key]) {
          // productStore 색상·정렬순서 매핑
          // bookings.product_id는 UUID인 반면 productStore는 slug로 id 키잉 → 이름 비교도 fallback으로 사용
          const meta = products.find((pr) =>
            pr.id === key || pr.id === p.product_id || pr.name === p.name,
          );
          agg[key] = {
            ...p,
            revenue: 0,
            count: 0,
            color: meta?.color ?? "#6B7280",
            sortOrder: meta?.sortOrder ?? 999,
          };
        }
        agg[key].revenue += p.revenue;
        agg[key].count   += p.count;
      }
    }

    return Object.values(agg).sort((a, b) => a.sortOrder - b.sortOrder);
  }, [period, dailyData, todayStat, products]);

  const totalProductRevenue = productData.reduce((s, d) => s + d.revenue, 0);

  const PERIOD_TABS: { key: Period; label: string }[] = [
    { key: "daily",   label: "일간"   },
    { key: "weekly",  label: "주간"   },
    { key: "monthly", label: "월간"   },
    { key: "custom",  label: "범위설정" },
  ];

  // ── 기간 레이블 ─────────────────────────────────────────────────
  function getPeriodLabel() {
    if (dailyData.length === 0 && period !== "monthly") return "데이터 없음";
    if (period === "daily") {
      const d = todayStat?.date ?? dailyData[dailyData.length - 1]?.date;
      return d ? d.replace(/-/g, ".") : "—";
    }
    if (period === "weekly") {
      const first = dailyData[0]?.date.slice(5).replace("-", ".");
      const last  = dailyData[dailyData.length - 1]?.date.slice(5).replace("-", ".");
      return first && last ? `${first} ~ ${last}` : "—";
    }
    if (period === "monthly") {
      const m = monthlyData.find((m) => m.isCurrent) ?? monthlyData[monthlyData.length - 1];
      return m ? m.label : "—";
    }
    if (customStart && customEnd) return `${customStart.replace(/-/g, ".")} ~ ${customEnd.replace(/-/g, ".")}`;
    return "시작일 ~ 종료일 선택";
  }

  // ── 차트 데이터 변환 ────────────────────────────────────────────
  const chartData: ChartDatum[] = useMemo(() => {
    if (period === "monthly" || period === "custom") {
      return monthlyData.map((m) => ({
        label: m.label,
        revenue: m.revenue,
        cost: m.cost,
        isCurrent: m.isCurrent,
      }));
    }
    return dailyData.map((d) => ({
      label: d.date === todayISO ? "오늘" : d.date.slice(5).replace("-", "/"),
      revenue: d.revenue,
      cost: sumCosts(d.costs),
      isCurrent: d.date === todayISO,
    }));
  }, [period, dailyData, monthlyData, todayISO]);

  return (
    <div className="p-6 space-y-6" style={{ background: "#F5F7FA", minHeight: "100vh" }}>
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "#0D2B52" }}>
            장사리포트
          </h1>
          <div className="flex items-center gap-2 mt-0.5">
            <p className="text-sm text-gray-500">매출·비용·수익 분석</p>
            <span className="text-gray-300">·</span>
            <p className="text-sm font-medium" style={{ color: "#2A7AE2" }} suppressHydrationWarning>
              {now ? (
                <>
                  {now.toLocaleDateString("ko-KR", { month: "long", day: "numeric", weekday: "short" })}
                  {"  "}
                  {now.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}
                </>
              ) : null}
            </p>
            {loading && <span className="text-xs text-gray-400">· 불러오는 중…</span>}
          </div>
        </div>
        <div className="flex items-center gap-3">
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
          <div className="flex flex-col items-end gap-1.5">
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
            <span className="text-xs font-medium px-2" style={{ color: "#2A7AE2" }}>
              {getPeriodLabel()}
            </span>
            {period === "custom" && (
              <div className="flex items-center gap-2 bg-white rounded-xl px-3 py-2 shadow-sm border border-gray-200">
                <input
                  type="date"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                  className="text-xs border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-200"
                  style={{ color: "#0D2B52" }}
                />
                <span className="text-gray-400 text-xs">~</span>
                <input
                  type="date"
                  value={customEnd}
                  min={customStart}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  className="text-xs border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-200"
                  style={{ color: "#0D2B52" }}
                />
              </div>
            )}
          </div>
        </div>
      </div>

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
            sub: stats.revenue > 0 ? `비용률 ${Math.round(((stats.cost + fixedActiveTotal) / stats.revenue) * 100)}%` : "비용률 —",
            change: 0,
            icon: BarChart2,
            bg: "#FF8A00",
            light: "#FFF7ED",
            invert: true,
          },
          {
            label: "순수익",
            value: fmt(stats.profit - fixedActiveTotal),
            sub: stats.revenue > 0 ? `마진 ${Math.round(((stats.profit - fixedActiveTotal) / stats.revenue) * 100)}%` : "마진 —",
            change: stats.profitChange,
            icon: TrendingUp,
            bg: "#10B981",
            light: "#ECFDF5",
          },
          {
            label: "비행 횟수",
            value: `${stats.flights}건`,
            sub: stats.flights > 0 ? `건당 ${fmt(Math.round(stats.revenue / stats.flights))}` : "—",
            change: 0,
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
                {card.change !== 0 && (
                  <span
                    className="flex items-center gap-0.5 text-xs font-medium"
                    style={{ color: up ? "#10B981" : "#EF4444" }}
                  >
                    {up ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
                    {Math.abs(card.change)}%
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* 차트 + 상품 분석 */}
      <div className="grid grid-cols-5 gap-4">
        <div className="col-span-3 bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold" style={{ color: "#0D2B52" }}>
              매출 vs 비용 추이
            </h2>
            <span className="text-xs text-gray-400">
              {period === "daily" ? "최근 7일" : period === "weekly" ? "이번 주 일별" : period === "monthly" ? "최근 7개월" : "선택 범위"}
            </span>
          </div>
          <BarChart data={chartData} />
        </div>

        <div className="col-span-2 bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold" style={{ color: "#0D2B52" }}>
              상품별 매출
            </h2>
            <PieChart size={16} className="text-gray-400" />
          </div>

          {productData.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-sm text-gray-400">
              표시할 상품 매출이 없습니다
            </div>
          ) : (
            <>
              <div className="flex rounded-lg overflow-hidden h-5 mb-4">
                {productData.map((p) => (
                  <div
                    key={p.product_id ?? p.name}
                    style={{
                      width: `${Math.round((p.revenue / Math.max(totalProductRevenue, 1)) * 100)}%`,
                      backgroundColor: p.color,
                    }}
                    title={`${p.name}: ${fmtWon(p.revenue)}`}
                  />
                ))}
              </div>

              <div className="space-y-3">
                {productData.map((p) => {
                  const pct = totalProductRevenue > 0 ? Math.round((p.revenue / totalProductRevenue) * 100) : 0;
                  return (
                    <div key={p.product_id ?? p.name} className="flex items-center gap-3">
                      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: p.color }} />
                      <span className="text-sm text-gray-600 w-16 truncate" title={p.name}>{p.name}</span>
                      <div className="flex-1">
                        <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: p.color }} />
                        </div>
                      </div>
                      <span className="text-xs text-gray-400 w-6 text-right">{pct}%</span>
                      <span className="text-xs font-medium text-gray-700 w-20 text-right">{fmt(p.revenue)}</span>
                      <span className="text-xs text-gray-400 w-10 text-right">{p.count}건</span>
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
            </>
          )}
        </div>
      </div>

      {/* 비용 분석 + 일별 매출 상세 */}
      <div className="grid grid-cols-5 gap-4">
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

          {(() => {
            const fixedTotal    = fixedActiveTotal;
            const variableTotal = totalCostBreakdown;
            const grandTotal    = fixedTotal + variableTotal;
            if (grandTotal === 0) {
              return (
                <div className="text-xs text-gray-400 text-center py-4">
                  등록된 비용이 없습니다
                </div>
              );
            }
            const fixedPct = Math.round((fixedTotal / grandTotal) * 100);
            const varPct   = 100 - fixedPct;
            return (
              <div>
                <div className="flex rounded-lg overflow-hidden h-5 mb-2">
                  <div style={{ width: `${fixedPct}%`, background: "#2A7AE2" }} title={`고정비: ${fmtWon(fixedTotal)}`} />
                  <div style={{ width: `${varPct}%`, background: "#FF8A00" }} title={`변동비: ${fmtWon(variableTotal)}`} />
                </div>
                <div className="grid grid-cols-2 gap-2">
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

          <div className="space-y-2">
            {costBreakdown.filter((c) => c.total > 0).map((c) => {
              const Icon = c.icon;
              const pct = totalCostBreakdown > 0 ? Math.round((c.total / totalCostBreakdown) * 100) : 0;
              return (
                <div key={c.key} className="flex items-center gap-2">
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

          {dailyData.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-sm text-gray-400">
              {loading ? "불러오는 중…" : "표시할 매출 데이터가 없습니다"}
            </div>
          ) : (
            <>
              <div
                className="grid text-xs text-gray-400 font-medium pb-2 border-b border-gray-100 mb-1"
                style={{ gridTemplateColumns: "1fr 1fr 0.8fr 0.8fr 0.8fr" }}
              >
                <span>날짜</span>
                <span className="text-right">매출</span>
                <span className="text-right">비행</span>
                <span className="text-right">비용</span>
                <span className="text-right">순수익</span>
              </div>

              <div className="divide-y divide-gray-50">
                {[...dailyData].reverse().map((d) => {
                  const cost = sumCosts(d.costs);
                  const profit = d.revenue - cost;
                  const isToday = d.date === todayISO;
                  return (
                    <div
                      key={d.date}
                      className="grid py-2.5 text-sm"
                      style={{
                        gridTemplateColumns: "1fr 1fr 0.8fr 0.8fr 0.8fr",
                        background: isToday ? "#FFF7ED" : "transparent",
                        borderRadius: isToday ? 8 : 0,
                        padding: isToday ? "10px 8px" : "10px 0",
                        marginLeft: isToday ? -8 : 0,
                        marginRight: isToday ? -8 : 0,
                      }}
                    >
                      <span className="font-medium" style={{ color: isToday ? "#FF8A00" : "#0D2B52" }}>
                        {isToday ? `오늘 (${d.date.slice(5).replace("-", "/")})` : d.date.slice(5).replace("-", "/")}
                      </span>
                      <span className="text-right font-semibold" style={{ color: "#0D2B52" }}>
                        {fmt(d.revenue)}
                      </span>
                      <span className="text-right text-gray-500">{d.flights}건</span>
                      <span className="text-right text-gray-500">{fmt(cost)}</span>
                      <span className="text-right font-medium" style={{ color: "#10B981" }}>
                        {fmt(profit)}
                      </span>
                    </div>
                  );
                })}
              </div>

              <div
                className="grid py-3 mt-2 border-t-2 border-gray-200 text-sm font-bold"
                style={{ gridTemplateColumns: "1fr 1fr 0.8fr 0.8fr 0.8fr" }}
              >
                <span style={{ color: "#0D2B52" }}>{dailyData.length}일 합계</span>
                <span className="text-right" style={{ color: "#0D2B52" }}>
                  {fmt(dailyData.reduce((s, d) => s + d.revenue, 0))}
                </span>
                <span className="text-right text-gray-600">
                  {dailyData.reduce((s, d) => s + d.flights, 0)}건
                </span>
                <span className="text-right text-gray-600">
                  {fmt(dailyData.reduce((s, d) => s + sumCosts(d.costs), 0))}
                </span>
                <span className="text-right" style={{ color: "#10B981" }}>
                  {fmt(dailyData.reduce((s, d) => s + d.revenue - sumCosts(d.costs), 0))}
                </span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* 월별 누적 추이 */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold" style={{ color: "#0D2B52" }}>
            월별 누적 추이
          </h2>
          <span className="text-xs text-gray-400">영업이익률 기준</span>
        </div>

        {monthlyData.length === 0 ? (
          <div className="flex items-center justify-center h-24 text-sm text-gray-400">
            {loading ? "불러오는 중…" : "표시할 월별 데이터가 없습니다"}
          </div>
        ) : (
          <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${monthlyData.length}, minmax(0, 1fr))` }}>
            {monthlyData.map((m, i) => {
              const profit = m.revenue - m.cost;
              const margin = m.revenue > 0 ? Math.round((profit / m.revenue) * 100) : 0;
              return (
                <div
                  key={i}
                  className="rounded-xl p-3 text-center"
                  style={{ background: m.isCurrent ? "#FFF7ED" : "#F5F7FA", border: m.isCurrent ? "1.5px solid #FF8A00" : "1.5px solid transparent" }}
                >
                  <div className="text-xs font-semibold mb-1" style={{ color: m.isCurrent ? "#FF8A00" : "#6B7280" }}>
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
                      color:      margin >= 50 ? "#10B981" : margin >= 40 ? "#FF8A00" : "#EF4444",
                    }}
                  >
                    {margin}%
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
