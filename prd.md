# Chitrakathe — PRD v1

**ಚಿತ್ರಕಥೆ** (chitrakathe, Kannada: *screenplay / storyboard*). A web product that turns one family's event details and photos into a cinematic movie-trailer-style video for Indian family functions.

- **Status:** v1 spec, pre-launch
- **Date:** 2026-09-05
- **Launch price:** ₹499 per event (unwatermarked download, portrait + square)
- **Promise:** pick a template, fill a short form, get a trailer in under 10 minutes

---

## 1. Problem

An Indian family holding a namakarana, a save-the-date, a first birthday or a griha pravesha wants a short, good-looking video to send on the family WhatsApp group. Today they have three bad options.

1. **Do it themselves in a generic tool.** The output looks generic because the tool is generic. It does not know that a namakarana has a cradle, a maternal uncle, a fixed set of Sanskrit lines, and that the name is the reveal.
2. **Pay a human studio.** ₹5,000–15,000 and 3–7 days, with WhatsApp back-and-forth on revisions. Custom caricature work runs ₹8,000–25,000 and 10–15 days.
3. **Give up** and send a JPEG card.

The gap is the middle: **one family, one event, a culturally specific template, done in minutes for a few hundred rupees.**

## 2. Competitive study

Read this before designing anything. The conclusion drives the whole architecture.

| Player | What it is | Price | Turnaround | Why it does not close this gap |
|---|---|---|---|---|
| **invideo AI** | General prompt-to-video with an "invitation maker" landing page | Free tier; paid from **~$17/mo** (annual) | Minutes | Prompt-first and occasion-agnostic. The invitation maker is a marketing page over the same generic engine. No Indian ritual grammar, no Kannada/Konkani. Subscription pricing is wrong for a once-in-a-lifetime purchase. |
| **VEED** | Browser video editor with an "Indian wedding invitation video maker" template gallery | Free editor, paid export tiers | Minutes–hours | It is an **editor**. It hands the family a timeline and expects them to art-direct. Most families cannot and will not. |
| **ImagineArt** | AI invitation/3D invitation generators, token-metered | 50 free tokens per 12h, then paid | Minutes | Genuinely aimed at Indian weddings, but still prompt-and-token shaped. Output quality swings shot to shot because nothing holds the timing or typography. |
| **InviteCrafter** and similar studios | Human-assisted Indian video invitation shop, app + web | **₹1,000–10,000** typical; caricature ₹8,000–25,000 | **3–7 days**, caricature 10–15 days | The right cultural output, the wrong cost structure and latency. Every order touches a human. Cannot serve a namakarana decided on Tuesday for Saturday. |
| **TrueFan AI** | Enterprise AI video personalisation, 175+ languages, celebrity likeness, sub-30s render, ISO 27001 / SOC 2 | Enterprise contracts | Seconds at scale | Built for brands sending *one video to a million people*. We are *a million families each sending one video*. Opposite shape of problem, opposite go-to-market, opposite sales motion. |

**What this tells us.** The generic prompt-to-video fight is lost — invideo, VEED and ImagineArt have distribution, a model budget and a head start. The enterprise personalisation fight is lost — TrueFan has compliance certifications and bureau relationships. What none of them do is **hold a specific ritual's storyboard**. That is the only defensible thing here, and it is not a model capability. It is editorial work.

**We are not building a prompt-to-video box.** We are building a small library of very good, very specific storyboards, with a form in front of them and a renderer behind them.

## 3. Core design decision: template-first, not prompt-first

A family cannot write a good prompt. Asking them to is the single biggest reason generic tools produce mediocre invitations.

So the family picks a template — *"namakarana trailer, traditional Udupi"* — and fills a short form:

- child's / couple's / family's names, in the chosen script
- date, time, venue
- 6–10 photos
- language (Kannada / Konkani / Hindi / English)
- music mood

**The template owns everything else**: the shot list, per-shot durations, typography, motion curves, colour, transitions, music bed, voiceover script skeleton, and which shots (if any) are worth spending model seconds on.

The consequence that matters for engineering: **the video model is a replaceable backend, not the product.** Most shots are the family's own photos under scripted camera motion, composited server-side. Only two shots per trailer go to a generative model. If a model triples in price or disappears next month, we change one config value.

## 4. Users

