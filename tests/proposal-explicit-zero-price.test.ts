import assert from "node:assert/strict";
import test from "node:test";
import { renderProposalTemplateHtml } from "../src/components/proposals/proposal-template-rendering.ts";
import {
  hasExplicitPrice,
  isExplicitZeroPrice,
  resolveProposalItemPricing,
} from "../src/lib/proposals/explicit-zero-price.ts";

test("recognizes an explicitly entered zero price", () => {
  assert.equal(isExplicitZeroPrice(0), true);
  assert.equal(isExplicitZeroPrice("0"), true);
  assert.equal(isExplicitZeroPrice("0.00"), true);
  assert.equal(isExplicitZeroPrice(0, true), true);
  assert.equal(hasExplicitPrice("0", true), true);
});

test("does not label a missing or nonzero rate as free", () => {
  assert.equal(isExplicitZeroPrice(""), false);
  assert.equal(isExplicitZeroPrice("   "), false);
  assert.equal(isExplicitZeroPrice(null), false);
  assert.equal(isExplicitZeroPrice(undefined), false);
  assert.equal(isExplicitZeroPrice(25), false);
  assert.equal(isExplicitZeroPrice(0, false), false);
  assert.equal(hasExplicitPrice("", false), false);
});

test("renderer pricing uses proposal_data to distinguish free from unpriced lines", () => {
  const free = resolveProposalItemPricing(
    { item_name: "Courtesy service", rate: 0, amount: 0 },
    { rate: "0", priceSpecified: true },
  );
  const unpriced = resolveProposalItemPricing(
    { item_name: "Service", rate: 0, amount: 0 },
    { rate: "", priceSpecified: false },
  );

  assert.equal(free.label, "Sin costo");
  assert.equal(free.hasPrice, true);
  assert.equal(unpriced.label, "Tarifa pendiente");
  assert.equal(unpriced.hasPrice, false);
});

test("custom HTML renderer labels explicit zero and leaves missing price pending", () => {
  const html = renderProposalTemplateHtml(
    {
      content: "{proposal_items}",
      currency: "USD",
      proposal_data: {
        proposalItems: [
          { rate: "0", priceSpecified: true },
          { rate: "", priceSpecified: false },
        ],
      },
    },
    [
      { item_name: "Free item", quantity: 1, rate: 0, amount: 0 },
      { item_name: "Unpriced item", quantity: 1, rate: 0, amount: 0 },
    ],
  );

  assert.match(html, /Free item[\s\S]*?Sin costo/);
  assert.match(html, /US\$ 0\.00/);
  assert.match(html, /Unpriced item[\s\S]*?Tarifa pendiente/);
  assert.match(html, /Por definir/);
});
