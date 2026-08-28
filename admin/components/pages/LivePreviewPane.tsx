"use client";

import { useEffect, useRef, useState } from "react";
import type { PageBlock } from "@/lib/api";

// Slugs the vitrine actually knows how to render from the CMS today — see
// ARCHITECTURE.md §10.6. Anything else has nowhere real to preview yet.
const PREVIEW_PATHS: Record<string, string> = {
  "legal-privacy": "/legal/privacy",
  "legal-terms": "/legal/terms",
  safety: "/safety",
};

const FRONTEND_BASE = (process.env.NEXT_PUBLIC_FRONTEND_URL ?? "http://localhost:3000").replace(
  /\/+$/,
  "",
);

const WIDTHS = [
  { key: "responsive", label: "Responsive", width: "100%" },
  { key: "mobile", label: "Mobile", width: "390px" },
  { key: "tablet", label: "Tablette", width: "768px" },
  { key: "desktop", label: "Bureau", width: "1440px" },
] as const;

export default function LivePreviewPane({
  slug,
  title,
  blocks,
}: {
  slug: string;
  title: string;
  blocks: PageBlock[];
}) {
  const path = PREVIEW_PATHS[slug];
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [ready, setReady] = useState(false);
  const [widthKey, setWidthKey] = useState<(typeof WIDTHS)[number]["key"]>("responsive");

  // The iframe posts "cms-preview-ready" once its own listener is mounted —
  // only start posting updates after that, so the very first payload isn't
  // sent into a frame that isn't listening yet.
  useEffect(() => {
    function onMessage(e: MessageEvent) {
      if (e.data?.type === "cms-preview-ready") setReady(true);
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  useEffect(() => {
    if (!ready || !iframeRef.current?.contentWindow) return;
    const parsedBlocks = blocks.map((b) => ({
      type: b.type,
      data: (() => {
        try {
          return JSON.parse(b.dataJson || "{}");
        } catch {
          return {};
        }
      })(),
    }));
    iframeRef.current.contentWindow.postMessage(
      { type: "cms-preview-update", page: { title, blocks: parsedBlocks } },
      "*",
    );
  }, [ready, title, blocks]);

  if (!path) {
    return (
      <div className="flex h-full min-h-[400px] items-center justify-center rounded-2xl border border-dashed border-navy-700/15 bg-white p-10 text-center">
        <p className="text-sm text-navy-700/50">
          Pas d&apos;aperçu en direct pour ce slug — la vitrine ne sait pas encore rendre{" "}
          <code className="rounded bg-navy-700/6 px-1.5 py-0.5">{slug || "(vide)"}</code> depuis le
          CMS. Voir ARCHITECTURE.md §10.6.
        </p>
      </div>
    );
  }

  const activeWidth = WIDTHS.find((w) => w.key === widthKey) ?? WIDTHS[0];

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-navy-700/10 bg-white">
      <div className="flex items-center justify-between gap-3 border-b border-navy-700/8 px-4 py-2.5">
        <div className="flex gap-1">
          {WIDTHS.map((w) => (
            <button
              key={w.key}
              type="button"
              onClick={() => setWidthKey(w.key)}
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition ${
                widthKey === w.key
                  ? "bg-gold/16 text-navy-800"
                  : "text-navy-700/50 hover:bg-navy-700/6"
              }`}
            >
              {w.label}
            </button>
          ))}
        </div>
        <span className="text-[11px] text-navy-700/35">
          {ready ? "Aperçu connecté" : "Connexion à la vitrine…"}
        </span>
      </div>
      <div className="flex-1 overflow-auto bg-navy-700/4 p-4">
        <div
          className="mx-auto h-full min-h-[600px] overflow-hidden rounded-xl bg-white shadow-sm transition-[width]"
          style={{ width: activeWidth.width, maxWidth: "100%" }}
        >
          <iframe
            ref={iframeRef}
            src={`${FRONTEND_BASE}${path}?livePreview=1`}
            title="Aperçu en direct"
            className="h-full min-h-[600px] w-full border-0"
          />
        </div>
      </div>
    </div>
  );
}