- **Primary buyer:** 25–45, urban or semi-urban India, holding a family function in the next 2–21 days. Buys on a phone. Pays with UPI. Judges the result by whether the family WhatsApp group reacts.
- **Secondary (v2 channel):** local event photographers and card shops who resell. Ships behind a `partner_code` from day one, not marketed in v1.

**The job:** *"Give me something to send on the family group that makes people call and ask who made it."*

## 5. Product surface (v1)

1. **Gallery** — 4 templates, each with a real 30-second sample rendered from a fictional family.
2. **Brief form** — template-specific, 6 to 9 fields, one screen, Indic keyboard support, live transliteration hint.
3. **Upload** — 6–10 photos, drag or camera roll, client-side downscale, EXIF stripped, moderation gate before the job is queued.
4. **Render** — queued. Progress page with real stage names. Typical 4–8 minutes.
5. **Preview** — watermarked, 540p, portrait. Shareable link.
6. **Pay** — ₹499, UPI via Razorpay.
7. **Download** — unwatermarked master, 9:16 (1080×1920) and 1:1 (1080×1080), sized for WhatsApp Status and Instagram.
8. **Re-render** — one free re-render after edits to the brief. Further re-renders ₹149.

### Free vs paid, and why the master is rendered once

The preview and the paid download are **the same render**. The worker produces an unwatermarked master, stores it privately, and derives a watermarked 540p preview from it by re-mux. Payment unlocks the master. **Model spend happens exactly once per job**, whether or not the family pays. This is the single most important cost decision in the product and it is stated here so nobody "optimises" it into a second render.

## 6. Launch templates

Four templates. Each is a real storyboard with named shots, fixed durations and typographic intent — not a filter over a photo slideshow. Each is 28–34 seconds, the length that survives a WhatsApp Status.

> Budget rule, enforced in code: **at most 2 generative shots per template.** Everything else is photo-motion and typography. A template that cannot fit under the cost ceiling loses shots until it does.

### 6.1 `namakarana-udupi` — "The Naming", traditional Udupi

32s. The name is the reveal; everything before it withholds it.

| # | Shot | Dur | Source | Motion / treatment |
|---|---|---|---|---|
| 1 | Black. Single struck bell. Title card: *"ಒಂದು ಹೊಸ ಹೆಸರು"* ("a new name") | 2.5s | title card | Letters fade up staggered, 120ms apart |
| 2 | Cradle detail — jasmine, silk, brass | 3.0s | **generative** (i2v from family photo of the cradle, or stock-seed) | Slow 8% push-in |
| 3 | Baby's face, close | 3.5s | photo 1 | Ken Burns push-in 1.0→1.12, centre-weighted |
| 4 | Family hands / elders | 3.0s | photo 2 | Lateral drift, 4% |
| 5 | Lower-third: parents' names | 2.5s | photo 3 + text | Photo held, text wipes in from left |
| 6 | Grandparents' blessing | 3.0s | photo 4 | Push-out 1.10→1.0 |
| 7 | Ritual detail — lamp, rice, cradle rope | 3.0s | **generative** | Rack-focus feel via animated blur ramp |
| 8 | Photo montage, 3 stills | 3.0s | photos 5–7 | 1.0s each, hard cut on the beat |
| 9 | **Name reveal** — black, then the name in large Kannada type | 4.5s | title card | Name scales 0.92→1.0 with 20% overshoot; subtitle "ನಾಮಕರಣ" beneath |
| 10 | Date, time, venue | 4.0s | title card over photo 8, darkened | Three lines, staggered |

Type: Noto Serif Kannada for the name, Noto Sans Kannada for details. Palette: deep maroon, turmeric, off-white. Music: `temple-warm`.

### 6.2 `save-the-date-coastal` — pre-wedding, coastal Karnataka

34s. Two people, one date. Ends on the date, not on the couple.

| # | Shot | Dur | Source | Motion / treatment |
|---|---|---|---|---|
| 1 | Sea horizon at dawn, letterboxed | 3.0s | **generative** | Slow tilt up |
| 2 | Title: *"SAVE THE DATE"* / localised | 2.5s | title card | Letterspacing animates 0.4em→0.1em |
| 3 | Partner A, solo portrait + name lower-third | 3.5s | photo 1 | Push-in 1.0→1.08 |
| 4 | Partner B, solo portrait + name lower-third | 3.5s | photo 2 | Mirrored push-in |
| 5 | Couple, wide | 3.5s | photo 3 | Slow pull-back |
| 6 | Three-up montage | 3.0s | photos 4–6 | 1.0s each on the beat |
| 7 | Couple, close | 3.0s | photo 7 | Held, subtle handheld drift |
| 8 | Coastal detail — coconut palms, temple gopura, kalash | 3.0s | **generative** | Lateral track |
| 9 | **The date**, very large | 4.0s | title card | Numerals count-up from a blur |
| 10 | Venue and "with the blessings of…" | 5.0s | title card over photo 8 | Two-line stagger |

