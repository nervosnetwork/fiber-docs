#!/usr/bin/env node

/**
 * Converts the Fiber RPC README.md to an MDX file suitable for the fiber-docs site.
 *
 * Usage: node scripts/convert-rpc-doc.js <input.md> <output.mdx>
 */

const fs = require("fs");
const path = require("path");

const inputPath = process.argv[2];
const outputPath = process.argv[3];

if (!inputPath || !outputPath) {
  console.error("Usage: node convert-rpc-doc.js <input.md> <output.mdx>");
  process.exit(1);
}

const md = fs.readFileSync(inputPath, "utf-8");

let content = md;

// Remove the TOC section (everything before "## RPC Modules")
const modulesIndex = content.indexOf("## RPC Modules");
if (modulesIndex > -1) {
  content = content.slice(modulesIndex);
}

// Remove HTML anchor tags like <a id="..."></a>
content = content.replace(/<a\s+id="[^"]*">\s*<\/a>\n*/g, "");

// KEY FIX: Convert ALL <em>...</em> tags first, before any other processing.
// The content inside <em> may contain <> characters (e.g., Option<Vec<CellDep>>)
// so we must handle them before angle bracket escaping.
// Strategy: replace <em>...</em> with backtick-wrapped content
content = content.replace(/<em>([\s\S]*?)<\/em>/g, (match, inner) => {
  // If the inner content is just `Type`, strip the backticks and rewrap
  if (/^`[^`]+`$/.test(inner)) {
    return inner; // Already backtick-wrapped, e.g., <em>`u64`</em> -> `u64`
  }
  // If the inner content is a markdown link [Text](url), return as-is
  if (/^\[.*\]\(.*\)$/.test(inner)) {
    return inner; // e.g., <em>[Currency](#type-currency)</em> -> [Currency](#type-currency)
  }
  // Otherwise wrap in backticks to avoid MDX JSX parsing
  // e.g., <em>Option<Vec<CellDep>></em> -> `Option<Vec<CellDep>>`
  return "`" + inner + "`";
});

// Fix heading levels:
// Original: ## RPC Modules (removed), ### Module, #### Method, ##### Params/Returns
// Target:   ## Module, ### Method, #### Params/Returns
content = content.replace(/^### Module /gm, "## Module ");
content = content.replace(/^#### Method /gm, "### Method ");
content = content.replace(/^##### /gm, "#### ");

// Convert horizontal rules (---) to *** to avoid MDX frontmatter confusion
content = content.replace(/^---$/gm, "***");

// Replace the "## RPC Modules" heading with nothing (we'll have our own intro)
content = content.replace(/^## RPC Modules\n*/, "");

// Rename "## RPC Types" section
content = content.replace(/^## RPC Types$/m, "## Types Reference");

// Now escape any remaining bare angle brackets in non-code-block text
// that are NOT inside backticks or code blocks
const lines = content.split("\n");
let inCodeBlock = false;
const processedLines = lines.map((line) => {
  // Track code block boundaries
  if (line.trimStart().startsWith("```")) {
    inCodeBlock = !inCodeBlock;
    return line;
  }
  if (inCodeBlock) return line;

  // Process line segment by segment: protect backtick-wrapped content
  const parts = [];
  let remaining = line;
  while (remaining.length > 0) {
    const btStart = remaining.indexOf("`");
    if (btStart === -1) {
      parts.push(escapeBareAngleBrackets(remaining));
      break;
    }
    if (btStart > 0) {
      parts.push(escapeBareAngleBrackets(remaining.slice(0, btStart)));
    }
    // Find closing backtick (handle consecutive backticks)
    let btEnd = remaining.indexOf("`", btStart + 1);
    if (btEnd === -1) {
      // No closing backtick - treat rest as code
      parts.push(remaining.slice(btStart));
      break;
    }
    // Content inside backticks is safe from MDX
    parts.push(remaining.slice(btStart, btEnd + 1));
    remaining = remaining.slice(btEnd + 1);
  }

  return parts.join("");
});

content = processedLines.join("\n");

// Add frontmatter
const frontmatter = `---
title: RPC API Reference
description: Complete reference for the Fiber Network Node JSON-RPC API
date: 2026-05-25
---

import { Callout } from 'fumadocs-ui/components/callout';

`;

// Add intro section before the converted content
const intro = `All Fiber nodes expose an HTTP JSON-RPC 2.0 interface for programmatic access.

<Callout type="warn">
  Allowing arbitrary machines to access the JSON-RPC port is **dangerous and strongly discouraged**. Please strictly limit the access to only trusted machines.
</Callout>

## RPC Endpoint

\`\`\`
POST http://<node_address>:<port>/
\`\`\`

Default: \`http://127.0.0.1:8227\`

## Request Format

\`\`\`json
{
  "jsonrpc": "2.0",
  "method": "<method_name>",
  "params": [<param1>, <param2>, ...],
  "id": 1
}
\`\`\`

## Response Format

### Success

\`\`\`json
{
  "jsonrpc": "2.0",
  "result": { ... },
  "id": 1
}
\`\`\`

### Error

\`\`\`json
{
  "jsonrpc": "2.0",
  "error": {
    "code": -32600,
    "message": "Invalid request"
  },
  "id": 1
}
\`\`\`

## Authentication

If Biscuit authentication is enabled, include a Bearer token in the \`Authorization\` header:

\`\`\`
Authorization: Bearer <your_biscuit_token>
\`\`\`

See [Biscuit Authentication](/docs/guide/node-operator/biscuit-auth) for details.

***

`;

// Ensure the output directory exists
const outputDir = path.dirname(outputPath);
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

const output = frontmatter + intro + content.trim() + "\n";

fs.writeFileSync(outputPath, output, "utf-8");
console.log(`Converted ${inputPath} -> ${outputPath}`);
console.log(`Output size: ${output.length} bytes`);

/**
 * Escape bare angle brackets that are NOT inside backticks.
 * These would be misinterpreted by MDX as JSX tags.
 */
function escapeBareAngleBrackets(text) {
  return text.replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
