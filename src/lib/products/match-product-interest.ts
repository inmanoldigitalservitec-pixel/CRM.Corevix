function normalizeForMatch(input: string) {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}\s]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function uniqueStrings(values: string[]) {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const v of values) {
    const key = v.trim();
    if (!key) continue;
    const k = key.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(key);
  }
  return out;
}

export type ProductInterestInputProduct = {
  id: string;
  name?: string | null;
  category?: string | null;
  base_price?: number | null;
  keywords?: string[] | string | null;
};

export type MatchedProductInterest = {
  product: ProductInterestInputProduct;
  score: number;
  matchedKeywords: string[];
};

function coerceKeywords(raw: ProductInterestInputProduct["keywords"]): string[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return uniqueStrings(raw.filter(Boolean).map(String));
  if (typeof raw === "string") {
    return uniqueStrings(
      raw
        .split(/[,\n;|/]+/g)
        .map((s) => s.trim())
        .filter(Boolean),
    );
  }
  return [];
}

function keywordMatches(conversationTextNormalized: string, keywordRaw: string) {
  const keyword = normalizeForMatch(keywordRaw);
  if (!keyword) return false;

  if (keyword.includes(" ")) {
    return conversationTextNormalized.includes(keyword);
  }

  const escaped = keyword.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\\\$&");
  const re = new RegExp(`\\b${escaped}\\b`, "i");
  return re.test(conversationTextNormalized);
}

export function matchProductInterest({
  products,
  messages,
  topN = 3,
}: {
  products: ProductInterestInputProduct[];
  messages: Array<{ content?: string | null }>;
  topN?: number;
}): MatchedProductInterest[] {
  const conversationTextNormalized = normalizeForMatch(messages.map((m) => m?.content || "").join(" "));
  if (!conversationTextNormalized) return [];

  const scored: MatchedProductInterest[] = [];

  for (const product of products) {
    const keywords = coerceKeywords(product.keywords);
    if (!keywords.length) continue;

    const matchedKeywords: string[] = [];
    for (const kw of keywords) {
      if (keywordMatches(conversationTextNormalized, kw)) matchedKeywords.push(kw);
    }

    if (!matchedKeywords.length) continue;

    scored.push({
      product,
      score: matchedKeywords.length,
      matchedKeywords: uniqueStrings(matchedKeywords),
    });
  }

  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    const aName = a.product.name || "";
    const bName = b.product.name || "";
    return aName.localeCompare(bName);
  });

  return scored.slice(0, Math.max(0, topN));
}

