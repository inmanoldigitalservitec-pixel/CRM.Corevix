import assert from "node:assert/strict";
import test from "node:test";
import { fetchAllPages } from "../src/lib/fetch-all-pages.ts";

test("fetchAllPages requests every page past the default 200-row boundary", async () => {
  const rows = Array.from({ length: 202 }, (_, index) => ({ id: `task-${index + 1}` }));
  const requestedRanges: Array<[number, number]> = [];

  const result = await fetchAllPages(async (from, to) => {
    requestedRanges.push([from, to]);
    return rows.slice(from, to + 1);
  }, 200);

  assert.deepEqual(requestedRanges, [
    [0, 199],
    [200, 399],
  ]);
  assert.equal(result.length, 202);
  assert.equal(result[201]?.id, "task-202");
});

test("fetchAllPages detects completion after a full page", async () => {
  const requestedRanges: Array<[number, number]> = [];
  const result = await fetchAllPages(async (from, to) => {
    requestedRanges.push([from, to]);
    return from === 0 ? Array.from({ length: 200 }, (_, index) => index) : [];
  }, 200);

  assert.equal(result.length, 200);
  assert.deepEqual(requestedRanges, [
    [0, 199],
    [200, 399],
  ]);
});
