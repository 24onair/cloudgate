"use client";

import { useEffect, useState } from "react";

export interface InstagramPost {
  id: string;
  imageUrl: string;
  caption: string;
  link: string;
  sortOrder: number;
}

export interface YoutubeShort {
  id: string;
  videoId: string;
  title: string;
  sortOrder: number;
}

export interface SnsProfile {
  instagramHandle: string;
  instagramUrl: string;
  instagramCount: number;
  youtubeChannelName: string;
  youtubeChannelUrl: string;
  youtubeCount: number;
  youtubeAutoFetch: boolean;
  youtubeLastFetchedAt?: string;
}

// YouTube URL에서 video ID 추출
export function extractYoutubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/,
    /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    /^([a-zA-Z0-9_-]{11})$/,
  ];
  for (const re of patterns) {
    const m = url.match(re);
    if (m) return m[1];
  }
  return null;
}

export function youtubeThumbnail(videoId: string): string {
  return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
}

const DEFAULT_PROFILE: SnsProfile = {
  instagramHandle:    "@gureum_paragliding",
  instagramUrl:       "https://instagram.com/gureum_paragliding",
  instagramCount:     8,
  youtubeChannelName: "구름상회",
  youtubeChannelUrl:  "https://youtube.com/@gureum_paragliding",
  youtubeCount:       5,
  youtubeAutoFetch:   true,
};

const EVENT_KEY = "gureum_sns_update";

// ── DB row → store 타입 변환 ───────────────────────────────────
function mapPost(row: Record<string, unknown>): InstagramPost {
  return {
    id:        row.id as string,
    imageUrl:  (row.image_url as string) ?? "",
    caption:   (row.caption as string) ?? "",
    link:      (row.link as string) ?? "",
    sortOrder: (row.sort_order as number) ?? 0,
  };
}

function mapShort(row: Record<string, unknown>): YoutubeShort {
  return {
    id:        row.id as string,
    videoId:   row.video_id as string,
    title:     (row.title as string) ?? "",
    sortOrder: (row.sort_order as number) ?? 0,
  };
}

// ── 모듈 캐시 ────────────────────────────────────────────────────
let _profile: SnsProfile = DEFAULT_PROFILE;
let _posts: InstagramPost[] = [];
let _shorts: YoutubeShort[] = [];
let _loaded = false;

async function fetchAll() {
  const [profileRes, postsRes, shortsRes] = await Promise.all([
    fetch("/api/sns/profile"),
    fetch("/api/sns/posts"),
    fetch("/api/sns/shorts"),
  ]);

  if (profileRes.ok) {
    const { value } = await profileRes.json() as { value: SnsProfile | null };
    _profile = value ? { ...DEFAULT_PROFILE, ...value } : DEFAULT_PROFILE;
  }
  if (postsRes.ok) {
    const rows = await postsRes.json() as Record<string, unknown>[];
    _posts = (rows ?? []).map(mapPost).sort((a, b) => a.sortOrder - b.sortOrder);
  }
  if (shortsRes.ok) {
    const rows = await shortsRes.json() as Record<string, unknown>[];
    _shorts = (rows ?? []).map(mapShort).sort((a, b) => a.sortOrder - b.sortOrder);
  }
}

function notify() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(EVENT_KEY));
}

// ── Profile ────────────────────────────────────────────────────
export async function updateSnsProfile(p: SnsProfile) {
  _profile = p;
  notify();
  await fetch("/api/sns/profile", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ value: p }),
  });
}

// ── Instagram Posts ────────────────────────────────────────────
export async function addInstagramPost(p: Omit<InstagramPost, "id">) {
  const res = await fetch("/api/sns/posts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ imageUrl: p.imageUrl, caption: p.caption, link: p.link, sortOrder: p.sortOrder }),
  });
  if (res.ok) {
    const row = await res.json() as Record<string, unknown>;
    _posts = [..._posts, mapPost(row)].sort((a, b) => a.sortOrder - b.sortOrder);
    notify();
  }
}

export async function updateInstagramPost(p: InstagramPost) {
  _posts = _posts.map((x) => (x.id === p.id ? p : x));
  notify();
  await fetch(`/api/sns/posts/${p.id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ imageUrl: p.imageUrl, caption: p.caption, link: p.link, sortOrder: p.sortOrder }),
  });
}

export async function deleteInstagramPost(id: string) {
  _posts = _posts.filter((x) => x.id !== id);
  notify();
  await fetch(`/api/sns/posts/${id}`, { method: "DELETE" });
}

// ── YouTube Shorts ─────────────────────────────────────────────
export async function addYoutubeShort(s: Omit<YoutubeShort, "id">) {
  const res = await fetch("/api/sns/shorts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ videoId: s.videoId, title: s.title, sortOrder: s.sortOrder }),
  });
  if (res.ok) {
    const row = await res.json() as Record<string, unknown>;
    _shorts = [..._shorts, mapShort(row)].sort((a, b) => a.sortOrder - b.sortOrder);
    notify();
  }
}

export async function updateYoutubeShort(s: YoutubeShort) {
  _shorts = _shorts.map((x) => (x.id === s.id ? s : x));
  notify();
  await fetch(`/api/sns/shorts/${s.id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ videoId: s.videoId, title: s.title, sortOrder: s.sortOrder }),
  });
}

export async function deleteYoutubeShort(id: string) {
  _shorts = _shorts.filter((x) => x.id !== id);
  notify();
  await fetch(`/api/sns/shorts/${id}`, { method: "DELETE" });
}

// ── FetchedShorts: 세션 메모리만 사용 (임시 RSS 결과) ──────────
export interface FetchedShort {
  videoId: string;
  title: string;
  publishedAt: string;
}

let _fetchedShorts: FetchedShort[] = [];

export function saveFetchedShorts(items: FetchedShort[]) {
  _fetchedShorts = items;
  notify();
}

export function clearFetchedShorts() {
  _fetchedShorts = [];
  notify();
}

// ── Hook ────────────────────────────────────────────────────────
export function useSns() {
  const [profile, setProfile] = useState<SnsProfile>(_profile);
  const [posts, setPosts] = useState<InstagramPost[]>(_posts);
  const [shorts, setShorts] = useState<YoutubeShort[]>(_shorts);
  const [fetchedShorts, setFetchedShorts] = useState<FetchedShort[]>(_fetchedShorts);

  useEffect(() => {
    const refresh = () => {
      setProfile({ ..._profile });
      setPosts([..._posts]);
      setShorts([..._shorts]);
      setFetchedShorts([..._fetchedShorts]);
    };
    window.addEventListener(EVENT_KEY, refresh);

    if (!_loaded) {
      _loaded = true;
      fetchAll().then(() => notify());
    } else {
      refresh();
    }

    return () => window.removeEventListener(EVENT_KEY, refresh);
  }, []);

  return { profile, posts, shorts, fetchedShorts };
}
