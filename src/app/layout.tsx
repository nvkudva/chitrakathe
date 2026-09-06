import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Chitrakathe — trailers for family functions",
  description:
    "Pick a template, fill six fields, add photos. A cinematic trailer for your namakarana, save-the-date, first birthday or griha pravesha in minutes.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">
        <header className="border-b border-white/10 px-6 py-4">
          <a href="/" className="text-lg tracking-widest font-semibold text-[var(--color-accent)]">
            ಚಿತ್ರಕಥೆ <span className="text-[var(--color-ink)]/60 text-sm tracking-normal">chitrakathe</span>
          </a>
        </header>
        <main className="mx-auto max-w-5xl px-6 py-10">{children}</main>
        <footer className="mx-auto max-w-5xl px-6 py-10 text-xs text-white/40">
          Uploaded photos are deleted 30 days after upload. Rendered videos are kept 90 days.{" "}
          <a href="/privacy" className="underline">Privacy</a>
        </footer>
      </body>
    </html>
  );
}
