"use client";

import { useState, useRef } from "react";
import {
  Plus, X, Edit3, Trash2, Package, Tag, Clock,
  ToggleLeft, ToggleRight, Star, Camera, Video,
  ChevronDown, ChevronUp, ImagePlus, ChevronLeft, ChevronRight,
} from "lucide-react";
import {
  useProducts, addProduct, updateProduct, deleteProduct,
  addOption, updateOption, deleteOption,
  type Product, type ProductOption,
} from "@/lib/productStore";

// ── 색상 팔레트 ──────────────────────────────────────────────────
const COLOR_PALETTE = [
  { label: "클라우드 블루", value: "#2A7AE2" },
  { label: "파일럿 오렌지", value: "#FF8A00" },
  { label: "에메랄드", value: "#10B981" },
  { label: "바이올렛", value: "#8B5CF6" },
  { label: "딥 네이비", value: "#0D2B52" },
  { label: "로즈", value: "#EF4444" },
  { label: "골드", value: "#F59E0B" },
  { label: "틸", value: "#06B6D4" },
];

function formatPrice(n: number) {
  return n.toLocaleString("ko-KR") + "원";
}

function genId() {
  return `prod_${Date.now().toString(36)}`;
}

// ── 이미지 업로드 헬퍼 ───────────────────────────────────────────
async function uploadImage(file: File, folder: string): Promise<string | null> {
  try {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("folder", folder);
    const res = await fetch("/api/upload", { method: "POST", body: fd });
    if (!res.ok) return null;
    const { url } = await res.json() as { url: string };
    return url;
  } catch { return null; }
}

// ── 빈 상품 템플릿 ───────────────────────────────────────────────
const EMPTY_PRODUCT: Omit<Product, "id" | "sortOrder"> = {
  name: "",
  subtitle: "",
  price: 0,
  duration: "",
  color: "#2A7AE2",
  popular: false,
  active: true,
  images: [],
};

const EMPTY_OPTION: Omit<ProductOption, "id"> = {
  label: "",
  description: "",
  price: 0,
  active: true,
};

