# Chitrakathe — UX review and task list

Second design pass. The first pass ("Liquid Glass", `docs/design-spec.md`) was implemented
faithfully and is internally consistent. It is still the wrong direction for this product.
This document says why, then lists 20 concrete changes in order of how much each one changes
the felt quality. **★ marks the five that matter most.**

---

## 1. Root cause

**The product never shows the product, and the one place it does, it shows it on a funeral
card.** Every screen in the funnel is chrome around an absence: the gallery is four empty
colour swatches (`src/app/page.tsx`), the brief is twelve empty fields and eight numbered
empty boxes (`src/components/BriefForm.tsx`), the render screen is a 2px gold bar for four to
eight minutes, and the finished-trailer page opens on a `<video>` whose poster is grabbed at
`-ss 1.2` — 1.2s into a shot the storyboard defines as *"Black. Single struck bell."*
(`src/lib/render/pipeline.ts:128`). So at the emotional peak of a ₹499 purchase, a family sees
a black rectangle on a near-black page with a browser play triangle on it. Add the second
half: the rendered output itself (`docs/screenshots/trailer-name-reveal.jpg`) is cream serif
type, centred, on `#140507`. In every Indian household that is the visual grammar of a
condolence notice, not a namakarana. Kumkum red, turmeric, green and cream on paper are
auspicious; a black card with a name centred on it is what gets posted when someone dies. The
near-black palette is therefore **the actual cause** — not because dark is drab, but because
here it is *semantically wrong*, and it is wrong in the artefact the family pays for and
forwards, not merely in the chrome. Everything else is downstream of that one decision plus
its enabler: "Liquid Glass" was borrowed from an OS where the material floats over live
wallpaper, photos and moving content, and was applied here over a flat empty gradient with
nothing behind it to refract — so the spec had to *forbid* colour on surfaces (§3.3 "surfaces
are never tinted directly"), *clamp* the scene to 14% tint, and clamp every accent toward
grey. A material that needs content to sample was installed on a product that shows no
content, and the material's own constraints then locked the product out of ever showing any.
The "95% form" feel, the missing motion, the four dead swatches and the absent photography are
all symptoms of that lock-in, not independent faults. The tell: the only screen in the app
that genuinely looks good is `/admin/costs?token=devtoken` — because a dark, achromatic,
glass-tiered dashboard *is* the right design for a dashboard. The system is fine. It was
pointed at a baby's naming ceremony.

## 2. Is dark right at all?

No — not for the app, and not for the namakarana / griha-pravesha / save-the-date reveal
cards. Argued for this audience specifically:

- **Viewing condition.** Nearly all traffic is a phone, in India, often outdoors or in a room
  with a tube light. Near-black on a mid-range Android LCD (not OLED) does not go black, it
  goes *grey-purple with a backlight glow*, and the four scene gradients — which are the only
  colour in the whole design — band and crush into mud. The spec knows this: it ships a noise
  tile specifically to hide banding (`§0`). That is a workaround for a palette that does not
  survive the target hardware.
- **The delivery surface.** The trailer is watched in the WhatsApp media viewer and as a
  Status, at midday, at 60–70% screen brightness, on a phone held at arm's length. A near-black
  trailer at 540p preview bitrate is where the dark gradient turns to blocks.
- **Cultural read.** Covered above. Weddings and namakaranas are *bright* — kumkum, haldi,
  marigold, mango leaf, red-and-gold silk, cream card stock, gold foil. Black is for
  condolence. This is not a preference, it is the semantics of the colour in the room where
  the video gets shown.
- **What "cinematic" actually needs.** Cinematic ≠ dark UI. It needs a dark *frame around a
  lit image*. You get that better on paper: a cream page makes the 9:16 video read as a lit
  screen in a room. On a black page the video's letterbox melts into the chrome and the video
  stops being an object.

### The palette

Chrome, all four templates (light, warm, "invitation card stock" — not generic white):

| token | hex | use | CR on `--paper` |
|---|---|---|---|
| `--paper` | `#FFFBF4` | page ground | — |
| `--paper-2` | `#FFF6E9` | raised card | — |
| `--paper-3` | `#F7EDDC` | recessed well / input | — |
| `--ink-1` | `#1C1512` | headings, body | 15.9:1 |
| `--ink-2` | `#57493F` | secondary | 7.6:1 |
| `--ink-3` | `#7D6D60` | tertiary, ≥15px | 4.6:1 |
| `--hairline` | `#E8DCC9` | separators | 1.3:1 (non-text) |
| `--rule-gold` | `#C8A24A` | ornament rules only, ≥2px | non-text 2.1:1 → only as filled shape |
| `--gold-ink` | `#8A6A12` | gold *as text/icon* on paper | 5.2:1 |
| `--cta` | `#D4A017` fill / `#241A05` label | primary button (turmeric on cream) | 8.8:1 label on fill |

Per-template accent, darkened to be text-safe on paper (the existing `accent` stays as a
*fill* colour):

| template | `--accent` (text) | keeps as fill | CR |
|---|---|---|---|
| namakarana-udupi | `#9E1B32` kumkum | `#D4A017` | 7.9:1 |
| save-the-date-coastal | `#1F3A5F` indigo | `#C8A45C` | 10.1:1 |
| first-birthday-storybook | `#C2410C` | `#FF7A5C` | 5.0:1 |
| griha-pravesha-classic | `#1E5E45` | `#C9A227` | 6.6:1 |

Dark survives in exactly two places, and gets *better* for being rare: (a) the video frame
surround — a `#141014` inset bezel with an 18px inner shadow, so the trailer reads as a lit
screen; (b) the render-in-progress card, which is a small cinema. Rendered title cards for
namakarana / griha-pravesha move from black to `#7B1E28` (maroon) and `#1E4033` (green) grounds
with a cream/gold plate, i.e. the actual lagna-patrike colourway.

**What the product loses.** Three real things. (i) The gravitas of the current gallery — a
black page with gold type does look expensive, and cream has to earn that back with typography
and ornament rather than for free. (ii) The seamlessness where a black-bordered video melts
into a black page — but that seamlessness was the reason the video stopped reading as an
object, so this is a trade taken deliberately. (iii) The whole `docs/design-spec.md` glass
system, most of `globals.css` tiering, the `data-glass` device gate and `tests/contrast.test.ts`
snapshots. That is several days of good work being retired. It should be retired: light
translucency over a photo-rich cream page is cheaper on the exact Snapdragon-4 hardware the
gate was written to protect.

---

## Tasks

Ordered by how much each changes the felt quality.

---

### ★ T1 — Put a playing trailer on the gallery, above everything else · L
**Files:** `src/app/page.tsx`, `src/app/globals.css`, `public/samples/` (new), `docs/known-gaps.md`

Render one real 30s sample per template from a fictional family (the fixtures already exist:
`fixtures/brief.namakarana.json`, `npm run render:brief`). Ship each as **two** files:
`sample-<id>.mp4` (h264 baseline, 540×960, ~28s, CRF 26, no audio track, ≤1.6 MB) and
`sample-<id>.jpg` (the **name-reveal frame**, 540×960, q3).

Gallery layout becomes:
- Hero: one 9:16 video, `max-width: 300px` on phone / `340px` on desktop, `autoPlay muted loop
  playsInline preload="none"` with `poster={sample.jpg}`, inside the T5 bezel. Headline and
  sub sit *beside* it at ≥900px, above it below that.
- The four template cards become 9:16 tiles (`aspect-[9/16]`), poster image by default, and an
  `IntersectionObserver` at `threshold: 0.6` that calls `play()` on the single most-visible
  tile and `pause()` on all others — never more than one decoder alive on a phone. On
  `navigator.connection.saveData` or `(prefers-reduced-motion: reduce)`, posters only.

Delete the `radial-gradient(120% 90% at 30% 10%, muted, bg)` swatch block in `page.tsx`.

**Why:** `docs/known-gaps.md` already calls this "the single highest-leverage conversion change
available" and has done for two revisions. It is also the only fix for the root cause: a
product that sells a video and shows none.

---

### ★ T2 — Repaint the app light · L
**Files:** `src/app/globals.css`, `src/lib/theme.ts`, `src/lib/templates/*.json`, `tests/contrast.test.ts`

Replace the `@theme` substrate block with the §2 table. Concretely in `globals.css`:

```css
@theme {
  --color-paper:    #FFFBF4;
  --color-paper-2:  #FFF6E9;
  --color-paper-3:  #F7EDDC;
  --color-ink:      #1C1512;
  --color-hairline: #E8DCC9;
  --color-cta:      #D4A017;
  --color-on-cta:   #241A05;
}
:root {
  --ink-1: #1C1512;  --ink-2: #57493F;  --ink-3: #7D6D60;  --ink-4: #9A8B7C;
}
html { background: var(--color-paper); }
body { color: var(--ink-1); }
```

`html { background: var(--color-void) }` and the entire `.scene` layer go. Surfaces stop being
translucent: Tier 2 becomes `background: var(--color-paper-2); box-shadow: 0 1px 2px
rgb(28 21 18 / .06), 0 8px 24px -14px rgb(28 21 18 / .18); border: 1px solid #EFE4D2;` — no
`backdrop-filter`, no rim gradient, no `.glass::after` sheen. Tier 0 (inputs) becomes
`background: var(--color-paper-3); box-shadow: inset 0 1px 2px rgb(28 21 18 / .07); border: 1px
solid #E4D6BF;` — a real recessed well, which now reads correctly because the surround is light.

`theme.ts`: drop `clampSceneBase`/`SCENE_TINT_CEILING`; keep `accentText` but re-target it at
`#FFFBF4` and *darken* rather than lighten (the loop currently only walks toward white).
Add `--accent-fill` = the template's raw `palette.accent`. Add `accentOnPaper` per §2 table
to each template JSON as `palette.accentOnPaper`.

`tests/contrast.test.ts`: retarget every assertion at the paper grounds. Floors unchanged
(4.5:1 body, 3:1 non-text).

**Why:** root cause. Also removes the `data-glass` device gate, the noise tile and 4 stacked
`backdrop-filter` layers — a straight frame-rate win on the mid-range Android majority.

---

### ★ T3 — Live title-card preview on the brief form · L
**Files:** `src/components/BriefForm.tsx`, `src/components/TitleCardPreview.tsx` (new),
`src/lib/render/cards.ts` (extract), `src/app/create/[templateId]/page.tsx`

Extract the body of `cardHtml()` in `cards.ts` into a pure `cardStyles(template, script, slot)`
helper that returns the same font/size/weight/tracking/colour object the renderer uses. Build
`<TitleCardPreview>`: a 9:16 card, `width: 168px` on phone / `260px` desktop, that renders the
**name-reveal shot** (`prd.md` 6.1 shot 9) live from the form's current field values, at
`transform: scale(size/1080)` of the real 1080×1920 geometry, so it is pixel-identical to the
render.

Placement: sticky at the top of the form on phone (`position: sticky; top: 56px`, collapses to
88px tall when scrolled past the name field), and a sticky right column at ≥1024px — which also
fixes the dead right half of the desktop create page.

Re-run the card's own entry animation on each debounced (240ms) change to the hero field:
`transform: scale(.92) → scale(1.03) → scale(1)`, 520ms, `--ease-overshoot`. On empty, show the
template's placeholder name in `--ink-4` italic.

**Why:** the highest-delight change available, and it costs no render seconds. The parent types
their child's name and watches it become the reveal, in Noto Serif Kannada, in the real
typography. It converts the form from data entry into the product.

---

### ★ T4 — Fix the poster frame · S
**Files:** `src/lib/render/pipeline.ts`, `src/lib/templates/schema.ts`, `src/lib/templates/*.json`

`pipeline.ts:128` grabs `-ss 1.2`, which for every template lands inside shot 1 — a black title
card. Add `posterAtSeconds: number` to the template schema and set it to the middle of the
**name/date reveal** shot: namakarana `24.5`, save-the-date `27.0`, first-birthday `21.0`,
griha-pravesha `23.0`. Then:

```ts
await ffmpeg(["-ss", String(t.posterAtSeconds), "-i", master, "-frames:v", "1", "-q:v", "3", "-y", poster]);
```

**Why:** this one line is the thumbnail in the app, the thumbnail in `/mine`, and the
link-preview card in the WhatsApp share. It is currently guaranteed to be black. Two-character
fix, enormous felt-quality delta.

---

### ★ T5 — The video gets a frame, and it autoplays · M
**Files:** `src/components/JobView.tsx`, `src/app/globals.css`

Wrap the `<video>` in a bezel that makes it an object on the light page:

```css
.screen {
  background: #141014;
  padding: 8px;
  border-radius: 26px;
  box-shadow:
    inset 0 0 0 1px rgb(255 255 255 / .07),
    0 2px 4px rgb(28 21 18 / .12),
    0 28px 60px -28px rgb(28 21 18 / .45);
}
.screen video { border-radius: 18px; display: block; }
```

On the video: `autoPlay muted loop playsInline preload="metadata"` plus `controls`. Overlay a
tap-to-unmute pill, bottom-centre, 44px min-height, `background: rgb(20 16 20 / .72)`,
`backdrop-filter: blur(12px)`, label `🔊` + `tr(lang,"video.sound")`; on tap set
`video.muted = false`, `video.currentTime = 0`, fade the pill out over 200ms.

Also change the `job.done` heading: instead of the generic "Your trailer is ready", lead with
the family's own hero field (the child's name / the couple / the family name) in `t-display`,
with the template name as the `t-subhead` under it.

