# Known gaps

Things that are deliberately unfinished, with what closing them requires. Nothing here is a surprise; everything here blocks launch unless marked otherwise.

## Blocks launch

| Gap | What is there now | What it needs |
|---|---|---|
| **Music beds are placeholders** | `scripts/make-fixtures.ts` synthesises four layered-sine drones so the audio mix path is exercised. They are not a soundtrack. | Four licensed or commissioned 45s beds — `temple-warm`, `strings-swell`, `playful-strings`, `nadaswaram-soft` — dropped into `assets/music/`. No code change. |
| **Konkani strings need native review** | Authored by hand in Devanagari and unverified. | A native Konkani speaker reads all four templates' `strings.kok` blocks. Coastal Karnataka Konkani, not Goan Konkani. |
| **Konkani voiceover uses a Marathi voice** | Sarvam has no Konkani voice; `SarvamTts` maps `kok → mr-IN`, which is the closest Devanagari reader. | Listen to it with Konkani speakers. If it grates, drop Konkani voiceover to text-only for v1 and say so on the template card. |
| **Kannada-script Konkani variant** | The schema supports it (`defaultScript`), no template sets it. | Decide with real families whether coastal Konkani speakers want Kannada script. Then one JSON field per template. |
| **Delivery is logged, not sent** | `src/lib/delivery.ts` prints the link. | A transactional email provider, and an approved WhatsApp Cloud API template. |
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
