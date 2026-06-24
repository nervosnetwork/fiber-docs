import fs from "fs";
import path from "path";

export interface KnowledgeChunk {
  id: string;
  title: string;
  content: string;
  url: string;
  source: string;
}

export interface KnowledgeBase {
  chunks: KnowledgeChunk[];
  generatedAt: string;
}

let cachedKb: KnowledgeBase | null = null;

export function loadKnowledgeBase(): KnowledgeBase {
  if (cachedKb) return cachedKb;

  const kbPath = path.join(process.cwd(), "public", "knowledge-base.json");
  if (!fs.existsSync(kbPath)) {
    console.warn("[RAG] knowledge-base.json not found at:", kbPath, "— run pnpm build-kb first");
    return { chunks: [], generatedAt: "" };
  }

  const raw = fs.readFileSync(kbPath, "utf-8");
  cachedKb = JSON.parse(raw) as KnowledgeBase;
  console.log(`[RAG] Loaded ${cachedKb.chunks.length} chunks from knowledge base`);
  return cachedKb;
}
