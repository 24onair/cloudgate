"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Upload, Trash2, Eye, EyeOff, ImageIcon, X, Settings, CheckCircle2, Loader2, Plus, ChevronUp, ChevronDown, MessageSquare, Wind, Type, Phone, MessageCircle, MapPin } from "lucide-react";
import {
  useHeroBg, setHeroBg, clearHeroBgImage,
  useCtaBg,  setCtaBg,  clearCtaBgImage,
  useFaqBg,  setFaqBg,  clearFaqBgImage,
} from "@/lib/heroStore";
import { useFaqs, addFaq, deleteFaq, updateFaq, moveFaq, FaqEntry } from "@/lib/faqStore";
import { useLogo, setLogo, clearLogoImage } from "@/lib/logoStore";
import { useFooter, setFooter, FooterConfig } from "@/lib/footerStore";
import {
  usePageContent, setPageContent,
  PageContent, ProductItem, SafetyItem,
} from "@/lib/pageContentStore";

// ── 이미지 압축 (localStorage 용량 초과 방지) ──────────────────────
function compressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const MAX = 1920;
      let { width, height } = img;
      if (width > MAX || height > MAX) {
        if (width > height) { height = Math.round((height * MAX) / width); width = MAX; }
        else                { width  = Math.round((width  * MAX) / height); height = MAX; }
      }
      const canvas = document.createElement("canvas");
      canvas.width = width; canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) { reject(new Error("canvas context unavailable")); return; }
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL("image/jpeg", 0.75));
    };
    img.onerror = reject;
    img.src = url;
  });
}