**Why:** today the peak moment is a static black rectangle that requires a tap on a browser
play triangle. Making it play by itself, framed, under their child's name, is the difference
between "here is your file" and "here is your trailer".

---

### T6 — Reverse the rendered title cards off black · M
**Files:** `src/lib/render/cards.ts`, `src/lib/templates/namakarana-udupi.json`,
`griha-pravesha-classic.json`, `save-the-date-coastal.json`

The reveal card is where the condolence read happens. Change the card ground from `pal.bg` to a
new `palette.cardBg`: namakarana `#7B1E28`, griha-pravesha `#1E4033`, save-the-date `#1F3350`,
first-birthday keeps `#1A1210` (it is the one template where dark is a joke that lands). Set
the stage gradient to `radial-gradient(120% 70% at 50% 42%, rgb(255 255 255 / .10), transparent 68%)`
over that ground. Add a 2px `#D4A017` rule, 180px wide, centred, 40px above the hero line,
animating `scaleX(0) → scaleX(1)` over 640ms `--ease-standard` at the hero's delay + 180ms.

Photo shots are untouched — this is title cards only.

**Why:** the artefact the family forwards is the product. Cream-on-maroon with a gold rule is
the lagna patrike; cream-on-black is a condolence post.

---

### T7 — Pick all eight photos at once, and make them land · M
**Files:** `src/components/BriefForm.tsx`

