"use client";

import { useEffect, useRef, type CSSProperties } from "react";

/**
 * A 9:16 sample trailer that plays itself — the gallery's whole job.
 *
 * Two constraints drive the shape of this:
 *
 * 1. **One decoder at a time.** A phone that tries to decode five 540x960
 *    videos at once drops the scroll to single-figure frame rates and cooks
 *    the battery. Every tile registers with one module-level
 *    IntersectionObserver; the most-visible tile plays and every other one is
 *    paused. The observer is shared, not per-tile, because the comparison is
 *    between tiles.
 * 2. **Motion is a preference, not a given.** Under
 *    `prefers-reduced-motion: reduce` — or `saveData`, where the cost is the
 *    user's — nothing ever plays and the poster is the whole experience. The
 *    poster is the name-reveal frame, so a still tile is still the product.
 *
 * The videos have no audio track at all; `muted` is still set, because without
 * it autoplay is refused outright.
 */

const tiles = new Set<HTMLVideoElement>();
const visibility = new Map<HTMLVideoElement, number>();
let observer: IntersectionObserver | null = null;

function quiet(): boolean {
  if (typeof window === "undefined") return true;
  const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
  const saveData = (navigator as { connection?: { saveData?: boolean } }).connection?.saveData ?? false;
  return reduce || saveData;
}

/** Play the most-visible tile, pause the rest. Called on every observer batch. */
function reconcile() {
  if (quiet()) {
    for (const v of tiles) v.pause();
    return;
  }
  let best: HTMLVideoElement | null = null;
  let bestRatio = 0.55; // below this, nothing is really on screen
  for (const v of tiles) {
    const r = visibility.get(v) ?? 0;
    if (r > bestRatio) {
      best = v;
      bestRatio = r;
    }
  }
  for (const v of tiles) {
    if (v === best) {
      // play() rejects if the tab is hidden or the gesture policy says no.
      // That is not an error worth surfacing — the poster stays up.
      void v.play().catch(() => {});
    } else if (!v.paused) {
      v.pause();
    }
  }
}

function watch(v: HTMLVideoElement) {
  observer ??= new IntersectionObserver(
    (entries) => {
      for (const e of entries) visibility.set(e.target as HTMLVideoElement, e.intersectionRatio);
      reconcile();
    },
    { threshold: [0, 0.25, 0.5, 0.6, 0.75, 0.9, 1] },
  );
  tiles.add(v);
  observer.observe(v);
  return () => {
    observer?.unobserve(v);
    tiles.delete(v);
    visibility.delete(v);
  };
}

export default function SampleTile({
  templateId,
  label,
  hero = false,
  className = "",
  style,
}: {
  templateId: string;
  /** Rendered over the scrim. The tile is decorative without it. */
  label?: string;
  hero?: boolean;
  /** The caller owns the box: this component only fills it 9:16. */
  className?: string;
  style?: CSSProperties;
}) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    const stop = watch(v);
    const mq = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    const onChange = () => reconcile();
    mq?.addEventListener?.("change", onChange);
    return () => {
      mq?.removeEventListener?.("change", onChange);
      stop();
    };
  }, []);

  return (
    <div className={`screen relative ${className}`} style={{ borderRadius: hero ? 26 : 20, ...style }}>
      <video
        ref={ref}
        src={`/samples/${templateId}.mp4`}
        poster={`/samples/${templateId}.jpg`}
        muted
        loop
        playsInline
        autoPlay
        preload="metadata"
        aria-hidden="true"
        tabIndex={-1}
        className="h-full w-full object-cover"
        style={{ borderRadius: hero ? 18 : 14 }}
      />
      {label && (
        <>
          {/* Scrim, not a shadow: the name has to stay legible over 30 seconds
              of moving footage, including the frames that are nearly white. */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-2 bottom-2"
            style={{
              height: "52%",
              borderRadius: `0 0 ${hero ? 18 : 14}px ${hero ? 18 : 14}px`,
              background:
                "linear-gradient(180deg, transparent 0%, rgb(10 8 7 / .20) 38%, rgb(10 8 7 / .72) 72%, rgb(10 8 7 / .88) 100%)",
            }}
          />
          <h2
            className={`absolute inset-x-0 bottom-0 px-4 pb-4 ${hero ? "t-title-2" : "t-title-3"}`}
            style={{ color: "#FFF6E9", textShadow: "0 1px 3px rgb(0 0 0 / .55)" }}
          >
            {label}
          </h2>
        </>
      )}
    </div>
  );
}
