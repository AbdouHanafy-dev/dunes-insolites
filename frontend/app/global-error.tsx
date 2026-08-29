"use client";

/**
 * Last-resort fallback — only fires if app/[locale]/layout.tsx itself
 * throws (not a page, the root layout), which error.tsx inside [locale]
 * can't catch since that boundary sits below the layout, not above it.
 * Must render its own <html>/<body> and stay dependency-free (no
 * next-intl, no globals.css import, no design-token CSS variables) since
 * the thing that broke could be exactly one of those. English-only,
 * deliberately — this is the one screen where "at least it says
 * something" beats translated copy that might depend on the same broken
 * provider tree.
 */
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif" }}>
        <div
          style={{
            minHeight: "100dvh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 32,
            textAlign: "center",
            background: "#2a1008",
            color: "#fdf1e1",
          }}
        >
          <div style={{ maxWidth: 420 }}>
            <h1 style={{ fontSize: 22, margin: "0 0 12px" }}>Something went wrong</h1>
            <p style={{ opacity: 0.8, lineHeight: 1.6, margin: "0 0 24px" }}>
              Please try again in a moment.
            </p>
            <button
              type="button"
              onClick={() => reset()}
              style={{
                padding: "10px 20px",
                borderRadius: 999,
                border: "none",
                background: "#c8642f",
                color: "#fff",
                fontSize: 14,
                cursor: "pointer",
              }}
            >
              Try again
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
