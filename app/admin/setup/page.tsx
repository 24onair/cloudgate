"use client";

import { useState, useRef, useCallback } from "react";
import {
  Wind, Upload, X, Eye, EyeOff, Type, CheckCircle2, Loader2,
  Sliders, Phone, MessageCircle, MapPin, Clock, ImageIcon,
  Building2, FileText, Star, BarChart2,
} from "lucide-react";
import { useLogo, setLogo, clearLogoImage } from "@/lib/logoStore";
import { useFooter, setFooter, FooterConfig } from "@/lib/footerStore";
import { usePageContent, setPageContent } from "@/lib/pageContentStore";
import {
  useHeroBg, setHeroBg, clearHeroBgImage,
  useCtaBg,  setCtaBg,  clearCtaBgImage,
  useFaqBg,  setFaqBg,  clearFaqBgImage,
} from "@/lib/heroStore";

// ── 탭 ───────────────────────────────────────────────────────────

type Tab = "brand" | "info" | "landing" | "images";

const TABS: { key: Tab; label: string; desc: string }[] = [
  { key: "brand",   label: "브랜드 & 로고",  desc: "로고 이미지 · 사이트명" },
  { key: "info",    label: "업체 기본 정보", desc: "연락처 · 운영시간 · 소개" },
  { key: "landing", label: "랜딩페이지",    desc: "히어로 · CTA 텍스트" },
  { key: "images",  label: "배경 이미지",   desc: "히어로 · CTA · FAQ 배경" },
];

// ── 유틸 ─────────────────────────────────────────────────────────

function useSaved() {
  const [saved, setSaved] = useState(false);
  const flash = useCallback(() => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }, []);
  return [saved, flash] as const;
}

function compressImage(file: File, maxPx = 1920): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;
      if (width > maxPx || height > maxPx) {
        if (width > height) { height = Math.round((height * maxPx) / width); width = maxPx; }
        else                { width  = Math.round((width  * maxPx) / height); height = maxPx; }
      }
      const canvas = document.createElement("canvas");
      canvas.width = width; canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) { reject(new Error("no ctx")); return; }
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL("image/jpeg", 0.75));
    };
    img.onerror = reject;
    img.src = url;
  });
}

// ── 공통 컴포넌트 ─────────────────────────────────────────────────

function SaveBadge({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <span className="flex items-center gap-1 text-xs font-medium text-green-600 bg-green-50 px-2.5 py-1 rounded-full">
      <CheckCircle2 size={11} /> 저장됨
    </span>
  );
}

interface EditRowProps {
  label: string;
  value: string;
  multiline?: boolean;
  placeholder?: string;
  onSave: (v: string) => void;
}
function EditRow({ label, value, multiline = false, placeholder, onSave }: EditRowProps) {
  const [editing, setEditing] = useState(false);
  const [draft,   setDraft]   = useState("");
  function start()  { setDraft(value); setEditing(true); }
  function cancel() { setEditing(false); }
  function commit() { onSave(draft); setEditing(false); }

  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-gray-100 last:border-0 group">
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-semibold text-gray-400 mb-0.5 uppercase tracking-wide">{label}</p>
        {editing ? (
          multiline ? (
            <textarea autoFocus rows={3}
              className="w-full text-sm px-2.5 py-1.5 rounded-lg border border-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-300 resize-none"
              value={draft} onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Escape") cancel(); }}
            />
          ) : (
            <input autoFocus
              className="w-full text-sm px-2.5 py-1.5 rounded-lg border border-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-300"
              value={draft} onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") commit(); if (e.key === "Escape") cancel(); }}
            />
          )
        ) : (
          <p className="text-sm whitespace-pre-line" style={{ color: value ? "#23251d" : "#bfc1b7" }}>
            {value || placeholder || "—"}
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
          <button onClick={start} className="px-2.5 py-1 rounded text-[11px] border border-gray-200 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity hover:border-blue-300 hover:text-blue-500">
            수정
          </button>
        )}
      </div>
    </div>
  );
}

function SectionCard({ title, desc, icon: Icon, saved, children }: {
  title: string; desc: string; icon: React.ElementType; saved: boolean; children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
      <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <Icon size={14} style={{ color: "#0D2B52" }} />
          <div>
            <h3 className="font-semibold text-sm" style={{ color: "#0D2B52" }}>{title}</h3>
            <p className="text-xs text-gray-400 mt-0.5">{desc}</p>
          </div>
        </div>
        <SaveBadge show={saved} />
      </div>
      <div className="px-5 py-4">{children}</div>
    </div>
  );
}

