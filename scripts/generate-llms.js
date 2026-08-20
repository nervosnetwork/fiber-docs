/**
 * Generate llms.txt and llms-full.txt for AI-friendly documentation access.
 *
 * llms.txt: A curated index of all documentation pages with summaries.
 * llms-full.txt: The complete text content of all documentation pages.
 *
 * The page list and section grouping are derived from the same meta.json
 * files that drive the docs sidebar (content/docs/meta.json and per-folder
 * meta.json), so the output can never drift from the site navigation:
 *
 *   "---Section---"  -> starts a new section
 *   "...folder"      -> expands the folder's pages inline into the section
 *   "path/to/page"   -> a single page (or a folder reference, expanded via
 *                       its own meta.json)
 *
 * Usage: node scripts/generate-llms.js
 * Run this before `next build` or as part of the build pipeline.
 */

const fs = require("fs");
const path = require("path");

const DOCS_DIR = path.join(__dirname, "..", "content", "docs");
const PUBLIC_DIR = path.join(__dirname, "..", "public");
const BASE_URL = "https://www.fiber.world/docs";

const SEPARATOR_RE = /^---(.+)---$/;

function readMeta(dir) {
  const metaPath = path.join(dir, "meta.json");
  if (!fs.existsSync(metaPath)) return null;
  try {
    return JSON.parse(fs.readFileSync(metaPath, "utf-8"));
  } catch (e) {
    console.warn(`Warning: failed to parse ${metaPath}: ${e.message}`);
    return null;
  }
}

/**
 * Expand a folder into its page slugs (relative to content/docs), following
 * the folder's meta.json pages list when present. A folder index.mdx is
 * always included as the folder's landing page, even if the meta.json pages
 * list omits "index" (fumadocs still renders it).
 */
function expandFolder(folderRel, slugs) {
  const dir = path.join(DOCS_DIR, folderRel);
  const meta = readMeta(dir);

  if (meta && Array.isArray(meta.pages)) {
    const entries = [...meta.pages];
    if (
      fs.existsSync(path.join(dir, "index.mdx")) &&
      !entries.includes("index")
    ) {
      entries.unshift("index");
    }
    for (const entry of entries) {
      if (SEPARATOR_RE.test(entry)) continue; // nested visual separators: ignored
      if (entry.startsWith("...")) {
        expandFolder(path.posix.join(folderRel, entry.slice(3)), slugs);
      } else {
        expandEntry(entry, folderRel, slugs);
      }
    }
    return;
  }

  // No meta.json: every .mdx in the folder, index first, then alphabetical.
  const files = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".mdx"))
    .sort((a, b) => {
      if (a === "index.mdx") return -1;
      if (b === "index.mdx") return 1;
      return a.localeCompare(b);
    });
  for (const f of files) {
    const name = f.replace(/\.mdx$/, "");
    slugs.push(name === "index" ? folderRel : `${folderRel}/${name}`);
  }
}

/**
 * Expand one pages[] entry (a page path or a folder reference) into slugs.
 * `prefix` is the enclosing folder's path relative to content/docs ("" at root).
 */
function expandEntry(entry, prefix, slugs) {
  if (entry === "index") {
    // The folder's own landing page; at the docs root this is the home page.
    slugs.push(prefix || "");
    return;
  }

  const rel = prefix ? `${prefix}/${entry}` : entry;
  if (fs.existsSync(path.join(DOCS_DIR, `${rel}.mdx`))) {
    slugs.push(rel);
    return;
  }
  const dirPath = path.join(DOCS_DIR, rel);
  if (fs.existsSync(dirPath) && fs.statSync(dirPath).isDirectory()) {
    expandFolder(rel, slugs);
    return;
  }
  console.warn(`Warning: meta.json entry not found, skipped: ${rel}`);
}

/**
 * Build the ordered { slug, section } list from content/docs/meta.json.
 */
function buildPageStructure() {
  const rootMeta = readMeta(DOCS_DIR);
  if (!rootMeta || !Array.isArray(rootMeta.pages)) {
    throw new Error("content/docs/meta.json is missing or has no pages array");
  }

  const structure = [];
  const seen = new Set();
  let section = "Documentation";
  const push = (slug) => {
    if (seen.has(slug)) return;
    seen.add(slug);
    structure.push({ slug, section });
  };

  for (const entry of rootMeta.pages) {
    const separator = entry.match(SEPARATOR_RE);
    if (separator) {
      section = separator[1].trim();
      continue;
    }
    const slugs = [];
    if (entry.startsWith("...")) {
      expandFolder(entry.slice(3), slugs);
    } else {
      expandEntry(entry, "", slugs);
    }
    slugs.forEach(push);
  }
  return structure;
}

/**
 * Parse frontmatter from MDX file content.
 */
function parseFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return {};

  const fm = {};
  for (const line of match[1].split("\n")) {
    const m = line.match(/^(\w+):\s*"?([^"]*)"?\s*$/);
    if (m) {
      fm[m[1]] = m[2];
    }
  }
  return fm;
}

/**
 * Strip MDX/JSX imports, components, and frontmatter to get plain text.
 */
