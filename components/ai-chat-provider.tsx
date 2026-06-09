"use client";

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
} from "react";

export interface SourceItem {
  title: string;
  url: string;
  source: string;
  content: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: SourceItem[];
}

interface AIChatContextValue {
  isOpen: boolean;
  openChat: (initialQuery?: string) => void;
  closeChat: () => void;
  messages: ChatMessage[];
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  appendMessage: (message: ChatMessage) => void;
  isLoading: boolean;
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
}

const AIChatContext = createContext<AIChatContextValue | null>(null);

export function useAIChat() {
  const ctx = useContext(AIChatContext);
  if (!ctx) throw new Error("useAIChat must be used within AIChatProvider");
  return ctx;
}

export function AIChatProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const openChat = useCallback((initialQuery?: string) => {
    if (initialQuery) {
      setMessages([
        {
          id: `user-${Date.now()}`,
          role: "user",
          content: initialQuery,
        },
      ]);
    }
    setIsOpen(true);
  }, []);

  const closeChat = useCallback(() => {
    setIsOpen(false);
  }, []);

  const appendMessage = useCallback((message: ChatMessage) => {
    setMessages((prev) => [...prev, message]);
  }, []);

  return (
    <AIChatContext.Provider
      value={{
        isOpen,
        openChat,
        closeChat,
        messages,
        setMessages,
        appendMessage,
        isLoading,
        setIsLoading,
      }}
    >
      {children}
    </AIChatContext.Provider>
  );
}
