"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  TrendingUp,
  Plane,
  CreditCard,
  Users,
  ArrowUpRight,
  CheckCircle2,
  Clock,
  Percent,
  Plus,
  Save,
  Trash2,
  Info,
  RefreshCw,
  CalendarClock,
  ChevronRight,
  RotateCcw,
} from "lucide-react";
import {
  useSettlement,
  updateSettlementConfig,
  setPilotOverride,
  removePilotOverride,
  usePaymentSchedule,
  updatePaymentSchedule,
  type PilotShareOverride,
  type PaymentScheduleConfig,
} from "@/lib/settlementStore";

// ─── 타입 ─────────────────────────────────────────────────────────
interface DailyRow {
  date:    string;
  flights: number;
  revenue: number;
  deposit: number;
  costs:   number;
}

interface PilotRow {
  pilot_id:       string;
  name:           string;
  flights:        number;
  revenue:        number;
  rate_per_flight:number;
  amount:         number;
  share?:         number; // 매출 분배 비율 (%) — 서버에서 계산되어 내려옴
  isOverride?:    boolean;
  year_month?:    string | null;
  settlement_status?: "calculating" | "confirmed" | "paid" | null;
  confirmed_at?:  string | null;
  paid_at?:       string | null;
  pay_method?:    "transfer" | "cash" | "other" | null;
}

