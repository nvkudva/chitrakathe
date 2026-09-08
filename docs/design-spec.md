# Chitrakathe — Design Spec

Version 1.1 · target: Next.js 16 / React 19 / Tailwind v4 (`@theme`).
Sections 0–3 are retired; see the note below. Sections 4 onward are current.

**Priority order when two rules conflict:**
1. Kannada / Devanagari renders correctly on a 393 px phone.
2. Text passes WCAG AA against the *lightest possible* composite of the material it sits on.
3. Tap targets ≥ 44 px.
4. The page reads as invitation card stock, not as a dashboard.
5. Desktop polish.

Anything below that jeopardises 1–3 is a bug, not a taste question.

---

## 0–3. RETIRED — the glass system, the scene, the light source and the dark palette

**Superseded by the T2 repaint (`docs/review/ux-tasks.md` §2, `docs/review/dev-backlog.md`).**
The client rejected the near-black look; two independent reviews converged on the same
reason, and the app is now paper and turmeric. `src/app/globals.css` is the authority.

What went, and why it is not coming back:

- **The scene layer.** Glass is a *sampling* material and there was never any content behind
  it to sample — the spec had to forbid colour on surfaces, clamp the scene to 14% tint and
  clamp every accent toward grey, which locked the product out of ever showing its own video.
- **Every `backdrop-filter`, the four `--mat-*-backdrop` tokens, the tier flat-fallback
  blocks, the `prefers-reduced-transparency` path and the inline `data-glass` device gate.**
  Opaque paper is cheaper than four stacked blurs on exactly the mid-range Android hardware
  the gate was written to protect, so the gate has nothing left to protect.
- **The near-black palette.** Cream serif centred on `#140507` is the visual grammar of a
  condolence notice. That is wrong in the artefact a family forwards, not merely in the
  chrome, and near-black crushes and bands on mid-range Android LCDs.

The palette now (all measured on the real composited ground, `tests/contrast.test.ts`):

| token | hex | use | CR |
|---|---|---|---|
| `--color-paper` | `#FFFBF4` | page ground | — |
| `--color-paper-2` | `#FFF6E9` | raised card (`.tier-2`, `.tier-3`) | — |
| `--color-paper-3` | `#F7EDDC` | recessed well (`.tier-0`) | — |
| `--ink-1` | `#1C1512` | headings, body | 17.5:1 on paper |
| `--ink-2` | `#57493F` | secondary | 8.4:1 |
| `--ink-3` | `#7D6D60` | tertiary (`#786858` inside a well) | 4.8:1 / 4.6:1 |
| `--color-hairline` | `#E8DCC9` | separators | non-text |
| `--color-gold-ink` | `#8A6A12` | gold *as text* | 4.9:1 |
| `--color-cta` / `--color-on-cta` | `#D4A017` / `#241A05` | primary button | 7.2:1 label on fill |
| `palette.accentOnPaper` | per template | accent *as text* | 4.8–10.7:1 |

There is no fourth ink step: on paper anything lighter than `--ink-3` drops under 4.5:1, so
`--ink-4` is an alias, not a tone. `palette.accent` survives untouched as a **fill** — it is
the colour used inside the film, where it sits on the template's own dark grounds.

Dark survives in exactly three places, and is better for being rare: the `.screen` video
bezel (`#141014`), the `.render-stage` in-progress card, and `/admin/costs`, which opts in
with `.admin-dark` because a dark achromatic dashboard is right for a dashboard.

**§4 (typography, and every Indic rule in it) and §5 (motion) below are unchanged and remain
in force.** They were never part of the glass system and they are the reason Kannada renders
correctly; nothing in the repaint touched a `--track-*` token, a `min-height`, the 16px input
floor, the Latin-only `.t-overline`, or `prefers-reduced-motion`.

---

## 4. Typography

### 4.1 Stacks

Latin faces come first, Indic faces after. Font fallback is **per glyph**, so a Latin-first
stack still renders Kannada from the Kannada face — while numerals, `₹`, dates and the Latin
brand line get SF / Roboto rather than Noto's Latin, which is what we want.

```css
@theme {
  --font-ui:
    -apple-system, "SF Pro Text", ui-sans-serif, "Segoe UI Variable Text", "Segoe UI",
    Roboto, "Helvetica Neue", Arial,
    "Noto Sans Kannada", "Kannada Sangam MN", "Noto Serif Kannada",     /* iOS ships Kannada Sangam MN */
    "Noto Sans Devanagari", "Kohinoor Devanagari", "Nirmala UI",        /* iOS / Windows */
    "Noto Sans", sans-serif;

  --font-display:
    ui-serif, "New York", "Iowan Old Style", "Palatino Linotype",
    "Noto Serif Kannada", "Noto Serif Devanagari", "Noto Serif", Georgia, serif;

  --font-mono: ui-monospace, "SF Mono", "Roboto Mono", "DejaVu Sans Mono", monospace;
}
```

**Do not load a webfont for Indic.** `Noto Sans Kannada` variable is ~260 KB and
`Noto Sans Devanagari` ~180 KB; on the connections this product runs on that is a 2–4 s FOIT
on the one screen where the user is typing their child's name. Android ships Noto Sans
Kannada/Devanagari; iOS ships Kannada Sangam MN and Kohinoor Devanagari. Use them.
Optional-and-only-if-measured: a **Latin-subset** display serif (`unicode-range: U+0000-00FF`,
`font-display: swap`, ≤ 22 KB woff2) for the wordmark only.

**Metric trap.** The line-box strut is computed from the *first available* font in the stack —
SF or Roboto, whose ascent+descent is far shorter than Noto Sans Kannada's. Consequence:
`line-height: normal` and any tight numeric line-height will clip Kannada ascenders (`ೖ`, `ೀ`)
and Devanagari `ि ी ै ौ`. Every line-height below is unitless and explicit for this reason.
**Never use `line-height: normal`, `leading-none`, `leading-tight`, or a `px` line-height.**

### 4.2 Scale

