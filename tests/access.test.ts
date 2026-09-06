import { test } from "node:test";
import assert from "node:assert/strict";
import { isUuid, newAccessToken, EVENT_TOKEN_HEADER } from "../src/lib/auth/eventAccess.ts";

test("only real uuids reach a uuid column", () => {
  assert.equal(isUuid("6232e17c-3322-4aa6-8704-1e27f34b0e4c"), true);
  // Every one of these produced an unauthenticated 500 before the guard.
  for (const bad of ["not-a-uuid", "nope", "", "../../etc/passwd", "1", "6232e17c-3322-4aa6-8704"]) {
    assert.equal(isUuid(bad), false, `${bad} must not be treated as a uuid`);
  }
});

test("access tokens are long and unpredictable", () => {
  const a = newAccessToken();
  const b = newAccessToken();
  assert.equal(a.length, 48, "24 random bytes as hex");
  assert.notEqual(a, b);
  assert.match(a, /^[0-9a-f]+$/);
});

test("the token header name is stable", () => {
  // The client sends this on uploads, assets and render; renaming it silently
  // would lock every anonymous family out of finishing their own brief.
  assert.equal(EVENT_TOKEN_HEADER, "x-event-token");
});
