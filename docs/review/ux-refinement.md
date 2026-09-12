# Chitrakathe — refinement and efficiency pass

Third design review. Everything below was seen in the app running at
`http://localhost:3000`, at 393×852, 1280×900 and 1536×960, with measurements taken
from the live DOM. Nothing is inferred from source alone.

---

## Verdict

The repaint and the sample videos landed. What did not land is *composition*: the app is
still a stack of independent boxes, one per decision, arranged down a single 1024 px
column — and every decision is still a separate page, a separate control, or a separate
picker. Four language links are the first four tab stops before a family sees anything
worth ₹499. Template choice is a page away from the brief. Eight photos are eight
pickers. The delivery screen is a 384 px phone column floating in a 1280 px window with
the price below the fold. The same stacking shows in the pixels: eight type sizes and
four weights on the home page, four corner radii down one 384 px stack, a primary Pay
button 42 px *narrower* than the secondary Share button under it, a sticky preview that
slices a Kannada label in half.

And the repaint stopped at the chrome. The four template grounds are still `#140507`,
`#0B1220`, `#0F1410`, `#1A1210` — so the shop window is four black slabs on cream, and
the artefact the family forwards is unchanged. The product is not unrefined because it
lacks polish. It is unrefined because nothing was *combined*.

---

## Click budget

Counted on a phone, as a Kannada-speaking family, from a cold landing. "Taps" = in-app
taps plus OS-picker confirmations; keystrokes counted separately.

| Task | Clicks today | Target | How |
|---|---|---|---|
| Land → watch a sample | **0** with motion on; **impossible** under `saveData` / `prefers-reduced-motion` (5 posters, `controls:false`, `tabIndex:-1`, `aria-hidden:true`, and tapping a tile navigates away) | **0 / 1** | Keep autoplay. Add a real play affordance on the poster for the quiet path, and make tap-on-tile open a full player sheet instead of leaving the page (F30, F27) |
| Land → start a trailer | **2** (ಕನ್ನಡ → full page nav → template card) | **1** | Detect language from `Accept-Language`+region, demote the picker into the header; the template card stays the single click (F24) |
| Fill the brief → queue a render | **28 taps, ~55 keystrokes** (1 duplicate language + 4 field focuses + 3 date + **16 photo** + 1 phone + 1 submit + 2 Google) | **15** | One multi-select picker for all 8 (16→9), drop the second language control (−1), `Enter`-advance between fields (4→1), date defaults to the template's season with a dd/mm mask (3→1), move sign-in to the download not the render (−2) (F2, F25, F26, F28) |
| Preview → paid download | **8** (scroll past a 670 px video, Pay, ~4 in Razorpay, **full page reload**, then choose between two download buttons) | **5** | Pay stays 4–5; the return is an in-place confirmation that starts the portrait download itself, square offered as a secondary line (F33, F36) |
| Change a misspelt name → re-render | **impossible** — no edit UI exists anywhere, although Terms promises "one free re-render per event after you change the details", the API supports `is_rerender`, and `rerender.free` / `rerender.paid` sit unused in `ui.ts`. The only route is redoing the whole brief (28 taps) and paying ₹499 again | **3** | Tap the name on the delivery page → inline edit → "Re-render, free once", reusing the stored assets (F22) |
| Find a trailer I made last week | **no entry point** — `AccountChip` returns `null` when Google is unconfigured, so the running app has zero links to `/mine`; with auth on it is **2** (avatar → menu → My trailers), and only if they were signed in when they rendered | **1** | Persistent "My trailers" in the header for signed-in users and in the footer always (F28, F29) |

---

## Mobile — 393×852

### 1. The sticky preview takes 42% of the screen and guillotines the form under it · Critical · M
**What's wrong:** `.sb-hold` measures `y=69, height=292` under a 69 px header — 361 px of
852 px (42%) permanently occupied while filling a 3,094 px form. Worse, its background is
`--color-paper` (`#FFFBF4`) while the field card scrolling beneath it is `--color-paper-2`
(`#FFF6E9`), so at scrollY 700 on `/create/namakarana-udupi?lang=kn` the label ದಿನಾಂಕ is
sliced horizontally mid-glyph against a visibly different cream.
**Why it matters:** the one delightful feature is the thing making the form unusable, and
the seam is the most visible unfinished edge in the product.
**Actions:**
- `src/app/globals.css` — in `.sb-hold`, collapse on scroll instead of holding full size: add `transition: height 240ms var(--ease-standard)` and a `.sb-hold[data-collapsed]` rule with `.sb-frame { width: 54px }` and the legend hidden, target total `min-height: 88px`.
- `src/components/StoryboardPreview.tsx` — set `data-collapsed` from an `IntersectionObserver` sentinel placed after the last text field.
- `src/app/globals.css` — `.sb-hold { background: var(--color-paper-2); box-shadow: 0 8px 16px -12px rgb(28 21 18 / .25); }` so the seam reads as a deliberate edge, not a clipping bug.
**Done when:** at 393×852, scrolled to y=700 on the Kannada create page, no label is cut mid-glyph and `.sb-hold` measures ≤ 96 px tall.

