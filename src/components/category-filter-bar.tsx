"use client";

import { cn } from "@/lib/utils";
import { categories, type Category } from "@/lib/mock-listings";
import { useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Flame, Waves, TreePine, Mountain, Sailboat, Wheat, Home, TreeDeciduous, Crown, Sparkles } from "lucide-react";

const iconMap: Record<string, React.ElementType> = {
  Flame, Waves, TreePine, Mountain, Sailboat, Wheat, Home, TreeDeciduous, Crown, Sparkles,
};

interface CategoryFilterBarProps {
  activeCategory: Category | null;
  onCategoryChange: (category: Category | null) => void;
}

export function CategoryFilterBar({ activeCategory, onCategoryChange }: CategoryFilterBarProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  function updateScrollState() {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 0);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 1);
  }

  function scroll(direction: "left" | "right") {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: direction === "left" ? -200 : 200, behavior: "smooth" });
  }

  return (
    <div className="relative">
      {/* Left arrow */}
      {canScrollLeft && (
        <button
          onClick={() => scroll("left")}
          className="absolute left-0 top-1/2 z-10 -translate-y-1/2 rounded-full border border-border bg-white p-1.5 shadow-sm hover:shadow-md transition-shadow"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
      )}

      {/* Scrollable categories */}
      <div
        ref={scrollRef}
        onScroll={updateScrollState}
        className="flex gap-8 overflow-x-auto scrollbar-hide px-2 py-3"
      >
        {categories.map((cat) => {
          const Icon = iconMap[cat.icon];
          const isActive = activeCategory === cat.slug;
          return (
            <button
              key={cat.slug}
              onClick={() => onCategoryChange(isActive ? null : cat.slug)}
              className={cn(
                "flex flex-col items-center gap-1.5 whitespace-nowrap pb-2 pt-1 text-xs transition-all border-b-2 min-w-fit",
                isActive
                  ? "border-foreground text-foreground"
                  : "border-transparent text-muted-foreground hover:border-border hover:text-foreground"
              )}
            >
              {Icon && <Icon className="h-5 w-5" />}
              <span className="font-medium">{cat.label}</span>
            </button>
          );
        })}
      </div>

      {/* Right arrow */}
      {canScrollRight && (
        <button
          onClick={() => scroll("right")}
          className="absolute right-0 top-1/2 z-10 -translate-y-1/2 rounded-full border border-border bg-white p-1.5 shadow-sm hover:shadow-md transition-shadow"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
