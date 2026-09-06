import { test } from "node:test";
import crypto from "node:crypto";
import assert from "node:assert/strict";
process.env.SIGNING_SECRET ??= "test-secret";
import { serialise, parse, newSession } from "../src/lib/auth/session.ts";

const user = { id: "11111111-1111-1111-1111-111111111111", email: "a@example.com", name: "A" };

test("a session round-trips", () => {
  const s = newSession(user);
  const got = parse(serialise(s));
  assert.equal(got?.userId, user.id);
  assert.equal(got?.email, user.email);
});

test("a tampered payload is rejected", () => {
  const token = serialise(newSession(user));
  const [payload, mac] = token.split(".");
  const forged = JSON.parse(Buffer.from(payload!, "base64url").toString());
  forged.userId = "22222222-2222-2222-2222-222222222222";
  const swapped = Buffer.from(JSON.stringify(forged)).toString("base64url") + "." + mac;
  assert.equal(parse(swapped), null, "changing the user id must invalidate the signature");
});

test("a truncated or absent token is rejected", () => {
  assert.equal(parse(undefined), null);
  assert.equal(parse(""), null);
  assert.equal(parse("nodot"), null);
  assert.equal(parse(".onlymac"), null);
});

test("an expired session is rejected", () => {
  const s = newSession(user);
  s.exp = Math.floor(Date.now() / 1000) - 1;
  assert.equal(parse(serialise(s)), null);
});

test("a token signed with a different secret is rejected", () => {
  // Config is memoised, so rather than swap the env mid-process, forge the
  // token the way an attacker would: a valid payload, a MAC from another key.
  const payload = Buffer.from(JSON.stringify(newSession(user))).toString("base64url");
  const forgedMac = crypto.createHmac("sha256", "not-our-secret").update(payload).digest("base64url");
  assert.equal(parse(`${payload}.${forgedMac}`), null);
});

test("the payload is not trusted before the signature is checked", () => {
  // A payload claiming a far-future expiry still fails without a valid MAC.
  const forged = Buffer.from(
    JSON.stringify({ userId: "x", email: "e@x.com", exp: 4102444800 })
  ).toString("base64url");
  assert.equal(parse(`${forged}.aaaa`), null);
});
