"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, Plus, Edit3, Trash2, ToggleLeft, ToggleRight,
  ShieldCheck, Wind, Megaphone, Wrench, Users, Package,
  CheckCircle2, X, Lock,
} from "lucide-react";
import {
  useFixedCosts, addFixedCost, updateFixedCost, removeFixedCost,
  monthlyAmount,
  type FixedCostItem, type BillingCycle,
} from "@/lib/fixedCostStore";
import { useCategories, getCategoryMeta } from "@/lib/categoryStore";
import type { CostCategory } from "@/lib/costStore";

// ── 아이콘 맵 (기본 카테고리 전용, 커스텀은 Tag 폴백) ──────────────
const DEFAULT_ICONS: Record<string, React.ElementType> = {
  salary:      Users,
  fuel:        Wind,
  insurance:   ShieldCheck,
  marketing:   Megaphone,
  maintenance: Wrench,
  other:       Package,
};
function getCatIcon(id: string): React.ElementType {
  return DEFAULT_ICONS[id] ?? Package;
}

function formatWon(n: number) {
  return n.toLocaleString("ko-KR") + "원";
}

// ── 고정비 폼 모달 ───────────────────────────────────────────────
function FixedCostModal({
  initial,
  onSave,
  onClose,
}: {
  initial?: FixedCostItem;
  onSave: (item: Omit<FixedCostItem, "id" | "createdAt">) => void;
  onClose: () => void;
}) {
  const { active: activeCategories } = useCategories();
  const [form, setForm] = useState({
    name:         initial?.name ?? "",
    category:     initial?.category ?? ("insurance" as CostCategory),
    amount:       initial ? initial.amount.toLocaleString() : "",
    billingCycle: (initial?.billingCycle ?? "monthly") as BillingCycle,
    memo:         initial?.memo ?? "",
    active:       initial?.active ?? true,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const amountNum = Number(form.amount.replace(/,/g, "") || "0");
  const monthlyPreview = form.billingCycle === "annual" ? Math.round(amountNum / 12) : amountNum;

  function handleAmount(raw: string) {
    const digits = raw.replace(/[^0-9]/g, "");
    setForm((f) => ({ ...f, amount: digits ? Number(digits).toLocaleString() : "" }));
    setErrors((e) => ({ ...e, amount: "" }));
  }

  function handleSave() {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = "항목명을 입력하세요";
    if (!form.amount) e.amount = "금액을 입력하세요";
    if (Object.keys(e).length > 0) { setErrors(e); return; }
    onSave({
      name:         form.name.trim(),
      category:     form.category,
      amount:       Number(form.amount.replace(/,/g, "")),
      billingCycle: form.billingCycle,
      memo:         form.memo.trim(),
      active:       form.active,
    });
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl">
        {/* 헤더 */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="font-bold text-base" style={{ color: "#0D2B52" }}>
            {initial ? "고정비 수정" : "고정비 추가"}
          </h2>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg">
            <X size={16} className="text-gray-400" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-3.5">
          {/* 항목명 */}
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">항목명 *</label>
            <input
              value={form.name}
              onChange={(e) => { setForm((f) => ({ ...f, name: e.target.value })); setErrors((er) => ({ ...er, name: "" })); }}
              placeholder="예: 탠덤 항공보험, 이륙장 임차료"
              className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
              style={{ borderColor: errors.name ? "#EF4444" : "#E5E7EB", color: "#0D2B52" }}
            />
            {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
          </div>

          {/* 카테고리 */}
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">카테고리</label>
            <div className="grid grid-cols-2 gap-1.5">
              {activeCategories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setForm((f) => ({ ...f, category: cat.id }))}
                  className="py-2 px-3 rounded-xl text-xs font-medium border transition-all text-left"
                  style={{
                    background:   form.category === cat.id ? `${cat.color}18` : "#fff",
                    borderColor:  form.category === cat.id ? cat.color : "#E5E7EB",
                    color:        form.category === cat.id ? cat.color : "#6B7280",
                  }}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* 납부 주기 */}
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">납부 주기</label>
            <div className="flex gap-1.5">
              {([
                { key: "monthly" as BillingCycle, label: "월납", sub: "매월 납부" },
                { key: "annual"  as BillingCycle, label: "연납", sub: "연 1회 납부, 월할 적용" },
              ]).map(({ key, label, sub }) => (
                <button
                  key={key}
                  onClick={() => setForm((f) => ({ ...f, billingCycle: key }))}
                  className="flex-1 py-2 px-3 rounded-xl text-xs font-medium border transition-all"
                  style={{
                    background:  form.billingCycle === key ? "#0D2B5210" : "#fff",
                    borderColor: form.billingCycle === key ? "#0D2B52" : "#E5E7EB",
                    color:       form.billingCycle === key ? "#0D2B52" : "#6B7280",
                  }}
                >
                  <div className="font-semibold">{label}</div>
                  <div className="text-[10px] mt-0.5 opacity-70">{sub}</div>
                </button>
              ))}
            </div>
          </div>

          {/* 금액 */}
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">
              {form.billingCycle === "annual" ? "연간 금액 *" : "월 금액 *"}
            </label>
            <div className="relative">
              <input
                value={form.amount}
                onChange={(e) => handleAmount(e.target.value)}
                placeholder="0"
                className="w-full border rounded-xl px-3 py-2 text-sm text-right font-semibold focus:outline-none focus:ring-2 focus:ring-blue-200"
                style={{
                  borderColor: errors.amount ? "#EF4444" : "#E5E7EB",
                  color: "#0D2B52",
                  paddingRight: form.billingCycle === "annual" ? "2.8rem" : "2.5rem",
                }}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                {form.billingCycle === "annual" ? "원/년" : "원/월"}
              </span>
            </div>
            {errors.amount && <p className="text-xs text-red-500 mt-1">{errors.amount}</p>}
            {/* 연납일 때 월 환산 미리보기 */}
            {form.billingCycle === "annual" && amountNum > 0 && (
              <div className="mt-1.5 flex items-center gap-1.5 rounded-lg px-3 py-2" style={{ background: "#EFF6FF" }}>
                <span className="text-xs text-blue-500">월 환산</span>
                <span className="text-xs font-bold" style={{ color: "#1D4ED8" }}>
                  {monthlyPreview.toLocaleString()}원/월
                </span>
                <span className="text-xs text-blue-300 ml-auto">÷ 12</span>
              </div>
            )}
          </div>

          {/* 메모 */}
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">메모 (선택)</label>
            <input
              value={form.memo}
              onChange={(e) => setForm((f) => ({ ...f, memo: e.target.value }))}
              placeholder="납부일, 계약 정보 등"
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
              style={{ color: "#0D2B52" }}
            />
          </div>

          {/* 활성 여부 */}
          <button
            onClick={() => setForm((f) => ({ ...f, active: !f.active }))}
            className="flex items-center gap-2 text-sm"
            style={{ color: form.active ? "#10B981" : "#9CA3AF" }}
          >
            {form.active ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
            {form.active ? "매달 반영 중" : "일시 중단"}
          </button>
        </div>

        <div className="flex gap-2 px-5 pb-5">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-500">취소</button>
          <button
            onClick={handleSave}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white"
            style={{ background: "#0D2B52" }}
          >
            {initial ? "수정 완료" : "추가"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── 삭제 확인 ────────────────────────────────────────────────────
function ConfirmDialog({ name, onConfirm, onCancel }: { name: string; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-xs p-6 text-center shadow-2xl">
        <p className="text-sm text-gray-600 mb-5">
          <span className="font-semibold" style={{ color: "#0D2B52" }}>"{name}"</span>을 삭제할까요?
        </p>
        <div className="flex gap-2">
          <button onClick={onCancel} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-500">취소</button>
          <button onClick={onConfirm} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white bg-red-500">삭제</button>
        </div>
      </div>
    </div>
  );
}

// ── 메인 ────────────────────────────────────────────────────────
export default function FixedCostsPage() {
  const router = useRouter();
  const { items, activeTotal } = useFixedCosts();
  const [modal, setModal] = useState<"add" | FixedCostItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<FixedCostItem | null>(null);

  const inactiveTotal = items
    .filter((i) => !i.active)
    .reduce((s, i) => s + monthlyAmount(i), 0);

  function handleSave(data: Omit<FixedCostItem, "id" | "createdAt">) {
    if (modal === "add") addFixedCost(data);
    else if (modal) updateFixedCost({ ...(modal as FixedCostItem), ...data });
    setModal(null);
  }

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
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <Lock size={16} style={{ color: "#0D2B52" }} />
            <h1 className="text-2xl font-bold" style={{ color: "#0D2B52" }}>고정비 관리</h1>
          </div>
          <p className="text-sm text-gray-500 mt-0.5">매달 정기적으로 발생하는 고정 비용 항목 관리</p>
        </div>
        <button
          onClick={() => setModal("add")}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold text-white shadow-sm hover:opacity-90"
          style={{ background: "#0D2B52" }}
        >
          <Plus size={15} />
          항목 추가
        </button>
      </div>

      {/* 요약 카드 */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl px-5 py-4 shadow-sm border border-gray-100">
          <div className="text-xs text-gray-400 mb-1">전체 항목</div>
          <div className="text-2xl font-bold" style={{ color: "#0D2B52" }}>{items.length}개</div>
          <div className="text-xs text-gray-400 mt-1">활성 {items.filter((i) => i.active).length} / 중단 {items.filter((i) => !i.active).length}</div>
        </div>
        <div className="bg-white rounded-2xl px-5 py-4 shadow-sm border border-gray-100">
          <div className="text-xs text-gray-400 mb-1">월 고정비 합계 (활성)</div>
          <div className="text-2xl font-bold" style={{ color: "#EF4444" }}>{formatWon(activeTotal)}</div>
          <div className="text-xs text-gray-400 mt-1">연간 환산 {formatWon(activeTotal * 12)}</div>
        </div>
        <div className="bg-white rounded-2xl px-5 py-4 shadow-sm border border-gray-100">
          <div className="text-xs text-gray-400 mb-1">중단된 항목 금액</div>
          <div className="text-2xl font-bold text-gray-300">{formatWon(inactiveTotal)}</div>
          <div className="text-xs text-gray-300 mt-1">비용 집계 미반영</div>
        </div>
      </div>

      {/* 고정비 목록 */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {/* 테이블 헤더 */}
        <div
          className="grid text-xs font-semibold text-gray-400 uppercase tracking-wide px-5 py-3 border-b border-gray-100"
          style={{ gridTemplateColumns: "2fr 1fr 1.4fr 1.8fr auto" }}
        >
          <span>항목명</span>
          <span>카테고리</span>
          <span className="text-right">월 환산 금액</span>
          <span className="pl-4">메모</span>
          <span />
        </div>

        {items.length === 0 ? (
          <div className="p-12 text-center">
            <Lock size={32} className="mx-auto mb-3 text-gray-200" />
            <p className="text-sm text-gray-400">등록된 고정비 항목이 없습니다</p>
            <button
              onClick={() => setModal("add")}
              className="mt-3 text-sm font-medium"
              style={{ color: "#2A7AE2" }}
            >
              + 첫 항목 추가
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {items.map((item) => {
              const meta = getCategoryMeta(item.category);
              const Icon = getCatIcon(item.category);
              return (
                <div
                  key={item.id}
                  className="grid items-center px-5 py-3.5"
                  style={{
                    gridTemplateColumns: "2fr 1fr 1.4fr 1.8fr auto",
                    opacity: item.active ? 1 : 0.45,
                  }}
                >
                  {/* 항목명 */}
                  <div className="flex items-center gap-2.5">
                    <span
                      className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ background: `${meta.color}15` }}
                    >
                      <Icon size={14} style={{ color: meta.color }} />
                    </span>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-semibold" style={{ color: "#0D2B52" }}>{item.name}</span>
                        {/* 납부 주기 뱃지 */}
                        <span
                          className="text-[10px] px-1.5 py-0.5 rounded font-semibold"
                          style={{
                            background: item.billingCycle === "annual" ? "#FEF3C7" : "#F3F4F6",
                            color:      item.billingCycle === "annual" ? "#D97706" : "#6B7280",
                          }}
                        >
                          {item.billingCycle === "annual" ? "연납" : "월납"}
                        </span>
                      </div>
                      {item.billingCycle === "annual" && (
                        <div className="text-[10px] text-amber-500 mt-0.5">
                          연 {formatWon(item.amount)} ÷ 12
                        </div>
                      )}
                      {!item.active && (
                        <span className="text-xs text-gray-400">일시 중단</span>
                      )}
                    </div>
                  </div>

                  {/* 카테고리 */}
                  <span
                    className="text-xs px-2 py-0.5 rounded-full font-medium w-fit"
                    style={{ background: `${meta.color}15`, color: meta.color }}
                  >
                    {meta.label}
                  </span>

                  {/* 월 환산 금액 */}
                  <div className="text-right">
                    <div className="text-sm font-bold" style={{ color: item.active ? "#EF4444" : "#9CA3AF" }}>
                      {formatWon(monthlyAmount(item))}
                      <span className="text-xs font-normal text-gray-400 ml-0.5">/월</span>
                    </div>
                    {item.billingCycle === "annual" && (
                      <div className="text-[10px] text-gray-400">연 {formatWon(item.amount)}</div>
                    )}
                  </div>

                  {/* 메모 */}
                  <span className="text-xs text-gray-400 pl-4 truncate">{item.memo || "—"}</span>

                  {/* 액션 */}
                  <div className="flex items-center gap-1 pl-2">
                    {/* 활성 토글 */}
                    <button
                      onClick={() => updateFixedCost({ ...item, active: !item.active })}
                      className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                      title={item.active ? "중단" : "재개"}
                    >
                      {item.active
                        ? <ToggleRight size={16} style={{ color: "#10B981" }} />
                        : <ToggleLeft size={16} className="text-gray-300" />}
                    </button>
                    {/* 수정 */}
                    <button
                      onClick={() => setModal(item)}
                      className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <Edit3 size={14} className="text-gray-400" />
                    </button>
                    {/* 삭제 */}
                    <button
                      onClick={() => setDeleteTarget(item)}
                      className="p-1.5 rounded-lg hover:bg-red-50 transition-colors"
                    >
                      <Trash2 size={14} className="text-red-400" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* 합계 행 */}
        {items.length > 0 && (
          <div
            className="grid items-center px-5 py-3.5 border-t-2 border-gray-100 bg-gray-50"
            style={{ gridTemplateColumns: "2fr 1fr 1.4fr 1.8fr auto" }}
          >
            <span className="text-sm font-semibold" style={{ color: "#0D2B52" }}>
              <CheckCircle2 size={13} className="inline mr-1.5 text-green-500" />
              월 합계 (활성, 월 환산)
            </span>
            <span />
            <span className="text-base font-black text-right" style={{ color: "#EF4444" }}>
              {formatWon(activeTotal)}
            </span>
            <span />
            <span />
          </div>
        )}
      </div>

      {/* 안내 */}
      <div className="rounded-xl px-4 py-3 border border-blue-100 bg-blue-50 text-xs text-blue-600 leading-relaxed">
        💡 고정비는 매월 자동으로 비용 집계에 반영됩니다. 일시적으로 지출이 없는 달에는 토글로 중단하세요.
        변동비(연료비, 마케팅 등 일회성 지출)는 <button className="font-semibold underline" onClick={() => router.push("/admin/finance/costs")}>변동비 입력</button>에서 관리하세요.
      </div>

      {/* 모달 */}
      {modal !== null && (
        <FixedCostModal
          initial={modal === "add" ? undefined : modal}
          onSave={handleSave}
          onClose={() => setModal(null)}
        />
      )}
      {deleteTarget && (
        <ConfirmDialog
          name={deleteTarget.name}
          onConfirm={() => { removeFixedCost(deleteTarget.id); setDeleteTarget(null); }}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