### 2. Eight photos are eight separate pickers · Critical · L
**What's wrong:** `template.photoSlots.map()` renders eight `<input type="file">` cards, each
opening the OS picker for exactly one file. That is 16 taps of the 28 in the whole brief.
**Why it matters:** it is over half the total interaction cost of the product.
**Actions:**
- `src/components/BriefForm.tsx` — one primary `<input type="file" multiple accept="image/*">` labelled "Choose your 8 photos", assigning files to slots in order; keep the per-slot inputs as a hidden "Replace" path behind each thumbnail.
- After assignment, render the eight slots as a 4×2 thumbnail grid with the role label under each, each thumbnail draggable to reorder (`@dnd-kit` or pointer events), so correction costs a drag, not a re-pick.
- Keep the existing `inspect()` gate; run it over the batch and surface failures as a list rather than per-slot.
**Done when:** eight photos can be attached from a cold form in 1 in-app tap + the OS multi-select + 1 confirm.

### 3. The brief is one 3,094 px scroll with no structure and no progress · High · M
**What's wrong:** `/create/namakarana-udupi?lang=kn` has `document.scrollHeight = 3094` on an
852 px viewport — 3.6 screens — with no steps, no progress, and the only completion signal
(`0/8`) sitting at y≈1900.
**Why it matters:** a family cannot tell how much is left, and the disabled CTA at the
bottom has no context.
**Actions:**
- `src/components/BriefForm.tsx` — three panes: *Names & date* → *Photos* → *Delivery*, with a 3-dot progress row pinned beside the collapsed preview. Cross-fade panes at 280 ms `var(--ease-standard)`, translateX ±12 px.
- Keep one `<form>`; panes are `hidden` toggles so a mistyped field never loses state.
**Done when:** no single pane on `/create/namakarana-udupi?lang=kn` exceeds 1.6 viewport heights at 393×852.

### 4. The primary CTA is 77 px tall in Kannada and 52 px in English · Medium · S
**What's wrong:** `.btn` measures `h=77` on `/create/namakarana-udupi?lang=kn` (two-line
Kannada label) versus `h=52` on `/create/save-the-date-coastal`. `min-height: 52px` is
correct; the label is too long to survive translation.
**Why it matters:** the single most important control changes shape per language, which
reads as untested rather than localised.
**Actions:**
- `src/lib/i18n/ui.ts` — shorten `form.submit` per language to fit one line at 353 px: `en` "Make my trailer", `kn` "ಟ್ರೈಲರ್ ಮಾಡಿ", `hi` "ट्रेलर बनाएँ", `kok` "ट्रेलर करात". Move "free to watch first" to the existing footnote below the button.
**Done when:** `.btn` measures 52–56 px tall on all four `/create/*?lang=` variants at 393 px.

### 5. Photo slot rows are ragged · Medium · S
**What's wrong:** the eight slot cards measure `90, 90, 90, 90, 90, 90, 111, 111` — the last
row is 21 px taller because slot 8's label ("A wide, uncluttered photo — the date and venue
go over this one") wraps to three lines.
**Why it matters:** a grid that does not align reads as generated, not designed.
**Actions:**
- `src/components/BriefForm.tsx` — wrap the slot grid in `grid-auto-rows: 1fr` and give each card `min-height: 90px`; truncate the long role label to two lines with `-webkit-line-clamp: 2` and move the full sentence into a `title`/helper line revealed on focus.
- Shorten `photo.wide_backdrop` to "A wide, uncluttered photo" in `src/lib/i18n/ui.ts`; the "date and venue go over this one" explanation belongs in `form.photosHint`.
**Done when:** all eight slot cards report an identical `getBoundingClientRect().height` at 393 px and at 1280 px.

### 6. The submit button scrolls away and never comes back · Medium · M
**What's wrong:** the only way to act is at y≈2,900 of a 3,094 px page. There is no
persistent action bar.
**Why it matters:** on a phone, the state of the form and the way to commit it are never
on screen together.
**Actions:**
- `src/components/BriefForm.tsx` — a sticky footer bar below 1024 px: `position: sticky; bottom: 0; padding-bottom: calc(12px + env(safe-area-inset-bottom)); background: var(--color-paper); border-top: 1px solid var(--hairline);` holding the counter ("6 of 8 photos") on the left and the CTA on the right.
**Done when:** the submit control is visible at every scroll position of `/create/save-the-date-coastal` at 393×852.

### 7. The page-entry animation replays on every navigation · Low · S
**What's wrong:** `.rise` puts `animation: rise 320ms` (opacity + `translateY(8px)`) on the
entire `<main>` subtree of every page. On the create page that is a 3,094 px composited
layer on a mid-range Android.
**Why it matters:** it costs a frame-rate hitch on exactly the hardware this product
targets, for an effect nobody notices.
**Actions:**
- `src/app/globals.css` — scope `.rise` to the first two children (`.rise > :nth-child(-n+2)`), 240 ms, and add `will-change: opacity` only for the duration.
**Done when:** the create page's first paint has no full-height animated layer in DevTools' layer panel.

---

## Desktop — 1280×900 and 1536×960

