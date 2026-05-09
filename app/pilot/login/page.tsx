"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Wind, ChevronRight, CheckCircle2 } from "lucide-react";

interface DbPilot {
  id: string;
  name: string;
  license_expiry?: string;
  status?: string;
}

export default function PilotLoginPage() {
  const router = useRouter();
  const [pilots,    setPilots]    = useState<DbPilot[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [selected,  setSelected]  = useState<string | null>(null);
  const [entering,  setEntering]  = useState(false);

  useEffect(() => {
    // 이미 로그인된 파일럿이 있으면 포털로 이동
    const stored = localStorage.getItem("gureum_pilot_id");
    if (stored) {
      router.replace("/pilot");
      return;
    }
    // 활성 파일럿 목록 로드
    fetch("/api/pilots?status=active")
      .then((r) => r.json())
      .then((data: DbPilot[]) => setPilots(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [router]);

  function handleSelect(pilotId: string) {
    setSelected(pilotId);
  }

  function handleEnter() {
    if (!selected) return;
    setEntering(true);
    localStorage.setItem("gureum_pilot_id", selected);
    router.replace("/pilot");
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

        {/* 파일럿 선택 카드 */}
        <div
          className="rounded-3xl p-5"
          style={{ backgroundColor: "#2e3028", border: "1.5px solid rgba(255,255,255,0.08)" }}
        >
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
              {pilots.map((pilot) => {
                const isSelected = selected === pilot.id;
                return (
                  <button
                    key={pilot.id}
                    onClick={() => handleSelect(pilot.id)}
                    className="w-full flex items-center justify-between rounded-2xl px-4 py-3.5 transition-all"
                    style={{
                      backgroundColor: isSelected ? "rgba(245,78,0,0.15)" : "rgba(255,255,255,0.05)",
                      border: `1.5px solid ${isSelected ? "#F54E00" : "rgba(255,255,255,0.06)"}`,
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold"
                        style={{
                          backgroundColor: isSelected ? "#F54E00" : "rgba(255,255,255,0.1)",
                          color: "white",
                        }}
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
                    {isSelected ? (
                      <CheckCircle2 className="w-5 h-5 flex-shrink-0" style={{ color: "#F54E00" }} />
                    ) : (
                      <ChevronRight className="w-4 h-4 flex-shrink-0" style={{ color: "rgba(255,255,255,0.2)" }} />
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {selected && (
            <button
              onClick={handleEnter}
              disabled={entering}
              className="mt-4 w-full py-3 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-60"
              style={{ backgroundColor: "#F54E00" }}
            >
              {entering ? "입장 중..." : "포털 입장"}
            </button>
          )}
        </div>

        <p className="text-center text-xs mt-4" style={{ color: "rgba(255,255,255,0.2)" }}>
          구름상회 소속 파일럿만 접근할 수 있습니다
        </p>
      </div>
    </div>
  );
}
