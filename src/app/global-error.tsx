"use client";

/**
 * Global client-side error boundary. Catches React render/hydration
 * errors that would otherwise show Next.js's opaque "Application
 * error" page. Alpha-c only surfaces the real error text so we can
 * diagnose without asking Loren to open the browser console.
 *
 * Safe to remove before beta — swap for a real branded error page.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body style={{ fontFamily: "system-ui, sans-serif", padding: "2rem" }}>
        <div
          style={{
            maxWidth: 720,
            margin: "0 auto",
            padding: "1.5rem",
            border: "2px solid #fca5a5",
            borderRadius: 12,
            background: "#fef2f2",
          }}
        >
          <h1 style={{ fontSize: 18, fontWeight: 700, color: "#7f1d1d" }}>
            Something went wrong on this page
          </h1>
          <p style={{ marginTop: 8, color: "#991b1b", fontSize: 14 }}>
            The error below is the actual exception that hit the browser.
            Share this with a screenshot so we can fix it.
          </p>
          <pre
            style={{
              marginTop: 16,
              padding: 12,
              background: "#fff",
              border: "1px solid #fecaca",
              borderRadius: 8,
              fontSize: 12,
              color: "#7f1d1d",
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
              overflowX: "auto",
            }}
          >
            {error?.name ? `${error.name}: ` : ""}
            {error?.message || "Unknown error"}
            {error?.digest ? `\n\ndigest: ${error.digest}` : ""}
            {error?.stack ? `\n\n${error.stack}` : ""}
          </pre>
          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: 16,
              padding: "8px 16px",
              background: "#7f1d1d",
              color: "#fff",
              border: 0,
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
