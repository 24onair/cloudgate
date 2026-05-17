"use client";

/**
 * /admin/pilots/rotation — 파일럿 순번 관리 (PC)
 *
 * 두 탭:
 *   ① 기본 순번: pilots.rotation_order 직접 수정 (드래그앤드롭으로 일괄 PUT)
 *   ② 오늘 오버라이드: pilot_rotation_overrides — 그 날만의 임시 순서.
 *      해제하면 자동 배정이 다시 기본 순번을 사용.
 *
 * 자동 배정 알고리즘은 effective_order = override ?? rotation_order ?? 999.
 * 즉 ② 탭의 순서가 ① 탭보다 우선.
 */

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  ArrowLeft,
  GripVertical,
  RotateCcw,
  Save,
  CheckCircle2,
  AlertTriangle,
  Users,
  CalendarDays,
  ListOrdered,
  ArrowRight,
  Clock3,
} from "lucide-react";

// ─── 타입 ─────────────────────────────────────────────────────────

interface PilotRow {
  id: string;
  name: string;
  rotation_order: number | null;
  override_order?: number | null;
  effective_order?: number | null;
}

interface QueueInfo {
  date: string;
  last_assigned_pilot_id: string | null;
  last_assigned_name: string | null;
  last_assigned_at: string | null;
  total: number;
  pilots: Array<{
    id: string;
    name: string;
    effective_order: number | null;
    queue_idx: number;
  }>;
}

type Tab = "default" | "override";

// ─── 유틸 ─────────────────────────────────────────────────────────

function pad2(n: number) {
  return String(n).padStart(2, "0");
}
function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}
function formatKoDate(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  const days = ["일", "월", "화", "수", "목", "금", "토"];
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일 (${days[d.getDay()]})`;
}

function timeAgo(iso: string | null): string {
  if (!iso) return "";
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 0) return "방금";
  const min = Math.floor(ms / 60000);
  if (min < 1) return "방금";
  if (min < 60) return `${min}분 전`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}시간 전`;
  const day = Math.floor(hr / 24);
  return `${day}일 전`;
}

// ─── 페이지 ───────────────────────────────────────────────────────

