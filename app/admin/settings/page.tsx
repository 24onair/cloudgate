"use client";

import { useState, useRef, useCallback } from "react";
import { Upload, Trash2, Eye, EyeOff, ImageIcon, X, Settings, CheckCircle2, Loader2 } from "lucide-react";
import {
  useHeroBg, setHeroBg, clearHeroBgImage,
  useCtaBg,  setCtaBg,  clearCtaBgImage,
} from "@/lib/heroStore";

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

// ── 공통 배경 이미지 카드 ─────────────────────────────────────────
interface BgCardProps {
  title: string;
  description: string;
  bg: ReturnType<typeof useHeroBg>;
  onSet:   (p: Parameters<typeof setHeroBg>[0]) => void;
  onClear: () => void;
  /** 미리보기 렌더 함수 */
  preview: (bg: BgCardProps["bg"]) => React.ReactNode;
}

function BgCard({ title, description, bg, onSet, onClear, preview }: BgCardProps) {
  const fileRef   = useRef<HTMLInputElement>(null);
  const [dragging,    setDragging]    = useState(false);
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
      onSet({ imageDataUrl: compressed, enabled: true });
      flash();
    } catch {
      alert("이미지 처리 중 오류가 발생했습니다.");
    } finally {
      setProcessing(false);
    }
  }, [onSet]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
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
          {/* 업로드 */}
          {processing ? (
            <div className="border-2 border-blue-200 rounded-xl p-6 text-center bg-blue-50">
              <Loader2 size={24} className="mx-auto mb-1.5 text-blue-400 animate-spin" />
              <p className="text-xs text-blue-500 font-medium">이미지 최적화 중…</p>
            </div>
          ) : bg.imageDataUrl ? (
            <div className="relative rounded-xl overflow-hidden border border-gray-200">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={bg.imageDataUrl} alt="배경 이미지" className="w-full object-cover" style={{ maxHeight: 140 }} />
              <button
                onClick={() => { onClear(); flash(); }}
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
              {sizeInfo && (
                <span className="absolute bottom-1.5 left-1.5 text-[10px] bg-black/50 text-white px-1.5 py-0.5 rounded">
                  {sizeInfo}
                </span>
              )}
            </div>
          ) : (
            <div
              className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${dragging ? "border-blue-400 bg-blue-50" : "border-gray-200 hover:border-blue-300 hover:bg-blue-50"}`}
              onClick={() => fileRef.current?.click()}
              onDrop={handleDrop}
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
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
                  <p className="text-[10px] text-gray-400">끄면 기본 그라데이션 표시</p>
                </div>
                <button
                  onClick={() => { onSet({ enabled: !bg.enabled }); flash(); }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all"
                  style={{
                    background:   bg.enabled ? "#0D2B52" : "#fff",
                    borderColor:  bg.enabled ? "#0D2B52" : "#E5E7EB",
                    color:        bg.enabled ? "#fff" : "#6B7280",
                  }}
                >
                  {bg.enabled ? <><Eye size={11} /> 사용 중</> : <><EyeOff size={11} /> 꺼짐</>}
                </button>
              </div>

              {/* 오버레이 */}
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
          <img src={bg.imageDataUrl} alt="" aria-hidden className="absolute inset-0 w-full h-full object-cover" />
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
          <img src={bg.imageDataUrl} alt="" aria-hidden className="absolute inset-0 w-full h-full object-cover" />
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

// ── 메인 ─────────────────────────────────────────────────────────
export default function SettingsPage() {
  const heroBg = useHeroBg();
  const ctaBg  = useCtaBg();
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