### 8. Desktop is a 1024 px phone column; 1536 renders byte-identically to 1280 · Critical · M
**What's wrong:** `main` measures `width: 1024` at both 1280 and 1536, and
`document.scrollHeight` is identical at both (home 1518/1518, create 2225/2225). At 1536
that is 256 px of dead gutter per side and not one layout decision that uses it.
**Why it matters:** the people who forward and share are on desktop, and the product shows
them a phone with margins.
**Actions:**
- `src/app/layout.tsx` — replace the single `max-w-5xl` with a per-page container: `max-w-[1200px]` for the gallery and create, `max-w-[68ch]` for legal pages, `max-w-[1100px]` for `/mine`.
- `src/app/page.tsx` — at ≥1440 px the template grid becomes `grid-cols-4` inside a 1200 px container with `gap: 24px` rather than the current 4×236 px inside 1024.
**Done when:** `main` reports a different width at 1536 than at 1280 on `/`, `/create/*` and `/t/*`.

### 9. The delivery page is a 384 px column in a 1280 px window, with the price below the fold · Critical · M
**What's wrong:** on `/t/19d8e6f3…?lang=kn` at 1280×900 the `h1` sits at `x=148, width=984`
while the video bezel sits at `x=448, width=384` — the headline and the thing it names do
not share a left edge. The video is 670 px tall starting at y=194, so the Pay button lands
at `y=998`: below a 900 px fold. The buyer must scroll to discover the price.
**Why it matters:** this is the purchase screen. Price below the fold and a misaligned
headline is the whole "side project" read in one view.
**Actions:**
- `src/components/JobView.tsx` — at ≥1024 px, a two-column grid `grid-cols-[minmax(420px,480px)_minmax(320px,380px)] gap-10 items-start`: bezel left, and right column = the name (`t-title-1`), the occasion, the paywall card, the share row.
- Cap the bezel at `max-height: calc(100svh - 220px)` so video, name and Pay are all above the fold at 900 px.
- Give the `h1` the same `grid-column` start as the video so their left edges are one line.
**Done when:** at 1280×900 on the trailer page, the Pay button's `getBoundingClientRect().bottom` is under 900.

### 10. The create page has a 292 px preview column and then 1,300 px of nothing · High · M
**What's wrong:** at 1280 the form is one 660 px column; the right column holds a 292 px
preview at y=237–800 and is empty from y=800 to y=2100. Total page height 2,100 px on a
900 px viewport.
**Why it matters:** the layout is the phone layout with a preview bolted to the side;
desktop's horizontal space is the obvious place to halve the scroll.
**Actions:**
- `src/components/BriefForm.tsx` — at ≥1024 px lay the text fields two-up (`sm:grid-cols-2` inside the `tier-2` card; date and venue span both), and the photo grid four-up (`lg:grid-cols-4`). That alone removes ~600 px of scroll.
- Widen the preview column to `360px` and let it carry the delivery + submit block under the frame, so the right rail is a real column rather than a sticky ornament.
**Done when:** `/create/save-the-date-coastal` at 1280×900 has `document.scrollHeight` under 1,500.

### 11. A 660 px-wide pill submit button · High · S
**What's wrong:** `.btn` measures `width: 660, height: 52, border-radius: 999px` on the
desktop create page — a 12.7:1 pill.
**Why it matters:** full-bleed is a phone idiom; at desktop width it reads as an
unstyled block, and the 999 px radius stops looking like a pill.
**Actions:**
- `src/app/globals.css` — add `.btn { max-width: 420px }` and let the form's CTA row be `flex justify-end` above 1024 px; keep `w-full` only below that breakpoint.
- Same for `/mine` and the trailer page so every primary control shares one maximum.
**Done when:** no `.btn` exceeds 420 px wide at 1280 or 1536.

### 12. Keyboard: the first four tab stops after the logo are language links · High · S
**What's wrong:** measured tab order on `/` at 1280 is: logo → ಕನ್ನಡ → कोंकणी → हिंदी →
English → the four template cards → Privacy. A keyboard or screen-reader user traverses
the entire language control before reaching any product.
**Why it matters:** it is the same problem as the visual one, stated in the tab order, and
it also means no skip link exists.
**Actions:**
- `src/app/layout.tsx` — add a visually-hidden "Skip to templates" link as the first focusable element, targeting `#templates`.
- `src/app/page.tsx` / `src/components/LanguageBar.tsx` — move the switcher into the header, after the account area in DOM order, as a single button that opens a 4-item menu (one tab stop, not four).
**Done when:** on `/` at 1280, the third `Tab` from page load lands on a template card.

### 13. There is no way back to the gallery from the brief · High · S
**What's wrong:** `/create/[templateId]` has no back link, no breadcrumb and no "change
template". The only escape is the browser back button or the wordmark, and the wordmark
discards everything typed with no warning.
**Why it matters:** template choice is the one decision made blind (see F18), so changing
it is a likely path, and today it costs the whole form.
**Actions:**
- `src/app/create/[templateId]/page.tsx` — a back row above the `h1`: `← {t(lang,"gallery.heading")}` at `t-subhead`, `min-height: 44px`, linking to `/?lang=${lang}`.
- `src/components/BriefForm.tsx` — `beforeunload` guard once any field or photo is set.
**Done when:** the create page has a visible back control at 393 and 1280, and navigating away with a partly-filled form prompts.

