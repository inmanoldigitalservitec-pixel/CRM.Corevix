import assert from "node:assert/strict";
import test from "node:test";
import {
  calculateEstimateDiscountAmount,
  normalizeEstimateDiscountValue,
} from "../src/lib/estimate-pricing.ts";

test("percentage estimate discount is calculated from subtotal and capped at 100%", () => {
  assert.equal(calculateEstimateDiscountAmount(100, 18, "percent", 15, "USD"), 15);
  assert.equal(calculateEstimateDiscountAmount(100, 18, "percent", 150, "USD"), 100);
  assert.equal(normalizeEstimateDiscountValue(100, 18, "percent", 150, "USD"), 100);
});

test("fixed discount is capped at subtotal plus tax and rounded to currency precision", () => {
  assert.equal(calculateEstimateDiscountAmount(100, 18, "fixed", 200, "USD"), 118);
  assert.equal(normalizeEstimateDiscountValue(100, 18, "fixed", 200, "USD"), 118);
  assert.equal(calculateEstimateDiscountAmount(100.5, 18.25, "fixed", 17.65, "DOP"), 18);
});

test("unknown and absent discount types have no discount", () => {
  assert.equal(calculateEstimateDiscountAmount(100, 18, "none", 5, "USD"), 0);
  assert.equal(normalizeEstimateDiscountValue(100, 18, "unsupported", 5, "USD"), 0);
});
