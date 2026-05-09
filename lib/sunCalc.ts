/**
 * 일출/일몰 계산 — NOAA 근사 알고리즘
 * 한국 위도(33~38°N) 기준 오차 ±5분 이내
 */

const RAD = Math.PI / 180;
const DEG = 180 / Math.PI;

export interface SunTimes {
  sunriseMin: number; // KST 자정 기준 분
  sunsetMin:  number;
  sunrise:    string; // "HH:MM"
  sunset:     string;
}

export function getSunTimes(lat: number, lng: number, dateKST?: Date): SunTimes {
  const d = dateKST ?? new Date(Date.now() + 9 * 60 * 60 * 1000);

  // 연중 일수 (1월 1일 = 1)
  const startOfYear = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const dayOfYear   = Math.floor((d.getTime() - startOfYear.getTime()) / 86_400_000) + 1;

  // 태양 적위 (B: 각도 → rad 변환 후 sin)
  const B   = (360 / 365) * (dayOfYear - 81) * RAD;
  const dec = Math.asin(Math.sin(23.45 * RAD) * Math.sin(B));

  // 일출/일몰 시간각 H (degree)
  const cosH = -Math.tan(lat * RAD) * Math.tan(dec);
  const H    = Math.acos(Math.max(-1, Math.min(1, cosH))) * DEG;

  // 균시차 (분)
  const EoT = 9.87 * Math.sin(2 * B) - 7.53 * Math.cos(B) - 1.5 * Math.sin(B);

  // 태양 정오 UTC 분 → 일출/일몰 UTC 분 → KST (+540)
  const solarNoonUTC = 720 - 4 * lng + EoT;
  const sunriseMin   = Math.round(solarNoonUTC - H * 4 + 540);
  const sunsetMin    = Math.round(solarNoonUTC + H * 4 + 540);

  const toHHMM = (m: number) => {
    const norm = ((m % 1440) + 1440) % 1440;
    const hh   = Math.floor(norm / 60);
    const mm   = norm % 60;
    return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
  };

  return { sunriseMin, sunsetMin, sunrise: toHHMM(sunriseMin), sunset: toHHMM(sunsetMin) };
}

/** "HH:MM" → 분 (자정 기준) */
export function hmToMin(hm: string): number {
  const [h, m] = hm.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}
