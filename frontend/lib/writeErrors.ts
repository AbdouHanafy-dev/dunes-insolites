import type { WriteResult } from "@/lib/api";

type Failure = Extract<WriteResult<unknown>, { ok: false }>;

/**
 * One message that says exactly what failed: the server's own reason, then
 * every rejected field ("partySize: must be at most 12"), then the HTTP status.
 * Field errors are shown even when the field lives on an earlier wizard step,
 * where an inline error would never be visible to the guest.
 */
export function describeWriteFailure(result: Failure, fallback: string): string {
  const parts: string[] = [result.message?.trim() || fallback];
  const fields = Object.entries(result.errors ?? {});
  if (fields.length > 0) {
    parts.push(fields.map(([field, message]) => `${field}: ${message}`).join(" · "));
  }
  if (result.status) parts.push(`(HTTP ${result.status})`);
  return parts.join(" — ");
}