### 14. Ragged baselines across the template row · Medium · S
**What's wrong:** the "Watch the whole N seconds" line measures `y = 1293, 1293, 1293, 1314`
across the four cards at 1280 — the fourth is 21 px lower because its blurb wraps to three
lines. The four `<li>` are all 508 px tall, so the misalignment is purely internal.
**Why it matters:** four cards that do not align on their last line is the clearest "boxes,
not layout" signal on the page.
**Actions:**
- `src/app/page.tsx` — make the `<li>` contents `flex flex-col`, give the blurb `flex-1` and `line-clamp-2`, and push the duration line with `mt-auto`.
**Done when:** the four duration lines report the same `getBoundingClientRect().top` at 1280 and 1536.

### 15. Hero column: two ragged measures and 254 px of dead vertical space · Medium · S
**What's wrong:** at 1280 the `h1` is 412 px wide (`max-w-[18ch]` at 40 px) and the
paragraph under it is 447 px (`max-w-[46ch]` at 17 px) — two different right edges in one
column, neither using the 632 px available. The three text blocks total ~265 px, vertically
centred (`items-center`) in a 520 px row, so ~127 px is empty above and below.
**Why it matters:** the first screen reads as under-filled and the ragged right edge reads
as accidental.
**Actions:**
- `src/app/page.tsx` — `h1` `max-w-[13ch]` at `clamp(36px,3.6vw,52px)` and the sub `max-w-[13ch+…]` set to the same pixel measure (`max-w-[460px]` on both) so one right edge governs.
- Change `items-center` to `items-end` on the grid and add the missing content the space is asking for: the price note and a "How it works — 3 steps" row.
**Done when:** the `h1` and its paragraph report the same `right` edge at 1280.

### 16. Legal pages run 78 characters per line · Medium · S
**What's wrong:** paragraphs on `/privacy` and `/terms` measure 622 px at 16 px — about 78
characters. Comfortable reading is 60–70.
**Why it matters:** these are the pages that decide whether a stranger trusts a ₹499
charge.
**Actions:**
- `src/app/privacy/page.tsx`, `src/app/terms/page.tsx`, `src/app/refunds/page.tsx` — container `max-w-[64ch]`, body `t-body-lg` (17px), paragraph spacing `margin-block: 20px`.
**Done when:** paragraph width on `/privacy` at 1280 is between 520 and 560 px.

### 17. Inactive language segments have no hover state · Low · S
**What's wrong:** the non-current `LanguageBar` links compute to
`background-color: rgba(0,0,0,0)` with only Tailwind's default `transition: color`. Nothing
happens on hover.
**Why it matters:** on desktop, a control with no hover response does not read as a
control.
**Actions:**
- `src/app/globals.css` — `@media (hover:hover) { .seg-track a:not([aria-current]):hover { background: rgb(28 21 18 / .04); color: var(--ink-1); } }`, transition `120ms var(--ease-out-soft)`.
**Done when:** hovering ಕನ್ನಡ at 1280 changes its computed background.

---

## Both form factors

### 18. The product's own frames are still near-black · Critical · M
**What's wrong:** the chrome was repainted; the templates were not. `palette.bg` is still
`#140507` (namakarana), `#0B1220` (coastal), `#0F1410` (griha), `#1A1210` (birthday) — so
the four gallery tiles are four black slabs on cream, the hero is a black rectangle, and
the artefact forwarded on WhatsApp is unchanged from the version rejected twice. The
maroon and green grounds the review specified already exist in each file, as `palette.muted`
(`#7B1E28`, `#1E4033`).
**Why it matters:** the shop window and the deliverable are the two places the palette
actually matters, and neither moved.
**Actions:**
- `src/lib/templates/namakarana-udupi.json` — `palette.bg: "#7B1E28"`; `src/lib/templates/griha-pravesha-classic.json` — `"#1E4033"`; `src/lib/templates/first-birthday-storybook.json` — `"#2E1B14"`; `src/lib/templates/save-the-date-coastal.json` — `"#16304F"`.
- `src/lib/render/cardStyles.ts` — verify `pal.ink` still clears 4.5:1 on the new grounds; `#FBF3E4` on `#7B1E28` is 7.4:1, `#F6EFDD` on `#1E4033` is 8.1:1.
- Re-run `scripts/render-samples.ts` and `scripts/check-languages.ts`; retarget `tests/contrast.test.ts`.
**Done when:** the four `/samples/*.jpg` posters have mean luma above 60/255, and the gallery at 393 px shows no tile darker than the page's own shadow.

### 19. The samples ship placeholder artwork that says "PHOTO 1" · Critical · S
**What's wrong:** on `/` at 1280 the first-birthday tile reads "PHOTO 2" and the
housewarming tile reads "PHOTO 1" in large ghosted type behind the date card — the samples
were rendered from the synthetic gradients in `fixtures/photos`, and the placeholder
lettering is baked into the shop window.
**Why it matters:** it is the single clearest statement that nobody has shipped this. A
buyer sees a mock in the demo of a product they are being asked to pay for.
**Actions:**
- `fixtures/photos/` — replace the numbered gradients used by `scripts/render-samples.ts` with licensed or consented photography for a fictional family; failing that, abstract textures with no text.
- `scripts/render-samples.ts` — add an assertion that no source fixture filename or overlay text survives into the output, and re-render all four `public/samples/*.{mp4,jpg}`.
**Done when:** no frame of any `public/samples/*.mp4` contains the string "PHOTO".

