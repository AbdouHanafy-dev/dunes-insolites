/**
 * Guards admin-entered image fields (Stay.image, Tour.coverImage,
 * Accommodation.image, ...) before handing them to next/image, which throws
 * `TypeError: Failed to construct 'URL': Invalid URL` and crashes the page
 * when `src` isn't a leading-slash path or an absolute http(s) URL — e.g. an
 * admin typing a bare word like "desert" into the image field instead of a
 * real path.
 */
export function isDisplayableImageSrc(src: string | null | undefined): src is string {
  if (!src) return false;
  if (src.startsWith("/")) return true;
  try {
    const url = new URL(src);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}
