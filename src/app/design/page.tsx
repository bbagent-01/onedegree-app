"use client";

import { AppShell } from "@/components/app-shell";
import { ListingCard } from "@/components/listing-card";
import { TrustScoreBadge } from "@/components/trust-score-badge";
import { mockListings } from "@/lib/mock-data";

const colorSwatches = [
  { label: "Cream", value: "#FAF8F5", var: "--background" },
  { label: "Cream Mid", value: "#F3F0EB", var: "--background-mid" },
  { label: "Cream Dark", value: "#EBE7E0", var: "--background-dark" },
  { label: "Border", value: "#E5E1DA", var: "--border" },
  { label: "Purple Top", value: "#8B5CF6", var: "--primary-top" },
  { label: "Purple Mid", value: "#6366F1", var: "--primary" },
  { label: "Purple Bot", value: "#312E81", var: "--primary-bot" },
  { label: "Purple Light", value: "#F5F3FF", var: "--primary-light" },
];

const trustSwatches = [
  { label: "Low (0-30)", color: "#EF4444", score: 22 },
  { label: "Building (31-60)", color: "#F59E0B", score: 48 },
  { label: "Solid (61-80)", color: "#059669", score: 74 },
  { label: "Exceptional (81-100)", color: "#8B5CF6", score: 95 },
];

const typeSamples = [
  { label: "Display", className: "font-display text-5xl", text: "One Degree" },
  { label: "Display Italic", className: "font-display text-5xl italic", text: "Trust Network" },
  { label: "Heading 2", className: "font-display text-3xl", text: "Your Listings" },
  { label: "Heading 3", className: "font-display text-xl", text: "Private & Vetted" },
  { label: "Body", className: "text-base text-foreground-secondary", text: "Private home rentals through trusted connections." },
  { label: "Caption", className: "text-xs text-foreground-tertiary", text: "Last updated 3 minutes ago" },
  { label: "Mono/Metric", className: "font-mono text-lg font-bold text-primary", text: "92 / 100" },
  { label: "Mono Small", className: "font-mono text-xs text-foreground-secondary", text: "47 stays · 4.9 avg" },
  { label: "Pill Label", className: "font-mono text-[11px] font-semibold uppercase tracking-widest text-primary", text: "PRIVATE PLATFORM" },
];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4">
      <div className="flex items-center gap-3">
        <h2 className="font-display text-2xl">{title}</h2>
        <div className="h-px flex-1 bg-border" />
      </div>
      {children}
    </section>
  );
}

export default function DesignPage() {
  return (
    <AppShell>
      <div className="space-y-12">
        {/* Header */}
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-primary-border bg-primary-light px-4 py-1.5 font-mono text-[11px] font-semibold uppercase tracking-widest text-primary mb-4">
            Design System
          </div>
          <h1 className="font-display text-4xl">One Degree BNB</h1>
          <p className="mt-1 text-foreground-secondary">
            Component styleguide &amp; token reference
          </p>
        </div>

        {/* Color Palette */}
        <Section title="Color Palette">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
            {colorSwatches.map((s) => (
              <div key={s.var} className="space-y-2">
                <div
                  className="h-16 rounded-xl border border-border"
                  style={{ background: s.value }}
                />
                <div>
                  <p className="text-xs font-medium text-foreground">{s.label}</p>
                  <p className="font-mono text-[10px] text-foreground-tertiary">{s.value}</p>
                </div>
              </div>
            ))}
          </div>
          {/* Gradient */}
          <div className="space-y-2">
            <div className="h-16 rounded-xl" style={{ background: 'linear-gradient(135deg, #8B5CF6, #312E81)' }} />
            <p className="text-xs font-medium text-foreground">Purple Gradient</p>
            <p className="font-mono text-[10px] text-foreground-tertiary">135deg, #8B5CF6 → #312E81</p>
          </div>
        </Section>

        {/* Trust Score Colors */}
        <Section title="Trust Score Scale">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {trustSwatches.map((s) => (
              <div key={s.label} className="flex items-center gap-3 rounded-2xl border border-border bg-white/60 backdrop-blur-lg p-4">
                <div
                  className="h-10 w-10 rounded-xl"
                  style={{ background: s.color }}
                />
                <div>
                  <p className="text-xs font-medium text-foreground">{s.label}</p>
                  <p className="font-mono text-[10px] text-foreground-tertiary">{s.color}</p>
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* Typography */}
        <Section title="Typography">
          <div className="space-y-5 rounded-2xl border border-border bg-white/60 backdrop-blur-lg p-6">
            {typeSamples.map((t) => (
              <div key={t.label} className="flex items-baseline gap-4">
                <span className="w-28 shrink-0 font-mono text-[10px] font-semibold uppercase tracking-widest text-foreground-tertiary">
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
              <p className="font-mono text-[10px] font-semibold uppercase tracking-widest text-foreground-tertiary">
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
              <p className="font-mono text-[10px] font-semibold uppercase tracking-widest text-foreground-tertiary">
                Medium (default)
              </p>
              <div className="flex flex-wrap gap-4">
                {[22, 48, 74, 95].map((score) => (
                  <TrustScoreBadge
                    key={score}
                    score={score}
                    size="md"
                    vouchCount={score > 60 ? 12 : 3}
                  />
                ))}
              </div>
            </div>

            {/* Large */}
            <div className="space-y-3">
              <p className="font-mono text-[10px] font-semibold uppercase tracking-widest text-foreground-tertiary">
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

        {/* Surface Treatments */}
        <Section title="Surface Treatments">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-border bg-white/60 backdrop-blur-lg p-6">
              <p className="font-mono text-[10px] font-semibold uppercase tracking-widest text-foreground-tertiary">
                Glass Card
              </p>
              <p className="mt-2 text-sm text-foreground-secondary">White/glass with warm border</p>
            </div>
            <div className="glass p-6">
              <p className="font-mono text-[10px] font-semibold uppercase tracking-widest text-foreground-tertiary">
                Glass Utility
              </p>
              <p className="mt-2 text-sm text-foreground-secondary">Backdrop blur overlay</p>
            </div>
            <div className="rounded-2xl bg-background-mid p-6">
              <p className="font-mono text-[10px] font-semibold uppercase tracking-widest text-foreground-tertiary">
                Cream Mid
              </p>
              <p className="mt-2 text-sm text-foreground-secondary">Recessed/muted surface</p>
            </div>
          </div>
        </Section>

        {/* Pill / Label Components */}
        <Section title="Pills &amp; Labels">
          <div className="flex flex-wrap gap-3">
            <span className="inline-flex items-center rounded-full border border-primary-border bg-primary-light px-4 py-1.5 font-mono text-[11px] font-semibold uppercase tracking-widest text-primary">
              Private Platform
            </span>
            <span className="inline-flex items-center rounded-full border border-red-200 bg-red-50 px-4 py-1.5 font-mono text-[11px] font-semibold uppercase tracking-widest text-red-700">
              The Problem
            </span>
            <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-4 py-1.5 font-mono text-[11px] font-semibold uppercase tracking-widest text-emerald-700">
              The Solution
            </span>
          </div>
        </Section>
      </div>
    </AppShell>
  );
}
