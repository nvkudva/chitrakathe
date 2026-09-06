# Chitrakathe — working notes

Read `prd.md` for what this is and `README.md` for how to run it. This file is
the stuff that is easy to break.

## Rules that are load-bearing

- **Nothing renders in a web request.** The web tier writes a row and a queue
  message. If you find yourself importing `render/pipeline` into `src/app`,
  stop.
- **`CostLedger` is the only thing allowed to spend money.** Every priced call
  quotes against it *before* it runs. Adding a paid provider means adding a
  price entry in `src/lib/cost/prices.ts` — an unpriced model throws, because
  the ceiling cannot be enforced against an unknown price.
- **No human likeness, ever.** `GenerativeShot.subject` has no `"person"`
  member; the template schema rejects prompts that name a human subject or omit
  their `no people` exclusion; a test asserts it. Three layers on purpose.
- **The master is rendered once.** Payment unlocks an existing file. If a code
  path renders again on purchase, it doubles the cost of the whole business.
- **Family-supplied text is never translated**, only rendered in the chosen
  script. Only the template's authored `strings` are localised.

## Things that will bite you

- **`NODE_ENV` must not be set in `.env`.** Pinned to `development` it makes
  `next build` resolve the development React and the prerender dies with a
  confusing `useContext of null` on `/_global-error`.
- **Indic text needs a shaping engine.** ffmpeg `drawtext` renders Kannada and
  Devanagari conjuncts broken or as tofu. Title cards go through headless
  Chromium for this reason, not for polish.
- **Never letter-space Indic.** Tracking splits ನಾಮಕರಣ into ನಾ ಮ ಕ ರ ಣ.
  `cards.ts` gates every `letter-spacing` on `script === "latin"`.
- **`zoompan` jitters at small zoom deltas** because it quantises per frame.
  `motion.ts` oversamples 2x to hide it. Do not "simplify" that away.
- **A filtergraph label is consumed once.** Splitting the voiceover for the
  sidechain needs `asplit`, not two references to `[vo]`.
- **Templates fail at boot, not at render time.** A bad JSON template throws
  when the registry loads. That is deliberate — better than failing with a
  family waiting.

## Checks

```bash
npm run typecheck
npm test                                  # budget, ceiling, no-likeness, dates
npx tsx scripts/check-languages.ts        # 4 templates x 4 languages, contact sheets
npm run render:brief -- fixtures/brief.namakarana.json   # full offline render
```

`check-languages` catches blank cards and text running off-frame mechanically,
but **shaping and wrapping need human eyes** — open the contact sheets it writes
to `var/language-check/`.

## Conventions

- Money is integer paise everywhere. Never floats, never rupees in the database.
- Storage keys are built by `keys.*` in `src/lib/storage/index.ts`; the
  retention job depends on those prefixes.
- Migrations are plain SQL applied in order. No ORM, no codegen step.
