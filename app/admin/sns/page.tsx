"use client";

import { useState, useRef } from "react";
import {
  Plus,
  X,
  Check,
  Trash2,
  Edit2,
  Image as ImageIcon,
  Link2,
  ExternalLink,
  Save,
  Share2,
  RefreshCw,
  Loader2,
  Zap,
} from "lucide-react";
import { InstagramIcon as Instagram, YoutubeIcon as Youtube } from "@/components/SnsIcons";
import {
  useSns,
  updateSnsProfile,
  addInstagramPost,
  updateInstagramPost,
  deleteInstagramPost,
  addYoutubeShort,
  updateYoutubeShort,
  deleteYoutubeShort,
  extractYoutubeId,
  youtubeThumbnail,
  saveFetchedShorts,
  clearFetchedShorts,
  type SnsProfile,
  type InstagramPost,
  type YoutubeShort,
  type FetchedShort,
} from "@/lib/snsStore";

async function resizeImage(file: File): Promise<string> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
  return new Promise<string>((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const max = 900;
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL("image/jpeg", 0.75));
    };
    img.onerror = reject;
    img.src = dataUrl;
  });
}

const newId = () => `sns_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

export default function AdminSnsPage() {
  const { profile, posts, shorts, fetchedShorts } = useSns();
  const [draftProfile, setDraftProfile] = useState<SnsProfile>(profile);
  const [profileDirty, setProfileDirty] = useState(false);

  const [postModal, setPostModal] = useState<InstagramPost | null>(null);
  const [shortModal, setShortModal] = useState<YoutubeShort | null>(null);

  const [ytFetching, setYtFetching] = useState(false);
  const [ytFetchMsg, setYtFetchMsg] = useState<{ type: "ok" | "error"; text: string } | null>(null);

  async function fetchYoutubeFeed() {
    if (!draftProfile.youtubeChannelUrl.trim()) {
      setYtFetchMsg({ type: "error", text: "유튜브 채널 URL을 먼저 입력해주세요" });
      return;
    }
    setYtFetching(true);
    setYtFetchMsg(null);
    try {
      const res = await fetch(`/api/youtube/feed?url=${encodeURIComponent(draftProfile.youtubeChannelUrl)}`);
      const data = await res.json();
      if (!res.ok) {
        setYtFetchMsg({ type: "error", text: data.error ?? "가져오기 실패" });
        return;
      }
      const entries: FetchedShort[] = data.entries ?? [];
      saveFetchedShorts(entries);
      const next: SnsProfile = { ...draftProfile, youtubeLastFetchedAt: data.fetchedAt };
      setDraftProfile(next);
      updateSnsProfile(next);
      setProfileDirty(false);
      setYtFetchMsg({ type: "ok", text: `${entries.length}개 영상을 가져왔습니다` });
    } catch (e) {
      setYtFetchMsg({ type: "error", text: "네트워크 오류가 발생했습니다" });
    } finally {
      setYtFetching(false);
    }
  }

  function startNewPost() {
    setPostModal({
      id: newId(),
      imageUrl: "",
      caption: "",
      link: "",
      sortOrder: posts.length + 1,
    });
  }

  function startNewShort() {
    setShortModal({
      id: newId(),
      videoId: "",
      title: "",
      sortOrder: shorts.length + 1,
    });
  }

  function syncProfile(p: SnsProfile) {
    setDraftProfile(p);
    setProfileDirty(true);
  }

  function saveProfile() {
    updateSnsProfile(draftProfile);
    setProfileDirty(false);
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Share2 className="w-6 h-6" style={{ color: "#2A7AE2" }} />
          SNS 관리
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          랜딩 페이지에 노출되는 인스타그램 피드와 유튜브 쇼츠를 등록·관리합니다.
        </p>
      </div>

      {/* ── 프로필 정보 ───────────────────────────────────── */}
      <div className="bg-white rounded-2xl shadow-sm p-5 mb-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-gray-900">채널 프로필</h2>
          {profileDirty && (
            <button
              onClick={saveProfile}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white"
              style={{ backgroundColor: "#0D2B52" }}
            >
              <Save className="w-3.5 h-3.5" /> 저장
            </button>
          )}
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1.5 flex items-center gap-1">
              <Instagram className="w-3.5 h-3.5" style={{ color: "#E1306C" }} />
              인스타그램 핸들
            </label>
            <input
              value={draftProfile.instagramHandle}
              onChange={(e) => syncProfile({ ...draftProfile, instagramHandle: e.target.value })}
              placeholder="@gureum_paragliding"
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-pink-200"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1.5 flex items-center gap-1">
              <Link2 className="w-3.5 h-3.5" />
              인스타그램 프로필 URL
            </label>
            <input
              value={draftProfile.instagramUrl}
              onChange={(e) => syncProfile({ ...draftProfile, instagramUrl: e.target.value })}
              placeholder="https://instagram.com/..."
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-pink-200"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1.5 flex items-center gap-1">
              <Youtube className="w-3.5 h-3.5" style={{ color: "#FF0000" }} />
              유튜브 채널명
            </label>
            <input
              value={draftProfile.youtubeChannelName}
              onChange={(e) => syncProfile({ ...draftProfile, youtubeChannelName: e.target.value })}
              placeholder="구름상회"
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-red-200"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1.5 flex items-center gap-1">
              <Link2 className="w-3.5 h-3.5" />
              유튜브 채널 URL
            </label>
            <input
              value={draftProfile.youtubeChannelUrl}
              onChange={(e) => syncProfile({ ...draftProfile, youtubeChannelUrl: e.target.value })}
              placeholder="https://youtube.com/@..."
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-red-200"
            />
          </div>
        </div>

        {/* 노출 개수 + 자동 가져오기 옵션 */}
        <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-gray-100">
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1.5 flex items-center gap-1">
              <Instagram className="w-3.5 h-3.5" style={{ color: "#E1306C" }} />
              랜딩 노출 인스타 개수
            </label>
            <input
              type="number"
              min={1}
              max={20}
              value={draftProfile.instagramCount}
              onChange={(e) => syncProfile({ ...draftProfile, instagramCount: Number(e.target.value) || 1 })}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-pink-200"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1.5 flex items-center gap-1">
              <Youtube className="w-3.5 h-3.5" style={{ color: "#FF0000" }} />
              랜딩 노출 유튜브 개수
            </label>
            <input
              type="number"
              min={1}
              max={20}
              value={draftProfile.youtubeCount}
              onChange={(e) => syncProfile({ ...draftProfile, youtubeCount: Number(e.target.value) || 1 })}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-red-200"
            />
          </div>
        </div>

        <label className="mt-4 flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
          <input
            type="checkbox"
            checked={draftProfile.youtubeAutoFetch}
            onChange={(e) => syncProfile({ ...draftProfile, youtubeAutoFetch: e.target.checked })}
            className="w-4 h-4"
          />
          <Zap className="w-3.5 h-3.5 text-amber-500" />
          유튜브 채널 RSS로 최신 영상 자동 가져오기 (추천)
        </label>
      </div>

      {/* ── Instagram 피드 ─────────────────────────────────── */}
      <div className="bg-white rounded-2xl shadow-sm p-5 mb-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Instagram className="w-5 h-5" style={{ color: "#E1306C" }} />
            <h2 className="text-base font-bold text-gray-900">인스타그램 피드</h2>
            <span className="text-xs text-gray-400">{posts.length}개 등록됨</span>
          </div>
          <button
            onClick={startNewPost}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white"
            style={{ backgroundColor: "#E1306C" }}
          >
            <Plus className="w-3.5 h-3.5" /> 게시물 추가
          </button>
        </div>
        {posts.length === 0 ? (
          <div className="rounded-xl bg-gray-50 px-4 py-8 text-center text-sm text-gray-400">
            등록된 게시물이 없습니다. 게시물 추가 버튼을 눌러 추가해주세요.
          </div>
        ) : (
          <div className="grid grid-cols-4 gap-3">
            {posts.map((p) => (
              <div key={p.id} className="relative group rounded-xl overflow-hidden border border-gray-200">
                {p.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.imageUrl} alt={p.caption} className="w-full aspect-square object-cover" />
                ) : (
                  <div className="w-full aspect-square bg-gray-100 flex items-center justify-center text-gray-300">
                    <ImageIcon className="w-8 h-8" />
                  </div>
                )}
                {p.caption && (
                  <p className="px-2 py-1.5 text-xs text-gray-700 truncate">{p.caption}</p>
                )}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 flex items-center justify-center gap-2">
                  <button
                    onClick={() => setPostModal(p)}
                    className="w-8 h-8 rounded-full bg-white flex items-center justify-center"
                  >
                    <Edit2 className="w-3.5 h-3.5 text-gray-700" />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm("이 게시물을 삭제하시겠어요?")) deleteInstagramPost(p.id);
                    }}
                    className="w-8 h-8 rounded-full bg-white flex items-center justify-center"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-red-500" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── YouTube Shorts ─────────────────────────────────── */}
      <div className="bg-white rounded-2xl shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Youtube className="w-5 h-5" style={{ color: "#FF0000" }} />
            <h2 className="text-base font-bold text-gray-900">유튜브 쇼츠</h2>
            <span className="text-xs text-gray-400">
              자동 {fetchedShorts.length}개 · 수동 {shorts.length}개
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchYoutubeFeed}
              disabled={ytFetching}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white disabled:opacity-50"
              style={{ backgroundColor: "#0D2B52" }}
            >
              {ytFetching ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <RefreshCw className="w-3.5 h-3.5" />
              )}
              {ytFetching ? "가져오는 중…" : "자동 가져오기"}
            </button>
            <button
              onClick={startNewShort}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white"
              style={{ backgroundColor: "#FF0000" }}
            >
              <Plus className="w-3.5 h-3.5" /> 직접 추가
            </button>
          </div>
        </div>

        {ytFetchMsg && (
          <div
            className="rounded-xl px-3 py-2 mb-3 text-xs flex items-center justify-between"
            style={{
              backgroundColor: ytFetchMsg.type === "ok" ? "#ECFDF5" : "#FEE2E2",
              color: ytFetchMsg.type === "ok" ? "#047857" : "#B91C1C",
            }}
          >
            <span>{ytFetchMsg.text}</span>
            <button onClick={() => setYtFetchMsg(null)}>
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {profile.youtubeLastFetchedAt && fetchedShorts.length > 0 && (
          <div className="rounded-xl bg-amber-50 border border-amber-100 px-3 py-2 mb-3 text-xs text-amber-700 flex items-center justify-between">
            <span>
              <Zap className="w-3 h-3 inline mr-1" />
              자동 가져온 최신 영상 — {new Date(profile.youtubeLastFetchedAt).toLocaleString("ko-KR")}
            </span>
            <button
              onClick={() => clearFetchedShorts()}
              className="underline hover:text-amber-900"
            >
              비우기
            </button>
          </div>
        )}

        {/* 자동 가져온 영상 */}
        {fetchedShorts.length > 0 && (
          <>
            <p className="text-xs font-semibold text-gray-500 mb-2 mt-3">자동 가져온 최신 영상</p>
            <div className="grid grid-cols-5 gap-3 mb-5">
              {fetchedShorts.slice(0, profile.youtubeCount).map((s) => (
                <div key={s.videoId} className="relative group rounded-xl overflow-hidden border border-amber-200">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={youtubeThumbnail(s.videoId)}
                    alt={s.title}
                    className="w-full object-cover"
                    style={{ aspectRatio: "9/16" }}
                  />
                  <div className="px-2 py-1.5">
                    <p className="text-xs text-gray-700 truncate">{s.title}</p>
                  </div>
                  <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded-md text-[9px] font-bold text-white bg-amber-500">
                    AUTO
                  </span>
                  <a
                    href={`https://youtube.com/watch?v=${s.videoId}`}
                    target="_blank"
                    rel="noreferrer"
                    className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-white/90 flex items-center justify-center opacity-0 group-hover:opacity-100"
                  >
                    <ExternalLink className="w-3 h-3 text-gray-700" />
                  </a>
                </div>
              ))}
            </div>
            {shorts.length > 0 && <p className="text-xs font-semibold text-gray-500 mb-2">직접 등록한 영상</p>}
          </>
        )}
        {shorts.length === 0 ? (
          <div className="rounded-xl bg-gray-50 px-4 py-8 text-center text-sm text-gray-400">
            등록된 쇼츠가 없습니다. 쇼츠 URL 또는 ID를 추가해주세요.
          </div>
        ) : (
          <div className="grid grid-cols-5 gap-3">
            {shorts.map((s) => (
              <div key={s.id} className="relative group rounded-xl overflow-hidden border border-gray-200">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={youtubeThumbnail(s.videoId)}
                  alt={s.title}
                  className="w-full object-cover"
                  style={{ aspectRatio: "9/16" }}
                />
                <div className="px-2 py-1.5">
                  <p className="text-xs text-gray-700 truncate">{s.title || "(제목 없음)"}</p>
                </div>
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 flex items-center justify-center gap-2">
                  <a
                    href={`https://youtube.com/shorts/${s.videoId}`}
                    target="_blank"
                    rel="noreferrer"
                    className="w-8 h-8 rounded-full bg-white flex items-center justify-center"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-gray-700" />
                  </a>
                  <button
                    onClick={() => setShortModal(s)}
                    className="w-8 h-8 rounded-full bg-white flex items-center justify-center"
                  >
                    <Edit2 className="w-3.5 h-3.5 text-gray-700" />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm("이 쇼츠를 삭제하시겠어요?")) deleteYoutubeShort(s.id);
                    }}
                    className="w-8 h-8 rounded-full bg-white flex items-center justify-center"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-red-500" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {postModal && (
        <PostEditModal
          post={postModal}
          isNew={!posts.find((p) => p.id === postModal.id)}
          onClose={() => setPostModal(null)}
        />
      )}
      {shortModal && (
        <ShortEditModal
          short={shortModal}
          isNew={!shorts.find((s) => s.id === shortModal.id)}
          onClose={() => setShortModal(null)}
        />
      )}
    </div>
  );
}

