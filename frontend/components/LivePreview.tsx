"use client";

import { useEffect, useState } from "react";
import PageHead from "@/components/PageHead";
import CmsBlocks from "@/components/CmsBlocks";
import type { CmsBlock } from "@/lib/api";

type PreviewPayload = { title: string; blocks: CmsBlock[] };

/**
 * Renders inside an iframe embedded by the admin's Pages editor
 * (admin/components/pages/LivePreviewPane.tsx) — never fetches anything
 * itself. The admin posts the current, possibly-unsaved form state on every
 * edit; this just re-renders it. No admin session or draft-fetch endpoint
 * needed, unlike a typical preview-token setup, since nothing here ever
 * touches the backend.
 */
export default function LivePreview({ eyebrow }: { eyebrow: string }) {
  const [page, setPage] = useState<PreviewPayload | null>(null);

  useEffect(() => {
    function onMessage(e: MessageEvent) {
      // Same-machine dev/staging admin only — the whole point is embedding
      // an iframe of this app inside the admin's own origin, so there is no
      // third party this could ever legitimately receive a payload from.
      if (e.data?.type !== "cms-preview-update") return;
      setPage(e.data.page as PreviewPayload);
    }
    window.addEventListener("message", onMessage);
    // Tell the parent we're mounted and ready to receive the first payload
    // — the parent starts posting only after seeing this, so nothing is
    // sent into the void before the listener above exists.
    window.parent.postMessage({ type: "cms-preview-ready" }, "*");
    return () => window.removeEventListener("message", onMessage);
  }, []);

  if (!page) {
    return (
      <div style={{ padding: 64, textAlign: "center", color: "#8a7a63" }}>
        En attente du contenu de l&apos;éditeur…
      </div>
    );
  }

  return (
    <>
      <PageHead eyebrow={eyebrow} title={page.title || "(sans titre)"} lead="" />
      <CmsBlocks blocks={page.blocks} />
    </>
  );
}
