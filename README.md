# chitrakathe

Chitrakathe turns eight family photos and a short form into a 30-second vertical trailer for an Indian family function — a naming ceremony, a save-the-date, a first birthday, a housewarming — in Kannada, Konkani, Hindi or English.

It is template-first rather than prompt-first: the family picks a storyboard and fills in fields, and the storyboard already owns the shot list, timing, typography and motion.

[Docs](docs/) - [Known gaps](docs/known-gaps.md)

![The template gallery: four storyboard cards over gradient placeholders — the gallery shows palette gradients, not sample renders](docs/screenshots/gallery-desktop.png)

## Requirements

- Node 22+ (`engines.node` in `package.json`)
- PostgreSQL — one database serves both the domain tables and the pg-boss queue
- ffmpeg and ffprobe on disk; paths go in `FFMPEG_PATH` / `FFPROBE_PATH`
- Chromium, for shaping Kannada and Devanagari title cards; path goes in `CHROMIUM_PATH`
- Noto fonts covering Kannada and Devanagari — without them the title cards render tofu
- DejaVu Sans Bold at `/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf`, hardcoded by the watermark step
- No API keys are needed for a local run: video, TTS and moderation providers all default to stubs. Razorpay keys are needed for payment, Google OAuth keys for sign-in.

## Run it

```bash
git clone https://github.com/nvkudva/chitrakathe.git
cd chitrakathe
# Debian/Ubuntu; on other platforms install the same list by hand
sudo apt-get install -y ffmpeg fonts-noto-core fonts-dejavu-core chromium postgresql
npm install
cp .env.example .env    # fill in the variables below
createdb chitrakathe && npm run migrate
npm run dev             # web tier on port 3000
npm run worker          # render worker, its own process
```

A clean clone does not build yet — see Status.

Once it does, `npx tsx scripts/make-fixtures.ts` followed by `npm run render:brief -- fixtures/brief.namakarana.json` writes a playable 1080x1920 MP4 plus a watermarked preview and prints the cost ledger, with no database, queue or network.

## Configuration

| Variable | Required | What it is |
|---|---|---|
| `DATABASE_URL` | yes | Postgres connection; shared by the app and pg-boss |
| `APP_URL` | yes | Public base URL; the Google redirect URI must be `$APP_URL/api/auth/callback` |
| `SIGNING_SECRET` | yes | HMAC key for session cookies and signed storage URLs. Replace the `.env.example` default |
| `STORAGE_DRIVER` | yes | `local` or `s3` |
| `STORAGE_LOCAL_DIR` | local driver | Directory for uploads and renders |
| `S3_BUCKET`, `S3_REGION`, `S3_ENDPOINT`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_PUBLIC_BASE_URL` | s3 driver | Object store credentials and public base |
| `VIDEO_PROVIDERS` | yes | Comma-separated primary,secondary from `fal`, `replicate`, `stub` |
| `VIDEO_MODEL_PRIMARY`, `VIDEO_MODEL_SECONDARY` | non-stub video | Model ids; an unpriced model makes the ledger throw |
| `FAL_KEY`, `REPLICATE_API_TOKEN` | non-stub video | Provider keys |
| `TTS_PROVIDER`, `SARVAM_API_KEY`, `ELEVENLABS_API_KEY` | non-stub TTS | Voiceover provider and key |
| `MODERATION_PROVIDER`, `SIGHTENGINE_USER`, `SIGHTENGINE_SECRET` | non-stub moderation | Image moderation provider and key |
| `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET` | payments | Checkout and webhook verification |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | sign-in | OAuth web client |
| `PRICE_LAUNCH_PAISE`, `PRICE_RERENDER_PAISE` | yes | Prices, in integer paise |
| `COST_CEILING_PAISE` | yes | Hard per-job spend ceiling |
| `FFMPEG_PATH`, `FFPROBE_PATH`, `CHROMIUM_PATH` | yes | Binary locations |
| `ASSET_RETENTION_DAYS`, `OUTPUT_RETENTION_DAYS` | yes | Purge windows used by `npm run retention` |
| `ADMIN_TOKEN` | admin page | Guards `/admin/costs` |

## How it works

Three processes share one Postgres. The web tier under `src/app/api/` validates with zod, authorises, writes rows through `src/lib/repo.ts` and enqueues a job; `worker/index.ts` drains the render queue and calls `renderBrief` in `src/lib/render/pipeline.ts`; `scripts/retention.ts` runs as a cron and purges expired uploads and outputs. pg-boss lives in the same database (`src/lib/queue.ts`), so job state and domain state commit together and there is no Redis.

A render walks the storyboard in `src/lib/templates/*.json`. Most shots are the family's own photos under scripted camera motion; only one or two per trailer reach a generative video model. Title cards are rendered in headless Chromium and composited with ffmpeg, because `drawtext` cannot shape Kannada or Devanagari conjuncts. Spend is quoted and charged through `CostLedger` in `src/lib/cost/ledger.ts`, which refuses rather than exceed `COST_CEILING_PAISE`. Money is integer paise everywhere (`src/lib/money.ts`). Schema changes live in `db/migrations/` and are applied by `npm run migrate`.

## Status

Not runnable from a clean clone. `.gitignore` ignores `storage/` without a leading slash, so `src/lib/storage/` — imported by the worker, the retention script and five API routes — is not in the repository. Typecheck, build and CI cannot pass until it is committed.

Built and exercised locally: the storyboard pipeline, Indic title-card shaping, the cost ledger, the render-decision transaction, Razorpay webhook handling, Google sign-in, retention, and the per-language contact-sheet check (`scripts/check-languages.ts`).

Not built, or known broken:

- Delivery is logged, not sent. `src/lib/delivery.ts` prints the link; no email or WhatsApp provider is wired in.
- Music beds are synthesised placeholders, not a soundtrack.
- The gallery shows palette gradients, not sample renders.
- Konkani strings have not been reviewed by a native speaker, and Konkani voiceover uses a Marathi voice.
- A retried job builds a fresh ledger from an empty entry list, so a job that fails twice can spend up to three ceilings.
- One unlock payment marks every job on the event paid, so the conversion and margin figures on `/admin/costs` read high.
- `POST /api/events` is unauthenticated and has no rate limit.
- Tests are unit-only — five files over pure functions. No route handler, payment path or worker retry is covered.

No trailer has been rendered for a real paying family yet. `docs/known-gaps.md` records roughly 100s of title-card capture per aspect per trailer; that figure carries no date and is an estimate, not a benchmark.

## License

No licence file yet - all rights reserved.
