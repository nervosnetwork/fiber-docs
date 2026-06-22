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

export default function AISearchDialog({
  open,
  onOpenChange,
}: SharedProps) {
  const { locale } = useI18n();
  const { search, setSearch, query } = useDocsSearch({
    type: "fetch",
    locale,
  });

  const hasResults =
    query.data !== "empty" && Array.isArray(query.data) && query.data.length > 0;

  const handleSearchChange = useCallback((v: string) => {
    setSearch(v);
  }, [setSearch]);

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

      </SearchDialogContent>

      <SearchDialogFooter />
    </SearchDialog>
  );
}
