// API とフロントで共有する型

export type MenuItemDTO = {
  id: string;
  name: string;
  sortOrder: number;
  priceAud: number;
};

export type CategoryDTO = {
  id: string;
  slug: string;
  name: string;
  sortOrder: number;
  items: MenuItemDTO[];
};

/// 管理画面用（無効なメニューも含む）
export type AdminMenuItem = {
  id: string;
  name: string;
  sortOrder: number;
  active: boolean;
  priceAud: number;
};

export type AdminCategory = {
  id: string;
  slug: string;
  name: string;
  sortOrder: number;
  items: AdminMenuItem[];
};

export type EntryDTO = {
  menuItemId: string;
  quantity: number;
};

/// 入力保存リクエスト
export type SaveEntriesBody = {
  date: string; // YYYY-MM-DD
  slot: number; // 開始時刻(hour)
  entries: EntryDTO[];
};

/// 生データ（2時間ごと）の1行
export type RawRow = {
  date: string;
  slot: number;
  categoryName: string;
  menuName: string;
  quantity: number;
  priceAud: number;
  amount: number;
};

/// 日次集計: 商品別内訳
export type ItemBreakdown = {
  menuName: string;
  quantity: number;
  amount: number;
};

/// 日次集計: ジャンル別内訳（商品別を含む）
export type CategoryBreakdownDaily = {
  quantity: number;
  amount: number;
  items: ItemBreakdown[];
};

/// 日次集計データの1行（分析用のクリーンなデータ）
export type DailyRow = {
  date: string;
  weekday: number; // 0=日 ... 6=土
  total: number;
  totalAmount: number;
  byCategory: Record<string, CategoryBreakdownDaily>;
};

export type MonthlyPoint = {
  period: string;
  total: number;
  amount: number;
};
export type YearlyPoint = {
  period: string;
  total: number;
  amount: number;
};
export type WeekdayPoint = {
  weekday: number;
  label: string;
  total: number;
  amount: number;
  days: number;
  avg: number;
  avgAmount: number;
};

export type CategoryBreakdown = {
  name: string;
  total: number;
  amount: number;
};

export type SameMonthComparison = {
  current: MonthlyPoint;
  previous: MonthlyPoint;
  diffTotal: number;
  diffAmount: number;
  totalChangePct: number | null;
  amountChangePct: number | null;
};

export type AnalyticsResponse = {
  monthly: MonthlyPoint[];
  yearly: YearlyPoint[];
  weekday: WeekdayPoint[];
  byCategory: CategoryBreakdown[];
  sameMonthComparison: SameMonthComparison | null;
  totalCount: number;
  totalAmount: number;
  rangeStart: string | null;
  rangeEnd: string | null;
};
