"use client";

/**
 * 화면 하단에 고정되는 액션 바. 폼 confirm/next 버튼 자리.
 *
 * - safe-area-inset-bottom 자동 보정 (iOS 홈바)
 * - 키보드 push-up은 브라우저가 알아서 처리하지만, 입력 중일 때 가려지지 않게
 *   `position: fixed`가 아니라 sticky로 두는 옵션도 제공.
 * - 부모 컨테이너의 max-w-md를 따라가도록 absolute가 아닌 inset-x-0 + max-w-md
 *
 * 사용:
 *   <StickyActionBar>
 *     <button className="...">다음</button>
 *   </StickyActionBar>
 *
 *   // 또는 보조 버튼과 함께
 *   <StickyActionBar>
 *     <button>취소</button>
 *     <button>확정</button>
 *   </StickyActionBar>
 */

interface Props {
  children: React.ReactNode;
  /** 페이지 본문 위에 그림자/구분선 표시 */
  withShadow?: boolean;
}

export default function StickyActionBar({ children, withShadow = true }: Props) {
  return (
    <>
      {/* 본문 콘텐츠가 액션바에 가리지 않도록 spacer */}
      <div aria-hidden style={{ height: "calc(72px + env(safe-area-inset-bottom))" }} />

      <div
        className={`fixed bottom-0 inset-x-0 z-50 ${withShadow ? "" : ""}`}
        style={{
          paddingBottom: "env(safe-area-inset-bottom)",
        }}
      >
        <div
          className="mx-auto max-w-md bg-white px-4 py-3 flex gap-2"
          style={{
            boxShadow: withShadow ? "0 -4px 12px rgba(0,0,0,0.06)" : undefined,
            borderTop: "1px solid #eaecef",
          }}
        >
          {children}
        </div>
      </div>
    </>
  );
}
