"use client";

import { useState } from "react";

/**
 * Sign-in lives in the chrome, but it is never a wall: a family can browse,
 * fill the brief and watch their watermarked preview signed out. See
 * docs/auth.md for why the gate is at the render, not the door.
 */
export default function AccountChip({
  signedIn,
  name,
  picture,
  available,
}: {
  signedIn: boolean;
  name: string | null;
  picture: string | null;
  available: boolean;
}) {
  const [open, setOpen] = useState(false);
  if (!available) return null;

  if (!signedIn) {
    return (
      <a
        href="/api/auth/signin"
        className="glass tier-0 press focus-ring inline-flex items-center gap-2 rounded-full px-4 py-2 t-subhead ink-1"
        style={{ ["--r" as string]: "999px", minHeight: 44 }}
      >
        <GoogleMark />
        Sign in
      </a>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="glass tier-0 press focus-ring inline-flex items-center gap-2 rounded-full py-1.5 pl-1.5 pr-3 t-subhead ink-1"
        style={{ ["--r" as string]: "999px", minHeight: 44 }}
      >
        {picture ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={picture} alt="" width={28} height={28} className="rounded-full" referrerPolicy="no-referrer" />
        ) : (
          <span className="grid h-7 w-7 place-items-center rounded-full bg-white/15">
            {(name ?? "?").slice(0, 1).toUpperCase()}
          </span>
        )}
        <span className="max-w-[9ch] truncate">{name?.split(" ")[0] ?? "Account"}</span>
      </button>

      {open && (
        <div
          role="menu"
          className="glass tier-3 absolute right-0 mt-2 w-56 overflow-hidden p-2"
          style={{ ["--r" as string]: "18px" }}
        >
          <p className="px-3 py-2 t-footnote ink-3 break-all">{name}</p>
          <a
            href="/mine"
            role="menuitem"
            className="block rounded-xl px-3 py-2.5 t-callout ink-1 hover:bg-white/10 focus-ring"
          >
            My trailers
          </a>
          {/* POST, so a stray <img src> cannot sign someone out. */}
          <form action="/api/auth/signout" method="post">
            <button
              type="submit"
              role="menuitem"
              className="w-full rounded-xl px-3 py-2.5 text-left t-callout ink-2 hover:bg-white/10 focus-ring"
            >
              Sign out
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

export function GoogleMark({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.6l6.7-6.7C35.6 2.6 30.2 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.8 6.1C12.3 13.2 17.6 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4 6.9-10 6.9-17.5z" />
      <path fill="#FBBC05" d="M10.4 28.7a14.8 14.8 0 0 1 0-9.4l-7.8-6.1a24 24 0 0 0 0 21.6l7.8-6.1z" />
      <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.5-5.8c-2.1 1.4-4.8 2.3-8.4 2.3-6.4 0-11.7-3.7-13.6-8.9l-7.8 6.1C6.5 42.6 14.6 48 24 48z" />
    </svg>
  );
}
