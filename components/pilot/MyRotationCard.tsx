"use client";

/**
 * 파일럿 포털용 "내 순번" 카드 — 큐 포인터(모델 B) 기반.
 *
 * /api/pilot/my-rotation 에서 본인의 queue_idx(0=다음 차례)를 받아
 *  - 다음 차례입니다 (queue_idx === 0)
 *  - 다음 차례까지 N명 남음 (queue_idx > 0)
 *  - 방금 비행했어요 (is_last_assigned)
 *  - 오늘 휴무로 표시됐어요 (is_off)
 * 를 표시. 다른 파일럿 이름·순번은 노출하지 않음.
 */

import { useEffect, useState } from "react";
import { ListOrdered, CalendarDays, ArrowRight, CheckCircle2, Coffee } from "lucide-react";

interface RotationInfo {
  date: string;
  base_order: number | null;
  override_order: number | null;
  effective_order: number | null;
  has_override: boolean;
  total_active: number;
  queue_idx: number | null;
  is_off: boolean;
  is_last_assigned: boolean;
}

export default function MyRotationCard() {
  const [info, setInfo] = useState<RotationInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/pilot/my-rotation", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => setInfo(j))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return null; // 조용히 로드 (포털 첫 화면 깜빡임 방지)
  if (!info) return null;

  // 오늘 휴무
  if (info.is_off) {
    return (
      <div
        className="rounded-2xl p-4 shadow-sm flex items-center gap-3"
        style={{ backgroundColor: "#F3F4F6", border: "1px solid #E5E7EB" }}
      >
        <div
          className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
          style={{ backgroundColor: "#6B7280" }}
        >
          <Coffee className="w-6 h-6 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-semibold" style={{ color: "#374151" }}>
            오늘 일정
          </div>
          <div className="text-base font-bold mt-0.5" style={{ color: "#111827" }}>
            휴무로 등록돼 있어요
          </div>
          <div className="text-[11px] mt-0.5" style={{ color: "#6B7280" }}>
            오늘은 배정에서 제외됩니다.
          </div>
        </div>
      </div>
    );
  }

  // 효력 있는 큐 정보가 없으면 카드 숨김
  if (info.queue_idx == null || info.effective_order == null) return null;

  const isNext = info.queue_idx === 0;
  const isLast = info.is_last_assigned;

  return (
    <div
      className="rounded-2xl p-4 shadow-sm flex items-center gap-3"
      style={{ backgroundColor: "#FFF7ED", border: "1px solid #FED7AA" }}
    >
      <div
        className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
        style={{ backgroundColor: isNext ? "#9A3412" : isLast ? "#0D2B52" : "#9A3412" }}
      >
        {isNext ? (
          <ArrowRight className="w-6 h-6 text-white" />
        ) : isLast ? (
          <CheckCircle2 className="w-6 h-6 text-white" />
        ) : (
          <ListOrdered className="w-6 h-6 text-white" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-xs font-semibold" style={{ color: "#9A3412" }}>
          오늘 내 차례
        </div>
        {isNext ? (
          <div className="flex items-baseline gap-1 mt-0.5">
            <span className="text-xl font-extrabold" style={{ color: "#7C2D12" }}>
              다음 차례입니다!
            </span>
          </div>
        ) : isLast ? (
          <>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-lg font-extrabold" style={{ color: "#7C2D12" }}>
                방금 비행 받았어요
              </span>
            </div>
            <div className="text-[11px] mt-0.5" style={{ color: "#9A3412" }}>
              다음 차례까지 {info.total_active - 1}명 기다리는 중
            </div>
          </>
        ) : (
          <div className="flex items-baseline gap-1 mt-0.5">
            <span className="text-2xl font-extrabold" style={{ color: "#7C2D12" }}>
              {info.queue_idx + 1}
            </span>
            <span className="text-sm font-medium" style={{ color: "#9A3412" }}>
              번째
            </span>
            <span className="text-xs ml-1" style={{ color: "#9A3412" }}>
              (다음 차례까지 {info.queue_idx}명 앞에 있음)
            </span>
          </div>
        )}
        <div className="text-[10px] mt-1" style={{ color: "#9A3412" }}>
          평소 순번 {info.base_order ?? "—"}번 · 가용 {info.total_active}명
        </div>
        {info.has_override && (
          <div
            className="mt-1.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold"
            style={{ backgroundColor: "#FEF3C7", color: "#92400E" }}
          >
            <CalendarDays className="w-3 h-3" />
            오늘만 임시 순번 ({info.base_order != null ? `평소 ${info.base_order}번` : "평소 미지정"})
          </div>
        )}
      </div>
    </div>
  );
}
