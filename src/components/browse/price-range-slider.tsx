"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface Props {
  min: number;
  max: number;
  histogram: number[];
  value: [number, number];
  onChange: (v: [number, number]) => void;
}

/**
 * Dual-handle price range slider with histogram backdrop.
 * Purely native DOM — no extra deps.
 */
export function PriceRangeSlider({
  min,
  max,
  histogram,
  value,
  onChange,
}: Props) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<null | "min" | "max">(null);
  const [local, setLocal] = useState<[number, number]>(value);

  useEffect(() => {
    setLocal(value);
  }, [value[0], value[1]]); // eslint-disable-line react-hooks/exhaustive-deps

  const span = Math.max(1, max - min);
  const pct = (n: number) => ((n - min) / span) * 100;

  const pointerToValue = useCallback(
    (clientX: number): number => {
      const rect = trackRef.current?.getBoundingClientRect();
      if (!rect) return min;
      const p = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      return Math.round(min + p * span);
    },
    [min, span]
  );

  useEffect(() => {
    if (!drag) return;
    const move = (e: PointerEvent) => {
      const v = pointerToValue(e.clientX);
      setLocal((prev) => {
        if (drag === "min") return [Math.min(v, prev[1] - 1), prev[1]];
        return [prev[0], Math.max(v, prev[0] + 1)];
      });
    };
    const up = () => {
      setDrag(null);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
  }, [drag, pointerToValue]);

  // Commit after drag ends
  useEffect(() => {
    if (drag) return;
    if (local[0] !== value[0] || local[1] !== value[1]) {
      onChange(local);
    }
  }, [drag]); // eslint-disable-line react-hooks/exhaustive-deps

  const maxBucket = useMemo(() => Math.max(1, ...histogram), [histogram]);

  return (
    <div className="select-none">
      <div className="mb-2 flex h-16 items-end gap-px">
        {histogram.map((count, i) => {
          const bucketStart = min + (i / histogram.length) * span;
          const bucketEnd = min + ((i + 1) / histogram.length) * span;
          const inRange = bucketEnd >= local[0] && bucketStart <= local[1];
          return (
            <div
              key={i}
              className="flex-1 rounded-sm transition-colors"
              style={{
                height: `${Math.max(4, (count / maxBucket) * 100)}%`,
                // Inline so the trustead bg-muted glass remap can't
                // turn out-of-range bars invisible. Out-of-range stays
                // visible as a faded cream so the user can see the
                // distribution shape outside their selected window.
                backgroundColor: inRange
                  ? "var(--tt-cream, #F5F1E6)"
                  : "rgba(245, 241, 230, 0.22)",
              }}
            />
          );
        })}
      </div>
      <div
        ref={trackRef}
        className="relative mt-4 h-2 rounded-full"
        // Inline track + fill colors so trustead's bg-muted/foreground
        // remaps don't muddy the slider; track stays a faded cream rule,
        // fill is the solid mint that matches the brand pill.
        style={{ backgroundColor: "rgba(245, 241, 230, 0.18)" }}
        onPointerDown={(e) => {
          const v = pointerToValue(e.clientX);
          // Jump closer handle.
          if (Math.abs(v - local[0]) < Math.abs(v - local[1])) {
            setLocal([Math.min(v, local[1] - 1), local[1]]);
            setDrag("min");
          } else {
            setLocal([local[0], Math.max(v, local[0] + 1)]);
            setDrag("max");
          }
        }}
      >
        <div
          className="absolute top-0 h-2 rounded-full"
          style={{
            left: `${pct(local[0])}%`,
            width: `${pct(local[1]) - pct(local[0])}%`,
            backgroundColor: "var(--tt-cream, #F5F1E6)",
          }}
        />
        {(["min", "max"] as const).map((k) => (
          <button
            key={k}
            type="button"
            onPointerDown={(e) => {
              e.stopPropagation();
              setDrag(k);
            }}
            aria-label={`${k} price`}
            className="absolute top-1/2 h-6 w-6 -translate-x-1/2 -translate-y-1/2 rounded-full cursor-grab active:cursor-grabbing"
            style={{
              left: `${pct(local[k === "min" ? 0 : 1])}%`,
              // Solid cream knob — was bg-white which trustead glassed
              // into a translucent dark blob. Solid + no shadow reads
              // cleanly on the dark sidebar.
              backgroundColor: "var(--tt-cream, #F5F1E6)",
              border: "1px solid rgba(245, 241, 230, 0.35)",
            }}
          />
        ))}
      </div>
      <div className="mt-6 flex items-center gap-4">
        <PriceField
          label="Minimum"
          value={local[0]}
          onChange={(v) => {
            const next: [number, number] = [
              Math.max(min, Math.min(v, local[1] - 1)),
              local[1],
            ];
            setLocal(next);
            onChange(next);
          }}
        />
        <div className="h-px flex-1 bg-border" />
        <PriceField
          label="Maximum"
          value={local[1]}
          onChange={(v) => {
            const next: [number, number] = [
              local[0],
              Math.min(max, Math.max(v, local[0] + 1)),
            ];
            setLocal(next);
            onChange(next);
          }}
        />
      </div>
    </div>
  );
}

function PriceField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="flex flex-1 flex-col rounded-xl border border-border px-3 py-2">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="flex items-center">
        <span className="text-sm text-muted-foreground">$</span>
        <input
          type="number"
          value={value}
          onChange={(e) => {
            const n = parseInt(e.target.value, 10);
            if (Number.isFinite(n)) onChange(n);
          }}
          className="w-full bg-transparent text-sm outline-none tabular-nums"
        />
      </span>
    </label>
  );
}