Type: high-contrast serif for Latin, Noto Serif Devanagari / Kannada for Indic. Palette: indigo, sand, brass. Music: `strings-swell`.

### 6.3 `first-birthday-storybook` — first birthday

28s. Warm, not cinematic-serious. The joke is that it is shot like a blockbuster.

| # | Shot | Dur | Source | Motion |
|---|---|---|---|---|
| 1 | Title: *"ONE YEAR AGO…"* / localised | 2.5s | title card | Typewriter reveal |
| 2 | Newborn photo, desaturated | 3.0s | photo 1 | Push-in, colour ramps up over the shot |
| 3 | Month-by-month montage, 4 stills | 4.0s | photos 2–5 | 1.0s each, whip-pan transitions |
| 4 | Standing / crawling milestone | 3.0s | photo 6 | Push-out |
| 5 | Cake or decor detail | 3.0s | **generative** | Orbit-feel parallax |
| 6 | Family group | 3.0s | photo 7 | Slow drift |
| 7 | **"TURNING ONE"** + child's name | 4.5s | title card | Name pops with squash-stretch |
| 8 | Party details — date, time, venue | 5.0s | title card over photo 8 | Stagger |

Only **1 generative shot**. Type: rounded sans. Palette: cream, coral, mint. Music: `playful-strings`.

### 6.4 `griha-pravesha-classic` — housewarming

30s. The house is the protagonist. Photos of a house are usually bad, so this template leans hardest on typography.

| # | Shot | Dur | Source | Motion |
|---|---|---|---|---|
| 1 | Black, lamp flame ignites | 2.5s | **generative** | Held, flame motion carries it |
| 2 | Title: *"ಗೃಹ ಪ್ರವೇಶ"* / localised | 2.5s | title card | Fade with a warm glow bloom |
| 3 | House exterior | 3.5s | photo 1 | Slow tilt up (crop-pan) |
| 4 | Threshold / door / toran detail | 3.0s | photo 2 | Push-in |
| 5 | Two interior stills | 3.0s | photos 3–4 | 1.5s each |
| 6 | Family at the door | 3.5s | photo 5 | Pull-back |
| 7 | Kalash / rangoli detail | 3.0s | **generative** | Slow rotate-in |
| 8 | Family name — *"The ___ family"* | 4.0s | title card | Scale-in |
| 9 | Date, muhurta time, address | 5.0s | title card over photo 6 | Three-line stagger |

Type: Noto Serif Kannada / Devanagari, heavy weight. Palette: sandalwood, gold, deep green. Music: `nadaswaram-soft`.

## 7. Languages

Kannada (`kn`), Konkani (`kok`), Hindi (`hi`), English (`en`), for **both on-screen text and voiceover**.

- Konkani ships in **Devanagari** script by default with a **Kannada-script** variant flag, because coastal Karnataka Konkani speakers read both. Default follows the template's region.
- Every template carries a `strings` block per language. Fixed lines (e.g. "ನಾಮಕರಣ") are authored, not machine-translated. Family-supplied names are never translated, only rendered.
- Voiceover is 2–4 short lines, TTS, mixed under the music bed at −14 LUFS ducking.
- **Text shaping is a hard requirement.** Kannada and Devanagari conjuncts break under naive ffmpeg `drawtext`. Title cards are rendered in headless Chromium with Noto Serif/Sans Kannada and Devanagari, screenshotted to PNG with alpha, then composited. This is non-negotiable and is the reason the compositor is not pure ffmpeg filters.

## 8. Architecture

```
Next.js (App Router)  ──▶  Postgres  ◀──  render worker (separate process)
      │                       │                    │
      │ presigned PUT         │ pg-boss queue      ├── VideoProvider  (fal ▸ replicate ▸ stub)
      ▼                       │                    ├── TtsProvider    (sarvam ▸ elevenlabs ▸ stub)
 Object storage  ◀────────────┴────────────────────┤── Moderation     (sightengine ▸ stub)
 (S3-compatible)                                   └── Compositor     (Chromium title cards + ffmpeg)
```

