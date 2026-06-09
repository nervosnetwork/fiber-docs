/**
 * Remark plugin that auto-links glossary terms to the Glossary page.
 *
 * When a defined term appears in text content (not inside code blocks or links),
 * it is wrapped in a link to the Glossary page. Each term is linked only once
 * per document to avoid over-linking.
 */

import { visit } from "unist-util-visit";

// Terms to auto-link, mapped to their anchor ID on the Glossary page
const GLOSSARY_TERMS: Record<string, string> = {
  "Payment Channel": "payment-channel",
  "payment channel": "payment-channel",
  HTLC: "htlc",
  PTLC: "ptlc",
  TLC: "tlc",
  "Commitment Transaction": "commitment-transaction",
  "commitment transaction": "commitment-transaction",
  "Multi-hop Routing": "multi-hop-routing",
  "multi-hop routing": "multi-hop-routing",
  "Onion Routing": "onion-routing",
  "onion routing": "onion-routing",
  Watchtower: "watchtower",
  watchtower: "watchtower",
  "Gossip Protocol": "gossip-protocol",
  "gossip protocol": "gossip-protocol",
  Invoice: "invoice",
  invoice: "invoice",
  "Hold Invoice": "hold-invoice",
  "hold invoice": "hold-invoice",
  Asset: "asset",
  Node: "node",
  "Fiber Network": "fiber-network",
};

const GLOSSARY_URL = "/docs/guide/core-concepts/glossary";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AstNode = any;

export default function remarkGlossaryLinks() {
  return (tree: AstNode) => {
    const linkedInDoc = new Set<string>();

    visit(tree, "text", (node: AstNode, _index: AstNode, parent: AstNode) => {
      // Skip if inside code blocks, links, or inline code
      if (!parent || parent.type !== "paragraph") return;
      if (isInsideCode(parent)) return;

      // Check if already inside a link
      if (parent.children.some((child: AstNode) => child.type === "link")) {
        return;
      }

      for (const [term, anchor] of Object.entries(GLOSSARY_TERMS)) {
        if (linkedInDoc.has(term)) continue;

        const text: string = node.value;
        const termIndex = text.indexOf(term);

        if (termIndex === -1) continue;

        const before = termIndex > 0 ? text[termIndex - 1] : " ";
        const after =
          termIndex + term.length < text.length
            ? text[termIndex + term.length]
            : " ";

        if (!isWordBoundary(before) || !isWordBoundary(after)) continue;

        const beforeText = text.slice(0, termIndex);
        const afterText = text.slice(termIndex + term.length);

        const linkNode = {
          type: "link",
          url: `${GLOSSARY_URL}#${anchor}`,
          children: [{ type: "text", value: term }],
          data: {
            hProperties: {
              className: "glossary-link",
            },
          },
        };

        const newNodes: AstNode[] = [];
        if (beforeText) {
          newNodes.push({ type: "text", value: beforeText });
        }
        newNodes.push(linkNode);
        if (afterText) {
          newNodes.push({ type: "text", value: afterText });
        }

        const siblingIndex = parent.children.indexOf(node);
        parent.children.splice(siblingIndex, 1, ...newNodes);

        linkedInDoc.add(term);
        break;
      }
    });
  };
}

function isInsideCode(parent: AstNode): boolean {
  let node: AstNode = parent;
  while (node) {
    if (
      node.type === "code" ||
      node.type === "inlineCode" ||
      node.type === "pre"
    ) {
      return true;
    }
    node = node.parent;
  }
  return false;
}

function isWordBoundary(char: string): boolean {
  return /[\s,.;:!?\-\u2014\u2013(/)\[\]{}"'"]/.test(char) || char === " ";
}
