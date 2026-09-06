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
 *
 * RAM is the signal that matters: compositing a blurred backdrop allocates a
 * full-surface texture, and the cheap bracket is 2-4 GB. Core count is a poor
 * proxy on its own — plenty of capable 8 GB laptops and mid-range phones report
 * 4 — so cores only disqualify a device at 2 or fewer, which no current phone
 * we care about exceeds while also having enough memory.
 */
const GLASS_GATE = `(function(){try{var n=navigator,w=window;
if((n.deviceMemory&&n.deviceMemory<=4)||(n.hardwareConcurrency&&n.hardwareConcurrency<=2)||
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
              <a href="/" className="focus-ring rounded-lg px-1 flex items-baseline gap-2" style={{ minHeight: 44, alignItems: "center" }}>
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
            className="mx-auto w-full max-w-5xl px-5 py-10 t-footnote ink-3"
            style={{ paddingBottom: "calc(2.5rem + env(safe-area-inset-bottom))" }}
          >
            <p className="mb-3">
              Uploaded photos are deleted 30 days after upload. Rendered videos are kept 90 days.
            </p>
            <nav className="flex flex-wrap gap-x-4 gap-y-1">
              {[
                ["/privacy", "Privacy"],
                ["/terms", "Terms"],
                ["/refunds", "Refunds"],
                ["/contact", "Contact"],
              ].map(([href, label]) => (
                <a key={href} href={href} className="underline focus-ring rounded inline-flex items-center"
                  style={{ minHeight: 44 }}>
                  {label}
                </a>
              ))}
            </nav>
          </footer>
        </div>
      </body>
    </html>
  );
}
