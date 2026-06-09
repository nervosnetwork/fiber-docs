import { NextRequest, NextResponse } from "next/server";
import https from "https";
import { retrieveRelevantChunks } from "@/lib/rag";

function httpsPost(url: string, headers: Record<string, string>, body: string): Promise<{ status: number; text: string }> {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const contentLength = Buffer.byteLength(body);
    const allHeaders = { ...headers, "Content-Length": String(contentLength) };
    console.log("[httpsPost] url:", url);
    console.log("[httpsPost] headers sent:", JSON.stringify(allHeaders));
    const options = {
      hostname: parsed.hostname,
      port: Number(parsed.port) || 443,
      path: parsed.pathname + parsed.search,
      method: "POST",
      headers: allHeaders,
    };
    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => resolve({ status: res.statusCode ?? 0, text: data }));
    });
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const query: string = body.query || "";

    if (!query) {
      return NextResponse.json({ error: "Query is required" }, { status: 400 });
    }

    const chunks = retrieveRelevantChunks(query, 5);

    const context = chunks.length > 0
      ? chunks
          .map((c, i) => `[${i + 1}] ${c.title}\nSource: ${c.url}\n${c.content}`)
          .join("\n\n---\n\n")
      : "(No relevant documentation found for this query)";

    const apiKey = process.env.OPENAI_API_KEY;
    const model = process.env.AI_MODEL || "gpt-4o-mini";
    const baseUrl = process.env.OPENAI_BASE_URL || "https://api.openai.com/v1";

    let answer = "";

    if (apiKey) {
      const systemPrompt = `You are a documentation assistant exclusively for Fiber Network — a peer-to-peer payment and swap network built on Nervos CKB (similar to Lightning Network).

Your ONLY job is to answer questions about Fiber Network using the provided documentation context. You must NOT answer questions unrelated to Fiber Network, CKB blockchain, or topics covered in the documentation.

If the user asks something unrelated to Fiber Network (e.g., general math, coding help unrelated to Fiber, weather, other blockchains not related to CKB/Fiber), politely decline and redirect them. For example: "I can only help with questions about Fiber Network's documentation. Is there something specific you'd like to know about Fiber Network?"

Rules:
- Answer ONLY based on the provided documentation context below
- If the context doesn't contain enough information, say so and suggest browsing the docs directly
- Be concise and direct
- Include code examples when relevant
- Always cite your sources using [1], [2], etc. when referencing specific information
- If you're unsure, say so rather than guessing
- Format code with proper markdown code blocks`;

      try {
        const requestBody = JSON.stringify({
          model,
          messages: [
            { role: "system", content: systemPrompt },
            {
              role: "user",
              content: `Context from Fiber documentation:\n\n${context}\n\n---\n\nQuestion: ${query}`,
            },
          ],
          max_tokens: 1500,
          temperature: 0.3,
        });

        const { status, text } = await httpsPost(
          `${baseUrl}/chat/completions`,
          {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`,
            "HTTP-Referer": "https://www.fiber.world",
            "X-Title": "Fiber Network Docs",
          },
          requestBody
        );

        if (status >= 200 && status < 300) {
          const data = JSON.parse(text);
          answer = data.choices?.[0]?.message?.content || "";
        } else {
          console.error("LLM API error:", status, text);
        }
      } catch (llmErr) {
        console.error("LLM call failed:", llmErr);
      }
    }

    if (!answer) {
      if (chunks.length > 0) {
        answer =
          "Here are the most relevant documentation pages for your query:\n\n" +
          chunks
            .map((c, i) => `${i + 1}. [${c.title}](${c.url})\n${c.content.slice(0, 300)}...`)
            .join("\n\n");
      } else {
        answer =
          "I couldn't find any relevant documentation for your query. Try rephrasing your question or browse the documentation directly.";
      }
    }

    return NextResponse.json({
      answer,
      sources: chunks.map((c) => ({
        title: c.title,
        url: c.url,
        source: c.source,
        content: c.content,
      })),
    });
  } catch (error) {
    console.error("Ask AI error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