Today there are eight separate `<input type="file">` elements, so filling the form means eight
round trips through the Android gallery picker. Add above the grid:

```tsx
<input type="file" multiple accept="image/*" onChange={fillFrom} className="sr-only" id="pick-all" />
```
`fillFrom` runs `inspect()` on each and fills the first empty slot in order.

Change the slot tiles from 64px list rows to a `grid-cols-2` of `aspect-[3/4]` tiles: photo
fills the tile, role label sits on a bottom gradient scrim, the number badge sits top-left in a
28px `rgb(28 21 18 / .55)` circle. When a photo lands:

```css
@keyframes photo-in {
  from { opacity: 0; transform: scale(1.06); }
  to   { opacity: 1; transform: scale(1); }
}
.slot img { animation: photo-in 380ms var(--ease-out-soft) both; }
```
plus a 1px `--accent` ring that flashes in and fades over 520ms, and `navigator.vibrate?.(8)`.
The `filled/total` counter animates its number with a 220ms `--spring-press` scale on change.

**Why:** the single most repeated interaction in the product, currently eight identical
frictions with no feedback at all.

---

### T8 — Replace the progress bar with a small cinema · M
**Files:** `src/components/JobView.tsx`, `src/lib/i18n/ui.ts`

The 4–8 minute wait is currently a heading, a 2px bar and a stage string. Replace with a 9:16
card in the T5 bezel showing the family's **own uploaded photos** cross-dissolving, one every
1400ms (`opacity` + `scale(1.0 → 1.04)`, 900ms `--ease-standard` overlap), behind a
`rgb(20 16 20 / .34)` scrim. Over that: the stage name in `t-title-3` cream, a determinate ring
(SVG `stroke-dasharray`, 3px, `--color-cta`, 520ms `--ease-standard` on change), and the
percentage in `t-caption`.

