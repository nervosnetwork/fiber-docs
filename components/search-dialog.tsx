"use client";

import { useDocsSearch } from "fumadocs-core/search/client";
import { useCallback } from "react";
import {
  SearchDialog,
  SearchDialogClose,
  SearchDialogContent,
  SearchDialogFooter,
  SearchDialogHeader,
  SearchDialogIcon,
  SearchDialogInput,
  SearchDialogList,
  SearchDialogOverlay,
} from "fumadocs-ui/components/dialog/search";
import type { SharedProps } from "fumadocs-ui/contexts/search";
import { useI18n } from "fumadocs-ui/contexts/i18n";
import { useAIChat } from "@/components/ai-chat-provider";

export default function AISearchDialog({
  open,
  onOpenChange,
}: SharedProps) {
  const { locale } = useI18n();
  const { openChat } = useAIChat();

  const { search, setSearch, query } = useDocsSearch({
    type: "fetch",
    locale,
  });

  const hasResults =
    query.data !== "empty" && Array.isArray(query.data) && query.data.length > 0;

  const showAskAI = search.trim().length > 0;

  const handleSearchChange = useCallback((v: string) => {
    setSearch(v);
  }, [setSearch]);

  const handleAskAI = useCallback(() => {
    if (!search.trim()) return;
    onOpenChange(false);
    openChat(search);
  }, [search, onOpenChange, openChat]);

  return (
    <SearchDialog
      open={open}
      onOpenChange={onOpenChange}
      search={search}
      onSearchChange={handleSearchChange}
      isLoading={query.isLoading}
    >
      <SearchDialogOverlay />
      <SearchDialogContent>
        <SearchDialogHeader>
          <SearchDialogIcon />
          <SearchDialogInput />
          <SearchDialogClose />
        </SearchDialogHeader>

        {hasResults && <SearchDialogList items={query.data as any} />}

        {!hasResults && search.trim().length > 0 && !query.isLoading && (
          <div className="flex flex-col items-center gap-3 py-8 text-center text-sm">
            <p className="text-fd-muted-foreground">No results found</p>
          </div>
        )}

        {showAskAI && (
          <div className="border-t border-fd-border px-4 py-2.5">
            <button
              type="button"
              onClick={handleAskAI}
              className="inline-flex w-full items-center gap-2 rounded-lg border border-fd-primary/30 bg-fd-primary/10 px-4 py-2 text-sm text-fd-primary transition-colors hover:bg-fd-primary/20"
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
                className="shrink-0"
              >
                <path d="M12 2a4 4 0 0 1 4 4v2a4 4 0 0 1-8 0V6a4 4 0 0 1 4-4Z" />
                <path d="M16 14a4 4 0 0 1 4 4v2H4v-2a4 4 0 0 1 4-4h8Z" />
                <circle cx="12" cy="6" r="1" fill="currentColor" />
              </svg>
              Ask AI about &ldquo;{search.length > 40 ? search.slice(0, 40) + "..." : search}&rdquo;
            </button>
          </div>
        )}
      </SearchDialogContent>

      <SearchDialogFooter />
    </SearchDialog>
  );
}
