"use client";

/**
 * 모바일용 Bottom Sheet — Radix/vaul 없이 의존성 0개로 구현.
 *
 * 사용:
 *   const [open, setOpen] = useState(false);
 *   <BottomSheet open={open} onClose={() => setOpen(false)} title="파일럿 선택">
 *     ...content...
 *   </BottomSheet>
 *
 * 디자인 결정:
 *  - 백드롭 클릭 또는 우상단 X 또는 핸들바 드래그 다운으로 닫힘
 *  - 최대 높이 80vh, 컨텐츠 영역은 자체 스크롤
 *  - 열릴 때 body scroll lock
 *  - z-index 60 (StickyActionBar의 50보다 위)
 */

import { useEffect, useRef } from "react";
import { X } from "lucide-react";

export interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  /** 추가 컨텐츠 클래스 (예: padding 조정) */
  contentClassName?: string;
}

export default function BottomSheet({
  open,
  onClose,
  title,
  children,
  contentClassName = "",
}: BottomSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const startYRef = useRef<number | null>(null);
  const deltaYRef = useRef(0);

  // body scroll lock
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // ESC 키 닫기
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  function onTouchStart(e: React.TouchEvent) {
    startYRef.current = e.touches[0].clientY;
    deltaYRef.current = 0;
  }

  function onTouchMove(e: React.TouchEvent) {
    if (startYRef.current === null) return;
    const dy = e.touches[0].clientY - startYRef.current;
    if (dy < 0) return; // 위로 끄는 건 무시
    deltaYRef.current = dy;
    if (sheetRef.current) {
      sheetRef.current.style.transform = `translateY(${dy}px)`;
      sheetRef.current.style.transition = "none";
    }
  }

  function onTouchEnd() {
    if (sheetRef.current) {
      sheetRef.current.style.transition = "transform 200ms ease-out";
      // 120px 이상 드래그하면 닫음
      if (deltaYRef.current > 120) {
        sheetRef.current.style.transform = "translateY(100%)";
        setTimeout(onClose, 180);
      } else {
        sheetRef.current.style.transform = "translateY(0)";
      }
    }
    startYRef.current = null;
    deltaYRef.current = 0;
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center"
      role="dialog"
      aria-modal="true"
      aria-label={title ?? "Bottom Sheet"}
    >
      {/* 백드롭 */}
      <button
        type="button"
        aria-label="닫기"
        onClick={onClose}
        className="absolute inset-0 bg-black/40 animate-in fade-in"
      />

      {/* 시트 */}
      <div
        ref={sheetRef}
        className={`relative w-full max-w-md bg-white rounded-t-3xl shadow-2xl flex flex-col max-h-[80vh] transition-transform duration-200`}
        style={{
          paddingBottom: "env(safe-area-inset-bottom)",
          transform: "translateY(0)",
        }}
      >
        {/* 드래그 핸들 */}
        <div
          className="py-3 cursor-grab active:cursor-grabbing"
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          <div className="mx-auto w-10 h-1.5 rounded-full bg-gray-300" />
        </div>

        {/* 타이틀 + X */}
        {title && (
          <div className="px-5 pb-3 flex items-center justify-between">
            <div className="text-lg font-bold" style={{ color: "#0D2B52" }}>
              {title}
            </div>
            <button
              type="button"
              aria-label="닫기"
              onClick={onClose}
              className="w-9 h-9 rounded-full flex items-center justify-center active:bg-gray-100"
            >
              <X size={20} style={{ color: "#65675e" }} />
            </button>
          </div>
        )}

        {/* 컨텐츠 (자체 스크롤) */}
        <div className={`flex-1 overflow-y-auto px-5 pb-5 ${contentClassName}`}>
          {children}
        </div>
      </div>
    </div>
  );
}