Rewrite the stage strings to name the shot rather than the subsystem — "ತೊಟ್ಟಿಲಿನ ದೃಶ್ಯ
ಮಾಡುತ್ತಿದ್ದೇವೆ" ("making the cradle shot") beats "generating". Add a line: "ಈ ಪುಟ ಮುಚ್ಚಿದರೂ
ಪರವಾಗಿಲ್ಲ — ಲಿಂಕ್ ವಾಟ್ಸಾಪ್‌ನಲ್ಲಿ ಕಳಿಸುತ್ತೇವೆ" so leaving is explicitly safe.

Requires exposing the event's asset signed URLs on `GET /api/jobs/:id` for the owner.

**Why:** the wait is the longest single stretch of attention in the funnel and it currently
gives back nothing. Their own faces are free content and they are the reassurance that the
upload worked.

---

### T9 — Make paying feel like something happened · M
**Files:** `src/components/JobView.tsx`

`handler: () => window.location.reload()` is the celebration for a ₹499 purchase. Replace with
an in-place transition:

1. `navigator.vibrate?.([12, 40, 18])`.
2. Fetch the unlocked job JSON; swap `video.src` from preview to master at the same
   `currentTime`, cross-fading a duplicated `<video>` layer over 480ms so the watermark
   *dissolves off* the frame the family is already watching.
