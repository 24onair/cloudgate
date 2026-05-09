"use client";

import { useState } from "react";
import { Star, CheckCircle2, XCircle, Trash2, Eye, Image as ImageIcon, MessageSquare } from "lucide-react";
import {
  useAllReviews,
  setReviewStatus,
  deleteReview,
  Review,
  ReviewStatus,
} from "@/lib/reviewStore";

// ── 별점 표시 ─────────────────────────────────────────────────────
function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star key={i} className="w-3.5 h-3.5" fill={i < rating ? "#F54E00" : "none"} stroke={i < rating ? "#F54E00" : "#bfc1b7"} />
      ))}
    </div>
  );
}

// ── 상태 뱃지 ─────────────────────────────────────────────────────
function StatusBadge({ status }: { status: ReviewStatus }) {
  const map: Record<ReviewStatus, { label: string; color: string; bg: string }> = {
    pending:  { label: "대기중",  color: "#b45309", bg: "#fef3c7" },
    approved: { label: "게시됨",  color: "#065f46", bg: "#d1fae5" },
    rejected: { label: "거절됨",  color: "#991b1b", bg: "#fee2e2" },
  };
  const s = map[status];
  return (
    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ color: s.color, backgroundColor: s.bg }}>
      {s.label}
    </span>
  );
}

// ── 이미지 미리보기 모달 ─────────────────────────────────────────
function ImageModal({ images, onClose }: { images: string[]; onClose: () => void }) {
  const [idx, setIdx] = useState(0);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: "rgba(0,0,0,0.85)" }} onClick={onClose}>
      <div className="relative max-w-2xl w-full mx-4" onClick={(e) => e.stopPropagation()}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={images[idx]} alt="" className="w-full rounded-xl object-contain max-h-[80vh]" />
        {images.length > 1 && (
          <div className="flex justify-center gap-2 mt-3">
            {images.map((_, i) => (
              <button key={i} onClick={() => setIdx(i)} className="w-2.5 h-2.5 rounded-full transition-colors" style={{ backgroundColor: i === idx ? "#fdfdf8" : "rgba(253,253,248,0.3)" }} />
            ))}
          </div>
        )}
        <button onClick={onClose} className="absolute -top-3 -right-3 w-8 h-8 rounded-full flex items-center justify-center text-white" style={{ backgroundColor: "rgba(255,255,255,0.15)" }}>✕</button>
      </div>
    </div>
  );
}

