import type {
  AdminCategory,
  AnalyticsResponse,
  CategoryDTO,
  DailyRow,
  DataPriceMode,
  EntryDTO,
  RawRow,
  SaveEntriesBody,
  SessionInfo,
  StoreMember,
  TimeSlotDTO,
} from "./types";

async function jsonFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    let serverError = "";
    try {
      const payload = JSON.parse(text) as { error?: string };
      serverError = payload.error ?? "";
    } catch {
      serverError = text;
    }
    throw new Error(apiErrorMessage(res.status, serverError));
  }
  return (await res.json()) as T;
}

type CacheEntry = {
  expiresAt: number;
  value: unknown;
};

const responseCache = new Map<string, CacheEntry>();

function cacheKey(url: string) {
  return url;
}

async function cachedJsonFetch<T>(
  url: string,
  ttlMs = 60_000,
): Promise<T> {
  const key = cacheKey(url);
  const cached = responseCache.get(key);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value as T;
  }
  const value = await jsonFetch<T>(url);
  responseCache.set(key, { value, expiresAt: Date.now() + ttlMs });
  return value;
}

function invalidateCache(prefixes: string[]) {
  for (const key of responseCache.keys()) {
    if (prefixes.some((prefix) => key.startsWith(prefix))) {
      responseCache.delete(key);
    }
  }
}

function apiErrorMessage(status: number, serverError: string) {
  const error = serverError.toLowerCase();
  if (status === 401 || error.includes("authentication required")) {
    return "Please sign in again.";
  }
  if (error.includes("store access required")) {
    return "Store access is required. Please create or select a store.";
  }
  if (error.includes("permission denied")) {
    return "You do not have permission to do this.";
  }
  if (error.includes("invalid settings password")) {
    return "Settings password is incorrect. Please try again.";
  }
  if (error.includes("time slot already exists")) {
    return "That time slot already exists.";
  }
  if (error.includes("invalid start hour")) {
    return "Please enter a valid time.";
  }
  if (error.includes("nothing to update")) {
    return "There are no changes to save.";
  }
  if (status >= 500) {
    return "Something went wrong. Please try again.";
  }
  return serverError || "Something went wrong. Please try again.";
}

export function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

export function fetchMenu(): Promise<CategoryDTO[]> {
  return cachedJsonFetch<CategoryDTO[]>("/api/menu", 5 * 60_000);
}

export function fetchEntries(
  date: string,
  slot: number,
): Promise<{ date: string; slot: number; entries: EntryDTO[] }> {
  return jsonFetch(`/api/entries?date=${date}&slot=${slot}`);
}

export function saveEntries(body: SaveEntriesBody): Promise<{ ok: boolean }> {
  invalidateCache(["/api/analytics", "/api/data"]);
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
  return cachedJsonFetch<AnalyticsResponse>(
    `/api/analytics${q ? `?${q}` : ""}`,
    60_000,
  );
}

// ---- メニュー管理（設定タブ） ----

export function fetchAdminCategories(): Promise<AdminCategory[]> {
  return jsonFetch<AdminCategory[]>("/api/categories");
}

export function createCategory(name: string) {
  invalidateCache(["/api/menu", "/api/categories", "/api/analytics", "/api/data"]);
  return jsonFetch("/api/categories", {
    method: "POST",
    body: JSON.stringify({ name }),
  });
}

export function updateCategory(
  id: string,
  data: { name?: string; active?: boolean; sortOrder?: number },
) {
  invalidateCache(["/api/menu", "/api/categories", "/api/analytics", "/api/data"]);
  return jsonFetch(`/api/categories/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export function deleteCategory(id: string) {
  invalidateCache(["/api/menu", "/api/categories", "/api/analytics", "/api/data"]);
  return jsonFetch(`/api/categories/${id}`, { method: "DELETE" });
}

export function createItem(categoryId: string, name: string) {
  invalidateCache(["/api/menu", "/api/categories", "/api/analytics", "/api/data"]);
  return jsonFetch("/api/items", {
    method: "POST",
    body: JSON.stringify({ categoryId, name }),
  });
}

export function updateItem(
  id: string,
  data: {
    name?: string;
    active?: boolean;
    sortOrder?: number;
    priceAud?: number;
  },
) {
  invalidateCache(["/api/menu", "/api/categories", "/api/analytics", "/api/data"]);
  return jsonFetch(`/api/items/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export function deleteItem(id: string) {
  invalidateCache(["/api/menu", "/api/categories", "/api/analytics", "/api/data"]);
  return jsonFetch(`/api/items/${id}`, { method: "DELETE" });
}

export function fetchData(
  view: "raw" | "daily",
  params: { start?: string; end?: string; priceMode?: DataPriceMode },
): Promise<{ view: string; rows: RawRow[] | DailyRow[] }> {
  const qs = new URLSearchParams({ view });
  if (params.start) qs.set("start", params.start);
  if (params.end) qs.set("end", params.end);
  if (params.priceMode) qs.set("priceMode", params.priceMode);
  return cachedJsonFetch(`/api/data?${qs.toString()}`, 60_000);
}

export function fetchSessionInfo(): Promise<SessionInfo> {
  return jsonFetch<SessionInfo>("/api/auth/me");
}

export function createStore(
  name: string,
): Promise<Pick<SessionInfo, "store" | "role">> {
  return jsonFetch("/api/stores", {
    method: "POST",
    body: JSON.stringify({ name }),
  });
}

export function fetchMembers(): Promise<StoreMember[]> {
  return jsonFetch<StoreMember[]>("/api/members");
}

export function unlockSettings(password: string): Promise<{ ok: boolean }> {
  return jsonFetch("/api/settings/unlock", {
    method: "POST",
    body: JSON.stringify({ password }),
  });
}

export function lockSettings(): Promise<{ ok: boolean }> {
  return jsonFetch("/api/settings/unlock", {
    method: "DELETE",
  });
}

export function changeSettingsPassword(
  currentPassword: string,
  newPassword: string,
): Promise<{ ok: boolean }> {
  return jsonFetch("/api/settings/password", {
    method: "PATCH",
    body: JSON.stringify({ currentPassword, newPassword }),
  });
}

export function inviteMember(email: string) {
  invalidateCache(["/api/members"]);
  return jsonFetch<StoreMember>("/api/members", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

export function updateMember(id: string, data: { active?: boolean }) {
  invalidateCache(["/api/members"]);
  return jsonFetch<StoreMember>(`/api/members/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export function fetchTimeSlots(options?: {
  includeInactive?: boolean;
}): Promise<TimeSlotDTO[]> {
  const qs = new URLSearchParams();
  if (options?.includeInactive) qs.set("includeInactive", "1");
  const query = qs.toString();
  return cachedJsonFetch<TimeSlotDTO[]>(
    `/api/time-slots${query ? `?${query}` : ""}`,
    5 * 60_000,
  );
}

export function createTimeSlot(startHour: number) {
  invalidateCache(["/api/time-slots", "/api/analytics"]);
  return jsonFetch<TimeSlotDTO>("/api/time-slots", {
    method: "POST",
    body: JSON.stringify({ startHour }),
  });
}

export function updateTimeSlot(
  id: string,
  data: { startHour?: number; sortOrder?: number; active?: boolean },
) {
  invalidateCache(["/api/time-slots", "/api/analytics"]);
  return jsonFetch<TimeSlotDTO>(`/api/time-slots/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export function deleteTimeSlot(id: string) {
  invalidateCache(["/api/time-slots", "/api/analytics"]);
  return jsonFetch<{ ok: boolean }>(`/api/time-slots/${id}`, {
    method: "DELETE",
  });
}