// ── Instagram Post Modal ─────────────────────────────────
function PostEditModal({
  post, isNew, onClose,
}: { post: InstagramPost; isNew: boolean; onClose: () => void }) {
  const [draft, setDraft] = useState<InstagramPost>(post);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function onFile(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    try {
      const url = await resizeImage(file);
      setDraft({ ...draft, imageUrl: url });
    } finally {
      setUploading(false);
    }
  }

  function save() {
    if (!draft.imageUrl) {
      alert("이미지를 업로드해주세요");
      return;
    }
    if (isNew) addInstagramPost(draft);
    else updateInstagramPost(draft);
    onClose();
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} />
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-2xl z-50 p-5 w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-900">
            {isNew ? "인스타그램 게시물 추가" : "게시물 수정"}
          </h3>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg">
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>

        {/* 이미지 업로드 */}
        <div className="mb-4">
          <label className="text-xs font-medium text-gray-500 mb-1.5 block">이미지</label>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => onFile(e.target.files?.[0])}
          />
          {draft.imageUrl ? (
            <div className="relative rounded-xl overflow-hidden border border-gray-200">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={draft.imageUrl} alt="preview" className="w-full aspect-square object-cover" />
              <button
                onClick={() => fileRef.current?.click()}
                className="absolute bottom-2 right-2 px-3 py-1.5 rounded-lg bg-black/70 text-white text-xs font-medium"
              >
                변경
              </button>
            </div>
          ) : (
            <button
              onClick={() => fileRef.current?.click()}
              className="w-full aspect-square rounded-xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center text-gray-400 hover:border-pink-300 hover:text-pink-500 transition-colors"
            >
              {uploading ? (
                <span className="text-sm">업로드 중…</span>
              ) : (
                <>
                  <ImageIcon className="w-8 h-8 mb-2" />
                  <span className="text-sm">클릭해서 이미지 업로드</span>
                </>
              )}
            </button>
          )}
        </div>

        <div className="mb-3">
          <label className="text-xs font-medium text-gray-500 mb-1.5 block">캡션 (선택)</label>
          <input
            value={draft.caption}
            onChange={(e) => setDraft({ ...draft, caption: e.target.value })}
            placeholder="짧은 설명"
            maxLength={50}
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-pink-200"
          />
        </div>

        <div className="mb-4">
          <label className="text-xs font-medium text-gray-500 mb-1.5 block">게시물 링크 (선택)</label>
          <input
            value={draft.link}
            onChange={(e) => setDraft({ ...draft, link: e.target.value })}
            placeholder="https://instagram.com/p/..."
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-pink-200"
          />
        </div>

        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-xl text-sm font-medium border border-gray-200 hover:bg-gray-50"
          >
            취소
          </button>
          <button
            onClick={save}
            className="flex-1 py-3 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2"
            style={{ backgroundColor: "#E1306C" }}
          >
            <Check className="w-4 h-4" />
            저장
          </button>
        </div>
      </div>
    </>
  );
}

