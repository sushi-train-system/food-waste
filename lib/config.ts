// アプリ全体で共有する設定・ユーティリティ

/// 2時間ごとのタイムスロット（開始時刻 hour）。
/// 営業時間 10:00〜22:00 を想定。必要に応じて変更可能。
export const TIME_SLOTS = [10, 12, 14, 16, 18, 20] as const;

export type TimeSlot = (typeof TIME_SLOTS)[number];

const pad = (n: number) => String(n).padStart(2, "0");

/// スロットのラベル（例: "10:00-12:00"）
export function slotLabel(slot: number): string {
  return `${pad(slot)}:00–${pad(slot + 2)}:00`;
}

/// 曜日名（日本語）。0=日曜 ... 6=土曜
export const WEEKDAY_LABELS = ["日", "月", "火", "水", "木", "金", "土"] as const;

/// YYYY-MM-DD の日付文字列から曜日インデックス(0-6)を返す
export function weekdayIndexFromDate(dateStr: string): number {
  // ローカルタイムのずれを避けるため正午でパース
  const d = new Date(`${dateStr}T12:00:00`);
  return d.getDay();
}

/// 今日の日付を YYYY-MM-DD（ローカル）で返す
export function todayStr(now: Date = new Date()): string {
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/// 現在時刻に最も近い（含まれる）タイムスロットを返す
export function currentSlot(now: Date = new Date()): TimeSlot {
  const h = now.getHours();
  let best: TimeSlot = TIME_SLOTS[0];
  for (const s of TIME_SLOTS) {
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

/// AUD 金額の表示（例: $12.50）
export function formatAud(amount: number): string {
  return `$${amount.toFixed(2)}`;
}
