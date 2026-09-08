# Chitrakathe — PM review, round 3: root cause and prioritised backlog

Author: product review, walked as a customer on a 393×852 phone against the running app.
Scope of change: `docs/review/` only. Nothing else was touched.

---

## 1. Root cause

**The product never shows the thing it sells.** Every surface is a *statement about* the
render instead of *the render itself*. Measured on the live app: the first 852 px of `/`
contains one logo, a four-way language picker, an `<h1>`, two paragraphs and one gradient
rectangle — **zero `<img>`, zero `<video>`, zero faces, zero motion**. The whole home page
has `video: 0, img: []`. The four template cards are CSS gradients with a name on them. The
brief form is a **2,931 px** scroll of six empty fields and eight identical grey rows. The
first frame of moving picture a family ever sees arrives *after* they have signed in with
Google, curated eight ≥1080 px photos and waited 4–8 minutes. And when it finally arrives it
is represented by a black rectangle: `pipeline.ts:128` grabs the poster at a hardcoded
`-ss 1.2`, and three of the four storyboards open on a 2.5 s black title card — so the
`og:image` on the WhatsApp forward, the thumbnail in `/mine`, and the still behind the play
button are all *the darkest 1.2 seconds of the film*. The near-black interface is not the
disease; it is what makes the emptiness read as a void instead of as a gap. This is a
**video product with no video in it**, asking for maximum commitment before delivering any
value, from a buyer whose entire media diet — Instagram Reels, WhatsApp Status — has trained
her to judge in 1.5 seconds and to expect the thing before the ask. An unsubstantiated claim
is worth ₹0, not ₹499.

Two contributing causes, both real and both fixable:

- **The engineering is optimised for the cost ledger, and the UX inherited its vocabulary.**
  The refusal message shown to a family reads "It would have cost more than we allow
  ourselves to spend on one trailer." That is an internal P&L constraint leaking into a
  baby's naming ceremony.
- **The output itself is as dark as the chrome.** The two frames chosen for the README are
  both title cards on near-black. A namakarana is turmeric, jasmine, silk and brass. The
  storyboards spend their most valuable seconds — the open and the close — on black.

## 2. The emotional job

They are not buying a video. They are buying **the right to announce, and the reaction that
follows** — "who made this?!" in the family group at 11 pm. Two moments carry it: seeing
their child's name in cinema type for the first time, and watching the replies arrive.

| Step | What the family feels now |
|---|---|
| Land | Nothing. There is nothing to feel *about*. A claim and four coloured tiles. |
| Language picker (first control on the page) | Interrogated before being given anything. |
| Pick a template | Guessing. They are choosing an outcome they have never seen. |
| Fill the brief | **Anticipation dies here.** Six fields and eight labelled empty boxes, all mandatory, is a government form, and the copy warns them their photos may be blurry and that we will not generate faces — two fears they did not arrive with. |
| Sign in with Google | A toll gate before any value has been delivered. |
| Wait 4–8 min | A 2 px progress bar and one line of text. Their photos — the only thing they care about — are invisible for the whole wait. |
| First sight of the trailer | A **black poster frame** and a play button. The single most emotional moment in the product is rendered as an empty rectangle. |
| Paywall | The preview has `CHITRAKATHE PREVIEW` tiled diagonally three times across their baby's face. It looks pirated, not previewed. |
| Share | A WhatsApp card whose image is that same black frame. |

**It is killed outright twice:** at the form (commitment before value) and at the poster
frame (the payoff delivered as a void).

## 3. The ₹499 question

**It reads as a free tool — and specifically as an unfinished one.** What destroys the price:

- No imagery anywhere. Paid products show their work; free tools describe it.
- **No merchant identity.** `/contact` and `/terms` render the literal strings
  `[REGISTERED BUSINESS NAME]` and `[REGISTERED ADDRESS, CITY, KARNATAKA, PIN]`. A family
  that taps "Contact" before paying will not come back. (Correctly flagged in
  `known-gaps.md` as pre-launch — restating it here because it is a *pricing* problem, not
  only a compliance one.)
