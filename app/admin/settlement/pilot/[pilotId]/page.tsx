"use client";

import { useEffect, useState, useCallback, use } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft, ChevronLeft, ChevronRight, Printer, Save,
  CheckCircle2, RotateCcw, Wallet, FileText, Plane,
} from "lucide-react";

interface Flight {
  booking_id: string;
  booking_no: string;
  flight_date: string;
  flight_time: string;
  customer_name: string;
  product_name: string;
  total_price: number;
  pilot_count: number;
  pilot_amount: number;
}

interface SettlementRow {
  status: "calculating" | "confirmed" | "paid";
  confirmed_at: string | null;
  paid_at: string | null;
  pay_method: "transfer" | "cash" | "other" | null;
  pay_memo: string | null;
  share_snapshot: { share?: number; isOverride?: boolean; locked_at?: string } | null;
  memo: string | null;
  total_amount: number;
  flight_count: number;
  updated_at: string;
}

interface HistoryRow {
  year_month: string;
  total_amount: number;
  flight_count: number;
  paid_at: string | null;
  pay_method: string | null;
  pay_memo: string | null;
}

interface PilotInfo {
  id: string;
  name: string;
  phone: string | null;
  photo_url: string | null;
  rate_per_flight: number;
  bank_name: string | null;
  account_number: string | null;
  account_holder: string | null;
}

interface DetailResponse {
  pilot: PilotInfo;
  period: string;
  share: number;
  isOverride: boolean;
  override_reason: string | null;
  flights: Flight[];
  summary: { flight_count: number; total_revenue: number; total_amount: number };
  settlement: SettlementRow | null;
  history: HistoryRow[];
}

