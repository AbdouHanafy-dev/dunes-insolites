"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

export type ReviewableItem = {
  catalogId: string;
  name: string;
  productType: "TOUR" | "TOURTYPE" | "EXTRA";
};

export default function ReviewForm({ items }: { items: ReviewableItem[] }) {
  const t = useTranslations("account");
  const [selected, setSelected] = useState(items[0]?.catalogId ?? "");
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState("");

  if (items.length === 0) return null;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const item = items.find((i) => i.catalogId === selected);
    if (!item) return;

    setState("sending");
    setError("");
    const res = await fetch("/api/account/reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        productId: item.catalogId,
        productType: item.productType,
        rating,
        comment,
      }),
    });

    if (res.ok) {
      setState("sent");
      setComment("");
      return;
    }
    const data = await res.json().catch(() => ({}));
    setError(data.error ?? t("reviewGenericError"));
    setState("error");
  }

  if (state === "sent") {
    return <p className="alert ok">{t("reviewSent")}</p>;
  }

  return (
    <form onSubmit={onSubmit} className="form-grid" style={{ marginTop: 0 }}>
      <div className="field span-2">
        <label htmlFor="review-item">{t("reviewItemLabel")}</label>
        <select id="review-item" value={selected} onChange={(e) => setSelected(e.target.value)}>
          {items.map((i) => (
            <option key={i.catalogId} value={i.catalogId}>
              {i.name}
            </option>
          ))}
        </select>
      </div>
      <div className="field">
        <label htmlFor="review-rating">{t("reviewRatingLabel")}</label>
        <select
          id="review-rating"
          value={rating}
          onChange={(e) => setRating(Number(e.target.value))}
        >
          {[5, 4, 3, 2, 1].map((n) => (
            <option key={n} value={n}>
              {n} / 5
            </option>
          ))}
        </select>
      </div>
      <div className="field span-2">
        <label htmlFor="review-comment">{t("reviewCommentLabel")}</label>
        <textarea
          id="review-comment"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          required
        />
      </div>

      {error && <div className="alert" style={{ gridColumn: "1 / -1" }}>{error}</div>}

      <div className="book-actions" style={{ gridColumn: "1 / -1" }}>
        <button type="submit" className="btn-accent" disabled={state === "sending"}>
          {state === "sending" ? t("reviewSending") : t("reviewSubmit")}
        </button>
      </div>
    </form>
  );
}
