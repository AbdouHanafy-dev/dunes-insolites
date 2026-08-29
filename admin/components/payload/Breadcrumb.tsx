import Link from "next/link";

export type Crumb = { label: string; href?: string };

/**
 * "Collection / Document" step-nav at the top of every document editor —
 * one of Payload's most recognizable UI signatures, replacing the old
 * single "← Collection" back-link with a trail that also names the
 * current document. Every item except the last is a link; the last one
 * (the current document, or "Nouveau …" while creating) is plain text.
 */
export default function Breadcrumb({ items }: { items: Crumb[] }) {
  return (
    <nav className="flex flex-wrap items-center gap-1.5 text-[13px]">
      {items.map((item, i) => {
        const isLast = i === items.length - 1;
        return (
          <span key={i} className="flex items-center gap-1.5">
            {i > 0 && <span className="text-navy-700/25">/</span>}
            {item.href && !isLast ? (
              <Link href={item.href} className="font-medium text-navy-700/55 hover:text-navy-800">
                {item.label}
              </Link>
            ) : (
              <span className={isLast ? "font-semibold text-navy-800" : "font-medium text-navy-700/55"}>
                {item.label}
              </span>
            )}
          </span>
        );
      })}
    </nav>
  );
}