**Rules.**

- **Never render in a request.** The web tier only enqueues and reads status. All rendering happens in the worker.
- **Queue is `pg-boss` on the same Postgres.** No Redis in v1. One less thing to run, and job state is transactional with domain state.
- **Object storage behind an interface** with an `s3` driver (Cloudflare R2 in production, zero egress) and a `local` driver for development.
- **Video model behind an interface**, with **at least two providers configured at all times** — `fal` primary, `replicate` secondary — because pricing and availability move monthly. Each provider declares a price table; the cost engine reads the table, never a hardcoded number.
- **Server-side composition.** Chromium renders text cards; ffmpeg does photo motion, stitching, audio mix, watermark and the 9:16 / 1:1 exports. Model seconds are spent only on the 1–2 shots that are marked `generative`.
- **Idempotent stages.** Each shot renders to a content-addressed cache key. A retried job does not re-pay for a shot it already produced.

**Data model (core tables).** `users`, `events`, `assets`, `render_jobs`, `render_shots`, `cost_entries`, `payments`, `moderation_results`, `templates` (versioned).

## 9. Unit economics — a first-class requirement

Every job writes `cost_entries` rows as it runs. The job carries a **hard ceiling**. When projected spend would cross the ceiling, the job **refuses and refunds/does not charge** rather than overrunning. No exceptions, no "just this once" flag.

### Cost model (per render, ₹, at ₹89/USD)

| Line | Basis | Cost |
|---|---|---|
| Generative shots | 2 × 5s, Seedance 720p i2v @ ~$0.26/clip | **₹46.3** |
| Voiceover TTS | ~250 chars, Sarvam @ ₹30 / 10k chars | ₹0.75 |
| Image moderation | 10 images | ₹1.00 |
| Worker compute | ~4 min CPU on a small instance | ₹2.00 |
| Storage + CDN | ~70 MB for 30 days, R2 | ₹1.00 |
| **Direct render cost** | | **₹51.05** |
| Payment gateway | 2% + 18% GST on ₹499 | ₹11.78 |
| **Total on a paid job** | | **₹62.83** |

**Hard ceiling: ₹95 per job.** Headroom covers a retry, a third generative shot, or a provider price move, and nothing more.

### Margin

- **Per paid render: (499 − 62.83) / 499 = 87.4%**
- **Blended, including free previews that never convert**, at a 35% preview→paid conversion: `51.05 / 0.35 + 11.78 = ₹157.6` → **68.4%**

Conversion is the variable that decides whether this business works, not model price. The dashboard (milestone 6) plots blended margin, not just per-render margin, and the README carries both numbers.

### Levers if a provider raises prices

In order: (1) drop the second generative shot in the affected template, (2) switch the provider config to the cheaper secondary, (3) shorten generative shots from 5s to 3s, (4) raise price. Cutting shots is preferred to cutting quality elsewhere, because a 28-second trailer with 1 generative shot still reads as a trailer.

## 10. Trust, moderation, retention

- **Moderation gate on upload.** Every image passes a moderation check *before* the job is queued. Nudity, gore and violence reject the upload with a clear message. Results are stored in `moderation_results` with the provider and score.
- **No likeness cloning, no face swap.** Generative shots are objects, details and environments — cradles, lamps, sea, kalash — never a generated human face resembling a real person. This is a product rule and a prompt-construction rule, enforced in the template schema (`generative` shots declare `subject: "object" | "environment"`, and `"person"` is not a valid value in v1).
- **Retention: uploaded family photos are deleted 30 days after upload.** A daily job hard-deletes originals and derived crops from object storage and marks the rows. Rendered outputs are kept 90 days so a family can re-download. Both numbers are stated on the upload screen and in the privacy policy, not buried.
- **EXIF stripped on ingest.** GPS from a family photo is not our business.
- **DPDP-aligned:** purpose limitation, stated retention, delete-on-request endpoint.

## 11. Payments

- **Razorpay**, UPI-first (UPI intent + collect + QR). Order created server-side, amount server-authoritative, webhook signature verified, payment idempotent by `order_id`.
- ₹499 unlocks the master and both aspect ratios, forever (subject to the 90-day storage window; after that, re-render at ₹149).
- One free re-render per event. Further re-renders ₹149.
- No subscription. This is a once-per-event purchase and pretending otherwise would be dishonest.

