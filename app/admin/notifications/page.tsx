"use client";

import { useState, useMemo } from "react";
import {
  Send,
  MessageSquare,
  Smartphone,
  Bell,
  CheckCircle2,
  XCircle,
  Clock,
  MailOpen,
  ChevronDown,
  X,
  Plus,
  Users,
  User,
  Search,
  AlertTriangle,
  RefreshCw,
  Copy,
  FileText,
} from "lucide-react";

// ── 타입 ────────────────────────────────────────────────────────
type Channel = "kakao" | "sms" | "push";
type NotiStatus = "sent" | "failed" | "pending" | "read";
type TemplateCategory = "booking" | "payment" | "ops" | "pilot" | "marketing";

interface NotificationLog {
  id: string;
  channel: Channel;
  recipient: string;
  recipientType: "customer" | "pilot" | "all";
  templateName: string;
  preview: string;
  status: NotiStatus;
  sentAt: string;
  readAt?: string;
  retryCount: number;
}

interface Template {
  id: string;
  name: string;
  category: TemplateCategory;
  channel: Channel[];
  body: string;
  variables: string[];
  usageCount: number;
}

// ── 목업 데이터 ─────────────────────────────────────────────────
// TODO: API — INITIAL_LOGS 목업 → GET /api/notifications/logs (query: ?channel=&status=)
// TODO: API — TEMPLATES 목업 → GET /api/notifications/templates
// TODO: API — 알림 발송 → POST /api/notifications/send { templateId, recipients, variables }
// TODO: API — 재시도 → POST /api/notifications/:id/retry
const INITIAL_LOGS: NotificationLog[] = [
  { id: "n01", channel: "kakao", recipient: "이수진",   recipientType: "customer", templateName: "착륙완료 알림",   preview: "[구름상회] 비행이 안전하게 완료되었습니다. 이용해 주셔서 감사합니다.", status: "read",    sentAt: "10:21", readAt: "10:22", retryCount: 0 },
  { id: "n02", channel: "kakao", recipient: "최현우",   recipientType: "customer", templateName: "착륙완료 알림",   preview: "[구름상회] 비행이 안전하게 완료되었습니다. 이용해 주셔서 감사합니다.", status: "read",    sentAt: "11:26", readAt: "11:30", retryCount: 0 },
  { id: "n03", channel: "sms",   recipient: "서지훈",   recipientType: "customer", templateName: "착륙완료 알림",   preview: "[구름상회] 비행 완료. 소중한 추억 되셨기를 바랍니다 :)", status: "read",    sentAt: "12:31", readAt: "12:45", retryCount: 0 },
  { id: "n04", channel: "push",  recipient: "강미라",   recipientType: "customer", templateName: "예약 취소 확인",  preview: "[구름상회] 예약이 취소 처리되었습니다. 환불은 3~5영업일 내 처리됩니다.", status: "sent",    sentAt: "13:10", retryCount: 0 },
  { id: "n05", channel: "kakao", recipient: "박지연",   recipientType: "customer", templateName: "탑승 안내",       preview: "[구름상회] 14:00 비행을 위해 탑승 준비해 주세요. 파일럿: 박구름", status: "sent",    sentAt: "13:45", retryCount: 0 },
  { id: "n06", channel: "kakao", recipient: "박구름",   recipientType: "pilot",    templateName: "자격증 만료 경보", preview: "[구름상회] 민간항공조종사 자격증 만료 D-21. 갱신을 서둘러 주세요.", status: "read",    sentAt: "09:00", readAt: "09:05", retryCount: 0 },
  { id: "n07", channel: "kakao", recipient: "최하람",   recipientType: "pilot",    templateName: "자격증 만료 경보", preview: "[구름상회] 패러글라이딩 조종면허 만료 D-2. 즉시 갱신 필요합니다!", status: "sent",    sentAt: "09:00", retryCount: 0 },
  { id: "n08", channel: "sms",   recipient: "김민준",   recipientType: "customer", templateName: "비행 당일 리마인더", preview: "[구름상회] 오늘 13:00 체험비행 예약이 있습니다. 10분 전 도착 부탁드립니다.", status: "sent",    sentAt: "08:00", retryCount: 0 },
  { id: "n09", channel: "push",  recipient: "정성민",   recipientType: "customer", templateName: "비행 당일 리마인더", preview: "[구름상회] 오늘 15:00 VIP 체험비행 예약. 준비물: 편한 복장, 운동화", status: "failed",  sentAt: "08:00", retryCount: 3 },
  { id: "n10", channel: "kakao", recipient: "전체 고객", recipientType: "all",     templateName: "날씨 변경 안내",  preview: "[구름상회] 오늘 15시 이후 강풍 예보로 비행 일정이 변경될 수 있습니다.", status: "sent",    sentAt: "07:30", retryCount: 0 },
];

