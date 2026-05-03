import { NextResponse } from "next/server";

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0 Safari/537.36";

interface FeedEntry {
  videoId: string;
  title: string;
  publishedAt: string;
}

// 채널 페이지 HTML에서 ytInitialData JSON을 추출
function extractInitialData(html: string): unknown | null {
  const m = html.match(/var ytInitialData = (\{[\s\S]*?\});\s*<\/script>/);
  if (!m) return null;
  try {
    return JSON.parse(m[1]);
  } catch {
    return null;
  }
}

// 재귀적으로 객체에서 특정 key를 가진 값을 모두 수집
function findAll(obj: unknown, target: string): unknown[] {
  const out: unknown[] = [];
  function walk(o: unknown) {
    if (o && typeof o === "object") {
      if (Array.isArray(o)) {
        for (const v of o) walk(v);
      } else {
        for (const [k, v] of Object.entries(o as Record<string, unknown>)) {
          if (k === target) out.push(v);
          walk(v);
        }
      }
    }
  }
  walk(obj);
  return out;
}

// shortsLockupViewModel 구조에서 쇼츠 정보 추출
function extractShorts(data: unknown): FeedEntry[] {
  const seen = new Set<string>();
  const out: FeedEntry[] = [];
  const shorts = findAll(data, "shortsLockupViewModel") as Record<string, unknown>[];

  for (const v of shorts) {
    // videoId: onTap.innertubeCommand.reelWatchEndpoint.videoId
    const onTap = v.onTap as Record<string, unknown> | undefined;
    const cmd = onTap?.innertubeCommand as Record<string, unknown> | undefined;
    const reel = cmd?.reelWatchEndpoint as Record<string, unknown> | undefined;
    let vid = (reel?.videoId as string) ?? "";

    // 폴백: entityId에서 추출 ("shorts-shelf-item-VIDEOID")
    if (!vid) {
      const entityId = v.entityId as string | undefined;
      if (entityId) {
        const m = entityId.match(/-([a-zA-Z0-9_-]{11})$/);
        if (m) vid = m[1];
      }
    }

    if (!vid || vid.length !== 11 || seen.has(vid)) continue;

    // accessibilityText에서 제목 추출 ("제목 - Shorts 동영상 재생", "조회수" 등 제거)
    let title = (v.accessibilityText as string) ?? "";
    // 마지막 ", 조회수 ..." 또는 " - Shorts ..." 등 제거
    title = title.replace(/,\s*조회수[^,]*$/, "");
    title = title.replace(/\s*-\s*Shorts.*$/, "");
    title = title.replace(/\s*-\s*play Short$/i, "");
    title = title.trim();

    seen.add(vid);
    out.push({ videoId: vid, title, publishedAt: "" });
  }

  return out;
}

// lockupViewModel 또는 videoRenderer 구조에서 일반 영상 정보 추출 (fallback)
function extractVideos(data: unknown): FeedEntry[] {
  const seen = new Set<string>();
  const out: FeedEntry[] = [];

  const lockups = findAll(data, "lockupViewModel") as Record<string, unknown>[];
  for (const lv of lockups) {
    const vid = (lv.contentId as string) ?? "";
    if (!vid || vid.length !== 11 || seen.has(vid)) continue;
    let title = "";
    const md = (lv.metadata as Record<string, unknown> | undefined)?.lockupMetadataViewModel as
      | Record<string, unknown>
      | undefined;
    const titleObj = md?.title as Record<string, unknown> | undefined;
    if (titleObj && typeof titleObj.content === "string") {
      title = titleObj.content;
    }
    seen.add(vid);
    out.push({ videoId: vid, title, publishedAt: "" });
  }

  if (out.length === 0) {
    for (const kind of ["videoRenderer", "gridVideoRenderer"]) {
      const items = findAll(data, kind) as Record<string, unknown>[];
      for (const v of items) {
        const vid = (v.videoId as string) ?? "";
        if (!vid || vid.length !== 11 || seen.has(vid)) continue;
        let title = "";
        const t = v.title as Record<string, unknown> | undefined;
        if (t) {
          if (Array.isArray(t.runs) && t.runs.length > 0) {
            title = (t.runs[0] as Record<string, string>).text ?? "";
          } else if (typeof t.simpleText === "string") {
            title = t.simpleText;
          }
        }
        seen.add(vid);
        out.push({ videoId: vid, title, publishedAt: "" });
      }
    }
  }

  return out;
}

// 채널 URL 정규화: /shorts, /videos 등 경로가 있으면 채널 base로 변환
function normalizeChannelUrl(url: string): string {
  // 끝의 /shorts, /videos, /community, /featured 등을 제거
  return url.replace(/\/(shorts|videos|community|featured|streams|playlists|about)\/?$/, "").replace(/\/$/, "");
}

export async function GET(req: Request) {
  const inputUrl = new URL(req.url).searchParams.get("url");
  if (!inputUrl) {
    return NextResponse.json({ error: "missing url parameter" }, { status: 400 });
  }

  const baseUrl = normalizeChannelUrl(inputUrl);
  // 쇼츠 페이지를 우선 시도
  const shortsPage = `${baseUrl}/shorts`;

  try {
    const res = await fetch(shortsPage, {
      headers: {
        "User-Agent": UA,
        "Accept-Language": "ko,en-US;q=0.9,en;q=0.8",
        "Cookie": "CONSENT=YES+1",
      },
      cache: "no-store",
    });
    if (!res.ok) {
      return NextResponse.json(
        { error: `채널 페이지를 불러오지 못했습니다 (${res.status}). URL을 확인해주세요.` },
        { status: 502 }
      );
    }
    const html = await res.text();

    // 채널 ID 추출 (참고용)
    let channelId: string | null = null;
    const canonical = html.match(/<link\s+rel="canonical"\s+href="https?:\/\/www\.youtube\.com\/channel\/(UC[a-zA-Z0-9_-]{22})"/);
    if (canonical) channelId = canonical[1];
    if (!channelId) {
      const m = html.match(/"externalId":"(UC[a-zA-Z0-9_-]{22})"/);
      if (m) channelId = m[1];
    }

    const data = extractInitialData(html);
    if (!data) {
      return NextResponse.json(
        { error: "유튜브 데이터를 파싱할 수 없습니다. YouTube 페이지 구조가 변경되었을 수 있습니다." },
        { status: 500 }
      );
    }

    // 쇼츠 우선 시도, 없으면 일반 동영상으로 폴백
    let entries = extractShorts(data);
    if (entries.length === 0) {
      entries = extractVideos(data);
    }
    if (entries.length === 0) {
      return NextResponse.json(
        { error: "이 채널에서 쇼츠를 찾을 수 없습니다. 쇼츠가 등록된 채널인지 확인해주세요." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      channelId,
      entries: entries.slice(0, 20),
      fetchedAt: new Date().toISOString(),
    });
  } catch (err) {
    return NextResponse.json(
      { error: "유튜브 페이지 가져오기 중 오류가 발생했습니다", detail: String(err) },
      { status: 500 }
    );
  }
}