// ── 탭 1: 브랜드 & 로고 ──────────────────────────────────────────

function BrandTab() {
  const logo = useLogo();
  const [saved, flash]   = useSaved();
  const [processing, setProcessing] = useState(false);
  const [dropHover, setDropHover]   = useState(false);
  const [editText, setEditText]     = useState(false);
  const [textDraft, setTextDraft]   = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(async (file: File) => {
    if (!file.type.startsWith("image/")) return;
    setProcessing(true);
    try {
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
          const ctx = canvas.getContext("2d")!;
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL("image/png", 1.0));
        };
        img.onerror = reject;
        img.src = url;
      });
      setLogo({ imageDataUrl: compressed });
      flash();
    } catch { alert("이미지 처리 중 오류가 발생했습니다."); }
    finally { setProcessing(false); }
  }, [flash]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDropHover(false);
    const f = e.dataTransfer.files[0]; if (f) handleFile(f);
  }, [handleFile]);

  const displayText = logo.text || "구름상회";
  const showText    = !logo.imageDataUrl || logo.showText;

  return (
    <SectionCard title="로고 & 사이트명" desc="네비게이션 · 푸터에 표시되는 브랜드 로고" icon={Wind} saved={saved}>
      <div className="grid grid-cols-5 gap-6">
        {/* 컨트롤 */}
        <div className="col-span-2 space-y-4">
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
                <button onClick={() => { clearLogoImage(); flash(); }} className="absolute top-1.5 right-1.5 bg-black/60 text-white rounded-full p-1 hover:bg-black/80 transition-colors">
                  <X size={11} />
                </button>
                <button onClick={() => fileRef.current?.click()} className="absolute bottom-1.5 right-1.5 flex items-center gap-1 bg-black/60 text-white rounded-lg px-2 py-1 text-xs font-medium hover:bg-black/80">
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
                <p className="text-[10px] text-gray-400 mt-0.5">PNG 권장 (투명 배경)</p>
              </div>
            )}
            <input ref={fileRef} type="file" accept="image/*" className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }} />
          </div>

          <div className="space-y-3 border-t border-gray-100 pt-4">
            <p className="text-xs font-medium" style={{ color: "#0D2B52" }}>사이트명 텍스트</p>

            {logo.imageDataUrl && (
              <div className="flex items-center justify-between">
                <p className="text-xs text-gray-500">이미지와 함께 표시</p>
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

            {showText && (
              editText ? (
                <div className="flex gap-2">
                  <input autoFocus
                    className="flex-1 text-sm px-3 py-1.5 rounded-lg border border-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-300"
                    value={textDraft} onChange={(e) => setTextDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") { setLogo({ text: textDraft.trim() || "구름상회" }); setEditText(false); flash(); }
                      if (e.key === "Escape") setEditText(false);
                    }}
                  />
                  <button onClick={() => { setLogo({ text: textDraft.trim() || "구름상회" }); setEditText(false); flash(); }}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white" style={{ backgroundColor: "#0D2B52" }}>저장</button>
                  <button onClick={() => setEditText(false)} className="px-3 py-1.5 rounded-lg text-xs border border-gray-200 text-gray-500">취소</button>
                </div>
              ) : (
                <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-gray-50 border border-gray-100">
                  <div className="flex items-center gap-2">
                    <Type size={12} className="text-gray-400" />
                    <span className="text-sm font-semibold" style={{ color: "#23251d" }}>{displayText}</span>
                  </div>
                  <button onClick={() => { setTextDraft(logo.text || "구름상회"); setEditText(true); }}
                    className="text-xs text-blue-500 hover:text-blue-700 font-medium">수정</button>
                </div>
              )
            )}
          </div>
        </div>

        {/* 미리보기 */}
        <div className="col-span-3">
          <p className="text-xs font-semibold mb-2" style={{ color: "#0D2B52" }}>미리보기</p>
          <div className="rounded-xl border border-gray-200 overflow-hidden mb-3">
            <div className="px-4 py-2 bg-white border-b border-gray-100 text-[10px] text-gray-400 font-medium">네비게이션</div>
            <div className="px-4 py-3 flex items-center justify-between bg-[#fdfdf8]">
              <div className="flex items-center gap-2">
                {logo.imageDataUrl
                  ? /* eslint-disable-next-line @next/next/no-img-element */ <img src={logo.imageDataUrl} alt="" className="h-7 w-auto object-contain" />
                  : <Wind size={16} style={{ color: "#F54E00" }} />
                }
                {showText && <span className="font-bold text-sm" style={{ color: "#23251d" }}>{displayText}</span>}
              </div>
              <div className="flex items-center gap-3 text-xs font-semibold" style={{ color: "#65675e" }}>
                <span>상품 안내</span><span>FAQ</span>
              </div>
              <div className="px-3 py-1.5 rounded text-xs font-semibold text-white" style={{ backgroundColor: "#1e1f23" }}>예약하기</div>
            </div>
          </div>
          <div className="rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-4 py-2 bg-white border-b border-gray-100 text-[10px] text-gray-400 font-medium">푸터</div>
            <div className="px-4 py-3 flex items-center gap-2" style={{ backgroundColor: "#23251d" }}>
              {logo.imageDataUrl
                ? /* eslint-disable-next-line @next/next/no-img-element */ <img src={logo.imageDataUrl} alt="" className="h-6 w-auto object-contain" style={{ filter: "brightness(0) invert(1)" }} />
                : <Wind size={14} style={{ color: "#F54E00" }} />
              }
              {showText && <span className="font-bold text-sm" style={{ color: "#fdfdf8" }}>{displayText}</span>}
            </div>
          </div>
          <p className="text-[10px] text-gray-400 mt-2">
            {logo.imageDataUrl
              ? logo.showText ? "이미지 + 텍스트 함께 표시" : "이미지만 표시 (텍스트 숨김)"
              : "로고 없음 — 기본 아이콘 + 텍스트"}
          </p>
        </div>
      </div>
    </SectionCard>
  );
}