const TEMPLATES: Template[] = [
  { id: "t1", name: "예약 확정 알림",    category: "booking",   channel: ["kakao", "sms"], body: "[구름상회] {{고객명}}님의 {{날짜}} {{시간}} 체험비행 예약이 확정되었습니다.\n📍 집결지: 구름상회 체험장\n💳 결제금액: {{금액}}원", variables: ["고객명", "날짜", "시간", "금액"], usageCount: 142 },
  { id: "t2", name: "결제 완료 알림",    category: "payment",   channel: ["kakao"],        body: "[구름상회] 결제가 완료되었습니다.\n예약번호: {{예약번호}}\n금액: {{금액}}원\n예약일시: {{날짜}} {{시간}}", variables: ["예약번호", "금액", "날짜", "시간"], usageCount: 138 },
  { id: "t3", name: "비행 당일 리마인더", category: "ops",      channel: ["sms", "push"],  body: "[구름상회] 오늘 {{시간}} 체험비행 예약이 있습니다.\n10분 전 도착 부탁드립니다 🪂", variables: ["시간"], usageCount: 287 },
  { id: "t4", name: "탑승 안내",         category: "ops",       channel: ["kakao"],        body: "[구름상회] {{고객명}}님, {{시간}} 비행을 위해 탑승 준비해 주세요.\n담당 파일럿: {{파일럿}}", variables: ["고객명", "시간", "파일럿"], usageCount: 201 },
  { id: "t5", name: "착륙완료 알림",     category: "ops",       channel: ["kakao", "sms"], body: "[구름상회] {{고객명}}님의 비행이 안전하게 완료되었습니다 🎉\n이용해 주셔서 감사합니다!", variables: ["고객명"], usageCount: 312 },
  { id: "t6", name: "예약 취소 확인",    category: "booking",   channel: ["kakao", "push"],body: "[구름상회] 예약({{예약번호}})이 취소 처리되었습니다.\n환불은 3~5영업일 내 {{금액}}원이 처리됩니다.", variables: ["예약번호", "금액"], usageCount: 28 },
  { id: "t7", name: "날씨 변경 안내",    category: "ops",       channel: ["kakao", "sms", "push"], body: "[구름상회] 기상 변화로 {{날짜}} 비행 일정이 변경될 수 있습니다.\n담당자가 개별 연락 드리겠습니다.", variables: ["날짜"], usageCount: 15 },
  { id: "t8", name: "자격증 만료 경보",  category: "pilot",     channel: ["kakao"],        body: "[구름상회] {{파일럿}}님의 {{자격증명}} 만료까지 D-{{일수}}일 남았습니다.\n즉시 갱신을 진행해 주세요.", variables: ["파일럿", "자격증명", "일수"], usageCount: 7 },
  { id: "t9", name: "리뷰 요청",         category: "marketing", channel: ["kakao", "push"],body: "[구름상회] {{고객명}}님, 체험비행은 어떠셨나요? 소중한 후기를 남겨주시면 다음 이용 시 할인 쿠폰을 드립니다 💌", variables: ["고객명"], usageCount: 89 },
];