- Zero proof: no count of trailers made, no family quote, no dated example, no faces.
- The watermark is a spam-grid, not a preview mark. It signals "cheap" about *our* product.
- The paid artefact is never shown next to the free one, so ₹499 buys an abstraction.
- `/mine` — the returning-customer surface for a video product — is a list of **text rows**.

What *creates* value and is currently invisible: the eight art-directed photo slots
("a wide, uncluttered photo — the date goes over this one") are genuinely a studio brief and
nobody else does this; the Kannada shaping is better than anything in the category; the
per-ritual storyboards are the moat. All three are only discoverable by *reading*. Against
the reference set an Indian family sees hourly — a wedding invite reel, a Canva template
carousel, a photographer's Instagram grid — this page is text on black.

## 4. First ten seconds, from a WhatsApp forward on a mid-range Android

**Now:** logo, four language chips, "A trailer for your family function. Minutes, not days.",
two paragraphs, and the top edge of a maroon rectangle. Nothing has moved. Nothing is a
photograph. She is one thumb-flick from leaving.

**Should be:** a 9:16 sample trailer, **autoplaying muted, looping, poster-first so it paints
in <400 ms**, filling roughly 60 % of the first screen — a real namakarana, a real baby, real
turmeric and jasmine, ending on a Kannada name reveal. Under it, one line ("ನಿಮ್ಮ ಮಗುವಿನ
ಹೆಸರಿಗೂ ಹೀಗೊಂದು — 8 ಫೋಟೋ, 10 ನಿಮಿಷ") and one button. Language auto-detected from
`Accept-Language`, with a small "ಬದಲಿಸಿ / change" link, not a four-way quiz. Proof
immediately below the fold: three more sample trailers as tap-to-play tiles, and a count.

## 5. What to cut

- **The language picker as the first control.** Detect, don't interrogate. Keep a change link.
- **The second language switcher inside the form.** It is asked twice, 200 px apart.
- **The all-or-nothing eight-photo wall.** Four required, four optional with sensible reuse.
- **The inline "we never generate a face" paragraph mid-form.** It plants a fear at the exact
  moment we need momentum. Move it to a trust strip near the pay button, where it earns money.
- **The 30/90-day retention line in the global footer.** Legal copy on every screen. It
  belongs on the upload step and in `/privacy`.
- **Cost-ceiling language in customer copy.** "It would have cost more than we allow
  ourselves to spend" must become "Something went wrong on our side. You have not been
  charged — we'll make this by hand today."
- **The gradient "poster" divs on the template cards.** They occupy the most valuable
  rectangle on the page and carry no information; they are why the eye has nowhere to land.

---

## 6. Prioritised backlog

Ordered by impact per unit of effort. **★ = would change the client's mind on its own.**

| # | Task | Size |
|---|---|---|
| 1 ★ | Hero sample trailer, autoplaying | M |
| 2 ★ | Real sample video on every template card + watch-before-you-start | M |
| 3 | Poster frame chosen per template, not at t=1.2 s | S |
| 4 | No template opens on black | S |
| 5 ★ | Live storyboard preview while they fill the form | L |
| 6 ★ | The wait becomes a show | M |
| 7 ★ | The delivery moment | M |
| 8 | Watermark redesign + branded end card | S |
| 9 | Merchant identity and a trust strip at the pay button | S |
| 10 | Proof block on the home page | M |
| 11 | Show the difference at the paywall | S |
| 12 | Music choice, audible before render | M |
| 13 | `/mine` with poster thumbnails | S |
| 14 | Language auto-detect; demote the picker | S |
| 15 | Split the brief into three steps | M |
| 16 | Four required photos, four optional | M |
| 17 | Look variants per template | M |
| 18 | Second trailer for the same family | M |
| 19 | Download screen worth the ₹499 | M |
| 20 | Countdown to the function | S |
| 21 | Rewrite failure and refusal copy | S |
| 22 | Photo-quality feedback that helps instead of scolding | S |
| 23 | Gift a trailer | M |
| 24 | Named-guest variants (v2 revenue) | L |
| 25 | Sample-trailer WhatsApp share as an acquisition loop | S |

---

### 1 ★ Hero sample trailer, autoplaying — **M**
Put a 9:16 sample above the fold on `/`, `<video autoplay muted loop playsinline preload="metadata">`
with a `poster` JPEG so the first paint is an image, capped at ~1.5 MB for a 3G Android, with a
tap-to-unmute chip. It must be a *real-looking* namakarana with real photographs, not the
fixture render (whose eight shots are literally captioned `PHOTO 1`…`PHOTO 8`). Commission or
license one family's worth of stills per template and render four samples with the existing
pipeline.
**Why:** this is the whole product demonstration, delivered in the 1.5 seconds the buyer
actually gives us. Every other conversion number in the funnel is downstream of it.

### 2 ★ Real sample video on every template card + watch-before-you-start — **M**
Replace the gradient div in `src/app/page.tsx` with the template's sample: a looping muted
6-second cut as the card image, and a "ಪೂರ್ತಿ ನೋಡಿ / Watch all 32s" affordance that opens the
full sample in a sheet with sound. The primary button in that sheet starts the brief.
**Why:** `known-gaps.md` already calls this "the single highest-leverage conversion change
available" and it is still open. Choosing a template you have never seen is the largest
unforced abandonment in the funnel.

### 3 Poster frame chosen per template, not at t=1.2 s — **S**
`pipeline.ts:128` hardcodes `-ss 1.2`. Add `posterAt` (seconds) to the template schema, set it
to the peak frame per storyboard — the name reveal for namakarana, the date for save-the-date —
and use it for the poster, the `og:image`, `/mine` thumbnails and the `<video poster>`.
**Why:** the image representing this product on WhatsApp, in the gallery of trailers, and
behind every play button is currently a black frame. One field, one flag, disproportionate
recovery of perceived quality.

### 4 No template opens on black — **S**
Three of four storyboards begin with a 2.5 s black title card. Cut the opening card to ≤0.8 s
and composite it over the *next* shot's first frame, or reorder so an image leads. Assert in
the template schema test that the first 1000 ms of every template contains a photo or
generative source.
**Why:** WhatsApp Status autoplays muted and users swipe in about a second. 2.5 s of black is
the growth loop dying before it starts — and it also means the family's own share gets no
reaction, which is the outcome they paid for.

### 5 ★ Live storyboard preview while they fill the form — **L**
As each photo lands in a slot, render it client-side into the exact crop and Ken Burns motion
that shot will use, in a sticky 9:16 phone-shaped frame at the top of the form; as names, date
and venue are typed, live-render the title cards into the same frame using the real fonts.
Ship it as a canvas/CSS approximation — it does not need to be frame-accurate, it needs to be
*theirs*.
**Why:** it converts the form from a toll into a toy, it is the single strongest answer to
"feature rich", and it delivers the emotional payoff (seeing their child's name in cinema type)
*before* the render spend rather than after it. Also directly protects the 68 % blended margin:
families who have already seen it work do not abandon after we pay for the render.

### 6 ★ The wait becomes a show — **M**
Replace the 2 px bar with a full-bleed 9:16 stage that cross-fades through *their own uploaded
photos* under slow push-ins while the stage name changes ("Shooting scene 4 of 10 — grandparents'
blessing"), plus a live shot counter and a real ETA. Add a "we'll WhatsApp you the link" line so
leaving is safe.
**Why:** 4–8 minutes is the highest-risk window in the product; every family that closes the tab
costs ₹51 of render with zero chance of the ₹499. It also builds anticipation instead of
draining it, which is worth more at the paywall than any discount.

### 7 ★ The delivery moment — **M**
Rebuild `/t/[jobId]`: full-bleed video on the peak poster, tap-to-play with sound, a headline
that names the child ("ಆದ್ವಿಕ್ — ನಾಮಕರಣ"), then a share row (WhatsApp, Status, Instagram,
copy link) *above* the paywall, and the pay button as a warm, confident card rather than a
bare button under a paragraph of watermark apology.
**Why:** this is the moment the buying decision is made, and today it is a black rectangle and
a paragraph of small print. Putting share above pay also seeds the loop even from families who
do not convert.

### 8 Watermark redesign + branded end card — **S**
Replace the 3× diagonal `CHITRAKATHE PREVIEW` grid (`pipeline.ts:467`) with one small
bottom-corner wordmark at 45 % opacity plus a 1.2 s end card on the *preview only*. Add a
tasteful 1.0 s "ಚಿತ್ರಕಥೆ · chitrakathe.in" end card to the **paid master** too.
**Why:** the current mark makes a family's baby look pirated, which prices the product at zero.
The end card on the paid file is the only attribution that ever reaches a WhatsApp group — free
acquisition on every video sold.

### 9 Merchant identity and a trust strip at the pay button — **S**
Fill every field in `src/lib/legal.ts` and add a three-item strip beside the ₹499 button:
"UPI · Razorpay", "If we can't finish it, you are not charged", "Your photos are deleted in 30
days". Move the no-face-generation promise here from mid-form.
**Why:** a ₹499 payment to a site whose contact page says `[REGISTERED BUSINESS NAME]` will not
happen, and Razorpay will not activate the account either. Trust claims are worth money at the
button and cost momentum in the form.

### 10 Proof block on the home page — **M**
Below the hero: a live count ("312 trailers made this month"), three real family clips with
first names, town and function, and two verbatim WhatsApp-style quotes with the reply thread
visible.
**Why:** the category the buyer compares against is a photographer's Instagram grid, which is
100 % proof. We currently ship 0 %. Seed with the five Milestone-7 families.

### 11 Show the difference at the paywall — **S**
A two-up strip at the pay card: the same 4-second beat, watermarked on the left and clean on the
right, with a slider or a tap-to-swap.
**Why:** ₹499 currently buys an abstraction ("without our name across it"). Making the delta
visible is the cheapest possible conversion lift on a decision that is already 90 % made.

### 12 Music choice, audible before render — **M**
Expose the four beds as tappable 8-second auditions in the brief (or on the wait screen for a
free re-render), defaulting to the template's authored bed. Also fills the
`known-gaps.md` placeholder-music slot with a reason to license properly.
**Why:** the highest-value personalisation control that cannot break the art direction — it
makes a template-first product feel bespoke without letting a family art-direct badly.

### 13 `/mine` with poster thumbnails — **S**
Show each trailer as a 9:16 poster tile with a status chip and a share button, not a text row.
Add the same card to the signed-out state as a teaser.
**Why:** the returning surface of a video product currently contains no video, and repeat/second-
event purchase starts here.

### 14 Language auto-detect; demote the picker — **S**
Read `Accept-Language`, set the language, and render a single "ಬದಲಿಸಿ / change" link near the
footer with the four options in a sheet. Remove the duplicate switcher from the brief form and
keep only the *video language* control, clearly labelled.
**Why:** the first control on the page is currently a quiz that precedes any value, and the same
question is asked twice. It costs the hero its position.

### 15 Split the brief into three steps — **M**
Details → Photos → Confirm, with a step indicator, a sticky "Continue" bar, and the sticky
preview from #5 persisting across all three. Save partial state to `localStorage` keyed by
template so a dropped connection does not lose the work.
**Why:** a 2,931 px single scroll on a phone reads as work. Three short screens with visible
progress read as a guided studio brief — the same data, a different feeling.

### 16 Four required photos, four optional — **M**
Make slots 1–4 required and 5–8 optional; when a montage slot is empty, reuse an earlier photo
with a different crop, and say so ("we'll use photo 2 again here — add a different one if you
like"). Keep the labelled roles.
**Why:** eight mandatory ≥1080 px photos, chosen to a brief, from a phone, is the largest
single drop-off in the funnel and the reason families abandon at 60 % complete.

### 17 Look variants per template — **M**
Two or three authored palette/type variants per storyboard ("Traditional Udupi", "Modern
Ivory", "Turmeric & Gold") chosen on the template card, each with its own sample. Palette and
type tokens only — no change to the shot list.
**Why:** doubles the perceived catalogue from 4 to ~10 for editorial effort only, and gives the
family a real choice that cannot produce a bad video. Directly answers "feature rich".

### 18 Second trailer for the same family — **M**
From `/mine`, "Make another for this family": pre-fills names and reuses the already-uploaded
photos against a different template, at ₹299. Also offer the free re-render explicitly as a
button, not as a policy line.
**Why:** the only repeat revenue in a once-per-event product, at near-zero acquisition cost, and
it raises LTV against the ₹157 blended cost per paying family.

### 19 Download screen worth the ₹499 — **M**
After payment: both aspects as labelled tiles ("WhatsApp Status 9:16", "Instagram 1:1"), a
one-tap "Share to WhatsApp", a high-resolution still from the name-reveal frame as a printable
JPEG card, and a permanent link with the 90-day expiry stated plainly.
**Why:** the moment after paying is where regret or delight is set. A bare download link makes
₹499 feel like it bought a file; three artefacts make it feel like it bought a deliverable.

### 20 Countdown to the function — **S**
Once the date is entered, show "Your function is in 9 days" in the brief, on the wait screen and
on the trailer page; if the date is inside 3 days, surface a "we'll prioritise this" line.
**Why:** this buyer is defined by a deadline 2–21 days out. Naming it converts a browse into a
task, and it is two lines of code.

### 21 Rewrite failure and refusal copy — **S**
`job.refusedBody` currently explains our internal cost ceiling to the customer. Replace with:
"Something went wrong on our side and you have not been charged. Send us a message and we'll
make it by hand today." Keep the true internal reason in the admin view only.
**Why:** a family reading about our spending limits at their baby's naming is the clearest
possible symptom of an engineering-led interface, and it is free to fix.

### 22 Photo-quality feedback that helps instead of scolding — **S**
Replace "This one is only 640px and will look blurry" with an inline thumbnail, a soft warning
badge, and a "use it anyway" option; keep the hard block only below ~600 px. Show the actual
crop the shot will take.
**Why:** the current rule rejects the photo outright and blames the family for using WhatsApp —
at the exact moment they were about to hand us money.

### 23 Gift a trailer — **M**
"Gift this to them": payer enters recipient's phone, gets a link they can send; recipient fills
the brief. Prepaid code redeemed at the paywall.
**Why:** the aunt, the sibling and the maternal uncle are all natural buyers for a namakarana
they are not organising. It opens a second buyer for the same event at no extra render cost.

### 24 Named-guest variants (v2 revenue) — **L**
Ship the `partner_code` path and, separately, a "personalise the last card with a guest's name"
add-on: 10 named variants for ₹199, re-rendering only the final title card from the cached
master.
**Why:** the highest-margin upsell available — one Chromium card re-render, no model spend — and
it is the feature that makes people call and ask who made it. Sequence after real families exist.

### 25 Sample-trailer WhatsApp share as an acquisition loop — **S**
Add a share button to each sample on the gallery with a pre-filled message
("ನೋಡು ಇದನ್ನ — ₹499ಕ್ಕೆ ಟ್ರೈಲರ್") and a proper OG card, so a family that is *not* buying today
can still forward it to the cousin who is.
**Why:** the growth loop currently depends on a paying customer's share; this gives the 95 % who
bounce a way to be useful, and it costs a button.
