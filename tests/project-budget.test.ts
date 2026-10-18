import assert from "node:assert/strict";
import test from "node:test";
import { projectBudgetFromSale } from "../src/lib/crm/project-budget.ts";

test("project created from a DOP sale preserves its original budget and base conversion", () => {
  assert.deepEqual(
    projectBudgetFromSale(
      {
        value: 12_500,
        currency: "DOP",
        base_currency: "USD",
        exchange_rate: 60,
      },
      "USD",
      60,
    ),
    {
      budget: 12_500,
      budget_currency: "DOP",
      base_currency: "USD",
      exchange_rate: 60,
      budget_base: 208.33,
    },
  );
});

test("project budget uses the sale's recorded base amount when available", () => {
  const result = projectBudgetFromSale(
    {
      value: 12_500,
      currency: "DOP",
      base_currency: "USD",
      exchange_rate: 61.25,
      value_base: 204.08,
    },
    "USD",
    60,
  );

  assert.equal(result.budget, 12_500);
  assert.equal(result.budget_currency, "DOP");
  assert.equal(result.base_currency, "USD");
  assert.equal(result.exchange_rate, 61.25);
  assert.equal(result.budget_base, 204.08);
});

test("project budget falls back to the associated product currency when sale currency is absent", () => {
  const result = projectBudgetFromSale(
    { value: 12_500, base_currency: "USD", exchange_rate: 60 },
    "USD",
    60,
    "DOP",
  );

  assert.equal(result.budget, 12_500);
  assert.equal(result.budget_currency, "DOP");
  assert.equal(result.budget_base, 208.33);
});
