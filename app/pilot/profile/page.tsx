"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  Wind,
  User,
  Phone,
  Mail,
  Award,
  ShieldCheck,
  Plus,
  Pencil,
  Check,
  X,
  AlertTriangle,
  CalendarDays,
  ChevronRight,
} from "lucide-react";

// ─── Mock Data ────────────────────────────────────────────────────────────────
// TODO: API — GET /api/pilot/me/profile
// TODO: API — PATCH /api/pilot/me/profile  { name, phone, email }
// TODO: API — GET /api/pilot/me/licenses
// TODO: API — POST /api/pilot/me/licenses
// TODO: API — GET /api/pilot/me/insurance
// TODO: API — POST /api/pilot/me/insurance  (갱신 등록)

interface License {
  id: string;
  type: string;
  license_number: string;
  issued_at: string;
  expires_at: string;
}

interface Insurance {
  id: string;
  company: string;
  policy_number: string;
  coverage: string;
  start_date: string;
  end_date: string;
  coverage_amount: string;
}

const PILOT_PROFILE_INIT = {
  id: "P003",
  name: "박구름",
  phone: "010-3388-5521",
  email: "groom.park@gureum.kr",
};

const LICENSES_INIT: License[] = [
  { id: "L001", type: "탠덤 조종사",         license_number: "T-2019-0483", issued_at: "2019-03-15", expires_at: "2027-03-15" },
  { id: "L002", type: "동력패러글라이더",     license_number: "M-2021-1102", issued_at: "2021-06-01", expires_at: "2026-08-20" },
  { id: "L003", type: "항공안전법 조종사",    license_number: "A-2023-0091", issued_at: "2023-01-10", expires_at: "2028-01-10" },
];

