# Redesign backlog — what the dev team builds

Consolidated from two independent deep dives after the client rejected the current
design: `pm-backlog.md` (25 tasks) and `ux-tasks.md` (20 tasks). They were briefed
separately and **converged on the same root cause**, which is the main reason to
trust it.

---

## The root cause, in one line

**A video product that shows no video, painted in the colours of a condolence notice.**

Two halves, both verified against the running app:

1. **Nothing moves and nothing is shown.** The home page returns `video: 0, img: []`.
   The four template cards are CSS gradients. The brief is a 2,931 px scroll of empty
   fields. The first moving picture a family ever sees arrives *after* Google sign-in,
   eight curated photos and a 4–8 minute wait. A buyer trained by Reels and Status
   judges in about 1.5 seconds, and we give them a paragraph.

2. **The palette is semantically wrong.** Cream serif centred on `#140507` is the
   grammar of a condolence notice. A namakarana is turmeric, jasmine, brass and silk.
   This is not a taste argument: it is wrong in the *artefact the family forwards*, not
   just in the chrome, and near-black crushes and bands on the mid-range Android LCDs
   that are most of this traffic.

The tell: the only screen that genuinely looks right is `/admin/costs`, because a dark
achromatic glass dashboard *is* correct — for a dashboard. The design system is
competent. It was pointed at a baby's naming ceremony.

**Measured, not asserted:** the poster frame is grabbed at a hardcoded `-ss 1.2`
(`pipeline.ts:128`), which lands 1.2 s into a shot the storyboard defines as *"Black.
Single struck bell."* Sampling the whole trailer, mean luma at 1.2 s is **14/255** —
the third-darkest moment in the film — while the family's own photos reach **82–104**.
That one line is the `og:image` on every WhatsApp forward, the `/mine` thumbnail, and
the still behind every play button.

---

## Tier 1 — five changes that each move the needle alone

| # | Task | Size | Files |
|---|---|---|---|
| **1** | **Real sample trailer on every template card, and a hero that plays on `/`** | L | `src/app/page.tsx`, new `SampleTile`, `public/samples/*` |
| **2** | **Repaint light — paper and turmeric, not near-black** | L | `src/app/globals.css`, `src/lib/theme.ts`, all pages |
| **3** | **Live storyboard preview while they fill the form** | L | `src/components/BriefForm.tsx`, extract from `src/lib/render/cards.ts` |
| **4** | **Poster frame: pick the brightest candidate, not `t=1.2 s`** | S | `src/lib/render/pipeline.ts` |
| **5** | **Frame the video, autoplay it, and lead with the child's name** | M | `src/components/JobView.tsx` |

### 1 — Samples everywhere
Four samples are already rendered to `public/samples/<templateId>.{mp4,jpg}` by
`scripts/render-samples.ts`. Wire them up: 9:16 tiles, `poster` set, `autoPlay muted
loop playsInline preload="metadata"`, one playing at a time via `IntersectionObserver`,
paused under `prefers-reduced-motion`. Delete the gradient swatches. Add "watch the
full 32 seconds" before a family commits to a template.
**Caveat that must not be skipped:** the current samples render from the synthetic
gradients in `fixtures/photos`. They prove the mechanism, not the product. Real samples
need licensed or consented photography — track it as a launch blocker.

### 2 — Repaint light
`--paper #FFFBF4`, `--paper-2 #FFF6E9`, `--paper-3 #F7EDDC` (wells), `--ink-1 #1C1512`
(15.9:1), `--ink-2 #57493F`, `--ink-3 #7D6D60` (4.6:1), `--hairline #E8DCC9`,
`--gold-ink #8A6A12` for gold *as text*, CTA `#D4A017` fill with `#241A05` label
(8.8:1). Per-template text accents: namakarana `#9E1B32`, coastal `#1F3A5F`, birthday
`#C2410C`, griha `#1E5E45`; existing accents stay as fills. Cards become opaque with
`0 8px 24px -14px rgb(28 21 18 / .18)`.
Dark survives in exactly two places and is better for being rare: the `#141014` video
bezel, and the render-in-progress card.
**What this deletes:** `.scene`, every `backdrop-filter`, the whole `data-glass` gate,
and §0–§3 of `design-spec.md`. **§4 (typography, every Indic rule) and §5 (motion)
survive intact and must not be lost in the move.** `tests/` contrast expectations and
`scripts/check-languages.ts` need retargeting to the light composite.