// ── 상수 ────────────────────────────────────────────────────────
const CHANNEL_CFG: Record<Channel, { label: string; color: string; bg: string; icon: typeof MessageSquare }> = {
  kakao: { label: "카카오톡", color: "#3B1D1D", bg: "#FEE500", icon: MessageSquare },
  sms:   { label: "SMS",     color: "#fff",    bg: "#2A7AE2", icon: Smartphone },
  push:  { label: "앱 푸시", color: "#fff",    bg: "#0D2B52", icon: Bell },
};

const STATUS_CFG: Record<NotiStatus, { label: string; color: string; bg: string; icon: typeof CheckCircle2 }> = {
  sent:    { label: "발송",   color: "#10B981", bg: "#ECFDF5", icon: CheckCircle2 },
  failed:  { label: "실패",   color: "#EF4444", bg: "#FEF2F2", icon: XCircle },
  pending: { label: "대기",   color: "#F59E0B", bg: "#FFFBEB", icon: Clock },
  read:    { label: "읽음",   color: "#6B7280", bg: "#F3F4F6", icon: MailOpen },
};

const CATEGORY_CFG: Record<TemplateCategory, { label: string; color: string; bg: string }> = {
  booking:   { label: "예약",   color: "#2A7AE2", bg: "#EFF6FF" },
  payment:   { label: "결제",   color: "#10B981", bg: "#ECFDF5" },
  ops:       { label: "운영",   color: "#FF8A00", bg: "#FFF7ED" },
  pilot:     { label: "파일럿", color: "#8B5CF6", bg: "#F5F3FF" },
  marketing: { label: "마케팅", color: "#EC4899", bg: "#FDF2F8" },
};

// ── 서브 컴포넌트 ────────────────────────────────────────────────
function ChannelBadge({ channel }: { channel: Channel }) {
  const cfg = CHANNEL_CFG[channel];
  const Icon = cfg.icon;
  return (
    <span
      className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full"
      style={{ background: cfg.bg, color: cfg.color }}
    >
      <Icon size={10} />
      {cfg.label}
    </span>
  );
}

function StatusBadge({ status }: { status: NotiStatus }) {
  const cfg = STATUS_CFG[status];
  const Icon = cfg.icon;
  return (
    <span
      className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full"
      style={{ background: cfg.bg, color: cfg.color }}
    >
      <Icon size={10} />
      {cfg.label}
    </span>
  );
}