// ── 로고 설정 카드 ────────────────────────────────────────────────
function LogoCard() {
  const logo    = useLogo();
  const fileRef = useRef<HTMLInputElement>(null);
  const [dropHover,  setDropHover]  = useState(false);
  const [processing, setProcessing] = useState(false);
  const [saved,      setSaved]      = useState(false);
  const [editText,   setEditText]   = useState(false);
  const [textDraft,  setTextDraft]  = useState("");

  function flash() { setSaved(true); setTimeout(() => setSaved(false), 2000); }

  const handleFile = useCallback(async (file: File) => {
    if (!file.type.startsWith("image/")) return;
    setProcessing(true);
    try {
      // 로고는 최대 400px로 압축 (작고 선명하게)
      const compressed = await new Promise<string>((resolve, reject) => {
        const img = new Image();
        const url = URL.createObjectURL(file);
        img.onload = () => {
          URL.revokeObjectURL(url);
          const MAX = 400;
          let { width, height } = img;
          if (width > MAX || height > MAX) {
            if (width > height) { height = Math.round((height * MAX) / width); width = MAX; }
            else                { width  = Math.round((width  * MAX) / height); height = MAX; }
          }
          const canvas = document.createElement("canvas");
          canvas.width = width; canvas.height = height;
          const ctx = canvas.getContext("2d");
          if (!ctx) { reject(new Error("canvas context unavailable")); return; }
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL("image/png", 1.0)); // PNG로 저장 (투명도 보존)
        };
        img.onerror = reject;
        img.src = url;
      });
      setLogo({ imageDataUrl: compressed });
      flash();
    } catch { alert("이미지 처리 중 오류가 발생했습니다."); }
    finally   { setProcessing(false); }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDropHover(false);
    const f = e.dataTransfer.files[0]; if (f) handleFile(f);
  }, [handleFile]);

  // 네비 미리보기에 쓸 텍스트
  const displayText = logo.text || "구름상회";
  const showText    = !logo.imageDataUrl || logo.showText;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
      {/* 헤더 */}
      <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <Wind size={14} style={{ color: "#0D2B52" }} />
          <div>
            <h2 className="font-semibold text-sm" style={{ color: "#0D2B52" }}>로고 설정</h2>
            <p className="text-xs text-gray-400 mt-0.5">네비게이션 & 푸터에 표시되는 브랜드 로고</p>
          </div>
        </div>
        {saved && (
          <span className="flex items-center gap-1 text-xs font-medium text-green-600 bg-green-50 px-2.5 py-1 rounded-full">
            <CheckCircle2 size={11} /> 저장됨
          </span>
        )}
      </div>

      <div className="grid grid-cols-5 gap-6 px-5 py-5">
        {/* 좌: 컨트롤 */}
        <div className="col-span-2 space-y-4">

          {/* 로고 이미지 업로드 */}
          <div>
            <p className="text-xs font-medium mb-2" style={{ color: "#0D2B52" }}>로고 이미지</p>
            {processing ? (
              <div className="border-2 border-blue-200 rounded-xl p-5 text-center bg-blue-50">
                <Loader2 size={20} className="mx-auto mb-1 text-blue-400 animate-spin" />
                <p className="text-xs text-blue-500 font-medium">처리 중…</p>
              </div>
            ) : logo.imageDataUrl ? (
              <div className="relative rounded-xl overflow-hidden border border-gray-200 bg-[#f4f4f4] flex items-center justify-center" style={{ height: 100 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={logo.imageDataUrl} alt="로고" className="max-h-16 max-w-full object-contain" />
                <button
                  onClick={() => { clearLogoImage(); flash(); }}
                  className="absolute top-1.5 right-1.5 bg-black/60 text-white rounded-full p-1 hover:bg-black/80 transition-colors"
                >
                  <X size={11} />
                </button>
                <button
                  onClick={() => fileRef.current?.click()}
                  className="absolute bottom-1.5 right-1.5 flex items-center gap-1 bg-black/60 text-white rounded-lg px-2 py-1 text-xs font-medium hover:bg-black/80 transition-colors"
                >
                  <Upload size={10} /> 교체
                </button>
              </div>
            ) : (
              <div
                className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all ${dropHover ? "border-blue-400 bg-blue-50" : "border-gray-200 hover:border-blue-300 hover:bg-blue-50"}`}
                onClick={() => fileRef.current?.click()}
                onDrop={handleDrop}
                onDragOver={(e) => { e.preventDefault(); setDropHover(true); }}
                onDragLeave={() => setDropHover(false)}
              >
                <Upload size={20} className="mx-auto mb-1.5 text-gray-300" />
                <p className="text-xs text-gray-500">클릭 또는 드래그로 업로드</p>
                <p className="text-[10px] text-gray-400 mt-0.5">PNG 권장 (투명 배경 지원)</p>
              </div>
            )}
            <input
              ref={fileRef} type="file" accept="image/*" className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }}
            />
          </div>

          {/* 텍스트 타이틀 */}
          <div className="border-t border-gray-100 pt-4 space-y-3">
            <p className="text-xs font-medium" style={{ color: "#0D2B52" }}>텍스트 타이틀</p>

            {/* 텍스트 표시 여부 (로고 있을 때만 토글 의미 있음) */}
            {logo.imageDataUrl && (
              <div className="flex items-center justify-between">
                <p className="text-xs text-gray-500">로고와 함께 텍스트 표시</p>
                <button
                  onClick={() => { setLogo({ showText: !logo.showText }); flash(); }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all"
                  style={{
                    background:  logo.showText ? "#0D2B52" : "#fff",
                    borderColor: logo.showText ? "#0D2B52" : "#E5E7EB",
                    color:       logo.showText ? "#fff"    : "#6B7280",
                  }}
                >
                  {logo.showText ? <><Eye size={11} /> 표시 중</> : <><EyeOff size={11} /> 숨김</>}
                </button>
              </div>
            )}

            {/* 텍스트 편집 */}
            {(!logo.imageDataUrl || logo.showText) && (
              editText ? (
                <div className="flex gap-2">
                  <input
                    autoFocus
                    className="flex-1 text-sm px-3 py-1.5 rounded-lg border border-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-300"
                    value={textDraft}
                    onChange={(e) => setTextDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") { setLogo({ text: textDraft.trim() || "구름상회" }); setEditText(false); flash(); }
                      if (e.key === "Escape") { setEditText(false); }
                    }}
                  />
                  <button
                    onClick={() => { setLogo({ text: textDraft.trim() || "구름상회" }); setEditText(false); flash(); }}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white"
                    style={{ backgroundColor: "#0D2B52" }}
                  >
                    저장
                  </button>
                  <button
                    onClick={() => setEditText(false)}
                    className="px-3 py-1.5 rounded-lg text-xs border border-gray-200 text-gray-500"
                  >
                    취소
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-gray-50 border border-gray-100">
                  <div className="flex items-center gap-2">
                    <Type size={12} className="text-gray-400" />
                    <span className="text-sm font-semibold" style={{ color: "#23251d" }}>{displayText}</span>
                  </div>
                  <button
                    onClick={() => { setTextDraft(logo.text || "구름상회"); setEditText(true); }}
                    className="text-xs text-blue-500 hover:text-blue-700 font-medium transition-colors"
                  >
                    수정
                  </button>
                </div>
              )
            )}
          </div>
        </div>

        {/* 우: 미리보기 */}
        <div className="col-span-3">
          <p className="text-xs font-semibold mb-2" style={{ color: "#0D2B52" }}>미리보기</p>

          {/* 네비 미리보기 */}
          <div className="rounded-xl border border-gray-200 overflow-hidden mb-3">
            <div className="flex items-center justify-between px-4 py-2.5 bg-white border-b border-gray-100">
              <p className="text-[10px] text-gray-400 font-medium">네비게이션</p>
            </div>
            <div className="px-4 py-3 flex items-center justify-between bg-[#fdfdf8]">
              <div className="flex items-center gap-2">
                {logo.imageDataUrl
                  /* eslint-disable-next-line @next/next/no-img-element */
                  ? <img src={logo.imageDataUrl} alt="로고" className="h-7 w-auto object-contain" />
                  : <Wind size={16} style={{ color: "#F54E00" }} />
                }
                {showText && (
                  <span className="font-bold text-sm" style={{ color: "#23251d" }}>{displayText}</span>
                )}
              </div>
              <div className="flex items-center gap-3 text-xs font-semibold" style={{ color: "#65675e" }}>
                <span>상품 안내</span><span>안전 수칙</span><span>FAQ</span>
              </div>
              <div className="px-3 py-1.5 rounded text-xs font-semibold text-white" style={{ backgroundColor: "#1e1f23" }}>예약하기</div>
            </div>
          </div>

          {/* 푸터 미리보기 */}
          <div className="rounded-xl border border-gray-200 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2.5 bg-white border-b border-gray-100">
              <p className="text-[10px] text-gray-400 font-medium">푸터</p>
            </div>
            <div className="px-4 py-3 flex items-center gap-2" style={{ backgroundColor: "#23251d" }}>
              {logo.imageDataUrl
                /* eslint-disable-next-line @next/next/no-img-element */
                ? <img src={logo.imageDataUrl} alt="로고" className="h-6 w-auto object-contain" style={{ filter: "brightness(0) invert(1)" }} />
                : <Wind size={14} style={{ color: "#F54E00" }} />
              }
              {showText && (
                <span className="font-bold text-sm" style={{ color: "#fdfdf8" }}>{displayText}</span>
              )}
            </div>
          </div>

          <p className="text-[10px] text-gray-400 mt-2">
            {logo.imageDataUrl
              ? logo.showText ? "로고 이미지 + 텍스트 함께 표시"    : "로고 이미지만 표시 (텍스트 숨김)"
              : "로고 이미지 없음 — 기본 아이콘 + 텍스트 표시"
            }
          </p>
        </div>
      </div>
    </div>
  );
}

// ── 표시 영역 조정 (Focal Point Picker) ──────────────────────────
function FocalPointPicker({
  imageDataUrl,
  position,
  onChange,
  onReplace,
  onClear,
  sizeInfo,
}: {
  imageDataUrl: string;
  position: string;
  onChange: (pos: string) => void;
  onReplace: () => void;
  onClear: () => void;
  sizeInfo: string | null;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging   = useRef(false);

  // "50% 50%" → [50, 50]
  const [xPct, yPct] = position.split(" ").map((v) => parseFloat(v));

  function posFromEvent(e: React.PointerEvent | PointerEvent) {
    const rect = containerRef.current!.getBoundingClientRect();
    const x = Math.min(100, Math.max(0, Math.round(((e.clientX - rect.left) / rect.width)  * 100)));
    const y = Math.min(100, Math.max(0, Math.round(((e.clientY - rect.top)  / rect.height) * 100)));
    return `${x}% ${y}%`;
  }

  useEffect(() => {
    const onMove = (e: PointerEvent) => { if (isDragging.current) onChange(posFromEvent(e)); };
    const onUp   = () => { isDragging.current = false; };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup",   onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup",   onUp);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onChange]);

  return (
    <div className="space-y-1.5">
      {/* 이미지 + focal point 오버레이 */}
      <div
        ref={containerRef}
        className="relative rounded-xl overflow-hidden border border-gray-200 select-none"
        style={{ height: 160, cursor: "crosshair" }}
        onPointerDown={(e) => {
          e.preventDefault();
          isDragging.current = true;
          onChange(posFromEvent(e));
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageDataUrl}
          alt=""
          draggable={false}
          className="w-full h-full object-cover pointer-events-none"
          style={{ objectPosition: position }}
        />
        {/* 격자 가이드 (희미하게) */}
        <div className="absolute inset-0 pointer-events-none" style={{
          backgroundImage: "linear-gradient(rgba(255,255,255,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.07) 1px, transparent 1px)",
          backgroundSize: "33.3% 33.3%",
        }} />
        {/* Focal point 인디케이터 */}
        <div
          className="absolute pointer-events-none"
          style={{ left: `${xPct}%`, top: `${yPct}%`, transform: "translate(-50%,-50%)" }}
        >
          {/* 외부 링 */}
          <div className="w-8 h-8 rounded-full border-2 border-white shadow-lg flex items-center justify-center" style={{ backgroundColor: "rgba(245,78,0,0.55)" }}>
            {/* 십자선 */}
            <div className="absolute w-px h-5 bg-white/80" />
            <div className="absolute w-5 h-px bg-white/80" />
            {/* 중심점 */}
            <div className="w-1.5 h-1.5 rounded-full bg-white shadow-sm" />
          </div>
        </div>
        {/* 상단 안내 */}
        <div className="absolute top-1.5 left-1/2 -translate-x-1/2 pointer-events-none">
          <span className="text-[10px] bg-black/55 text-white px-2 py-0.5 rounded-full whitespace-nowrap">
            드래그하여 표시 영역 조정
          </span>
        </div>
        {/* 버튼들 */}
        <button
          onPointerDown={(e) => e.stopPropagation()}
          onClick={onClear}
          className="absolute top-1.5 right-1.5 bg-black/60 text-white rounded-full p-1 hover:bg-black/80 transition-colors"
        >
          <X size={11} />
        </button>
        <button
          onPointerDown={(e) => e.stopPropagation()}
          onClick={onReplace}
          className="absolute bottom-1.5 right-1.5 flex items-center gap-1 bg-black/60 text-white rounded-lg px-2 py-1 text-xs font-medium hover:bg-black/80 transition-colors"
        >
          <Upload size={10} /> 교체
        </button>
        {sizeInfo && (
          <span className="absolute bottom-1.5 left-1.5 text-[10px] bg-black/50 text-white px-1.5 py-0.5 rounded pointer-events-none">
            {sizeInfo}
          </span>
        )}
      </div>
      {/* 좌표 표시 */}
      <p className="text-[10px] text-gray-400 text-right">
        포커스 위치 <span className="font-mono font-semibold text-gray-500">{position}</span>
      </p>
    </div>
  );
}

// ── 공통 배경 이미지 카드 ─────────────────────────────────────────
interface BgCardProps {
  title: string;
  description: string;
  bg: ReturnType<typeof useHeroBg>;
  onSet:   (p: Parameters<typeof setHeroBg>[0]) => void;
  onClear: () => void;
  preview: (bg: BgCardProps["bg"]) => React.ReactNode;
}

function BgCard({ title, description, bg, onSet, onClear, preview }: BgCardProps) {
  const fileRef   = useRef<HTMLInputElement>(null);
  const [dropHover,   setDropHover]   = useState(false);
  const [saved,       setSaved]       = useState(false);
  const [processing,  setProcessing]  = useState(false);
  const [sizeInfo,    setSizeInfo]    = useState<string | null>(null);

  function flash() { setSaved(true); setTimeout(() => setSaved(false), 2000); }

  const handleFile = useCallback(async (file: File) => {
    if (!file.type.startsWith("image/")) return;
    setProcessing(true);
    try {
      const compressed = await compressImage(file);
      const bytes = Math.round((compressed.length * 3) / 4);
      setSizeInfo(`${(bytes / 1024).toFixed(0)}KB 저장됨`);
      onSet({ imageDataUrl: compressed, enabled: true, objectPosition: "50% 50%" });
      flash();
    } catch {
      alert("이미지 처리 중 오류가 발생했습니다.");
    } finally {
      setProcessing(false);
    }
  }, [onSet]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDropHover(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const overlayLabel = bg.overlayOpacity <= 40 ? "밝게" : bg.overlayOpacity <= 65 ? "적당" : "어둡게";

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 space-y-4">
      {/* 헤더 */}
      <div className="flex items-center justify-between px-5 pt-5">
        <div>
          <h2 className="font-semibold text-sm flex items-center gap-1.5" style={{ color: "#0D2B52" }}>
            <ImageIcon size={14} />{title}
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">{description}</p>
        </div>
        {saved && (
          <span className="flex items-center gap-1 text-xs font-medium text-green-600 bg-green-50 px-2.5 py-1 rounded-full">
            <CheckCircle2 size={11} /> 저장됨
          </span>
        )}
      </div>

      <div className="grid grid-cols-5 gap-4 px-5 pb-5">
        {/* 좌: 컨트롤 */}
        <div className="col-span-2 space-y-3">

          {/* 업로드 or 표시 영역 조정 */}
          {processing ? (
            <div className="border-2 border-blue-200 rounded-xl p-6 text-center bg-blue-50">
              <Loader2 size={24} className="mx-auto mb-1.5 text-blue-400 animate-spin" />
              <p className="text-xs text-blue-500 font-medium">이미지 최적화 중…</p>
            </div>
          ) : bg.imageDataUrl ? (
            <FocalPointPicker
              imageDataUrl={bg.imageDataUrl}
              position={bg.objectPosition ?? "50% 50%"}
              onChange={(pos) => { onSet({ objectPosition: pos }); flash(); }}
              onReplace={() => fileRef.current?.click()}
              onClear={() => { onClear(); flash(); }}
              sizeInfo={sizeInfo}
            />
          ) : (
            <div
              className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${dropHover ? "border-blue-400 bg-blue-50" : "border-gray-200 hover:border-blue-300 hover:bg-blue-50"}`}
              onClick={() => fileRef.current?.click()}
              onDrop={handleDrop}
              onDragOver={(e) => { e.preventDefault(); setDropHover(true); }}
              onDragLeave={() => setDropHover(false)}
            >
              <Upload size={22} className="mx-auto mb-1.5 text-gray-300" />
              <p className="text-xs text-gray-500">클릭 또는 드래그로 업로드</p>
              <p className="text-[10px] text-gray-400 mt-0.5">JPG, PNG, WEBP · 자동 최적화</p>
            </div>
          )}
          <input
            ref={fileRef} type="file" accept="image/*" className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }}
          />

          {bg.imageDataUrl && (
            <>
              {/* 사용 여부 토글 */}
              <div className="flex items-center justify-between py-2 border-t border-gray-100">
                <div>
                  <p className="text-xs font-medium" style={{ color: "#0D2B52" }}>배경 이미지 사용</p>
                  <p className="text-[10px] text-gray-400">끄면 기본 배경 표시</p>
                </div>
                <button
                  onClick={() => { onSet({ enabled: !bg.enabled }); flash(); }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all"
                  style={{
                    background:  bg.enabled ? "#0D2B52" : "#fff",
                    borderColor: bg.enabled ? "#0D2B52" : "#E5E7EB",
                    color:       bg.enabled ? "#fff"    : "#6B7280",
                  }}
                >
                  {bg.enabled ? <><Eye size={11} /> 사용 중</> : <><EyeOff size={11} /> 꺼짐</>}
                </button>
              </div>

              {/* 오버레이 농도 */}
              <div className="space-y-1.5 border-t border-gray-100 pt-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium" style={{ color: "#0D2B52" }}>오버레이 농도</p>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: "#EFF6FF", color: "#2A7AE2" }}>
                    {overlayLabel} ({bg.overlayOpacity}%)
                  </span>
                </div>
                <input
                  type="range" min={20} max={90} value={bg.overlayOpacity}
                  onChange={(e) => onSet({ overlayOpacity: Number(e.target.value) })}
                  className="w-full accent-blue-600"
                />
                <div className="flex justify-between text-[10px] text-gray-400">
                  <span>← 이미지 선명</span><span>글씨 뚜렷 →</span>
                </div>
              </div>

              {/* 삭제 */}
              <div className="border-t border-gray-100 pt-2">
                <button
                  onClick={() => { onClear(); flash(); }}
                  className="flex items-center gap-1 text-xs text-red-400 hover:text-red-600 transition-colors"
                >
                  <Trash2 size={11} /> 이미지 삭제하고 기본 배경으로 복원
                </button>
              </div>
            </>
          )}
        </div>

        {/* 우: 미리보기 */}
        <div className="col-span-3">
          <p className="text-xs font-semibold mb-2" style={{ color: "#0D2B52" }}>미리보기</p>
          {preview(bg)}
          <div className="flex items-center gap-2 text-xs text-gray-400 mt-2">
            <span className={`w-2 h-2 rounded-full ${bg.imageDataUrl && bg.enabled ? "bg-green-400" : "bg-gray-300"}`} />
            {bg.imageDataUrl && bg.enabled
              ? `배경 이미지 사용 중 (오버레이 ${bg.overlayOpacity}%)`
              : bg.imageDataUrl ? "이미지 있음 — 현재 꺼짐" : "기본 그라데이션 배경"}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── 히어로 미리보기 ───────────────────────────────────────────────
