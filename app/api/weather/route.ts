import { NextRequest, NextResponse } from "next/server";

// ── 기상청 API 엔드포인트 ─────────────────────────────────────
const KMA_NCST   = "https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getUltraSrtNcst";
const KMA_VILAGE = "https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getVilageFcst";

// ── 목업 데이터 (KMA_API_KEY 미설정 시 반환) ──────────────────
// 하루 전체 범위 (05:00 ~ 21:00) 시뮬레이션
const MOCK: WeatherResponse = {
  isMock: true,
  current: {
    wind: 2.8, windDir: "북서", windDir16: "NW", windDeg: 315,
    windGust: 4.1, temp: 18, humidity: 52,
    precipType: 0, updatedAt: "13:00",
  },
  hourly: [
    { hour: "05:00", wind: 1.2, windDir: "북동", windDir16: "NE",  windDeg: 45,  temp: 12, humidity: 72, sky: 1, precipType: 0 },
    { hour: "06:00", wind: 1.5, windDir: "북동", windDir16: "NE",  windDeg: 45,  temp: 13, humidity: 70, sky: 1, precipType: 0 },
    { hour: "07:00", wind: 1.8, windDir: "북",   windDir16: "N",   windDeg: 0,   temp: 14, humidity: 66, sky: 1, precipType: 0 },
    { hour: "08:00", wind: 2.0, windDir: "북서",  windDir16: "NW",  windDeg: 315, temp: 15, humidity: 62, sky: 1, precipType: 0 },
    { hour: "09:00", wind: 2.2, windDir: "북서",  windDir16: "NW",  windDeg: 315, temp: 16, humidity: 58, sky: 1, precipType: 0 },
    { hour: "10:00", wind: 2.5, windDir: "북서",  windDir16: "NW",  windDeg: 315, temp: 17, humidity: 55, sky: 1, precipType: 0 },
    { hour: "11:00", wind: 2.8, windDir: "북서",  windDir16: "NW",  windDeg: 315, temp: 18, humidity: 52, sky: 1, precipType: 0 },
    { hour: "12:00", wind: 3.2, windDir: "서북서", windDir16: "WNW", windDeg: 293, temp: 19, humidity: 50, sky: 1, precipType: 0 },
    { hour: "13:00", wind: 4.5, windDir: "서",    windDir16: "W",   windDeg: 270, temp: 19, humidity: 51, sky: 3, precipType: 0 },
    { hour: "14:00", wind: 5.8, windDir: "서",    windDir16: "W",   windDeg: 270, temp: 18, humidity: 55, sky: 3, precipType: 0 },
    { hour: "15:00", wind: 7.2, windDir: "서남서", windDir16: "WSW", windDeg: 248, temp: 17, humidity: 60, sky: 4, precipType: 0 },
    { hour: "16:00", wind: 6.9, windDir: "남서",  windDir16: "SW",  windDeg: 225, temp: 16, humidity: 63, sky: 4, precipType: 0 },
    { hour: "17:00", wind: 6.1, windDir: "남서",  windDir16: "SW",  windDeg: 225, temp: 16, humidity: 65, sky: 3, precipType: 0 },
    { hour: "18:00", wind: 4.8, windDir: "남",    windDir16: "S",   windDeg: 180, temp: 15, humidity: 68, sky: 3, precipType: 0 },
    { hour: "19:00", wind: 3.5, windDir: "남",    windDir16: "S",   windDeg: 180, temp: 14, humidity: 70, sky: 1, precipType: 0 },
    { hour: "20:00", wind: 2.8, windDir: "남동",  windDir16: "SE",  windDeg: 135, temp: 13, humidity: 72, sky: 1, precipType: 0 },
  ],
  fetchedAt: new Date().toISOString(),
};

// ── 타입 ────────────────────────────────────────────────────────
export interface WeatherCurrent {
  wind: number;
  windDir: string;
  windDir16: string;
  windDeg: number;
  windGust: number;
  temp: number;
  humidity: number;
  precipType: number;
  updatedAt: string;
}

export interface WeatherHourly {
  hour: string;
  wind: number;
  windDir: string;
  windDir16: string;
  windDeg: number;
  temp: number;
  humidity: number;
  sky: number;
  precipType: number;
}

export interface WeatherResponse {
  isMock: boolean;
  current: WeatherCurrent;
  hourly: WeatherHourly[];
  fetchedAt: string;
  error?: string;
}

// ── 헬퍼 ────────────────────────────────────────────────────────
const p2 = (n: number) => String(n).padStart(2, "0");

function getKST(): Date {
  return new Date(Date.now() + 9 * 60 * 60 * 1000);
}

function fmtDate(d: Date): string {
  return `${d.getUTCFullYear()}${p2(d.getUTCMonth() + 1)}${p2(d.getUTCDate())}`;
}

/** 초단기실황: 매시 :40 발표 */
function ncstBase(): { date: string; time: string } {
  const kst = getKST();
  if (kst.getUTCMinutes() < 40) kst.setUTCHours(kst.getUTCHours() - 1);
  return { date: fmtDate(kst), time: `${p2(kst.getUTCHours())}00` };
}

/**
 * 단기예보: 02, 05, 08, 11, 14, 17, 20, 23시 발표 (발표 후 10분 뒤부터 사용)
 * 하루 전체 커버를 위해 가능한 이른 base_time 사용
 * → 오늘 05:00 이후면 0200 기준 데이터 존재, 그 전이면 전날 2300 사용
 */