3. A 2px `--color-cta` rule sweeps `scaleX(0 → 1)` across the card, 520ms `--ease-standard`.
4. Heading crossfades to "ಇದು ನಿಮ್ಮದು" / "It's yours", 280ms.
5. The two download rows rise in with a 70ms stagger (`translateY(10px) → 0`, 340ms
   `--ease-out-soft`) and the portrait one takes focus.

**Why:** this is the moment the business exists for and it is currently a white flash and a
scroll position reset.

---

### T10 — A real empty state for `/mine` · S
**Files:** `src/app/mine/page.tsx`

Signed-out `/mine` is a card and a button floating in 1400px of empty near-black. Signed-in
with no trailers is presumably worse. Give both:
- a 96px line-art lamp/cradle mark in `--gold-ink` at 24% opacity,
- the heading, one line of body in `--ink-2`,
- the primary action ("Make one" → `/`) as the `--cta` button, and the Google sign-in demoted
  to a text-weight secondary,
- max-width `34rem`, vertically centred at `min-height: 60dvh` instead of top-aligned.

Signed-in, non-empty: each row gets the T4 poster thumbnail at `aspect-[9/16] w-16`, the hero
name, and a paid/preview chip. Never a bare list of ids.

**Why:** `/mine` is where a family returns from the WhatsApp link. It is currently the emptiest
screen in the app.

---

### T11 — Kannada display faces, one per template · M
**Files:** `src/lib/templates/*.json`, `src/lib/render/cards.ts`, `assets/fonts/` (new)

All four templates set `typography.hero.kannada` to `Noto Serif Kannada` or `Noto Sans Kannada`.
So the four trailers are typographically distinct in Latin (serif vs sans) and **identical in
Kannada** — the language most of this audience will choose. Noto is a systems face; it is
correct and it is characterless, the Kannada equivalent of setting a wedding invitation in
Arial.

Bundle these (all OFL, render-side only, so no client payload):
- `namakarana-udupi` → **Tiro Kannada** (real calligraphic modulation, the closest thing to
  patrike lettering in an open face)