// 발송 모달
function SendModal({ onClose, onSend }: { onClose: () => void; onSend: (log: NotificationLog) => void }) {
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [selectedChannel, setSelectedChannel] = useState<Channel>("kakao");
  const [recipientType, setRecipientType] = useState<"customer" | "pilot" | "all">("customer");
  const [recipientName, setRecipientName] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  function handleSend() {
    if (!selectedTemplate) return;
    setSending(true);
    setTimeout(() => {
      setSending(false);
      setSent(true);
      onSend({
        id: `n${Date.now()}`,
        channel: selectedChannel,
        recipient: recipientType === "all" ? "전체 고객" : recipientName || "대상 미지정",
        recipientType,
        templateName: selectedTemplate.name,
        preview: selectedTemplate.body.replace(/\{\{[^}]+\}\}/g, "___"),
        status: "sent",
        sentAt: new Date().toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", hour12: false }),
        retryCount: 0,
      });
      setTimeout(onClose, 1200);
    }, 1200);
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
      <div className="bg-white rounded-2xl w-full max-w-lg mx-4 shadow-2xl overflow-hidden">
        {/* 헤더 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="font-bold" style={{ color: "#0D2B52" }}>알림 발송</h2>
          <div className="flex items-center gap-3">
            <div className="flex gap-1">
              {[1, 2].map((s) => (
                <span
                  key={s}
                  className="w-5 h-1.5 rounded-full"
                  style={{ background: step >= s ? "#0D2B52" : "#E5E7EB" }}
                />
              ))}
            </div>
            <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg">
              <X size={16} className="text-gray-400" />
            </button>
          </div>
        </div>

        <div className="px-6 py-5">
          {sent ? (
            <div className="flex flex-col items-center py-8 gap-3">
              <div className="w-14 h-14 rounded-full bg-green-50 flex items-center justify-center">
                <CheckCircle2 size={28} style={{ color: "#10B981" }} />
              </div>
              <div className="font-semibold" style={{ color: "#0D2B52" }}>발송 완료</div>
              <div className="text-sm text-gray-400">알림이 성공적으로 발송되었습니다.</div>
            </div>
          ) : step === 1 ? (
            <>
              <p className="text-sm text-gray-500 mb-4">발송할 템플릿을 선택해 주세요.</p>
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {TEMPLATES.map((t) => {
                  const catCfg = CATEGORY_CFG[t.category];
                  const sel = selectedTemplate?.id === t.id;
                  return (
                    <button
                      key={t.id}
                      onClick={() => setSelectedTemplate(t)}
                      className="w-full text-left rounded-xl p-3.5 border transition-all"
                      style={{
                        borderColor: sel ? "#0D2B52" : "#E5E7EB",
                        background: sel ? "#F0F4FF" : "#FAFAFA",
                      }}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-medium text-sm" style={{ color: "#0D2B52" }}>
                          {t.name}
                        </span>
                        <div className="flex gap-1">
                          <span
                            className="text-xs px-1.5 py-0.5 rounded-full font-medium"
                            style={{ background: catCfg.bg, color: catCfg.color }}
                          >
                            {catCfg.label}
                          </span>
                          {t.channel.map((ch) => <ChannelBadge key={ch} channel={ch} />)}
                        </div>
                      </div>
                      <p className="text-xs text-gray-400 line-clamp-1">{t.body.split("\n")[0]}</p>
                    </button>
                  );
                })}
              </div>
              <button
                disabled={!selectedTemplate}
                onClick={() => setStep(2)}
                className="w-full mt-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-all"
                style={{ background: selectedTemplate ? "#0D2B52" : "#D1D5DB", cursor: selectedTemplate ? "pointer" : "not-allowed" }}
              >
                다음 — 수신자 설정
              </button>
            </>
          ) : (
            <>
              <p className="text-sm text-gray-500 mb-4">수신자와 채널을 설정해 주세요.</p>

              {/* 채널 선택 */}
              <div className="mb-4">
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide block mb-2">발송 채널</label>
                <div className="flex gap-2">
                  {(selectedTemplate?.channel ?? (["kakao", "sms", "push"] as Channel[])).map((ch) => {
                    const cfg = CHANNEL_CFG[ch];
                    const sel = selectedChannel === ch;
                    return (
                      <button
                        key={ch}
                        onClick={() => setSelectedChannel(ch)}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm font-medium border transition-all"
                        style={{
                          background: sel ? cfg.bg : "#fff",
                          color: sel ? cfg.color : "#6B7280",
                          borderColor: sel ? cfg.bg : "#E5E7EB",
                        }}
                      >
                        <cfg.icon size={13} />
                        {cfg.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 수신자 유형 */}
              <div className="mb-4">
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide block mb-2">수신자</label>
                <div className="flex gap-2 mb-2">
                  {([["customer", "고객", User], ["pilot", "파일럿", User], ["all", "전체 고객", Users]] as const).map(([type, label, Icon]) => (
                    <button
                      key={type}
                      onClick={() => setRecipientType(type)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm font-medium border transition-all"
                      style={{
                        background: recipientType === type ? "#0D2B52" : "#fff",
                        color: recipientType === type ? "#fff" : "#6B7280",
                        borderColor: recipientType === type ? "#0D2B52" : "#E5E7EB",
                      }}
                    >
                      <Icon size={13} />
                      {label}
                    </button>
                  ))}
                </div>
                {recipientType !== "all" && (
                  <input
                    value={recipientName}
                    onChange={(e) => setRecipientName(e.target.value)}
                    placeholder={recipientType === "customer" ? "고객 이름 또는 전화번호" : "파일럿 이름"}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2"
                    style={{ color: "#0D2B52" }}
                  />
                )}
              </div>

              {/* 미리보기 */}
              {selectedTemplate && (
                <div className="rounded-xl p-3.5 mb-4" style={{ background: "#F5F7FA" }}>
                  <div className="text-xs text-gray-400 mb-1.5 font-semibold uppercase tracking-wide">메시지 미리보기</div>
                  <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">
                    {selectedTemplate.body}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {selectedTemplate.variables.map((v) => (
                      <span key={v} className="text-xs bg-blue-100 text-blue-600 rounded px-1.5 py-0.5">
                        {"{{"}{v}{"}}"}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <button
                  onClick={() => setStep(1)}
                  className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-500 hover:bg-gray-50"
                >
                  이전
                </button>
                <button
                  onClick={handleSend}
                  disabled={sending}
                  className="flex-2 px-8 py-2.5 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2"
                  style={{ background: "#0D2B52", flex: 2 }}
                >
                  {sending ? (
                    <><RefreshCw size={14} className="animate-spin" /> 발송 중…</>
                  ) : (
                    <><Send size={14} /> 발송</>
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── 메인 ────────────────────────────────────────────────────────
export default function NotificationsPage() {
  const [logs, setLogs] = useState<NotificationLog[]>(INITIAL_LOGS);
  const [showSend, setShowSend] = useState(false);
  const [tab, setTab] = useState<"log" | "templates">("log");
  const [channelFilter, setChannelFilter] = useState<Channel | "all">("all");
  const [statusFilter, setStatusFilter] = useState<NotiStatus | "all">("all");
  const [search, setSearch] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // 통계
  const stats = useMemo(() => {
    const today = logs;
    return {
      total: today.length,
      sent: today.filter((l) => l.status === "sent" || l.status === "read").length,
      failed: today.filter((l) => l.status === "failed").length,
      read: today.filter((l) => l.status === "read").length,
      successRate: Math.round(
        (today.filter((l) => l.status !== "failed").length / today.length) * 100
      ),
    };
  }, [logs]);

  // 필터된 로그
  const filteredLogs = useMemo(() => {
    return logs.filter((l) => {
      if (channelFilter !== "all" && l.channel !== channelFilter) return false;
      if (statusFilter !== "all" && l.status !== statusFilter) return false;
      if (search && !l.recipient.includes(search) && !l.templateName.includes(search)) return false;
      return true;
    });
  }, [logs, channelFilter, statusFilter, search]);

  function handleRetry(id: string) {
    setLogs((prev) =>
      prev.map((l) => (l.id === id ? { ...l, status: "sent", retryCount: 0, sentAt: new Date().toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", hour12: false }) } : l))
    );
  }

  function handleCopy(text: string, id: string) {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  }

  return (
    <div className="p-6 space-y-5" style={{ background: "#F5F7FA", minHeight: "100vh" }}>
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "#0D2B52" }}>호출</h1>
          <p className="text-sm text-gray-500 mt-0.5">알림 발송 · 이력 관리 · 템플릿</p>
        </div>
        <button
          onClick={() => setShowSend(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-sm font-medium shadow-sm hover:opacity-90"
          style={{ background: "#0D2B52" }}
        >
          <Send size={15} />
          알림 발송
        </button>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "오늘 발송",  value: stats.total,       color: "#2A7AE2", bg: "#EFF6FF", icon: Send },
          { label: "발송 성공",  value: stats.sent,        color: "#10B981", bg: "#ECFDF5", icon: CheckCircle2 },
          { label: "읽음 확인",  value: stats.read,        color: "#6B7280", bg: "#F3F4F6", icon: MailOpen },
          { label: "발송 실패",  value: stats.failed,      color: "#EF4444", bg: "#FEF2F2", icon: XCircle },
        ].map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="bg-white rounded-xl px-4 py-3.5 shadow-sm border border-gray-100 flex items-center gap-3">
              <span className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: card.bg }}>
                <Icon size={16} style={{ color: card.color }} />
              </span>
              <div>
                <div className="text-xl font-bold" style={{ color: "#0D2B52" }}>{card.value}</div>
                <div className="text-xs text-gray-400">{card.label}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 성공률 바 */}
      <div className="bg-white rounded-xl px-5 py-3.5 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium" style={{ color: "#0D2B52" }}>오늘 발송 성공률</span>
          <span className="text-sm font-bold" style={{ color: stats.successRate >= 90 ? "#10B981" : "#F59E0B" }}>
            {stats.successRate}%
          </span>
        </div>
        <div className="flex rounded-full overflow-hidden h-2">
          <div className="h-full" style={{ width: `${(stats.read / stats.total) * 100}%`, background: "#6B7280" }} />
          <div className="h-full" style={{ width: `${((stats.sent - stats.read) / stats.total) * 100}%`, background: "#10B981" }} />
          <div className="h-full" style={{ width: `${(stats.failed / stats.total) * 100}%`, background: "#EF4444" }} />
        </div>
        <div className="flex gap-4 mt-1.5">
          {[{ label: "읽음", color: "#6B7280", v: stats.read }, { label: "발송", color: "#10B981", v: stats.sent - stats.read }, { label: "실패", color: "#EF4444", v: stats.failed }].map((s) => (
            <span key={s.label} className="flex items-center gap-1 text-xs text-gray-400">
              <span className="w-2 h-2 rounded-full" style={{ background: s.color }} />{s.label} {s.v}건
            </span>
          ))}
        </div>
      </div>

      {/* 탭 */}
      <div className="flex gap-1 bg-white rounded-xl p-1 shadow-sm border border-gray-100 w-fit">
        {([["log", "발송 이력"], ["templates", "템플릿 관리"]] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className="px-5 py-1.5 rounded-lg text-sm font-medium transition-all"
            style={{ background: tab === key ? "#0D2B52" : "transparent", color: tab === key ? "#fff" : "#6B7280" }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* 발송 이력 */}
      {tab === "log" && (
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          {/* 필터 바 */}
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            <div className="flex items-center gap-1.5 bg-gray-50 rounded-xl px-3 py-2 border border-gray-200 flex-1 min-w-48">
              <Search size={13} className="text-gray-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="이름 또는 템플릿 검색"
                className="bg-transparent text-sm flex-1 focus:outline-none"
                style={{ color: "#0D2B52" }}
              />
            </div>
            {/* 채널 필터 */}
            <div className="flex gap-1">
              {(["all", "kakao", "sms", "push"] as const).map((ch) => (
                <button
                  key={ch}
                  onClick={() => setChannelFilter(ch)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium border transition-all"
                  style={{
                    background: channelFilter === ch ? "#0D2B52" : "#fff",
                    color: channelFilter === ch ? "#fff" : "#6B7280",
                    borderColor: channelFilter === ch ? "#0D2B52" : "#E5E7EB",
                  }}
                >
                  {ch === "all" ? "전체" : CHANNEL_CFG[ch].label}
                </button>
              ))}
            </div>
            {/* 상태 필터 */}
            <div className="flex gap-1">
              {(["all", "sent", "read", "failed", "pending"] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium border transition-all"
                  style={{
                    background: statusFilter === st ? "#0D2B52" : "#fff",
                    color: statusFilter === st ? "#fff" : "#6B7280",
                    borderColor: statusFilter === st ? "#0D2B52" : "#E5E7EB",
                  }}
                >
                  {st === "all" ? "전체" : STATUS_CFG[st].label}
                </button>
              ))}
            </div>
          </div>

          {/* 헤더 */}
          <div
            className="grid text-xs text-gray-400 font-medium pb-2 border-b border-gray-100"
            style={{ gridTemplateColumns: "0.5fr 0.8fr 0.8fr 2.5fr 0.6fr 0.7fr 0.5fr" }}
          >
            <span>채널</span>
            <span>수신자</span>
            <span>템플릿</span>
            <span>내용</span>
            <span>발송시각</span>
            <span>상태</span>
            <span className="text-right">액션</span>
          </div>

          {/* 행 */}
          <div className="divide-y divide-gray-50">
            {filteredLogs.length === 0 ? (
              <div className="text-center py-10 text-gray-300 text-sm">검색 결과가 없습니다.</div>
            ) : (
              filteredLogs.map((log) => (
                <div
                  key={log.id}
                  className="grid py-3 items-center text-sm"
                  style={{ gridTemplateColumns: "0.5fr 0.8fr 0.8fr 2.5fr 0.6fr 0.7fr 0.5fr" }}
                >
                  <span><ChannelBadge channel={log.channel} /></span>
                  <span className="flex items-center gap-1 font-medium" style={{ color: "#0D2B52" }}>
                    {log.recipientType === "all"
                      ? <><Users size={11} className="text-gray-400" /> {log.recipient}</>
                      : <><User size={11} className="text-gray-400" /> {log.recipient}</>
                    }
                  </span>
                  <span className="text-xs text-gray-500">{log.templateName}</span>
                  <span className="text-xs text-gray-400 truncate pr-4">{log.preview}</span>
                  <span className="text-xs text-gray-500">
                    {log.sentAt}
                    {log.readAt && <div className="text-gray-300">{log.readAt} 읽음</div>}
                  </span>
                  <span>
                    <StatusBadge status={log.status} />
                    {log.retryCount > 0 && (
                      <div className="text-xs text-red-400 mt-0.5">{log.retryCount}회 재시도</div>
                    )}
                  </span>
                  <span className="flex justify-end gap-1">
                    {log.status === "failed" && (
                      <button
                        onClick={() => handleRetry(log.id)}
                        className="p-1.5 rounded-lg hover:bg-blue-50"
                        title="재발송"
                      >
                        <RefreshCw size={12} style={{ color: "#2A7AE2" }} />
                      </button>
                    )}
                    <button
                      onClick={() => handleCopy(log.preview, log.id)}
                      className="p-1.5 rounded-lg hover:bg-gray-100"
                      title="내용 복사"
                    >
                      {copiedId === log.id
                        ? <CheckCircle2 size={12} style={{ color: "#10B981" }} />
                        : <Copy size={12} className="text-gray-400" />
                      }
                    </button>
                  </span>
                </div>
              ))
            )}
          </div>

          <div className="mt-3 pt-3 border-t border-gray-100 text-xs text-gray-400">
            전체 {filteredLogs.length}건 표시 중
          </div>
        </div>
      )}

      {/* 템플릿 관리 */}
      {tab === "templates" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">{TEMPLATES.length}개 템플릿</span>
            <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-dashed border-gray-300 text-sm text-gray-400 hover:border-blue-300 hover:text-blue-400">
              <Plus size={13} />
              템플릿 추가
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {TEMPLATES.map((t) => {
              const catCfg = CATEGORY_CFG[t.category];
              return (
                <div key={t.id} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="font-semibold text-sm mb-1" style={{ color: "#0D2B52" }}>{t.name}</div>
                      <div className="flex gap-1 flex-wrap">
                        <span
                          className="text-xs px-2 py-0.5 rounded-full font-medium"
                          style={{ background: catCfg.bg, color: catCfg.color }}
                        >
                          {catCfg.label}
                        </span>
                        {t.channel.map((ch) => <ChannelBadge key={ch} channel={ch} />)}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-gray-400">
                      <FileText size={11} />
                      {t.usageCount}회
                    </div>
                  </div>

                  {/* 본문 */}
                  <div className="rounded-xl p-3 mb-3 text-xs text-gray-600 leading-relaxed whitespace-pre-line" style={{ background: "#F5F7FA" }}>
                    {t.body}
                  </div>

                  {/* 변수 */}
                  {t.variables.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {t.variables.map((v) => (
                        <span key={v} className="text-xs bg-blue-50 text-blue-500 rounded px-1.5 py-0.5">
                          {"{{"}{v}{"}}"}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowSend(true)}
                      className="flex-1 py-1.5 rounded-xl text-xs font-medium text-white"
                      style={{ background: "#0D2B52" }}
                    >
                      이 템플릿으로 발송
                    </button>
                    <button className="px-3 py-1.5 rounded-xl border border-gray-200 text-xs text-gray-500 hover:bg-gray-50">
                      편집
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 발송 모달 */}
      {showSend && (
        <SendModal
          onClose={() => setShowSend(false)}
          onSend={(log) => setLogs((prev) => [log, ...prev])}
        />
      )}
    </div>
  );
}