`--tracking` is a *variable*, never a literal, so §4.3 can zero it in one place. This mirrors
the `track()` gate already in `src/lib/render/cards.ts`.

| token | size | weight (Latin) | weight (Indic) | line-height Latin | line-height Indic | tracking Latin | tracking Indic |
|---|---|---|---|---|---|---|---|
| `--text-display` | 34px | 700 | 700 | 1.14 | **1.34** | −0.021em | **0** |
| `--text-title-1` | 28px | 700 | 700 | 1.18 | **1.36** | −0.018em | **0** |
| `--text-title-2` | 22px | 600 | 600 | 1.24 | **1.40** | −0.012em | **0** |
| `--text-title-3` | 19px | 600 | 600 | 1.30 | **1.45** | −0.006em | **0** |
| `--text-body-lg` | 17px | 400 | 400 | 1.50 | **1.66** | 0 | 0 |
| `--text-body` | **16px** | 400 | 400 | 1.52 | **1.68** | 0 | 0 |
| `--text-callout` | 15px | 500 | 500 | 1.47 | **1.64** | 0 | 0 |
| `--text-subhead` | 14px | 500 | 500 | 1.45 | **1.62** | 0 | 0 |
| `--text-footnote` | 13px | 400 | 400 | 1.46 | **1.66** | 0 | 0 |
| `--text-caption` | 12px | 500 | 500 | 1.42 | **1.62** | 0 | 0 |
| `--text-overline` | 11px | 600 | — | 1.36 | — | **0.14em** | — |
| `--text-overline` (Indic) | **13px** | — | 600 | — | **1.55** | — | **0** |

`--text-body` is **16px and must never go below 16px on any `<input>`, `<textarea>` or
`<select>`** — iOS Safari auto-zooms the viewport on focus below 16px, which on a 6-field form
is the single most destructive mobile bug available.

Display / title-1 clamp for larger phones and desktop:
`font-size: clamp(28px, 6.2vw, 40px)` for `--text-display`; the line-heights above are unitless
so they follow automatically.

### 4.3 Indic rules — non-negotiable

These are correctness, not polish. The render pipeline already enforces them
(`src/lib/render/cards.ts`, `CLAUDE.md` "Never letter-space Indic"); the UI currently does not.

**R1 — Tracking is zero for every non-Latin script.**
```css
:root { --tracking: 0em; }
:lang(kn), :lang(hi), :lang(kok) { --tracking: 0em !important; }
/* every type token uses letter-spacing: var(--tracking); nothing sets it literally */
```
`letter-spacing` inserts space between *glyphs*, and a Kannada conjunct like `ನಾಮಕರಣ` or a
Devanagari one like `स्त्री` is several glyphs. Tracking it renders `ನಾ ಮ ಕ ರ ಣ` — visibly
broken to a native reader. **Ban the Tailwind `tracking-*` utilities in the codebase**
(ESLint `no-restricted-syntax` on `className` string literals matching `/\btracking-/`).
The one exception is `--text-overline` on `:lang(en)`.

**R2 — Line-height is looser and unitless.** Indic values in §4.2 are ~1.10× the Latin value
for headings and ~1.10× for body. Kannada's ascender stack (`ೖ`) plus a descender (`ೃ`) needs
~1.6 at body size before consecutive lines collide; Devanagari's shirorekha plus `ौ` needs the
same. Set via:
```css
:lang(kn), :lang(hi), :lang(kok) { --lh-scale: 1.10; }
:root { --lh-scale: 1; }
.t-body { line-height: calc(1.52 * var(--lh-scale)); }
```

**R3 — No fixed heights on anything that holds text.** `height`, `h-10`, `max-height` and
`line-clamp` on a text container are all forbidden. Use `min-height` + symmetric padding and
let the box grow. Buttons: `min-height: 48px; padding-block: 12px;` — an English button is
48 px, the same button in Kannada is 52 px, and that is correct.

**R4 — Never disable ligatures or contextual shaping.** `font-variant-ligatures: none`,
`font-feature-settings: "liga" 0` and `text-rendering: optimizeSpeed` all break Indic
conjunct formation (`ccmp`, `akhn`, `rphf`, `blwf`, `pstf`, `haln`). If any is present, remove
it. `text-rendering: optimizeLegibility` is also wrong (it is a no-op-to-harmful hint); leave
it unset.

**R5 — No leading-trim.** Do not use `text-box-trim` / `text-box-edge` / `leading-trim`. They
trim to the *first* font's cap and baseline metrics — SF's — and will slice the top off
Kannada vowel signs.

**R6 — No synthetic bold on Indic.** `font-synthesis-weight: none` under `:lang(kn), :lang(hi),
:lang(kok)`. Noto Sans Kannada ships 400/500/600/700; a synthesised 800 smears the conjuncts.
Restrict Indic weights to those four.

**R7 — Wrapping.** `overflow-wrap: break-word` on user-supplied names and venue strings only;
`hyphens: none` everywhere (there is no Kannada hyphenation dictionary and Chrome will
mis-hyphenate). `text-wrap: balance` on headings ≤ 4 lines, `text-wrap: pretty` on body.
Both are safe for Indic — they operate on line-break opportunities, not clusters.

**R8 — Case.** `text-transform: uppercase` is a no-op for Kannada/Devanagari but is applied
today together with `tracking-widest` — the tracking is the damage. Overline styling switches
to §4.2's Indic row: 13px, weight 600, tracking 0, no transform.

**R9 — `lang` must be on the element.** All of the above hangs off `:lang()`. Today
`layout.tsx` hard-codes `lang="en-IN"` even when `?lang=kn`. Set `<html lang={lang}>` with
`kn` / `hi` / `kok` / `en-IN`, and put `lang="kn"` on any island that differs from the page
(e.g. the `ಚಿತ್ರಕಥೆ` wordmark inside an English page, and the `English` chip inside a Kannada
page — otherwise the Kannada page zeroes the tracking on `English`, which is harmless, but
the wordmark on the English page keeps `-0.02em`, which is not).

---

## 5. Motion

### 5.1 Curves

