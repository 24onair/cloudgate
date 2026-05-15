"use client";

import { useState, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Star, Upload, X, CheckCircle2, Wind, ArrowLeft, Image as ImageIcon } from "lucide-react";
import { addReview } from "@/lib/reviewStore";
import { usePageContent } from "@/lib/pageContentStore";

// ── 이미지 업로드 헬퍼 ──────────────────────────────────────────
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

// ── 별점 선택기 ──────────────────────────────────────────────────
function StarPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          onMouseEnter={() => setHover(n)}
          onMouseLeave={() => setHover(0)}
          className="transition-transform hover:scale-110"
        >
          <Star
            className="w-9 h-9"
            fill={(hover || value) >= n ? "#F54E00" : "none"}
            stroke={(hover || value) >= n ? "#F54E00" : "#bfc1b7"}
          />
        </button>
      ))}
    </div>
  );
}

// ── 이미지 업로드 슬롯 ───────────────────────────────────────────
function ImageSlot({
  image, onAdd, onRemove, index,
}: { image: string | null; onAdd: (file: File) => void; onRemove: () => void; index: number }) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <div
      className="relative rounded-xl overflow-hidden"
      style={{ aspectRatio: "1/1", border: image ? "none" : "2px dashed #bfc1b7", backgroundColor: image ? undefined : "#f4f4f4" }}
    >
      {image ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={image} alt={`사진 ${index + 1}`} className="w-full h-full object-cover" />
          <button
            type="button"
            onClick={onRemove}
            className="absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center text-white"
            style={{ backgroundColor: "rgba(0,0,0,0.55)" }}
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="w-full h-full flex flex-col items-center justify-center gap-1 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <ImageIcon className="w-6 h-6" />
          <span className="text-xs">사진 {index + 1}</span>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) onAdd(f); e.target.value = ""; }}
          />
        </button>
      )}
    </div>
  );
}

