import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Osse Studio",
  description: "Local-first AI short-film studio.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="min-h-screen flex flex-col">
          <header className="border-b border-edge bg-panel/60 backdrop-blur sticky top-0 z-20">
            <div className="mx-auto max-w-6xl px-4 h-14 flex items-center justify-between">
              <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
                <span className="inline-block w-2.5 h-2.5 rounded-sm bg-accent" />
                Osse Studio
              </Link>
              <nav className="flex items-center gap-4 text-sm text-neutral-400">
                <Link href="/" className="hover:text-white transition">Dashboard</Link>
                <Link href="/settings" className="hover:text-white transition">Settings</Link>
              </nav>
            </div>
          </header>
          <main className="flex-1 mx-auto w-full max-w-6xl px-4 py-6">{children}</main>
        </div>
      </body>
    </html>
  );
}
