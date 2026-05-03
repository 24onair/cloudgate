"use client";

import { useEffect, useState } from "react";

export interface InstagramPost {
  id: string;
  imageUrl: string;   // 이미지 URL 또는 base64 data URL
  caption: string;    // 짧은 설명
  link: string;       // 인스타그램 게시물 링크
  sortOrder: number;
}

export interface YoutubeShort {
  id: string;
  videoId: string;    // YouTube video ID (예: "dQw4w9WgXcQ")
  title: string;
  sortOrder: number;
}

export interface SnsProfile {
  instagramHandle: string;
  instagramUrl: string;
  instagramCount: number;        // 랜딩 노출 개수
  youtubeChannelName: string;
  youtubeChannelUrl: string;
  youtubeCount: number;          // 랜딩 노출 개수
  youtubeAutoFetch: boolean;     // RSS 자동 가져오기 사용 여부
  youtubeLastFetchedAt?: string; // ISO 시각
}

const POSTS_KEY     = "gureum_instagram_posts";
const SHORTS_KEY    = "gureum_youtube_shorts";
const FETCHED_KEY   = "gureum_youtube_fetched";
const PROFILE_KEY   = "gureum_sns_profile";
const EVENT_KEY     = "gureum_sns_update";

const DEFAULT_PROFILE: SnsProfile = {
  instagramHandle:    "@gureum_paragliding",
  instagramUrl:       "https://instagram.com/gureum_paragliding",
  instagramCount:     8,
  youtubeChannelName: "구름상회",
  youtubeChannelUrl:  "https://youtube.com/@gureum_paragliding",
  youtubeCount:       5,
  youtubeAutoFetch:   true,
};

// YouTube URL에서 video ID 추출
export function extractYoutubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/,
    /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    /^([a-zA-Z0-9_-]{11})$/, // 그냥 ID만 입력한 경우
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

// ── Profile ────────────────────────────────────────────
function loadProfile(): SnsProfile {
  if (typeof window === "undefined") return DEFAULT_PROFILE;
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    return raw ? { ...DEFAULT_PROFILE, ...JSON.parse(raw) } : DEFAULT_PROFILE;
  } catch { return DEFAULT_PROFILE; }
}
export function updateSnsProfile(p: SnsProfile) {
  localStorage.setItem(PROFILE_KEY, JSON.stringify(p));
  window.dispatchEvent(new Event(EVENT_KEY));
}

// ── Instagram Posts ────────────────────────────────────
function loadPosts(): InstagramPost[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(POSTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}
function savePosts(data: InstagramPost[]) {
  localStorage.setItem(POSTS_KEY, JSON.stringify(data));
  window.dispatchEvent(new Event(EVENT_KEY));
}
export function addInstagramPost(p: InstagramPost) {
  savePosts([...loadPosts(), p]);
}
export function updateInstagramPost(p: InstagramPost) {
  savePosts(loadPosts().map((x) => (x.id === p.id ? p : x)));
}
export function deleteInstagramPost(id: string) {
  savePosts(loadPosts().filter((x) => x.id !== id));
}

// ── YouTube Shorts ─────────────────────────────────────
function loadShorts(): YoutubeShort[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(SHORTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}
function saveShorts(data: YoutubeShort[]) {
  localStorage.setItem(SHORTS_KEY, JSON.stringify(data));
  window.dispatchEvent(new Event(EVENT_KEY));
}
export function addYoutubeShort(s: YoutubeShort) {
  saveShorts([...loadShorts(), s]);
}
export function updateYoutubeShort(s: YoutubeShort) {
  saveShorts(loadShorts().map((x) => (x.id === s.id ? s : x)));
}
export function deleteYoutubeShort(id: string) {
  saveShorts(loadShorts().filter((x) => x.id !== id));
}

// ── Fetched Shorts (RSS 자동 가져오기) ──────────────────
export interface FetchedShort {
  videoId: string;
  title: string;
  publishedAt: string;
}

function loadFetchedShorts(): FetchedShort[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(FETCHED_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export function saveFetchedShorts(items: FetchedShort[]) {
  localStorage.setItem(FETCHED_KEY, JSON.stringify(items));
  window.dispatchEvent(new Event(EVENT_KEY));
}

export function clearFetchedShorts() {
  localStorage.removeItem(FETCHED_KEY);
  window.dispatchEvent(new Event(EVENT_KEY));
}

// ── Hooks ──────────────────────────────────────────────
export function useSns() {
  const [profile, setProfile] = useState<SnsProfile>(DEFAULT_PROFILE);
  const [posts, setPosts] = useState<InstagramPost[]>([]);
  const [shorts, setShorts] = useState<YoutubeShort[]>([]);
  const [fetchedShorts, setFetchedShorts] = useState<FetchedShort[]>([]);

  useEffect(() => {
    const refresh = () => {
      setProfile(loadProfile());
      setPosts(loadPosts().sort((a, b) => a.sortOrder - b.sortOrder));
      setShorts(loadShorts().sort((a, b) => a.sortOrder - b.sortOrder));
      setFetchedShorts(loadFetchedShorts());
    };
    refresh();
    window.addEventListener(EVENT_KEY, refresh);
    return () => window.removeEventListener(EVENT_KEY, refresh);
  }, []);

  return { profile, posts, shorts, fetchedShorts };
}