- `save-the-date-coastal` → **Anek Kannada** at a display width/weight
- `first-birthday-storybook` → **Baloo Tamma 2** (rounded, matches "rounded sans" in `prd.md` 6.3)
- `griha-pravesha-classic` → **Noto Serif Kannada** (keep; it is the right conservative choice here)

Same treatment for the Devanagari slot (`Tiro Devanagari Hindi`, `Anek Devanagari`,
`Baloo 2`). Verify each with `npx tsx scripts/check-languages.ts` and read the contact sheets —
conjunct coverage, not just tofu, is the acceptance test.

**Why:** this is the difference between a designer who *supports* Kannada and one who *designs
in* Kannada. Right now the Kannada output has one voice for four different occasions.

---

### T12 — Auspicious openers and the panchanga line · M
**Files:** `src/lib/templates/*.json` (`strings`), `src/lib/render/text.ts`, `prd.md` §6

A real namakarana or griha-pravesha invitation does not open on the name. It opens on an
invocation — `ಶ್ರೀ ಗುರುಭ್ಯೋ ನಮಃ` / `॥ ಶ್ರೀ ॥`, and closes on `ಶುಭಂ ಭವತು`. The templates
currently have neither. Add to each template's `strings` per language:
- `invocation` — rendered as the first line of shot 1, `caption` style, `--accent`, 0.6 opacity,
  above the title, 44px (at 1920) — small, quiet, correct.
- `closing` — `ಶುಭಂ` / `शुभम्` on the final details card, centred beneath the venue, with the
  T6 gold rule above it.
- optional `tithi` field on the brief (`type: "text"`, not required) for families who want the
  traditional date line under the Gregorian one.

**Why:** a Kannada family reads the absence of these immediately. Their presence is what makes
the output look like it was made by someone who has been to one of these, and it costs zero
render seconds.

---

### T13 — Optically size the bilingual wordmark · S
**Files:** `src/app/layout.tsx`, `src/app/globals.css`

`ಚಿತ್ರಕಥೆ chitrakathe` sets both scripts at the same `font-size`. Kannada's x-height is far
larger than SF's, so the Kannada reads oversized and the Latin reads like a caption of it. Set
the Kannada at `0.86em` of the Latin, align on `align-items: baseline`, and give the Latin
`letter-spacing: 0.01em; opacity: .68`. Put `lang="kn"` on the Kannada span so the Indic
tracking rule actually applies to it on an English page (`docs/design-spec.md` R9 asks for this
and layout does not do it).

**Why:** it is the first thing on every screen and it is optically wrong in the one script the
brand is named in.

---

### T14 — Default to Kannada in Karnataka, and stop leading with a language switcher · S
**Files:** `src/app/page.tsx`, `src/components/LanguageBar.tsx`, `src/app/layout.tsx`

The first element on the home page — above the headline — is a four-chip segmented control.
That is a settings screen, not a first impression. Move it to a single compact chip in the nav
bar showing the current language (`ಕನ್ನಡ ▾`), opening a sheet. And derive the default from
`Accept-Language` (`kn` → `kn`, `hi`/`mr` → `hi`, else `en`) rather than always `en`, so a
Kannada speaker lands on their own language.

**Why:** a Kannada-first product currently opens in English and asks a question before it says
what it is.

---

### T15 — Photography instead of nothing on the create screen header · M
**Files:** `src/app/create/[templateId]/page.tsx`, `public/samples/`

Above the form, run the same 9:16 sample loop from T1 as a 132px-tall **letterboxed strip**
(`object-fit: cover`, `aspect-[21/9]` crop of the 9:16 master, `mask-image: linear-gradient(90deg,
transparent, #000 12%, #000 88%, transparent)`), with the template name and the "32s · 8 photos"
line over it. Static poster on `saveData` / reduced motion.

**Why:** the create screen is the longest screen in the product and currently contains no
imagery whatsoever. This costs one already-rendered file.

---

### T16 — Real skeletons, not `animate-pulse` grey boxes · S
**Files:** `src/components/JobView.tsx`, `src/app/globals.css`