// ── YouTube Short Modal ─────────────────────────────────
function ShortEditModal({
  short, isNew, onClose,
}: { short: YoutubeShort; isNew: boolean; onClose: () => void }) {
  const [draft, setDraft] = useState<YoutubeShort>(short);
  const [urlInput, setUrlInput] = useState(short.videoId ? `https://youtube.com/shorts/${short.videoId}` : "");
  const [error, setError] = useState("");

  function applyUrl(value: string) {
    setUrlInput(value);
    const id = extractYoutubeId(value);
    if (id) {
      setDraft({ ...draft, videoId: id });
      setError("");
    } else if (value.length > 0) {
      setError("올바른 유튜브 URL 또는 비디오 ID를 입력해주세요");
    } else {
      setError("");
    }
  }

  function save() {
    if (!draft.videoId) {
      setError("URL 또는 ID를 입력해주세요");
      return;
    }
    if (isNew) addYoutubeShort(draft);
    else updateYoutubeShort(draft);
    onClose();
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} />
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-2xl z-50 p-5 w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-900">
            {isNew ? "유튜브 쇼츠 추가" : "쇼츠 수정"}
          </h3>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg">
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>

        <div className="mb-3">
          <label className="text-xs font-medium text-gray-500 mb-1.5 block">
            유튜브 쇼츠 URL 또는 비디오 ID
          </label>
          <input
            value={urlInput}
            onChange={(e) => applyUrl(e.target.value)}
            placeholder="https://youtube.com/shorts/..."
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-red-200"
          />
          {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
        </div>

        {draft.videoId && (
          <div className="mb-3 rounded-xl overflow-hidden border border-gray-200">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={youtubeThumbnail(draft.videoId)}
              alt="thumbnail"
              className="w-full"
              style={{ aspectRatio: "16/9", objectFit: "cover" }}
            />
            <p className="text-xs text-gray-400 px-2 py-1.5">video ID: {draft.videoId}</p>
          </div>
        )}

        <div className="mb-4">
          <label className="text-xs font-medium text-gray-500 mb-1.5 block">제목 (선택)</label>
          <input
            value={draft.title}
            onChange={(e) => setDraft({ ...draft, title: e.target.value })}
            placeholder="쇼츠 제목"
            maxLength={60}
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-red-200"
          />
        </div>

        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-xl text-sm font-medium border border-gray-200 hover:bg-gray-50"
          >
            취소
          </button>
          <button
            onClick={save}
            className="flex-1 py-3 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2"
            style={{ backgroundColor: "#FF0000" }}
          >
            <Check className="w-4 h-4" />
            저장
          </button>
        </div>
      </div>
    </>
  );
}
