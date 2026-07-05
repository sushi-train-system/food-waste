"use client";

import { useState } from "react";
import InputTab from "./InputTab";
import AnalyticsTab from "./AnalyticsTab";
import DataTab from "./DataTab";
import SettingsTab from "./SettingsTab";

type Tab = "input" | "analytics" | "data" | "settings";

const TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
  {
    key: "input",
    label: "入力",
    icon: (
      <path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z" />
    ),
  },
  {
    key: "analytics",
    label: "分析",
    icon: <path d="M3 3v18h18M7 15l4-4 3 3 5-6" />,
  },
  {
    key: "data",
    label: "データ",
    icon: (
      <>
        <ellipse cx="12" cy="5" rx="8" ry="3" />
        <path d="M4 5v14c0 1.66 3.58 3 8 3s8-1.34 8-3V5M4 12c0 1.66 3.58 3 8 3s8-1.34 8-3" />
      </>
    ),
  },
  {
    key: "settings",
    label: "設定",
    icon: (
      <>
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </>
    ),
  },
];

const TITLES: Record<Tab, string> = {
  input: "廃棄数の入力",
  analytics: "分析",
  data: "データ",
  settings: "メニュー設定",
};

export default function AppShell() {
  const [tab, setTab] = useState<Tab>("input");

  return (
    <div className="flex flex-col min-h-full">
      {/* ヘッダー */}
      <header className="fixed top-0 inset-x-0 z-30 h-14 bg-rose-900 text-white flex items-center px-4 shadow">
        <span className="text-lg font-bold tracking-wide">寿司 廃棄トラッカー</span>
        <span className="ml-auto text-sm opacity-80">{TITLES[tab]}</span>
      </header>

      {/* コンテンツ */}
      <main className="flex-1 pt-14">
        {tab === "input" && <InputTab />}
        {tab === "analytics" && <AnalyticsTab />}
        {tab === "data" && <DataTab />}
        {tab === "settings" && <SettingsTab />}
      </main>

      {/* ボトムナビ */}
      <nav className="fixed bottom-0 inset-x-0 z-30 h-16 bg-white border-t border-stone-200 flex">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 flex flex-col items-center justify-center gap-0.5 ${
              tab === t.key ? "text-rose-800" : "text-stone-400"
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
