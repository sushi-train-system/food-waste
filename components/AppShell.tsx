"use client";

import { useEffect, useMemo, useState } from "react";
import InputTab from "./InputTab";
import AnalyticsTab from "./AnalyticsTab";
import DataTab from "./DataTab";
import SettingsTab from "./SettingsTab";
import { createStore, errorMessage, fetchSessionInfo } from "@/lib/api";
import { hasSupabaseConfig } from "@/lib/supabase/config";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { SessionInfo } from "@/lib/types";

type Tab = "input" | "analytics" | "data" | "settings";

const TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
  {
    key: "input",
    label: "Input",
    icon: (
      <path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z" />
    ),
  },
  {
    key: "analytics",
    label: "Analytics",
    icon: <path d="M3 3v18h18M7 15l4-4 3 3 5-6" />,
  },
  {
    key: "data",
    label: "Data",
    icon: (
      <>
        <ellipse cx="12" cy="5" rx="8" ry="3" />
        <path d="M4 5v14c0 1.66 3.58 3 8 3s8-1.34 8-3V5M4 12c0 1.66 3.58 3 8 3s8-1.34 8-3" />
      </>
    ),
  },
  {
    key: "settings",
    label: "Settings",
    icon: (
      <>
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </>
    ),
  },
];

const TITLES: Record<Tab, string> = {
  input: "Input",
  analytics: "Analytics",
  data: "Data",
  settings: "Menu Settings",
};