interface Summary {
  revenue:     number;
  flights:     number;
  costs:       number;
  profit:      number;
  prevRevenue: number;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface CompletedBooking { id: string; booking_no: string; customer_name: string; product_name: string; flight_time: string; total_price: number; pilots: { name: string } | null; }

// ─── 날짜 헬퍼 ──────────────────────────────────────────────────
function todayStr() { return new Date().toISOString().slice(0, 10); }
function currentPeriod() { return new Date().toISOString().slice(0, 7); }

function periodRange(period: string): { from: string; to: string; label: string } {
  const today = todayStr();
  if (period === "today") return { from: today, to: today, label: today };
  if (period === "week") {
    const d = new Date();
    d.setDate(d.getDate() - d.getDay() + 1); // 이번 주 월요일
    const from = d.toISOString().slice(0, 10);
    return { from, to: today, label: `${from.slice(5)} ~ ${today.slice(5)}` };
  }
  // month
  const p = currentPeriod();
  const from = `${p}-01`;
  return { from, to: today, label: `${p.replace("-", "년 ")}월` };
}

// ─── 막대 차트 ──────────────────────────────────────────────────
function RevenueChart({ data, period }: { data: DailyRow[]; period: string }) {
  const maxRevenue = Math.max(...data.map((d) => d.revenue), 1);
  const { label } = periodRange(period);

  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="font-semibold text-gray-900">매출 추이</h3>
          <p className="text-xs text-gray-400 mt-0.5">{label}</p>
        </div>
        <div className="flex items-center gap-4 text-xs text-gray-400">
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-sm inline-block" style={{ backgroundColor: "#2A7AE2" }} />매출
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-sm inline-block" style={{ backgroundColor: "#FCA5A5" }} />비용
          </span>
        </div>
      </div>

      {data.length === 0 ? (
        <div className="h-36 flex items-center justify-center text-sm text-gray-400">데이터 없음</div>
      ) : (
        <>
          <div className="flex items-end gap-2 h-36 mb-1">
            {data.map((d) => {
              const rH = d.revenue ? Math.round((d.revenue / maxRevenue) * 128) : 0;
              const cH = d.costs   ? Math.round((d.costs   / maxRevenue) * 128) : 0;
              const isToday = d.date === todayStr();
              return (
                <div key={d.date} className="flex-1 flex items-end gap-0.5 h-full">
                  <div className="flex-1 rounded-t-md transition-all" title={`매출: ${d.revenue.toLocaleString()}원`}
                    style={{ height: rH || 4, backgroundColor: isToday ? "#FF8A00" : "#2A7AE2", opacity: d.revenue === 0 ? 0.15 : 1 }} />
                  <div className="flex-1 rounded-t-md" title={`비용: ${d.costs.toLocaleString()}원`}
                    style={{ height: cH || 4, backgroundColor: "#FCA5A5", opacity: d.costs === 0 ? 0.15 : 1 }} />
                </div>
              );
            })}
          </div>
          <div className="flex gap-2">
            {data.map((d) => {
              const isToday = d.date === todayStr();
              const label = d.date.slice(5).replace("-", "/");
              return (
                <div key={d.date} className="flex-1 flex flex-col items-center gap-0.5 pt-1">
                  {d.revenue > 0 && (
                    <p className="text-[10px] font-semibold leading-tight" style={{ color: isToday ? "#FF8A00" : "#2A7AE2" }}>
                      {Math.round(d.revenue / 10000)}만
                    </p>
                  )}
                  <p className="text-[10px] text-gray-400">{label}</p>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

// ─── 분배 비율 관리 카드 (localStorage 기반 유지) ─────────────────
function SplitRatioCard({ pilots }: { pilots: PilotRow[] }) {
  const { cfg, overrides } = useSettlement();
  const [draft, setDraft]   = useState(cfg.defaultPilotShare);
  const [dirty, setDirty]   = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [newOverride, setNewOverride] = useState<PilotShareOverride>({ pilotId: "", pilotShare: cfg.defaultPilotShare, reason: "" });

  useEffect(() => { if (!dirty) setDraft(cfg.defaultPilotShare); }, [cfg.defaultPilotShare, dirty]);

  const overrideList   = Object.values(overrides);
  const availablePilots = pilots.filter((p) => !overrides[p.pilot_id] && p.pilot_id !== "unassigned");

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-4">
      <div className="flex items-center gap-2 mb-4">
        <Percent className="w-4 h-4" style={{ color: "#2A7AE2" }} />
        <h3 className="font-semibold text-gray-900">분배 비율 관리</h3>
        <span className="text-xs text-gray-400">파일럿 ↔ 회사 매출 분배</span>
      </div>

      <div className="rounded-xl border border-gray-100 p-4 mb-4" style={{ backgroundColor: "#F8FAFC" }}>
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-bold text-gray-700">기본 분배 비율 (전체 일괄)</p>
          {dirty && (
            <button onClick={() => { updateSettlementConfig({ defaultPilotShare: draft }); setDirty(false); }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white"
              style={{ backgroundColor: "#0D2B52" }}>
              <Save className="w-3.5 h-3.5" /> 저장
            </button>
          )}
        </div>
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <input type="range" min={0} max={100} value={draft}
              onChange={(e) => { setDraft(Number(e.target.value)); setDirty(true); }} className="w-full" />
            <div className="flex justify-between text-[10px] text-gray-400 mt-0.5">
              <span>회사 100%</span><span>파일럿 100%</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input type="number" min={0} max={100} value={draft}
              onChange={(e) => { setDraft(Math.max(0, Math.min(100, Number(e.target.value) || 0))); setDirty(true); }}
              className="w-16 border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-center font-bold outline-none" />
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

      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-bold text-gray-700">예외 적용 파일럿 <span className="text-xs font-normal text-gray-400">{overrideList.length}명</span></p>
          {availablePilots.length > 0 && !showAdd && (
            <button onClick={() => { setNewOverride({ pilotId: availablePilots[0].pilot_id, pilotShare: cfg.defaultPilotShare, reason: "" }); setShowAdd(true); }}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium text-white" style={{ backgroundColor: "#2A7AE2" }}>
              <Plus className="w-3 h-3" /> 추가
            </button>
          )}
        </div>
        {overrideList.length === 0 && !showAdd && (
          <p className="text-xs text-gray-400 px-3 py-3 rounded-lg bg-gray-50 text-center">모든 파일럿이 기본 비율로 정산됩니다</p>
        )}
        {overrideList.map((o) => {
          const pilot = pilots.find((p) => p.pilot_id === o.pilotId);
          if (!pilot) return null;
          return (
            <div key={o.pilotId} className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-amber-100 bg-amber-50 mb-2">
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0" style={{ backgroundColor: "#0D2B52" }}>
                {pilot.name[0]}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800">{pilot.name}</p>
                {o.reason && <p className="text-[10px] text-gray-500 truncate">{o.reason}</p>}
              </div>
              <div className="flex items-center gap-1 text-sm">
                <span className="font-bold" style={{ color: "#2A7AE2" }}>파일럿 {o.pilotShare}%</span>
                <span className="text-gray-300">/</span>
                <span className="font-bold" style={{ color: "#FF8A00" }}>회사 {100 - o.pilotShare}%</span>
              </div>
              <input type="number" min={0} max={100} value={o.pilotShare}
                onChange={(e) => setPilotOverride({ ...o, pilotShare: Math.max(0, Math.min(100, Number(e.target.value) || 0)) })}
                className="w-14 border border-gray-200 rounded-lg px-2 py-1 text-xs text-center bg-white" />
              <button onClick={() => removePilotOverride(o.pilotId)} className="p-1.5 rounded-lg hover:bg-red-100" title="기본 비율로 되돌리기">
                <Trash2 className="w-3.5 h-3.5 text-red-500" />
              </button>
            </div>
          );
        })}
        {showAdd && availablePilots.length > 0 && (
          <div className="rounded-xl border-2 border-blue-200 p-3 bg-blue-50">
            <div className="grid grid-cols-2 gap-2 mb-2">
              <select value={newOverride.pilotId} onChange={(e) => setNewOverride({ ...newOverride, pilotId: e.target.value })}
                className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm bg-white">
                {availablePilots.map((p) => <option key={p.pilot_id} value={p.pilot_id}>{p.name}</option>)}
              </select>
              <div className="flex items-center gap-2">
                <input type="number" min={0} max={100} value={newOverride.pilotShare}
                  onChange={(e) => setNewOverride({ ...newOverride, pilotShare: Math.max(0, Math.min(100, Number(e.target.value) || 0)) })}
                  className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-center bg-white" />
                <span className="text-sm text-gray-500">%</span>
              </div>
            </div>
            <input value={newOverride.reason ?? ""} onChange={(e) => setNewOverride({ ...newOverride, reason: e.target.value })}
              placeholder="사유 (선택)" maxLength={40}
              className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm bg-white mb-2" />
            <div className="flex gap-2">
              <button onClick={() => setShowAdd(false)} className="flex-1 py-1.5 rounded-lg text-xs font-medium border border-gray-200 bg-white">취소</button>
              <button onClick={() => { if (newOverride.pilotId) { setPilotOverride(newOverride); setShowAdd(false); } }}
                className="flex-1 py-1.5 rounded-lg text-xs font-bold text-white" style={{ backgroundColor: "#0D2B52" }}>저장</button>
            </div>
          </div>
        )}
      </div>

      <div className="rounded-lg bg-gray-50 px-3 py-2 mt-3 text-[11px] text-gray-500 flex items-start gap-1.5">
        <Info className="w-3 h-3 mt-0.5 flex-shrink-0" />
        <span>비행 1건의 매출 = 파일럿 정산 + 회사 매출. 예외 적용된 파일럿은 별도 비율로 자동 계산됩니다.</span>
      </div>
    </div>
  );
}

// ─── 지급 예정일 설정 카드 ─────────────────────────────────────────
const KR_DOW_LABELS = ["일", "월", "화", "수", "목", "금", "토"];
const MONTHLY_QUICK = [5, 10, 15, 20, 25, 31]; // 31 = 말일

function PaymentScheduleCard() {
  const schedule = usePaymentSchedule();
  const [draft, setDraft] = useState<PaymentScheduleConfig>(schedule);
  const [dirty, setDirty] = useState(false);

  useEffect(() => { if (!dirty) setDraft(schedule); }, [schedule, dirty]);

  function patch(partial: Partial<PaymentScheduleConfig>) {
    setDraft((prev) => ({ ...prev, ...partial }));
    setDirty(true);
  }

  async function handleSave() {
    await updatePaymentSchedule(draft);
    setDirty(false);
  }

  const exampleMonth = "5월";
  const exampleNextMonth = "6월";
  const previewText = draft.type === "weekly"
    ? `${exampleMonth} 각 주 비행 → 다음 주 ${KR_DOW_LABELS[draft.weeklyDow]}요일에 지급`
    : draft.monthlyDay >= 31
      ? `${exampleMonth} 비행 → ${exampleNextMonth} 말일에 지급`
      : `${exampleMonth} 비행 → ${exampleNextMonth} ${draft.monthlyDay}일에 지급`;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <CalendarClock className="w-4 h-4" style={{ color: "#2A7AE2" }} />
          <h3 className="font-semibold text-gray-900">지급 예정일 설정</h3>
          <span className="text-xs text-gray-400">파일럿 포털 정산 화면에 표시</span>
        </div>
        {dirty && (
          <button
            onClick={handleSave}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white"
            style={{ backgroundColor: "#0D2B52" }}
          >
            <Save className="w-3.5 h-3.5" /> 저장
          </button>
        )}
      </div>

      {/* 월 지급 / 주 지급 토글 */}
      <div className="flex gap-2 mb-5">
        {(["monthly", "weekly"] as const).map((t) => (
          <button
            key={t}
            onClick={() => patch({ type: t })}
            className="flex-1 py-2.5 rounded-xl text-sm font-bold border-2 transition-all"
            style={draft.type === t
              ? { backgroundColor: "#0D2B52", borderColor: "#0D2B52", color: "white" }
              : { backgroundColor: "white", borderColor: "#E5E7EB", color: "#6B7280" }}
          >
            {t === "monthly" ? "📅 월 지급" : "📆 주 지급"}
          </button>
        ))}
      </div>

      {draft.type === "monthly" ? (
        /* ── 월 지급: 다음달 N일 ───────────────────────── */
        <div className="rounded-xl border border-gray-100 p-4" style={{ backgroundColor: "#F8FAFC" }}>
          <p className="text-sm font-semibold text-gray-700 mb-3">다음달 몇 일에 지급할까요?</p>
          <div className="grid grid-cols-6 gap-2 mb-3">
            {MONTHLY_QUICK.map((d) => (
              <button
                key={d}
                onClick={() => patch({ monthlyDay: d })}
                className="py-2 rounded-lg text-xs font-bold border-2 transition-all"
                style={draft.monthlyDay === d
                  ? { backgroundColor: "#EEF4FD", borderColor: "#2A7AE2", color: "#2A7AE2" }
                  : { backgroundColor: "white", borderColor: "#E5E7EB", color: "#6B7280" }}
              >
                {d === 31 ? "말일" : `${d}일`}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">직접 입력</span>
            <input
              type="number" min={1} max={28} value={draft.monthlyDay >= 31 ? "" : draft.monthlyDay}
              placeholder="1~28"
              onChange={(e) => {
                const v = Math.max(1, Math.min(28, Number(e.target.value) || 1));
                patch({ monthlyDay: v });
              }}
              className="w-20 border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-center outline-none"
            />
            <span className="text-xs text-gray-400">일 (1~28, 월말 안전)</span>
          </div>
        </div>
      ) : (
        /* ── 주 지급: 매주 N요일 ────────────────────────── */
        <div className="rounded-xl border border-gray-100 p-4" style={{ backgroundColor: "#F8FAFC" }}>
          <p className="text-sm font-semibold text-gray-700 mb-3">매주 무슨 요일에 지급할까요?</p>
          <div className="grid grid-cols-7 gap-1.5">
            {KR_DOW_LABELS.map((label, dow) => {
              const isWknd = dow === 0 || dow === 6;
              const isSelected = draft.weeklyDow === dow;
              return (
                <button
                  key={dow}
                  onClick={() => patch({ weeklyDow: dow })}
                  className="py-3 rounded-xl text-xs font-bold border-2 transition-all flex flex-col items-center gap-0.5"
                  style={isSelected
                    ? { backgroundColor: "#EEF4FD", borderColor: "#2A7AE2", color: "#2A7AE2" }
                    : { backgroundColor: "white", borderColor: "#E5E7EB", color: isWknd ? "#DC2626" : "#6B7280" }}
                >
                  {label}
                  <span className="text-[9px] font-normal opacity-60">요일</span>
                </button>
              );
            })}
          </div>
          <div className="mt-3 rounded-lg bg-amber-50 border border-amber-100 px-3 py-2 text-xs text-amber-700 flex items-start gap-1.5">
            <Info className="w-3 h-3 mt-0.5 flex-shrink-0" />
            <span>주 지급은 이번 달 마지막 날 이후 첫 번째 해당 요일에 지급됩니다.</span>
          </div>
        </div>
      )}

      {/* 미리보기 */}
      <div className="mt-3 rounded-lg px-3 py-2 text-[11px] text-gray-500 flex items-start gap-1.5" style={{ backgroundColor: "#F0F9FF", border: "1px solid #BAE6FD" }}>
        <CalendarClock className="w-3 h-3 mt-0.5 flex-shrink-0 text-blue-400" />
        <span>{previewText}</span>
      </div>
    </div>
  );
}

// ─── 메인 ────────────────────────────────────────────────────────
const PERIOD_TABS = [
  { label: "오늘",    value: "today" },
  { label: "이번 주", value: "week"  },
  { label: "이번 달", value: "month" },
];

export default function SettlementPage() {
  const router = useRouter();
  const [period, setPeriod] = useState("week");
  const [daily,   setDaily]   = useState<DailyRow[]>([]);
  const [pilots,  setPilots]  = useState<PilotRow[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [todayCompleted, setTodayCompleted] = useState<CompletedBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyPilotId, setBusyPilotId] = useState<string | null>(null);
  const [batchBusy, setBatchBusy] = useState<"confirm" | "pay" | null>(null);
  const [toast, setToast] = useState<{ msg: string; tone: "ok" | "err" } | null>(null);

  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);

  const { from, to, label } = useMemo(() => periodRange(period), [period]);
  const p = useMemo(() => currentPeriod(), []);
  // 단일 월(이번 달) 모드일 때만 정산 확정/지급 액션을 노출 (월 단위 정산이 원칙)
  const isMonthMode = period === "month";

  // ── 분배 비율 (settlementStore — localStorage) ──
  const { cfg, overrides } = useSettlement();

  // ── 서버 응답을 우선시하되, 슬라이더 즉시 반영을 위한 낙관적 fallback ──
  // 서버가 share/amount를 이미 계산해 내려보냄. 분배율 슬라이더를 막 움직였을 때만
  // 서버 갱신 전 값을 클라이언트에서 다시 계산해 표시한다.
  const computedPilots: PilotRow[] = useMemo(() => {
    return pilots.map((pilot) => {
      // 서버 share가 클라이언트 store와 일치하면 서버값 그대로 사용
      const override = overrides[pilot.pilot_id];
      const clientShare = override ? override.pilotShare : cfg.defaultPilotShare;
      const serverShare = pilot.share;
      if (serverShare !== undefined && serverShare === clientShare) {
        return pilot;
      }
      // 슬라이더 변경 직후: 클라이언트 store 기준으로 재계산
      return {
        ...pilot,
        share: clientShare,
        amount: Math.round((pilot.revenue * clientShare) / 100),
      };
    });
  }, [pilots, cfg, overrides]);

  // 토스트 자동 소멸
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2500);
    return () => clearTimeout(t);
  }, [toast]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [dRes, pRes, sRes, bRes] = await Promise.all([
        fetch(`/api/settlement?type=daily&from=${from}&to=${to}`),
        fetch(`/api/settlement?type=pilots&from=${from}&to=${to}`),
        fetch(`/api/settlement?type=summary&period=${p}`),
        fetch(`/api/bookings?date=${todayStr()}&status=completed`),
      ]);
      if (dRes.ok) setDaily(await dRes.json());
      if (pRes.ok) setPilots(await pRes.json());
      if (sRes.ok) setSummary(await sRes.json());
      if (bRes.ok) setTodayCompleted(await bRes.json());
    } finally {
      setLoading(false);
    }
  }, [from, to, p]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── 정산 상태 전환 액션 ──
  const callSettlementAction = useCallback(async (
    action: "confirm" | "pay" | "revert",
    target: { pilotId?: string; pilotIds?: string[]; payMethod?: string },
  ): Promise<{ ok: boolean; results: { pilot_id: string; ok: boolean; error?: string }[] }> => {
    const yearMonth = p; // 이번 달
    const body: Record<string, unknown> = { action, year_month: yearMonth };
    if (target.pilotIds) body.pilot_ids = target.pilotIds;
    else if (target.pilotId) body.pilot_id = target.pilotId;
    if (target.payMethod) body.pay_method = target.payMethod;

    const res = await fetch("/api/settlement", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error ?? `요청 실패 (${res.status})`);
    }
    return res.json();
  }, [p]);

  const handleSingleAction = useCallback(async (pilot: PilotRow, action: "confirm" | "pay" | "revert") => {
    if (!isMonthMode) {
      setToast({ msg: "정산은 '이번 달' 모드에서만 가능합니다", tone: "err" });
      return;
    }
    const verbMap = { confirm: "확정", pay: "지급 완료", revert: "되돌리기" };
    const msg = `${pilot.name} 파일럿의 ${p} 정산을 ${verbMap[action]}하시겠습니까?`;
    if (!window.confirm(msg)) return;
    setBusyPilotId(pilot.pilot_id);
    try {
      const r = await callSettlementAction(action, { pilotId: pilot.pilot_id });
      const failed = r.results.filter((x) => !x.ok);
      if (failed.length > 0) {
        setToast({ msg: failed[0].error ?? "처리 실패", tone: "err" });
      } else {
        setToast({ msg: `${pilot.name}: ${verbMap[action]} 완료`, tone: "ok" });
      }
      await fetchData();
    } catch (e) {
      setToast({ msg: (e as Error).message, tone: "err" });
    } finally {
      setBusyPilotId(null);
    }
  }, [callSettlementAction, fetchData, p, isMonthMode]);

  const handleBatchAction = useCallback(async (action: "confirm" | "pay") => {
    if (!isMonthMode) {
      setToast({ msg: "정산은 '이번 달' 모드에서만 가능합니다", tone: "err" });
      return;
    }
    const targets = action === "confirm"
      ? computedPilots.filter((x) => x.settlement_status !== "confirmed" && x.settlement_status !== "paid")
      : computedPilots.filter((x) => x.settlement_status === "confirmed");
    if (targets.length === 0) {
      setToast({ msg: action === "confirm" ? "확정 가능한 파일럿이 없습니다" : "지급 가능한 파일럿이 없습니다", tone: "err" });
      return;
    }
    const verb = action === "confirm" ? "확정" : "지급 완료";
    if (!window.confirm(`${targets.length}명 파일럿의 ${p} 정산을 일괄 ${verb}하시겠습니까?\n\n대상: ${targets.map((t) => t.name).join(", ")}`)) return;
    setBatchBusy(action);
    try {
      const r = await callSettlementAction(action, { pilotIds: targets.map((t) => t.pilot_id) });
      const okCount = r.results.filter((x) => x.ok).length;
      const failCount = r.results.length - okCount;
      setToast({
        msg: failCount === 0
          ? `${okCount}명 ${verb} 완료`
          : `${okCount}명 성공, ${failCount}명 실패`,
        tone: failCount === 0 ? "ok" : "err",
      });
      await fetchData();
    } catch (e) {
      setToast({ msg: (e as Error).message, tone: "err" });
    } finally {
      setBatchBusy(null);
    }
  }, [callSettlementAction, computedPilots, fetchData, p, isMonthMode]);

  // ── KPI 계산 ──
  const totalRevenue  = daily.reduce((s, d) => s + d.revenue, 0);
  const totalFlights  = daily.reduce((s, d) => s + d.flights, 0);
  // totalPilotFee: 매출 분배율 기준 (건당 단가 아님)
  const totalPilotFee = computedPilots.reduce((s, p) => s + p.amount, 0);
  const totalCosts    = daily.reduce((s, d) => s + d.costs, 0);
  const netProfit     = totalRevenue - totalPilotFee - totalCosts;

  const prevRevenue = summary?.prevRevenue ?? 0;
  const revenueChange = prevRevenue > 0 ? Math.round(((totalRevenue - prevRevenue) / prevRevenue) * 100) : null;

  const nowStr = now
    ? `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, "0")}.${String(now.getDate()).padStart(2, "0")} ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`
    : "";

  return (
    <div className="p-6 max-w-7xl">

      {/* 헤더 */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-baseline gap-3">
            <h1 className="text-2xl font-bold" style={{ color: "#0D2B52" }}>계산대</h1>
            <span className="text-sm font-medium" style={{ color: "#2A7AE2" }} suppressHydrationWarning>{nowStr}</span>
          </div>
          <p className="text-sm text-gray-400 mt-0.5">매출 & 정산 현황 · {label}</p>
        </div>
        <div className="flex items-center gap-2">
          {/* 기간 탭 */}
          <div className="flex gap-1 bg-white rounded-xl p-1 shadow-sm border border-gray-100">
            {PERIOD_TABS.map((tab) => (
              <button key={tab.value} onClick={() => setPeriod(tab.value)}
                className="px-4 py-1.5 rounded-lg text-sm font-medium transition-all"
                style={period === tab.value ? { backgroundColor: "#0D2B52", color: "white" } : { color: "#6B7280" }}>
                {tab.label}
              </button>
            ))}
          </div>
          <button onClick={fetchData} className="p-2 rounded-xl bg-white border border-gray-100 shadow-sm hover:bg-gray-50">
            <RefreshCw className={`w-4 h-4 text-gray-400 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* KPI 카드 */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {/* 총 매출 */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-gray-400 mb-1">총 매출</p>
              <p className="text-2xl font-bold" style={{ color: "#0D2B52" }}>
                {loading ? "—" : totalRevenue.toLocaleString()}
                <span className="text-sm font-normal text-gray-400 ml-1">원</span>
              </p>
            </div>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: "#EEF4FD" }}>
              <TrendingUp className="w-4 h-4" style={{ color: "#2A7AE2" }} />
            </div>
          </div>
          {revenueChange !== null && (
            <div className="flex items-center gap-1 mt-3 text-xs" style={{ color: revenueChange >= 0 ? "#15803D" : "#DC2626" }}>
              <ArrowUpRight className="w-3 h-3" style={{ transform: revenueChange < 0 ? "rotate(90deg)" : "none" }} />
              <span>전월 대비 {revenueChange >= 0 ? "+" : ""}{revenueChange}%</span>
            </div>
          )}
        </div>

        {/* 완료 비행 */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-gray-400 mb-1">완료 비행</p>
              <p className="text-2xl font-bold" style={{ color: "#0D2B52" }}>
                {loading ? "—" : totalFlights}
                <span className="text-sm font-normal text-gray-400 ml-1">건</span>
              </p>
              <p className="text-xs text-gray-500 mt-1">
                평균 {totalFlights > 0 ? Math.round(totalRevenue / totalFlights).toLocaleString() : 0}원/건
              </p>
            </div>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: "#FFF3E6" }}>
              <Plane className="w-4 h-4" style={{ color: "#FF8A00" }} />
            </div>
          </div>
        </div>

        {/* 파일럿 정산 */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-gray-400 mb-1">파일럿 정산</p>
              <p className="text-2xl font-bold" style={{ color: "#0D2B52" }}>
                {loading ? "—" : totalPilotFee.toLocaleString()}
                <span className="text-sm font-normal text-gray-400 ml-1">원</span>
              </p>
            </div>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: "#F3F4F6" }}>
              <Users className="w-4 h-4 text-gray-500" />
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-3">
            매출 대비 {totalRevenue > 0 ? Math.round((totalPilotFee / totalRevenue) * 100) : 0}%
          </p>
        </div>

        {/* 순수익 */}
        <div className="rounded-2xl p-5 shadow-sm border" style={{ backgroundColor: "#0D2B52", borderColor: "#0D2B52" }}>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs mb-1" style={{ color: "rgba(255,255,255,0.6)" }}>순수익 추정</p>
              <p className="text-2xl font-bold text-white">
                {loading ? "—" : netProfit.toLocaleString()}
                <span className="text-sm font-normal ml-1" style={{ color: "rgba(255,255,255,0.6)" }}>원</span>
              </p>
            </div>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: "rgba(255,255,255,0.15)" }}>
              <CreditCard className="w-4 h-4 text-white" />
            </div>
          </div>
          <p className="text-xs mt-3" style={{ color: "rgba(255,255,255,0.5)" }}>매출 - 파일럿 정산 - 비용</p>
        </div>
      </div>

      {/* 차트 */}
      <div className="mb-6">
        <RevenueChart data={daily} period={period} />
      </div>

      {/* 분배 비율 관리 */}
      <SplitRatioCard pilots={computedPilots} />

      {/* 지급 예정일 설정 */}
      <PaymentScheduleCard />

      {/* 파일럿 정산 + 오늘 완료 내역 */}
      <div className="grid grid-cols-2 gap-4">

        {/* 파일럿 정산 */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50 gap-2">
            <div className="min-w-0">
              <h3 className="font-semibold text-gray-900">파일럿 정산 현황</h3>
              <p className="text-xs text-gray-400 truncate">
                {label}
                {!isMonthMode && <span className="text-amber-600 ml-1">· 정산 액션은 &lsquo;이번 달&rsquo;에서만</span>}
              </p>
            </div>
            {isMonthMode && computedPilots.length > 0 && (
              <div className="flex gap-1 flex-shrink-0">
                <button
                  onClick={() => handleBatchAction("confirm")}
                  disabled={batchBusy !== null}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold text-white disabled:opacity-50"
                  style={{ backgroundColor: "#0D2B52" }}
                  title="확정 가능한 파일럿 일괄 확정"
                >
                  {batchBusy === "confirm" ? "처리중…" : "전체 확정"}
                </button>
                <button
                  onClick={() => handleBatchAction("pay")}
                  disabled={batchBusy !== null}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold text-white disabled:opacity-50"
                  style={{ backgroundColor: "#15803D" }}
                  title="확정된 파일럿 일괄 지급"
                >
                  {batchBusy === "pay" ? "처리중…" : "전체 지급"}
                </button>
              </div>
            )}
          </div>

          <div className="grid px-5 py-2.5 text-xs font-semibold text-gray-400 border-b border-gray-50"
            style={{ gridTemplateColumns: "1.4fr 0.5fr 0.5fr 0.9fr 1.2fr" }}>
            <span>파일럿</span>
            <span className="text-right">건수</span>
            <span className="text-right">비율</span>
            <span className="text-right">정산액</span>
            <span className="text-right">상태/액션</span>
          </div>

          {loading ? (
            <div className="px-5 py-8 text-center text-sm text-gray-400">불러오는 중…</div>
          ) : computedPilots.length === 0 ? (
            <div className="px-5 py-8 text-center text-sm text-gray-400">정산 데이터 없음</div>
          ) : computedPilots.map((pilot) => {
            const status = pilot.settlement_status;
            const isConfirmed = status === "confirmed";
            const isPaid      = status === "paid";
            const isBusy      = busyPilotId === pilot.pilot_id;
            return (
              <div key={pilot.pilot_id}
                className="grid items-center px-5 py-3.5 border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors cursor-pointer"
                style={{ gridTemplateColumns: "1.4fr 0.5fr 0.5fr 0.9fr 1.2fr" }}
                onClick={() => router.push(`/admin/settlement/pilot/${pilot.pilot_id}?period=${p}`)}
              >
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                    style={{ backgroundColor: "#0D2B52" }}>{pilot.name[0]}</div>
                  <span className="text-sm font-medium text-gray-800 truncate">{pilot.name}</span>
                  {pilot.isOverride && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 font-medium">예외</span>
                  )}
                </div>
                <span className="text-sm text-gray-600 text-right">{pilot.flights}건</span>
                <span className="text-sm font-semibold text-right" style={{ color: "#2A7AE2" }}>{pilot.share ?? cfg.defaultPilotShare}%</span>
                <span className="text-sm font-semibold text-right" style={{ color: "#0D2B52" }}>{pilot.amount.toLocaleString()}원</span>
                <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                  {!isMonthMode ? (
                    <ChevronRight className="w-4 h-4 text-gray-300" />
                  ) : isPaid ? (
                    <>
                      <span className="text-[10px] px-2 py-1 rounded font-bold" style={{ backgroundColor: "#DCFCE7", color: "#15803D" }}>
                        ✓ 지급완료
                      </span>
                      <button onClick={() => handleSingleAction(pilot, "revert")} disabled={isBusy}
                        className="p-1 rounded hover:bg-gray-100 disabled:opacity-50" title="되돌리기">
                        <RotateCcw className="w-3.5 h-3.5 text-gray-400" />
                      </button>
                    </>
                  ) : isConfirmed ? (
                    <>
                      <span className="text-[10px] px-2 py-1 rounded font-bold" style={{ backgroundColor: "#DBEAFE", color: "#1D4ED8" }}>
                        확정
                      </span>
                      <button onClick={() => handleSingleAction(pilot, "pay")} disabled={isBusy}
                        className="px-2 py-1 rounded text-[10px] font-bold text-white disabled:opacity-50"
                        style={{ backgroundColor: "#15803D" }}>
                        {isBusy ? "..." : "지급"}
                      </button>
                      <button onClick={() => handleSingleAction(pilot, "revert")} disabled={isBusy}
                        className="p-1 rounded hover:bg-gray-100 disabled:opacity-50" title="확정 취소">
                        <RotateCcw className="w-3.5 h-3.5 text-gray-400" />
                      </button>
                    </>
                  ) : (
                    <button onClick={() => handleSingleAction(pilot, "confirm")} disabled={isBusy}
                      className="px-2.5 py-1 rounded text-[10px] font-bold text-white disabled:opacity-50"
                      style={{ backgroundColor: "#0D2B52" }}>
                      {isBusy ? "..." : "확정"}
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          {computedPilots.length > 0 && (
            <div className="grid px-5 py-3.5 border-t-2 border-gray-100"
              style={{ gridTemplateColumns: "1.4fr 0.5fr 0.5fr 0.9fr 1.2fr" }}>
              <span className="text-sm font-semibold text-gray-700">합계</span>
              <span className="text-sm font-semibold text-gray-700 text-right">
                {computedPilots.reduce((s, p) => s + p.flights, 0)}건
              </span>
              <span />
              <span className="text-sm font-bold text-right" style={{ color: "#0D2B52" }}>
                {totalPilotFee.toLocaleString()}원
              </span>
              <span />
            </div>
          )}
        </div>

        {/* 오늘 완료 내역 */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
            <div>
              <h3 className="font-semibold text-gray-900">오늘 완료 내역</h3>
              <p className="text-xs text-gray-400">{todayStr()}</p>
            </div>
            <div className="flex items-center gap-1 text-xs" style={{ color: "#2A7AE2" }}>
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{todayCompleted.length}건 완료</span>
            </div>
          </div>

          {loading ? (
            <div className="px-5 py-8 text-center text-sm text-gray-400">불러오는 중…</div>
          ) : todayCompleted.length === 0 ? (
            <div className="px-5 py-8 text-center text-sm text-gray-400">오늘 완료된 비행이 없습니다</div>
          ) : todayCompleted.map((b, i) => (
            <div key={b.id}
              className={`px-5 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors ${i < todayCompleted.length - 1 ? "border-b border-gray-50" : ""}`}>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                  style={{ backgroundColor: "#0D2B52" }}>{b.customer_name[0]}</div>
                <div>
                  <p className="text-sm font-medium text-gray-900">{b.customer_name}</p>
                  <p className="text-xs text-gray-400">{b.product_name} · {b.pilots?.name ?? "미배정"} 파일럿</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold" style={{ color: "#0D2B52" }}>{b.total_price.toLocaleString()}원</p>
                <div className="flex items-center gap-1 justify-end mt-0.5">
                  <CheckCircle2 className="w-3 h-3" style={{ color: "#22C55E" }} />
                  <p className="text-xs text-gray-400">{b.flight_time}</p>
                </div>
              </div>
            </div>
          ))}

          {todayCompleted.length > 0 && (
            <div className="px-5 py-3.5 border-t-2 border-gray-100 flex items-center justify-between" style={{ backgroundColor: "#F5F7FA" }}>
              <div className="flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-gray-400" />
                <span className="text-sm text-gray-500">오늘 매출 합계</span>
              </div>
              <span className="text-sm font-bold" style={{ color: "#0D2B52" }}>
                {todayCompleted.reduce((s, b) => s + b.total_price, 0).toLocaleString()}원
              </span>
            </div>
          )}
        </div>
      </div>

      {toast && (
        <div className="fixed top-4 right-4 z-50 px-4 py-2.5 rounded-xl shadow-lg text-sm font-medium text-white animate-[fadeIn_0.2s_ease]"
          style={{ backgroundColor: toast.tone === "ok" ? "#15803D" : "#DC2626" }}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}