`<div className="glass tier-2 h-40 animate-pulse" />` is the loading state for the whole trailer
page. Replace with a skeleton that has the *shape of the answer*: the 9:16 bezel at final size,
a title bar 60% wide, two button rows. Shimmer via a 1.6s `background-position` sweep of
`linear-gradient(100deg, transparent 20%, rgb(28 21 18 / .045) 40%, transparent 60%)` — never
opacity pulsing, which reads as a network error.

**Why:** layout that settles instead of jumping is most of what "fast" feels like.

---

### T17 — Step transitions and a scroll-anchored section rhythm on the brief · S
**Files:** `src/components/BriefForm.tsx`, `src/app/globals.css`

The brief is one undifferentiated 4500px scroll. Without turning it into a wizard: give the
three sections (`details`, `photos`, `delivery`) a numbered `t-overline` header with a
`--hairline` rule, and mark each complete with a `--accent` check that draws in
(`stroke-dashoffset` 0 over 320ms `--ease-out-soft`) the moment its last required field is
satisfied. Sticky bottom bar on phone (`position: sticky; bottom: 0`, `paper-2` +
`env(safe-area-inset-bottom)`) holding the counter and the submit button, so the CTA is never
4000px away.

**Why:** the form's length is unavoidable; its shapelessness is not.

---

### T18 — Give the submit button a state machine, not a changing label · S
**Files:** `src/components/BriefForm.tsx`

`busy` currently swaps five different strings into the button label, so the button changes width
five times during a multi-second upload. Instead: fix the button label, put a determinate
progress fill *inside* the button (`::after`, `transform: scaleX(n/total)`, `transform-origin:
left`, `background: rgb(255 255 255 / .18)`, 340ms `--ease-standard`), and put the stage string
underneath in `t-footnote ink-2` with `aria-live="polite"`.

**Why:** eight photo uploads on Indian mobile data is 10–40 seconds of the user wondering
whether it froze.

---

### T19 — Focus, press and reduced-motion behaviour on light · S
**Files:** `src/app/globals.css`

`--color-focus: #8FD3FF` was chosen for contrast against near-black; on `#FFFBF4` it is 1.6:1
and effectively invisible. Change to `--color-focus: #1F5FBF` with
`box-shadow: 0 0 0 2px #FFFBF4, 0 0 0 4px var(--color-focus)`. Keep `.press:active
{ transform: scale(0.96) }` but drop `filter: brightness(1.06)` — on a light surface brightening
washes out rather than lighting up; use `filter: brightness(0.97)` instead. Add
`navigator.vibrate?.(8)` on every primary CTA press (Android only; iOS ignores it, which is
fine).

**Why:** every interactive affordance in the app is currently tuned for a substrate that is
being removed.

---

### T20 — Verify the shipped sample screenshots against the tracking rule · S
**Files:** `docs/screenshots/*`, `src/lib/render/cards.ts`

`docs/screenshots/trailer-name-reveal.jpg` shows the subtitle as `ನಾ ಮ ಕ ರ ಣ` — visibly split
conjuncts, exactly what `cards.ts:164` `track()` exists to prevent. Either the screenshot
predates the fix (replace it, it is the product's public-facing sample) or `script` is not
resolving to `kannada` on the `subtitle` slot at render time. Re-run
`npm run render:brief -- fixtures/brief.namakarana.json` and inspect. While there: the
`subtitle` style's `0.22em` and `caption`'s `0.18em` are Latin small-caps devices with no
Kannada equivalent — for Indic, replace the letterspaced-overline idea entirely with
*size and colour* separation (0.8× body size, `--accent`, weight 500), rather than tracking 0
and keeping a layout that was designed around tracking.

**Why:** it is the sample image in the repo, and a native reader sees a broken word in the
first two seconds.

---

## Retired

`docs/design-spec.md` §0 (Scene layer), §1 (four glass tiers), §1.5 (the `data-glass` device
gate), §2 (rim / sheen / lens), §3.1–3.5 (the dark token set and its contrast snapshots) are
superseded by T2. §4 (typography, including every Indic rule R1–R9) and §5 (motion curves) are
**kept in full** — they are correct and they survive the palette change unchanged.