// ── 탭 2: 업체 기본 정보 ─────────────────────────────────────────

function InfoTab() {
  const footer = useFooter();
  const [s1, f1] = useSaved();
  const [s2, f2] = useSaved();
  const [s3, f3] = useSaved();
  const [s4, f4] = useSaved();
  function save(key: keyof FooterConfig, val: string, flash: () => void) {
    setFooter({ [key]: val }); flash();
  }

  return (
    <div className="space-y-5">
      <SectionCard title="업체 소개" desc="사이드바 하단 · 푸터 슬로건" icon={Building2} saved={s1}>
        <EditRow
          label="업체명 (사이드바 하단 표시)" value={footer.bizName}
          placeholder="단양 하늘체험 패러글라이딩"
          onSave={(v) => save("bizName", v, f1)}
        />
        <EditRow
          label="슬로건 / 소개글" value={footer.tagline} multiline
          placeholder="하늘을 날고 싶은 분들을 위한 프리미엄 체험비행"
          onSave={(v) => save("tagline", v, f1)}
        />
      </SectionCard>

      <SectionCard title="연락처" desc="전화번호 · 카카오톡 · 주소" icon={Phone} saved={s2}>
        <EditRow label="전화번호"    value={footer.phone}   placeholder="010-0000-0000"    onSave={(v) => save("phone",   v, f2)} />
        <EditRow label="카카오톡"    value={footer.kakao}   placeholder="카카오톡 채널명"  onSave={(v) => save("kakao",   v, f2)} />
        <EditRow label="주소 · 위치" value={footer.address} placeholder="충북 단양군 …"   onSave={(v) => save("address", v, f2)} />
      </SectionCard>

      <SectionCard title="운영 시간" desc="평일 · 주말 · 공지사항" icon={Clock} saved={s3}>
        <EditRow label="평일" value={footer.hoursWeekday} placeholder="평일 09:00 – 17:00"           onSave={(v) => save("hoursWeekday", v, f3)} />
        <EditRow label="주말" value={footer.hoursWeekend} placeholder="주말 09:00 – 18:00"           onSave={(v) => save("hoursWeekend", v, f3)} />
        <EditRow label="공지" value={footer.hoursNotice}  placeholder="기상 조건에 따라 변동 가능"  onSave={(v) => save("hoursNotice",  v, f3)} />
      </SectionCard>

      <SectionCard title="법적 정보" desc="저작권 · 사업자 정보" icon={FileText} saved={s4}>
        <EditRow label="저작권 표기" value={footer.copyright} placeholder="© 2026 구름상회. All rights reserved."       onSave={(v) => save("copyright", v, f4)} />
        <EditRow label="사업자 정보" value={footer.bizInfo}   placeholder="대표: 홍길동 | 사업자등록번호: 000-00-00000" multiline onSave={(v) => save("bizInfo",   v, f4)} />
      </SectionCard>
    </div>
  );
}