## 12. Milestones

| # | Milestone | Done when |
|---|---|---|
| 1 | One template end to end from a hardcoded JSON brief | `npm run render:brief` writes a playable 9:16 MP4 from `fixtures/brief.namakarana.json`, with real Kannada type, using the stub video provider |
| 2 | Intake form + upload | Family can choose a template, fill the brief, upload 6–10 photos to object storage via presigned PUT, moderation gate passes/rejects |
| 3 | Queue, progress, delivery | Job enqueued to pg-boss, worker renders, progress page shows real stages, delivery by email and WhatsApp link |
| 4 | Watermark + payment + download | Watermarked 540p preview, Razorpay UPI order, webhook unlock, signed download URLs for 9:16 and 1:1 |
| 5 | Four templates + multi-language | All 4 storyboards render in kn / kok / hi / en, text and voiceover |
| 6 | Cost dashboard | `/admin/costs` shows per-job cost lines, per-job margin, blended margin, ceiling breaches |
| 7 | 5 real families | 5 real events rendered and paid for; written feedback in `docs/feedback/` |

## 13. Out of scope for v1

Guest-name personalisation at scale. Face swap or likeness cloning. A mobile app. Printed card scanning. The English-only US market.

## 14. Open decisions

These were flagged as needing a call before coding. Each carries a recommendation and a default that the scaffold implements, so work is not blocked; each is reversible by config.

### D1 — Primary video model

Benchmarked on **cost per finished minute of trailer**, not per clip, since only ~10s of a 32s trailer is generated.

| Model (via fal) | Rate | 2 × 5s shots | Cost / finished 32s trailer |
|---|---|---|---|
| **Seedance 720p i2v** | ~$0.26 / 5s clip | $0.52 | **$0.52 ≈ ₹46** |
| Wan 2.5 480p | $0.05/s | $0.50 | $0.50 ≈ ₹45 (but 480p is below our 1080p master) |
| Kling (audio off) | $0.224/s | $2.24 | $2.24 ≈ ₹199 |
| Veo 3.1 (no audio) | $0.20/s | $2.00 | $2.00 ≈ ₹178 |

**Recommendation: Seedance via fal as primary, Replicate as the configured secondary.** Kling and Veo are 4× the price for shots that are 10 seconds of B-roll in a 32-second video — the family will not notice the difference on a phone, and the price difference is the whole margin. Wan is cheaper but its 480p output forces an upscale into a 1080p master. **Revisit monthly**; the provider interface exists precisely because this table will be wrong within a quarter.

### D2 — Template authoring: code vs JSON

**Recommendation: a JSON storyboard schema, validated by Zod, interpreted by code.** The authoring surface is JSON so a designer or editor can add a template without a deploy of new render logic; the renderer implements a **closed vocabulary** of shot types (`title_card`, `photo_motion`, `photo_montage`, `generative`, `lower_third`) and motion presets. New expressive capability requires code; new templates do not. Templates are versioned, and a job records the template version it rendered against.

Pure-code templates would be faster for the first two and would ossify by the tenth. A fully open JSON schema would need an editor UI we cannot afford in v1.

### D3 — Direct to families vs photographers as a channel

**Recommendation: direct in v1.** Milestone 7 requires talking to 5 real families; a reseller channel puts a photographer between us and that feedback exactly when the storyboards are least good. Ship the `partner_code` column and a per-partner price override now, market the channel in v2 once the templates have survived real weddings.

## 15. Risks

| Risk | Mitigation |
|---|---|
| **Preview conversion below ~25%** kills blended margin | Cap free previews per phone number; A/B a ₹99 "preview + one re-render" tier if conversion is soft |
| Generative shot looks off-culture (wrong deity, wrong ritual object) | Generative shots are limited to safe, generic objects and environments; prompts are authored per template, never assembled from user text |
| Indic text renders as tofu or broken conjuncts | Chromium-based title cards with pinned Noto fonts; a golden-image test per language in CI |
| Model provider outage the day before a wedding | Two providers configured; automatic failover on the shot, ceiling still enforced |
| Family uploads low-resolution WhatsApp-forwarded photos | Minimum 1080px on the long edge enforced at upload with a clear message; template crops are centre-safe |
| Copyright on music | Licensed or original beds only, four moods, stored with us |