function shiftMonth(period: string, delta: number): string {
  const [y, m] = period.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default function SettlementDetailPage({ params }: { params: Promise<{ pilotId: string }> }) {
  const { pilotId } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialPeriod = searchParams.get("period") ?? new Date().toISOString().slice(0, 7);

  const [period, setPeriod] = useState(initialPeriod);
  const [data, setData] = useState<DetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [memoDraft, setMemoDraft] = useState("");
  const [memoDirty, setMemoDirty] = useState(false);
  const [toast, setToast] = useState<{ msg: string; tone: "ok" | "err" } | null>(null);

  const fetchDetail = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/settlement/pilot/${pilotId}?period=${period}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error ?? `${res.status} 오류`);
      }
      const json: DetailResponse = await res.json();
      setData(json);
      setMemoDraft(json.settlement?.memo ?? "");
      setMemoDirty(false);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [pilotId, period]);

  useEffect(() => { fetchDetail(); }, [fetchDetail]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2500);
    return () => clearTimeout(t);
  }, [toast]);

  const callAction = async (action: "confirm" | "pay" | "revert") => {
    const verbMap = { confirm: "확정", pay: "지급 완료", revert: "되돌리기" };
    if (!window.confirm(`${period} 정산을 ${verbMap[action]}하시겠습니까?`)) return;
    setBusy(true);
    try {
      const res = await fetch("/api/settlement", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, pilot_id: pilotId, year_month: period }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "처리 실패");
      const failed = (json.results ?? []).filter((r: { ok: boolean }) => !r.ok);
      if (failed.length > 0) throw new Error(failed[0].error ?? "처리 실패");
      setToast({ msg: `${verbMap[action]} 완료`, tone: "ok" });
      await fetchDetail();
    } catch (e) {
      setToast({ msg: (e as Error).message, tone: "err" });
    } finally {
      setBusy(false);
    }
  };

  const saveMemo = async () => {
    setBusy(true);
    try {
      const res = await fetch("/api/settlement", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pilot_id: pilotId, year_month: period, memo: memoDraft }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error ?? "저장 실패");
      }
      setToast({ msg: "메모 저장됨", tone: "ok" });
      setMemoDirty(false);
      await fetchDetail();
    } catch (e) {
      setToast({ msg: (e as Error).message, tone: "err" });
    } finally {
      setBusy(false);
    }
  };

  const handlePrint = () => window.print();

  // 분배율: 확정 후엔 스냅샷 우선, 아니면 현재 share
  const displayShare = data?.settlement?.share_snapshot?.share ?? data?.share ?? 0;
  const status = data?.settlement?.status ?? "calculating";
  const isConfirmed = status === "confirmed";
  const isPaid = status === "paid";

  return (
    <div className="p-6 max-w-5xl print:p-0 print:max-w-none">
      <style jsx global>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
        }
      `}</style>

      {/* 헤더 (인쇄 시 숨김) */}
      <div className="flex items-center justify-between mb-4 no-print">
        <button onClick={() => router.push("/admin/settlement")}
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
          <ArrowLeft className="w-4 h-4" /> 계산대로 돌아가기
        </button>
        <button onClick={handlePrint}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-bold text-white"
          style={{ backgroundColor: "#0D2B52" }}>
          <Printer className="w-4 h-4" /> 정산서 인쇄
        </button>
      </div>

      {/* 인쇄용 헤더 */}
      <div className="hidden print:block text-center mb-6">
        <h1 className="text-2xl font-bold">정산서</h1>
        <p className="text-sm text-gray-600 mt-1">기간: {period}</p>
      </div>

      {loading ? (
        <div className="bg-white rounded-2xl p-12 text-center text-gray-400 shadow-sm border border-gray-100">불러오는 중…</div>
      ) : error ? (
        <div className="bg-white rounded-2xl p-12 text-center text-red-500 shadow-sm border border-gray-100">{error}</div>
      ) : !data ? null : (
        <>
          {/* 파일럿 헤더 */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 mb-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                {data.pilot.photo_url ? (
                  <img src={data.pilot.photo_url} alt={data.pilot.name}
                    className="w-12 h-12 rounded-full object-cover flex-shrink-0" />
                ) : (
                  <div className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0"
                    style={{ backgroundColor: "#0D2B52" }}>
                    {data.pilot.name[0]}
                  </div>
                )}
                <div className="min-w-0">
                  <h2 className="text-xl font-bold truncate" style={{ color: "#0D2B52" }}>{data.pilot.name}</h2>
                  <p className="text-xs text-gray-400">{data.pilot.phone ?? "전화번호 없음"}</p>
                </div>
              </div>
              {/* 기간 셀렉터 */}
              <div className="flex items-center gap-1 no-print">
                <button onClick={() => setPeriod(shiftMonth(period, -1))}
                  className="p-1.5 rounded-lg hover:bg-gray-100">
                  <ChevronLeft className="w-4 h-4 text-gray-500" />
                </button>
                <span className="text-sm font-bold px-3" style={{ color: "#0D2B52" }}>{period}</span>
                <button onClick={() => setPeriod(shiftMonth(period, 1))}
                  className="p-1.5 rounded-lg hover:bg-gray-100">
                  <ChevronRight className="w-4 h-4 text-gray-500" />
                </button>
              </div>
            </div>
          </div>

          {/* 요약 */}
          <div className="grid grid-cols-4 gap-4 mb-4 print:grid-cols-4 print:gap-2">
            <SummaryCard label="비행" value={`${data.summary.flight_count}건`} icon={<Plane className="w-4 h-4" />} />
            <SummaryCard label="총 매출 (몫)" value={`${data.summary.total_revenue.toLocaleString()}원`} />
            <SummaryCard label="분배율" value={`${displayShare}%`} sub={data.isOverride ? "예외 적용" : "기본"} />
            <SummaryCard label="정산액" value={`${data.summary.total_amount.toLocaleString()}원`} highlight />
          </div>

          {/* 상태 + 액션 */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 mb-4">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-3">
                {isPaid ? (
                  <span className="px-3 py-1.5 rounded-lg text-xs font-bold" style={{ backgroundColor: "#DCFCE7", color: "#15803D" }}>
                    ✓ 지급 완료
                  </span>
                ) : isConfirmed ? (
                  <span className="px-3 py-1.5 rounded-lg text-xs font-bold" style={{ backgroundColor: "#DBEAFE", color: "#1D4ED8" }}>
                    확정 완료
                  </span>
                ) : (
                  <span className="px-3 py-1.5 rounded-lg text-xs font-bold" style={{ backgroundColor: "#F3F4F6", color: "#6B7280" }}>
                    미확정
                  </span>
                )}
                <div className="text-xs text-gray-500 space-y-0.5">
                  {data.settlement?.confirmed_at && (
                    <div>확정: {new Date(data.settlement.confirmed_at).toLocaleString("ko-KR")}</div>
                  )}
                  {data.settlement?.paid_at && (
                    <div>지급: {new Date(data.settlement.paid_at).toLocaleString("ko-KR")}</div>
                  )}
                </div>
              </div>
              <div className="flex gap-2 no-print">
                {!isConfirmed && !isPaid && (
                  <button onClick={() => callAction("confirm")} disabled={busy || data.summary.flight_count === 0}
                    className="px-4 py-2 rounded-lg text-sm font-bold text-white disabled:opacity-50"
                    style={{ backgroundColor: "#0D2B52" }}>
                    <CheckCircle2 className="w-4 h-4 inline mr-1" /> 확정
                  </button>
                )}
                {isConfirmed && (
                  <button onClick={() => callAction("pay")} disabled={busy}
                    className="px-4 py-2 rounded-lg text-sm font-bold text-white disabled:opacity-50"
                    style={{ backgroundColor: "#15803D" }}>
                    <Wallet className="w-4 h-4 inline mr-1" /> 지급 완료 처리
                  </button>
                )}
                {(isConfirmed || isPaid) && (
                  <button onClick={() => callAction("revert")} disabled={busy}
                    className="px-3 py-2 rounded-lg text-sm font-medium border border-gray-200 hover:bg-gray-50 disabled:opacity-50">
                    <RotateCcw className="w-3.5 h-3.5 inline mr-1" /> 되돌리기
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* 비행 명세 */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 mb-4 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-50">
              <h3 className="font-semibold text-gray-900">비행 명세</h3>
              <p className="text-xs text-gray-400">{data.flights.length}건</p>
            </div>
            {data.flights.length === 0 ? (
              <div className="px-5 py-12 text-center text-sm text-gray-400">이 기간에 완료된 비행이 없습니다</div>
            ) : (
              <>
                <div className="grid px-5 py-2 text-[11px] font-semibold text-gray-400 border-b border-gray-50"
                  style={{ gridTemplateColumns: "0.9fr 0.5fr 1.1fr 1fr 0.8fr 0.5fr 1fr" }}>
                  <span>일자</span>
                  <span>시간</span>
                  <span>고객</span>
                  <span>상품</span>
                  <span className="text-right">매출</span>
                  <span className="text-right">동승</span>
                  <span className="text-right">파일럿몫</span>
                </div>
                {data.flights.map((f) => (
                  <div key={f.booking_id} className="grid px-5 py-2.5 text-xs border-b border-gray-50 last:border-0"
                    style={{ gridTemplateColumns: "0.9fr 0.5fr 1.1fr 1fr 0.8fr 0.5fr 1fr" }}>
                    <span className="text-gray-600">{f.flight_date}</span>
                    <span className="text-gray-600">{f.flight_time}</span>
                    <span className="text-gray-800 font-medium truncate" title={f.customer_name}>{f.customer_name}</span>
                    <span className="text-gray-500 truncate" title={f.product_name}>{f.product_name}</span>
                    <span className="text-right text-gray-600">{f.total_price.toLocaleString()}원</span>
                    <span className="text-right text-gray-500">{f.pilot_count}명</span>
                    <span className="text-right font-semibold" style={{ color: "#0D2B52" }}>{f.pilot_amount.toLocaleString()}원</span>
                  </div>
                ))}
                <div className="grid px-5 py-3 border-t-2 border-gray-100 text-sm font-bold"
                  style={{ gridTemplateColumns: "0.9fr 0.5fr 1.1fr 1fr 0.8fr 0.5fr 1fr" }}>
                  <span className="text-gray-700">합계</span>
                  <span /><span /><span />
                  <span className="text-right text-gray-700">{data.summary.total_revenue.toLocaleString()}원</span>
                  <span />
                  <span className="text-right" style={{ color: "#0D2B52" }}>{data.summary.total_amount.toLocaleString()}원</span>
                </div>
              </>
            )}
          </div>

          {/* 계좌 정보 */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 mb-4">
            <div className="flex items-center gap-2 mb-3">
              <Wallet className="w-4 h-4" style={{ color: "#2A7AE2" }} />
              <h3 className="font-semibold text-gray-900">입금 계좌</h3>
            </div>
            {data.pilot.bank_name || data.pilot.account_number ? (
              <div className="text-sm text-gray-700 space-y-1">
                <div><span className="text-gray-400 mr-2">은행</span>{data.pilot.bank_name ?? "-"}</div>
                <div><span className="text-gray-400 mr-2">계좌번호</span><span className="font-mono">{data.pilot.account_number ?? "-"}</span></div>
                <div><span className="text-gray-400 mr-2">예금주</span>{data.pilot.account_holder ?? data.pilot.name}</div>
              </div>
            ) : (
              <p className="text-xs text-gray-400">계좌 정보가 등록되지 않았습니다. 파일럿 관리에서 추가해주세요.</p>
            )}
          </div>

          {/* 관리자 메모 (인쇄 제외) */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 mb-4 no-print">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4" style={{ color: "#2A7AE2" }} />
                <h3 className="font-semibold text-gray-900">관리자 메모</h3>
              </div>
              {memoDirty && (
                <button onClick={saveMemo} disabled={busy}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold text-white disabled:opacity-50"
                  style={{ backgroundColor: "#0D2B52" }}>
                  <Save className="w-3.5 h-3.5" /> 저장
                </button>
              )}
            </div>
            <textarea value={memoDraft}
              onChange={(e) => { setMemoDraft(e.target.value); setMemoDirty(true); }}
              placeholder="이번 달 정산에 대한 메모 (특이사항, 조정 사유 등)"
              rows={3}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400" />
          </div>

          {/* 지급 이력 (인쇄 제외) */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden no-print">
            <div className="px-5 py-4 border-b border-gray-50">
              <h3 className="font-semibold text-gray-900">지급 이력</h3>
              <p className="text-xs text-gray-400">최근 지급 완료된 정산 (최대 12건)</p>
            </div>
            {data.history.length === 0 ? (
              <div className="px-5 py-8 text-center text-sm text-gray-400">아직 지급된 정산이 없습니다</div>
            ) : (
              <>
                <div className="grid px-5 py-2 text-[11px] font-semibold text-gray-400 border-b border-gray-50"
                  style={{ gridTemplateColumns: "0.8fr 0.6fr 1fr 0.8fr 1.5fr" }}>
                  <span>월</span>
                  <span className="text-right">건수</span>
                  <span className="text-right">금액</span>
                  <span>방식</span>
                  <span>지급일</span>
                </div>
                {data.history.map((h) => (
                  <div key={h.year_month} className="grid px-5 py-2.5 text-xs border-b border-gray-50 last:border-0"
                    style={{ gridTemplateColumns: "0.8fr 0.6fr 1fr 0.8fr 1.5fr" }}>
                    <span className="font-medium text-gray-700">{h.year_month}</span>
                    <span className="text-right text-gray-600">{h.flight_count}건</span>
                    <span className="text-right font-semibold" style={{ color: "#0D2B52" }}>{h.total_amount.toLocaleString()}원</span>
                    <span className="text-gray-500">{h.pay_method ?? "-"}</span>
                    <span className="text-gray-500">{h.paid_at ? new Date(h.paid_at).toLocaleString("ko-KR") : "-"}</span>
                  </div>
                ))}
              </>
            )}
          </div>
        </>
      )}

      {toast && (
        <div className="fixed top-4 right-4 z-50 px-4 py-2.5 rounded-xl shadow-lg text-sm font-medium text-white no-print"
          style={{ backgroundColor: toast.tone === "ok" ? "#15803D" : "#DC2626" }}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}

function SummaryCard({ label, value, sub, highlight, icon }: {
  label: string;
  value: string;
  sub?: string;
  highlight?: boolean;
  icon?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl p-4 shadow-sm border"
      style={{
        backgroundColor: highlight ? "#0D2B52" : "white",
        borderColor: highlight ? "#0D2B52" : "#F3F4F6",
        color: highlight ? "white" : undefined,
      }}>
      <div className="flex items-center justify-between mb-1">
        <p className="text-xs" style={{ color: highlight ? "rgba(255,255,255,0.6)" : "#9CA3AF" }}>{label}</p>
        {icon && <span style={{ color: highlight ? "rgba(255,255,255,0.6)" : "#9CA3AF" }}>{icon}</span>}
      </div>
      <p className="text-xl font-bold" style={{ color: highlight ? "white" : "#0D2B52" }}>{value}</p>
      {sub && <p className="text-[10px] mt-1" style={{ color: highlight ? "rgba(255,255,255,0.5)" : "#9CA3AF" }}>{sub}</p>}
    </div>
  );
}