// ── 탭 3: 랜딩페이지 텍스트 ──────────────────────────────────────

function LandingTab() {
  const content = usePageContent();
  const [s1, f1] = useSaved();
  const [s2, f2] = useSaved();
  const [s3, f3] = useSaved();
  function save(key: Parameters<typeof setPageContent>[0], flash: () => void) {
    setPageContent(key); flash();
  }

  return (
    <div className="space-y-5">
      <SectionCard title="히어로 섹션" desc="첫 화면 메인 타이틀 · 서브텍스트 · 버튼" icon={Star} saved={s1}>
        <EditRow label="뱃지 문구"        value={content.heroBadge}          onSave={(v) => save({ heroBadge: v },          f1)} />
        <EditRow label="헤드라인 첫째 줄" value={content.heroHeadline1}       onSave={(v) => save({ heroHeadline1: v },       f1)} />
        <EditRow label="헤드라인 둘째 줄 (오렌지 강조)" value={content.heroHeadline2} onSave={(v) => save({ heroHeadline2: v }, f1)} />
        <EditRow label="서브텍스트"       value={content.heroSubtext}         multiline onSave={(v) => save({ heroSubtext: v },   f1)} />
        <EditRow label="메인 버튼"        value={content.heroCtaButton}       onSave={(v) => save({ heroCtaButton: v },       f1)} />
        <EditRow label="보조 버튼"        value={content.heroSecondaryButton} onSave={(v) => save({ heroSecondaryButton: v }, f1)} />
      </SectionCard>

      <SectionCard title="통계 수치" desc="히어로 섹션 하단 숫자 3개" icon={BarChart2} saved={s2}>
        <div className="grid grid-cols-3 gap-x-6">
          <div>
            <p className="text-[10px] font-bold uppercase text-gray-400 mb-1">수치 1</p>
            <EditRow label="값"     value={content.heroStat1Value} onSave={(v) => save({ heroStat1Value: v }, f2)} />
            <EditRow label="레이블" value={content.heroStat1Label} onSave={(v) => save({ heroStat1Label: v }, f2)} />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase text-gray-400 mb-1">수치 2</p>
            <EditRow label="값"     value={content.heroStat2Value} onSave={(v) => save({ heroStat2Value: v }, f2)} />
            <EditRow label="레이블" value={content.heroStat2Label} onSave={(v) => save({ heroStat2Label: v }, f2)} />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase text-gray-400 mb-1">수치 3</p>
            <EditRow label="값"     value={content.heroStat3Value} onSave={(v) => save({ heroStat3Value: v }, f2)} />
            <EditRow label="레이블" value={content.heroStat3Label} onSave={(v) => save({ heroStat3Label: v }, f2)} />
          </div>
        </div>
      </SectionCard>

      <SectionCard title="CTA 섹션" desc="랜딩페이지 마지막 예약 유도 배너" icon={FileText} saved={s3}>
        <EditRow label="라벨"      value={content.ctaLabel}   onSave={(v) => save({ ctaLabel: v },   f3)} />
        <EditRow label="제목"      value={content.ctaHeading} onSave={(v) => save({ ctaHeading: v }, f3)} />
        <EditRow label="부제목"    value={content.ctaSubtext} onSave={(v) => save({ ctaSubtext: v }, f3)} />
        <EditRow label="버튼 문구" value={content.ctaButton}  onSave={(v) => save({ ctaButton: v },  f3)} />
      </SectionCard>
    </div>
  );
}

// ── 배경 이미지 업로드 카드 ───────────────────────────────────────

type BgState = { imageDataUrl: string | null; enabled: boolean; overlayOpacity: number };

