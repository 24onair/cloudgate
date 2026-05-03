"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Upload,
  X,
  CheckCircle2,
  Receipt,
  Calendar,
  DollarSign,
  FileText,
  ImageIcon,
} from "lucide-react";
import {
  addCost,
  removeCost,
  useCosts,
  CATEGORY_META,
  CostCategory,
} from "@/lib/costStore";

// ── 상수 ────────────────────────────────────────────────────────
const CATEGORIES = Object.entries(CATEGORY_META) as [CostCategory, { label: string; color: string }][];

const TODAY = "2026-05-02";

// ── 메인 ────────────────────────────────────────────────────────
export default function CostsPage() {
  const router = useRouter();
  const allEntries = useCosts();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 폼 상태
  const [form, setForm] = useState({
    date: TODAY,
    category: "fuel" as CostCategory,
    name: "",
    amount: "",
    memo: "",
  });
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [filterDate, setFilterDate] = useState<string>("all");

  // 영수증 파일 처리
  const handleFile = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = (e) => setReceiptPreview(e.target?.result as string);
    reader.readAsDataURL(file);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  // 저장
  function handleSave() {
    if (!form.name.trim() || !form.amount) return;
    setSaving(true);
    setTimeout(() => {
      const entry = addCost({
        date: form.date,
        category: form.category,
        name: form.name.trim(),
        amount: Number(form.amount.replace(/,/g, "")),
        memo: form.memo.trim(),
        receiptDataUrl: receiptPreview,
      });
      setSavedId(entry.id);
      setForm({ date: TODAY, category: "fuel", name: "", amount: "", memo: "" });
      setReceiptPreview(null);
      setSaving(false);
      setTimeout(() => setSavedId(null), 2000);
    }, 400);
  }

  // 삭제
  function handleDelete(id: string) {
    removeCost(id);
    setDeleteConfirm(null);
  }

  // 금액 포맷 입력
  function handleAmountChange(raw: string) {
    const digits = raw.replace(/[^0-9]/g, "");
    const formatted = digits ? Number(digits).toLocaleString() : "";
    setForm((f) => ({ ...f, amount: formatted }));
  }

  // 필터된 목록
  const filtered = filterDate === "all"
    ? allEntries
    : allEntries.filter((e) => e.date === filterDate);

  // 날짜별 합계
  const totalByDate: Record<string, number> = {};
  allEntries.forEach((e) => {
    totalByDate[e.date] = (totalByDate[e.date] ?? 0) + e.amount;
  });

  const totalFiltered = filtered.reduce((s, e) => s + e.amount, 0);

  // 고유 날짜 목록
  const dates = [...new Set(allEntries.map((e) => e.date))].sort().reverse();

  const isFormValid = form.name.trim() && form.amount;

  return (
    <div className="p-6 space-y-6" style={{ background: "#F5F7FA", minHeight: "100vh" }}>
      {/* 헤더 */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push("/admin/finance")}
          className="p-2 rounded-xl hover:bg-white border border-transparent hover:border-gray-200 transition-all"
        >
          <ArrowLeft size={18} className="text-gray-500" />
        </button>
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "#0D2B52" }}>비용 입력</h1>
          <p className="text-sm text-gray-500 mt-0.5">운영 비용 기록 · 영수증 첨부</p>
        </div>
      </div>

      <div className="grid grid-cols-5 gap-5">
        {/* ── 좌: 입력 폼 ────────────────────────────────────── */}
        <div className="col-span-2 space-y-4">
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <h2 className="font-semibold mb-4" style={{ color: "#0D2B52" }}>
              <Plus size={15} className="inline mr-1.5 opacity-60" />
              비용 추가
            </h2>

            <div className="space-y-3.5">
              {/* 날짜 */}
              <div>
                <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">
                  <Calendar size={12} />
                  날짜
                </label>
                <input
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                  style={{ color: "#0D2B52" }}
                />
              </div>

              {/* 카테고리 */}
              <div>
                <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">
                  <FileText size={12} />
                  카테고리
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  {CATEGORIES.map(([key, meta]) => (
                    <button
                      key={key}
                      onClick={() => setForm((f) => ({ ...f, category: key }))}
                      className="py-2 px-3 rounded-xl text-xs font-medium border transition-all text-left"
                      style={{
                        background: form.category === key ? `${meta.color}18` : "#fff",
                        borderColor: form.category === key ? meta.color : "#E5E7EB",
                        color: form.category === key ? meta.color : "#6B7280",
                      }}
                    >
                      {meta.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 항목명 */}
              <div>
                <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">
                  <Receipt size={12} />
                  항목명
                </label>
                <input
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="예: 이번달 연료비, 보험료 납부"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                  style={{ color: "#0D2B52" }}
                />
              </div>

              {/* 금액 */}
              <div>
                <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">
                  <DollarSign size={12} />
                  금액 (원)
                </label>
                <div className="relative">
                  <input
                    value={form.amount}
                    onChange={(e) => handleAmountChange(e.target.value)}
                    placeholder="0"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 text-right font-semibold"
                    style={{ color: "#0D2B52" }}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">원</span>
                </div>
              </div>

              {/* 메모 */}
              <div>
                <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">
                  <FileText size={12} />
                  메모 (선택)
                </label>
                <textarea
                  value={form.memo}
                  onChange={(e) => setForm((f) => ({ ...f, memo: e.target.value }))}
                  placeholder="추가 설명을 입력하세요"
                  rows={2}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-200"
                  style={{ color: "#0D2B52" }}
                />
              </div>

              {/* 영수증 첨부 */}
              <div>
                <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">
                  <ImageIcon size={12} />
                  영수증 첨부 (선택)
                </label>
                {receiptPreview ? (
                  <div className="relative rounded-xl overflow-hidden border border-gray-200">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={receiptPreview}
                      alt="영수증"
                      className="w-full object-cover max-h-40"
                    />
                    <button
                      onClick={() => setReceiptPreview(null)}
                      className="absolute top-2 right-2 bg-black/50 text-white rounded-full p-1 hover:bg-black/70"
                    >
                      <X size={13} />
                    </button>
                  </div>
                ) : (
                  <div
                    className="border-2 border-dashed border-gray-200 rounded-xl p-5 text-center cursor-pointer hover:border-blue-300 hover:bg-blue-50 transition-all"
                    onClick={() => fileInputRef.current?.click()}
                    onDrop={handleDrop}
                    onDragOver={(e) => e.preventDefault()}
                  >
                    <Upload size={20} className="mx-auto mb-2 text-gray-300" />
                    <p className="text-xs text-gray-400">
                      클릭 또는 드래그로 이미지 첨부
                    </p>
                    <p className="text-xs text-gray-300 mt-0.5">JPG, PNG, HEIC 지원</p>
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFile(file);
                  }}
                />
              </div>
            </div>

            {/* 저장 버튼 */}
            <button
              onClick={handleSave}
              disabled={!isFormValid || saving}
              className="w-full mt-5 py-3 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 transition-all"
              style={{
                background: isFormValid && !saving ? "#0D2B52" : "#D1D5DB",
                cursor: isFormValid && !saving ? "pointer" : "not-allowed",
              }}
            >
              {saving ? (
                <span className="animate-pulse">저장 중…</span>
              ) : savedId ? (
                <><CheckCircle2 size={15} /> 저장 완료!</>
              ) : (
                <><Plus size={15} /> 비용 추가</>
              )}
            </button>
          </div>
        </div>

        {/* ── 우: 입력 목록 ───────────────────────────────────── */}
        <div className="col-span-3 space-y-4">
          {/* 요약 카드 */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white rounded-xl px-4 py-3 shadow-sm border border-gray-100">
              <div className="text-xs text-gray-400 mb-0.5">전체 입력 건수</div>
              <div className="text-xl font-bold" style={{ color: "#0D2B52" }}>{allEntries.length}건</div>
            </div>
            <div className="bg-white rounded-xl px-4 py-3 shadow-sm border border-gray-100">
              <div className="text-xs text-gray-400 mb-0.5">전체 합계</div>
              <div className="text-xl font-bold" style={{ color: "#EF4444" }}>
                {allEntries.reduce((s, e) => s + e.amount, 0).toLocaleString()}원
              </div>
            </div>
            <div className="bg-white rounded-xl px-4 py-3 shadow-sm border border-gray-100">
              <div className="text-xs text-gray-400 mb-0.5">영수증 첨부</div>
              <div className="text-xl font-bold" style={{ color: "#10B981" }}>
                {allEntries.filter((e) => e.receiptDataUrl).length}건
              </div>
            </div>
          </div>

          {/* 날짜 필터 */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setFilterDate("all")}
              className="px-3 py-1.5 rounded-lg text-xs font-medium border transition-all"
              style={{
                background: filterDate === "all" ? "#0D2B52" : "#fff",
                color: filterDate === "all" ? "#fff" : "#6B7280",
                borderColor: filterDate === "all" ? "#0D2B52" : "#E5E7EB",
              }}
            >
              전체
            </button>
            {dates.map((d) => (
              <button
                key={d}
                onClick={() => setFilterDate(d)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium border transition-all"
                style={{
                  background: filterDate === d ? "#0D2B52" : "#fff",
                  color: filterDate === d ? "#fff" : "#6B7280",
                  borderColor: filterDate === d ? "#0D2B52" : "#E5E7EB",
                }}
              >
                {d.slice(5).replace("-", "/")} ({(totalByDate[d] / 10000).toFixed(0)}만원)
              </button>
            ))}
          </div>

          {/* 목록 */}
          {filtered.length === 0 ? (
            <div
              className="bg-white rounded-2xl p-12 shadow-sm border border-gray-100 text-center"
            >
              <Receipt size={36} className="mx-auto mb-3 text-gray-200" />
              <p className="text-gray-400 text-sm">입력된 비용이 없습니다.</p>
              <p className="text-gray-300 text-xs mt-1">좌측 폼에서 비용을 추가해 주세요.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {/* 합계 행 */}
              <div className="flex items-center justify-between px-4 py-2">
                <span className="text-xs text-gray-400">
                  {filtered.length}건
                </span>
                <span className="text-sm font-bold" style={{ color: "#EF4444" }}>
                  합계 {totalFiltered.toLocaleString()}원
                </span>
              </div>

              {filtered.map((entry) => {
                const meta = CATEGORY_META[entry.category];
                const isDeleting = deleteConfirm === entry.id;
                return (
                  <div
                    key={entry.id}
                    className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start gap-3">
                      {/* 영수증 썸네일 */}
                      <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden"
                        style={{ background: `${meta.color}15` }}
                      >
                        {entry.receiptDataUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={entry.receiptDataUrl}
                            alt="영수증"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Receipt size={20} style={{ color: meta.color }} />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="font-semibold text-sm" style={{ color: "#0D2B52" }}>
                              {entry.name}
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span
                                className="text-xs px-2 py-0.5 rounded-full font-medium"
                                style={{ background: `${meta.color}15`, color: meta.color }}
                              >
                                {meta.label}
                              </span>
                              <span className="text-xs text-gray-400">{entry.date}</span>
                              {entry.receiptDataUrl && (
                                <span className="text-xs text-green-500 flex items-center gap-0.5">
                                  <ImageIcon size={10} />
                                  영수증
                                </span>
                              )}
                            </div>
                            {entry.memo && (
                              <p className="text-xs text-gray-400 mt-1">{entry.memo}</p>
                            )}
                          </div>
                          <div className="text-right flex-shrink-0">
                            <div className="text-base font-bold" style={{ color: "#EF4444" }}>
                              {entry.amount.toLocaleString()}원
                            </div>
                            <div className="text-xs text-gray-300 mt-0.5">
                              {entry.createdAt.slice(11, 16)} 입력
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* 삭제 */}
                      <div className="flex-shrink-0">
                        {isDeleting ? (
                          <div className="flex gap-1">
                            <button
                              onClick={() => handleDelete(entry.id)}
                              className="text-xs px-2 py-1 rounded-lg bg-red-500 text-white font-medium"
                            >
                              삭제
                            </button>
                            <button
                              onClick={() => setDeleteConfirm(null)}
                              className="text-xs px-2 py-1 rounded-lg border border-gray-200 text-gray-500"
                            >
                              취소
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setDeleteConfirm(entry.id)}
                            className="p-1.5 rounded-lg hover:bg-red-50 text-gray-300 hover:text-red-400 transition-colors"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
