# TODO — where this was left

Last verified state: **840b499**, on `main`, pushed.
`npm run typecheck`, `npm test` (42) and `npx next build` all pass at that commit.

The source of truth for outstanding design work is
**[docs/review/ux-refinement.md](docs/review/ux-refinement.md)** — 40 findings, each with
`Actions` (real files and values) and an observable `Done when`. Product-side work is in
[docs/review/pm-backlog.md](docs/review/pm-backlog.md) and the consolidated
[docs/review/dev-backlog.md](docs/review/dev-backlog.md).

---

## Pick up here

A developer was part-way through a batch of five findings when work stopped. **F18 and F20
are done and committed.** The remaining three were not started, or barely:

| # | What | State | Where |
|---|---|---|---|
| **F19** | Samples still advertise literal "PHOTO 1" artwork in the shop window | `scripts/make-fixtures.ts` and `scripts/render-samples.ts` were edited but the new imagery was never generated or re-rendered | `fixtures/photos/`, `public/samples/` |
| **F21** | Native Chrome control bar sits inside the hand-built bezel at the ₹499 moment | not started | `src/components/JobView.tsx` |
| **F22** | A family cannot fix a misspelt name | not started | `src/components/JobView.tsx` |

**Do F19 first, and re-run `npx tsx scripts/render-samples.ts` afterwards** — the templates
were re-grounded in 840b499, so every committed sample in `public/samples/` is still rendered
on the old near-black fields and is now stale.

F22 is the one worth caring about: `/terms` **explicitly promises** a free re-render,
`PATCH /api/events?id=` already exists and works, the server-side free-re-render policy is
already enforced, and the `rerender.free` string is already translated into all four
languages. Only the UI is missing. It returns 409 while a render is queued or running —
respect that.

---

## The click budget, measured

| Task | Today | Target |
|---|---|---|
| Land → watch a sample | **impossible** under reduced-motion or `saveData` | 0–1 |
| Land → start a trailer | 2 | 1 |
| Fill brief → queue render | **28 taps, ~55 keystrokes** (16 are photos) | 15 |
| Preview → paid download | 8, including a full page reload | 5 |
| Fix a misspelt name | **impossible** | 3 |
| Find last week's trailer | **no entry point** | 1 |

Three of those are broken promises rather than slow paths. The sample tiles are
`controls:false`, `tabIndex:-1`, `aria-hidden:true`, so anyone on reduced-motion or
data-saver cannot watch the thing we are selling.

The biggest single win is **one multi-select photo picker** instead of eight separate file
inputs: 16 taps become 9.

---

## Launch blockers

These are not polish. Nothing ships until they are done.

1. **Merchant identity is a literal blank.** `src/lib/legal.ts` carries
   `[REGISTERED BUSINESS NAME]`, `[+91 XXXXX XXXXX]` and the rest, and `/terms`, `/refunds`
   and `/contact` render them verbatim. Razorpay will not activate a live account without a
   published legal name, address, phone, email, terms, refunds and privacy policy, and a
   family asked for ₹499 by a nameless website will not pay. `isPlaceholder()` is exported so
   a launch check can assert none survive.
2. **Real photography.** Every sample renders from synthetic gradients. They prove the
   mechanism, not the product. Needs licensed or consented photographs — and the no-likeness
   rule still applies to anything generated.
3. **Music is four synthesised drones.** `assets/music/*.m4a` are layered sines from
   `scripts/make-fixtures.ts`. Needs licensed or commissioned beds. No code change — drop the
   files in.
4. **Delivery is a `console.log`.** `src/lib/delivery.ts` prints the link at both moments.
   The *timing* is right (sent at enqueue, not only on success); the channels are stubs.
   Needs a transactional email provider and an approved WhatsApp Cloud API template.
5. **Konkani needs a native reader.** Strings were authored by hand and are unverified, and
   the voiceover falls back to a Marathi voice because Sarvam has no Konkani.
6. **Legal prose is English.** `/privacy` and `/refunds` carry translated plain-language
   summaries above the operative English and say which governs; `/terms` and `/contact` do
   not. Deliberate — a machine-translated refund clause we would not defend is worse than an
   honest English one — but it needs a lawyer per language before launch.

---

## Milestones still open

From `prd.md`: **milestone 7 — five real families use it and the feedback is written down.**
Nothing else is blocked by code. `docs/feedback/TEMPLATE.md` is ready for it.

---

## Things that will bite whoever picks this up

All of this is in `CLAUDE.md`; these are the ones that have actually caused bugs.

- **Never letter-space Indic.** Everything routes through `track()` in `cardStyles.ts`. This
  rule was violated for a long time by the `hero` case, which carried a flat `-0.01em` on
  every script — negative, so it tightened rather than split, which is why it survived two
  design reviews and a `CLAUDE.md` claiming the opposite.
- **Generation happens once per job, not once per aspect.** `genCache` in `pipeline.ts` is
  the only thing preventing a 2-shot template exported at two aspects from paying four times.
  Run `npx tsx scripts/check-cost-once.ts` before touching the pipeline.
- **`NODE_ENV` must never be pinned in `.env`** — it makes `next build` resolve the
  development React and the prerender dies on `/_global-error`.
- **Don't `git add -A` while a review agent is running.** Their scratch is gitignored now
  (`_*.ts`, `qa-*.ts`, `uxshot*.ts`, `.uxshots/`), but one such file has been committed before.

---

## How to get running again

The container is reclaimed between sessions; Postgres and the server will be down.

```bash
cd /home/user/chitrakathe
sudo apt-get install -y ffmpeg fonts-noto-core     # if ffmpeg is missing
pg_ctlcluster 16 main start                        # or: service postgresql start
set -a && . ./.env && set +a
npm run migrate
npx next build && npx next start -p 3000
```

A proxy env var breaks localhost: use `curl --noproxy '*'`, and `NO_PROXY='*'` for any node
script. Chromium for screenshots is at `/opt/pw-browsers/chromium-1194/chrome-linux/chrome`;
never run `playwright install`.
