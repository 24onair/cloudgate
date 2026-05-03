"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, Plus, Trash2, Upload, X, CheckCircle2,
  Receipt, Calendar, DollarSign, FileText, ImageIcon,
  Lock, Shuffle, ShieldCheck, Wind, Megaphone, Wrench, Users, Package,
  Edit3, ToggleLeft, ToggleRight, Tag, Settings,
} from "lucide-react";
import {
  addCost, removeCost, useCosts, type CostType,
} from "@/lib/costStore";
import {
  useFixedCosts, addFixedCost, updateFixedCost, removeFixedCost,
  monthlyAmount,
  type FixedCostItem, type BillingCycle,
} from "@/lib/fixedCostStore";
import {
  useCategories, addCategory, updateCategory, deleteCategory,
  COLOR_OPTIONS, type CostCategoryItem,
} from "@/lib/categoryStore";

// ── 기본 카테고리 아이콘 맵 (기본 카테고리만 아이콘 지정) ───────────
const DEFAULT_ICONS: Record<string, React.ElementType> = {
  salary: Users, fuel: Wind, insurance: ShieldCheck,
  marketing: Megaphone, maintenance: Wrench, other: Package,
};
function getCatIcon(id: string): React.ElementType {
  return DEFAULT_ICONS[id] ?? Tag;
}

const TODAY = new Date().toISOString().slice(0, 10);

function formatWon(n: number) {
  return n.toLocaleString("ko-KR") + "원";
}