### 20. The live preview shows the wrong shot and renders empty field labels as film text · Critical · S
**What's wrong:** on `/create/save-the-date-coastal`, after typing `Aditi`, `Rohan`,
`24/01/2027` and a venue, the preview's three lines measure:
`"Kadri Manjunath Temple, Mangaluru" @100px opacity 1`, `"Hosted by" @52px opacity 1`,
`"We request the honour of your presence" @46px`. The couple's names appear nowhere. Two
faults: (a) `focus` follows the last-touched field, so the reveal is replaced by whatever
was typed last; (b) the ghost placeholder's inline `opacity: 0.38` is overridden by the
entry animation, which is declared `both` and ends at `opacity: 1` — so empty field
*labels* ("Hosted by", and ಮಗುವಿನ ಹೆಸರು on the Kannada form) render at full strength as if
they are lines in the film.
**Why it matters:** the feature that was supposed to turn the form into a toy currently
promises a trailer whose climax is the words "Hosted by".
**Actions:**
- `src/components/StoryboardPreview.tsx` — after 1,600 ms of no input, return `focus` to `revealIndex(template)` so the preview always settles on the reveal.
- Move the ghost treatment off inline `opacity` and onto a class: `.sb-line--ghost { color: color-mix(in oklab, currentColor 45%, transparent); font-style: italic; }`, and change the ghost's animation to a fade that ends at the ghost's own opacity (or drop `both` for ghosts).
- Ghost text should be an example, not a label: add `placeholderExample` per field in the template JSON ("Aditi", "Kadri Temple") and render that instead of `field.labelKey`.
**Done when:** on the filled form above, the preview's largest line reads "Aditi & Rohan", and any ghost line computes to an opacity under 0.5.

### 21. The delivery video wears Chrome's native control bar · Critical · S
**What's wrong:** `<video controls autoPlay muted loop>` inside the `.screen` bezel. At both
393 and 1280 the rendered result is the browser's grey scrubber, `0:00`, a mute glyph, a
fullscreen glyph and a ⋮ overflow menu, sitting inside a 26 px hand-built bezel.
**Why it matters:** it is the ₹499 moment, and it is wearing default browser furniture.
The ⋮ menu also offers "Download" on the watermarked preview.
**Actions:**
- `src/components/JobView.tsx` — drop `controls`; add `controlsList="nodownload"` and `disablePictureInPicture`.
- Build the pill specified in the last review: bottom-centre, `min-height: 44px`, `background: rgb(20 16 20 / .72)`, `backdrop-filter: blur(12px)`, `border-radius: 999px`, label 🔊 + `tr(lang,"video.sound")`; on tap `video.muted = false; video.currentTime = 0`, fade out over 200 ms `var(--ease-out-soft)`.
- Add a minimal own scrubber: a 3 px `--color-cta` progress line inset 12 px from the bezel, plus tap-to-pause on the frame.
**Done when:** no native `::-webkit-media-controls` element is present on `/t/*` at either width.

### 22. A misspelt name is unfixable, and Terms promises otherwise · Critical · M
**What's wrong:** `grep -rn "rerender" src/components src/app/*/page.tsx` returns nothing but
`terms/page.tsx`. The strings `rerender.free` ("Change something and re-render, free once")
and `rerender.paid` exist in `src/lib/i18n/ui.ts` and are rendered by no component; the
render route implements `free_rerender_used`; `/refunds` says "a misspelt name, the wrong
date — we re-render it free"; `/terms` says "One free re-render per event after you change
the details". There is no UI to change the details.
**Why it matters:** this is the single most likely support request for a product whose
value is a correctly-spelled name, and the answer today is "redo everything and pay again".
**Actions:**
- `src/components/JobView.tsx` — under the video, a `btn-secondary` "Fix a name or date" that expands an inline field group seeded from the job's `fields` (add `fields` to the `/api/jobs/[id]` payload), and a confirm that `POST`s `/api/events/[id]/render` with the edited brief.
- Show the free-once state from `free_rerender_used`: the button reads `rerender.free` then `rerender.paid` with the price.
- `src/app/mine/page.tsx` — the same entry on each row.
**Done when:** from `/t/<id>`, a misspelt hero name can be corrected and re-queued in 3 taps without re-uploading a photo.

### 23. The submit button is disabled with no reason given · High · S
**What's wrong:** with all four text fields filled and zero photos, `.btn` reports
`disabled: true, opacity: 0.5, cursor: not-allowed, aria-describedby: null` and the label
still reads "Make my trailer — free to watch first". The only hint is a `0/8` counter
roughly 900 px above it.
**Why it matters:** the terminal step of the funnel is a dead control that explains
nothing; a pale gold pill still looks pressable.
**Actions:**
- `src/components/BriefForm.tsx` — never disable. Keep the button live; on submit with an incomplete brief, scroll to and focus the first missing input and render the existing `form.needPhotos` message inline above the button with `role="status"`.
- If a disabled state is kept for the in-flight case only, add `aria-describedby` pointing at a live counter beside the button: "6 of 8 photos".
**Done when:** clicking the CTA with 0 photos moves focus to photo slot 1 and shows a visible reason.

