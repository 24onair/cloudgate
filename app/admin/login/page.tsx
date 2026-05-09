"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Wind, Lock, Eye, EyeOff } from "lucide-react";

export default function AdminLoginPage() {
  const router = useRouter();
  const [password,    setPassword]    = useState("");
  const [showPw,      setShowPw]      = useState(false);
  const [error,       setError]       = useState("");
  const [submitting,  setSubmitting]  = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        window.location.href = "/admin";
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "로그인에 실패했습니다.");
      }
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ backgroundColor: "#eeefe9" }}
    >
      <div className="w-full max-w-sm">
        {/* 로고 */}
        <div className="flex flex-col items-center mb-8">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center mb-3"
            style={{ backgroundColor: "#23251d" }}
          >
            <Wind className="w-7 h-7" style={{ color: "#F54E00" }} />
          </div>
          <h1 className="text-2xl font-bold" style={{ color: "#23251d" }}>구름상회</h1>
          <p className="text-sm mt-1" style={{ color: "#9ea096" }}>관리자 로그인</p>
        </div>

        {/* 로그인 폼 */}
        <form
          onSubmit={handleSubmit}
          className="rounded-3xl p-6 shadow-sm"
          style={{ backgroundColor: "#fdfdf8", border: "1.5px solid #bfc1b7" }}
        >
          <div className="mb-4">
            <label className="block text-sm font-semibold mb-2" style={{ color: "#4d4f46" }}>
              <Lock className="w-3.5 h-3.5 inline mr-1.5" />
              관리자 비밀번호
            </label>
            <div className="relative">
              <input
                type={showPw ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="비밀번호를 입력하세요"
                autoComplete="current-password"
                required
                className="w-full px-4 py-3 rounded-xl text-sm border outline-none pr-11"
                style={{
                  backgroundColor: "#eeefe9",
                  borderColor: error ? "#EF4444" : "#bfc1b7",
                  color: "#23251d",
                }}
              />
              <button
                type="button"
                onClick={() => setShowPw(!showPw)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPw
                  ? <EyeOff className="w-4 h-4" style={{ color: "#9ea096" }} />
                  : <Eye    className="w-4 h-4" style={{ color: "#9ea096" }} />
                }
              </button>
            </div>
            {error && (
              <p className="text-xs mt-1.5" style={{ color: "#EF4444" }}>{error}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={submitting || !password}
            className="w-full py-3 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-50"
            style={{ backgroundColor: "#23251d" }}
          >
            {submitting ? "로그인 중..." : "로그인"}
          </button>
        </form>

        <p className="text-center text-xs mt-4" style={{ color: "#9ea096" }}>
          구름상회 관리자만 접근할 수 있습니다
        </p>
      </div>
    </div>
  );
}
