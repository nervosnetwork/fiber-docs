"use client";

import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import { useAIChat, ChatMessage, SourceItem } from "./ai-chat-provider";

function SourceCard({ source }: { source: SourceItem }) {
  return (
    <a
      href={source.url}
      target="_blank"
      rel="noopener noreferrer"
      className="block rounded-xl border border-fd-border bg-fd-muted/40 hover:bg-fd-muted transition-colors px-4 py-3 mb-3"
    >
      <div className="flex items-center gap-2 mb-1.5">
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-fd-primary shrink-0"
        >
          <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
          <polyline points="14 2 14 8 20 8" />
        </svg>
        <span className="text-xs font-medium text-fd-primary truncate">
          {source.title || "Untitled"}
        </span>
      </div>
      <p className="text-xs text-fd-muted-foreground line-clamp-4 leading-relaxed">
        {source.content}
      </p>
      <div className="mt-2 flex items-center gap-1 text-[10px] text-fd-muted-foreground/70">
        <svg
          width="10"
          height="10"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
          <polyline points="15 3 21 3 21 9" />
          <line x1="10" x2="21" y1="14" y2="3" />
        </svg>
        <span className="truncate">{source.source}</span>
      </div>
    </a>
  );
}


function ChatMessageItem({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";

  if (isUser) {
    return (
      <div className="flex justify-end mb-4">
        <div className="max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap bg-fd-primary text-fd-primary-foreground rounded-br-sm">
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-start mb-4">
      <div className="max-w-[95%] w-full">
        {message.content && (
          <div className="text-sm text-fd-foreground mb-3
            [&>p]:mb-3 [&>p]:leading-relaxed
            [&>ul]:mb-3 [&>ul]:pl-5 [&>ul>li]:mb-1 [&>ul>li]:list-disc
            [&>ol]:mb-3 [&>ol]:pl-5 [&>ol>li]:mb-1 [&>ol>li]:list-decimal
            [&>h1]:text-base [&>h1]:font-semibold [&>h1]:mb-2 [&>h1]:mt-3
            [&>h2]:text-sm [&>h2]:font-semibold [&>h2]:mb-2 [&>h2]:mt-3
            [&>h3]:text-sm [&>h3]:font-semibold [&>h3]:mb-1 [&>h3]:mt-2
            [&>pre]:my-2 [&>pre]:overflow-x-auto [&>pre]:rounded-md [&>pre]:bg-fd-muted/50 [&>pre]:p-3 [&>pre]:text-xs
            [&>blockquote]:border-l-2 [&>blockquote]:border-fd-border [&>blockquote]:pl-3 [&>blockquote]:text-fd-muted-foreground [&>blockquote]:mb-3
            [&_code]:rounded [&_code]:bg-fd-muted/50 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:text-xs [&_code]:font-mono
            [&_a]:text-fd-primary [&_a]:underline-offset-2 [&_a:hover]:underline
            [&_strong]:font-semibold">
            <ReactMarkdown>{message.content}</ReactMarkdown>
          </div>
        )}

        {message.sources && message.sources.length > 0 && (
          <div className="border-t border-fd-border pt-3">
            <p className="text-xs font-medium text-fd-muted-foreground uppercase tracking-wider mb-2">
              Sources
            </p>
            {message.sources.map((source, idx) => (
              <SourceCard key={idx} source={source} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function AIChatPanel() {
  const { isOpen, closeChat, messages, setMessages, appendMessage, isLoading, setIsLoading } =
    useAIChat();
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const autoSentRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    if (
      isOpen &&
      messages.length === 1 &&
      messages[0].role === "user" &&
      !isLoading &&
      !autoSentRef.current.has(messages[0].id)
    ) {
      autoSentRef.current.add(messages[0].id);
      handleSend(messages[0].content);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, messages.length]);

  const handleSend = async (textOverride?: string) => {
    const text = textOverride ?? input.trim();
    if (!text || isLoading) return;

    if (!textOverride) {
      const userMsg: ChatMessage = {
        id: `user-${Date.now()}`,
        role: "user",
        content: text,
      };
      setMessages((prev) => [...prev, userMsg]);
      setInput("");
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/ask-ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: text, messages }),
      });

      if (!response.ok) {
        throw new Error("Failed to get response");
      }

      const data = await response.json();

      appendMessage({
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: data.answer || "",
        sources: data.sources || [],
      });
    } catch (err) {
      appendMessage({
        id: `assistant-${Date.now()}-error`,
        role: "assistant",
        content: "Sorry, something went wrong. Please try again later.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 z-[60] bg-black/20 backdrop-blur-sm transition-opacity"
          onClick={closeChat}
        />
      )}

      <div
        className={`fixed top-0 right-0 z-[70] h-full w-full max-w-[420px] bg-fd-background border-l border-fd-border shadow-2xl transform transition-transform duration-300 ease-out flex flex-col ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-fd-border">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <h2 className="text-sm font-semibold text-fd-foreground">
              Fiber AI Assistant
            </h2>
          </div>
          <button
            onClick={closeChat}
            className="p-1.5 rounded-md hover:bg-fd-muted text-fd-muted-foreground transition-colors"
            aria-label="Close"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>
        </div>

        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto px-4 py-4 space-y-1"
        >
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center text-fd-muted-foreground px-6">
              <div className="w-10 h-10 rounded-full bg-fd-muted flex items-center justify-center mb-3">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 2a4 4 0 0 1 4 4v2a4 4 0 0 1-8 0V6a4 4 0 0 1 4-4Z" />
                  <path d="M16 14a4 4 0 0 1 4 4v2H4v-2a4 4 0 0 1 4-4h8Z" />
                  <circle cx="12" cy="6" r="1" fill="currentColor" />
                </svg>
              </div>
              <p className="text-sm font-medium mb-1">Ask me anything</p>
              <p className="text-xs">
                I can answer questions about Fiber Network using our documentation.
              </p>
            </div>
          )}

          {messages.map((msg) => (
            <ChatMessageItem key={msg.id} message={msg} />
          ))}

          {isLoading && (
            <div className="flex justify-start mb-4">
              <div className="bg-fd-muted rounded-2xl rounded-bl-sm px-4 py-3">
                <div className="flex gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-fd-muted-foreground animate-bounce [animation-delay:-0.3s]" />
                  <span className="w-2 h-2 rounded-full bg-fd-muted-foreground animate-bounce [animation-delay:-0.15s]" />
                  <span className="w-2 h-2 rounded-full bg-fd-muted-foreground animate-bounce" />
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="px-4 py-3 border-t border-fd-border">
          <div className="relative">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                e.target.style.height = "auto";
                e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
              }}
              onKeyDown={handleKeyDown}
              placeholder="Ask about Fiber..."
              rows={1}
              className="w-full resize-none rounded-xl border border-fd-border bg-fd-muted px-4 py-3 pr-10 text-sm text-fd-foreground placeholder:text-fd-muted-foreground focus:outline-none focus:ring-1 focus:ring-fd-primary max-h-[120px]"
              style={{ minHeight: "44px" }}
            />
            <button
              onClick={() => handleSend()}
              disabled={!input.trim() || isLoading}
              className="absolute right-2 bottom-2 p-1.5 rounded-lg bg-fd-primary text-fd-primary-foreground disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
              aria-label="Send"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M5 12h14" />
                <path d="m12 5 7 7-7 7" />
              </svg>
            </button>
          </div>
          <p className="text-[10px] text-fd-muted-foreground mt-2 text-center">
            AI answers are based on Fiber documentation
          </p>
        </div>
      </div>
    </>
  );
}