// ── 고정비 수정 모달 ─────────────────────────────────────────────
function FixedEditModal({
  item, categories, onSave, onClose,
}: {
  item: FixedCostItem;
  categories: CostCategoryItem[];
  onSave: (updated: FixedCostItem) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState({
    name:         item.name,
    category:     item.category,
    billingCycle: item.billingCycle,
    amount:       item.amount.toLocaleString(),
    memo:         item.memo,
    active:       item.active,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const amountNum = Number(form.amount.replace(/,/g, "") || "0");

  function handleAmount(raw: string) {
    const d = raw.replace(/[^0-9]/g, "");
    setForm((f) => ({ ...f, amount: d ? Number(d).toLocaleString() : "" }));
    setErrors((e) => ({ ...e, amount: "" }));
  }

  function handleSave() {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = "항목명을 입력하세요";
    if (!form.amount) e.amount = "금액을 입력하세요";
    if (Object.keys(e).length > 0) { setErrors(e); return; }
    onSave({ ...item, ...form, amount: Number(form.amount.replace(/,/g, "")) });
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="font-bold text-base" style={{ color: "#0D2B52" }}>고정비 수정</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg"><X size={16} className="text-gray-400" /></button>
        </div>
        <div className="px-5 py-4 space-y-3.5">
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">항목명 *</label>
            <input value={form.name} onChange={(e) => { setForm((f) => ({ ...f, name: e.target.value })); setErrors((er) => ({ ...er, name: "" })); }}
              className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
              style={{ borderColor: errors.name ? "#EF4444" : "#E5E7EB", color: "#0D2B52" }} />
            {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">카테고리</label>
            <div className="grid grid-cols-2 gap-1.5">
              {categories.map((cat) => (
                <button key={cat.id} onClick={() => setForm((f) => ({ ...f, category: cat.id }))}
                  className="py-2 px-3 rounded-xl text-xs font-medium border transition-all text-left"
                  style={{ background: form.category === cat.id ? `${cat.color}18` : "#fff", borderColor: form.category === cat.id ? cat.color : "#E5E7EB", color: form.category === cat.id ? cat.color : "#6B7280" }}>
                  {cat.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">납부 주기</label>
            <div className="flex gap-1.5">
              {(["monthly", "annual"] as BillingCycle[]).map((c) => (
                <button key={c} onClick={() => setForm((f) => ({ ...f, billingCycle: c }))}
                  className="flex-1 py-2 px-3 rounded-xl text-xs font-medium border transition-all"
                  style={{ background: form.billingCycle === c ? "#0D2B5210" : "#fff", borderColor: form.billingCycle === c ? "#0D2B52" : "#E5E7EB", color: form.billingCycle === c ? "#0D2B52" : "#6B7280" }}>
                  {c === "monthly" ? "월납" : "연납"}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">
              {form.billingCycle === "annual" ? "연간 금액 *" : "월 금액 *"}
            </label>
            <div className="relative">
              <input value={form.amount} onChange={(e) => handleAmount(e.target.value)} placeholder="0"
                className="w-full border rounded-xl px-3 py-2 pr-14 text-sm text-right font-semibold focus:outline-none focus:ring-2 focus:ring-blue-200"
                style={{ borderColor: errors.amount ? "#EF4444" : "#E5E7EB", color: "#0D2B52" }} />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                {form.billingCycle === "annual" ? "원/년" : "원/월"}
              </span>
            </div>
            {errors.amount && <p className="text-xs text-red-500 mt-1">{errors.amount}</p>}
            {form.billingCycle === "annual" && amountNum > 0 && (
              <div className="mt-1.5 flex items-center gap-1.5 rounded-lg px-3 py-2" style={{ background: "#EFF6FF" }}>
                <span className="text-xs text-blue-500">월 환산</span>
                <span className="text-xs font-bold" style={{ color: "#1D4ED8" }}>{Math.round(amountNum / 12).toLocaleString()}원/월</span>
                <span className="text-xs text-blue-300 ml-auto">÷ 12</span>
              </div>
            )}
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">메모</label>
            <input value={form.memo} onChange={(e) => setForm((f) => ({ ...f, memo: e.target.value }))}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
              style={{ color: "#0D2B52" }} />
          </div>
          <button onClick={() => setForm((f) => ({ ...f, active: !f.active }))} className="flex items-center gap-2 text-sm" style={{ color: form.active ? "#10B981" : "#9CA3AF" }}>
            {form.active ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
            {form.active ? "매달 반영 중" : "일시 중단"}
          </button>
        </div>
        <div className="flex gap-2 px-5 pb-5">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-500">취소</button>
          <button onClick={handleSave} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white" style={{ background: "#0D2B52" }}>수정 완료</button>
        </div>
      </div>
    </div>
  );
}

// ── 카테고리 수정 모달 ───────────────────────────────────────────
function CategoryEditModal({
  item, onSave, onClose,
}: {
  item: CostCategoryItem;
  onSave: (updated: CostCategoryItem) => void;
  onClose: () => void;
}) {
  const [label, setLabel] = useState(item.label);
  const [color, setColor] = useState(item.color);
  const [isDefault, setIsDefault] = useState(item.isDefault);
  const [error, setError] = useState("");

  function handleSave() {
    if (!label.trim()) { setError("카테고리명을 입력하세요"); return; }
    onSave({ ...item, label: label.trim(), color, isDefault });
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-xs shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="font-bold text-sm" style={{ color: "#0D2B52" }}>카테고리 수정</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg"><X size={15} className="text-gray-400" /></button>
        </div>
        <div className="px-5 py-4 space-y-3">
          {/* 카테고리명 */}
          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-1.5">카테고리명</label>
            <input value={label} onChange={(e) => { setLabel(e.target.value); setError(""); }}
              className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
              style={{ borderColor: error ? "#EF4444" : "#E5E7EB", color: "#0D2B52" }} />
            {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
          </div>
          {/* 유형 */}
          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-1.5">카테고리 유형</label>
            <div className="flex gap-1.5">
              {([
                { value: false, label: "커스텀", desc: "삭제 가능" },
                { value: true,  label: "기본",   desc: "삭제 보호" },
              ] as const).map(({ value, label: lbl, desc }) => (
                <button key={String(value)}
                  onClick={() => setIsDefault(value)}
                  className="flex-1 py-1.5 px-2 rounded-lg text-xs font-medium border transition-all text-left"
                  style={{
                    background:  isDefault === value ? (value ? "#EFF6FF" : "#F5F7FA") : "#fff",
                    borderColor: isDefault === value ? (value ? "#2A7AE2" : "#6B7280") : "#E5E7EB",
                    color:       isDefault === value ? (value ? "#2A7AE2" : "#374151") : "#9CA3AF",
                  }}>
                  <div className="font-semibold">{lbl}</div>
                  <div className="text-[10px] opacity-70 mt-0.5">{desc}</div>
                </button>
              ))}
            </div>
            {/* 기본→커스텀 변경 시 경고 */}
            {item.isDefault && !isDefault && (
              <p className="text-xs text-amber-500 mt-1.5">
                ⚠️ 기본 → 커스텀으로 변경하면 이 카테고리를 삭제할 수 있게 됩니다.
              </p>
            )}
          </div>
          {/* 색상 */}
          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-1.5">색상</label>
            <div className="flex flex-wrap gap-2">
              {COLOR_OPTIONS.map((c) => (
                <button key={c} onClick={() => setColor(c)}
                  className="w-7 h-7 rounded-lg transition-all"
                  style={{ background: c, outline: color === c ? `3px solid ${c}` : "none", outlineOffset: 2, boxShadow: color === c ? `0 0 0 2px white, 0 0 0 4px ${c}` : "none" }} />
              ))}
            </div>
          </div>
          {/* 미리보기 */}
          <div className="flex items-center gap-2 rounded-lg px-3 py-2" style={{ background: `${color}15` }}>
            <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ background: `${color}25`, color }}>{label || "미리보기"}</span>
            <span className="text-xs ml-auto px-2 py-0.5 rounded-full font-medium"
              style={{ background: isDefault ? "#EFF6FF" : "#F5F7FA", color: isDefault ? "#2A7AE2" : "#6B7280" }}>
              {isDefault ? "기본" : "커스텀"}
            </span>
          </div>
        </div>
        <div className="flex gap-2 px-5 pb-5">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-500">취소</button>
          <button onClick={handleSave} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white" style={{ background: "#0D2B52" }}>수정</button>
        </div>
      </div>
    </div>
  );
}

// ── 메인 ────────────────────────────────────────────────────────
export default function CostsPage() {
  const router = useRouter();
  const allEntries = useCosts();
  const { items: fixedItems, activeTotal: fixedActiveTotal } = useFixedCosts();
  const { categories, active: activeCategories } = useCategories();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [tab, setTab] = useState<"variable" | "fixed" | "categories">("variable");

  // ── 변동비 폼 ────────────────────────────────────────────────
  const [form, setForm] = useState({
    date:      TODAY,
    category:  activeCategories[0]?.id ?? "fuel",
    costType:  "variable" as CostType,
    name:      "",
    amount:    "",
    memo:      "",
  });
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [filterDate, setFilterDate] = useState<string>("all");

  // ── 고정비 상태 ──────────────────────────────────────────────
  const [fixedEditTarget, setFixedEditTarget] = useState<FixedCostItem | null>(null);
  const [fixedDeleteConfirm, setFixedDeleteConfirm] = useState<string | null>(null);
  const [showAddFixed, setShowAddFixed] = useState(false);
  const [fixedForm, setFixedForm] = useState({
    name: "", category: activeCategories[0]?.id ?? "insurance",
    billingCycle: "monthly" as BillingCycle, amount: "", memo: "", active: true,
  });
  const [fixedFormErrors, setFixedFormErrors] = useState<Record<string, string>>({});

  // ── 카테고리 상태 ─────────────────────────────────────────────
  const [catEditTarget, setCatEditTarget] = useState<CostCategoryItem | null>(null);
  const [catDeleteConfirm, setCatDeleteConfirm] = useState<string | null>(null);
  const [showAddCat, setShowAddCat] = useState(false);
  const [newCat, setNewCat] = useState({ label: "", color: COLOR_OPTIONS[0], isDefault: false });
  const [newCatError, setNewCatError] = useState("");

  // ── 영수증 처리 ───────────────────────────────────────────────
  const handleFile = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = (e) => setReceiptPreview(e.target?.result as string);
    reader.readAsDataURL(file);
  }, []);
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  // ── 변동비 저장 ───────────────────────────────────────────────
  function handleSave() {
    if (!form.name.trim() || !form.amount) return;
    setSaving(true);
    setTimeout(() => {
      const entry = addCost({
        date: form.date, category: form.category, costType: form.costType,
        name: form.name.trim(), amount: Number(form.amount.replace(/,/g, "")),
        memo: form.memo.trim(), receiptDataUrl: receiptPreview,
      });
      setSavedId(entry.id);
      setForm({ date: TODAY, category: activeCategories[0]?.id ?? "fuel", costType: "variable", name: "", amount: "", memo: "" });
      setReceiptPreview(null);
      setSaving(false);
      setTimeout(() => setSavedId(null), 2000);
    }, 400);
  }

  function handleAmountChange(raw: string) {
    const digits = raw.replace(/[^0-9]/g, "");
    setForm((f) => ({ ...f, amount: digits ? Number(digits).toLocaleString() : "" }));
  }

  // ── 고정비 추가 ───────────────────────────────────────────────
  function handleFixedSave() {
    const e: Record<string, string> = {};
    if (!fixedForm.name.trim()) e.name = "항목명을 입력하세요";
    if (!fixedForm.amount) e.amount = "금액을 입력하세요";
    if (Object.keys(e).length > 0) { setFixedFormErrors(e); return; }
    addFixedCost({
      name: fixedForm.name.trim(), category: fixedForm.category,
      billingCycle: fixedForm.billingCycle,
      amount: Number(fixedForm.amount.replace(/,/g, "")),
      memo: fixedForm.memo.trim(), active: fixedForm.active,
    });
    setFixedForm({ name: "", category: activeCategories[0]?.id ?? "insurance", billingCycle: "monthly", amount: "", memo: "", active: true });
    setFixedFormErrors({});
    setShowAddFixed(false);
  }

  // ── 카테고리 추가 ──────────────────────────────────────────────
  function handleAddCategory() {
    if (!newCat.label.trim()) { setNewCatError("카테고리명을 입력하세요"); return; }
    addCategory({ label: newCat.label.trim(), color: newCat.color, isDefault: newCat.isDefault });
    setNewCat({ label: "", color: COLOR_OPTIONS[0], isDefault: false });
    setNewCatError("");
    setShowAddCat(false);
  }

  // ── 변동비 필터 ────────────────────────────────────────────────
  const filtered = filterDate === "all" ? allEntries : allEntries.filter((e) => e.date === filterDate);
  const totalByDate: Record<string, number> = {};
  allEntries.forEach((e) => { totalByDate[e.date] = (totalByDate[e.date] ?? 0) + e.amount; });
  const totalFiltered = filtered.reduce((s, e) => s + e.amount, 0);
  const dates = [...new Set(allEntries.map((e) => e.date))].sort().reverse();

  // 카테고리별 사용 건수 (삭제 전 경고용)
  const catUsageCount: Record<string, number> = {};
  allEntries.forEach((e) => { catUsageCount[e.category] = (catUsageCount[e.category] ?? 0) + 1; });
  fixedItems.forEach((i) => { catUsageCount[i.category] = (catUsageCount[i.category] ?? 0) + 1; });

  return (
    <div className="p-6 space-y-6" style={{ background: "#F5F7FA", minHeight: "100vh" }}>
      {/* 헤더 */}
      <div className="flex items-center gap-3">
        <button onClick={() => router.push("/admin/finance")}
          className="p-2 rounded-xl hover:bg-white border border-transparent hover:border-gray-200 transition-all">
          <ArrowLeft size={18} className="text-gray-500" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold" style={{ color: "#0D2B52" }}>비용 관리</h1>
          <p className="text-sm text-gray-500 mt-0.5">고정비 · 변동비 · 카테고리 관리</p>
        </div>
      </div>

      {/* 탭 */}
      <div className="flex gap-1 bg-white rounded-xl p-1 shadow-sm border border-gray-100 w-fit">
        {([
          { key: "variable"   as const, label: "변동비",     icon: Shuffle  },
          { key: "fixed"      as const, label: "고정비",     icon: Lock     },
          { key: "categories" as const, label: "카테고리",   icon: Settings },
        ]).map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setTab(key)}
            className="flex items-center gap-1.5 px-5 py-2 rounded-lg text-sm font-medium transition-all"
            style={{ background: tab === key ? "#0D2B52" : "transparent", color: tab === key ? "#fff" : "#6B7280" }}>
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>

      {/* ═══════════════ 변동비 탭 ═══════════════ */}
      {tab === "variable" && (
        <div className="grid grid-cols-5 gap-5">
          {/* 좌: 입력 폼 */}
          <div className="col-span-2 space-y-4">
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <h2 className="font-semibold mb-4 flex items-center gap-1.5" style={{ color: "#0D2B52" }}>
                <Shuffle size={15} className="opacity-60" /> 변동비 추가
              </h2>
              <div className="space-y-3.5">
                {/* 날짜 */}
                <div>
                  <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5"><Calendar size={12} /> 날짜</label>
                  <input type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200" style={{ color: "#0D2B52" }} />
                </div>
                {/* 카테고리 */}
                <div>
                  <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5"><FileText size={12} /> 카테고리</label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {activeCategories.map((cat) => (
                      <button key={cat.id} onClick={() => setForm((f) => ({ ...f, category: cat.id }))}
                        className="py-2 px-3 rounded-xl text-xs font-medium border transition-all text-left"
                        style={{ background: form.category === cat.id ? `${cat.color}18` : "#fff", borderColor: form.category === cat.id ? cat.color : "#E5E7EB", color: form.category === cat.id ? cat.color : "#6B7280" }}>
                        {cat.label}
                      </button>
                    ))}
                  </div>
                </div>
                {/* 항목명 */}
                <div>
                  <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5"><Receipt size={12} /> 항목명</label>
                  <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    placeholder="예: 주유 (리필), 현수막 제작"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200" style={{ color: "#0D2B52" }} />
                </div>
                {/* 금액 */}
                <div>
                  <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5"><DollarSign size={12} /> 금액 (원)</label>
                  <div className="relative">
                    <input value={form.amount} onChange={(e) => handleAmountChange(e.target.value)} placeholder="0"
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 pr-8 text-sm text-right font-semibold focus:outline-none focus:ring-2 focus:ring-blue-200" style={{ color: "#0D2B52" }} />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">원</span>
                  </div>
                </div>
                {/* 메모 */}
                <div>
                  <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5"><FileText size={12} /> 메모 (선택)</label>
                  <textarea value={form.memo} onChange={(e) => setForm((f) => ({ ...f, memo: e.target.value }))}
                    placeholder="추가 설명" rows={2}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-200" style={{ color: "#0D2B52" }} />
                </div>
                {/* 영수증 */}
                <div>
                  <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5"><ImageIcon size={12} /> 영수증 첨부 (선택)</label>
                  {receiptPreview ? (
                    <div className="relative rounded-xl overflow-hidden border border-gray-200">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={receiptPreview} alt="영수증" className="w-full object-cover max-h-40" />
                      <button onClick={() => setReceiptPreview(null)} className="absolute top-2 right-2 bg-black/50 text-white rounded-full p-1 hover:bg-black/70"><X size={13} /></button>
                    </div>
                  ) : (
                    <div className="border-2 border-dashed border-gray-200 rounded-xl p-5 text-center cursor-pointer hover:border-blue-300 hover:bg-blue-50 transition-all"
                      onClick={() => fileInputRef.current?.click()} onDrop={handleDrop} onDragOver={(e) => e.preventDefault()}>
                      <Upload size={20} className="mx-auto mb-2 text-gray-300" />
                      <p className="text-xs text-gray-400">클릭 또는 드래그로 이미지 첨부</p>
                    </div>
                  )}
                  <input ref={fileInputRef} type="file" accept="image/*" className="hidden"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
                </div>
              </div>
              <button onClick={handleSave} disabled={!form.name.trim() || !form.amount || saving}
                className="w-full mt-5 py-3 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 transition-all"
                style={{ background: form.name.trim() && form.amount && !saving ? "#FF8A00" : "#D1D5DB", cursor: form.name.trim() && form.amount && !saving ? "pointer" : "not-allowed" }}>
                {saving ? <span className="animate-pulse">저장 중…</span>
                  : savedId ? <><CheckCircle2 size={15} /> 저장 완료!</>
                  : <><Plus size={15} /> 변동비 추가</>}
              </button>
            </div>
          </div>

          {/* 우: 목록 */}
          <div className="col-span-3 space-y-4">
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "전체 건수", value: `${allEntries.length}건`, color: "#0D2B52" },
                { label: "합계 금액", value: formatWon(allEntries.reduce((s, e) => s + e.amount, 0)), color: "#FF8A00" },
                { label: "영수증 첨부", value: `${allEntries.filter((e) => e.receiptDataUrl).length}건`, color: "#10B981" },
              ].map(({ label, value, color }) => (
                <div key={label} className="bg-white rounded-xl px-4 py-3 shadow-sm border border-gray-100">
                  <div className="text-xs text-gray-400 mb-0.5">{label}</div>
                  <div className="text-xl font-bold" style={{ color }}>{value}</div>
                </div>
              ))}
            </div>
            {/* 날짜 필터 */}
            <div className="flex items-center gap-2 flex-wrap">
              {["all", ...dates].map((d) => (
                <button key={d} onClick={() => setFilterDate(d)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium border transition-all"
                  style={{ background: filterDate === d ? "#0D2B52" : "#fff", color: filterDate === d ? "#fff" : "#6B7280", borderColor: filterDate === d ? "#0D2B52" : "#E5E7EB" }}>
                  {d === "all" ? "전체" : `${d.slice(5).replace("-", "/")} (${(totalByDate[d] ?? 0).toLocaleString("ko-KR")}원)`}
                </button>
              ))}
            </div>
            {/* 목록 */}
            {filtered.length === 0 ? (
              <div className="bg-white rounded-2xl p-12 shadow-sm border border-gray-100 text-center">
                <Shuffle size={36} className="mx-auto mb-3 text-gray-200" />
                <p className="text-gray-400 text-sm">입력된 변동비가 없습니다.</p>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between px-4 py-2">
                  <span className="text-xs text-gray-400">{filtered.length}건</span>
                  <span className="text-sm font-bold" style={{ color: "#EF4444" }}>합계 {totalFiltered.toLocaleString()}원</span>
                </div>
                {filtered.map((entry) => {
                  const cat = categories.find((c) => c.id === entry.category) ?? { label: entry.category, color: "#6B7280" };
                  const isDeleting = deleteConfirm === entry.id;
                  return (
                    <div key={entry.id} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                      <div className="flex items-start gap-3">
                        <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden" style={{ background: `${cat.color}15` }}>
                          {entry.receiptDataUrl
                            // eslint-disable-next-line @next/next/no-img-element
                            ? <img src={entry.receiptDataUrl} alt="영수증" className="w-full h-full object-cover" />
                            : (() => { const Icon = getCatIcon(entry.category); return <Icon size={20} style={{ color: cat.color }} />; })()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="font-semibold text-sm" style={{ color: "#0D2B52" }}>{entry.name}</div>
                              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: `${cat.color}15`, color: cat.color }}>{cat.label}</span>
                                <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                                  style={{ background: (entry.costType ?? "variable") === "fixed" ? "#EFF6FF" : "#FFF7ED", color: (entry.costType ?? "variable") === "fixed" ? "#2A7AE2" : "#FF8A00" }}>
                                  {(entry.costType ?? "variable") === "fixed" ? "고정비" : "변동비"}
                                </span>
                                <span className="text-xs text-gray-400">{entry.date}</span>
                                {entry.receiptDataUrl && <span className="text-xs text-green-500 flex items-center gap-0.5"><ImageIcon size={10} />영수증</span>}
                              </div>
                              {entry.memo && <p className="text-xs text-gray-400 mt-1">{entry.memo}</p>}
                            </div>
                            <div className="text-right flex-shrink-0">
                              <div className="text-base font-bold" style={{ color: "#EF4444" }}>{entry.amount.toLocaleString()}원</div>
                              <div className="text-xs text-gray-300 mt-0.5">{entry.createdAt.slice(11, 16)} 입력</div>
                            </div>
                          </div>
                        </div>
                        <div className="flex-shrink-0">
                          {isDeleting ? (
                            <div className="flex gap-1">
                              <button onClick={() => { removeCost(entry.id); setDeleteConfirm(null); }} className="text-xs px-2 py-1 rounded-lg bg-red-500 text-white font-medium">삭제</button>
                              <button onClick={() => setDeleteConfirm(null)} className="text-xs px-2 py-1 rounded-lg border border-gray-200 text-gray-500">취소</button>
                            </div>
                          ) : (
                            <button onClick={() => setDeleteConfirm(entry.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-300 hover:text-red-400 transition-colors"><Trash2 size={14} /></button>
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
      )}

      {/* ═══════════════ 고정비 탭 ═══════════════ */}
      {tab === "fixed" && (
        <div className="space-y-4">
          {/* 요약 */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white rounded-2xl px-5 py-4 shadow-sm border border-gray-100">
              <div className="text-xs text-gray-400 mb-1">전체 항목</div>
              <div className="text-2xl font-bold" style={{ color: "#0D2B52" }}>{fixedItems.length}개</div>
              <div className="text-xs text-gray-400 mt-1">활성 {fixedItems.filter((i) => i.active).length} / 중단 {fixedItems.filter((i) => !i.active).length}</div>
            </div>
            <div className="bg-white rounded-2xl px-5 py-4 shadow-sm border border-gray-100">
              <div className="text-xs text-gray-400 mb-1">월 고정비 합계</div>
              <div className="text-2xl font-bold" style={{ color: "#2A7AE2" }}>{formatWon(fixedActiveTotal)}</div>
              <div className="text-xs text-gray-400 mt-1">연간 {formatWon(fixedActiveTotal * 12)}</div>
            </div>
            <div className="bg-white rounded-2xl px-5 py-4 shadow-sm border border-gray-100 flex items-center justify-center">
              <button onClick={() => setShowAddFixed(!showAddFixed)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white" style={{ background: "#2A7AE2" }}>
                <Plus size={15} /> 항목 추가
              </button>
            </div>
          </div>

          {/* 빠른 추가 폼 */}
          {showAddFixed && (
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-blue-100">
              <h3 className="font-semibold text-sm mb-4 flex items-center gap-1.5" style={{ color: "#2A7AE2" }}>
                <Lock size={14} /> 고정비 항목 추가
              </h3>
              <div className="grid grid-cols-5 gap-3 items-start">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">항목명 *</label>
                  <input value={fixedForm.name}
                    onChange={(e) => { setFixedForm((f) => ({ ...f, name: e.target.value })); setFixedFormErrors((er) => ({ ...er, name: "" })); }}
                    placeholder="항목명"
                    className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2"
                    style={{ borderColor: fixedFormErrors.name ? "#EF4444" : "#E5E7EB", color: "#0D2B52" }} />
                  {fixedFormErrors.name && <p className="text-xs text-red-500 mt-1">{fixedFormErrors.name}</p>}
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">카테고리</label>
                  <select value={fixedForm.category} onChange={(e) => setFixedForm((f) => ({ ...f, category: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none" style={{ color: "#0D2B52" }}>
                    {activeCategories.map((cat) => <option key={cat.id} value={cat.id}>{cat.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">납부 주기</label>
                  <div className="flex gap-1">
                    {(["monthly", "annual"] as BillingCycle[]).map((c) => (
                      <button key={c} onClick={() => setFixedForm((f) => ({ ...f, billingCycle: c }))}
                        className="flex-1 py-2 rounded-xl text-xs font-semibold border transition-all"
                        style={{ background: fixedForm.billingCycle === c ? "#0D2B5210" : "#fff", borderColor: fixedForm.billingCycle === c ? "#0D2B52" : "#E5E7EB", color: fixedForm.billingCycle === c ? "#0D2B52" : "#6B7280" }}>
                        {c === "monthly" ? "월납" : "연납"}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">
                    {fixedForm.billingCycle === "annual" ? "연간 금액 *" : "월 금액 *"}
                  </label>
                  <div className="relative">
                    <input value={fixedForm.amount}
                      onChange={(e) => { const d = e.target.value.replace(/[^0-9]/g, ""); setFixedForm((f) => ({ ...f, amount: d ? Number(d).toLocaleString() : "" })); setFixedFormErrors((er) => ({ ...er, amount: "" })); }}
                      placeholder="0"
                      className="w-full border rounded-xl px-3 py-2 pr-10 text-sm text-right font-semibold focus:outline-none focus:ring-2"
                      style={{ borderColor: fixedFormErrors.amount ? "#EF4444" : "#E5E7EB", color: "#0D2B52" }} />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                      {fixedForm.billingCycle === "annual" ? "원/년" : "원/월"}
                    </span>
                  </div>
                  {fixedFormErrors.amount && <p className="text-xs text-red-500 mt-1">{fixedFormErrors.amount}</p>}
                  {fixedForm.billingCycle === "annual" && fixedForm.amount && (
                    <p className="text-[10px] text-blue-500 mt-1">
                      월 {Math.round(Number(fixedForm.amount.replace(/,/g, "")) / 12).toLocaleString()}원
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">메모</label>
                  <input value={fixedForm.memo} onChange={(e) => setFixedForm((f) => ({ ...f, memo: e.target.value }))}
                    placeholder="납부일 등"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none" style={{ color: "#0D2B52" }} />
                </div>
              </div>
              <div className="flex gap-2 mt-3 justify-end">
                <button onClick={() => { setShowAddFixed(false); setFixedFormErrors({}); }} className="px-4 py-2 rounded-xl border border-gray-200 text-sm text-gray-500">취소</button>
                <button onClick={handleFixedSave} className="px-4 py-2 rounded-xl text-sm font-semibold text-white" style={{ background: "#2A7AE2" }}>추가</button>
              </div>
            </div>
          )}

          {/* 고정비 목록 */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="grid text-xs font-semibold text-gray-400 uppercase tracking-wide px-5 py-3 border-b border-gray-100"
              style={{ gridTemplateColumns: "2fr 1fr 1.4fr 1.8fr auto" }}>
              <span>항목명</span><span>카테고리</span>
              <span className="text-right">월 환산 금액</span><span className="pl-4">메모</span><span />
            </div>
            {fixedItems.length === 0 ? (
              <div className="p-12 text-center">
                <Lock size={32} className="mx-auto mb-3 text-gray-200" />
                <p className="text-sm text-gray-400">등록된 고정비 항목이 없습니다</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {fixedItems.map((item) => {
                  const cat = categories.find((c) => c.id === item.category) ?? { label: item.category, color: "#6B7280" };
                  const Icon = getCatIcon(item.category);
                  return (
                    <div key={item.id} className="grid items-center px-5 py-3.5"
                      style={{ gridTemplateColumns: "2fr 1fr 1.4fr 1.8fr auto", opacity: item.active ? 1 : 0.45 }}>
                      <div className="flex items-center gap-2.5">
                        <span className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${cat.color}15` }}>
                          <Icon size={14} style={{ color: cat.color }} />
                        </span>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-semibold" style={{ color: "#0D2B52" }}>{item.name}</span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold"
                              style={{ background: item.billingCycle === "annual" ? "#FEF3C7" : "#F3F4F6", color: item.billingCycle === "annual" ? "#D97706" : "#6B7280" }}>
                              {item.billingCycle === "annual" ? "연납" : "월납"}
                            </span>
                          </div>
                          {!item.active && <span className="text-xs text-gray-400">일시 중단</span>}
                        </div>
                      </div>
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium w-fit" style={{ background: `${cat.color}15`, color: cat.color }}>{cat.label}</span>
                      <div className="text-right">
                        <div className="text-sm font-bold" style={{ color: item.active ? "#2A7AE2" : "#9CA3AF" }}>
                          {formatWon(monthlyAmount(item))}<span className="text-xs font-normal text-gray-400 ml-0.5">/월</span>
                        </div>
                        {item.billingCycle === "annual" && <div className="text-[10px] text-gray-400">연 {formatWon(item.amount)}</div>}
                      </div>
                      <span className="text-xs text-gray-400 pl-4 truncate">{item.memo || "—"}</span>
                      <div className="flex items-center gap-1 pl-2">
                        <button onClick={() => updateFixedCost({ ...item, active: !item.active })} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
                          {item.active ? <ToggleRight size={16} style={{ color: "#10B981" }} /> : <ToggleLeft size={16} className="text-gray-300" />}
                        </button>
                        <button onClick={() => setFixedEditTarget(item)} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"><Edit3 size={14} className="text-gray-400" /></button>
                        <button onClick={() => setFixedDeleteConfirm(item.id)} className="p-1.5 rounded-lg hover:bg-red-50 transition-colors"><Trash2 size={14} className="text-red-400" /></button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            {fixedItems.length > 0 && (
              <div className="grid items-center px-5 py-3.5 border-t-2 border-gray-100 bg-gray-50"
                style={{ gridTemplateColumns: "2fr 1fr 1.4fr 1.8fr auto" }}>
                <span className="text-sm font-semibold" style={{ color: "#0D2B52" }}>
                  <CheckCircle2 size={13} className="inline mr-1.5 text-green-500" />월 합계 (활성, 월 환산)
                </span>
                <span />
                <div className="text-right">
                  <div className="text-base font-black" style={{ color: "#2A7AE2" }}>{formatWon(fixedActiveTotal)}</div>
                  <div className="text-xs text-gray-400">연 {formatWon(fixedActiveTotal * 12)}</div>
                </div>
                <span /><span />
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══════════════ 카테고리 탭 ═══════════════ */}
      {tab === "categories" && (
        <div className="space-y-4">
          {/* 요약 + 추가 버튼 */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white rounded-2xl px-5 py-4 shadow-sm border border-gray-100">
              <div className="text-xs text-gray-400 mb-1">전체 카테고리</div>
              <div className="text-2xl font-bold" style={{ color: "#0D2B52" }}>{categories.length}개</div>
              <div className="text-xs text-gray-400 mt-1">기본 {categories.filter((c) => c.isDefault).length} / 커스텀 {categories.filter((c) => !c.isDefault).length}</div>
            </div>
            <div className="bg-white rounded-2xl px-5 py-4 shadow-sm border border-gray-100">
              <div className="text-xs text-gray-400 mb-1">활성 카테고리</div>
              <div className="text-2xl font-bold" style={{ color: "#10B981" }}>{activeCategories.length}개</div>
              <div className="text-xs text-gray-400 mt-1">비활성 {categories.filter((c) => !c.active).length}개</div>
            </div>
            <div className="bg-white rounded-2xl px-5 py-4 shadow-sm border border-gray-100 flex items-center justify-center">
              <button onClick={() => setShowAddCat(!showAddCat)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white" style={{ background: "#0D2B52" }}>
                <Plus size={15} /> 카테고리 추가
              </button>
            </div>
          </div>

          {/* 추가 폼 */}
          {showAddCat && (
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <h3 className="font-semibold text-sm mb-4 flex items-center gap-1.5" style={{ color: "#0D2B52" }}>
                <Tag size={14} /> 새 카테고리 추가
              </h3>
              <div className="flex gap-4 items-start">
                <div className="flex-1">
                  <label className="block text-xs text-gray-400 mb-1">카테고리명 *</label>
                  <input value={newCat.label}
                    onChange={(e) => { setNewCat((n) => ({ ...n, label: e.target.value })); setNewCatError(""); }}
                    placeholder="예: 장비구매, 교육비, 통신비"
                    className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                    style={{ borderColor: newCatError ? "#EF4444" : "#E5E7EB", color: "#0D2B52" }} />
                  {newCatError && <p className="text-xs text-red-500 mt-1">{newCatError}</p>}
                  {/* 유형 선택 */}
                  <div className="mt-2">
                    <label className="block text-xs text-gray-400 mb-1">카테고리 유형</label>
                    <div className="flex gap-1.5">
                      {([
                        { value: false, label: "커스텀", desc: "삭제 가능" },
                        { value: true,  label: "기본",   desc: "삭제 보호" },
                      ] as const).map(({ value, label: lbl, desc }) => (
                        <button key={String(value)}
                          onClick={() => setNewCat((n) => ({ ...n, isDefault: value }))}
                          className="flex-1 py-1.5 px-2 rounded-lg text-xs font-medium border transition-all text-left"
                          style={{
                            background:  newCat.isDefault === value ? (value ? "#EFF6FF" : "#F5F7FA") : "#fff",
                            borderColor: newCat.isDefault === value ? (value ? "#2A7AE2" : "#6B7280") : "#E5E7EB",
                            color:       newCat.isDefault === value ? (value ? "#2A7AE2" : "#374151") : "#9CA3AF",
                          }}>
                          <div className="font-semibold">{lbl}</div>
                          <div className="text-[10px] opacity-70 mt-0.5">{desc}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">색상</label>
                  <div className="flex flex-wrap gap-1.5" style={{ maxWidth: 200 }}>
                    {COLOR_OPTIONS.map((c) => (
                      <button key={c} onClick={() => setNewCat((n) => ({ ...n, color: c }))}
                        className="w-7 h-7 rounded-lg transition-all"
                        style={{ background: c, outline: newCat.color === c ? `3px solid ${c}` : "none", outlineOffset: 2, boxShadow: newCat.color === c ? `0 0 0 2px white, 0 0 0 4px ${c}` : "none" }} />
                    ))}
                  </div>
                </div>
                {/* 미리보기 */}
                <div className="flex flex-col items-center justify-center gap-1 pt-5">
                  <span className="text-xs text-gray-400">미리보기</span>
                  <span className="text-xs font-semibold px-3 py-1.5 rounded-full"
                    style={{ background: `${newCat.color}20`, color: newCat.color }}>
                    {newCat.label || "카테고리명"}
                  </span>
                </div>
              </div>
              <div className="flex gap-2 mt-4 justify-end">
                <button onClick={() => { setShowAddCat(false); setNewCatError(""); }} className="px-4 py-2 rounded-xl border border-gray-200 text-sm text-gray-500">취소</button>
                <button onClick={handleAddCategory} className="px-4 py-2 rounded-xl text-sm font-semibold text-white" style={{ background: "#0D2B52" }}>추가</button>
              </div>
            </div>
          )}

          {/* 카테고리 목록 */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="grid text-xs font-semibold text-gray-400 uppercase tracking-wide px-5 py-3 border-b border-gray-100"
              style={{ gridTemplateColumns: "2fr 1fr 1fr 1fr auto" }}>
              <span>카테고리명</span>
              <span>유형</span>
              <span className="text-center">사용 건수</span>
              <span className="text-center">상태</span>
              <span />
            </div>
            <div className="divide-y divide-gray-50">
              {categories.map((cat) => {
                const usageCount = catUsageCount[cat.id] ?? 0;
                return (
                  <div key={cat.id} className="grid items-center px-5 py-3.5"
                    style={{ gridTemplateColumns: "2fr 1fr 1fr 1fr auto", opacity: cat.active ? 1 : 0.5 }}>
                    {/* 카테고리명 */}
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg flex-shrink-0" style={{ background: `${cat.color}25` }}>
                        <div className="w-full h-full rounded-lg flex items-center justify-center">
                          <div className="w-3 h-3 rounded-full" style={{ background: cat.color }} />
                        </div>
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-semibold" style={{ color: "#0D2B52" }}>{cat.label}</span>
                          <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                            style={{ background: `${cat.color}20`, color: cat.color }}>
                            {cat.label}
                          </span>
                        </div>
                      </div>
                    </div>
                    {/* 유형 */}
                    <span className="text-xs px-2 py-1 rounded-full font-medium w-fit"
                      style={{ background: cat.isDefault ? "#EFF6FF" : "#F5F7FA", color: cat.isDefault ? "#2A7AE2" : "#6B7280" }}>
                      {cat.isDefault ? "기본" : "커스텀"}
                    </span>
                    {/* 사용 건수 */}
                    <span className="text-sm text-center" style={{ color: usageCount > 0 ? "#0D2B52" : "#D1D5DB" }}>
                      {usageCount > 0 ? `${usageCount}건` : "—"}
                    </span>
                    {/* 상태 토글 */}
                    <div className="flex justify-center">
                      <button onClick={() => updateCategory({ ...cat, active: !cat.active })}
                        className="flex items-center gap-1 text-xs"
                        style={{ color: cat.active ? "#10B981" : "#9CA3AF" }}>
                        {cat.active ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                        {cat.active ? "활성" : "비활성"}
                      </button>
                    </div>
                    {/* 액션 */}
                    <div className="flex items-center gap-1 pl-2">
                      <button onClick={() => setCatEditTarget(cat)} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
                        <Edit3 size={14} className="text-gray-400" />
                      </button>
                      {!cat.isDefault ? (
                        <button onClick={() => setCatDeleteConfirm(cat.id)} className="p-1.5 rounded-lg hover:bg-red-50 transition-colors">
                          <Trash2 size={14} className="text-red-400" />
                        </button>
                      ) : (
                        <span className="p-1.5 text-gray-200" title="기본 카테고리는 삭제할 수 없습니다">
                          <Trash2 size={14} />
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-xl px-4 py-3 border border-gray-200 bg-white text-xs text-gray-500 leading-relaxed">
            💡 기본 카테고리는 삭제할 수 없습니다. 비활성화하면 새 비용 입력 시 선택 목록에서 숨겨집니다. 커스텀 카테고리는 사용 건수가 있어도 삭제 가능합니다 (기존 데이터는 유지).
          </div>
        </div>
      )}

      {/* 고정비 수정 모달 */}
      {fixedEditTarget && (
        <FixedEditModal item={fixedEditTarget} categories={activeCategories}
          onSave={(updated) => { updateFixedCost(updated); setFixedEditTarget(null); }}
          onClose={() => setFixedEditTarget(null)} />
      )}

      {/* 고정비 삭제 확인 */}
      {fixedDeleteConfirm && (() => {
        const item = fixedItems.find((i) => i.id === fixedDeleteConfirm);
        return item ? (
          <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-xs p-6 text-center shadow-2xl">
              <p className="text-sm text-gray-600 mb-5"><span className="font-semibold" style={{ color: "#0D2B52" }}>"{item.name}"</span>을 삭제할까요?</p>
              <div className="flex gap-2">
                <button onClick={() => setFixedDeleteConfirm(null)} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-500">취소</button>
                <button onClick={() => { removeFixedCost(item.id); setFixedDeleteConfirm(null); }} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white bg-red-500">삭제</button>
              </div>
            </div>
          </div>
        ) : null;
      })()}

      {/* 카테고리 수정 모달 */}
      {catEditTarget && (
        <CategoryEditModal item={catEditTarget}
          onSave={(updated) => { updateCategory(updated); setCatEditTarget(null); }}
          onClose={() => setCatEditTarget(null)} />
      )}

      {/* 카테고리 삭제 확인 */}
      {catDeleteConfirm && (() => {
        const cat = categories.find((c) => c.id === catDeleteConfirm);
        if (!cat) return null;
        const usage = catUsageCount[cat.id] ?? 0;
        return (
          <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-xs p-6 text-center shadow-2xl">
              <p className="text-sm text-gray-600 mb-2">
                <span className="font-semibold" style={{ color: "#0D2B52" }}>"{cat.label}"</span> 카테고리를 삭제할까요?
              </p>
              {usage > 0 && (
                <p className="text-xs text-amber-500 mb-4">현재 {usage}건의 비용이 이 카테고리를 사용 중입니다. 삭제해도 기존 데이터는 유지됩니다.</p>
              )}
              <div className="flex gap-2">
                <button onClick={() => setCatDeleteConfirm(null)} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-500">취소</button>
                <button onClick={() => { deleteCategory(cat.id); setCatDeleteConfirm(null); }} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white bg-red-500">삭제</button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
