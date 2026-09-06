// アプリ全体で共有する設定・ユーティリティ

/// 2時間ごとのデフォルトタイムスロット（開始時刻 hour）。
/// 店舗ごとの DB 設定がない場合のフォールバック。
export const TIME_SLOTS = [14, 16, 18, 20, 22] as const;

export type TimeSlot = (typeof TIME_SLOTS)[number];

const pad = (n: number) => String(n).padStart(2, "0");
const APP_TIME_ZONE = "Australia/Brisbane";

/// スロットのラベル（例: "14:00"）
export function slotLabel(slot: number): string {
  return `${pad(slot)}:00`;
}

/// 曜日名（日本語）。0=日曜 ... 6=土曜
export const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

/// YYYY-MM-DD の日付文字列から曜日インデックス(0-6)を返す
export function weekdayIndexFromDate(dateStr: string): number {
  // ローカルタイムのずれを避けるため正午でパース
  const d = new Date(`${dateStr}T12:00:00`);
  return d.getDay();
}

/// 今日の日付を YYYY-MM-DD（ローカル）で返す
export function todayStr(now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const part = (type: string) =>
    parts.find((value) => value.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

/// 現在時刻に最も近い（含まれる）タイムスロットを返す
export function currentSlot(
  now: Date = new Date(),
  slots: readonly number[] = TIME_SLOTS,
): number {
  const h = Number(
    new Intl.DateTimeFormat("en-AU", {
      timeZone: APP_TIME_ZONE,
      hour: "2-digit",
      hourCycle: "h23",
      hour12: false,
    }).format(now),
  );
  let best = slots[0] ?? TIME_SLOTS[0];
  for (const s of slots) {
    if (h >= s) best = s;
  }
  return best;
}

/// 今月の日付範囲（start, end）
export function monthRange(now: Date = new Date()): {
  start: string;
  end: string;
} {
  const y = now.getFullYear();
  const m = now.getMonth();
  const start = `${y}-${pad(m + 1)}-01`;
  const lastDay = new Date(y, m + 1, 0).getDate();
  const end = `${y}-${pad(m + 1)}-${pad(lastDay)}`;
  return { start, end };
}

/// 今年の日付範囲（start, end）
export function yearRange(now: Date = new Date()): {
  start: string;
  end: string;
} {
  const y = now.getFullYear();
  return { start: `${y}-01-01`, end: `${y}-12-31` };
}

/// 直近 n 日間の範囲（endは今日）
export function recentRange(
  days: number,
  now: Date = new Date(),
): { start: string; end: string } {
  const end = todayStr(now);
  const s = new Date(now);
  s.setDate(s.getDate() - (days - 1));
  return { start: todayStr(s), end };
}

/// デフォルト単価（AUD）
export const DEFAULT_PRICE_AUD = 5;

/// 試験運用で使うデフォルト店舗。将来はログイン中ユーザーや店舗選択から決める。
export const DEFAULT_STORE_SLUG =
  process.env.DEFAULT_STORE_SLUG ?? "mt-sheridan";
export const DEFAULT_STORE_NAME =
  process.env.DEFAULT_STORE_NAME ?? "MT SHERIDAN";
export const DEFAULT_STORE_TIMEZONE =
  process.env.DEFAULT_STORE_TIMEZONE ?? "Australia/Brisbane";

/// AUD 金額の表示（例: $12.50）
export function formatAud(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

export function formatMonthLabel(month: string): string {
  const [year, monthIndex] = month.split("-");
  const monthNames = [
    "JAN",
    "FEB",
    "MAR",
    "APR",
    "MAY",
    "JUN",
    "JUL",
    "AUG",
    "SEP",
    "OCT",
    "NOV",
    "DEC",
  ];
  return `${monthNames[Number(monthIndex) - 1] ?? monthIndex} ${year}`;
}

export function formatDateLabel(date: string): string {
  const [year, monthIndex, day] = date.split("-");
  return `${day}/${monthIndex}/${year}`;
}