function BgUploadCard({
  label, desc,
  bg, onSet, onClear,
}: {
  label: string; desc: string;
  bg: BgState;
  onSet: (p: Partial<BgState>) => void;
  onClear: () => void;
}) {
  const [saved, flash]   = useSaved();
  const [processing, setProcessing] = useState(false);
  const [dropHover,  setDropHover]  = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(async (file: File) => {
    if (!file.type.startsWith("image/")) return;
    setProcessing(true);
    try {
      const compressed = await compressImage(file);
      onSet({ imageDataUrl: compressed, enabled: true });
      flash();
    } catch { alert("이미지 처리 중 오류가 발생했습니다."); }
    finally { setProcessing(false); }
  }, [onSet, flash]);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
      <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <ImageIcon size={14} style={{ color: "#0D2B52" }} />
          <div>
            <h3 className="font-semibold text-sm" style={{ color: "#0D2B52" }}>{label}</h3>
            <p className="text-xs text-gray-400 mt-0.5">{desc}</p>
          </div>
        </div>
        <SaveBadge show={saved} />
      </div>

      <div className="grid grid-cols-5 gap-4 px-5 py-4">
        {/* 컨트롤 */}
        <div className="col-span-2 space-y-3">
          {processing ? (
            <div className="border-2 border-blue-200 rounded-xl p-6 text-center bg-blue-50">
              <Loader2 size={24} className="mx-auto mb-1.5 text-blue-400 animate-spin" />
              <p className="text-xs text-blue-500 font-medium">최적화 중…</p>
            </div>
          ) : bg.imageDataUrl ? (
            <div className="relative rounded-xl overflow-hidden border border-gray-200" style={{ height: 140 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={bg.imageDataUrl} alt="" className="w-full h-full object-cover" />
              <button onClick={() => { onClear(); flash(); }} className="absolute top-1.5 right-1.5 bg-black/60 text-white rounded-full p-1 hover:bg-black/80 transition-colors">
                <X size={11} />
              </button>
              <button onClick={() => fileRef.current?.click()} className="absolute bottom-1.5 right-1.5 flex items-center gap-1 bg-black/60 text-white rounded-lg px-2 py-1 text-xs font-medium hover:bg-black/80">
                <Upload size={10} /> 교체
              </button>
            </div>
          ) : (
            <div
              className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${dropHover ? "border-blue-400 bg-blue-50" : "border-gray-200 hover:border-blue-300 hover:bg-blue-50"}`}
              onClick={() => fileRef.current?.click()}
              onDrop={(e) => { e.preventDefault(); setDropHover(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
              onDragOver={(e) => { e.preventDefault(); setDropHover(true); }}
              onDragLeave={() => setDropHover(false)}
            >
              <Upload size={22} className="mx-auto mb-1.5 text-gray-300" />
              <p className="text-xs text-gray-500">클릭 또는 드래그로 업로드</p>
              <p className="text-[10px] text-gray-400 mt-0.5">JPG, PNG, WEBP · 자동 최적화</p>
            </div>
          )}
          <input ref={fileRef} type="file" accept="image/*" className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }} />

          {bg.imageDataUrl && (
            <>
              <div className="flex items-center justify-between py-2 border-t border-gray-100">
                <p className="text-xs text-gray-600">배경 이미지 사용</p>
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
              <div className="space-y-1.5 border-t border-gray-100 pt-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-gray-600">오버레이 농도</p>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: "#EFF6FF", color: "#2A7AE2" }}>
                    {bg.overlayOpacity}%
                  </span>
                </div>
                <input type="range" min={20} max={90} value={bg.overlayOpacity}
                  onChange={(e) => onSet({ overlayOpacity: Number(e.target.value) })}
                  onPointerUp={() => flash()}
                  className="w-full accent-blue-600"
                />
                <div className="flex justify-between text-[10px] text-gray-400">
                  <span>← 이미지 선명</span><span>글씨 뚜렷 →</span>
                </div>
              </div>
            </>
          )}
        </div>

        {/* 미리보기 */}
        <div className="col-span-3">
          <p className="text-xs font-semibold mb-2" style={{ color: "#0D2B52" }}>미리보기</p>
          <div className="relative rounded-xl overflow-hidden flex items-center justify-center" style={{ height: 200 }}>
            {bg.imageDataUrl && bg.enabled ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={bg.imageDataUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />
                <div className="absolute inset-0" style={{
                  background: `linear-gradient(175deg,
                    rgba(2,13,31,${(bg.overlayOpacity / 100).toFixed(2)}) 0%,
                    rgba(13,43,82,${Math.min(1, bg.overlayOpacity / 100 + 0.05).toFixed(2)}) 50%,
                    rgba(42,122,226,${Math.max(0, bg.overlayOpacity / 100 - 0.15).toFixed(2)}) 100%)`,
                }} />
              </>
            ) : (
              <div className="absolute inset-0" style={{ background: "linear-gradient(135deg, #0D2B52 0%, #2A7AE2 100%)" }} />
            )}
            <div className="relative z-10 text-center text-white px-4">
              <p className="text-sm font-bold">{label}</p>
              <p className="text-[11px] opacity-60 mt-1">
                {bg.imageDataUrl && bg.enabled
                  ? `오버레이 ${bg.overlayOpacity}%`
                  : bg.imageDataUrl ? "이미지 업로드됨 — 꺼짐" : "이미지 없음 (기본 그라데이션)"}
              </p>
            </div>
          </div>
          {bg.imageDataUrl && (
            <p className="text-[10px] text-gray-400 mt-1.5">
              💡 표시 영역 세밀 조정은 <strong>사이트설정 → 배경 이미지</strong>에서 할 수 있습니다
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function ImagesTab() {
  const heroBg = useHeroBg();
  const ctaBg  = useCtaBg();
  const faqBg  = useFaqBg();

  return (
    <div className="space-y-5">
      <div className="rounded-xl bg-blue-50 border border-blue-100 px-4 py-3 text-xs text-blue-700 space-y-1">
        <p className="font-semibold">💡 이미지 가이드</p>
        <p>• 가로형 16:9 비율, 1920×1080 이상 해상도 권장</p>
        <p>• 하늘·들판 등 밝고 탁 트인 사진이 잘 어울립니다</p>
        <p>• 오버레이 농도를 높이면 텍스트 가독성이 올라갑니다</p>
      </div>

      <BgUploadCard label="히어로 배경" desc="첫 화면 전체 배경 이미지"       bg={heroBg} onSet={setHeroBg} onClear={clearHeroBgImage} />
      <BgUploadCard label="CTA 배경"    desc="예약 유도 배너 (페이지 하단)"    bg={ctaBg}  onSet={setCtaBg}  onClear={clearCtaBgImage}  />
      <BgUploadCard label="FAQ 배경"    desc="자주 묻는 질문 섹션 배경"        bg={faqBg}  onSet={setFaqBg}  onClear={clearFaqBgImage}  />
    </div>
  );
}

// ── 메인 페이지 ───────────────────────────────────────────────────

export default function SetupPage() {
  const [tab, setTab] = useState<Tab>("brand");

  return (
    <div className="p-6 space-y-6" style={{ background: "#F5F7FA", minHeight: "100vh" }}>
      {/* 페이지 헤더 */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: "#0D2B52" }}>
          <Sliders size={18} className="text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "#0D2B52" }}>사이트 셋업</h1>
          <p className="text-sm text-gray-500 mt-0.5">브랜드 로고, 업체 정보, 랜딩페이지를 설정합니다</p>
        </div>
      </div>

      {/* 탭 네비게이션 */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-1.5 flex gap-1">
        {TABS.map(({ key, label, desc }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className="flex-1 flex flex-col items-center px-3 py-3 rounded-xl text-center transition-all"
            style={{
              backgroundColor: tab === key ? "#0D2B52" : "transparent",
              color:           tab === key ? "#fff"    : "#65675e",
            }}
          >
            <span className="text-sm font-semibold">{label}</span>
            <span className="text-[10px] mt-0.5" style={{ opacity: tab === key ? 0.7 : 0.8 }}>{desc}</span>
          </button>
        ))}
      </div>

      {/* 탭 콘텐츠 */}
      {tab === "brand"   && <BrandTab />}
      {tab === "info"    && <InfoTab />}
      {tab === "landing" && <LandingTab />}
      {tab === "images"  && <ImagesTab />}

      {/* 하단 안내 */}
      <div className="rounded-xl px-4 py-3 border border-gray-200 bg-white text-xs text-gray-500 flex items-center justify-between">
        <p>FAQ 항목·상품 카드·안전 수칙 등 세부 콘텐츠는 <strong className="text-gray-700">사이트설정</strong>에서 관리할 수 있습니다.</p>
        <a href="/admin/settings" className="ml-4 flex-shrink-0 text-xs font-semibold px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:border-blue-300 hover:text-blue-600 transition-colors">
          사이트설정 →
        </a>
      </div>
    </div>
  );
}
