"use client";

import { AppShell } from "@/components/app-shell";
import { ListingCard } from "@/components/listing-card";
import { TrustScoreBadge } from "@/components/trust-score-badge";
import { ThemeToggle } from "@/components/theme-toggle";
import { mockListings } from "@/lib/mock-data";

const colorSwatches = [
  { label: "Background", var: "--background", dark: "#09090B", light: "#FAFAFA" },
  { label: "Card", var: "--card", dark: "#18181B", light: "#FFFFFF" },
  { label: "Muted", var: "--muted", dark: "#27272A", light: "#F4F4F5" },
  { label: "Border", var: "--border", dark: "rgba(255,255,255,0.08)", light: "#E4E4E7" },
  { label: "Primary", var: "--primary", dark: "#10B981", light: "#10B981" },
  { label: "Emerald 400", var: "--emerald-400", dark: "#34D399", light: "#34D399" },
  { label: "Destructive", var: "--destructive", dark: "#EF4444", light: "#EF4444" },
];

const trustSwatches = [
  { label: "Low (0-30)", color: "#EF4444", score: 22 },
  { label: "Building (31-60)", color: "#F59E0B", score: 48 },
  { label: "Solid (61-80)", color: "#10B981", score: 74 },
  { label: "Exceptional (81-100)", color: "#06B6D4", score: 95 },
];

const typeSamples = [
  { label: "Display", className: "text-4xl font-bold tracking-tight", text: "One Degree" },
  { label: "Heading 1", className: "text-2xl font-semibold tracking-tight", text: "Trust Network" },
  { label: "Heading 2", className: "text-lg font-semibold", text: "Your Listings" },
  { label: "Body", className: "text-sm text-muted-foreground", text: "Private home rentals through trusted connections." },
  { label: "Caption", className: "text-xs text-muted-foreground", text: "Last updated 3 minutes ago" },
  { label: "Mono/Metric", className: "font-mono text-lg font-bold", text: "92 / 100" },
  { label: "Mono Small", className: "font-mono text-xs text-muted-foreground", text: "47 stays · 4.9 avg" },
];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4">
      <div className="flex items-center gap-3">
        <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
        <div className="h-px flex-1 bg-border" />
      </div>
      {children}
    </section>
  );
}

export default function DesignPage() {
  return (
    <AppShell
      user={{
        name: "Alex Rivera",
        email: "alex@onedegreebnb.com",
      }}
    >
      <div className="space-y-12">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Design System</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              One Degree BNB — Component styleguide & token reference
            </p>
          </div>
          <ThemeToggle />
        </div>

        {/* Color Palette */}
        <Section title="Color Palette">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
            {colorSwatches.map((s) => (
              <div key={s.var} className="space-y-2">
                <div
                  className="h-16 rounded border border-border"
                  style={{ background: `var(${s.var})` }}
                />
                <div>
                  <p className="text-xs font-medium">{s.label}</p>
                  <p className="font-mono text-[10px] text-muted-foreground">{s.var}</p>
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* Trust Score Colors */}
        <Section title="Trust Score Scale">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {trustSwatches.map((s) => (
              <div key={s.label} className="flex items-center gap-3 rounded-lg border border-border bg-card p-3">
                <div
                  className="h-10 w-10 rounded"
                  style={{ background: s.color }}
                />
                <div>
                  <p className="text-xs font-medium">{s.label}</p>
                  <p className="font-mono text-[10px] text-muted-foreground">{s.color}</p>
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* Typography */}
        <Section title="Typography">
          <div className="space-y-4 rounded-lg border border-border bg-card p-6">
            {typeSamples.map((t) => (
              <div key={t.label} className="flex items-baseline gap-4">
                <span className="w-28 shrink-0 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  {t.label}
                </span>
                <span className={t.className}>{t.text}</span>
              </div>
            ))}
          </div>
        </Section>

        {/* Trust Score Badge — All Sizes */}
        <Section title="Trust Score Badge">
          <div className="grid gap-8 sm:grid-cols-3">
            {/* Small */}
            <div className="space-y-3">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Small (inline)
              </p>
              <div className="flex flex-wrap gap-2">
                {[22, 48, 74, 95].map((score) => (
                  <TrustScoreBadge key={score} score={score} size="sm" />
                ))}
              </div>
            </div>

            {/* Medium */}
            <div className="space-y-3">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Medium (default)
              </p>
              <div className="flex flex-wrap gap-4">
                {[22, 48, 74, 95].map((score) => (
                  <TrustScoreBadge
                    key={score}
                    score={score}
                    size="md"
                    showLabel
                    vouchCount={score > 60 ? 12 : 3}
                  />
                ))}
              </div>
            </div>

            {/* Large */}
            <div className="space-y-3">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Large (detail view)
              </p>
              <div className="flex flex-wrap gap-6">
                {[28, 45, 78, 95].map((score) => (
                  <TrustScoreBadge
                    key={score}
                    score={score}
                    size="lg"
                    vouchCount={score > 60 ? 15 : 2}
                  />
                ))}
              </div>
            </div>
          </div>
        </Section>

        {/* Listing Cards */}
        <Section title="Listing Cards">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {mockListings.map((listing) => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>
        </Section>

        {/* Glassmorphism */}
        <Section title="Surface Treatments">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-lg border border-border bg-card p-6">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Card (solid)
              </p>
              <p className="mt-2 text-sm">Standard card surface</p>
            </div>
            <div className="glass rounded-lg p-6">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Glass
              </p>
              <p className="mt-2 text-sm">Glassmorphism overlay</p>
            </div>
            <div className="rounded-lg border border-border bg-muted p-6">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Muted
              </p>
              <p className="mt-2 text-sm">Recessed surface</p>
            </div>
          </div>
        </Section>
      </div>
    </AppShell>
  );
}