export default function PilotRotationPage() {
  const [tab, setTab] = useState<Tab>("default");
  const [overrideDate, setOverrideDate] = useState<string>(todayISO());

  // 두 탭의 리스트 상태를 분리해 보관
  const [defaultList, setDefaultList] = useState<PilotRow[]>([]);
  const [overrideList, setOverrideList] = useState<PilotRow[]>([]);
  const [overrideExists, setOverrideExists] = useState(false);
  // 큐 포인터 상태 (오늘 기준)
  const [queue, setQueue] = useState<QueueInfo | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [toast, setToast] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  // ── 로드 ──────────────────────────────────────────────────────────
  async function loadDefault() {
    const r = await fetch("/api/admin/pilots/rotation", { cache: "no-store" });
    const j = r.ok ? await r.json() : [];
    setDefaultList(j);
  }
  async function loadOverride(d: string) {
    const r = await fetch(`/api/admin/pilots/rotation/override?date=${d}`, {
      cache: "no-store",
    });
    if (!r.ok) {
      setOverrideList([]);
      setOverrideExists(false);
      return;
    }
    const j = await r.json();
    setOverrideList(j.pilots ?? []);
    setOverrideExists(!!j.hasOverride);
  }
  async function loadQueue(d: string) {
    const r = await fetch(`/api/admin/pilots/rotation/queue?date=${d}`, {
      cache: "no-store",
    });
    if (!r.ok) {
      setQueue(null);
      return;
    }
    const j = (await r.json()) as QueueInfo;
    setQueue(j);
  }

  useEffect(() => {
    setLoading(true);
    Promise.all([loadDefault(), loadOverride(overrideDate), loadQueue(todayISO())]).finally(() =>
      setLoading(false),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadOverride(overrideDate);
    setDirty(false);
  }, [overrideDate]);

  // ── DnD ───────────────────────────────────────────────────────────
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function onDragEnd(e: DragEndEvent, current: PilotRow[], setter: (v: PilotRow[]) => void) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIdx = current.findIndex((x) => x.id === active.id);
    const newIdx = current.findIndex((x) => x.id === over.id);
    if (oldIdx < 0 || newIdx < 0) return;
    setter(arrayMove(current, oldIdx, newIdx));
    setDirty(true);
  }

  // ── 저장 ──────────────────────────────────────────────────────────
  function showToast(kind: "ok" | "err", text: string) {
    setToast({ kind, text });
    setTimeout(() => setToast(null), 3500);
  }

  async function saveDefault() {
    setSaving(true);
    try {
      const orders = defaultList.map((p) => p.id);
      const r = await fetch("/api/admin/pilots/rotation", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orders }),
      });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        throw new Error(j?.error ?? "저장 실패");
      }
      await Promise.all([loadDefault(), loadQueue(todayISO())]);
      setDirty(false);
      showToast("ok", "기본 순번을 저장했습니다.");
    } catch (e: unknown) {
      showToast("err", e instanceof Error ? e.message : "저장 실패");
    } finally {
      setSaving(false);
    }
  }

  async function saveOverride() {
    setSaving(true);
    try {
      const orders = overrideList.map((p) => p.id);
      const r = await fetch("/api/admin/pilots/rotation/override", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: overrideDate, orders }),
      });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        throw new Error(j?.error ?? "저장 실패");
      }
      await Promise.all([loadOverride(overrideDate), loadQueue(todayISO())]);
      setDirty(false);
      showToast("ok", `${formatKoDate(overrideDate)} 오버라이드 저장 완료.`);
    } catch (e: unknown) {
      showToast("err", e instanceof Error ? e.message : "저장 실패");
    } finally {
      setSaving(false);
    }
  }

  async function clearOverride() {
    if (!confirm(`${formatKoDate(overrideDate)} 오버라이드를 모두 삭제할까요? (기본 순번으로 돌아갑니다)`))
      return;
    setSaving(true);
    try {
      const r = await fetch(
        `/api/admin/pilots/rotation/override?date=${overrideDate}`,
        { method: "DELETE" },
      );
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        throw new Error(j?.error ?? "삭제 실패");
      }
      await Promise.all([loadOverride(overrideDate), loadQueue(todayISO())]);
      setDirty(false);
      showToast("ok", "오버라이드를 삭제하고 기본 순번으로 복원했습니다.");
    } catch (e: unknown) {
      showToast("err", e instanceof Error ? e.message : "삭제 실패");
    } finally {
      setSaving(false);
    }
  }

  // ── 렌더 ──────────────────────────────────────────────────────────
  const current = tab === "default" ? defaultList : overrideList;
  const setCurrent = tab === "default" ? setDefaultList : setOverrideList;

  return (
    <div className="p-8 max-w-3xl">
      {/* 헤더 */}
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/admin/pilots"
          className="p-2 rounded-lg hover:bg-gray-200 text-gray-500"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2" style={{ color: "#0D2B52" }}>
            <ListOrdered className="w-6 h-6" style={{ color: "#FF8A00" }} />
            파일럿 순번 관리
          </h1>
          <p className="text-sm mt-0.5" style={{ color: "#65675e" }}>
            현장에서 손님을 돌아가며 태우는 순서입니다. 드래그(⋮⋮)로 순서를 바꾸고 저장하세요.
          </p>
        </div>
      </div>

      {/* 오늘의 큐 상태 카드 */}
      {queue && queue.total > 0 && (
        <div
          className="mb-4 rounded-xl p-3 flex items-center gap-3 flex-wrap"
          style={{ backgroundColor: "#FFF7ED", border: "1px solid #FED7AA" }}
        >
          <div className="flex items-center gap-2">
            <Clock3 className="w-4 h-4" style={{ color: "#9A3412" }} />
            <span className="text-xs font-bold" style={{ color: "#9A3412" }}>
              오늘 라운드로빈 큐
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-sm" style={{ color: "#7C2D12" }}>
            <span className="text-[11px]" style={{ color: "#9A3412" }}>
              마지막 배정:
            </span>
            <span className="font-bold">
              {queue.last_assigned_name ?? "(없음 — 처음부터 시작)"}
            </span>
            {queue.last_assigned_at && (
              <span className="text-[11px]" style={{ color: "#9A3412" }}>
                · {timeAgo(queue.last_assigned_at)}
              </span>
            )}
          </div>
          <ArrowRight className="w-3.5 h-3.5" style={{ color: "#9A3412" }} />
          <div className="flex items-center gap-1.5 text-sm" style={{ color: "#7C2D12" }}>
            <span className="text-[11px]" style={{ color: "#9A3412" }}>
              다음 차례:
            </span>
            <span
              className="px-2 py-0.5 rounded-md font-bold text-white"
              style={{ backgroundColor: "#9A3412" }}
            >
              {queue.pilots[0]?.name ?? "—"}
            </span>
            {queue.pilots[1] && (
              <span className="text-[11px]" style={{ color: "#9A3412" }}>
                → {queue.pilots[1].name}
                {queue.pilots[2] && ` → ${queue.pilots[2].name}`}
                {queue.pilots.length > 3 && ` … (+${queue.pilots.length - 3})`}
              </span>
            )}
          </div>
          <span
            className="ml-auto text-[10px] px-2 py-0.5 rounded-md"
            style={{ backgroundColor: "white", color: "#9A3412", border: "1px solid #FED7AA" }}
          >
            기준일: 오늘 ({queue.date})
          </span>
        </div>
      )}

      {/* 토스트 */}
      {toast && (
        <div
          className="mb-4 rounded-xl px-4 py-2.5 text-sm font-semibold flex items-center gap-2"
          style={{
            backgroundColor: toast.kind === "ok" ? "#ECFDF5" : "#FEF2F2",
            color: toast.kind === "ok" ? "#047857" : "#B91C1C",
          }}
        >
          {toast.kind === "ok" ? (
            <CheckCircle2 className="w-4 h-4" />
          ) : (
            <AlertTriangle className="w-4 h-4" />
          )}
          {toast.text}
        </div>
      )}

      {/* 탭 */}
      <div className="flex gap-1 mb-4 p-1 rounded-xl bg-white" style={{ border: "1px solid #E5E7EB" }}>
        <TabButton
          active={tab === "default"}
          onClick={() => {
            if (dirty && !confirm("저장하지 않은 변경사항이 있습니다. 탭을 바꿀까요?")) return;
            setTab("default");
            setDirty(false);
          }}
        >
          <Users className="w-4 h-4" /> 기본 순번
        </TabButton>
        <TabButton
          active={tab === "override"}
          onClick={() => {
            if (dirty && !confirm("저장하지 않은 변경사항이 있습니다. 탭을 바꿀까요?")) return;
            setTab("override");
            setDirty(false);
          }}
        >
          <CalendarDays className="w-4 h-4" /> 일자 오버라이드
        </TabButton>
      </div>

      {/* 안내 박스 */}
      <div
        className="rounded-xl p-3 mb-4 text-sm"
        style={{ backgroundColor: "#EFF6FF", color: "#1E3A8A" }}
      >
        {tab === "default" ? (
          <>
            <strong>기본 순번</strong> — 평소 적용되는 라운드로빈 순서. 한 번 정해두면 변경 전까지 유지됩니다.
            자동 배정은 「당일 비행수 적은 순 → 순번 빠른 순」으로 파일럿을 채웁니다.
          </>
        ) : (
          <>
            <strong>일자 오버라이드</strong> — 특정 날짜만 다른 순서를 쓰고 싶을 때 사용. 그날의 자동 배정은
            이 순서를 기본 순번보다 <strong>우선</strong>합니다. 「기본 순번으로 되돌리기」를 누르면 그날만 다시 기본을 사용.
          </>
        )}
      </div>

      {/* 오버라이드 탭: 날짜 선택 */}
      {tab === "override" && (
        <div className="flex items-center gap-2 mb-4">
          <label className="text-sm font-semibold" style={{ color: "#0D2B52" }}>
            날짜
          </label>
          <input
            type="date"
            value={overrideDate}
            onChange={(e) => setOverrideDate(e.target.value)}
            className="px-3 py-2 rounded-lg border bg-white text-sm"
            style={{ borderColor: "#E5E7EB" }}
          />
          <span className="text-xs" style={{ color: "#65675e" }}>
            {formatKoDate(overrideDate)}
            {overrideExists ? " · 오버라이드 활성" : " · 기본 순번 사용 중"}
          </span>
          {overrideExists && (
            <button
              type="button"
              onClick={clearOverride}
              disabled={saving}
              className="ml-auto text-xs px-3 py-1.5 rounded-lg flex items-center gap-1 disabled:opacity-50"
              style={{ backgroundColor: "#FEF2F2", color: "#B91C1C", border: "1px solid #FCA5A5" }}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              기본 순번으로 되돌리기
            </button>
          )}
        </div>
      )}

      {/* 리스트 */}
      <div
        className="rounded-2xl bg-white p-3"
        style={{ border: "1px solid #E5E7EB" }}
      >
        {loading ? (
          <div className="py-12 text-center text-sm" style={{ color: "#9ea096" }}>
            불러오는 중…
          </div>
        ) : current.length === 0 ? (
          <div className="py-10 text-center text-sm" style={{ color: "#9ea096" }}>
            활성 파일럿이 없습니다.
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={(e) => onDragEnd(e, current, setCurrent)}
          >
            <SortableContext
              items={current.map((p) => p.id)}
              strategy={verticalListSortingStrategy}
            >
              <ol className="space-y-1.5">
                {current.map((p, i) => (
                  <SortableRow
                    key={p.id}
                    pilot={p}
                    displayOrder={i + 1}
                    showBaseHint={
                      tab === "override" && p.rotation_order != null && p.rotation_order !== i + 1
                    }
                  />
                ))}
              </ol>
            </SortableContext>
          </DndContext>
        )}
      </div>

      {/* 하단 저장 바 */}
      <div className="mt-5 flex items-center justify-between gap-3">
        <div className="text-xs" style={{ color: "#65675e" }}>
          {dirty ? (
            <span style={{ color: "#B45309" }}>● 저장하지 않은 변경사항이 있습니다</span>
          ) : (
            <span>모든 변경사항이 저장됨</span>
          )}
        </div>
        <button
          type="button"
          onClick={tab === "default" ? saveDefault : saveOverride}
          disabled={!dirty || saving || loading || current.length === 0}
          className="px-5 py-2.5 rounded-xl font-bold text-sm text-white flex items-center gap-2 disabled:opacity-50"
          style={{ backgroundColor: "#0D2B52" }}
        >
          <Save className="w-4 h-4" />
          {saving ? "저장 중…" : tab === "default" ? "기본 순번 저장" : "이 날짜 오버라이드 저장"}
        </button>
      </div>
    </div>
  );
}