function stripToPlainText(content) {
  // Remove frontmatter
  let text = content.replace(/^---\n[\s\S]*?\n---\n/, "");
  // Remove import lines
  text = text.replace(/^import\s+.*$/gm, "");
  // Remove JSX component tags (self-closing and paired)
  text = text.replace(/<\/?[A-Z][a-zA-Z]*[^>]*\/?>/g, "");
  text = text.replace(/<\/?[a-z][a-zA-Z]*[^>]*\/?>/g, "");
  // Remove code blocks but keep language hint
  text = text.replace(/```(\w*)\n[\s\S]*?```/g, (_, lang) =>
    lang ? `[${lang} code block]` : "[code block]"
  );
  // Remove inline code markers but keep content
  text = text.replace(/`([^`]+)`/g, "$1");
  // Remove markdown links but keep text
  text = text.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");
  // Remove markdown images
  text = text.replace(/!\[[^\]]*\]\([^)]+\)/g, "");
  // Remove bold/italic markers
  text = text.replace(/(\*{1,3}|_{1,3})([^*_]+)\1/g, "$2");
  // Remove horizontal rules
  text = text.replace(/^---+$/gm, "");
  // Collapse multiple blank lines
  text = text.replace(/\n{3,}/g, "\n\n");
  // Trim
  text = text.trim();
  return text;
}

/**
 * Read an MDX file and return its metadata and plain text content.
 */
function readPage(slug) {
  let filePath = slug
    ? path.join(DOCS_DIR, `${slug}.mdx`)
    : path.join(DOCS_DIR, "index.mdx");

  // Folder landing pages live in <slug>/index.mdx
  if (!fs.existsSync(filePath) && slug) {
    const indexPath = path.join(DOCS_DIR, slug, "index.mdx");
    if (fs.existsSync(indexPath)) filePath = indexPath;
  }

  if (!fs.existsSync(filePath)) {
    console.warn(`Warning: file not found: ${filePath}`);
    return null;
  }

  const raw = fs.readFileSync(filePath, "utf-8");
  const frontmatter = parseFrontmatter(raw);
  const plainText = stripToPlainText(raw);

  return {
    slug,
    url: slug ? `${BASE_URL}/${slug}` : BASE_URL,
    title: frontmatter.title || slug || "Documentation",
    description:
      frontmatter.description || plainText.split("\n").find((l) => l.trim())?.slice(0, 120) || "",
    plainText,
  };
}

// ---- Main ----

const pages = buildPageStructure().map((p) => {
  const page = readPage(p.slug);
  if (page) {
    page.section = p.section;
    if (p.route) page.url = `${BASE_URL}/${p.route}`;
  }
  return page;
}).filter(Boolean);

// ---- Generate llms.txt ----

let llmsTxt = `# Fiber Network Documentation

> Fiber Network is a peer-to-peer payment/swap network built on Nervos CKB, similar to Lightning Network. It supports multi-asset payments, cross-chain swaps with Bitcoin Lightning, and instant micropayments. This documentation covers everything from running a node to integrating Fiber into your application.

Fiber Network Node (FNN) is the reference Rust implementation. fiber-js provides a WASM node for browsers. The HTTP JSON-RPC interface allows programmatic access from any language.

`;

// Group by section
const sections = {};
for (const page of pages) {
  if (!sections[page.section]) sections[page.section] = [];
  sections[page.section].push(page);
}

for (const [section, sectionPages] of Object.entries(sections)) {
  llmsTxt += `## ${section}\n\n`;
  for (const page of sectionPages) {
    llmsTxt += `- [${page.title}](${page.url})`;
    if (page.description) {
      llmsTxt += `: ${page.description}`;
    }
    llmsTxt += "\n";
  }
  llmsTxt += "\n";
}

// Optional section for supplementary resources
llmsTxt += `## Optional\n\n`;
llmsTxt += `- [Fiber GitHub Repository](https://github.com/nervosnetwork/fiber): The main FNN source code\n`;
llmsTxt += `- [Fiber RPC API Reference](https://github.com/nervosnetwork/fiber/blob/main/crates/fiber-lib/src/rpc/README.md): Complete auto-generated RPC documentation\n`;
llmsTxt += `- [fiber-scripts](https://github.com/nervosnetwork/fiber-scripts): On-chain CKB scripts for payment channels\n`;
llmsTxt += `- [fiber-sphinx](https://github.com/nervosnetwork/fiber-sphinx): Onion routing cryptography library\n`;
llmsTxt += `- [Fiber Network Dashboard](https://dashboard.fiber.channel/nodes): Live network status\n`;

fs.writeFileSync(path.join(PUBLIC_DIR, "llms.txt"), llmsTxt);
console.log("Generated public/llms.txt");

// ---- Generate llms-full.txt ----

let llmsFull = `# Fiber Network Documentation (Full)\n\n`;

for (const page of pages) {
  llmsFull += `## ${page.title}\n\n`;
  llmsFull += `Source: ${page.url}\n\n`;
  llmsFull += page.plainText;
  llmsFull += "\n\n---\n\n";
}

// Append optional resources
llmsFull += `## Fiber RPC API Reference\n\n`;
llmsFull += `Source: https://github.com/nervosnetwork/fiber/blob/main/crates/fiber-lib/src/rpc/README.md\n\n`;
llmsFull += `The complete RPC API is maintained in the Fiber GitHub repository. See the link above for the latest version.\n\n`;

fs.writeFileSync(path.join(PUBLIC_DIR, "llms-full.txt"), llmsFull);
console.log("Generated public/llms-full.txt");
