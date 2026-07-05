import type {
  AdminCategory,
  AnalyticsResponse,
  CategoryDTO,
  DailyRow,
  EntryDTO,
  RawRow,
  SaveEntriesBody,
} from "./types";

async function jsonFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status}: ${text}`);
  }
  return (await res.json()) as T;
}

export function fetchMenu(): Promise<CategoryDTO[]> {
  return jsonFetch<CategoryDTO[]>("/api/menu");
}

export function fetchEntries(
  date: string,
  slot: number,
): Promise<{ date: string; slot: number; entries: EntryDTO[] }> {
  return jsonFetch(`/api/entries?date=${date}&slot=${slot}`);
}

export function saveEntries(body: SaveEntriesBody): Promise<{ ok: boolean }> {
  return jsonFetch("/api/entries", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function fetchAnalytics(params: {
  start?: string;
  end?: string;
  category?: string;
}): Promise<AnalyticsResponse> {
  const qs = new URLSearchParams();
  if (params.start) qs.set("start", params.start);
  if (params.end) qs.set("end", params.end);
  if (params.category) qs.set("category", params.category);
  const q = qs.toString();
  return jsonFetch<AnalyticsResponse>(`/api/analytics${q ? `?${q}` : ""}`);
}

// ---- メニュー管理（設定タブ） ----

export function fetchAdminCategories(): Promise<AdminCategory[]> {
  return jsonFetch<AdminCategory[]>("/api/categories");
}

export function createCategory(name: string) {
  return jsonFetch("/api/categories", {
    method: "POST",
    body: JSON.stringify({ name }),
  });
}

export function updateCategory(
  id: string,
  data: { name?: string; sortOrder?: number },
) {
  return jsonFetch(`/api/categories/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export function deleteCategory(id: string) {
  return jsonFetch(`/api/categories/${id}`, { method: "DELETE" });
}

export function createItem(categoryId: string, name: string) {
  return jsonFetch("/api/items", {
    method: "POST",
    body: JSON.stringify({ categoryId, name }),
  });
}

export function updateItem(
  id: string,
  data: { name?: string; active?: boolean; sortOrder?: number; priceAud?: number },
) {
  return jsonFetch(`/api/items/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export function deleteItem(id: string) {
  return jsonFetch(`/api/items/${id}`, { method: "DELETE" });
}

export function fetchData(
  view: "raw" | "daily",
  params: { start?: string; end?: string },
): Promise<{ view: string; rows: RawRow[] | DailyRow[] }> {
  const qs = new URLSearchParams({ view });
  if (params.start) qs.set("start", params.start);
  if (params.end) qs.set("end", params.end);
  return jsonFetch(`/api/data?${qs.toString()}`);
}