// ── 후기 카드 ─────────────────────────────────────────────────────
function ReviewCard({ review }: { review: Review }) {
  const [expanded,   setExpanded]   = useState(false);
  const [imgModal,   setImgModal]   = useState(false);
  const [confirming, setConfirming] = useState(false);

  return (
    <>
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden shadow-sm">
        {/* 상단: 기본 정보 */}
        <div className="px-4 pt-4 pb-3">
          <div className="flex items-start justify-between gap-3 mb-2">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center text-sm font-bold flex-shrink-0" style={{ backgroundColor: "#e5e7e0", color: "#23251d" }}>
                {review.avatar}
              </div>
              <div>
                <p className="font-semibold text-sm" style={{ color: "#23251d" }}>{review.name}</p>
                <p className="text-xs" style={{ color: "#9ea096" }}>{review.date} · {review.product || "체험비행"}</p>
              </div>
            </div>
            <StatusBadge status={review.status} />
          </div>
          <Stars rating={review.rating} />
        </div>

        {/* 후기 텍스트 */}
        <div className="px-4 pb-3">
          <p className="text-sm leading-relaxed" style={{ color: "#65675e", lineHeight: 1.65 }}>
            {expanded || review.text.length <= 100
              ? review.text
              : <>{review.text.slice(0, 100)}<button onClick={() => setExpanded(true)} className="text-blue-500 ml-1">…더보기</button></>
            }
          </p>
        </div>

        {/* 이미지 썸네일 */}
        {review.images.length > 0 && (
          <div className="px-4 pb-3 flex gap-2">
            {review.images.map((img, i) => (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                key={i}
                src={img}
                alt=""
                onClick={() => setImgModal(true)}
                className="w-16 h-16 object-cover rounded-lg cursor-pointer hover:opacity-80 transition-opacity"
              />
            ))}
            <button onClick={() => setImgModal(true)} className="w-16 h-16 rounded-lg flex flex-col items-center justify-center gap-1 text-xs text-gray-400 hover:bg-gray-50 border border-gray-100">
              <ImageIcon className="w-4 h-4" />
              {review.images.length}장
            </button>
          </div>
        )}

        {/* 액션 버튼 */}
        <div className="px-4 pb-4 flex gap-2 border-t border-gray-50 pt-3">
          {review.status !== "approved" && (
            <button
              onClick={() => setReviewStatus(review.id, "approved")}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-opacity hover:opacity-80"
              style={{ backgroundColor: "#065f46" }}
            >
              <CheckCircle2 className="w-3.5 h-3.5" /> 게시
            </button>
          )}
          {review.status !== "rejected" && (
            <button
              onClick={() => setReviewStatus(review.id, "rejected")}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors border"
              style={{ color: "#991b1b", borderColor: "#fca5a5" }}
            >
              <XCircle className="w-3.5 h-3.5" /> 거절
            </button>
          )}
          {review.status === "approved" && (
            <button
              onClick={() => setReviewStatus(review.id, "pending")}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors border border-gray-200 text-gray-500"
            >
              게시 취소
            </button>
          )}
          <div className="flex-1" />
          {confirming ? (
            <>
              <span className="text-xs text-red-500 self-center">삭제할까요?</span>
              <button onClick={() => { deleteReview(review.id); setConfirming(false); }} className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-red-500">확인</button>
              <button onClick={() => setConfirming(false)} className="px-3 py-1.5 rounded-lg text-xs border border-gray-200 text-gray-500">취소</button>
            </>
          ) : (
            <button onClick={() => setConfirming(true)} className="p-1.5 rounded-lg text-gray-300 hover:text-red-400 transition-colors">
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {imgModal && <ImageModal images={review.images} onClose={() => setImgModal(false)} />}
    </>
  );
}

// ── 메인 ─────────────────────────────────────────────────────────
export default function ReviewsPage() {
  const all = useAllReviews();
  const [filter, setFilter] = useState<ReviewStatus | "all">("all");

  const counts = {
    all:      all.length,
    pending:  all.filter((r) => r.status === "pending").length,
    approved: all.filter((r) => r.status === "approved").length,
    rejected: all.filter((r) => r.status === "rejected").length,
  };

  const filtered = filter === "all" ? all : all.filter((r) => r.status === filter);

  const avgRating = all.filter((r) => r.status === "approved").length
    ? (all.filter((r) => r.status === "approved").reduce((s, r) => s + r.rating, 0) / all.filter((r) => r.status === "approved").length).toFixed(1)
    : "—";

  const TABS: { key: ReviewStatus | "all"; label: string }[] = [
    { key: "all",      label: "전체" },
    { key: "pending",  label: "대기중" },
    { key: "approved", label: "게시됨" },
    { key: "rejected", label: "거절됨" },
  ];

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <MessageSquare className="w-5 h-5" style={{ color: "#0D2B52" }} />
          <div>
            <h1 className="text-2xl font-bold" style={{ color: "#0D2B52" }}>후기 관리</h1>
            <p className="text-sm text-gray-500 mt-0.5">고객 후기를 검토하고 게시 여부를 결정합니다</p>
          </div>
        </div>
        <a
          href="/review"
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-opacity hover:opacity-80"
          style={{ backgroundColor: "#0D2B52" }}
        >
          <Eye className="w-4 h-4" /> 후기 폼 미리보기
        </a>
      </div>

      {/* 요약 카드 */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "전체 후기",   value: counts.all,      color: "#0D2B52" },
          { label: "대기중",      value: counts.pending,  color: "#b45309" },
          { label: "게시됨",      value: counts.approved, color: "#065f46" },
          { label: "평균 별점",   value: avgRating,       color: "#F54E00" },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
            <p className="text-xs text-gray-400 mb-1">{label}</p>
            <p className="text-2xl font-bold" style={{ color }}>{value}</p>
          </div>
        ))}
      </div>

      {/* 필터 탭 */}
      <div className="flex gap-1 bg-white rounded-xl p-1 border border-gray-100 shadow-sm w-fit">
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className="px-4 py-1.5 rounded-lg text-sm font-semibold transition-all"
            style={{
              backgroundColor: filter === key ? "#0D2B52" : "transparent",
              color: filter === key ? "#fff" : "#9ea096",
            }}
          >
            {label}
            <span className="ml-1.5 text-xs opacity-70">
              {key === "all" ? counts.all : counts[key as ReviewStatus]}
            </span>
          </button>
        ))}
      </div>

      {/* 후기 목록 */}
      {filtered.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <MessageSquare className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">해당 조건의 후기가 없습니다</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {filtered.map((r) => <ReviewCard key={r.id} review={r} />)}
        </div>
      )}
    </div>
  );
}