```css
@theme {
  /* Apple's sheet/navigation curve — decelerating, no overshoot */
  --ease-standard:  cubic-bezier(0.32, 0.72, 0, 1);
  --ease-out-soft:  cubic-bezier(0.22, 1.00, 0.36, 1);
  --ease-in-fast:   cubic-bezier(0.40, 0.00, 1.00, 1);
  /* Mirrors the title-card curve in src/lib/render/cards.ts so the UI and the
     rendered video share a motion signature. Do not diverge. */
  --ease-overshoot: cubic-bezier(0.22, 1.20, 0.36, 1);

  /* True springs, sampled. Use where a bezier reads as mechanical. */
  --spring-press: linear(0 0%, 0.1503 6%, 0.4333 13%, 0.696 19%, 0.8819 25%, 0.9881 31%,
    1.0342 38%, 1.044 44%, 1.0364 50%, 1.0239 56%, 1.0125 63%, 1.0047 69%, 1.0003 75%,
    0.9984 81%, 0.9981 88%, 0.9984 94%, 0.999 100%);           /* m1 k340 c26, settles 556ms */
  --spring-sheet: linear(0 0%, 0.087 6%, 0.2683 11%, 0.4653 17%, 0.6393 22%, 0.7756 28%,
    0.8735 33%, 0.9385 39%, 0.9781 44%, 0.9999 50%, 1.01 56%, 1.0131 61%, 1.0126 67%,
    1.0104 72%, 1.0077 78%, 1.0053 83%, 1.0034 89%, 1.002 94%, 1.001 100%);  /* m1 k220 c24 */
  --spring-card: linear(0 0%, 0.0958 6%, 0.2958 13%, 0.5113 19%, 0.6976 25%, 0.838 31%,
    0.9326 38%, 0.9893 44%, 1.0181 50%, 1.0288 56%, 1.029 63%, 1.0241 69%, 1.0177 75%,
    1.0116 81%, 1.0067 88%, 1.0032 94%, 1.001 100%);           /* m1 k180 c20 */

  --dur-fast: 120ms; --dur-quick: 200ms; --dur-base: 280ms;
  --dur-slow: 420ms; --dur-page: 320ms;
}
```
`linear()` needs a fallback for older WebViews: always write
`transition-timing-function: var(--ease-out-soft); transition-timing-function: var(--spring-press);`
— the second declaration is dropped by engines that can't parse it.

### 5.2 The table

| what | property | duration | easing | notes |
|---|---|---|---|---|
| **Page transition** (in) | `opacity` 0→1, `translateY` 8px→0 | 320ms | `--ease-standard` | View Transitions API where supported; `::view-transition-old(root)` fades out over 180ms `--ease-in-fast` with no transform |
| Page transition (out) | `opacity` 1→0 | 180ms | `--ease-in-fast` | never move the outgoing page — it reads as jank on a slow paint |
| **Card press** (down) | `scale` 1→0.972, `filter: brightness(1.06)` | 120ms | `--ease-out-soft` | `transform-origin: center` |
| Card press (release) | `scale` →1 | 460ms | `--spring-card` | overshoot to 1.029; this is the "liquid" cue |
| Card hover (pointer only) | `translateY` 0→−2px, rim top-stop 0.38→0.50 | 200ms | `--ease-out-soft` | `@media (hover: hover)` only |
| **Button press** (down) | `scale` 1→0.96 | 100ms | `--ease-out-soft` | plus the specular sweep below |
| Button press (release) | `scale` →1 | 380ms | `--spring-press` | |
| Button specular sweep | `::after` `background-position` −120%→220% | 520ms | `--ease-standard` | fires once per press on primary buttons only; `opacity 0.16` |
| **Sheet / modal present** | `translateY` 100%→0 | 480ms | `--spring-sheet` | scrim `opacity` 0→1 over 280ms `--ease-standard` |
| Sheet dismiss | `translateY` 0→100% | 280ms | `--ease-in-fast` | scrim fades over the same 280ms |
| Popover present | `scale` 0.94→1 + `opacity` | 240ms | `--ease-overshoot` | `transform-origin` at the trigger |
| **Progress update** | `width` (or `transform: scaleX`) | 600ms | `--ease-standard` | use `scaleX` with `transform-origin: left`, not `width` — `width` on a 2px bar relayouts every 2.5s poll |
| Progress indeterminate | `translateX` shimmer, 1600ms | `linear` | | only while `stage === null` |
| Progress stage label swap | crossfade 180ms | `--ease-standard` | old label out 90ms, new in 90ms, no vertical movement |
| **Language switch** — thumb | `translateX` + `width` | 340ms | `--spring-press` | the thumb resizes because the Kannada/Konkani/Hindi/English labels have different widths; animate `width` too |
| Language switch — labels | `color` + `opacity` | 200ms | `--ease-standard` | |
| Language switch — page copy | crossfade `opacity` 1→0→1 | 120 + 220ms | `--ease-standard` | **never slide or reflow-animate translated copy** — Kannada line counts differ from English and a height animation on a reflowing block stutters |
| Upload thumbnail enter | `scale` 0.88→1, `opacity` | 300ms | `--spring-card` | stagger 40ms, capped at 6 items |
| Toast / error enter | `translateY` −12px→0 + opacity | 280ms | `--spring-sheet` | |
| Focus ring appear | `box-shadow` spread 0→4px | 120ms | `--ease-out-soft` | |

### 5.3 `prefers-reduced-motion: reduce`

