"use client";

import { useRouter, useSearchParams } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { SortOption } from "@/lib/browse-data";

const OPTIONS: { value: SortOption; label: string }[] = [
  { value: "best_match", label: "Best match" },
  { value: "price_asc", label: "$ low to high" },
  { value: "price_desc", label: "$ high to low" },
  { value: "top_rated", label: "Top rated" },
  { value: "newest", label: "Newest" },
];

export function SortDropdown() {
  const router = useRouter();
  const params = useSearchParams();
  const current = (params.get("sort") as SortOption) || "best_match";

  const change = (value: string | null) => {
    if (!value) return;
    const url = new URLSearchParams(params.toString());
    if (value === "best_match") url.delete("sort");
    else url.set("sort", value);
    router.push(`/browse?${url.toString()}`);
  };

  const currentLabel =
    OPTIONS.find((o) => o.value === current)?.label ?? "Best match";

  return (
    <Select value={current} onValueChange={change}>
      <SelectTrigger className="!h-9 w-auto gap-2 rounded-full border-border !bg-white px-4 text-sm font-medium shadow-sm hover:shadow transition-shadow">
        <SelectValue placeholder="Sort">{currentLabel}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        {OPTIONS.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