### 24. The language switcher is the first thing on the page, before any value · High · M
**What's wrong:** on `/` the `.seg-track` measures `289×54` at `y=101` — a full row above
the hero video, and the first four tab stops (F12). It is also duplicated on the create
page as "Language of the video" (F25).
**Why it matters:** the page opens with a quiz. Nothing has been shown yet and four
decisions are already on screen.
**Actions:**
- `src/app/layout.tsx` / `src/components/LanguageBar.tsx` — move it into the header as a single 44 px control showing the current language, opening a 4-item menu on tap.
- `src/app/page.tsx` — default the language from `Accept-Language` plus the Vercel/CDN region header, keeping `?lang=` as the override so shared links still carry the sender's choice.
**Done when:** the hero video's bezel top edge is above y=120 at 393×852, and no language control precedes it in the DOM.

### 25. Language is asked twice, and the two answers disagree · High · S
**What's wrong:** `/create/save-the-date-coastal` has a second segmented control labelled
"Language of the video". Changing it re-renders every `tr()` string in `BriefForm`, but the
page `h1`, the blurb and the "34s · 8 photos" line are server-rendered from `?lang=` and do
not change — so the page ends up half in one language.
**Why it matters:** two controls for one concept, one of which visibly fails.
**Actions:**
- `src/components/BriefForm.tsx` — delete the in-form language section; take the language from the URL only.
- `src/app/create/[templateId]/page.tsx` — if a family wants to change it here, the header control (F24) changes `?lang=` and re-renders the whole page, preserving form state via `history.replaceState` + a `sessionStorage` draft.
**Done when:** `/create/*` contains exactly one language control and changing it updates the `h1`.

### 26. The date field asks for `mm/dd/yyyy` · High · S
**What's wrong:** the native date input renders `mm/dd/yyyy` and, once filled, displays
`01/24/2027`. On an Indian save-the-date, `03/04/2027` will be read as 3 April by every
customer and stored as 4 March.
**Why it matters:** the wrong date on an invitation is the one error that makes the
purchase worthless, and it is the error this format invites.
**Actions:**
- `src/components/BriefForm.tsx` — replace `<input type="date">` with three `inputmode="numeric"` segments (DD / MM / YYYY) or a `type="text"` with a dd/mm/yyyy mask, composing to ISO on submit.
- Echo the parsed result under the field in words, in the chosen language: "Sunday, 24 January 2027" via the existing `formatDate` in `src/lib/render/text.ts`.
**Done when:** the create page shows no `mm/dd/yyyy` placeholder, and typing `03/04/2027` displays "3 April 2027".

### 27. Template choice is a page away from the brief, and made blind · High · L
**What's wrong:** `/` → `/create/[templateId]` is a full navigation. The tiles carry no
explicit CTA (the string `gallery.cta`, "Make this one", exists in `ui.ts` and is rendered
nowhere), and once on the brief there is no way to see or switch template (F13).
**Why it matters:** the one irreversible decision is made on the least information, and
reversing it costs the entire form.
**Actions:**
- `src/app/page.tsx` + `src/components/BriefForm.tsx` — make the brief a route-transitioned panel that keeps a horizontal template strip pinned at the top: tapping another template re-renders the preview and remaps the fields it shares, without clearing them.
- Render `gallery.cta` as a visible `btn-secondary` on each tile so the affordance is stated.
**Done when:** switching template from inside the brief preserves every field the two templates share.

### 28. Sign-in is disclosed as a footnote under the submit button · High · S
**What's wrong:** "You'll sign in with Google before we start — it keeps your trailer if
this page closes" sits at 13 px under the CTA, at the very bottom of a 3,094 px form. In the
running app there is no sign-in control anywhere else: `AccountChip` returns `null` because
Google is unconfigured, so the header has nothing.
**Why it matters:** the family learns about the account requirement after doing all the
work, at the moment they commit.
**Actions:**
- `src/components/BriefForm.tsx` — move the Google gate *after* the render, not before it: queue on the anonymous `eventToken` (which the API already issues), and ask for sign-in only at download. If the gate must stay, state it at step 1 of the pane flow (F3), not below the CTA.
- `src/app/layout.tsx` — render a sign-in affordance even when `isConfigured()` is false (disabled with a tooltip in dev) so the chrome does not silently lose a nav item.
**Done when:** the account requirement is visible before the first field is filled, and the header shows an account area on every page.