const INSURANCE_INIT: Insurance = {
  id: "INS-2026-003",
  company: "삼성화재",
  policy_number: "SHF-2026-PG-0034",
  coverage: "레저스포츠 배상책임보험",
  start_date: "2026-01-01",
  end_date: "2026-12-31",
  coverage_amount: "3억",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function daysUntil(dateStr: string): number {
  const diff = new Date(dateStr).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function expiryStatus(dateStr: string): { label: string; color: string; bg: string; border: string } {
  const days = daysUntil(dateStr);
  if (days < 0)   return { label: "만료됨",   color: "#DC2626", bg: "#FEF2F2", border: "#FCA5A5" };
  if (days <= 30) return { label: "만료임박", color: "#D97706", bg: "#FFFBEB", border: "#FCD34D" };
  if (days <= 90) return { label: "주의",     color: "#CA8A04", bg: "#FEFCE8", border: "#FDE047" };
  return             { label: "유효",     color: "#15803D", bg: "#F0FDF4", border: "#86EFAC" };
}

function fmtDate(dateStr: string) {
  return dateStr.replace(/-/g, ". ");
}

// ─── 빈 폼 초기값 ─────────────────────────────────────────────────────────────

const EMPTY_LICENSE: Omit<License, "id"> = {
  type: "",
  license_number: "",
  issued_at: "",
  expires_at: "",
};

const EMPTY_INSURANCE: Omit<Insurance, "id"> = {
  company: "",
  policy_number: "",
  coverage: "",
  start_date: "",
  end_date: "",
  coverage_amount: "",
};

// ─── 입력 공통 컴포넌트 ────────────────────────────────────────────────────────

function Field({
  label,
  value,
  editing,
  type = "text",
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  editing: boolean;
  type?: string;
  onChange?: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <p className="text-xs font-medium mb-1" style={{ color: "#9ea096" }}>{label}</p>
      {editing ? (
        <input
          type={type}
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          placeholder={placeholder}
          className="w-full px-3 py-2 rounded-xl text-sm border outline-none focus:ring-2"
          style={{
            backgroundColor: "#eeefe9",
            borderColor: "#bfc1b7",
            color: "#23251d",
          }}
        />
      ) : (
        <p className="text-sm font-medium" style={{ color: value ? "#23251d" : "#bfc1b7" }}>
          {value || "—"}
        </p>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PilotProfilePage() {
  const router = useRouter();

  // 기본 정보
  const [profile, setProfile] = useState(PILOT_PROFILE_INIT);
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileDraft, setProfileDraft] = useState(PILOT_PROFILE_INIT);

  // 자격증
  const [licenses, setLicenses] = useState<License[]>(LICENSES_INIT);
  const [addingLicense, setAddingLicense] = useState(false);
  const [licenseDraft, setLicenseDraft] = useState<Omit<License, "id">>(EMPTY_LICENSE);

  // 보험
  const [insurance, setInsurance] = useState<Insurance>(INSURANCE_INIT);
  const [addingInsurance, setAddingInsurance] = useState(false);
  const [insuranceDraft, setInsuranceDraft] = useState<Omit<Insurance, "id">>(EMPTY_INSURANCE);

  // ── 기본 정보 저장 ────────────────────────────────────────────────────────
  function saveProfile() {
    setProfile(profileDraft);
    setEditingProfile(false);
    // TODO: PATCH /api/pilot/me/profile
  }

  // ── 자격증 추가 ───────────────────────────────────────────────────────────
  function saveLicense() {
    if (!licenseDraft.type || !licenseDraft.license_number || !licenseDraft.expires_at) return;
    setLicenses((prev) => [
      ...prev,
      { ...licenseDraft, id: `L${Date.now()}` },
    ]);
    setLicenseDraft(EMPTY_LICENSE);
    setAddingLicense(false);
    // TODO: POST /api/pilot/me/licenses
  }

  // ── 보험 갱신 등록 ────────────────────────────────────────────────────────
  function saveInsurance() {
    if (!insuranceDraft.company || !insuranceDraft.policy_number || !insuranceDraft.end_date) return;
    setInsurance({ ...insuranceDraft, id: `INS-${Date.now()}` });
    setInsuranceDraft(EMPTY_INSURANCE);
    setAddingInsurance(false);
    // TODO: POST /api/pilot/me/insurance
  }

  const insStatus = expiryStatus(insurance.end_date);

  return (
    <div className="max-w-md mx-auto min-h-screen flex flex-col" style={{ backgroundColor: "#eeefe9" }}>
      {/* 헤더 */}
      <div className="px-5 pt-8 pb-5" style={{ backgroundColor: "#23251d" }}>
        <div className="flex items-center justify-between mb-5">
          <button onClick={() => router.back()} className="flex items-center gap-1.5 text-white/70 text-sm">
            <ChevronLeft className="w-4 h-4" />
            돌아가기
          </button>
          <div className="flex items-center gap-2">
            <Wind className="w-4 h-4" style={{ color: "#F54E00" }} />
            <span className="text-white text-sm font-bold">구름상회</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-bold text-white flex-shrink-0"
            style={{ backgroundColor: "#4d4f46" }}
          >
            {profile.name[0]}
          </div>
          <div>
            <h1 className="text-white text-xl font-bold">{profile.name}</h1>
            <p className="text-white/50 text-xs mt-0.5">파일럿 · {PILOT_PROFILE_INIT.id}</p>
          </div>
        </div>
      </div>

      {/* 본문 */}
      <div className="flex-1 px-4 py-5 space-y-4">

        {/* ── 기본 정보 ─────────────────────────────────────────────────── */}
        <div className="rounded-2xl p-5 border" style={{ backgroundColor: "#fdfdf8", borderColor: "#bfc1b7" }}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4" style={{ color: "#4d4f46" }} />
              <p className="font-bold text-sm" style={{ color: "#23251d" }}>기본 정보</p>
            </div>
            {editingProfile ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => { setProfileDraft(profile); setEditingProfile(false); }}
                  className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg border"
                  style={{ color: "#65675e", borderColor: "#bfc1b7" }}
                >
                  <X className="w-3 h-3" /> 취소
                </button>
                <button
                  onClick={saveProfile}
                  className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg text-white"
                  style={{ backgroundColor: "#23251d" }}
                >
                  <Check className="w-3 h-3" /> 저장
                </button>
              </div>
            ) : (
              <button
                onClick={() => { setProfileDraft(profile); setEditingProfile(true); }}
                className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg border"
                style={{ color: "#65675e", borderColor: "#bfc1b7" }}
              >
                <Pencil className="w-3 h-3" /> 수정
              </button>
            )}
          </div>

          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <User className="w-4 h-4 mt-2.5 flex-shrink-0" style={{ color: "#9ea096" }} />
              <div className="flex-1">
                <Field
                  label="이름"
                  value={editingProfile ? profileDraft.name : profile.name}
                  editing={editingProfile}
                  onChange={(v) => setProfileDraft((p) => ({ ...p, name: v }))}
                />
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Phone className="w-4 h-4 mt-2.5 flex-shrink-0" style={{ color: "#9ea096" }} />
              <div className="flex-1">
                <Field
                  label="연락처"
                  value={editingProfile ? profileDraft.phone : profile.phone}
                  editing={editingProfile}
                  placeholder="010-0000-0000"
                  onChange={(v) => setProfileDraft((p) => ({ ...p, phone: v }))}
                />
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Mail className="w-4 h-4 mt-2.5 flex-shrink-0" style={{ color: "#9ea096" }} />
              <div className="flex-1">
                <Field
                  label="이메일"
                  value={editingProfile ? profileDraft.email : profile.email}
                  editing={editingProfile}
                  type="email"
                  placeholder="example@gureum.kr"
                  onChange={(v) => setProfileDraft((p) => ({ ...p, email: v }))}
                />
              </div>
            </div>
          </div>
        </div>

        {/* ── 자격증 관리 ────────────────────────────────────────────────── */}
        <div className="rounded-2xl p-5 border" style={{ backgroundColor: "#fdfdf8", borderColor: "#bfc1b7" }}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Award className="w-4 h-4" style={{ color: "#4d4f46" }} />
              <p className="font-bold text-sm" style={{ color: "#23251d" }}>자격증</p>
            </div>
            {!addingLicense && (
              <button
                onClick={() => setAddingLicense(true)}
                className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg text-white"
                style={{ backgroundColor: "#23251d" }}
              >
                <Plus className="w-3 h-3" /> 추가
              </button>
            )}
          </div>

          {/* 기존 자격증 목록 */}
          <div className="space-y-3 mb-3">
            {licenses.map((lic) => {
              const st = expiryStatus(lic.expires_at);
              const days = daysUntil(lic.expires_at);
              return (
                <div
                  key={lic.id}
                  className="rounded-xl p-3.5 border"
                  style={{ backgroundColor: "#eeefe9", borderColor: "#d4d5cf" }}
                >
                  <div className="flex items-start justify-between mb-2">
                    <p className="text-sm font-bold" style={{ color: "#23251d" }}>{lic.type}</p>
                    <span
                      className="text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap"
                      style={{ backgroundColor: st.bg, color: st.color, border: `1px solid ${st.border}` }}
                    >
                      {st.label}
                    </span>
                  </div>
                  <p className="text-xs mb-1" style={{ color: "#65675e" }}>
                    번호: {lic.license_number}
                  </p>
                  <div className="flex items-center gap-1.5 text-xs" style={{ color: "#9ea096" }}>
                    <CalendarDays className="w-3 h-3" />
                    <span>발급 {fmtDate(lic.issued_at)}</span>
                    <span>·</span>
                    <span
                      className="font-semibold"
                      style={{ color: st.color }}
                    >
                      만료 {fmtDate(lic.expires_at)}
                      {days > 0 && days <= 90 && ` (${days}일 남음)`}
                      {days < 0 && " (만료됨)"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* 자격증 추가 폼 */}
          {addingLicense && (
            <div className="rounded-xl p-4 border" style={{ backgroundColor: "#eeefe9", borderColor: "#bfc1b7" }}>
              <p className="text-xs font-bold mb-3" style={{ color: "#4d4f46" }}>새 자격증 등록</p>
              <div className="space-y-3">
                <div>
                  <p className="text-xs font-medium mb-1" style={{ color: "#9ea096" }}>자격증 종류</p>
                  <input
                    className="w-full px-3 py-2 rounded-xl text-sm border outline-none"
                    style={{ backgroundColor: "#fdfdf8", borderColor: "#bfc1b7", color: "#23251d" }}
                    placeholder="예) 탠덤 조종사"
                    value={licenseDraft.type}
                    onChange={(e) => setLicenseDraft((d) => ({ ...d, type: e.target.value }))}
                  />
                </div>
                <div>
                  <p className="text-xs font-medium mb-1" style={{ color: "#9ea096" }}>자격증 번호</p>
                  <input
                    className="w-full px-3 py-2 rounded-xl text-sm border outline-none"
                    style={{ backgroundColor: "#fdfdf8", borderColor: "#bfc1b7", color: "#23251d" }}
                    placeholder="예) T-2024-0001"
                    value={licenseDraft.license_number}
                    onChange={(e) => setLicenseDraft((d) => ({ ...d, license_number: e.target.value }))}
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <p className="text-xs font-medium mb-1" style={{ color: "#9ea096" }}>발급일</p>
                    <input
                      type="date"
                      className="w-full px-3 py-2 rounded-xl text-sm border outline-none"
                      style={{ backgroundColor: "#fdfdf8", borderColor: "#bfc1b7", color: "#23251d" }}
                      value={licenseDraft.issued_at}
                      onChange={(e) => setLicenseDraft((d) => ({ ...d, issued_at: e.target.value }))}
                    />
                  </div>
                  <div>
                    <p className="text-xs font-medium mb-1" style={{ color: "#9ea096" }}>만료일</p>
                    <input
                      type="date"
                      className="w-full px-3 py-2 rounded-xl text-sm border outline-none"
                      style={{ backgroundColor: "#fdfdf8", borderColor: "#bfc1b7", color: "#23251d" }}
                      value={licenseDraft.expires_at}
                      onChange={(e) => setLicenseDraft((d) => ({ ...d, expires_at: e.target.value }))}
                    />
                  </div>
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => { setLicenseDraft(EMPTY_LICENSE); setAddingLicense(false); }}
                  className="flex-1 py-2.5 rounded-xl text-sm font-medium border"
                  style={{ color: "#65675e", borderColor: "#bfc1b7", backgroundColor: "#fdfdf8" }}
                >
                  취소
                </button>
                <button
                  onClick={saveLicense}
                  disabled={!licenseDraft.type || !licenseDraft.license_number || !licenseDraft.expires_at}
                  className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-40"
                  style={{ backgroundColor: "#23251d" }}
                >
                  등록
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── 보험 ───────────────────────────────────────────────────────── */}
        <div className="rounded-2xl p-5 border" style={{ backgroundColor: "#fdfdf8", borderColor: "#bfc1b7" }}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4" style={{ color: "#4d4f46" }} />
              <p className="font-bold text-sm" style={{ color: "#23251d" }}>보험</p>
            </div>
            {!addingInsurance && (
              <button
                onClick={() => setAddingInsurance(true)}
                className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg text-white"
                style={{ backgroundColor: "#23251d" }}
              >
                <Plus className="w-3 h-3" /> 갱신 등록
              </button>
            )}
          </div>

          {/* 현재 보험 */}
          <div
            className="rounded-xl p-3.5 border mb-3"
            style={{ backgroundColor: "#eeefe9", borderColor: "#d4d5cf" }}
          >
            <div className="flex items-start justify-between mb-2">
              <div>
                <p className="text-sm font-bold" style={{ color: "#23251d" }}>{insurance.company}</p>
                <p className="text-xs mt-0.5" style={{ color: "#65675e" }}>{insurance.coverage}</p>
              </div>
              <span
                className="text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap"
                style={{ backgroundColor: insStatus.bg, color: insStatus.color, border: `1px solid ${insStatus.border}` }}
              >
                {insStatus.label}
              </span>
            </div>
            <div className="space-y-1 text-xs" style={{ color: "#9ea096" }}>
              <p>증권번호: <span style={{ color: "#4d4f46" }}>{insurance.policy_number}</span></p>
              <p>보장한도: <span style={{ color: "#4d4f46" }}>{insurance.coverage_amount}</span></p>
              <div className="flex items-center gap-1.5">
                <CalendarDays className="w-3 h-3" />
                <span>
                  {fmtDate(insurance.start_date)} ~ {" "}
                  <span style={{ color: insStatus.color, fontWeight: 600 }}>
                    {fmtDate(insurance.end_date)}
                  </span>
                  {daysUntil(insurance.end_date) > 0 && daysUntil(insurance.end_date) <= 90 && (
                    <span> ({daysUntil(insurance.end_date)}일 남음)</span>
                  )}
                </span>
              </div>
            </div>
          </div>

          {/* 만료임박 경고 */}
          {daysUntil(insurance.end_date) <= 30 && (
            <div className="flex items-start gap-2 rounded-xl px-3 py-2.5 mb-3 text-xs"
              style={{ backgroundColor: "#FFFBEB", color: "#B45309" }}>
              <AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
              <span>보험 만료가 임박했습니다. 갱신 후 새 증권 정보를 등록해 주세요.</span>
            </div>
          )}

          {/* 보험 갱신 등록 폼 */}
          {addingInsurance && (
            <div className="rounded-xl p-4 border" style={{ backgroundColor: "#eeefe9", borderColor: "#bfc1b7" }}>
              <p className="text-xs font-bold mb-3" style={{ color: "#4d4f46" }}>새 보험 정보 등록</p>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <p className="text-xs font-medium mb-1" style={{ color: "#9ea096" }}>보험사</p>
                    <input
                      className="w-full px-3 py-2 rounded-xl text-sm border outline-none"
                      style={{ backgroundColor: "#fdfdf8", borderColor: "#bfc1b7", color: "#23251d" }}
                      placeholder="예) 삼성화재"
                      value={insuranceDraft.company}
                      onChange={(e) => setInsuranceDraft((d) => ({ ...d, company: e.target.value }))}
                    />
                  </div>
                  <div>
                    <p className="text-xs font-medium mb-1" style={{ color: "#9ea096" }}>보장한도</p>
                    <input
                      className="w-full px-3 py-2 rounded-xl text-sm border outline-none"
                      style={{ backgroundColor: "#fdfdf8", borderColor: "#bfc1b7", color: "#23251d" }}
                      placeholder="예) 3억"
                      value={insuranceDraft.coverage_amount}
                      onChange={(e) => setInsuranceDraft((d) => ({ ...d, coverage_amount: e.target.value }))}
                    />
                  </div>
                </div>
                <div>
                  <p className="text-xs font-medium mb-1" style={{ color: "#9ea096" }}>증권번호</p>
                  <input
                    className="w-full px-3 py-2 rounded-xl text-sm border outline-none"
                    style={{ backgroundColor: "#fdfdf8", borderColor: "#bfc1b7", color: "#23251d" }}
                    placeholder="예) SHF-2027-PG-0001"
                    value={insuranceDraft.policy_number}
                    onChange={(e) => setInsuranceDraft((d) => ({ ...d, policy_number: e.target.value }))}
                  />
                </div>
                <div>
                  <p className="text-xs font-medium mb-1" style={{ color: "#9ea096" }}>보험 종류</p>
                  <input
                    className="w-full px-3 py-2 rounded-xl text-sm border outline-none"
                    style={{ backgroundColor: "#fdfdf8", borderColor: "#bfc1b7", color: "#23251d" }}
                    placeholder="예) 레저스포츠 배상책임보험"
                    value={insuranceDraft.coverage}
                    onChange={(e) => setInsuranceDraft((d) => ({ ...d, coverage: e.target.value }))}
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <p className="text-xs font-medium mb-1" style={{ color: "#9ea096" }}>보험 시작일</p>
                    <input
                      type="date"
                      className="w-full px-3 py-2 rounded-xl text-sm border outline-none"
                      style={{ backgroundColor: "#fdfdf8", borderColor: "#bfc1b7", color: "#23251d" }}
                      value={insuranceDraft.start_date}
                      onChange={(e) => setInsuranceDraft((d) => ({ ...d, start_date: e.target.value }))}
                    />
                  </div>
                  <div>
                    <p className="text-xs font-medium mb-1" style={{ color: "#9ea096" }}>만료일</p>
                    <input
                      type="date"
                      className="w-full px-3 py-2 rounded-xl text-sm border outline-none"
                      style={{ backgroundColor: "#fdfdf8", borderColor: "#bfc1b7", color: "#23251d" }}
                      value={insuranceDraft.end_date}
                      onChange={(e) => setInsuranceDraft((d) => ({ ...d, end_date: e.target.value }))}
                    />
                  </div>
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => { setInsuranceDraft(EMPTY_INSURANCE); setAddingInsurance(false); }}
                  className="flex-1 py-2.5 rounded-xl text-sm font-medium border"
                  style={{ color: "#65675e", borderColor: "#bfc1b7", backgroundColor: "#fdfdf8" }}
                >
                  취소
                </button>
                <button
                  onClick={saveInsurance}
                  disabled={!insuranceDraft.company || !insuranceDraft.policy_number || !insuranceDraft.end_date}
                  className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-40"
                  style={{ backgroundColor: "#23251d" }}
                >
                  등록
                </button>
              </div>
            </div>
          )}
        </div>

        {/* 하단 여백 */}
        <div className="h-6" />
      </div>
    </div>
  );
}
