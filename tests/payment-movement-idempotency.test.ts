import assert from "node:assert/strict";
import test from "node:test";
import { createMovementIdempotencyKeyCache } from "../src/lib/payments/movement-idempotency.ts";

test("movement retries reuse a key for the same payload and rotate it when payload changes", () => {
  let nextKey = 0;
  const cache = createMovementIdempotencyKeyCache(() => `key-${++nextKey}`);
  const payload = {
    paymentId: "payment-1",
    amount: 25,
    reason: "Duplicate charge",
    reference: null,
  };

  const firstKey = cache.get(payload);
  assert.equal(cache.get({ ...payload }), firstKey);
  assert.equal(nextKey, 1);

  const changedKey = cache.get({ ...payload, amount: 20 });
  assert.equal(changedKey, "key-2");
  assert.notEqual(changedKey, firstKey);
  assert.equal(cache.get({ ...payload, amount: 20 }), changedKey);
  assert.equal(cache.get(payload), firstKey);

  cache.reset();
  assert.equal(cache.get(payload), "key-3");
});