Not "no animation" — *no motion*. Opacity is still allowed and still communicates state.

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 1ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 150ms !important;
    scroll-behavior: auto !important;
  }
  /* kill transforms specifically; keep opacity */
  .press, .card, .btn, .sheet, .toast { transform: none !important; }
  .sheet { transition-property: opacity !important; }          /* appear, don't slide */
  .progress-shimmer { display: none; }
  .btn-sweep { display: none; }
}
```
Two carve-outs, because removing them removes information:
- The **progress bar still animates its width** (150ms) — that is the only signal a 4–8 minute
  render is alive.
- The **spinner is replaced by a text percentage**, not removed.

Also honour `prefers-reduced-transparency` (§1.5) and `(update: slow)` — on `(update: slow)`
drop every spring to `--ease-standard` and halve durations; springs at 30 Hz look like a stutter.

---

## 6. Components

Radii use a continuous-corner scale. Where the engine supports CSS corner shaping we use a real
superellipse; otherwise a plain circular radius at the same nominal value.

```css
@theme {
  --r-xs: 8px; --r-sm: 12px; --r-md: 16px; --r-lg: 20px;
  --r-xl: 26px; --r-2xl: 32px; --r-full: 999px;
}
@supports (corner-shape: squircle) {
  .r-xs,.r-sm,.r-md,.r-lg,.r-xl,.r-2xl { corner-shape: squircle; }
  /* a superellipse reads ~15% less round at the same nominal radius */
  :root { --r-xs: 9px; --r-sm: 14px; --r-md: 19px; --r-lg: 23px; --r-xl: 30px; --r-2xl: 37px; }
}
```
**Concentricity rule:** a nested radius = outer radius − the padding between them.
A `--r-xl` (26px) card with 16px padding holds a `--r-sm` (12px, ≈26−16=10→12) inner element.

Focus, everywhere, identically:
```css
:where(a,button,input,textarea,select,[tabindex]):focus-visible {
  outline: none;
  box-shadow: 0 0 0 2px var(--color-scene-base), 0 0 0 4px var(--color-focus);
  /* the inner ring punches a hole so the outer ring reads on any material */
}
```
`--color-focus` `#8FD3FF` is 6.16:1 on the lightest tier and 9.04:1 on the scene — it is the one
token that is deliberately *not* template-tinted, because a focus ring that changes hue per
template is a focus ring users stop recognising.

---

### 6.1 Nav bar — **Tier 1**
- Height `56px` + `env(safe-area-inset-top)`; `position: sticky; top: 0; z-index: 50`.
- `padding-inline: max(20px, env(safe-area-inset-left/right))`.
- Radius: 0 (edge-to-edge). Bottom hairline `--color-hairline`, no top rim.
- Wordmark `ಚಿತ್ರಕಥೆ`: `--text-title-3` (19/600), `lang="kn"`, **`letter-spacing: 0`**, colour
  `--color-accent-text`. The Latin sub-word `chitrakathe`: `--text-caption` (12/500),
  `lang="en"`, `letter-spacing: 0.06em`, `--color-ink-tertiary`.
- Wordmark tap target: `min-height: 44px`, vertically centred, `display: inline-flex`.
- Scroll response: at `scrollY > 8`, `--mat-1` fill white-stop goes 0.11→0.14 and the bottom
  hairline goes `--color-hairline`→`--color-hairline-strong`, over 200ms `--ease-standard`.
  Drive from a single `IntersectionObserver` sentinel, not a scroll listener.
- Right slot: language switch (§6.6) on `/`, nothing elsewhere.
- States: no hover on the bar itself. Wordmark press = `opacity 0.7`, 100ms.

### 6.2 Template card — **Tier 2**
- Full-bleed-within-gutter on phone (`width: 100%`), `--r-xl` (26px), `padding: 14px 14px 16px`.
- Poster: `aspect-ratio: 16/10`, `--r-md` (16px = 26−14 → use 12px; spec value **12px**),
  `overflow: hidden`, the template's own `radial-gradient(120% 80% at 30% 20%, muted, bg)` as
  today, **plus** a `linear-gradient(180deg, transparent 55%, rgba(0,0,0,.35))` scrim so the
  title below never sits against the bright end. Poster carries an inner hairline
  `inset 0 0 0 1px rgba(255,255,255,0.07)`.
- Title `--text-title-2` (22/600), `--color-ink` — **not** `tpl.palette.ink` inline (see §8).
- Blurb `--text-callout` (15/500), `--color-ink-secondary`, `text-wrap: pretty`, no clamp.
- Meta strip: `--text-callout` **15px/500** (was 12px), `--color-ink-tertiary`,
  `letter-spacing: var(--tracking)`, separators as `·` with `margin-inline: 6px`.
  Region name is a proper noun — never uppercase it.
- CTA row: `--text-body` (16/600) `--color-accent-text` + `→`. Whole card is the link; the CTA
  is a visual affordance, so it must not be a nested `<a>`.
- Gap between cards: 14px phone, 20px ≥ 600px.
- States:
  - rest: as above.
  - hover (`hover: hover` only): `translateY(-2px)`, rim top-stop 0.38→0.50, shadow y 8→12px.
  - press: `scale(0.972)` 120ms in, `--spring-card` 460ms out; `brightness(1.06)`.
  - focus-visible: the standard ring.
  - disabled: n/a.
- On `data-glass="off"` or `< 480px`: `--mat-2-fill-flat`, no `backdrop-filter`.

### 6.3 Primary button — **Tier 2 fill on accent, not glass**
The primary CTA is the one surface that is *opaque*. A translucent primary button on an unknown
backdrop cannot guarantee contrast, and this button is the whole business.

- `min-height: 52px` (not `height`), `padding: 14px 24px`, `--r-lg` (20px), `width: 100%` on phone.
- Background: `linear-gradient(180deg, color-mix(in oklab, var(--color-accent) 100%, white 10%) 0%, var(--color-accent) 58%, color-mix(in oklab, var(--color-accent) 100%, black 8%) 100%)`.
- Text: `--text-body-lg` (17/600), `--color-on-accent`, `letter-spacing: var(--tracking)`.
- Rim: `inset 0 1px 0 rgba(255,255,255,0.34)`, `inset 0 -1px 0 rgba(0,0,0,0.22)`.
- Shadow: `0 6px 16px -6px color-mix(in oklab, var(--color-accent) 45%, transparent), 0 1px 2px rgba(0,0,0,0.45)`.
- Specular sweep `::after`: `linear-gradient(105deg, transparent 38%, rgba(255,255,255,0.30) 50%, transparent 62%)`, `background-size: 250% 100%`, animated on press (§5.2).
- States: rest / hover `brightness(1.06)` 200ms / press `scale(0.96)` + sweep /
  focus-visible ring / **disabled**: `opacity: 0.45`, `filter: saturate(0.6)`, `cursor: not-allowed`,
  **and** the label changes to the busy string — never rely on opacity alone.
