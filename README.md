# Chitrakathe

**ಚಿತ್ರಕಥೆ** — a cinematic movie-trailer-style video for one Indian family function, from a short form and eight photos, in minutes.

Namakarana. Save-the-date. First birthday. Griha pravesha. Kannada, Konkani, Hindi, English. Portrait for WhatsApp Status, square for Instagram.

The product spec, the competitive study and the open decisions live in **[prd.md](./prd.md)**. This file is how to run it and what it costs.

---

## Gross margin at the launch price

**Launch price ₹499** per event. Unwatermarked download, both aspect ratios, one free re-render.

| Line | Basis | Cost |
|---|---|---|
| Generative shots | 2 × 5s, Seedance 720p i2v via fal @ ~$0.26/clip | ₹46.30 |
| Voiceover (TTS) | ~250 chars, Sarvam @ ₹30 / 10k chars | ₹0.75 |
| Image moderation | 10 images | ₹1.00 |
| Worker compute | ~2 min CPU | ₹2.00 |
| Storage + CDN | ~70 MB for the retention window, R2 | ₹1.00 |
| **Direct render cost** | | **₹51.05** |
| Payment gateway | Razorpay 2% + 18% GST | ₹11.78 |
| **Total on a paid job** | | **₹62.83** |

> ### **Gross margin per paid render: 87.4%**
> ### **Blended gross margin: 68.4%**

The two numbers differ because **the free preview is a full render**. A family gets a watermarked 540p preview before paying, and producing it costs the full ₹51.05 whether or not they buy. The blended figure carries every preview that never converted, at an assumed **35% preview→paid conversion**:

```
blended cost per paying family = 51.05 / 0.35 + 11.78 = ₹157.63
blended margin                 = (499 − 157.63) / 499 = 68.4%
```

**Conversion, not model price, is what decides whether this business works.** At 20% conversion the blended margin falls to 46%; at 50% it rises to 76%. `/admin/costs` plots the real number, and `npm run costs` prints it in a terminal.

Three structural decisions protect that margin:

1. **The master is rendered once.** Payment unlocks an already-rendered file — it never triggers a second render. Model spend is once per job, not once per download.
2. **Only 1–2 shots per trailer are generated.** The other 7–9 are the family's own photos under scripted camera motion, composited server-side with ffmpeg. Model seconds go where they show.
3. **A hard ceiling of ₹95 per job, enforced in code.** Every priced operation is quoted against the ledger *before* it runs. A shot that cannot be afforded degrades to its authored photo fallback; a job that cannot be rendered inside the ceiling is refused, and the family is not charged. `CostLedger` is the only thing in the codebase allowed to spend money.

The price table lives in `src/lib/cost/prices.ts` with the date it was last verified. The dashboard flags it after 45 days. Rendering with a model that has no price entry throws — the ceiling cannot be enforced against an unknown price.

---

## Running it

**Requirements:** Node 22+, PostgreSQL 16+, ffmpeg, a Chromium binary, and Noto fonts for Kannada and Devanagari.

```bash
sudo apt-get install -y ffmpeg fonts-noto-core   # Noto Sans/Serif Kannada + Devanagari
npm install
cp .env.example .env                             # defaults run fully offline
createdb chitrakathe
npm run migrate
npm run test
```

### Milestone 1 — one template end to end, no network

```bash
npx tsx scripts/make-fixtures.ts                 # 8 placeholder photos, 4 placeholder music beds
npm run render:brief -- fixtures/brief.namakarana.json
```

Writes a playable 1080×1920 MP4 with real Kannada typography, plus a watermarked preview, and prints the cost ledger. No database, no queue, no API keys. This is the check that the storyboard, the type shaping, the compositor and the ledger all work before anything is built on top of them.

### The whole thing

```bash
npm run dev        # web tier: enqueues and reads, never renders
npm run worker     # render worker, separate process
npm run costs      # cost and margin report
npm run retention  # daily: purge photos past 30 days, outputs past 90
```

Visit `/` to pick a template, `/admin/costs?token=$ADMIN_TOKEN` for the dashboard.

### Configuration that matters

| Variable | Why |
|---|---|
| `VIDEO_PROVIDERS` | Comma-separated chain, primary first. **At least two are required** — the config throws otherwise. Model pricing and availability move monthly. |
| `COST_CEILING_PAISE` | Hard per-job ceiling. Default `9500` (₹95). |
| `STORAGE_DRIVER` | `local` for development, `s3` for R2 or S3. Both go through the same signed-URL contract. |
| `TTS_PROVIDER`, `MODERATION_PROVIDER` | `stub` variants run offline and cost nothing. |
| `NODE_ENV` | **Do not set this in `.env`.** Pinning it to `development` makes `next build` resolve the development React and the prerender fails. |

---

## How it is built

```
Next.js (App Router)  ──▶  Postgres  ◀──  render worker (own process)
      │                       │                    │
      │ presigned PUT         │ pg-boss queue      ├── VideoProvider  (fal ▸ replicate ▸ stub)
      ▼                       │                    ├── TtsProvider    (sarvam ▸ elevenlabs ▸ stub)
 Object storage  ◀────────────┴────────────────────┤── Moderation     (sightengine ▸ stub)
 (S3-compatible)                                   └── Compositor     (Chromium title cards + ffmpeg)
```

- **Nothing renders in a request.** The web tier writes a row and a queue message.
- **Queue is pg-boss on the same Postgres.** No Redis. Job state is transactional with domain state.
- **Templates are JSON, validated by Zod at boot.** A malformed or over-budget template fails the process at startup, not at render time with a family waiting. The shot vocabulary is closed: new templates need no code, new *capability* does.
- **Title cards are rendered in headless Chromium**, one frame at a time with animations driven through the Web Animations API, then composited by ffmpeg. Not for polish — `drawtext` renders Kannada and Devanagari conjuncts broken or as tofu. It also buys the full CSS animation vocabulary the storyboards call for. Only the animating window of a card is captured; the still tail is cloned.

### The no-likeness rule

v1 never generates a human face. Generative shots depict **objects and environments** — a cradle, a lamp, the sea, a kalash. This is enforced in three places, not one:

- `GenerativeShot.subject` has no `"person"` member, so it cannot be authored.
- The template schema rejects any generative prompt that names a human subject or omits its explicit `no people` exclusion.
- A test asserts both across all four templates.

### Privacy and retention

Uploaded photos are hard-deleted **30 days** after upload; rendered videos are kept **90 days**. EXIF, including GPS, is stripped on ingest. Every upload passes a moderation gate **before** a job can be queued. `npm run retention` is what makes those statements true — schedule it daily.

---

## Layout

```
prd.md                      product spec, competitive study, open decisions
db/migrations/              plain SQL, applied in order
scripts/render-brief.ts     milestone 1: JSON brief -> MP4, offline
scripts/retention.ts        the 30/90-day purge
src/lib/templates/          the storyboards (JSON) + the schema that validates them
src/lib/render/             ffmpeg, Chromium title cards, motion, the pipeline
src/lib/cost/               price table, ledger, ceiling, margin reporting
src/lib/providers/          video, TTS, payments — each behind an interface
worker/index.ts             the render worker
tests/                      template budget, ceiling, no-likeness, Indic dates
```

## Known gaps before launch

See **[docs/known-gaps.md](./docs/known-gaps.md)**. The short list: the music beds are placeholders, the Konkani strings and the Konkani voice need native review, and no real family has used it yet (milestone 7).
