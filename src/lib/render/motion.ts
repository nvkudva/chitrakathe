import type { Shot } from "../templates/schema";

export type Size = { w: number; h: number };

export const SIZES: Record<"9:16" | "1:1", Size> = {
  "9:16": { w: 1080, h: 1920 },
  "1:1": { w: 1080, h: 1080 },
};

export const FPS = 30;

type Motion = "push_in" | "push_out" | "drift_left" | "drift_right" | "tilt_up" | "tilt_down" | "hold";

/**
 * Build the zoompan expression for a still.
 *
 * ffmpeg's zoompan is jittery at low zoom deltas because `zoom` is quantised
 * per frame at output resolution, so we oversample: scale the source up 4x,
 * pan there, then scale back down. This is the standard fix and it is why the
 * filter chain looks heavier than the motion it produces.
 */
export function photoFilter(opts: {
  motion: Motion;
  zoom: [number, number];
  seconds: number;
  size: Size;
  anchor: "center" | "top" | "bottom";
  ease: "linear" | "ease_in_out" | "ease_out";
}): string {
  const { motion, seconds, size, anchor } = opts;
  const frames = Math.max(1, Math.round(seconds * FPS));
  const [z0, z1] = opts.zoom;

  // Progress 0..1 across the shot, eased.
  const t = `(on/${frames})`;
  const p =
    opts.ease === "linear"
      ? t
      : opts.ease === "ease_out"
        ? `(1-pow(1-${t},3))`
        : `(if(lt(${t},0.5),4*pow(${t},3),1-pow(-2*${t}+2,3)/2))`;

  // Effective zoom for this frame.
  let zoomExpr: string;
  switch (motion) {
    case "push_in":
    case "tilt_up":
    case "tilt_down":
    case "drift_left":
    case "drift_right":
    case "hold":
      zoomExpr = `(${z0}+(${z1}-${z0})*${p})`;
      break;
    case "push_out":
      zoomExpr = `(${z0}+(${z1}-${z0})*${p})`;
      break;
  }

  // Pan. iw/ih here are the oversampled input dimensions.
  const cx = `(iw/2-(iw/zoom/2))`;
  const cy = `(ih/2-(ih/zoom/2))`;
  const anchorY = anchor === "top" ? `0` : anchor === "bottom" ? `(ih-ih/zoom)` : cy;

  let x = cx;
  let y = anchorY;
  const drift = 0.06; // 6% of frame travel
  switch (motion) {
    case "drift_left":
      x = `(${cx}+(iw/zoom)*${drift}*(0.5-${p}))`;
      break;
    case "drift_right":
      x = `(${cx}-(iw/zoom)*${drift}*(0.5-${p}))`;
      break;
    case "tilt_up":
      y = `((ih-ih/zoom)*(1-${p}))`;
      break;
    case "tilt_down":
      y = `((ih-ih/zoom)*${p})`;
      break;
    default:
      break;
  }

  const os = 2; // oversample factor: enough to kill zoompan jitter without quadrupling work
  return [
    `scale=${size.w * os}:${size.h * os}:force_original_aspect_ratio=increase`,
    `crop=${size.w * os}:${size.h * os}`,
    `zoompan=z='${zoomExpr}':x='${x}':y='${y}':d=${frames}:s=${size.w}x${size.h}:fps=${FPS}`,
    `format=yuv420p`,
  ].join(",");
}

export function shotMotion(shot: Shot): Motion {
  return ("motion" in shot ? shot.motion : "hold") as Motion;
}
