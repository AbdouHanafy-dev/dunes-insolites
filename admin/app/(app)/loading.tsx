/**
 * Next.js's automatic loading UI - shown the instant a navigation starts,
 * for as long as the target page's server component is fetching data. Every
 * screen under this layout used to just freeze (or flash blank) on
 * navigation with no signal at all; this is the one file that fixes that
 * everywhere at once, since Next.js scopes a loading.tsx to its whole route
 * subtree. AppShell (sidebar, header) stays mounted underneath - this only
 * replaces the content slot, same as error.tsx/not-found.tsx do.
 *
 * Shaped like the most common screen in this app - a title, a summary line,
 * and a card full of rows - so the transition into a real list page doesn't
 * jump. Deliberately generic rather than one skeleton per route: most
 * screens here already share this exact shape (CollectionList).
 */
export default function Loading() {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-2">
          <div className="h-6 w-40 animate-pulse rounded bg-navy-700/10" />
          <div className="h-4 w-24 animate-pulse rounded bg-navy-700/8" />
        </div>
        <div className="h-9 w-28 animate-pulse rounded-lg bg-navy-700/10" />
      </div>

      <div className="h-10 w-full max-w-sm animate-pulse rounded-[9px] bg-navy-700/8" />

      <div className="card overflow-hidden rounded-2xl">
        <div className="divide-y divide-gray-100">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-6 py-4">
              <div className="h-4 w-1/4 animate-pulse rounded bg-navy-700/8" />
              <div className="h-4 w-1/5 animate-pulse rounded bg-navy-700/8" />
              <div className="h-4 w-1/6 animate-pulse rounded bg-navy-700/8" />
              <div className="ml-auto h-4 w-16 animate-pulse rounded bg-navy-700/8" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