function HeroPreview({ bg }: { bg: ReturnType<typeof useHeroBg> }) {
  return (
    <div className="relative rounded-xl overflow-hidden flex flex-col items-center justify-center text-center" style={{ height: 220 }}>
      {bg.imageDataUrl && bg.enabled ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={bg.imageDataUrl} alt="" aria-hidden className="absolute inset-0 w-full h-full object-cover" style={{ objectPosition: bg.objectPosition ?? "50% 50%" }} />
          <div className="absolute inset-0" style={{
            background: `linear-gradient(175deg,
              rgba(2,13,31,${(bg.overlayOpacity/100).toFixed(2)}) 0%,
              rgba(13,43,82,${Math.min(1,bg.overlayOpacity/100+0.05).toFixed(2)}) 35%,
              rgba(26,74,128,${Math.max(0,bg.overlayOpacity/100-0.05).toFixed(2)}) 65%,
              rgba(42,122,226,${Math.max(0,bg.overlayOpacity/100-0.15).toFixed(2)}) 100%)`,
          }} />
        </>
      ) : (
        <div className="absolute inset-0" style={{ background: "linear-gradient(175deg, #020d1f 0%, #0D2B52 35%, #1a4a80 60%, #2A7AE2 85%, #5ba3e8 100%)" }} />
      )}
      <div className="relative z-10 space-y-2 px-6">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium"
          style={{ backgroundColor: "rgba(255,138,0,0.15)", border: "1px solid rgba(255,138,0,0.3)", color: "#FF8A00" }}>
          <span className="w-1.5 h-1.5 rounded-full bg-orange-400" /> 오늘 날씨 🟢 비행 최적
        </div>
        <h2 className="text-xl font-black text-white leading-tight">하늘을<br /><span style={{ color: "#FF8A00" }}>직접</span> 날아보세요</h2>
        <p className="text-[10px] text-white/60">전문 파일럿과 함께하는 안전한 체험 패러글라이딩.</p>
        <div className="flex gap-2 justify-center mt-1">
          <div className="px-3 py-1.5 rounded-xl text-[10px] font-bold text-white" style={{ backgroundColor: "#FF8A00" }}>지금 예약하기</div>
          <div className="px-3 py-1.5 rounded-xl text-[10px] font-medium text-white" style={{ backgroundColor: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)" }}>상품 보기</div>
        </div>
      </div>
    </div>
  );
}

