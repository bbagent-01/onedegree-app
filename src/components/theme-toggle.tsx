"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";

export function ThemeToggle({ className }: { className?: string }) {
  const [dark, setDark] = useState(true);

  useEffect(() => {
    const html = document.documentElement;
    setDark(html.classList.contains("dark"));
  }, []);

  const toggle = () => {
    const html = document.documentElement;
    html.classList.toggle("dark");
    setDark(html.classList.contains("dark"));
  };

  return (
    <button
      onClick={toggle}
      className={cn(
        "inline-flex items-center gap-2 rounded-md border border-border bg-card px-3 py-1.5 text-xs font-medium text-card-foreground transition-colors hover:bg-accent",
        className
      )}
    >
      {dark ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
      {dark ? "Light mode" : "Dark mode"}
    </button>
  );
}
