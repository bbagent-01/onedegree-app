"use client";

import { useState, useMemo } from "react";
import { mockListings, type Category } from "@/lib/mock-listings";
import { CategoryFilterBar } from "@/components/category-filter-bar";
import { ListingGrid } from "@/components/listing-grid";

export default function ExplorePage() {
  const [activeCategory, setActiveCategory] = useState<Category | null>(null);

  const filteredListings = useMemo(() => {
    if (!activeCategory) return mockListings;
    return mockListings.filter((l) => l.category === activeCategory);
  }, [activeCategory]);

  return (
    <div className="mx-auto max-w-container px-4 md:px-6">
      {/* Category filter */}
      <div className="sticky top-0 md:top-16 z-40 bg-white pt-2">
        <CategoryFilterBar
          activeCategory={activeCategory}
          onCategoryChange={setActiveCategory}
        />
      </div>

      {/* Listing grid */}
      <div className="py-6">
        <ListingGrid listings={filteredListings} />
      </div>
    </div>
  );
}
