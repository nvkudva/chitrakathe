import type { Metadata, Viewport } from "next";
import { currentSession } from "@/lib/auth/session";
import { isConfigured } from "@/lib/auth/google";
import AccountChip from "@/components/AccountChip";
import "./globals.css";

export const metadata: Metadata = {
  title: "Chitrakathe — trailers for family functions",
  description:
    "Pick a template, fill a short form, add photos. A cinematic trailer for your namakarana, save-the-date, first birthday or griha pravesha in minutes.",
};

export const viewport: Viewport = {
  themeColor: "#130608",
  width: "device-width",
  initialScale: 1,
  // The scene runs edge to edge behind the notch and the home indicator.
  viewportFit: "cover",
};

/**
 * Decides before first paint whether this device gets glass.
 *
 * backdrop-filter on a sub-₹15,000 Android GPU takes a slow readback path and
 * drops a scrolling card grid to ~20fps. Running this inline avoids a flash of
 * glass that then disappears.
 */
const GLASS_GATE = `(function(){try{var n=navigator,w=window;
if((n.deviceMemory&&n.deviceMemory<=4)||(n.hardwareConcurrency&&n.hardwareConcurrency<=4)||
(n.connection&&n.connection.saveData)||(w.matchMedia&&w.matchMedia("(update: slow)").matches))
document.documentElement.setAttribute("data-glass","off")}catch(e){}})()`;

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await currentSession();

  return (
    <html lang="en-IN">
      <head>
        <script dangerouslySetInnerHTML={{ __html: GLASS_GATE }} />
      </head>
      <body>
        <div className="scene" aria-hidden="true" />
        <div className="app min-h-dvh flex flex-col">
          <header className="tier-1 glass sticky top-0 z-40" style={{ paddingTop: "env(safe-area-inset-top)" }}>
            <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-3 px-5 py-3">
              <a href="/" className="focus-ring rounded-lg px-1 py-1 flex items-baseline gap-2">
                {/* No tracking on the Kannada wordmark: it splits ತ್ರ. */}
                <span lang="kn" className="t-title-3" style={{ color: "var(--color-accent-text)", letterSpacing: 0 }}>
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

          <footer
            className="mx-auto w-full max-w-5xl px-5 py-10 t-footnote ink-4"
            style={{ paddingBottom: "calc(2.5rem + env(safe-area-inset-bottom))" }}
          >
            Uploaded photos are deleted 30 days after upload. Rendered videos are kept 90 days.{" "}
            <a href="/privacy" className="underline focus-ring rounded">
              Privacy
            </a>
          </footer>
        </div>
      </body>
    </html>
  );
}
