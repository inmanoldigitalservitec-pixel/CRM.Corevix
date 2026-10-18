import assert from "node:assert/strict";
import test from "node:test";
import { withoutProductWorkflowSteps } from "../src/lib/proposals/proposal-data.ts";

test("removes legacy product workflow steps while preserving manual process text", () => {
  const saved = withoutProductWorkflowSteps({
    processSteps: [{ title: "Legacy product workflow step" }],
    processText: "Manual proposal process written by the user.",
    initialStageText: "Manual discovery stage.",
  });

  assert.equal("processSteps" in saved, false);
  assert.equal(saved.processText, "Manual proposal process written by the user.");
  assert.equal(saved.initialStageText, "Manual discovery stage.");
});