// ── 상품 폼 모달 ─────────────────────────────────────────────────
function ProductModal({
  initial,
  onSave,
  onClose,
}: {
  initial?: Product;
  onSave: (p: Product) => Promise<void>;
  onClose: () => void;
}) {
  const [form, setForm] = useState<Omit<Product, "id" | "sortOrder">>(
    initial ? { ...initial } : { ...EMPTY_PRODUCT }
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [slideIdx, setSlideIdx] = useState(0);
  const fileRefs = [useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null)];

  function set<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [k]: v }));
    setErrors((prev) => ({ ...prev, [k]: "" }));
  }

  async function handleImageFile(idx: number, file: File) {
    const url = await uploadImage(file, "products");
    if (!url) return;
    const next = [...(form.images ?? []), "", "", ""].slice(0, 3) as string[];
    next[idx] = url;
    set("images", next.filter((_, i) => i < 3));
  }

  function removeImage(idx: number) {
    const next = [...(form.images ?? [])];
    next.splice(idx, 1);
    set("images", next);
    if (slideIdx >= next.length && slideIdx > 0) setSlideIdx(next.length - 1);
  }

  function validate() {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = "상품명을 입력하세요";
    if (!form.subtitle.trim()) e.subtitle = "부제목을 입력하세요";
    if (!form.price || form.price <= 0) e.price = "가격을 입력하세요";
    if (!form.duration.trim()) e.duration = "소요 시간을 입력하세요";
    return e;
  }

  async function handleSave() {
    const e = validate();
    if (Object.keys(e).length > 0) { setErrors(e); return; }
    setSaving(true);
    await onSave({
      ...form,
      id: initial?.id ?? genId(),
      sortOrder: initial?.sortOrder ?? 9999,  // Date.now() → integer overflow 방지
    });
    setSaving(false);
  }

  const isEdit = !!initial;

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-y-auto max-h-[90vh]">
          {/* 헤더 */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white">
            <h2 className="text-lg font-bold" style={{ color: "#0D2B52" }}>
              {isEdit ? "상품 수정" : "상품 추가"}
            </h2>
            <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg">
              <X size={18} className="text-gray-400" />
            </button>
          </div>

          <div className="px-6 py-5 space-y-4">
            {/* 상품명 */}
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">
                상품명 <span className="text-red-500">*</span>
              </label>
              <input
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                placeholder="예: 베이직"
                className="w-full border rounded-xl px-3 py-2 text-sm outline-none focus:ring-2"
                style={{
                  borderColor: errors.name ? "#EF4444" : "#E5E7EB",
                  color: "#0D2B52",
                }}
              />
              {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
            </div>

            {/* 부제목 */}
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">
                부제목 <span className="text-red-500">*</span>
              </label>
              <input
                value={form.subtitle}
                onChange={(e) => set("subtitle", e.target.value)}
                placeholder="예: 첫 패러글라이딩 입문"
                className="w-full border rounded-xl px-3 py-2 text-sm outline-none focus:ring-2"
                style={{ borderColor: errors.subtitle ? "#EF4444" : "#E5E7EB", color: "#0D2B52" }}
              />
              {errors.subtitle && <p className="text-xs text-red-500 mt-1">{errors.subtitle}</p>}
            </div>

            {/* 가격 */}
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">
                가격 (1인 기준) <span className="text-red-500">*</span>
              </label>
              <div className="flex items-center border rounded-xl overflow-hidden" style={{ borderColor: errors.price ? "#EF4444" : "#E5E7EB" }}>
                <input
                  type="number"
                  value={form.price || ""}
                  onChange={(e) => set("price", Number(e.target.value))}
                  placeholder="75000"
                  className="flex-1 px-3 py-2 text-sm outline-none"
                  style={{ color: "#0D2B52" }}
                />
                <span className="px-3 text-sm text-gray-400 bg-gray-50 self-stretch flex items-center border-l border-gray-200">원</span>
              </div>
              {form.price > 0 && (
                <p className="text-xs text-gray-400 mt-1">{formatPrice(form.price)}</p>
              )}
              {errors.price && <p className="text-xs text-red-500 mt-1">{errors.price}</p>}
            </div>

            {/* 소요시간 */}
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">
                소요 시간 <span className="text-red-500">*</span>
              </label>
              <input
                value={form.duration}
                onChange={(e) => set("duration", e.target.value)}
                placeholder="약 10분"
                className="w-full border rounded-xl px-3 py-2 text-sm outline-none focus:ring-2"
                style={{ borderColor: errors.duration ? "#EF4444" : "#E5E7EB", color: "#0D2B52" }}
              />
              {errors.duration && <p className="text-xs text-red-500 mt-1">{errors.duration}</p>}
            </div>

            {/* 이미지 슬롯 */}
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-2">
                상품 이미지 <span className="text-xs text-gray-400 font-normal">(최대 3장)</span>
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[0, 1, 2].map((idx) => {
                  const src = form.images?.[idx];
                  return (
                    <div key={idx} className="relative aspect-square">
                      {src ? (
                        <>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={src}
                            alt={`이미지 ${idx + 1}`}
                            className="w-full h-full object-cover rounded-xl"
                          />
                          <button
                            onClick={() => removeImage(idx)}
                            className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 flex items-center justify-center hover:bg-black/80"
                          >
                            <X size={10} className="text-white" />
                          </button>
                          <span className="absolute bottom-1 left-1 text-[10px] bg-black/50 text-white rounded px-1">
                            {idx + 1}
                          </span>
                        </>
                      ) : (
                        <button
                          onClick={() => fileRefs[idx].current?.click()}
                          className="w-full h-full rounded-xl border-2 border-dashed border-gray-200 hover:border-gray-300 flex flex-col items-center justify-center gap-1 transition-colors bg-gray-50 hover:bg-gray-100"
                        >
                          <ImagePlus size={18} className="text-gray-300" />
                          <span className="text-[10px] text-gray-300">추가</span>
                        </button>
                      )}
                      <input
                        ref={fileRefs[idx]}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) handleImageFile(idx, f);
                          e.target.value = "";
                        }}
                      />
                    </div>
                  );
                })}
              </div>
              {/* 슬라이드 미리보기 */}
              {(form.images?.length ?? 0) > 0 && (
                <div className="mt-2 relative rounded-xl overflow-hidden bg-gray-100" style={{ aspectRatio: "16/9" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={form.images![Math.min(slideIdx, form.images!.length - 1)]}
                    alt="슬라이드 미리보기"
                    className="w-full h-full object-cover"
                  />
                  {form.images!.length > 1 && (
                    <>
                      <button
                        onClick={() => setSlideIdx((i) => Math.max(0, i - 1))}
                        disabled={slideIdx === 0}
                        className="absolute left-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-black/40 flex items-center justify-center disabled:opacity-30"
                      >
                        <ChevronLeft size={14} className="text-white" />
                      </button>
                      <button
                        onClick={() => setSlideIdx((i) => Math.min(form.images!.length - 1, i + 1))}
                        disabled={slideIdx === form.images!.length - 1}
                        className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-black/40 flex items-center justify-center disabled:opacity-30"
                      >
                        <ChevronRight size={14} className="text-white" />
                      </button>
                      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                        {form.images!.map((_, i) => (
                          <button
                            key={i}
                            onClick={() => setSlideIdx(i)}
                            className="w-1.5 h-1.5 rounded-full transition-colors"
                            style={{ background: i === slideIdx ? "white" : "rgba(255,255,255,0.4)" }}
                          />
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* 색상 */}
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-2">대표 색상</label>
              <div className="flex gap-2 flex-wrap">
                {COLOR_PALETTE.map((c) => (
                  <button
                    key={c.value}
                    onClick={() => set("color", c.value)}
                    className="w-8 h-8 rounded-lg transition-all"
                    style={{
                      background: c.value,
                      outline: form.color === c.value ? `3px solid ${c.value}` : "none",
                      outlineOffset: 2,
                      boxShadow: form.color === c.value ? "0 0 0 2px white, 0 0 0 4px " + c.value : "none",
                    }}
                    title={c.label}
                  />
                ))}
              </div>
            </div>

            {/* 토글: 인기 상품 / 판매 중 */}
            <div className="flex gap-4">
              <button
                onClick={() => set("popular", !form.popular)}
                className="flex items-center gap-2 text-sm"
                style={{ color: form.popular ? "#FF8A00" : "#9CA3AF" }}
              >
                <Star size={16} fill={form.popular ? "#FF8A00" : "none"} />
                인기 상품 뱃지
              </button>
              <button
                onClick={() => set("active", !form.active)}
                className="flex items-center gap-2 text-sm"
                style={{ color: form.active ? "#10B981" : "#9CA3AF" }}
              >
                {form.active ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
                {form.active ? "판매 중" : "비활성"}
              </button>
            </div>

            {/* 미리보기 */}
            <div className="rounded-xl p-4 border-2" style={{ borderColor: form.color + "40", background: form.color + "08" }}>
              <p className="text-xs text-gray-400 mb-2">미리보기</p>
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="font-bold text-sm" style={{ color: "#0D2B52" }}>{form.name || "상품명"}</span>
                    {form.popular && (
                      <span className="text-xs px-1.5 py-0.5 rounded-full font-bold text-white" style={{ background: "#FF8A00" }}>인기</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400">{form.subtitle || "부제목"}</p>
                  <div className="flex gap-2 text-xs text-gray-500 mt-1">
                    {form.duration && <span>⏱ {form.duration}</span>}
                  </div>
                </div>
                <div className="text-right">
                  <span className="font-black text-lg" style={{ color: form.color }}>
                    {form.price > 0 ? formatPrice(form.price) : "0원"}
                  </span>
                  <p className="text-xs text-gray-400">1인 기준</p>
                </div>
              </div>
            </div>
          </div>

          {/* 버튼 */}
          <div className="flex gap-2 px-6 pb-6">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-500 hover:bg-gray-50"
            >
              취소
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 py-2.5 rounded-xl text-sm font-medium text-white disabled:opacity-60"
              style={{ background: "#0D2B52" }}
            >
              {saving ? "저장 중…" : isEdit ? "수정 완료" : "상품 추가"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// ── 옵션 폼 모달 ─────────────────────────────────────────────────
function OptionModal({
  initial,
  onSave,
  onClose,
}: {
  initial?: ProductOption;
  onSave: (o: ProductOption) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState<Omit<ProductOption, "id">>(
    initial ? { ...initial } : { ...EMPTY_OPTION }
  );
  const [errors, setErrors] = useState<Record<string, string>>({});

  function set<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [k]: v }));
    setErrors((prev) => ({ ...prev, [k]: "" }));
  }

  function handleSave() {
    const e: Record<string, string> = {};
    if (!form.label.trim()) e.label = "옵션명을 입력하세요";
    if (!form.price || form.price <= 0) e.price = "가격을 입력하세요";
    if (Object.keys(e).length > 0) { setErrors(e); return; }
    onSave({ ...form, id: initial?.id ?? genId() });
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="font-bold" style={{ color: "#0D2B52" }}>
            {initial ? "옵션 수정" : "옵션 추가"}
          </h2>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg">
            <X size={16} className="text-gray-400" />
          </button>
        </div>
        <div className="px-5 py-4 space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">옵션명 <span className="text-red-500">*</span></label>
            <input
              value={form.label}
              onChange={(e) => set("label", e.target.value)}
              placeholder="사진 패키지"
              className="w-full border rounded-xl px-3 py-2 text-sm outline-none focus:ring-2"
              style={{ borderColor: errors.label ? "#EF4444" : "#E5E7EB", color: "#0D2B52" }}
            />
            {errors.label && <p className="text-xs text-red-500 mt-1">{errors.label}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">설명</label>
            <input
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              placeholder="고프로 사진 30장"
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2"
              style={{ color: "#0D2B52" }}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">가격 <span className="text-red-500">*</span></label>
            <div className="flex items-center border rounded-xl overflow-hidden" style={{ borderColor: errors.price ? "#EF4444" : "#E5E7EB" }}>
              <input
                type="number"
                value={form.price || ""}
                onChange={(e) => set("price", Number(e.target.value))}
                placeholder="30000"
                className="flex-1 px-3 py-2 text-sm outline-none"
                style={{ color: "#0D2B52" }}
              />
              <span className="px-3 text-sm text-gray-400 bg-gray-50 self-stretch flex items-center border-l border-gray-200">원</span>
            </div>
            {errors.price && <p className="text-xs text-red-500 mt-1">{errors.price}</p>}
          </div>
          <button
            onClick={() => set("active", !form.active)}
            className="flex items-center gap-2 text-sm"
            style={{ color: form.active ? "#10B981" : "#9CA3AF" }}
          >
            {form.active ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
            {form.active ? "판매 중" : "비활성"}
          </button>
        </div>
        <div className="flex gap-2 px-5 pb-5">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-500">취소</button>
          <button onClick={handleSave} className="flex-1 py-2.5 rounded-xl text-sm font-medium text-white" style={{ background: "#0D2B52" }}>
            {initial ? "수정" : "추가"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── 삭제 확인 ────────────────────────────────────────────────────
function ConfirmDialog({ message, onConfirm, onCancel }: { message: string; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-xs p-6 shadow-2xl text-center">
        <p className="text-sm text-gray-600 mb-5">{message}</p>
        <div className="flex gap-2">
          <button onClick={onCancel} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-500">취소</button>
          <button onClick={onConfirm} className="flex-1 py-2.5 rounded-xl text-sm font-medium text-white" style={{ background: "#EF4444" }}>삭제</button>
        </div>
      </div>
    </div>
  );
}

// ── 메인 ────────────────────────────────────────────────────────
export default function ProductsPage() {
  const { products, options } = useProducts();
  const [productModal, setProductModal] = useState<"add" | Product | null>(null);
  const [optionModal, setOptionModal] = useState<"add" | ProductOption | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ type: "product" | "option"; id: string; name: string } | null>(null);
  const [showOptions, setShowOptions] = useState(true);

  const sortedProducts = [...products].sort((a, b) => a.sortOrder - b.sortOrder);
  const activeCount = products.filter((p) => p.active).length;

  async function handleSaveProduct(p: Product) {
    if (productModal === "add") await addProduct(p);
    else await updateProduct(p);
    setProductModal(null);
  }

  async function handleSaveOption(o: ProductOption) {
    if (optionModal === "add") await addOption(o);
    else await updateOption(o);
    setOptionModal(null);
  }

  function handleDelete() {
    if (!deleteTarget) return;
    if (deleteTarget.type === "product") deleteProduct(deleteTarget.id);
    else deleteOption(deleteTarget.id);
    setDeleteTarget(null);
  }

  return (
    <div className="p-6 space-y-6" style={{ background: "#F5F7FA", minHeight: "100vh" }}>
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "#0D2B52" }}>상품 관리</h1>
          <p className="text-sm text-gray-500 mt-0.5">체험 상품 등록 · 수정 · 옵션 관리</p>
        </div>
        <button
          onClick={() => setProductModal("add")}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-sm font-medium shadow-sm hover:opacity-90"
          style={{ background: "#0D2B52" }}
        >
          <Plus size={16} />
          상품 추가
        </button>
      </div>

      {/* 요약 카드 */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "전체 상품", value: `${products.length}개`, color: "#2A7AE2", Icon: Package },
          { label: "판매 중", value: `${activeCount}개`, color: "#10B981", Icon: Tag },
          { label: "추가 옵션", value: `${options.filter((o) => o.active).length}개`, color: "#FF8A00", Icon: Camera },
        ].map(({ label, value, color, Icon }) => (
          <div key={label} className="bg-white rounded-xl px-4 py-3.5 shadow-sm border border-gray-100 flex items-center gap-3">
            <span className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: color + "18" }}>
              <Icon size={17} style={{ color }} />
            </span>
            <div>
              <div className="text-xl font-bold" style={{ color: "#0D2B52" }}>{value}</div>
              <div className="text-xs text-gray-400">{label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* 상품 목록 */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-sm" style={{ color: "#0D2B52" }}>체험 상품</h2>
          <p className="text-xs text-gray-400">총 {products.length}개</p>
        </div>

        {sortedProducts.map((product) => (
          <div
            key={product.id}
            className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex items-center gap-4"
          >
            {/* 썸네일 또는 색상 미리보기 */}
            <div className="w-14 h-14 rounded-xl flex-shrink-0 overflow-hidden" style={{ background: product.color + "18" }}>
              {product.images?.[0] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={product.images[0]} alt={product.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <span className="text-2xl font-black" style={{ color: product.color }}>
                    {product.name.slice(0, 1)}
                  </span>
                </div>
              )}
            </div>

            {/* 상품 정보 */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="font-bold" style={{ color: "#0D2B52" }}>{product.name}</span>
                {product.popular && (
                  <span className="text-xs px-1.5 py-0.5 rounded-full font-bold text-white" style={{ background: "#FF8A00" }}>인기</span>
                )}
                <span
                  className="text-xs px-1.5 py-0.5 rounded-full font-medium"
                  style={{
                    background: product.active ? "#ECFDF5" : "#F3F4F6",
                    color: product.active ? "#10B981" : "#9CA3AF",
                  }}
                >
                  {product.active ? "판매 중" : "비활성"}
                </span>
              </div>
              <p className="text-xs text-gray-400 mb-1.5">{product.subtitle}</p>
              <div className="flex gap-3 text-xs text-gray-500">
                <span className="flex items-center gap-1"><Clock size={11} />{product.duration}</span>
              </div>
            </div>

            {/* 가격 */}
            <div className="text-right flex-shrink-0">
              <div className="text-lg font-black" style={{ color: product.color }}>
                {formatPrice(product.price)}
              </div>
              <div className="text-xs text-gray-400">1인 기준</div>
            </div>

            {/* 액션 */}
            <div className="flex gap-1 flex-shrink-0">
              <button
                onClick={() => updateProduct({ ...product, active: !product.active })}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                title={product.active ? "비활성화" : "활성화"}
              >
                {product.active
                  ? <ToggleRight size={18} style={{ color: "#10B981" }} />
                  : <ToggleLeft size={18} className="text-gray-300" />
                }
              </button>
              <button
                onClick={() => setProductModal(product)}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                title="수정"
              >
                <Edit3 size={16} className="text-gray-400" />
              </button>
              <button
                onClick={() => setDeleteTarget({ type: "product", id: product.id, name: product.name })}
                className="p-2 rounded-lg hover:bg-red-50 transition-colors"
                title="삭제"
              >
                <Trash2 size={16} className="text-red-400" />
              </button>
            </div>
          </div>
        ))}

        {products.length === 0 && (
          <div className="bg-white rounded-2xl p-10 text-center border border-dashed border-gray-200">
            <Package size={32} className="text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-400">등록된 상품이 없습니다</p>
            <button
              onClick={() => setProductModal("add")}
              className="mt-3 text-sm font-medium"
              style={{ color: "#2A7AE2" }}
            >
              + 첫 상품 추가
            </button>
          </div>
        )}
      </div>

      {/* 추가 옵션 */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <button
            className="flex items-center gap-2 font-semibold text-sm"
            style={{ color: "#0D2B52" }}
            onClick={() => setShowOptions(!showOptions)}
          >
            추가 옵션
            {showOptions ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          <button
            onClick={() => setOptionModal("add")}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium text-white"
            style={{ background: "#2A7AE2" }}
          >
            <Plus size={12} />
            옵션 추가
          </button>
        </div>

        {showOptions && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            {options.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-sm text-gray-400">등록된 옵션이 없습니다</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {options.map((opt) => (
                  <div key={opt.id} className="flex items-center gap-4 px-5 py-4">
                    <div
                      className="w-9 h-9 rounded-xl flex-shrink-0 flex items-center justify-center"
                      style={{ background: "#F5F7FA" }}
                    >
                      {opt.label.includes("사진") || opt.label.includes("photo")
                        ? <Camera size={16} className="text-gray-400" />
                        : <Video size={16} className="text-gray-400" />
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium" style={{ color: "#0D2B52" }}>{opt.label}</span>
                        <span
                          className="text-xs px-1.5 py-0.5 rounded-full"
                          style={{
                            background: opt.active ? "#ECFDF5" : "#F3F4F6",
                            color: opt.active ? "#10B981" : "#9CA3AF",
                          }}
                        >
                          {opt.active ? "판매 중" : "비활성"}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">{opt.description}</p>
                    </div>
                    <div className="text-sm font-bold flex-shrink-0" style={{ color: "#0D2B52" }}>
                      +{formatPrice(opt.price)}
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      <button
                        onClick={() => updateOption({ ...opt, active: !opt.active })}
                        className="p-1.5 rounded-lg hover:bg-gray-100"
                      >
                        {opt.active
                          ? <ToggleRight size={16} style={{ color: "#10B981" }} />
                          : <ToggleLeft size={16} className="text-gray-300" />
                        }
                      </button>
                      <button onClick={() => setOptionModal(opt)} className="p-1.5 rounded-lg hover:bg-gray-100">
                        <Edit3 size={14} className="text-gray-400" />
                      </button>
                      <button
                        onClick={() => setDeleteTarget({ type: "option", id: opt.id, name: opt.label })}
                        className="p-1.5 rounded-lg hover:bg-red-50"
                      >
                        <Trash2 size={14} className="text-red-400" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 모달들 */}
      {productModal !== null && (
        <ProductModal
          initial={productModal === "add" ? undefined : productModal}
          onSave={handleSaveProduct}
          onClose={() => setProductModal(null)}
        />
      )}
      {optionModal !== null && (
        <OptionModal
          initial={optionModal === "add" ? undefined : optionModal}
          onSave={handleSaveOption}
          onClose={() => setOptionModal(null)}
        />
      )}
      {deleteTarget && (
        <ConfirmDialog
          message={`"${deleteTarget.name}"을(를) 삭제할까요? 이 작업은 되돌릴 수 없습니다.`}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
