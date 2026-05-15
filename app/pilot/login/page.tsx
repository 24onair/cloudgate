"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Wind, ChevronRight, ChevronLeft, CheckCircle2, Eye, EyeOff, AlertCircle } from "lucide-react";

interface DbPilot {
  id: string;
  name: string;
  license_expiry?: string;
  status?: string;
}

type Step = "select" | "pin";

export default function PilotLoginPage() {
  const router = useRouter();
  const [pilots,    setPilots]    = useState<DbPilot[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [step,      setStep]      = useState<Step>("select");
  const [selected,  setSelected]  = useState<DbPilot | null>(null);
  const [pin,       setPin]       = useState("");
  const [showPin,   setShowPin]   = useState(false);
  const [error,     setError]     = useState<string | null>(null);
  const [entering,  setEntering]  = useState(false);
  const pinRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // 이미 세션이 살아있으면 포털로 이동
    fetch("/api/pilot/me")
      .then((r) => { if (r.ok) router.replace("/pilot"); })
      .catch(() => {});

    // 활성 파일럿 목록 로드
    fetch("/api/pilots?status=active")
      .then((r) => r.json())
      .then((data: DbPilot[]) => setPilots(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [router]);

  // PIN 단계로 전환 시 input 포커스
  useEffect(() => {
    if (step === "pin") {
      setTimeout(() => pinRef.current?.focus(), 80);
    }
  }, [step]);

  function handleSelect(pilot: DbPilot) {
    setSelected(pilot);
    setPin("");
    setError(null);
    setStep("pin");
  }

  async function handleLogin() {
    if (!selected || pin.length < 4) return;
    setEntering(true);
    setError(null);
    try {
      const res = await fetch("/api/pilot/login", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ pilot_id: selected.id, pin }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "로그인 실패");
        setPin("");
        return;
      }
      router.replace("/pilot");
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setEntering(false);
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ backgroundColor: "#23251d" }}
    >
      <div className="w-full max-w-sm">
        {/* 로고 */}
        <div className="flex flex-col items-center mb-8">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center mb-3"
            style={{ backgroundColor: "#F54E00" }}
          >
            <Wind className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">구름상회</h1>
          <p className="text-sm mt-1" style={{ color: "rgba(255,255,255,0.4)" }}>파일럿 포털</p>
        </div>

        <div
          className="rounded-3xl p-5"
          style={{ backgroundColor: "#2e3028", border: "1.5px solid rgba(255,255,255,0.08)" }}
        >
          {/* ── STEP 1: 파일럿 선택 ── */}
          {step === "select" && (
            <>
              <p className="text-sm font-semibold mb-4" style={{ color: "rgba(255,255,255,0.6)" }}>
                파일럿을 선택하세요
              </p>

              {loading ? (
                <div className="flex justify-center py-8">
                  <div
                    className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin"
                    style={{ borderColor: "#F54E00 transparent #F54E00 #F54E00" }}
                  />
                </div>
              ) : pilots.length === 0 ? (
                <p className="text-center py-6 text-sm" style={{ color: "rgba(255,255,255,0.3)" }}>
                  등록된 파일럿이 없습니다
                </p>
              ) : (
                <div className="space-y-2">
                  {pilots.map((pilot) => (
                    <button
                      key={pilot.id}
                      onClick={() => handleSelect(pilot)}
                      className="w-full flex items-center justify-between rounded-2xl px-4 py-3.5 transition-all"
                      style={{
                        backgroundColor: "rgba(255,255,255,0.05)",
                        border: "1.5px solid rgba(255,255,255,0.06)",
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold"
                          style={{ backgroundColor: "rgba(255,255,255,0.1)", color: "white" }}
                        >
                          {pilot.name[0]}
                        </div>
                        <div className="text-left">
                          <p className="font-semibold text-white text-sm">{pilot.name}</p>
                          {pilot.license_expiry && (
                            <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.35)" }}>
                              자격증 만료 {pilot.license_expiry}
                            </p>
                          )}
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 flex-shrink-0" style={{ color: "rgba(255,255,255,0.2)" }} />
                    </button>
                  ))}
                </div>
              )}
            </>
          )}

          {/* ── STEP 2: PIN 입력 ── */}
          {step === "pin" && selected && (
            <>
              {/* 선택된 파일럿 표시 */}
              <div className="flex items-center gap-3 mb-5 pb-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                <button onClick={() => { setStep("select"); setError(null); setPin(""); }} className="text-gray-400 hover:text-white transition-colors">
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0"
                  style={{ backgroundColor: "#F54E00", color: "white" }}
                >
                  {selected.name[0]}
                </div>
                <div>
                  <p className="font-semibold text-white text-sm">{selected.name}</p>
                  <p className="text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>선택됨</p>
                </div>
                <CheckCircle2 className="w-4 h-4 ml-auto flex-shrink-0" style={{ color: "#F54E00" }} />
              </div>

              <p className="text-sm font-semibold mb-3" style={{ color: "rgba(255,255,255,0.6)" }}>
                PIN 번호를 입력하세요
              </p>

              {/* PIN 입력 */}
              <div className="relative mb-3">
                <input
                  ref={pinRef}
                  type={showPin ? "text" : "password"}
                  inputMode="numeric"
                  maxLength={8}
                  value={pin}
                  onChange={(e) => { setPin(e.target.value.replace(/\D/g, "")); setError(null); }}
                  onKeyDown={(e) => { if (e.key === "Enter") handleLogin(); }}
                  placeholder="PIN 번호"
                  className="w-full px-4 py-3.5 rounded-2xl text-white text-sm font-mono tracking-widest focus:outline-none"
                  style={{
                    backgroundColor: "rgba(255,255,255,0.07)",
                    border: `1.5px solid ${error ? "#ef4444" : "rgba(255,255,255,0.12)"}`,
                    caretColor: "#F54E00",
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPin((v) => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                >
                  {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* 에러 */}
              {error && (
                <div className="flex items-center gap-2 mb-3 px-3 py-2.5 rounded-xl" style={{ backgroundColor: "rgba(239,68,68,0.12)" }}>
                  <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-400" />
                  <p className="text-xs text-red-400">{error}</p>
                </div>
              )}

              <button
                onClick={handleLogin}
                disabled={entering || pin.length < 4}
                className="w-full py-3 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-50"
                style={{ backgroundColor: "#F54E00" }}
              >
                {entering ? "확인 중..." : "포털 입장"}
              </button>

              <p className="text-center text-xs mt-3" style={{ color: "rgba(255,255,255,0.2)" }}>
                초기 PIN은 0000입니다. 관리자에게 문의하세요.
              </p>
            </>
          )}
        </div>

        <p className="text-center text-xs mt-4" style={{ color: "rgba(255,255,255,0.2)" }}>
          구름상회 소속 파일럿만 접근할 수 있습니다
        </p>
      </div>
    </div>
  );
}