- Busy: label is the stage text, plus a 16px `--color-on-accent` spinner at 60 % opacity,
  `aria-busy="true"`. Button width must not change; the container is `min-height` so a longer
  Kannada busy label wraps to two lines rather than being clipped.

### 6.4 Secondary button — **Tier 2**
- Same box metrics (`min-height: 52px`, `--r-lg`, `padding: 14px 24px`).
- `--mat-2` material, rim from §2, text `--text-body-lg` (17/600) `--color-ink`.
- Hover: fill white-stop 0.085→0.115. Press: `scale(0.96)` + `--spring-press`.
- Disabled: fill white-stop → 0.03, text `--color-ink-disabled`, rim → `--color-separator`.
- Destructive variant: text `--color-danger`, rim top-stop tinted
  `color-mix(in oklab, var(--color-danger) 45%, white)`.

### 6.5 Text field & textarea — **Tier 0**
- `min-height: 52px` for input, `min-height: 84px` for textarea (**never `rows` + fixed height**).
- `padding: 14px 14px`; `--r-md` (16px).
- `font-size: 16px` (`--text-body`) — **hard floor, iOS zoom**. `line-height: calc(1.52 * var(--lh-scale))`.
- Material `--mat-0-*`; border `--color-hairline` (0.13 = 3.0:1 vs scene, satisfies 1.4.11).
- Label above, `--text-subhead` (14/500) `--color-ink-secondary`, `margin-bottom: 8px`.
  The `(optional)` marker must come from the i18n bundle (`field.optional`), not be a hard-coded
  English string, and renders as `--color-ink-tertiary`.
- Helper text below, `--text-callout` (15/500) `--color-ink-tertiary`, `margin-top: 8px`.
- States:
  - rest: as above.
  - hover: border → `rgba(255,255,255,0.18)`.
  - focus: border → `--color-accent`, plus the standard focus ring, plus the inner top shadow
    softens (`inset 0 1px 2px rgba(0,0,0,0.28)`) — the field "opens".
  - error: border → `--color-danger`, message below in `--text-callout` `--color-danger` with a
    12px leading `⚠` glyph; `aria-invalid`, `aria-describedby`.
  - disabled: fill `rgba(255,255,255,0.02)`, text `--color-ink-disabled`.
- Date field: keep `type="date"` (native pickers beat any custom one on Android), add
  `inputMode`, and put the expected order in helper text from the i18n bundle. Set
  `lang` on the input so the picker localises.
- Textarea: `resize: vertical`, `field-sizing: content` where supported with
  `max-height: 40vh`.
- Autofill: `-webkit-text-fill-color: var(--color-ink)` and
  `transition: background-color 100000s` to defeat Chrome's white autofill wash.

### 6.6 Segmented control (language switch) — **Tier 0 track, Tier 2 thumb**
This is the most-used control in the product and today it is 34 px tall.

- Track: `min-height: 48px`, `padding: 4px`, `--r-full`, `--mat-0` material,
  `display: inline-flex`, `gap: 2px`. On phone: `width: 100%`, segments `flex: 1 1 auto` —
  but **not** `flex: 1 1 0`, because `English` and `ಕನ್ನಡ` have very different intrinsic widths
  and equal-width segments would clip.
- Segments: `min-height: 40px`, `padding: 8px 14px`, `--r-full`, `--text-subhead` (14/500),
  `letter-spacing: var(--tracking)` (→ 0 for all three Indic labels), `white-space: nowrap`.
  Each segment carries its own `lang` attribute (`kn`, `kok`, `hi`, `en`).
- Selected thumb: a single absolutely-positioned `--mat-2` element with the §2 rim,
  `--r-full`, animated `translateX` **and** `width` (§5.2). Selected label →
  `--color-ink` 600; unselected → `--color-ink-tertiary` 500.
- Overflow: if the four labels exceed the track width (they do at 320 px), the track becomes
  `overflow-x: auto; scroll-snap-type: x mandatory` with `scrollbar-width: none` and 20px
  edge fade masks. It does **not** wrap to two lines and does **not** shrink the font.
- Tap target: the whole 48px-tall segment, `touch-action: manipulation`.
- Semantics: `role="radiogroup"` / `role="radio"` `aria-checked`, or, since these are links
  that change the URL, `<nav>` + `aria-current="page"`. Prefer the link form — it survives
  a WhatsApp share, which is the whole reason the language is in the URL.

### 6.7 File upload dropzone — **Tier 0 well, Tier 2 thumbnails**
The native `<input type="file">` renders an unlocalisable "Choose Files / No file chosen" —
in the Kannada form it is the only English string on screen. Replace it.

- Hidden `<input type="file" class="sr-only">` + a `<label>` styled as the well.
- Well: `min-height: 148px`, `--r-xl` (26px), `--mat-0` material with a **2px dashed** border
  `rgba(255,255,255,0.16)`, `display: grid; place-items: center; gap: 10px; padding: 20px`.
- Contents: 28px upload glyph `--color-ink-tertiary`; primary line `--text-body` (16/500)
  `--color-ink` from `form.photos`; secondary line `--text-callout` (15/400)
  `--color-ink-tertiary` from `form.photosHint`; counter line
  `n / 6–10` in `--text-callout` `--color-accent-text` once files exist.
- States:
  - rest: as above.
  - hover: border → `rgba(255,255,255,0.24)`.
  - **dragover**: border → solid 2px `--color-accent`, fill white-stop 0.045→0.09,
    `scale(1.01)` 160ms `--ease-out-soft`.
  - press: `scale(0.99)`.
  - error (too few / too many / rejected type): border → `--color-danger`, message below.
  - disabled/busy: `pointer-events: none`, `opacity: 0.5`.
