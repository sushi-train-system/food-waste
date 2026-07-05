import type { Metadata, Viewport } from "next";
import { Geist_Mono } from "next/font/google";
import "./globals.css";

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "寿司廃棄トラッカー",
  description: "寿司屋の廃棄数を2時間ごとに記録し、曜日・月次・年次で分析します。",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#9f1239",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" className={`${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-stone-100 text-stone-900">
        {children}
      </body>
    </html>
  );
}
