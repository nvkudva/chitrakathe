# Sign-in

Google only. One button, no passwords, no OTP. A family holding a function next
Saturday will not create an account with a password, and an SMS OTP costs money
per attempt and fails on the exact rural networks we care about.

## Why it is hand-rolled

The same reason Razorpay is: the flow is two redirects and a signed-token
check. An auth library would bring its own session store, its own tables and
its own opinions about our `users` table — and `users.id` is what `events`,
`payments`, `assets` and the retention clock all hang off.

The cryptography is **not** hand-rolled. `jose` verifies Google's RS256
signature against their published JWKS. What we own is the state/nonce
handshake and our own session cookie.

## The flow

1. `GET /api/auth/signin?returnTo=/t/<jobId>` — mints `state` and `nonce`, puts
   both in a 10-minute httpOnly cookie, redirects to Google. `returnTo` is
   rejected unless it is a path on this origin, so this cannot become an open
   redirect.
2. Google redirects to `GET /api/auth/callback`. The `state` must match the
   cookie — the query string alone is never trusted.
3. The code is exchanged, the ID token verified (`iss`, `aud`, `exp`, signature,
   and `nonce` against the cookie), and the profile upserted.
4. A session cookie is set: `<base64url payload>.<hmac>`, httpOnly, 30 days.

`SameSite=Lax`, not `Strict`: Google redirects the browser back cross-site and
`Strict` would drop the cookie on the callback. Nothing state-changing is a
top-level GET, so `Lax` is safe. Sign-out is POST-only for the same reason.

## Where the gate is

**At payment, not before.** A family can browse templates, fill the brief,
upload photos, wait out the render and watch the watermarked preview with no
account at all. Sign-in is required to pay and to download.

This is deliberate: forcing a Google account before someone has seen anything
costs conversion at the top of a funnel that is already 4–8 minutes long, and
we have nothing to protect until money and an unwatermarked file are involved.

Consequences, enforced in code:

- `POST /api/payments` — 401 without a session, 403 if the event belongs to
  another account.
- `GET /api/download/[jobId]` — same. Preview links get forwarded around a
  family WhatsApp group by design, so holding the job id must never be enough
  to get the master.
- `POST /api/events` — attaches the signed-in user when there is one, and only
  then are the email/phone fields optional.

## Account matching

`upsertGoogleUser` matches on `google_sub` first, then `email`. A family that
gave us an email before signing in keeps the same `users` row — and with it
their events, their payments and their retention clock. Without the email
fallback, signing in would silently orphan the trailer they just made.

## Configuration

```
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
APP_URL=https://...        # the redirect URI is $APP_URL/api/auth/callback, exactly
SIGNING_SECRET=...         # signs the session cookie; the dev default throws on https
```

Google Cloud Console → APIs & Services → Credentials → OAuth client (Web).
The authorised redirect URI must match `$APP_URL/api/auth/callback` character
for character.

When the credentials are absent, `/api/auth/signin` returns 503 and the UI
hides the button rather than offering a link that dead-ends.