- Selected thumbnails: 3-up grid on phone (`gap: 8px`), `aspect-ratio: 1`, `--r-sm` (12px),
  `object-fit: cover`, Tier 2 rim, and a 28×28 remove button in the top-right corner with a
  **44×44 invisible hit area** (`::before { inset: -8px }`).
- Progress per file during upload: a 3px `--color-accent` bar pinned to the thumbnail's bottom
  edge, `scaleX`, `--ease-standard`.

### 6.8 Progress view — **Tier 2 card**
- Card `--r-xl` (26px), `padding: 24px 20px`, `max-width: 480px`.
- Title `--text-title-2` (22/600) from `job.rendering`.
- Track: `height: 8px` (was 2px — 8px is legible on a 400-nit phone in daylight),
  `--r-full`, `--mat-0` fill, `overflow: hidden`.
- Fill: `--color-accent`, `--r-full`, with `inset 0 1px 0 rgba(255,255,255,0.30)` and an outer
  `0 0 12px -2px color-mix(in oklab, var(--color-accent) 60%, transparent)`.
  Driven by `transform: scaleX(var(--p))`, `transform-origin: left`, 600ms `--ease-standard`.
- **Progress must be monotonic.** Clamp in the component: `p = Math.max(prev, next)`.
- Under the bar: stage label `--text-body` (16/500) `--color-ink-secondary`, and the percentage
  in `--font-mono` `--text-body` `--color-ink` right-aligned with
  `font-variant-numeric: tabular-nums` so the digits don't jitter.
- Below: `--text-callout` `--color-ink-tertiary` — "usually 4 to 8 minutes".
- Indeterminate (queued, `stage === null`): a 30 %-wide shimmer sliding L→R, 1600ms linear,
  and the label reads the queued string.
- **Poll failure state.** If two consecutive polls fail, the card shows a `--color-warning`
  hairline and a "still working, connection is slow" line, and keeps retrying with backoff.
  It must never freeze silently at a stale percentage.
- a11y: `role="progressbar"` `aria-valuenow/min/max`, `aria-live="polite"` on the stage label
  only (not the percentage — announcing 1 % increments is hostile).

### 6.9 Video player frame — **Tier 2**
- Wrapper `aspect-ratio: 9/16`, `width: min(100%, 340px)` on phone, `--r-2xl` (32px),
  `overflow: hidden`, Tier 2 rim, shadow `0 24px 48px -20px rgba(0,0,0,0.8)`.
- `<video playsinline muted={false} controls preload="metadata" poster={posterUrl}>`,
  `object-fit: cover`, `border-radius: inherit`, **`background: #000`** (a transparent video
  box shows the scene through letterboxing and looks broken).
- Ambient light: a blurred, scaled copy of the poster behind the frame —
  `filter: blur(48px) saturate(180%); transform: scale(1.25); opacity: 0.42;` — clipped by an
  overflow-hidden parent 24px larger than the frame. This is the one place the app is allowed
  to be colourful. Disabled on `data-glass="off"`.
- Aspect toggle (9:16 / 1:1) as a §6.6 segmented control above the frame.
- Watermarked state: a `--text-caption` chip, Tier 3, top-right inside the frame,
  `margin: 12px`, reading the watermark string.
- States: rest / focus ring on the wrapper / loading = poster + 8px shimmer / error = Tier 2
  card with the retry secondary button.

### 6.10 Price / paywall card — **Tier 3**
The only Tier 3 surface on a phone, and it earns it.

- `--r-2xl` (32px), `padding: 24px 20px 20px`, `max-width: 480px`,
  `margin-top: 24px`, `--mat-3` material with the 1.5px rim.
- Accent wash: `radial-gradient(120% 90% at 50% -20%, color-mix(in oklab, var(--color-accent) 14%, transparent), transparent 60%)` as an extra `::before` under the sheen.
- Structure, top to bottom:
  1. Eyebrow `--text-overline` (Latin) / 13px-600 (Indic), `--color-accent-text`.
  2. Price `--text-display` (34/700), `--font-mono` **numerals only** via
     `font-variant-numeric: tabular-nums`; `₹499` with `₹` at 0.72em and
     `vertical-align: 0.06em`. Not `--font-mono` for the whole string — `₹` is poor in mono.
  3. Body `--text-body` (16/400) `--color-ink-secondary`, from `preview.watermarked`.
  4. Primary button (§6.3), full width, from `pay.cta`.
  5. Payment methods line `--text-callout` `--color-ink-tertiary`, from `pay.upi`.
- States: rest / button states / paying (button busy) / paid → the card is **replaced**, not
  disabled, by the download list — a disabled paywall reads as a failure.
- Razorpay checkout `theme.color` must be `var(--color-accent)` resolved per template, not the
  hard-coded `#D4A017` it is today.

### 6.11 Stat tile (admin) — **Tier 2**
- `--r-lg` (20px), `padding: 16px`, `min-height: 108px`,
  `display: grid; grid-template-rows: auto 1fr auto; gap: 6px`.
- Label: `--text-overline` Latin (11/600/0.14em) — the admin surface is English-only, so
  tracking is legal here; `--color-ink-tertiary`.
- Value: `--text-title-1` (28/700), `font-variant-numeric: tabular-nums`, `--color-ink`.
- Sub: `--text-caption` (12/500) `--color-ink-tertiary` (5.2–5.8:1 — passes; the current
  `text-white/40` at 12px does not).
- Trend chip (optional): `--r-full`, `padding: 2px 8px`, `--text-caption`, tinted
  `--color-success` / `--color-danger` at 14 % fill.
- `highlight` variant (blended margin): rim top-stop swaps to
  `color-mix(in oklab, var(--color-accent) 60%, white)`, plus the accent wash from §6.10 at 8 %.
  **Do not** signal it with colour alone — also raise the value to `--text-display`.
- Grid: 2 columns at ≥ 360px, 3 at ≥ 720px, `gap: 12px`. Never 1 column — six single-column
  tiles is 900px of scroll for six numbers.
