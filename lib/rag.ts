import { loadKnowledgeBase, KnowledgeChunk } from "./knowledge-base";

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 1);
}

function computeIdf(docCount: number, docFreq: number): number {
  return Math.log(1 + (docCount - docFreq + 0.5) / (docFreq + 0.5));
}

function computeBm25(
  queryTokens: string[],
  docTokens: string[],
  idfMap: Map<string, number>,
  k1 = 1.5,
  b = 0.75
): number {
  const avgdl = 200;
  const dl = docTokens.length;
  const tokenCounts = new Map<string, number>();

  for (const t of docTokens) {
    tokenCounts.set(t, (tokenCounts.get(t) || 0) + 1);
  }

  let score = 0;
  for (const token of queryTokens) {
    // Exact match via IDF map
    const exactIdf = idfMap.get(token) || 0;
    const exactFreq = tokenCounts.get(token) || 0;
    if (exactFreq > 0) {
      score += exactIdf * ((exactFreq * (k1 + 1)) / (exactFreq + k1 * (1 - b + (b * dl) / avgdl)));
      continue;
    }

    // Prefix match: find doc tokens that start with this query token
    // e.g. query "fiberf" matches doc token "fiber", "fibernet" etc.
    for (const [docToken, freq] of tokenCounts) {
      if (docToken.startsWith(token) || token.startsWith(docToken)) {
        const idf = idfMap.get(docToken) || 0;
        // Apply a discount for prefix match
        const prefixScore = idf * ((freq * (k1 + 1)) / (freq + k1 * (1 - b + (b * dl) / avgdl))) * 0.7;
        score += prefixScore;
        break;
      }
    }
  }

  return score;
}

export function retrieveRelevantChunks(query: string, topK = 5): KnowledgeChunk[] {
  const kb = loadKnowledgeBase();
  if (kb.chunks.length === 0) return [];

  const queryTokens = tokenize(query);
  if (queryTokens.length === 0) return [];

  const docFreq = new Map<string, number>();
  const allDocTokens: string[][] = [];

  for (const chunk of kb.chunks) {
    const text = `${chunk.title} ${chunk.content}`;
    const tokens = tokenize(text);
    allDocTokens.push(tokens);

    const uniqueTokens = new Set(tokens);
    for (const t of uniqueTokens) {
      docFreq.set(t, (docFreq.get(t) || 0) + 1);
    }
  }

  const idfMap = new Map<string, number>();
  for (const [token, freq] of docFreq) {
    idfMap.set(token, computeIdf(kb.chunks.length, freq));
  }

  const scored: { chunk: KnowledgeChunk; score: number }[] = [];
  for (let i = 0; i < kb.chunks.length; i++) {
    const score = computeBm25(queryTokens, allDocTokens[i], idfMap);
    if (score > 0) {
      scored.push({ chunk: kb.chunks[i], score });
    }
  }

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, topK).map((s) => s.chunk);
}