### 3 — Live storyboard preview
Extract the style logic out of `cardHtml` in `cards.ts` so the browser can render the
real name-reveal card at `scale(size/1080)`. As the family types, the title card
updates and re-runs its 520 ms overshoot; as each photo lands, it snaps into its real
crop and motion. Sticky on phone, right column on desktop. This delivers the emotional
payoff *before* we spend ₹51, and turns a toll gate into a toy.

### 4 — Poster frame
Do **not** hardcode a per-template timestamp. Sample ~12 candidate frames across the
master, measure mean luma, and take the brightest that is not in the first 2 s — that
is robust across all four templates and every family's photos, which a fixed timestamp
is not. Apply to `keys.poster` output and therefore to `og:image` and `/mine`.

### 5 — The delivery moment
Bezel: `#141014`, 8 px padding, 26 px radius, inset hairline. `autoPlay muted loop
playsInline` with a tap-to-unmute pill. Headline becomes the child's or couple's name,
not "Your trailer is ready". Share row sits *above* the paywall, not below it.

---

## Tier 2 — makes it feel finished

| # | Task | Size |
|---|---|---|
| 6 | The wait becomes a show: their own photos cross-fading under real push-ins, real stage names, instead of a 2 px bar | M |
| 7 | No template opens on black — reverse the opening title cards onto the photo or a lit ground | M |
| 8 | Pick all eight photos at once, then assign; make each one *land* with motion | M |
| 9 | Paying feels like something happened — confirmation moment, not a page reload | M |
| 10 | Music choice, audible before the render | M |
| 11 | `/mine` with real poster thumbnails and a proper empty state | S |
| 12 | Show the difference at the paywall (watermarked vs clean, side by side) | S |
| 13 | Merchant identity + trust strip at the pay button | S |
| 14 | Proof block on the home page — count, names, a real testimonial once there is one | M |
| 15 | Split the brief into three steps with real transitions | M |

## Tier 3 — depth and range

| # | Task | Size |
|---|---|---|
| 16 | Kannada display faces, one per template — not one Noto for everything | M |
| 17 | Auspicious openers and a panchanga line per occasion | M |
| 18 | Look variants per template (2–3 palettes each) | M |
| 19 | Four required photos, four optional — lower the entry cost | M |
| 20 | Language auto-detect by region; demote the four-way picker out of the hero | S |
| 21 | Second trailer for the same family; countdown to the function | M |
| 22 | Watermark redesign + branded end card | S |
| 23 | Rewrite failure and refusal copy — never mention our cost ceiling to a customer | S |
| 24 | Photo-quality feedback that helps instead of scolding | S |
| 25 | Real skeletons, submit-button state machine, focus/press behaviour on light | S |
| 26 | Sample-trailer WhatsApp share as an acquisition loop | S |
| 27 | Gift a trailer; named-guest variants (v2 revenue) | L |

---

## Strategy notes the team disagreed with

- **"Nobody buys unseen" is false as built.** Families buy the *download* seen but choose
  the *template* blind. The free full render is an expensive apology for having no
  samples. Four commissioned samples cost less than a month of unconverted previews —
  and would let a ₹99 paid-preview tier be tested honestly.
- **Cost discipline has colonised the copy.** `job.refusedBody` explains our internal
  spend ceiling to a family at their baby's naming. The ceiling is right; exposing it
  is not.
- **Four languages before any value** is a quiz where the hero should be.

---

## Sequencing

Task 2 (repaint) touches nearly every file, so it goes first or everything after it is
rework. Task 4 is independent (`pipeline.ts` only) and can land immediately. Tasks 1, 3
and 5 all depend on the repaint landing. Tier 2 follows.
