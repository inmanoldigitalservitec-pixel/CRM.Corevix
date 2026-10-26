import assert from "node:assert/strict";
import test from "node:test";
import {
  canTransitionProposalStatus,
  getProposalStatusLabel,
  hasEffectiveProposalApproval,
} from "../src/lib/proposals/status.ts";

test("proposal status labels are localized while stored values stay unchanged", () => {
  assert.equal(getProposalStatusLabel("Draft"), "Borrador");
  assert.equal(getProposalStatusLabel("Sent"), "Enviada");
  assert.equal(getProposalStatusLabel("Viewed"), "Vista");
  assert.equal(getProposalStatusLabel("Approved"), "Aprobada");
  assert.equal(getProposalStatusLabel("Accepted"), "Aceptada");
  assert.equal(getProposalStatusLabel("Rejected"), "Rechazada");
  assert.equal(getProposalStatusLabel("Expired"), "Vencida");
  assert.equal(getProposalStatusLabel("Legacy"), "Legacy");
});

test("effective approval prevents transitions to every non-approved state", () => {
  for (const approvedStatus of ["Approved", "Accepted", "approved", " accepted "]) {
    assert.equal(hasEffectiveProposalApproval(approvedStatus), true);
    for (const previousStatus of ["Draft", "Sent", "Viewed", "Rejected", "Expired"]) {
      assert.equal(canTransitionProposalStatus(approvedStatus, previousStatus), false);
    }
    assert.equal(canTransitionProposalStatus(approvedStatus, "Approved"), true);
    assert.equal(canTransitionProposalStatus(approvedStatus, "Accepted"), true);
  }
});

test("an approval timestamp protects legacy or inconsistently labeled rows", () => {
  assert.equal(hasEffectiveProposalApproval("Sent", "2026-10-25T12:00:00Z"), true);
  assert.equal(canTransitionProposalStatus("Sent", "Draft", "2026-10-25T12:00:00Z"), false);
});

test("unapproved proposals retain ordinary status transitions", () => {
  assert.equal(canTransitionProposalStatus("Draft", "Sent"), true);
  assert.equal(canTransitionProposalStatus("Viewed", "Rejected"), true);
  assert.equal(canTransitionProposalStatus("Draft", "Draft"), true);
});
