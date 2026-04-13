"use client";

import { useRef, useState, useEffect } from "react";
import {
  LayoutGrid,
  Home,
  Building2,
  DoorOpen,
  Sparkles,
  PawPrint,
  Waves as Pool,
  Building,
  TreePine,
  Ship,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

const categories = [
  { id: "all", label: "All", icon: LayoutGrid },
  { id: "houses", label: "Houses", icon: Home },
  { id: "apartments", label: "Apartments", icon: Building2 },
  { id: "rooms", label: "Rooms", icon: DoorOpen },
  { id: "unique", label: "Unique Stays", icon: Sparkles },
  { id: "pet-friendly", label: "Pet Friendly", icon: PawPrint },
  { id: "pool", label: "Pool", icon: Pool },
  { id: "city", label: "City", icon: Building },
  { id: "suburban", label: "Suburban", icon: TreePine },
  { id: "waterfront", label: "Waterfront", icon: Ship },
];

interface CategoryFilterBarProps {
  activeCategory: string;
  onCategoryChange: (category: string) => void;
}

export function CategoryFilterBar({
  activeCategory,
  onCategoryChange,
}: CategoryFilterBarProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 0);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
  };

  useEffect(() => {
    checkScroll();
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener("scroll", checkScroll, { passive: true });
    window.addEventListener("resize", checkScroll);
    return () => {
      el.removeEventListener("scroll", checkScroll);
      window.removeEventListener("resize", checkScroll);
    };
  }, []);

  const scroll = (direction: "left" | "right") => {
    const el = scrollRef.current;
    if (!el) return;
    const amount = direction === "left" ? -200 : 200;
    el.scrollBy({ left: amount, behavior: "smooth" });
  };

  return (
    <div className="sticky top-0 md:top-16 z-40 bg-background border-b border-border">
      <div className="mx-auto max-w-container px-5 md:px-10 relative">
        {/* Left arrow */}
        {canScrollLeft && (
          <button
            onClick={() => scroll("left")}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-10 hidden md:flex h-8 w-8 items-center justify-center rounded-full border border-border bg-background shadow-sm hover:shadow-md transition-shadow"
            aria-label="Scroll categories left"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
        )}

        {/* Scrollable categories */}
        <div
          ref={scrollRef}
          className="flex items-end gap-6 overflow-x-auto no-scrollbar py-3"
        >
          {categories.map(({ id, label, icon: Icon }) => {
            const active = activeCategory === id;
            return (
              <button
                key={id}
                onClick={() => onCategoryChange(id)}
                className={cn(
                  "flex flex-col items-center gap-1.5 flex-shrink-0 pb-2 border-b-2 transition-colors cursor-pointer",
                  active
                    ? "border-foreground text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
                )}
              >
                <Icon className="h-6 w-6" />
                <span className="text-xs font-medium whitespace-nowrap">
                  {label}
                </span>
              </button>
            );
          })}
        </div>

        {/* Right arrow */}
        {canScrollRight && (
          <button
            onClick={() => scroll("right")}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-10 hidden md:flex h-8 w-8 items-center justify-center rounded-full border border-border bg-background shadow-sm hover:shadow-md transition-shadow"
            aria-label="Scroll categories right"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}
