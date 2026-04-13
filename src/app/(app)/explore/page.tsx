"use client";

import { useState } from "react";
import { CategoryFilterBar } from "@/components/category-filter-bar";
import { ListingGrid } from "@/components/listing-grid";
import { MOCK_LISTINGS } from "@/lib/mock-listings";

export default function ExplorePage() {
  const [activeCategory, setActiveCategory] = useState("all");

  const filtered =
    activeCategory === "all"
      ? MOCK_LISTINGS
      : MOCK_LISTINGS.filter((l) => l.category === activeCategory);

  return (
    <>
      <CategoryFilterBar
        activeCategory={activeCategory}
        onCategoryChange={setActiveCategory}
      />
      <div className="mx-auto max-w-container px-5 md:px-10 py-6">
        <ListingGrid listings={filtered} />
      </div>
    </>
  );
}