// ── CTA 미리보기 ──────────────────────────────────────────────────
function CtaPreview({ bg }: { bg: ReturnType<typeof useCtaBg> }) {
  return (
    <div className="relative rounded-xl overflow-hidden flex flex-col items-center justify-center text-center" style={{ height: 220 }}>
      {bg.imageDataUrl && bg.enabled ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={bg.imageDataUrl} alt="" aria-hidden className="absolute inset-0 w-full h-full object-cover" style={{ objectPosition: bg.objectPosition ?? "50% 50%" }} />
          <div className="absolute inset-0" style={{
            background: `linear-gradient(135deg,
              rgba(13,43,82,${(bg.overlayOpacity/100).toFixed(2)}) 0%,
              rgba(26,74,128,${Math.max(0,bg.overlayOpacity/100-0.05).toFixed(2)}) 50%,
              rgba(42,122,226,${Math.max(0,bg.overlayOpacity/100-0.15).toFixed(2)}) 100%)`,
          }} />
        </>
      ) : (
        <div className="absolute inset-0" style={{ background: "linear-gradient(135deg, #0D2B52 0%, #1a4a80 50%, #2A7AE2 100%)" }} />
      )}
      <div className="relative z-10 space-y-2 px-6">
        <p className="text-white/50 text-[9px] tracking-widest">READY TO FLY?</p>
        <h2 className="text-xl font-black text-white">오늘, 하늘을<br/>날아보세요</h2>
        <p className="text-white/60 text-[10px]">주말 슬롯이 빠르게 마감됩니다</p>
        <div className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white mt-1" style={{ backgroundColor: "#FF8A00" }}>
          지금 예약하기 →
        </div>
      </div>
    </div>
  );
}

