import type { Metadata, Viewport } from "next";
import { currentSession } from "@/lib/auth/session";
import { isConfigured } from "@/lib/auth/google";
import { Suspense } from "react";
import AccountChip from "@/components/AccountChip";
import SiteFooter from "@/components/SiteFooter";
import "./globals.css";

export const metadata: Metadata = {
  title: "Chitrakathe — trailers for family functions",
  description:
    "Pick a template, fill a short form, add photos. A cinematic trailer for your namakarana, save-the-date, first birthday or griha pravesha in minutes.",
};

export const viewport: Viewport = {
  themeColor: "#FFFBF4",
  width: "device-width",
  initialScale: 1,
  // The page runs edge to edge behind the notch and the home indicator.
  viewportFit: "cover",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await currentSession();

  return (
    <html lang="en-IN">
      <body>
        <div className="app min-h-dvh flex flex-col">
          <header className="tier-1 panel sticky top-0 z-40" style={{ paddingTop: "env(safe-area-inset-top)" }}>
            <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-3 px-5 py-3">
              <a href="/" className="focus-ring rounded-lg px-1 flex items-baseline gap-2" style={{ minHeight: 44, alignItems: "center" }}>
                {/* No tracking on the Kannada wordmark: it splits ತ್ರ. */}
                <span lang="kn" className="t-title-3 gold-ink" style={{ letterSpacing: 0 }}>
                  ಚಿತ್ರಕಥೆ
                </span>
                <span className="t-caption ink-3">chitrakathe</span>
              </a>
              <AccountChip
                signedIn={Boolean(session)}
                name={session?.name ?? session?.email ?? null}
                picture={session?.picture ?? null}
                available={isConfigured()}
              />
            </div>
          </header>

          <main className="mx-auto w-full max-w-5xl flex-1 px-5 py-8">{children}</main>

          <Suspense>
            <SiteFooter />
          </Suspense>
        </div>
      </body>
    </html>
  );
}