- The recent-jobs table on phone: below 720px it becomes a stack of Tier 2 rows
  (`--r-md`, `padding: 12px 14px`), label-value pairs, **not** a
  `min-w-[720px]` horizontal scroller. The status string must not be clipped.

---

## 7. Layout

### 7.1 Spacing scale (4px base)
```css
@theme {
  --s-0:0; --s-1:2px; --s-2:4px; --s-3:6px; --s-4:8px; --s-5:12px; --s-6:16px;
  --s-7:20px; --s-8:24px; --s-9:32px; --s-10:40px; --s-11:48px; --s-12:64px; --s-13:80px;
}
```
Vertical rhythm: 8px inside a control, 12px label→field, 20px between fields,
32px between form sections, 40px between page sections, 64px before the footer.

### 7.2 Grid
| breakpoint | columns | gutter | page margin | max content |
|---|---|---|---|---|
| 320–479 | 1 | 12px | `max(16px, safe-area)` | — |
| 480–599 | 1 | 14px | `max(20px, safe-area)` | — |
| 600–1023 | 2 | 20px | 24px | 720px |
| 1024–1439 | 12 | 24px | 32px | 1040px |
| ≥1440 | 12 | 24px | auto | 1120px |

Forms are capped at `--measure-form: 560px`; prose at `--measure-prose: 66ch` for Latin and
**`58ch` for Indic** (`:lang(kn), :lang(hi), :lang(kok)`) — Kannada's average glyph is wider,
so an equal `ch` count produces a physically longer, harder-to-track line.

### 7.3 Safe areas
`layout.tsx` currently emits no `viewport-fit`, so every `env(safe-area-inset-*)` resolves to
`0px` and none of this works. Add:

```tsx
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [{ media: "(prefers-color-scheme: dark)", color: "#0A090C" },
               { media: "(prefers-color-scheme: light)", color: "#0A090C" }],
};
```
Then:
- Nav: `padding-top: env(safe-area-inset-top)`.
- Page: `padding-inline: max(var(--gutter), env(safe-area-inset-left), env(safe-area-inset-right))`.
- Footer / sticky action bar: `padding-bottom: max(20px, env(safe-area-inset-bottom))`.
- Sticky bottom CTA (the create form's submit): `bottom: 0`, Tier 1 material,
  `padding-block: 12px`, `padding-bottom: calc(12px + env(safe-area-inset-bottom))`.
- Use `100dvh`, never `100vh` — Chrome Android's collapsing URL bar makes `vh` wrong by 56px.

### 7.4 Tap targets
- Absolute minimum **44 × 44 px** (Apple HIG). Chrome Lighthouse wants 48; we use **48 as the
  design default** and 44 only for inline text links inside a paragraph, where an
  `::before { inset: -10px }` expands the hit area instead.
- Minimum 8px between adjacent targets; 12px for the segmented control's neighbours.
- `touch-action: manipulation` on every button and link to remove the 300ms delay on older
  Android WebViews.
- No hover-only affordances anywhere. Every `:hover` rule sits inside `@media (hover: hover)`.

### 7.5 Z-index
`0` scene · `1` content · `10` sticky page furniture · `20` video ambient glow ·
`50` nav · `60` sticky action bar · `80` scrim · `90` sheet/modal · `100` toast.

---

## 8. What is broken today

Ordered by severity. File paths are repo-relative.

### Blocking — Indic correctness
1. **`src/app/layout.tsx:16`** — the wordmark `ಚಿತ್ರಕಥೆ` carries `tracking-widest`
   (`letter-spacing: 0.1em` → measured **1.8px**). This splits the conjunct `ತ್ರ` and is
   visible in the header on every page. It is the exact failure `CLAUDE.md` and
   `src/lib/render/cards.ts` guard against in the video pipeline, unguarded in the UI.
   → Remove the class; add `lang="kn"` on the Kannada span and `letter-spacing: 0`.
2. **`src/app/layout.tsx:14`** — `<html lang="en-IN">` is hard-coded even when the URL says
   `?lang=kn`. Nothing that keys off `:lang()` (tracking, line-height, hyphenation, the OS
   font picker, screen-reader voice) can work. → Thread `lang` through and set it.
3. **Tracking on Indic in three more places**: `src/app/page.tsx:41`
   (`text-xs uppercase tracking-widest` on the card meta strip, which renders Kannada region
   names), `src/app/create/[templateId]/page.tsx:33` (same), `src/app/admin/costs/page.tsx`
   section headings (English-only — legal, but should move to the `--tracking` token).
   → Route all of them through `letter-spacing: var(--tracking)`.
4. **Line-heights are Latin-tight on Indic.** Measured on `/create/namakarana-udupi?lang=kn`:
   `h1` is 30px with a **36px** line box (1.20). Kannada needs ≥ 1.36 at that size. The heading
   `ನಾಮಕರಣ — ಸಾಂಪ್ರದಾಯಿಕ ಉಡುಪಿ` wraps to two lines whose ascender/descender stacks nearly
   touch. → Apply the §4.2 Indic column.
5. **Inputs are 42px tall with a 24px line box** (`px-3 py-2` = 8px padding + 24px lh + 2px
   border). Kannada placeholders (`ವಾಟ್ಸಾಪ್ ಸಂಖ್ಯೆ`) have their below-base vowel signs clipped
   at the bottom edge. → `min-height: 52px`, `padding: 14px`, `line-height: calc(1.52 * var(--lh-scale))`.
   All in `src/components/BriefForm.tsx`.
6. **`src/components/BriefForm.tsx:118`** — `(optional)` is a hard-coded English string inside
   an otherwise fully-Kannada form. → Add `field.optional` to all four bundles in
   `src/lib/i18n/ui.ts`.
7. **`src/components/BriefForm.tsx:141`** — the native file input shows
   "Choose Files / No file chosen" in English on the Kannada page and cannot be localised.
   → Replace with the §6.7 dropzone.
8. **`src/components/JobView.tsx:19-25`** — `STAGE_COPY` is a hard-coded English map, even
   though `src/lib/i18n/ui.ts` already has `job.stage.*` in all four languages and they are
   unused. The one screen a family stares at for 8 minutes is English-only.
   → Use `t(lang, "job.stage." + stage)`; carry `lang` on the `/t/<id>` URL.

### Blocking — accessibility / touch
9. **Tap targets.** Language pills are **34px** tall (`px-4 py-1.5`) in both
   `src/components/LanguageBar.tsx:19` and `src/components/BriefForm.tsx:99` — 10px under the
   44px minimum, on the control every user touches first. Inputs are 42px. The submit button
   is 48px (the only one that passes). → §6.6, §6.5.
10. **`text-white/40` fails AA.** Measured **3.74:1** on `#120508`. It is used at 12px for the
    card meta strip (`src/app/page.tsx:41`), the retention footer
    (`src/app/layout.tsx:22`), the form hints (`BriefForm.tsx:145,157`), the stat-tile labels
    and subs (`admin/costs/page.tsx`), and the degraded-shot note (`JobView.tsx`).
    `text-white/30` on the `(optional)` marker is worse. → `--color-ink-tertiary` (0.62 →
    ≥ 4.72:1) at ≥ 15px, or `--color-ink-secondary` (0.74) at 12–14px.
11. **Control borders fail WCAG 1.4.11.** `border-white/10` measures **1.24:1** and
    `border-white/15` **1.47:1** against the page; both are below the 3:1 non-text minimum, so
    the input boundaries are not perceivable. → `--color-hairline` `rgba(255,255,255,0.13)`
    over the §0 scene = 3.0:1.
12. **No focus-visible styling anywhere.** Every control relies on the UA default outline,
    which on a near-black background is a thin dark ring. → §6 focus token.
13. **No `viewport-fit=cover`** (`src/app/layout.tsx` has no `viewport` export). Safe-area
    insets are all `0px`; content sits under the notch/home indicator on every modern phone.
    → §7.3.
14. **Progress has no ARIA.** `src/components/JobView.tsx:77` is a bare `div` with an animated
    width. → `role="progressbar"` + `aria-live` on the label only.

### Serious — behaviour visible as UI
15. **`src/components/JobView.tsx:37`** — `if (!res.ok) return;` **kills the polling loop
    permanently** on a single transient failure. On Indian mobile data this happens often; the
    user is left staring at a frozen "43 %" forever with no error. → Retry with backoff, and
    surface the "connection is slow" state from §6.8.
16. **Progress can move backwards.** Nothing clamps `job.progress` monotonic, and
    `Math.max(4, ...)` means a real 0 % and a real 4 % look identical. → §6.8.
17. **`src/components/JobView.tsx:110`** — Razorpay `theme.color` is hard-coded `#D4A017`
    (the namakarana accent) for all four templates. → Pass the template accent.
18. **The 2px progress bar** (`h-2` is 8px — acceptable; but the *fill* animates `width`,
    forcing layout every 2.5s poll). → `transform: scaleX`.

### Serious — visual system
19. **The scene is a flat fill**, so there is nothing for any material to sample. This is why
    the current cards read as flat rectangles rather than surfaces. → §0.
20. **`src/app/page.tsx:37`** — the card title is coloured with `tpl.palette.ink` inline. Four
    different near-whites in one grid reads as inconsistent rendering, not as branding, and it
    is unverifiable against contrast rules. → `--color-ink`; let the *poster* carry the
    template's colour.
21. **`src/app/globals.css`** declares `"Noto Sans"` and `"Noto Serif"` as the primary faces
    but **nothing loads them** — no `next/font`, no `@font-face`, no stylesheet link. On a
    typical Android phone the stack falls through to Roboto silently; on the CI render box it
    resolves to a real Noto and looks different. The declared design is not the shipped one.
    → §4.1 stacks (system-first, no webfont).
22. **No `sticky` navigation and no elevation change on scroll**; the header scrolls away, so
    on the long create form there is no way back without scrolling to the top. → §6.1.
23. **Admin table is a `min-w-[720px]` horizontal scroller on a 393px phone** —
    `src/app/admin/costs/page.tsx:78`. The status column is clipped mid-word
    (`refused_over_ceili`). → §6.11 stacked rows below 720px.
24. **Stat tiles collapse to one column on phone** (`sm:grid-cols-3` = 1 column below 640px),
    producing ~900px of scroll for six numbers. → 2 columns from 360px.
25. **`src/app/global-error.tsx`** is styled with hard-coded inline hexes and does not import
    `globals.css` (correct — it renders outside the layout) but consequently has no safe area,
    no 44px target on its button (`padding: 0.7rem 1.4rem` ≈ 42px tall), and hard-codes
    `#D4A017`. → Give it a self-contained copy of the tokens it needs and a 52px button.
26. **`src/app/privacy/page.tsx`** — the entire page is English-only with no `LanguageBar`,
    on a product whose privacy promise (photo retention, no likeness generation) is the thing
    families most need to read in their own language. → Localise, or at minimum surface the
    Kannada/Hindi summary paragraph.
27. **No `prefers-reduced-motion` handling** anywhere; the only transitions today are
    `transition` (Tailwind default 150ms) and `duration-700`, both unconditional. → §5.3.
28. **No empty / loading skeletons.** `JobView` renders a bare `Loading…` in
    `text-white/50`; the gallery has no state for an empty template list.
    → Tier 2 skeleton cards with the shimmer from §5.2.

---

## 9. Implementation order

1. §4.3 R1/R9 + defects 1–8 — Indic correctness. One afternoon, no visual redesign needed.
2. §3 tokens + defects 10, 11, 12 — contrast and focus. Mechanical.
3. §7.3 viewport/safe area + §7.4 tap targets — defects 9, 13.
4. §0 scene + §1 materials + §2 light — the visual redesign proper.
5. §6 components, in order: nav, segmented control, text field, primary button, template card,
   progress, dropzone, paywall, video frame, stat tile.
6. §5 motion.
7. `tests/contrast.test.ts` and the `tracking-*` lint rule, so none of the above regresses.