// ── FAQ 섹션 미리보기 ─────────────────────────────────────────────
function FaqPreview({ bg }: { bg: ReturnType<typeof useFaqBg> }) {
  return (
    <div className="relative rounded-xl overflow-hidden flex flex-col justify-center" style={{ height: 220, padding: "20px 24px" }}>
      {bg.imageDataUrl && bg.enabled ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={bg.imageDataUrl} alt="" aria-hidden className="absolute inset-0 w-full h-full object-cover" style={{ objectPosition: bg.objectPosition ?? "50% 50%" }} />
          <div className="absolute inset-0" style={{
            background: `linear-gradient(175deg,
              rgba(2,13,31,${(bg.overlayOpacity/100).toFixed(2)}) 0%,
              rgba(13,43,82,${Math.min(1,bg.overlayOpacity/100+0.05).toFixed(2)}) 35%,
              rgba(26,74,128,${Math.max(0,bg.overlayOpacity/100-0.05).toFixed(2)}) 65%,
              rgba(42,122,226,${Math.max(0,bg.overlayOpacity/100-0.15).toFixed(2)}) 100%)`,
          }} />
        </>
      ) : (
        <div className="absolute inset-0" style={{ background: "#eeefe9" }} />
      )}
      <div className="relative z-10 space-y-2">
        <p className="text-[9px] font-bold tracking-widest uppercase" style={{ color: "#F54E00" }}>FAQ</p>
        <p className="font-black text-base" style={{ color: bg.imageDataUrl && bg.enabled ? "#fdfdf8" : "#23251d" }}>자주 묻는 질문</p>
        <div className="rounded p-2.5 space-y-1.5" style={{ backgroundColor: bg.imageDataUrl && bg.enabled ? "rgba(253,253,248,0.07)" : "#fdfdf8", border: `1px solid ${bg.imageDataUrl && bg.enabled ? "rgba(253,253,248,0.15)" : "#bfc1b7"}` }}>
          {["예약 취소 및 환불은?", "소요 시간은?", "날씨가 나쁘면?"].map((q) => (
            <div key={q} className="flex items-center justify-between">
              <p className="text-[10px] font-medium" style={{ color: bg.imageDataUrl && bg.enabled ? "rgba(253,253,248,0.8)" : "#23251d" }}>{q}</p>
              <ChevronDown size={10} style={{ color: bg.imageDataUrl && bg.enabled ? "rgba(253,253,248,0.35)" : "#9ea096" }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── FAQ 에디터 ────────────────────────────────────────────────────
function FaqEditor() {
  const faqs = useFaqs();
  const [editingId,  setEditingId]  = useState<string | null>(null);
  const [editQ,      setEditQ]      = useState("");
  const [editA,      setEditA]      = useState("");
  const [addMode,    setAddMode]    = useState(false);
  const [newQ,       setNewQ]       = useState("");
  const [newA,       setNewA]       = useState("");
  const [saved,      setSaved]      = useState(false);

  function flash() { setSaved(true); setTimeout(() => setSaved(false), 1800); }

  function startEdit(f: FaqEntry) {
    setEditingId(f.id); setEditQ(f.q); setEditA(f.a); setAddMode(false);
  }
  function saveEdit() {
    if (!editingId) return;
    updateFaq(editingId, { q: editQ.trim(), a: editA.trim() });
    setEditingId(null); flash();
  }
  function submitAdd() {
    if (!newQ.trim() || !newA.trim()) return;
    addFaq({ q: newQ.trim(), a: newA.trim() });
    setNewQ(""); setNewA(""); setAddMode(false); flash();
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
      {/* 헤더 */}
      <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <MessageSquare size={14} style={{ color: "#0D2B52" }} />
          <div>
            <h2 className="font-semibold text-sm" style={{ color: "#0D2B52" }}>자주 묻는 질문 관리</h2>
            <p className="text-xs text-gray-400 mt-0.5">랜딩 페이지 FAQ 섹션 항목 추가·삭제·순서 변경</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {saved && (
            <span className="flex items-center gap-1 text-xs font-medium text-green-600 bg-green-50 px-2.5 py-1 rounded-full">
              <CheckCircle2 size={11} /> 저장됨
            </span>
          )}
          {!addMode && (
            <button
              onClick={() => { setAddMode(true); setEditingId(null); }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-opacity hover:opacity-80"
              style={{ backgroundColor: "#0D2B52" }}
            >
              <Plus size={12} /> 질문 추가
            </button>
          )}
        </div>
      </div>

      <div className="px-5 py-4 space-y-2">
        {/* 추가 폼 */}
        {addMode && (
          <div className="border border-blue-200 bg-blue-50 rounded-xl p-4 space-y-3 mb-3">
            <p className="text-xs font-semibold" style={{ color: "#0D2B52" }}>새 FAQ 추가</p>
            <div>
              <label className="block text-[11px] font-medium text-gray-500 mb-1">질문</label>
              <input
                className="w-full text-sm px-3 py-2 rounded-lg border border-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white"
                placeholder="예: 예약 취소는 어떻게 되나요?"
                value={newQ}
                onChange={(e) => setNewQ(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-gray-500 mb-1">답변</label>
              <textarea
                className="w-full text-sm px-3 py-2 rounded-lg border border-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white resize-none"
                rows={3}
                placeholder="답변 내용을 입력하세요"
                value={newA}
                onChange={(e) => setNewA(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={submitAdd}
                disabled={!newQ.trim() || !newA.trim()}
                className="px-4 py-1.5 rounded-lg text-xs font-semibold text-white disabled:opacity-40 transition-opacity hover:opacity-80"
                style={{ backgroundColor: "#0D2B52" }}
              >
                추가
              </button>
              <button
                onClick={() => { setAddMode(false); setNewQ(""); setNewA(""); }}
                className="px-4 py-1.5 rounded-lg text-xs font-semibold border border-gray-200 text-gray-500 hover:bg-gray-50"
              >
                취소
              </button>
            </div>
          </div>
        )}

        {/* FAQ 목록 */}
        {faqs.map((faq, idx) => (
          <div key={faq.id} className="border border-gray-100 rounded-xl overflow-hidden">
            {editingId === faq.id ? (
              /* 편집 모드 */
              <div className="p-4 bg-yellow-50 space-y-3">
                <div>
                  <label className="block text-[11px] font-medium text-gray-500 mb-1">질문</label>
                  <input
                    className="w-full text-sm px-3 py-2 rounded-lg border border-yellow-200 focus:outline-none focus:ring-2 focus:ring-yellow-300 bg-white"
                    value={editQ}
                    onChange={(e) => setEditQ(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-gray-500 mb-1">답변</label>
                  <textarea
                    className="w-full text-sm px-3 py-2 rounded-lg border border-yellow-200 focus:outline-none focus:ring-2 focus:ring-yellow-300 bg-white resize-none"
                    rows={3}
                    value={editA}
                    onChange={(e) => setEditA(e.target.value)}
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={saveEdit}
                    disabled={!editQ.trim() || !editA.trim()}
                    className="px-4 py-1.5 rounded-lg text-xs font-semibold text-white disabled:opacity-40 transition-opacity hover:opacity-80"
                    style={{ backgroundColor: "#0D2B52" }}
                  >
                    저장
                  </button>
                  <button
                    onClick={() => setEditingId(null)}
                    className="px-4 py-1.5 rounded-lg text-xs font-semibold border border-gray-200 text-gray-500 hover:bg-gray-50"
                  >
                    취소
                  </button>
                </div>
              </div>
            ) : (
              /* 표시 모드 */
              <div className="flex items-start gap-3 px-4 py-3">
                {/* 순서 이동 */}
                <div className="flex flex-col gap-0.5 pt-0.5 flex-shrink-0">
                  <button
                    onClick={() => { moveFaq(faq.id, "up"); flash(); }}
                    disabled={idx === 0}
                    className="p-0.5 rounded hover:bg-gray-100 disabled:opacity-20 transition-colors"
                  >
                    <ChevronUp size={12} className="text-gray-400" />
                  </button>
                  <button
                    onClick={() => { moveFaq(faq.id, "down"); flash(); }}
                    disabled={idx === faqs.length - 1}
                    className="p-0.5 rounded hover:bg-gray-100 disabled:opacity-20 transition-colors"
                  >
                    <ChevronDown size={12} className="text-gray-400" />
                  </button>
                </div>
                {/* 번호 */}
                <span className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold mt-0.5" style={{ backgroundColor: "#EFF6FF", color: "#2A7AE2" }}>
                  {idx + 1}
                </span>
                {/* 내용 */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate" style={{ color: "#23251d" }}>{faq.q}</p>
                  <p className="text-xs mt-0.5 line-clamp-1" style={{ color: "#9ea096" }}>{faq.a}</p>
                </div>
                {/* 액션 */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => startEdit(faq)}
                    className="px-2.5 py-1 rounded-lg text-[11px] font-medium border border-gray-200 text-gray-500 hover:border-blue-300 hover:text-blue-600 transition-colors"
                  >
                    수정
                  </button>
                  <button
                    onClick={() => { deleteFaq(faq.id); flash(); }}
                    className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}

        {faqs.length === 0 && (
          <div className="text-center py-8 text-sm text-gray-400">
            <MessageSquare size={24} className="mx-auto mb-2 opacity-30" />
            FAQ가 없습니다. 위 버튼으로 추가해 주세요.
          </div>
        )}
      </div>
    </div>
  );
}

// ── 푸터 에디터 ───────────────────────────────────────────────────

// Row를 FooterEditor 외부 컴포넌트로 분리 — 내부 정의 시 리렌더마다 언마운트/리마운트되어 한글 IME가 깨짐
interface FooterRowProps {
  label: string;
  fieldKey: keyof FooterConfig;
  multiline?: boolean;
  icon?: React.ReactNode;
  currentValue: string;
  draftValue: string | undefined;
  editing: boolean;
  onStart: () => void;
  onCancel: () => void;
  onCommit: () => void;
  onChange: (val: string) => void;
}

function FooterRow({ label, fieldKey, multiline = false, icon, currentValue, draftValue, editing, onStart, onCancel, onCommit, onChange }: FooterRowProps) {
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-gray-100 last:border-0 group">
      {icon && <span className="mt-0.5 flex-shrink-0 text-gray-400">{icon}</span>}
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-semibold text-gray-400 mb-0.5 uppercase tracking-wide">{label}</p>
        {editing ? (
          multiline ? (
            <textarea
              autoFocus
              className="w-full text-sm px-2.5 py-1.5 rounded-lg border border-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-300 resize-none"
              rows={3}
              value={draftValue ?? ""}
              onChange={(e) => onChange(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Escape") onCancel(); }}
            />
          ) : (
            <input
              autoFocus
              className="w-full text-sm px-2.5 py-1.5 rounded-lg border border-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-300"
              value={draftValue ?? ""}
              onChange={(e) => onChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter")  onCommit();
                if (e.key === "Escape") onCancel();
              }}
            />
          )
        ) : (
          <p
            className="text-sm whitespace-pre-line cursor-text"
            style={{ color: currentValue ? "#23251d" : "#bfc1b7" }}
          >
            {currentValue || "—"}
          </p>
        )}
      </div>
      <div className="flex-shrink-0 flex gap-1 pt-0.5">
        {editing ? (
          <>
            <button
              onClick={onCommit}
              className="px-2.5 py-1 rounded text-[11px] font-semibold text-white"
              style={{ backgroundColor: "#0D2B52" }}
            >저장</button>
            <button
              onClick={onCancel}
              className="px-2.5 py-1 rounded text-[11px] border border-gray-200 text-gray-500"
            >취소</button>
          </>
        ) : (
          <button
            onClick={onStart}
            className="px-2.5 py-1 rounded text-[11px] border border-gray-200 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity hover:border-blue-300 hover:text-blue-500"
          >수정</button>
        )}
      </div>
    </div>
  );
}

function FooterEditor() {
  const footer = useFooter();
  const [saved, setSaved]   = useState(false);
  const [drafts, setDrafts] = useState<Partial<Record<keyof FooterConfig, string>>>({});

  function flash() { setSaved(true); setTimeout(() => setSaved(false), 1800); }

  const startEdit  = useCallback((key: keyof FooterConfig) => {
    setDrafts((d) => ({ ...d, [key]: footer[key] }));
  }, [footer]);
  const cancelEdit = useCallback((key: keyof FooterConfig) => {
    setDrafts((d) => { const n = { ...d }; delete n[key]; return n; });
  }, []);
  const commitEdit = useCallback((key: keyof FooterConfig, val: string | undefined) => {
    if (val !== undefined) {
      setFooter({ [key]: val });
      setSaved(true); setTimeout(() => setSaved(false), 1800);
    }
    setDrafts((d) => { const n = { ...d }; delete n[key]; return n; });
  }, []);
  const changeDraft = useCallback((key: keyof FooterConfig, val: string) => {
    setDrafts((d) => ({ ...d, [key]: val }));
  }, []);

  function row(label: string, fieldKey: keyof FooterConfig, opts: { multiline?: boolean; icon?: React.ReactNode } = {}) {
    return (
      <FooterRow
        key={fieldKey}
        label={label}
        fieldKey={fieldKey}
        multiline={opts.multiline}
        icon={opts.icon}
        currentValue={footer[fieldKey]}
        draftValue={drafts[fieldKey]}
        editing={fieldKey in drafts}
        onStart={() => startEdit(fieldKey)}
        onCancel={() => cancelEdit(fieldKey)}
        onCommit={() => commitEdit(fieldKey, drafts[fieldKey])}
        onChange={(val) => changeDraft(fieldKey, val)}
      />
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
      {/* 헤더 */}
      <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-gray-100">
        <div>
          <h2 className="font-semibold text-sm flex items-center gap-1.5" style={{ color: "#0D2B52" }}>
            <Settings size={13} /> 푸터 내용 관리
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">항목 위에 마우스를 올리면 수정 버튼이 나타납니다</p>
        </div>
        {saved && (
          <span className="flex items-center gap-1 text-xs font-medium text-green-600 bg-green-50 px-2.5 py-1 rounded-full">
            <CheckCircle2 size={11} /> 저장됨
          </span>
        )}
      </div>

      <div className="grid grid-cols-5 gap-0 divide-x divide-gray-100">
        {/* 좌: 편집 패널 */}
        <div className="col-span-3 px-5 py-4 space-y-1">

          {/* 브랜드 소개 */}
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1 mt-1">브랜드 소개</p>
          {row("브랜드 슬로건", "tagline", { multiline: true })}

          {/* 운영 시간 */}
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1 mt-4 pt-3 border-t border-gray-100">운영 시간</p>
          {row("평일", "hoursWeekday")}
          {row("주말", "hoursWeekend")}
          {row("공지", "hoursNotice")}

          {/* 문의 */}
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1 mt-4 pt-3 border-t border-gray-100">문의</p>
          {row("전화번호",  "phone",   { icon: <Phone        size={13} /> })}
          {row("카카오톡",  "kakao",   { icon: <MessageCircle size={13} /> })}
          {row("주소·위치", "address", { icon: <MapPin        size={13} /> })}

          {/* 하단 법적 정보 */}
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1 mt-4 pt-3 border-t border-gray-100">법적 정보</p>
          {row("저작권 표기", "copyright")}
          {row("사업자 정보", "bizInfo")}
        </div>

        {/* 우: 미리보기 */}
        <div className="col-span-2 px-4 py-4">
          <p className="text-xs font-semibold mb-3" style={{ color: "#0D2B52" }}>미리보기</p>
          <div className="rounded-xl overflow-hidden" style={{ backgroundColor: "#23251d" }}>
            <div className="px-4 pt-4 pb-3 border-b" style={{ borderColor: "rgba(253,253,248,0.08)" }}>
              <div className="flex items-center gap-1.5 mb-1.5">
                <Wind size={12} style={{ color: "#F54E00" }} />
                <span className="text-xs font-bold" style={{ color: "#fdfdf8" }}>구름상회</span>
              </div>
              <p className="text-[10px] leading-relaxed whitespace-pre-line" style={{ color: "rgba(253,253,248,0.35)" }}>{footer.tagline}</p>
            </div>
            <div className="px-4 py-3 grid grid-cols-2 gap-3 border-b" style={{ borderColor: "rgba(253,253,248,0.08)" }}>
              <div>
                <p className="text-[9px] font-semibold mb-1.5" style={{ color: "rgba(253,253,248,0.5)" }}>운영 시간</p>
                {[footer.hoursWeekday, footer.hoursWeekend, footer.hoursNotice].filter(Boolean).map((t, i) => (
                  <p key={i} className="text-[10px] mb-0.5" style={{ color: "rgba(253,253,248,0.3)" }}>{t}</p>
                ))}
              </div>
              <div>
                <p className="text-[9px] font-semibold mb-1.5" style={{ color: "rgba(253,253,248,0.5)" }}>문의</p>
                {footer.phone   && <p className="text-[10px] mb-0.5" style={{ color: "rgba(253,253,248,0.3)" }}>{footer.phone}</p>}
                {footer.kakao   && <p className="text-[10px] mb-0.5" style={{ color: "rgba(253,253,248,0.3)" }}>{footer.kakao}</p>}
                {footer.address && <p className="text-[10px] mb-0.5" style={{ color: "rgba(253,253,248,0.3)" }}>{footer.address}</p>}
              </div>
            </div>
            <div className="px-4 py-2.5">
              <p className="text-[9px]" style={{ color: "rgba(253,253,248,0.18)" }}>{footer.copyright}</p>
              <p className="text-[9px] mt-0.5" style={{ color: "rgba(253,253,248,0.18)" }}>{footer.bizInfo}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── 페이지 콘텐츠 에디터 ─────────────────────────────────────────

type ContentSection = "hero" | "products" | "safety" | "faq" | "cta" | "booking";

const SECTION_TABS: { key: ContentSection; label: string }[] = [
  { key: "hero",     label: "히어로" },
  { key: "products", label: "상품" },
  { key: "safety",   label: "안전수칙" },
  { key: "faq",      label: "FAQ 섹션" },
  { key: "cta",      label: "CTA" },
  { key: "booking",  label: "예약완료" },
];

// 공통 인라인 텍스트 편집 행 (PageContentEditor 전용 — 함수형, 컴포넌트 외부 정의)
interface CRowProps {
  label: string;
  value: string;
  multiline?: boolean;
  onSave: (val: string) => void;
  mono?: boolean;
}
function CRow({ label, value, multiline = false, onSave, mono = false }: CRowProps) {
  const [editing, setEditing] = useState(false);
  const [draft,   setDraft]   = useState("");

  function start() { setDraft(value); setEditing(true); }
  function cancel() { setEditing(false); }
  function commit() { onSave(draft); setEditing(false); }

  return (
    <div className="flex items-start gap-3 py-2 border-b border-gray-100 last:border-0 group">
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-semibold text-gray-400 mb-0.5 uppercase tracking-wide">{label}</p>
        {editing ? (
          multiline ? (
            <textarea
              autoFocus
              className={`w-full text-sm px-2 py-1.5 rounded-lg border border-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-300 resize-none${mono ? " font-mono" : ""}`}
              rows={3}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Escape") cancel(); }}
            />
          ) : (
            <input
              autoFocus
              className={`w-full text-sm px-2 py-1.5 rounded-lg border border-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-300${mono ? " font-mono" : ""}`}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") commit(); if (e.key === "Escape") cancel(); }}
            />
          )
        ) : (
          <p className="text-sm whitespace-pre-line" style={{ color: value ? "#23251d" : "#bfc1b7" }}>
            {value || "—"}
          </p>
        )}
      </div>
      <div className="flex-shrink-0 flex gap-1 pt-0.5">
        {editing ? (
          <>
            <button onClick={commit} className="px-2.5 py-1 rounded text-[11px] font-semibold text-white" style={{ backgroundColor: "#0D2B52" }}>저장</button>
            <button onClick={cancel} className="px-2.5 py-1 rounded text-[11px] border border-gray-200 text-gray-500">취소</button>
          </>
        ) : (
          <button onClick={start} className="px-2.5 py-1 rounded text-[11px] border border-gray-200 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity hover:border-blue-300 hover:text-blue-500">수정</button>
        )}
      </div>
    </div>
  );
}

// 상품 카드 편집 (외부 컴포넌트)
interface ProductCardProps {
  product: ProductItem;
  onSave: (updated: ProductItem) => void;
}
function ProductCardEditor({ product, onSave }: ProductCardProps) {
  const [open, setOpen]   = useState(false);
  const [draft, setDraft] = useState<ProductItem & { featuresText: string }>({
    ...product, featuresText: product.features.join("\n"),
  });

  function reset() {
    setDraft({ ...product, featuresText: product.features.join("\n") });
    setOpen(false);
  }
  function commit() {
    onSave({ ...draft, features: draft.featuresText.split("\n").map((s) => s.trim()).filter(Boolean) });
    setOpen(false);
  }

  function field(key: keyof Omit<ProductItem, "features" | "id" | "featured">, label: string, isNumber = false) {
    const val = draft[key] as string | number;
    return (
      <div>
        <p className="text-[10px] font-semibold text-gray-400 mb-0.5 uppercase tracking-wide">{label}</p>
        <input
          className="w-full text-sm px-2 py-1.5 rounded border border-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-300"
          type={isNumber ? "number" : "text"}
          value={val}
          onChange={(e) => setDraft((d) => ({ ...d, [key]: isNumber ? Number(e.target.value) : e.target.value }))}
        />
      </div>
    );
  }

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      {/* 헤더 */}
      <button
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50 transition-colors"
        onClick={() => { if (!open) { setDraft({ ...product, featuresText: product.features.join("\n") }); } setOpen(!open); }}
      >
        <div className="flex items-center gap-2">
          {product.featured && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: "#F54E00" }}>추천</span>}
          {product.badge && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{product.badge}</span>}
          <span className="font-semibold text-sm" style={{ color: "#23251d" }}>{product.name}</span>
          <span className="text-xs text-gray-400">{product.price.toLocaleString()}원</span>
        </div>
        {open ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
      </button>

      {/* 폼 */}
      {open && (
        <div className="px-4 pb-4 border-t border-gray-100 space-y-3 pt-3">
          <div className="grid grid-cols-2 gap-3">
            {field("name", "상품명")}
            {field("subtitle", "소제목")}
            {field("price", "가격 (원)", true)}
            {field("duration", "비행 시간")}
            {field("badge", "뱃지 (인기·프리미엄 등, 빈칸=없음)")}
            {field("optionLabel", "옵션 문구 (빈칸=없음)")}
          </div>
          <div>
            <p className="text-[10px] font-semibold text-gray-400 mb-0.5 uppercase tracking-wide">특징 (한 줄에 하나씩)</p>
            <textarea
              className="w-full text-sm px-2 py-1.5 rounded border border-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-300 resize-none"
              rows={5}
              value={draft.featuresText}
              onChange={(e) => setDraft((d) => ({ ...d, featuresText: e.target.value }))}
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              id={`featured-${product.id}`}
              type="checkbox"
              checked={draft.featured}
              onChange={(e) => setDraft((d) => ({ ...d, featured: e.target.checked }))}
              className="w-3.5 h-3.5"
            />
            <label htmlFor={`featured-${product.id}`} className="text-xs text-gray-600">추천 상품 강조 (어두운 카드)</label>
          </div>
          <div className="flex gap-2 pt-1">
            <button onClick={commit} className="px-4 py-1.5 rounded text-xs font-semibold text-white" style={{ backgroundColor: "#0D2B52" }}>저장</button>
            <button onClick={reset}  className="px-4 py-1.5 rounded text-xs border border-gray-200 text-gray-500">취소</button>
          </div>
        </div>
      )}
    </div>
  );
}

// 안전수칙 아이템 편집 (외부 컴포넌트)
interface SafetyItemEditorProps {
  items: SafetyItem[];
  onChange: (items: SafetyItem[]) => void;
}
function SafetyItemsEditor({ items, onChange }: SafetyItemEditorProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<SafetyItem>({ id: "", icon: "", title: "", desc: "" });
  const [adding, setAdding] = useState(false);
  const [newItem, setNewItem] = useState({ icon: "", title: "", desc: "" });

  function startEdit(item: SafetyItem) { setDraft({ ...item }); setEditingId(item.id); }
  function cancelEdit() { setEditingId(null); }
  function commitEdit() {
    onChange(items.map((i) => i.id === draft.id ? draft : i));
    setEditingId(null);
  }
  function deleteItem(id: string) { onChange(items.filter((i) => i.id !== id)); }
  function moveItem(id: string, dir: "up" | "down") {
    const idx = items.findIndex((i) => i.id === id);
    if (dir === "up" && idx === 0) return;
    if (dir === "down" && idx === items.length - 1) return;
    const next = [...items];
    const swap = dir === "up" ? idx - 1 : idx + 1;
    [next[idx], next[swap]] = [next[swap], next[idx]];
    onChange(next);
  }
  function addItem() {
    if (!newItem.title.trim()) return;
    onChange([...items, { id: `s${Date.now()}`, ...newItem }]);
    setNewItem({ icon: "", title: "", desc: "" });
    setAdding(false);
  }

  return (
    <div className="space-y-2">
      {items.map((item) => (
        <div key={item.id} className="border border-gray-200 rounded-lg overflow-hidden">
          {editingId === item.id ? (
            <div className="p-3 space-y-2">
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <p className="text-[10px] text-gray-400 mb-0.5">아이콘 (이모지)</p>
                  <input className="w-full text-sm px-2 py-1 rounded border border-gray-200 focus:outline-none" value={draft.icon} onChange={(e) => setDraft((d) => ({ ...d, icon: e.target.value }))} />
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 mb-0.5">제목</p>
                  <input className="w-full text-sm px-2 py-1 rounded border border-gray-200 focus:outline-none" value={draft.title} onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))} />
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 mb-0.5">설명</p>
                  <input className="w-full text-sm px-2 py-1 rounded border border-gray-200 focus:outline-none" value={draft.desc} onChange={(e) => setDraft((d) => ({ ...d, desc: e.target.value }))} />
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={commitEdit} className="px-3 py-1 rounded text-[11px] font-semibold text-white" style={{ backgroundColor: "#0D2B52" }}>저장</button>
                <button onClick={cancelEdit} className="px-3 py-1 rounded text-[11px] border border-gray-200 text-gray-500">취소</button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 px-3 py-2.5 group">
              <span className="text-lg flex-shrink-0">{item.icon}</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold" style={{ color: "#23251d" }}>{item.title}</p>
                <p className="text-[11px] truncate" style={{ color: "#65675e" }}>{item.desc}</p>
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => moveItem(item.id, "up")}   className="p-1 rounded hover:bg-gray-100"><ChevronUp   size={12} /></button>
                <button onClick={() => moveItem(item.id, "down")} className="p-1 rounded hover:bg-gray-100"><ChevronDown size={12} /></button>
                <button onClick={() => startEdit(item)} className="px-2 py-1 rounded text-[11px] border border-gray-200 text-gray-400 hover:border-blue-300 hover:text-blue-500">수정</button>
                <button onClick={() => deleteItem(item.id)} className="px-2 py-1 rounded text-[11px] border border-gray-200 text-gray-400 hover:border-red-300 hover:text-red-500"><Trash2 size={11} /></button>
              </div>
            </div>
          )}
        </div>
      ))}

      {adding ? (
        <div className="border border-blue-200 rounded-lg p-3 space-y-2 bg-blue-50">
          <div className="grid grid-cols-3 gap-2">
            <div>
              <p className="text-[10px] text-gray-400 mb-0.5">아이콘</p>
              <input autoFocus className="w-full text-sm px-2 py-1 rounded border border-gray-200 focus:outline-none" placeholder="🔒" value={newItem.icon} onChange={(e) => setNewItem((n) => ({ ...n, icon: e.target.value }))} />
            </div>
            <div>
              <p className="text-[10px] text-gray-400 mb-0.5">제목</p>
              <input className="w-full text-sm px-2 py-1 rounded border border-gray-200 focus:outline-none" placeholder="제목" value={newItem.title} onChange={(e) => setNewItem((n) => ({ ...n, title: e.target.value }))} />
            </div>
            <div>
              <p className="text-[10px] text-gray-400 mb-0.5">설명</p>
              <input className="w-full text-sm px-2 py-1 rounded border border-gray-200 focus:outline-none" placeholder="설명" value={newItem.desc} onChange={(e) => setNewItem((n) => ({ ...n, desc: e.target.value }))} onKeyDown={(e) => { if (e.key === "Enter") addItem(); if (e.key === "Escape") setAdding(false); }} />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={addItem} className="px-3 py-1 rounded text-[11px] font-semibold text-white" style={{ backgroundColor: "#0D2B52" }}>추가</button>
            <button onClick={() => setAdding(false)} className="px-3 py-1 rounded text-[11px] border border-gray-200 text-gray-500">취소</button>
          </div>
        </div>
      ) : (
        <button onClick={() => setAdding(true)} className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-lg border border-dashed border-gray-300 text-xs text-gray-400 hover:border-blue-300 hover:text-blue-500 transition-colors">
          <Plus size={12} /> 수칙 추가
        </button>
      )}
    </div>
  );
}

function PageContentEditor() {
  const content = usePageContent();
  const [activeSection, setActiveSection] = useState<ContentSection>("hero");
  const [saved, setSaved] = useState(false);

  function flash() { setSaved(true); setTimeout(() => setSaved(false), 1800); }
  function patch(p: Partial<PageContent>) { setPageContent(p); flash(); }

  function row(label: string, key: keyof PageContent, multiline = false) {
    const val = content[key] as string;
    return <CRow key={key} label={label} value={val} multiline={multiline} onSave={(v) => patch({ [key]: v })} />;
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
      {/* 헤더 */}
      <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-gray-100">
        <div>
          <h2 className="font-semibold text-sm flex items-center gap-1.5" style={{ color: "#0D2B52" }}>
            <MessageSquare size={13} /> 섹션 텍스트 관리
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">각 섹션의 제목·설명·버튼 문구를 수정합니다</p>
        </div>
        {saved && (
          <span className="flex items-center gap-1 text-xs font-medium text-green-600 bg-green-50 px-2.5 py-1 rounded-full">
            <CheckCircle2 size={11} /> 저장됨
          </span>
        )}
      </div>

      {/* 탭 */}
      <div className="flex border-b border-gray-100 px-4 gap-1">
        {SECTION_TABS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setActiveSection(key)}
            className="px-3 py-2.5 text-xs font-semibold transition-colors border-b-2 -mb-px"
            style={{
              borderColor: activeSection === key ? "#0D2B52" : "transparent",
              color: activeSection === key ? "#0D2B52" : "#9ea096",
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* 탭 콘텐츠 */}
      <div className="px-5 py-4">

        {/* ── 히어로 ── */}
        {activeSection === "hero" && (
          <div className="space-y-0.5">
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">상단 뱃지</p>
            {row("뱃지 문구", "heroBadge")}

            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mt-4 mb-2">헤드라인</p>
            {row("첫째 줄", "heroHeadline1")}
            {row("둘째 줄 (오렌지 강조)", "heroHeadline2")}
            {row("서브텍스트", "heroSubtext", true)}

            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mt-4 mb-2">버튼</p>
            {row("메인 CTA 버튼", "heroCtaButton")}
            {row("보조 버튼", "heroSecondaryButton")}

            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mt-4 mb-2">통계 수치</p>
            <div className="grid grid-cols-2 gap-x-6">
              {row("수치 1", "heroStat1Value")}
              {row("레이블 1", "heroStat1Label")}
              {row("수치 2", "heroStat2Value")}
              {row("레이블 2", "heroStat2Label")}
              {row("수치 3", "heroStat3Value")}
              {row("레이블 3", "heroStat3Label")}
            </div>
          </div>
        )}

        {/* ── 상품 ── */}
        {activeSection === "products" && (
          <div className="space-y-4">
            <div className="space-y-0.5 pb-4 border-b border-gray-100">
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">섹션 헤더</p>
              {row("섹션 라벨 (영문)", "productLabel")}
              {row("제목", "productHeading")}
              {row("부제목", "productSubtext")}
            </div>

            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">상품 카드</p>
            <div className="space-y-2">
              {content.products.map((p) => (
                <ProductCardEditor
                  key={p.id}
                  product={p}
                  onSave={(updated) => {
                    patch({ products: content.products.map((x) => x.id === updated.id ? updated : x) });
                  }}
                />
              ))}
            </div>
          </div>
        )}

        {/* ── 안전수칙 ── */}
        {activeSection === "safety" && (
          <div className="space-y-0.5">
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">섹션 헤더</p>
            {row("섹션 라벨 (영문)", "safetyLabel")}
            {row("제목", "safetyHeading")}
            {row("부제목", "safetySubtext")}

            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mt-4 mb-2">안전 배너</p>
            {row("배너 타이틀", "safetyBannerTitle")}
            {row("배너 설명", "safetyBannerDesc", true)}

            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mt-4 mb-2">안전 수칙 항목</p>
            <SafetyItemsEditor
              items={content.safetyItems}
              onChange={(items) => patch({ safetyItems: items })}
            />
          </div>
        )}

        {/* ── FAQ 섹션 헤더 ── */}
        {activeSection === "faq" && (
          <div className="space-y-0.5">
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">섹션 헤더</p>
            {row("섹션 라벨 (영문)", "faqLabel")}
            {row("제목", "faqHeading")}

            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mt-4 mb-2">하단 문의 안내</p>
            {row("문의 안내 문구", "faqNote", true)}

            <p className="text-xs text-gray-400 mt-4 p-3 bg-gray-50 rounded-lg">
              💡 개별 FAQ 항목(질문/답변)은 <strong>FAQ 에디터</strong>에서 관리합니다.
            </p>
          </div>
        )}

        {/* ── CTA ── */}
        {activeSection === "cta" && (
          <div className="space-y-0.5">
            {row("섹션 라벨 (영문)", "ctaLabel")}
            {row("제목", "ctaHeading")}
            {row("부제목", "ctaSubtext")}
            {row("버튼 문구", "ctaButton")}
          </div>
        )}

        {/* ── 예약완료 ── */}
        {activeSection === "booking" && (
          <div className="space-y-0.5">
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">다음 단계 박스</p>
            {row("박스 타이틀", "bookingCompleteTitle")}
            <div>
              <CRow
                label="안내 문구 (한 줄에 하나씩 · {phone} = 고객 연락처)"
                value={content.bookingCompleteSteps}
                multiline
                onSave={(v) => patch({ bookingCompleteSteps: v })}
              />
            </div>
            <div className="mt-4 p-3 rounded-lg bg-gray-50 text-xs text-gray-500 space-y-1">
              <p className="font-semibold text-gray-600">미리보기</p>
              <p className="font-semibold text-gray-700">{content.bookingCompleteTitle}</p>
              {content.bookingCompleteSteps.split("\n").filter(Boolean).map((line, i) => (
                <p key={i}>{"• "}{line.replace("{phone}", "010-1234-5678")}</p>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

// ── 메인 ─────────────────────────────────────────────────────────
export default function SettingsPage() {
  const heroBg = useHeroBg();
  const ctaBg  = useCtaBg();
  const faqBg  = useFaqBg();
  const [globalSaved, setGlobalSaved] = useState(false);

  function flashGlobal() { setGlobalSaved(true); setTimeout(() => setGlobalSaved(false), 2000); }

  return (
    <div className="p-6 space-y-6" style={{ background: "#F5F7FA", minHeight: "100vh" }}>
      {/* 헤더 */}
      <div className="flex items-center gap-3">
        <Settings size={20} style={{ color: "#0D2B52" }} />
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "#0D2B52" }}>사이트 설정</h1>
          <p className="text-sm text-gray-500 mt-0.5">랜딩 페이지 외관 설정</p>
        </div>
        {globalSaved && (
          <span className="flex items-center gap-1.5 text-xs font-medium text-green-600 bg-green-50 px-3 py-1.5 rounded-full ml-auto">
            <CheckCircle2 size={13} /> 저장됨
          </span>
        )}
      </div>

      {/* 로고 설정 */}
      <LogoCard />

      {/* 히어로 섹션 배경 */}
      <BgCard
        title="히어로 배경 이미지"
        description="랜딩 페이지 첫 번째 섹션 (전체 화면 메인 비주얼)"
        bg={heroBg}
        onSet={(p) => { setHeroBg(p); flashGlobal(); }}
        onClear={() => { clearHeroBgImage(); flashGlobal(); }}
        preview={(bg) => <HeroPreview bg={bg} />}
      />

      {/* CTA 섹션 배경 */}
      <BgCard
        title="CTA 배경 이미지"
        description="랜딩 페이지 마지막 섹션 (예약 유도 배너)"
        bg={ctaBg}
        onSet={(p) => { setCtaBg(p); flashGlobal(); }}
        onClear={() => { clearCtaBgImage(); flashGlobal(); }}
        preview={(bg) => <CtaPreview bg={bg} />}
      />

      {/* FAQ 섹션 배경 */}
      <BgCard
        title="FAQ 배경 이미지"
        description="랜딩 페이지 자주 묻는 질문 섹션 배경"
        bg={faqBg}
        onSet={(p) => { setFaqBg(p); flashGlobal(); }}
        onClear={() => { clearFaqBgImage(); flashGlobal(); }}
        preview={(bg) => <FaqPreview bg={bg} />}
      />

      {/* FAQ 에디터 */}
      <FaqEditor />

      {/* 푸터 내용 에디터 */}
      <FooterEditor />

      {/* 섹션 텍스트 에디터 */}
      <PageContentEditor />

      {/* 가이드 */}
      <div className="rounded-xl px-4 py-3 border border-blue-100 bg-blue-50 text-xs text-blue-600 leading-relaxed space-y-1">
        <p className="font-semibold">💡 최적 이미지 조건</p>
        <p>• 가로형(16:9) 비율 권장 — 세로가 짧으면 잘릴 수 있어요</p>
        <p>• 1920×1080 이상 해상도 권장</p>
        <p>• 하늘·들판 등 밝고 탁 트인 사진이 잘 어울려요</p>
        <p>• 오버레이 농도를 높이면 텍스트 가독성이 올라갑니다</p>
      </div>
    </div>
  );
}
