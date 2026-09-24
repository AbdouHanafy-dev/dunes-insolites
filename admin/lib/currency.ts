/** Display form of a currency code: euros show as €, others keep their code. */
export function sym(code: string | null | undefined): string {
  if (code === "EUR") return "€";
  if (code === "USD") return "$";
  return code ?? "";
}
