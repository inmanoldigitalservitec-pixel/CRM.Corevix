export type CompanyTaxOption = {
  id: string;
  company_id: string;
  name: string;
  rate: number | string;
  tax_type: string | null;
  is_default: boolean;
};

function safeRate(value: unknown) {
  const rate = Number(value);
  return Number.isFinite(rate) && rate >= 0 ? rate : 0;
}

function normalizedRateKey(rate: number) {
  return rate.toFixed(4).replace(/0+$/, "").replace(/\.$/, "");
}

function taxNameIdentity(name: string) {
  return name
    .trim()
    .replace(/\s*[·•–—-]?\s*\d+(?:[.,]\d+)?\s*%\s*$/u, "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function formatTaxOptionLabel(tax: Pick<CompanyTaxOption, "name" | "rate">) {
  const name = String(tax.name || "Impuesto").trim();
  const formattedRate = safeRate(tax.rate).toLocaleString("es-DO", {
    maximumFractionDigits: 4,
  });
  if (/\d+(?:[.,]\d+)?\s*%\s*$/u.test(name)) return name;
  return `${name} ${formattedRate}%`;
}

/**
 * Collapse only rows that share company, type, rate, and the same tax name
 * after removing a trailing rate annotation (for example ITBIS vs ITBIS 18%).
 * The first row is preferred; the query orders defaults first. Original tax
 * rows and ids remain untouched for snapshots and legacy selections.
 */
export function dedupeEquivalentTaxOptions<T extends CompanyTaxOption>(taxes: T[]) {
  const options: T[] = [];
  const canonicalIdByTaxId = new Map<string, string>();
  const canonicalByIdentity = new Map<string, T>();

  for (const tax of taxes) {
    const identity = [
      tax.company_id,
      tax.tax_type || "",
      normalizedRateKey(safeRate(tax.rate)),
      taxNameIdentity(String(tax.name || "")),
    ].join("|");
    const canonical = canonicalByIdentity.get(identity);
    if (canonical) {
      canonicalIdByTaxId.set(tax.id, canonical.id);
      continue;
    }
    canonicalByIdentity.set(identity, tax);
    canonicalIdByTaxId.set(tax.id, tax.id);
    options.push(tax);
  }

  return { options, canonicalIdByTaxId };
}