// ─── 탭 버튼 ─────────────────────────────────────────────────────

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex-1 px-4 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-1.5 transition"
      style={{
        backgroundColor: active ? "#0D2B52" : "transparent",
        color: active ? "white" : "#65675e",
      }}
    >
      {children}
    </button>
  );
}

// ─── 정렬 가능 행 ─────────────────────────────────────────────────

function SortableRow({
  pilot,
  displayOrder,
  showBaseHint,
}: {
  pilot: PilotRow;
  displayOrder: number;
  showBaseHint: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: pilot.id });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : undefined,
    opacity: isDragging ? 0.85 : 1,
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 p-3 rounded-xl bg-white"
    >
      {/* 핸들 */}
      <button
        type="button"
        {...attributes}
        {...listeners}
        aria-label="순서 변경"
        className="cursor-grab active:cursor-grabbing p-1 text-gray-400 hover:text-gray-700"
      >
        <GripVertical className="w-5 h-5" />
      </button>
      {/* 순번 배지 */}
      <div
        className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
        style={{ backgroundColor: "#0D2B52", color: "white" }}
      >
        {displayOrder}
      </div>
      {/* 이름 + 보조 */}
      <div className="flex-1 min-w-0">
        <div className="font-bold" style={{ color: "#0D2B52" }}>
          {pilot.name}
        </div>
        {showBaseHint && (
          <div className="text-[11px] mt-0.5" style={{ color: "#B45309" }}>
            기본 순번: {pilot.rotation_order} → 이 날만 {displayOrder}번
          </div>
        )}
      </div>
      {/* 우측 핸들 영역 */}
      <div
        className="px-2 py-1 rounded-md text-[10px] font-bold"
        style={{
          backgroundColor: isDragging ? "#FEF3C7" : "#F3F4F6",
          color: "#65675e",
        }}
      >
        DRAG
      </div>
    </li>
  );
}
