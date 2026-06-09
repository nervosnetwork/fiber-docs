import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import matter from "gray-matter";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, "..");

const FIBER_PROJECT_ROOT = "/Users/sonny/nervos/fiber";

const DOC_DIRS = [
  path.join(PROJECT_ROOT, "content"),
  path.join(FIBER_PROJECT_ROOT, "docs"),
];

const EXTS = [".md", ".mdx"];
const MAX_CHUNK_LEN = 800;

function walk(dir, files = []) {
  if (!fs.existsSync(dir)) return files;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, files);
    } else if (EXTS.includes(path.extname(entry.name))) {
      files.push(full);
    }
  }
  return files;
}

function chunkText(text, maxLen) {
  const paragraphs = text.split(/\n\n+/).filter((p) => p.trim().length > 0);
  const chunks = [];
  let current = "";
  for (const p of paragraphs) {
    if (current.length + p.length > maxLen && current.length > 0) {
      chunks.push(current.trim());
      current = p;
    } else {
      current += "\n\n" + p;
    }
  }
  if (current.trim().length > 0) chunks.push(current.trim());
  return chunks;
}

function parseFrontmatter(raw) {
  try {
    return matter(raw);
  } catch {
    return { data: {}, content: raw };
  }
}

function relativeDocPath(absPath) {
  for (const dir of DOC_DIRS) {
    if (absPath.startsWith(dir)) {
      return absPath.slice(dir.length + 1);
    }
  }
  return absPath;
}

function computeUrl(filePath, frontmatter) {
  if (frontmatter.data?.url) return frontmatter.data.url;

  const rel = relativeDocPath(filePath);
  const ext = path.extname(rel);
  const withoutExt = rel.slice(0, -ext.length);

  if (filePath.includes("/content/")) {
    // withoutExt starts with "docs/" because content/docs/ -> docs/...
    // Strip the leading "docs/" so the URL becomes /docs/<page-path>
    const cleaned = withoutExt.startsWith("docs/") ? withoutExt.slice(5) : withoutExt;
    return `/docs/${cleaned}`;
  }
  if (filePath.includes("/nervos/fiber/docs/")) {
    return `https://github.com/nervosnetwork/fiber/blob/main/docs/${rel}`;
  }
  return `/${withoutExt}`;
}

const allFiles = [];
for (const dir of DOC_DIRS) {
  allFiles.push(...walk(dir));
}

let idCounter = 0;
const chunks = [];

for (const file of allFiles) {
  const raw = fs.readFileSync(file, "utf-8");
  const parsed = parseFrontmatter(raw);
  const title = parsed.data.title || parsed.data.heading || path.basename(file, path.extname(file));
  const url = computeUrl(file, parsed);
  const source = relativeDocPath(file);

  const textChunks = chunkText(parsed.content, MAX_CHUNK_LEN);
  for (const content of textChunks) {
    chunks.push({
      id: `chunk-${idCounter++}`,
      title: String(title),
      content,
      url,
      source,
    });
  }
}

const kb = {
  chunks,
  generatedAt: new Date().toISOString(),
};

const outPath = path.join(PROJECT_ROOT, "public", "knowledge-base.json");
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(kb, null, 2));

console.log(`Knowledge base built: ${chunks.length} chunks written to ${outPath}`);
