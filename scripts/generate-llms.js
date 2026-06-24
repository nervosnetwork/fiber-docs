/**
 * Generate llms.txt and llms-full.txt for AI-friendly documentation access.
 *
 * llms.txt: A curated index of all documentation pages with summaries.
 * llms-full.txt: The complete text content of all documentation pages.
 *
 * Usage: node scripts/generate-llms.js
 * Run this before `next build` or as part of the build pipeline.
 */

const fs = require("fs");
const path = require("path");

const DOCS_DIR = path.join(__dirname, "..", "content", "docs");
const PUBLIC_DIR = path.join(__dirname, "..", "public");
const BASE_URL = "https://www.fiber.world/docs";

// Ordered page list matching meta.json structure
const PAGE_STRUCTURE = [
  // Introduction
  { slug: "", section: "Introduction" },
  { slug: "how-it-works", section: "Introduction" },
  // Quick Start
  { slug: "quick-start/run-a-node", section: "Quick Start" },
  { slug: "quick-start/basic-transfer", section: "Quick Start" },
  { slug: "quick-start/transfer-stablecoin", section: "Quick Start" },
  { slug: "quick-start/connect-nodes", section: "Quick Start" },
  // Tutorial
  { slug: "tutorial/simple-game", section: "Tutorial" },
  // Guide — Run a Node
  {
    slug: "guide/node-operator/backup",
    section: "Guide / Run a Node",
  },
  {
    slug: "guide/node-operator/biscuit-auth",
    section: "Guide / Run a Node",
  },
  {
    slug: "guide/node-operator/channel-rebalancing",
    section: "Guide / Run a Node",
  },
  {
    slug: "guide/node-operator/external-funding",
    section: "Guide / Run a Node",
  },
  {
    slug: "guide/node-operator/troubleshooting",
    section: "Guide / Run a Node",
  },
  // Guide — Build on Fiber
  {
    slug: "guide/developer/http-rpc-guide",
    section: "Guide / Build on Fiber",
  },
  {
    slug: "guide/developer/fiber-js",
    section: "Guide / Build on Fiber",
  },
  {
    slug: "guide/developer/toolchain",
    section: "Guide / Build on Fiber",
  },
  {
    slug: "guide/developer/api-reference",
    section: "Guide / Build on Fiber",
  },
  // Guide — Core Concepts
  {
    slug: "guide/core-concepts/glossary",
    section: "Guide / Core Concepts",
  },
  {
    slug: "guide/core-concepts/channel-lifecycle",
    section: "Guide / Core Concepts",
  },
  {
    slug: "guide/core-concepts/payment-lifecycle",
    section: "Guide / Core Concepts",
  },
  {
    slug: "guide/core-concepts/invoice-guide",
    section: "Guide / Core Concepts",
  },
  {
    slug: "guide/core-concepts/hold-invoice",
    section: "Guide / Core Concepts",
  },
  // Guide — Network Resources
  {
    slug: "guide/network-resources",
    section: "Guide / Network Resources",
  },
  // Tech Explanation
  {
    slug: "tech-explanation/light-paper",
    section: "Tech Explanation",
  },
  {
    slug: "tech-explanation/high-level",
    section: "Tech Explanation",
  },
  {
    slug: "tech-explanation/payment-channel",
    section: "Tech Explanation",
  },
  {
    slug: "tech-explanation/invoice-protocol",
    section: "Tech Explanation",
  },
  {
    slug: "tech-explanation/p2p-message",
    section: "Tech Explanation",
  },
  {
    slug: "tech-explanation/cross-chain-htlc",
    section: "Tech Explanation",
  },
  {
    slug: "tech-explanation/trampoline-routing",
    section: "Tech Explanation",
  },
];

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
  const filePath = slug
    ? path.join(DOCS_DIR, `${slug}.mdx`)
    : path.join(DOCS_DIR, "index.mdx");

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

const pages = PAGE_STRUCTURE.map((p) => {
  const page = readPage(p.slug);
  if (page) page.section = p.section;
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
