"use client";

/**
 * Last-resort fallback — only fires if app/layout.tsx itself throws, which
 * app/error.tsx can't catch (that boundary sits below the root layout, not
 * above it). Dependency-free on purpose: no Tailwind class, no font import
 * — the thing that broke could be exactly one of those.
 */
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="fr">
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif" }}>
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 32,
            textAlign: "center",
            background: "#f9fafb",
            color: "#13315c",
          }}
        >
          <div style={{ maxWidth: 380 }}>
            <h1 style={{ fontSize: 20, margin: "0 0 10px" }}>Une erreur est survenue</h1>
            <p style={{ opacity: 0.7, lineHeight: 1.6, margin: "0 0 20px", fontSize: 14 }}>
              Veuillez réessayer dans un instant.
            </p>
            <button
              type="button"
              onClick={() => reset()}
              style={{
                padding: "9px 18px",
                borderRadius: 9,
                border: "none",
                background: "#1f4384",
                color: "#fff",
                fontSize: 14,
                cursor: "pointer",
              }}
            >
              Réessayer
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
