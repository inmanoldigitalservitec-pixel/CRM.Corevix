import assert from "node:assert/strict";
import test from "node:test";
import { findLeadClientMatches } from "../src/lib/lead-client-match.ts";

test("finds email and phone matches together after normalization", () => {
  const matches = findLeadClientMatches(
    { email: "  QA@Example.Test ", phone: "+1 (849) 555-0197", whatsapp: "849 555 0197" },
    [
      {
        id: "client-1",
        email: "qa@example.test",
        phone: "8495550197",
        whatsapp: null,
      },
      {
        id: "client-2",
        email: "other@example.test",
        phone: null,
        whatsapp: "1-849-555-0197",
      },
      {
        id: "client-3",
        email: "unrelated@example.test",
        phone: "8495550111",
        whatsapp: null,
      },
    ],
  );

  assert.deepEqual(
    matches.map(({ client, reasons }) => ({ id: client.id, reasons })),
    [
      { id: "client-1", reasons: ["email", "phone"] },
      { id: "client-2", reasons: ["whatsapp"] },
    ],
  );
});

test("returns every possible candidate instead of choosing one implicitly", () => {
  const matches = findLeadClientMatches({ email: "same@example.test", phone: "8495550100" }, [
    { id: "first", email: "same@example.test", phone: null, whatsapp: null },
    { id: "second", email: "same@example.test", phone: null, whatsapp: null },
  ]);

  assert.deepEqual(
    matches.map(({ client }) => client.id),
    ["first", "second"],
  );
});

test("flags an exact email match even when both phone numbers are different", () => {
  const matches = findLeadClientMatches(
    { email: "f03-verify-r9k4@example.test", phone: "8495550101", whatsapp: null },
    [
      {
        id: "verify-client-r9k4",
        email: "f03-verify-r9k4@example.test",
        phone: "8495550102",
        whatsapp: null,
      },
    ],
  );

  assert.equal(matches.length, 1);
  assert.equal(matches[0].client.id, "verify-client-r9k4");
  assert.deepEqual(matches[0].reasons, ["email"]);
});
