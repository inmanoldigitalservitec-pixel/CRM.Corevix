import assert from "node:assert/strict";
import test from "node:test";
import { groupEstimatesByClient } from "../src/lib/client360-estimates.ts";

test("groups each estimate under its linked client and keeps unrelated documents separate", () => {
  const estimates = [
    { id: "EST-13", client_id: "client-prospect", status: "Converted", total: 750 },
    { id: "EST-14", client_id: "client-b12", status: "Draft", total: 1000 },
    { id: "unlinked", client_id: null, status: "Draft", total: 200 },
  ];
  const proposals = [
    { id: "PROP-3217", client_id: "client-prospect", status: "Approved", amount: 1000 },
  ];

  const byClient = groupEstimatesByClient(estimates);

  assert.deepEqual(byClient.get("client-prospect"), [estimates[0]]);
  assert.deepEqual(byClient.get("client-b12"), [estimates[1]]);
  assert.equal(byClient.has("client-unrelated"), false);
  assert.equal(
    [...byClient.values()].flat().filter((estimate) => estimate.id === "EST-13").length,
    1,
  );
  assert.equal(
    [...byClient.values()]
      .flat()
      .some((estimate) => proposals.some((proposal) => proposal.id === estimate.id)),
    false,
  );
  assert.equal(
    [...byClient.values()].flat().some((estimate) => estimate.status === "Converted"),
    true,
  );
  assert.equal(
    [...byClient.values()]
      .flat()
      .some((estimate) => estimate.status === "Draft" && estimate.total === 1000),
    true,
  );
});
