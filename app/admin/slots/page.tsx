"use client";

import { useState } from "react";
import {
  Clock,
  ChevronLeft,
  ChevronRight,
  Settings,
  X,
  Check,
  Ban,
  Users as UsersIcon,
  Info,
} from "lucide-react";
import {
  useSlotConfig,
  updateSlotConfig,
  useBlockedSlots,
  toggleBlockedSlot,
  generateSlotTimes,
  countAvailablePilots,
  type SlotConfig,
} from "@/lib/slotStore";
import { useSchedules, PILOTS_META, SCHEDULE_CFG, type ScheduleStatus } from "@/lib/scheduleStore";

const TODAY_STR = fmtDate(new Date());
const DAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];

function fmtDate(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseDate(s: string) {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function dateLabel(s: string) {
  const d = parseDate(s);
  return `${d.getMonth() + 1}월 ${d.getDate()}일 (${DAY_LABELS[d.getDay()]})`;
}

export default function AdminSlotsPage() {
  const cfg = useSlotConfig();
  const blocks = useBlockedSlots();
  const schedules = useSchedules();

  const [selectedDate, setSelectedDate] = useState(TODAY_STR);
  const [showSettings, setShowSettings] = useState(false);
  const [draftCfg, setDraftCfg] = useState<SlotConfig>(cfg);

  const slotTimes = generateSlotTimes(cfg);
  const availablePilots = countAvailablePilots(selectedDate, schedules);
  const blockedForDate = blocks[selectedDate] ?? [];
  const isPast = selectedDate < TODAY_STR;

  // 7일 navigation 데이터
  const today = parseDate(TODAY_STR);
  const dates: string[] = [];
  for (let i = -1; i < 13; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    dates.push(fmtDate(d));
  }
  const selectedIdx = dates.indexOf(selectedDate);

  const workingPilots = PILOTS_META.filter((p) => {
    const s = schedules[p.id]?.[selectedDate] as ScheduleStatus | undefined;
    return s === "working" || s === "standby";
  });

  function openSettings() {
    setDraftCfg(cfg);
    setShowSettings(true);
  }
  function saveSettings() {
    updateSlotConfig(draftCfg);
    setShowSettings(false);
  }

  function toggleBlock(time: string) {
    if (isPast) return;
    toggleBlockedSlot(selectedDate, time);
  }

  return (
    <div className="p-6">
      {/* 헤더 */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Clock className="w-6 h-6" style={{ color: "#2A7AE2" }} />
            예약 슬롯 관리
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            예약 가능 시간대와 정원(가용 파일럿 수)을 관리합니다.
          </p>
        </div>
        <button
          onClick={openSettings}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border border-gray-200 hover:bg-gray-50"
        >
          <Settings className="w-4 h-4 text-gray-500" />
          운영 시간 설정
        </button>
      </div>

      {/* 운영 정보 카드 */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <InfoCard
          label="운영 시간"
          value={`${cfg.startTime} ~ ${cfg.endTime}`}
          sub={`${cfg.intervalMinutes}분 간격`}
          color="#2A7AE2"
        />
        <InfoCard
          label="총 슬롯 수"
          value={`${slotTimes.length}개`}
          sub="하루 기준"
          color="#10B981"
        />
        <InfoCard
          label={`${dateLabel(selectedDate)} 가용 파일럿`}
          value={`${availablePilots}명`}
          sub={availablePilots === 0 ? "운영 불가" : `슬롯당 최대 ${availablePilots}건`}
          color={availablePilots === 0 ? "#EF4444" : "#FF8A00"}
        />
      </div>

      {/* 날짜 선택 */}
      <div className="bg-white rounded-2xl shadow-sm p-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold text-gray-700">날짜 선택</p>
          <button
            onClick={() => setSelectedDate(TODAY_STR)}
            className="text-xs text-blue-600 font-medium hover:underline"
          >
            오늘로
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => selectedIdx > 0 && setSelectedDate(dates[selectedIdx - 1])}
            className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50 disabled:opacity-30"
            disabled={selectedIdx <= 0}
          >
            <ChevronLeft className="w-4 h-4 text-gray-500" />
          </button>
          <div className="flex-1 grid grid-cols-7 gap-1.5 overflow-x-auto">
            {dates.slice(Math.max(0, selectedIdx - 3), Math.max(0, selectedIdx - 3) + 7).map((d) => {
              const dt = parseDate(d);
              const dow = dt.getDay();
              const isToday = d === TODAY_STR;
              const isSelected = d === selectedDate;
              const isPastDate = d < TODAY_STR;
              const pCount = countAvailablePilots(d, schedules);
              return (
                <button
                  key={d}
                  onClick={() => setSelectedDate(d)}
                  className="rounded-xl py-2 transition-all"
                  style={{
                    backgroundColor: isSelected ? "#2A7AE2" : "#F8FAFC",
                    border: isToday && !isSelected ? "1.5px solid #2A7AE2" : "1.5px solid transparent",
                    opacity: isPastDate ? 0.5 : 1,
                  }}
                >
                  <p
                    className="text-[10px] font-medium"
                    style={{
                      color: isSelected
                        ? "rgba(255,255,255,0.8)"
                        : dow === 0 ? "#EF4444"
                        : dow === 6 ? "#2A7AE2"
                        : "#9CA3AF",
                    }}
                  >
                    {DAY_LABELS[dow]}
                  </p>
                  <p className="text-base font-bold mt-0.5" style={{ color: isSelected ? "white" : "#0D2B52" }}>
                    {dt.getDate()}
                  </p>
                  <p className="text-[10px] mt-0.5" style={{ color: isSelected ? "rgba(255,255,255,0.85)" : "#FF8A00" }}>
                    {pCount}명
                  </p>
                </button>
              );
            })}
          </div>
          <button
            onClick={() => selectedIdx < dates.length - 1 && setSelectedDate(dates[selectedIdx + 1])}
            className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50 disabled:opacity-30"
            disabled={selectedIdx >= dates.length - 1}
          >
            <ChevronRight className="w-4 h-4 text-gray-500" />
          </button>
        </div>
      </div>

      {/* 출근 파일럿 미리보기 */}
      <div className="bg-white rounded-2xl shadow-sm p-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <UsersIcon className="w-4 h-4 text-gray-500" />
            {dateLabel(selectedDate)} 가용 파일럿
          </p>
          <span className="text-xs text-gray-400">출근·대기 상태만 카운트</span>
        </div>
        {workingPilots.length === 0 ? (
          <div className="rounded-xl bg-red-50 px-3 py-3 text-sm text-red-600">
            가용 파일럿이 없습니다. 파일럿장에서 출근 스케줄을 등록해주세요.
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {workingPilots.map((p) => {
              const status = schedules[p.id]?.[selectedDate] as ScheduleStatus;
              const cfg = SCHEDULE_CFG[status];
              return (
                <div
                  key={p.id}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-full border"
                  style={{ borderColor: cfg.color, backgroundColor: cfg.bg }}
                >
                  <span
                    className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] font-bold"
                    style={{ backgroundColor: p.avatarColor }}
                  >
                    {p.initials}
                  </span>
                  <span className="text-sm font-medium" style={{ color: cfg.color }}>
                    {p.name}
                  </span>
                  <span className="text-xs" style={{ color: cfg.color, opacity: 0.7 }}>
                    {cfg.label}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 슬롯 그리드 */}
      <div className="bg-white rounded-2xl shadow-sm p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold text-gray-700">시간대별 슬롯 (총 {slotTimes.length}개)</p>
          <span className="text-xs text-gray-400">
            슬롯 클릭 → 차단/해제 ({blockedForDate.length}개 차단됨)
          </span>
        </div>

        {isPast && (
          <div className="rounded-xl bg-gray-50 px-3 py-2 mb-3 text-xs text-gray-500 flex items-center gap-2">
            <Info className="w-3.5 h-3.5" />
            지난 날짜는 수정할 수 없습니다.
          </div>
        )}

        <div className="grid grid-cols-6 gap-2">
          {slotTimes.map((time) => {
            const blocked = blockedForDate.includes(time);
            const noPilot = availablePilots === 0;
            const disabled = blocked || noPilot;

            return (
              <button
                key={time}
                onClick={() => toggleBlock(time)}
                disabled={isPast}
                className="rounded-xl p-3 text-left transition-all relative"
                style={{
                  backgroundColor: blocked ? "#FEE2E2" : noPilot ? "#F3F4F6" : "#EFF6FF",
                  border: `1.5px solid ${blocked ? "#EF4444" : noPilot ? "#D1D5DB" : "#BFDBFE"}`,
                  opacity: isPast ? 0.5 : 1,
                  cursor: isPast ? "default" : "pointer",
                }}
              >
                <p
                  className="text-base font-bold"
                  style={{ color: blocked ? "#B91C1C" : noPilot ? "#9CA3AF" : "#0D2B52" }}
                >
                  {time}
                </p>
                <p
                  className="text-[11px] mt-1 flex items-center gap-1"
                  style={{ color: blocked ? "#B91C1C" : noPilot ? "#9CA3AF" : "#2A7AE2" }}
                >
                  {blocked ? (
                    <>
                      <Ban className="w-3 h-3" />
                      차단됨
                    </>
                  ) : noPilot ? (
                    "파일럿 없음"
                  ) : (
                    <>
                      <UsersIcon className="w-3 h-3" />
                      최대 {availablePilots}건
                    </>
                  )}
                </p>
              </button>
            );
          })}
        </div>

        {/* 범례 */}
        <div className="flex flex-wrap gap-4 mt-4 pt-3 border-t border-gray-100 text-xs text-gray-500">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded" style={{ background: "#EFF6FF", border: "1.5px solid #BFDBFE" }} />
            예약 가능
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded" style={{ background: "#FEE2E2", border: "1.5px solid #EF4444" }} />
            차단됨
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded" style={{ background: "#F3F4F6", border: "1.5px solid #D1D5DB" }} />
            파일럿 없음
          </span>
        </div>
      </div>

      {/* 운영 시간 설정 모달 */}
      {showSettings && (
        <>
          <div
            className="fixed inset-0 bg-black/40 z-40"
            onClick={() => setShowSettings(false)}
          />
          <div
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-2xl z-50 p-6 w-full max-w-md shadow-2xl"
          >
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-gray-900">운영 시간 설정</h2>
              <button onClick={() => setShowSettings(false)} className="p-1.5 hover:bg-gray-100 rounded-lg">
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1.5 block">시작 시간</label>
                  <input
                    type="time"
                    value={draftCfg.startTime}
                    onChange={(e) => setDraftCfg({ ...draftCfg, startTime: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-300"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1.5 block">종료 시간</label>
                  <input
                    type="time"
                    value={draftCfg.endTime}
                    onChange={(e) => setDraftCfg({ ...draftCfg, endTime: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-300"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-gray-500 mb-1.5 block">슬롯 간격</label>
                <div className="grid grid-cols-3 gap-2">
                  {[15, 30, 60].map((m) => (
                    <button
                      key={m}
                      onClick={() => setDraftCfg({ ...draftCfg, intervalMinutes: m })}
                      className="py-2.5 rounded-xl text-sm font-medium border-2 transition-all"
                      style={{
                        borderColor: draftCfg.intervalMinutes === m ? "#2A7AE2" : "#E5E7EB",
                        backgroundColor: draftCfg.intervalMinutes === m ? "#EFF6FF" : "white",
                        color: draftCfg.intervalMinutes === m ? "#2A7AE2" : "#374151",
                      }}
                    >
                      {m}분
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-xl bg-blue-50 p-3 text-xs text-blue-700 flex items-start gap-2">
                <Info className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                <span>
                  변경 시 예약 페이지에 즉시 반영됩니다. 기존 예약 시간은 유지되지만,
                  새 예약은 변경된 슬롯만 표시됩니다.
                </span>
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <button
                onClick={() => setShowSettings(false)}
                className="flex-1 py-3 rounded-xl text-sm font-medium border border-gray-200 hover:bg-gray-50"
              >
                취소
              </button>
              <button
                onClick={saveSettings}
                className="flex-1 py-3 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2"
                style={{ backgroundColor: "#0D2B52" }}
              >
                <Check className="w-4 h-4" />
                저장
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function InfoCard({
  label, value, sub, color,
}: { label: string; value: string; sub: string; color: string }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm p-4">
      <p className="text-xs font-medium text-gray-400">{label}</p>
      <p className="text-2xl font-bold mt-1" style={{ color }}>
        {value}
      </p>
      <p className="text-xs text-gray-500 mt-1">{sub}</p>
    </div>
  );
}