function vilageFcstBase(): { date: string; time: string } {
  const kst   = getKST();
  const h     = kst.getUTCHours();
  const m     = kst.getUTCMinutes();
  const total = h * 60 + m;

  // 발표 시각(분) + 10분 여유
  const BASES = [2, 5, 8, 11, 14, 17, 20, 23].map((b) => b * 60 + 10);

  let baseH = -1;
  for (let i = 0; i < BASES.length; i++) {
    if (total >= BASES[i]) baseH = [2, 5, 8, 11, 14, 17, 20, 23][i];
  }

  if (baseH < 0) {
    // 02:10 이전 → 전날 23:00
    kst.setUTCDate(kst.getUTCDate() - 1);
    return { date: fmtDate(kst), time: "2300" };
  }
  return { date: fmtDate(kst), time: `${p2(baseH)}00` };
}

const DIR16 = ["N","NNE","NE","ENE","E","ESE","SE","SSE","S","SSW","SW","WSW","W","WNW","NW","NNW"];
const DIR_KO = ["북","북북동","북동","동북동","동","동남동","남동","남남동","남","남남서","남서","서남서","서","서북서","북서","북북서"];

function degToIdx(deg: number) {
  return Math.round(((+deg % 360) + 360) % 360 / 22.5) % 16;
}
function degToDir(deg: number) { return DIR16[degToIdx(deg)]; }
function degToKo(deg: number)  { return DIR_KO[degToIdx(deg)]; }

type KmaItem = {
  category: string;
  obsrValue?: string;
  fcstDate?: string;
  fcstTime?: string;
  fcstValue?: string;
};

async function kmaFetch(
  url: string,
  key: string,
  params: Record<string, string>
): Promise<KmaItem[]> {
  const qs = new URLSearchParams({
    serviceKey: key,
    dataType:   "JSON",
    numOfRows:  "1000",
    pageNo:     "1",
    ...params,
  });
  const res = await fetch(`${url}?${qs}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`KMA HTTP ${res.status}`);
  const json = await res.json();
  const rc   = json?.response?.header?.resultCode;
  if (rc !== "00") throw new Error(`KMA code ${rc}: ${json?.response?.header?.resultMsg}`);
  const items = json?.response?.body?.items?.item;
  if (!Array.isArray(items)) throw new Error("KMA: items not array");
  return items;
}

// ── Route Handler ────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const nx = searchParams.get("nx") ?? "96";
  const ny = searchParams.get("ny") ?? "98";

  const apiKey = process.env.KMA_API_KEY ?? "";
  if (!apiKey) {
    return NextResponse.json({ ...MOCK, fetchedAt: new Date().toISOString() });
  }

  try {
    const nb  = ncstBase();
    const vb  = vilageFcstBase();
    const todayStr = fmtDate(getKST());

    const [ncstItems, vilageItems] = await Promise.all([
      kmaFetch(KMA_NCST,   apiKey, { base_date: nb.date,  base_time: nb.time,  nx, ny }),
      kmaFetch(KMA_VILAGE, apiKey, { base_date: vb.date,  base_time: vb.time,  nx, ny }),
    ]);

    // ── 초단기실황 파싱 (현재 기상) ──────────────────────────
    const ncst: Record<string, string> = {};
    for (const item of ncstItems) ncst[item.category] = item.obsrValue ?? "";

    const wDeg = parseFloat(ncst.VEC ?? "0");
    const current: WeatherCurrent = {
      wind:        parseFloat(ncst.WSD ?? "0"),
      windDir:     degToKo(wDeg),
      windDir16:   degToDir(wDeg),
      windDeg:     wDeg,
      windGust:    parseFloat(ncst.WSD ?? "0") * 1.3,
      temp:        parseFloat(ncst.T1H ?? "0"),
      humidity:    parseFloat(ncst.REH ?? "0"),
      precipType:  parseInt(ncst.PTY ?? "0"),
      updatedAt:   `${nb.time.slice(0, 2)}:${nb.time.slice(2)}`,
    };

    // ── 단기예보 파싱 (오늘 하루 시간별) ─────────────────────
    const byTime: Record<string, Record<string, string>> = {};
    for (const item of vilageItems) {
      if (item.fcstDate !== todayStr) continue; // 오늘 날짜만
      const key = `${item.fcstDate}_${item.fcstTime}`;
      if (!byTime[key]) byTime[key] = {
        _date: item.fcstDate ?? "",
        _time: item.fcstTime ?? "",
      };
      byTime[key][item.category] = item.fcstValue ?? "";
    }

    const hourly: WeatherHourly[] = Object.entries(byTime)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, d]) => {
        const wdeg = parseFloat(d.VEC ?? "0");
        const t    = d._time ?? "";
        return {
          hour:       `${t.slice(0, 2)}:${t.slice(2)}`,
          wind:       parseFloat(d.WSD ?? "0"),
          windDir:    degToKo(wdeg),
          windDir16:  degToDir(wdeg),
          windDeg:    wdeg,
          temp:       parseFloat(d.TMP ?? "0"),   // 단기예보는 TMP (초단기는 T1H)
          humidity:   parseFloat(d.REH ?? "0"),
          sky:        parseInt(d.SKY ?? "1"),
          precipType: parseInt(d.PTY ?? "0"),
        };
      });

    const result: WeatherResponse = {
      isMock: false,
      current,
      hourly,
      fetchedAt: new Date().toISOString(),
    };
    return NextResponse.json(result);

  } catch (err) {
    console.error("[Weather API Error]", err);
    return NextResponse.json({
      ...MOCK,
      isMock:     true,
      error:      String(err),
      fetchedAt:  new Date().toISOString(),
    });
  }
}
