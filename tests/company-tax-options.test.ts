import assert from "node:assert/strict";
import test from "node:test";
import {
  dedupeEquivalentTaxOptions,
  formatTaxOptionLabel,
  type CompanyTaxOption,
} from "../src/lib/company-tax-options.ts";

const makeTax = (
  overrides: Partial<CompanyTaxOption> & Pick<CompanyTaxOption, "id" | "name">,
): CompanyTaxOption => ({
  id: overrides.id,
  name: overrides.name,
  company_id: overrides.company_id || "company-1",
  rate: overrides.rate ?? 18,
  tax_type: overrides.tax_type ?? "sales",
  is_default: overrides.is_default ?? false,
});

test("ITBIS labels do not repeat a percentage already present in the name", () => {
  assert.equal(
    formatTaxOptionLabel(makeTax({ id: "1", name: "ITBIS 18%", rate: 18 })),
    "ITBIS 18%",
  );
  assert.equal(formatTaxOptionLabel(makeTax({ id: "2", name: "ITBIS", rate: 18 })), "ITBIS 18%");
});

test("equivalent tax aliases collapse in the selector while preserving stored ids", () => {
  const canonical = makeTax({ id: "tax-default", name: "ITBIS", rate: 18, is_default: true });
  const alias = makeTax({ id: "tax-legacy", name: "ITBIS 18%", rate: 18 });
  const { options, canonicalIdByTaxId } = dedupeEquivalentTaxOptions([canonical, alias]);

  assert.deepEqual(
    options.map((tax) => tax.id),
    ["tax-default"],
  );
  assert.equal(canonicalIdByTaxId.get("tax-legacy"), "tax-default");
  assert.equal(alias.id, "tax-legacy");
});

test("taxes with a different rate, company, or semantic name remain distinct", () => {
  const taxes = [
    makeTax({ id: "a", name: "ITBIS", rate: 18 }),
    makeTax({ id: "b", name: "ITBIS", rate: 16 }),
    makeTax({ id: "c", name: "ITBIS", rate: 18, company_id: "company-2" }),
    makeTax({ id: "d", name: "Retención ITBIS", rate: 18 }),
  ];
  assert.deepEqual(
    dedupeEquivalentTaxOptions(taxes).options.map((tax) => tax.id),
    ["a", "b", "c", "d"],
  );
});
