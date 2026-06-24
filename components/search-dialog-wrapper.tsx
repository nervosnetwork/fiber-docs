"use client";

import dynamic from "next/dynamic";
import type { SharedProps } from "fumadocs-ui/contexts/search";

const AISearchDialog = dynamic(
  () => import("@/components/search-dialog"),
  { ssr: false }
);

export default function SearchDialogWrapper(props: SharedProps) {
  return <AISearchDialog {...props} />;
}
