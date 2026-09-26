"use client";

import { Fragment } from "react";
import { useCurrency } from "@/components/CurrencyProvider";
import { splitPriceTokens } from "@/lib/currency";

/** An amount in euros, shown in the visitor's currency. Usable from server components. */
export function Price({ eur }: { eur: number | null | undefined }) {
  const { format } = useCurrency();
  return <>{format(eur ?? 0)}</>;
}

/**
 * A translated sentence whose prices were passed as tokens (priceToken), shown with each
 * token in the visitor's currency: <PriceText text={t("fromPrice", { price: priceToken(45) })} />.
 */
export function PriceText({ text }: { text: string }) {
  const { format, toEur } = useCurrency();
  return (
    <>
      {splitPriceTokens(text).map((chunk, i) =>
        typeof chunk === "string" ? <Fragment key={i}>{chunk}</Fragment> : <Fragment key={i}>{format(toEur(chunk.amount, chunk.from))}</Fragment>,
      )}
    </>
  );
}
