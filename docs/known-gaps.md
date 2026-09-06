# Known gaps

Things that are deliberately unfinished, with what closing them requires. Nothing here is a surprise; everything here blocks launch unless marked otherwise.

## Blocks launch

| Gap | What is there now | What it needs |
|---|---|---|
| **Music beds are placeholders** | `scripts/make-fixtures.ts` synthesises four layered-sine drones so the audio mix path is exercised. They are not a soundtrack. | Four licensed or commissioned 45s beds — `temple-warm`, `strings-swell`, `playful-strings`, `nadaswaram-soft` — dropped into `assets/music/`. No code change. |
| **Konkani strings need native review** | Authored by hand in Devanagari and unverified. | A native Konkani speaker reads all four templates' `strings.kok` blocks. Coastal Karnataka Konkani, not Goan Konkani. |
| **Konkani voiceover uses a Marathi voice** | Sarvam has no Konkani voice; `SarvamTts` maps `kok → mr-IN`, which is the closest Devanagari reader. | Listen to it with Konkani speakers. If it grates, drop Konkani voiceover to text-only for v1 and say so on the template card. |
| **Kannada-script Konkani variant** | The schema supports it (`defaultScript`), no template sets it. | Decide with real families whether coastal Konkani speakers want Kannada script. Then one JSON field per template. |
| **Delivery is logged, not sent** | `src/lib/delivery.ts` prints the link, at both moments (queued and ready). The *when* is now right; the *how* is still a stub. | A transactional email provider, and an approved WhatsApp Cloud API template. Until then, a family that closes the tab still relies on `/mine`. |
| **No real families yet** | Milestone 7 is untouched. | Five real events, rendered and paid for, feedback written into `docs/feedback/`. |

## Does not block launch

| Gap | Note |
|---|---|
| **Sample videos on the gallery** | The gallery shows palette gradients. Render one sample per template from a fictional family and show those instead — it is the single highest-leverage conversion change available. |
| **Whip-pan and dissolve transitions** | `photo_montage.transition` accepts `whip` and `dissolve`; the compositor currently hard-cuts all three. Cuts read fine on a phone. |
| **Old template versions are not re-renderable** | `getTemplate` throws on a version mismatch rather than keeping old storyboards alive. Correct for v1; revisit when a template changes after families have used it. |
| **Client-side downscale before upload** | Photos upload at full size. Fine at 10 photos; add a canvas downscale if mobile uploads stall. |
| **Title-card render speed** | ~100s per 32s trailer per aspect, dominated by Chromium frame capture. Cacheable: identical (template, language, field values) cards recur across re-renders. |
| **`partner_code` is stored but unused** | Deliberate. See prd.md D3 — the reseller channel is a v2 decision, and the column exists so switching it on is not a migration under load. |

## Found by looking at the running app

| Gap | Note |
|---|---|
| **Date field shows `mm/dd/yyyy` for some users** | `<input type="date">` renders in the browser's UI language, which the page cannot override — `lang="en-IN"` does not reach it. On mobile, where nearly all of this traffic will be, the native picker follows the phone's locale and is correct. Revisit only if desktop users report it. |
| **The footer stays English** | It lives in the root layout, which does not receive `searchParams`, so it cannot see `?lang`. Needs the language moved into the path (`/kn/...`) or a cookie. Not worth either until the language switch earns its keep. |
| **No sample video on the gallery cards** | Still the highest-leverage conversion change available. The cards currently show a palette gradient. |

## Merchant identity is a placeholder

`src/lib/legal.ts` carries `[REGISTERED BUSINESS NAME]`, `[+91 XXXXX XXXXX]` and the rest as
literal blanks, and `/terms`, `/refunds` and `/contact` render them verbatim. They are
deliberately not filled with plausible-looking values — an invented address on a refund policy
is worse than an obvious blank.

This blocks launch twice over: Razorpay will not activate a live merchant account without a
published legal name, address, phone, email, terms, refunds and privacy policy; and a family
being asked for ₹499 by a website with no name behind it will not pay. Replace every field in
`MERCHANT` before going live. `isPlaceholder()` is exported so a launch check can assert none
of them still start with `[`.