// ── 메인 폼 ─────────────────────────────────────────────────────
function ReviewForm() {
  const router      = useRouter();
  const params      = useSearchParams();
  const content     = usePageContent();

  const initName    = params.get("name")    ?? "";
  const initProduct = params.get("product") ?? "";

  const [name,    setName]    = useState(initName);
  const [product, setProduct] = useState(initProduct);
  const [rating,  setRating]  = useState(5);
  const [text,    setText]    = useState("");
  const [images,  setImages]  = useState<(string | null)[]>([null, null, null]);
  const [loading, setLoading] = useState(false);
  const [done,    setDone]    = useState(false);

  const PRODUCTS = content.products.map((p) => p.name);

  async function handleImageAdd(index: number, file: File) {
    setLoading(true);
    const url = await uploadImage(file, "reviews");
    if (url) setImages((prev) => prev.map((img, i) => i === index ? url : img));
    setLoading(false);
  }

  function removeImage(index: number) {
    setImages((prev) => prev.map((img, i) => i === index ? null : img));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !text.trim() || rating === 0) return;
    addReview({
      name: name.trim(),
      date: new Date().toISOString().slice(0, 10),
      rating,
      product: product || "체험비행",
      text: text.trim(),
      images: images.filter((img): img is string => img !== null),
    });
    setDone(true);
  }

  // ── 완료 화면 ────────────────────────────────────────────────
  if (done) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center" style={{ backgroundColor: "#fdfdf8" }}>
        <div className="w-20 h-20 rounded-full flex items-center justify-center mb-6" style={{ backgroundColor: "#eeefe9" }}>
          <CheckCircle2 className="w-10 h-10" style={{ color: "#23251d" }} />
        </div>
        <h2 className="text-2xl font-black mb-2" style={{ color: "#23251d" }}>후기 등록 완료!</h2>
        <p className="text-sm mb-8" style={{ color: "#65675e" }}>소중한 후기 감사합니다. 검토 후 게시될 예정입니다.</p>
        <button
          onClick={() => router.push("/")}
          className="w-full max-w-xs py-4 rounded-2xl font-bold text-white"
          style={{ backgroundColor: "#1e1f23" }}
        >
          홈으로 돌아가기
        </button>
      </div>
    );
  }

  // ── 폼 화면 ─────────────────────────────────────────────────
  return (
    <div className="min-h-screen" style={{ backgroundColor: "#fdfdf8" }}>
      {/* 헤더 */}
      <div className="sticky top-0 z-10 px-5 h-14 flex items-center gap-3 border-b" style={{ backgroundColor: "rgba(253,253,248,0.97)", borderColor: "#e5e7e0", backdropFilter: "blur(12px)" }}>
        <button onClick={() => router.back()} className="p-1.5 rounded hover:bg-gray-100 transition-colors" style={{ color: "#65675e" }}>
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2">
          <Wind className="w-5 h-5" style={{ color: "#F54E00" }} />
          <span className="font-bold" style={{ color: "#23251d" }}>구름상회</span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="max-w-lg mx-auto px-5 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-black mb-1" style={{ color: "#23251d" }}>비행 후기 작성</h1>
          <p className="text-sm" style={{ color: "#65675e" }}>소중한 경험을 공유해 주세요</p>
        </div>

        {/* 별점 */}
        <div className="rounded-2xl p-5 border" style={{ backgroundColor: "#fdfdf8", borderColor: "#bfc1b7" }}>
          <p className="text-sm font-semibold mb-3" style={{ color: "#23251d" }}>비행은 어떠셨나요?</p>
          <StarPicker value={rating} onChange={setRating} />
          <p className="text-xs mt-2" style={{ color: "#9ea096" }}>
            {["", "별로였어요", "아쉬웠어요", "괜찮았어요", "좋았어요", "최고였어요!"][rating]}
          </p>
        </div>

        {/* 이름 + 상품 */}
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: "#9ea096" }}>이름</label>
            <input
              required
              className="w-full px-4 py-3 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
              style={{ borderColor: "#bfc1b7", backgroundColor: "#fdfdf8", color: "#23251d" }}
              placeholder="홍길동"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: "#9ea096" }}>이용 상품</label>
            <select
              className="w-full px-4 py-3 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 bg-white"
              style={{ borderColor: "#bfc1b7", color: "#23251d" }}
              value={product}
              onChange={(e) => setProduct(e.target.value)}
            >
              <option value="">상품 선택 (선택 사항)</option>
              {PRODUCTS.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
        </div>

        {/* 후기 텍스트 */}
        <div>
          <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: "#9ea096" }}>후기 내용</label>
          <textarea
            required
            rows={5}
            className="w-full px-4 py-3 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 resize-none"
            style={{ borderColor: "#bfc1b7", backgroundColor: "#fdfdf8", color: "#23251d", lineHeight: 1.65 }}
            placeholder="비행 경험을 자유롭게 작성해 주세요 (최소 10자)"
            minLength={10}
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
        </div>

        {/* 이미지 업로드 */}
        <div>
          <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: "#9ea096" }}>
            사진 첨부 <span className="normal-case font-normal" style={{ color: "#bfc1b7" }}>최대 3장 · 선택사항</span>
          </label>
          <div className="grid grid-cols-3 gap-3">
            {images.map((img, i) => (
              <ImageSlot
                key={i}
                index={i}
                image={img}
                onAdd={(file) => handleImageAdd(i, file)}
                onRemove={() => removeImage(i)}
              />
            ))}
          </div>
        </div>

        {/* 제출 */}
        <button
          type="submit"
          disabled={loading || !name.trim() || !text.trim() || text.length < 10}
          className="w-full py-4 rounded-2xl font-bold text-white transition-opacity disabled:opacity-40"
          style={{ backgroundColor: "#1e1f23" }}
        >
          {loading ? "처리 중…" : "후기 등록하기"}
        </button>

        <p className="text-xs text-center" style={{ color: "#bfc1b7" }}>
          등록된 후기는 검토 후 랜딩 페이지에 게시됩니다
        </p>
      </form>
    </div>
  );
}

export default function ReviewPage() {
  return (
    <Suspense>
      <ReviewForm />
    </Suspense>
  );
}