export default function AppShell() {
  const supabaseConfigured = hasSupabaseConfig();
  const [tab, setTab] = useState<Tab>("input");
  const [visitedTabs, setVisitedTabs] = useState<Set<Tab>>(
    () => new Set(["input"]),
  );
  const [sessionInfo, setSessionInfo] = useState<SessionInfo | null>(null);
  const [authLoading, setAuthLoading] = useState(supabaseConfigured);
  const [authError, setAuthError] = useState("");
  const supabase = useMemo(
    () => (supabaseConfigured ? createSupabaseBrowserClient() : null),
    [supabaseConfigured],
  );

  const loadSessionInfo = async () => {
    setAuthError("");
    try {
      const info = await fetchSessionInfo();
      setSessionInfo(info);
      return true;
    } catch {
      setSessionInfo(null);
      setAuthError("Signed in, but failed to load your store access. Please try again.");
      return false;
    }
  };

  useEffect(() => {
    if (!supabase) return;

    let cancelled = false;

    const initializeAuth = async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const code = params.get("code");

        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          params.delete("code");
          const nextQuery = params.toString();
          const nextUrl = `${window.location.pathname}${nextQuery ? `?${nextQuery}` : ""}${window.location.hash}`;
          window.history.replaceState(null, "", nextUrl);

          if (error) throw error;
        }

        const { data } = await supabase.auth.getSession();
        if (cancelled) return;
        if (data.session) await loadSessionInfo();
      } catch (error) {
        if (!cancelled) setAuthError(errorMessage(error));
      } finally {
        if (!cancelled) setAuthLoading(false);
      }
    };

    void initializeAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        void loadSessionInfo();
      } else {
        setSessionInfo(null);
      }
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [supabase]);

  const handleSignOut = async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    setSessionInfo(null);
    setTab("input");
    setVisitedTabs(new Set(["input"]));
  };

  if (!supabaseConfigured) {
    return (
      <AuthFrame title="Authentication setup required">
        <p className="text-sm text-stone-600">
          Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to your
          environment variables to enable login.
        </p>
      </AuthFrame>
    );
  }

  if (authLoading) {
    return <div className="p-6 text-center text-stone-500">Loading...</div>;
  }

  if (!sessionInfo) {
    return (
      <LoginScreen
        error={authError}
        onError={setAuthError}
        onSuccess={loadSessionInfo}
      />
    );
  }

  if (!sessionInfo.store) {
    return (
      <StoreSetupScreen
        email={sessionInfo.user.email}
        onCreated={loadSessionInfo}
      />
    );
  }

  const visibleTabs = TABS;
  const activeTab = tab;
  const selectTab = (nextTab: Tab) => {
    setTab(nextTab);
    if (nextTab !== "settings") {
      setVisitedTabs((current) => new Set(current).add(nextTab));
    }
  };

  return (
    <div className="flex flex-col min-h-full">
      {/* ヘッダー */}
      <header className="fixed top-0 inset-x-0 z-30 h-14 bg-rose-900 text-white flex items-center px-4 shadow">
        <span className="text-lg font-bold tracking-wide">Sushi Waste Tracker</span>
        <div className="ml-auto flex items-center gap-3">
          <div className="hidden text-right text-xs opacity-80 sm:block">
            <p>{sessionInfo.store.name}</p>
          </div>
          <span className="text-sm opacity-80">{TITLES[activeTab]}</span>
          <button
            type="button"
            onClick={handleSignOut}
            className="rounded-md border border-white/30 px-2 py-1 text-xs font-semibold text-white/90"
          >
            Sign out
          </button>
        </div>
      </header>

      {/* コンテンツ */}
      <main className="flex-1 pt-14">
        {visitedTabs.has("input") && (
          <div className={activeTab === "input" ? "" : "hidden"}>
            <InputTab />
          </div>
        )}
        {visitedTabs.has("analytics") && (
          <div className={activeTab === "analytics" ? "" : "hidden"}>
            <AnalyticsTab />
          </div>
        )}
        {visitedTabs.has("data") && (
          <div className={activeTab === "data" ? "" : "hidden"}>
            <DataTab />
          </div>
        )}
        {activeTab === "settings" && <SettingsTab />}
      </main>

      {/* ボトムナビ */}
      <nav className="fixed bottom-0 inset-x-0 z-30 h-16 bg-white border-t border-stone-200 flex">
        {visibleTabs.map((t) => (
          <button
            key={t.key}
            onClick={() => selectTab(t.key)}
            className={`flex-1 flex flex-col items-center justify-center gap-0.5 ${
              activeTab === t.key ? "text-rose-800" : "text-stone-400"
            }`}
          >
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              {t.icon}
            </svg>
            <span className="text-xs font-medium">{t.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}

function AuthFrame({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-full items-center justify-center bg-stone-50 px-4 py-10">
      <div className="w-full max-w-md rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
        <h1 className="text-xl font-bold text-stone-900">{title}</h1>
        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
}

function LoginScreen({
  error,
  onError,
  onSuccess,
}: {
  error: string;
  onError: (message: string) => void;
  onSuccess: () => Promise<boolean>;
}) {
  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  const submit = async () => {
    setBusy(true);
    setMessage("");
    onError("");
    try {
      const credentials = {
        email: email.trim().toLowerCase(),
        password,
      };
      const emailRedirectTo = window.location.origin;
      const result =
        mode === "sign-in"
          ? await supabase.auth.signInWithPassword(credentials)
          : await supabase.auth.signUp({
              ...credentials,
              options: { emailRedirectTo },
            });

      if (result.error) {
        onError(result.error.message);
        return;
      }

      if (mode === "sign-up" && !result.data.session) {
        setMessage("Check your email to confirm your account, then sign in.");
        return;
      }

      const loaded = await onSuccess();
      if (!loaded) {
        onError("Signed in, but failed to load your store access. Please try again.");
      }
    } catch (e) {
      onError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthFrame title="Sushi Waste Tracker">
      <div className="mb-4 grid grid-cols-2 gap-2 rounded-lg bg-stone-100 p-1">
        <button
          type="button"
          onClick={() => setMode("sign-in")}
          className={`rounded-md px-3 py-2 text-sm font-semibold ${
            mode === "sign-in" ? "bg-white text-rose-800 shadow-sm" : "text-stone-500"
          }`}
        >
          Sign in
        </button>
        <button
          type="button"
          onClick={() => setMode("sign-up")}
          className={`rounded-md px-3 py-2 text-sm font-semibold ${
            mode === "sign-up" ? "bg-white text-rose-800 shadow-sm" : "text-stone-500"
          }`}
        >
          Register
        </button>
      </div>

      <div className="space-y-3">
        <label className="block">
          <span className="text-sm font-semibold text-stone-700">Email</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-base"
            autoComplete="email"
          />
        </label>
        <label className="block">
          <span className="text-sm font-semibold text-stone-700">Password</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-base"
            autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
          />
        </label>

        {error && (
          <p className="rounded-lg border border-red-200 bg-red-50 p-2 text-sm text-red-600">
            {error}
          </p>
        )}
        {message && (
          <p className="rounded-lg border border-emerald-200 bg-emerald-50 p-2 text-sm text-emerald-700">
            {message}
          </p>
        )}

        <button
          type="button"
          onClick={submit}
          disabled={busy || !email.trim() || password.length < 6}
          className="w-full rounded-lg bg-rose-800 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-40"
        >
          {busy ? "Please wait..." : mode === "sign-in" ? "Sign in" : "Create account"}
        </button>
      </div>
    </AuthFrame>
  );
}

function StoreSetupScreen({
  email,
  onCreated,
}: {
  email: string;
  onCreated: () => Promise<boolean>;
}) {
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
    setBusy(true);
    setError("");
    try {
      await createStore(name);
      await onCreated();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthFrame title="Create your store">
      <p className="mb-4 text-sm text-stone-600">
        Signed in as {email}. Create a store to start entering waste data.
      </p>
      <label className="block">
        <span className="text-sm font-semibold text-stone-700">Store name</span>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Brisbane CBD"
          className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-base"
        />
      </label>
      {error && (
        <p className="mt-3 rounded-lg border border-red-200 bg-red-50 p-2 text-sm text-red-600">
          {error}
        </p>
      )}
      <button
        type="button"
        onClick={submit}
        disabled={busy || !name.trim()}
        className="mt-4 w-full rounded-lg bg-rose-800 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-40"
      >
        {busy ? "Creating..." : "Create store"}
      </button>
    </AuthFrame>
  );
}
