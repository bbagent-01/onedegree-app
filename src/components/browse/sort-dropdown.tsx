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
  { value: "price_asc", label: "Price: low to high" },
  { value: "price_desc", label: "Price: high to low" },
  { value: "top_rated", label: "Top rated" },
  { value: "newest", label: "Newest listings" },
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

  return (
    <Select value={current} onValueChange={change}>
      <SelectTrigger className="w-[200px]">
        <SelectValue placeholder="Sort" />
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
