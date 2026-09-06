import { test } from "node:test";
import assert from "node:assert/strict";
import { CostLedger, CostCeilingExceeded } from "../src/lib/cost/ledger.ts";
import { videoPrice } from "../src/lib/cost/prices.ts";
import { gatewayFeePaise, marginPct, usdToPaise } from "../src/lib/money.ts";

test("the ceiling refuses rather than overruns", async () => {
  const ceiling = 9500;
  const l = new CostLedger("t", async () => {}, ceiling);
  await l.chargeVideo("fal", "fal-ai/kling-video/v2.5/image-to-video", 3); // ~Rs 60
  await assert.rejects(
    () => l.chargeVideo("fal", "fal-ai/kling-video/v2.5/image-to-video", 3),
    CostCeilingExceeded
  );
  assert.ok(l.spentPaise <= ceiling, "a refused charge must not be recorded");
});

test("canAfford lets a shot degrade instead of failing the job", () => {
  const l = new CostLedger("t", async () => {}, 5000);
  assert.equal(l.canAfford(4999), true);
  assert.equal(l.canAfford(5001), false);
});

test("rendering with an unpriced model is refused", () => {
  assert.throws(() => videoPrice("fal", "some/model-nobody-priced"), /No price entry/);
});

test("the launch template's model spend fits under the ceiling", () => {
  // 2 generative shots x 5s on the primary model, per prd.md 9.
  const l = new CostLedger("t", async () => {}, 9500);
  const cost = l.quoteVideo("fal", "fal-ai/bytedance/seedance/v1/lite/image-to-video", 10);
  assert.ok(cost < 9500, `primary model costs ${cost}p, over the 9500p ceiling`);
  assert.ok(cost > 3000 && cost < 6000, `expected roughly Rs 46, got ${cost}p`);
});

test("launch price clears the margin claimed in the README", () => {
  const price = 49900;
  const model = usdToPaise(0.052 * 10, 89);
  const direct = model + 75 + 100 + 200 + 100; // tts, moderation, compute, storage
  const total = direct + gatewayFeePaise(price);
  assert.ok(marginPct(price, total) > 85, `margin fell to ${marginPct(price, total).toFixed(1)}%`);
});