### 29. `/mine` leaks database enums and has no thumbnails · High · S
**What's wrong:** `src/app/mine/page.tsx` renders `{r.paid ? "Paid" : r.status === "succeeded"
? "Preview ready" : String(r.status)}` — so a customer sees `queued`, `running` and
`refused_over_ceiling`, in hardcoded English on a `lang={lang}` page, beside a text-only row
with no poster.
**Why it matters:** the only place a family returns to is the place that talks like a
database.
**Actions:**
- `src/app/mine/page.tsx` — map every status through `t(lang, "mine.status.*")`: `queued`/`running` → "Being made", `succeeded` → "Ready to watch", `paid` → "Downloaded", `failed`/`refused_over_ceiling` → "We'll remake this — tap for help".
- Join `render_outputs.poster_key` and render a 56×100 `aspect-[9/16]` poster on each row with `rounded-[10px]`, and put the row's occasion + date beside it.
- Add a language control to the page.
**Done when:** no raw status enum appears on `/mine`, and each row shows a poster.

### 30. Reduced motion or Save-Data leaves the shop window with no way to play · High · S
**What's wrong:** under `prefers-reduced-motion: reduce` all five `<video>` report
`paused: true, controls: false, tabIndex: -1, aria-hidden: "true"`. The wrapping `<a>`
navigates to `/create`. There is no play button, no keyboard path and no screen-reader path
to the one thing the company sells. `saveData` — common on mid-range Android in India —
behaves identically.
**Why it matters:** a meaningful share of the target audience literally cannot watch a
sample, and the whole conversion argument rests on watching one.
**Actions:**
- `src/components/SampleTile.tsx` — when `quiet()` is true, render a 56 px play button over the poster (`min-height: 56px`, `background: rgb(20 16 20 / .72)`, focusable, `aria-label` from a new `gallery.play` string) that calls `v.play()` on activation.
- Make tapping a tile open a full-screen player sheet with sound rather than navigating; move navigation onto the explicit "Make this one" CTA (F27).
**Done when:** with `prefers-reduced-motion: reduce` set, a keyboard user can reach and start each sample.

### 31. Refusal copy explains our internal cost ceiling to the customer · High · S
**What's wrong:** `job.refusedBody` reads "It would have cost more than we allow ourselves
to spend on one trailer. You have not been charged." A refused job exists in the running
system (`2e452d10`, `refused_over_ceiling`, ceiling ₹1).
**Why it matters:** at a baby's naming ceremony, the company's unit economics are not the
family's problem, and saying it out loud reads as amateur.
**Actions:**
- `src/lib/i18n/ui.ts` — all four languages: "Something in this one needs a human. We've stopped it and you have not been charged — message us and we'll make it by hand today." Add a WhatsApp contact button on that state in `src/components/JobView.tsx`.
**Done when:** no customer-facing string mentions cost, spend or a ceiling.

### 32. A bad template URL renders the raw Next.js 404 · High · S
**What's wrong:** `/create/does-not-exist` returns the framework default —
"404 / This page could not be found." in Times-ish default type — wrapped in our header and
footer, so it reads as a broken page rather than a designed one.
**Why it matters:** shared links get mangled; this is a page real customers will see.
**Actions:**
- `src/app/not-found.tsx` (new) — paper ground, `t-title-1` "That page has moved", a line of `t-body ink-2`, and a `btn-primary` back to the gallery, localised via the `?lang=` param.
- `src/app/create/[templateId]/not-found.tsx` — a template-specific variant offering the four templates as tiles.
**Done when:** `/create/does-not-exist` renders branded type and a primary action.

### 33. Payment success is a full page reload · High · S
**What's wrong:** `handler: () => window.location.reload()` in `JobView.pay()`. The
moment of purchase is a white flash and a re-fetch; on a slow connection it is several
blank seconds with no confirmation that the money arrived.
**Why it matters:** the one time a family will feel relief, we show them a reload.
**Actions:**
- `src/components/JobView.tsx` — on the Razorpay handler, `setJob(j => ({...j, unlocked:true}))` optimistically, show a 900 ms confirmation: a `--color-cta` check scaling `0.8 → 1.06 → 1` on `var(--ease-overshoot)` with "Paid — it's yours", then cross-fade the paywall card into the download row over 280 ms. Reconcile with one `poll()` in the background.
**Done when:** paying never unmounts the video element.

### 34. Eight type sizes and four weights on the home page · Medium · M
**What's wrong:** computed font sizes on `/` are `12, 13, 14, 15, 16, 17, 19, 40 px` with
weights `400, 500, 600, 700`. Five of those sizes (12–17) live within 5 px of each other and
do near-identical jobs, and there is a 21 px hole between 19 and 40.
**Why it matters:** a scale this crowded cannot establish hierarchy, so every screen reads
as flat regardless of how the boxes are arranged.
**Actions:**
- `src/app/globals.css` — collapse the scale to six steps: display `clamp(32px,4.4vw,52px)/700`, title-1 `28/700`, title-3 `20/600`, body `17/400`, callout `15/500`, caption `13/400`. Delete `.t-title-2`, `.t-body-lg` and `.t-subhead` and remap their 11 call sites.
- Cap weights at 400 / 600 / 700; remove 500 from `.t-callout` and `.t-caption`.
**Done when:** `[...new Set([...document.querySelectorAll('main *')].map(e=>getComputedStyle(e).fontSize))]` on `/` returns at most 5 values.

### 35. Nested radii are off, and one stack uses four of them · Medium · S
**What's wrong:** `SampleTile` sets the outer box to 20 px and the inner video to 14 px with
8 px of `.screen` padding — correct concentricity would be 12 px, so every non-hero tile's
inner corner is 2 px wrong. (The hero, 26/8/18, is right.) Separately, the trailer page's
384 px stack runs `26px` (bezel) → `28px` (paywall sheet) → `999px` (Pay) → `22px` (Share):
four radii down one column.
**Why it matters:** mis-nested corners are the difference an eye registers as "cheap"
without being able to name it.
**Actions:**
- `src/components/SampleTile.tsx` — inner radius `hero ? 18 : 12`.
- `src/app/globals.css` — one radius family: sheet 28, card 22, field 14, inner-of-bezel = outer − padding. Give the Share control `--radius-card` (22) and the paywall card 22 to match, keeping 28 for true sheets only.
**Done when:** every `.screen` satisfies `inner = outer − 8` and the trailer stack uses at most two non-pill radii.

### 36. The primary action is narrower than the secondary one below it · Medium · S
**What's wrong:** on `/t/*` at 1280: bezel `w=384`, paywall sheet `w=384`, Pay button
`w=342` (inset by the sheet's `p-5`), Share link `w=384`. The ₹499 button is 42 px narrower
than the free Share button directly under it, and three different widths stack down one
column.
**Why it matters:** visual weight is telling the buyer that sharing matters more than
buying.
**Actions:**
- `src/components/JobView.tsx` — set one column width (`max-w-[420px]` per F11) and let Pay be the full width of it; make Share a `btn-secondary` at the same width but `t-callout` weight 500, with the WhatsApp glyph.
- Order per the last review: Share row *above* the paywall is wrong for a preview — keep Pay first, Share second, but give Pay the larger optical weight.
**Done when:** Pay and Share report identical widths on `/t/*` at 393 and 1280.

### 37. Three sibling groups on the brief get three different heading treatments · Medium · S
**What's wrong:** on `/create/save-the-date-coastal` the fields card has **no** heading (the
string `form.heading`, "Tell us about the function", exists in `ui.ts` and is never
rendered); "Your photos" is `t-title-3` at 19 px; "Where should we send the video?" is
`t-subhead` at 14 px. Their left edges also differ: section headings sit at x=141 while the
labels inside the card sit at x=161.
**Why it matters:** three peers styled three ways means the page has no grammar, which is
exactly the "collection of boxes" read.
**Actions:**
- `src/components/BriefForm.tsx` — every group gets the same header: 20/600 title + optional 15/400 `ink-2` sub, in the same position relative to its card.
- Render `form.heading` on the fields group; drop the card padding's effect on the heading by moving all three headings outside their cards so one left edge (x=141) governs.
**Done when:** the three group headings on the create page share a font size and a left edge.

### 38. No real loading or slow-connection story · Medium · S
**What's wrong:** the only skeleton in the app is `<div className="panel tier-2 h-40 animate-pulse">` — a bare 160 px pulsing rectangle while the job loads. Photo thumbnails, posters and the sample videos have no placeholder, no `decoding`/`fetchpriority` hints, and `preload="metadata"` on five videos means five metadata fetches on a 3G gallery load.
**Why it matters:** on the target hardware and network, the first impression is reflow.
**Actions:**
- `src/components/JobView.tsx` — replace the pulse with a skeleton shaped like the real screen: a 9:16 bezel-sized block, a 28 px title bar and a 52 px pill, all at `background: var(--color-paper-3)` with a 1,400 ms shimmer.
- `src/components/SampleTile.tsx` — `preload="none"` on non-hero tiles (the poster is the product); `preload="metadata"` for the hero only. Add `fetchpriority="high"` to the hero poster and `loading="lazy" decoding="async"` to the rest.
- Reserve every image box with `aspect-ratio` so nothing reflows.
**Done when:** on a throttled Fast-3G profile, `/` reports zero layout shift after first paint and requests at most one video before scroll.

### 39. The preview legend reads "9 / 10" with no explanation · Low · S
**What's wrong:** under the live preview, `{frame.index + 1} / {template.shots.length}`
renders as "9 / 10" (and "10 / 10" once the venue is typed). It is `aria-hidden`, 12 px,
`ink-3`, and reads as a score.
**Why it matters:** a number out of ten next to a preview of something they are buying is
read as a rating of their input.
**Actions:**
- `src/components/StoryboardPreview.tsx` — replace with the shot's own name: "Shot 9 of 10 · the name reveal", using a new `label` per shot in the template JSON, at `t-caption ink-3`.
**Done when:** no bare `n / m` appears beside the preview.

### 40. Four accent colours in one row, and legal pages in English only · Low · S
**What's wrong:** the four template cards' duration lines compute to `rgb(158,27,50)`,
`rgb(31,58,95)`, `rgb(194,65,12)`, `rgb(30,94,69)` — four unrelated hues on adjacent 236 px
cards. Separately, `/privacy` and `/terms` contain no `.seg-track` and no localised copy, on
a four-language product.
**Why it matters:** the accent system is per-template identity; shown four-up it is
confetti. And a family reading the refund terms in their second language is the family
least likely to pay.
**Actions:**
- `src/app/page.tsx` — the gallery row uses one ink (`--color-gold-ink`) for all four duration lines; per-template accent applies only inside that template's own pages and its tile's label plate.
- `src/app/privacy/page.tsx`, `terms`, `refunds`, `contact` — accept `?lang=`, render through `t()`, and carry the same header language control.
**Done when:** the four duration lines compute to the same colour, and `/terms?lang=kn` renders Kannada.

---

## Sequencing

F18 and F19 (the black grounds and the "PHOTO 1" samples) are independent of everything and
should land first — they are the loudest, and they change what every other screen is
showing. F2, F13, F22, F24, F25, F26 and F28 are the click budget and can go in parallel. F8, F9,
F10 are the desktop layout and should be taken as one change, since they share the container
decision. F34 and F35 (scale and radii) touch every screen, so they go before the desktop
layout work, not after.
