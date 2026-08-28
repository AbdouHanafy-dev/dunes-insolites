import Image from "next/image";
import { Link } from "@/i18n/navigation";
import type { CmsBlock } from "@/lib/api";

/**
 * Renders the block types the admin CMS's page builder can produce
 * (admin/components/pages/blockTypes.tsx) into the vitrine's existing
 * visual language (.prose, .btn-accent, .faq) rather than inventing a
 * parallel style system for CMS content.
 *
 * accommodationShowcase isn't rendered publicly yet — it stores TourType
 * ids, and there's no public endpoint yet to resolve those into cards here.
 * A page using that block will just skip it rather than show broken data.
 */
export default function CmsBlocks({ blocks }: { blocks: CmsBlock[] }) {
  return <>{groupRuns(blocks).map((item, i) => renderItem(item, i))}</>;
}

type Group = { kind: "faqGroup"; faqs: CmsBlock[] } | { kind: "richTextGroup"; items: CmsBlock[] };
type RenderItem = { kind: "block"; block: CmsBlock } | Group;

/**
 * Consecutive blocks of the same "flows as one article" type merge into a
 * single wrapping section instead of one per block — otherwise five
 * headed paragraphs from one richText-per-section page (a migrated legal
 * page, say) would render as five separately-padded sand sections instead
 * of one continuous article, and five separate FAQ questions would render
 * as five one-item accordions instead of one real accordion.
 */
function groupRuns(blocks: CmsBlock[]): RenderItem[] {
  const out: RenderItem[] = [];
  for (const block of blocks) {
    const prev = out[out.length - 1];
    if (block.type === "faq" && prev?.kind === "faqGroup") {
      prev.faqs.push(block);
    } else if (block.type === "faq") {
      out.push({ kind: "faqGroup", faqs: [block] });
    } else if (block.type === "richText" && prev?.kind === "richTextGroup") {
      prev.items.push(block);
    } else if (block.type === "richText") {
      out.push({ kind: "richTextGroup", items: [block] });
    } else {
      out.push({ kind: "block", block });
    }
  }
  return out;
}

function renderItem(item: RenderItem, i: number) {
  if (item.kind === "faqGroup") return <FaqGroup key={i} faqs={item.faqs} />;
  if (item.kind === "richTextGroup") return <RichTextGroup key={i} items={item.items} />;
  const { block } = item;
  switch (block.type) {
    case "hero":
      return <HeroBlock key={i} data={block.data} />;
    case "cta":
      return <CtaBlock key={i} data={block.data} />;
    case "team":
      return <TeamBlock key={i} data={block.data} />;
    default:
      return null;
  }
}

function str(v: unknown): string {
  return typeof v === "string" ? v : "";
}

function HeroBlock({ data }: { data: Record<string, unknown> }) {
  const title = str(data.title);
  const subtitle = str(data.subtitle);
  const ctaLabel = str(data.ctaLabel);
  const ctaUrl = str(data.ctaUrl);
  if (!title) return null;
  return (
    <section className="section-sand">
      <div className="wrap">
        <div className="prose">
          <h1>{title}</h1>
          {subtitle && <p className="lead">{subtitle}</p>}
          {ctaLabel && ctaUrl && (
            <p>
              <Link href={ctaUrl} className="btn-accent">
                {ctaLabel}
              </Link>
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

/**
 * One or more richText blocks, flowing together in a single .prose
 * container — same shape as the hardcoded legal/safety/about pages, which
 * are all one <div className="prose"> with several <h2>s inside, not one
 * section per heading.
 *
 * Per block: an optional `heading` renders as a real <h2>. In `content`, a
 * line starting with "- " opens/continues a bullet list (consecutive such
 * lines become a real <ul>); a blank line ends the current paragraph or
 * list. Plain-text authoring convention, not Markdown.
 */
function RichTextGroup({ items }: { items: CmsBlock[] }) {
  const sections = items
    .map((block) => ({ heading: str(block.data.heading), content: str(block.data.content) }))
    .filter((s) => s.heading || s.content);
  if (sections.length === 0) return null;

  return (
    <section className="section-sand">
      <div className="wrap">
        <div className="prose">
          {sections.map((section, si) => (
            <div key={si}>
              {section.heading && <h2>{section.heading}</h2>}
              {parseContent(section.content).map((b, i) =>
                b.type === "ul" ? (
                  <ul key={i}>
                    {b.lines.map((l, j) => (
                      <li key={j}>{l}</li>
                    ))}
                  </ul>
                ) : (
                  <p key={i}>{b.lines[0]}</p>
                ),
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function parseContent(content: string): { type: "p" | "ul"; lines: string[] }[] {
  const blocks: { type: "p" | "ul"; lines: string[] }[] = [];
  for (const raw of content.split(/\n{2,}/)) {
    const trimmed = raw.trim();
    if (!trimmed) continue;
    const lines = trimmed.split("\n").map((l) => l.trim());
    if (lines.every((l) => l.startsWith("- "))) {
      blocks.push({ type: "ul", lines: lines.map((l) => l.slice(2)) });
    } else {
      blocks.push({ type: "p", lines: [trimmed] });
    }
  }
  return blocks;
}

function CtaBlock({ data }: { data: Record<string, unknown> }) {
  const title = str(data.title);
  const buttonLabel = str(data.buttonLabel);
  const buttonUrl = str(data.buttonUrl);
  if (!title) return null;
  return (
    <section className="section-sand">
      <div className="wrap" style={{ textAlign: "center" }}>
        <h2>{title}</h2>
        {buttonLabel && buttonUrl && (
          <Link href={buttonUrl} className="btn-accent">
            {buttonLabel}
          </Link>
        )}
      </div>
    </section>
  );
}

/** Renders as the same .faq/<details> accordion markup as the hardcoded
 *  safety page, so a CMS-driven FAQ list looks and behaves identically. */
function FaqGroup({ faqs }: { faqs: CmsBlock[] }) {
  const entries = faqs
    .map((f) => ({ q: str(f.data.question), a: str(f.data.answer) }))
    .filter((f) => f.q);
  if (entries.length === 0) return null;
  return (
    <section className="section-sand">
      <div className="wrap">
        <div className="faq">
          {entries.map((f, i) => (
            <details key={i}>
              <summary>{f.q}</summary>
              {f.a && <p>{f.a}</p>}
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

type TeamMember = { name: string; role: string; photo: string; bio: string };

/** Renders as the same .team/.member markup the hardcoded About page's
 *  guide cards always used. */
function TeamBlock({ data }: { data: Record<string, unknown> }) {
  const heading = str(data.heading);
  const rawMembers = Array.isArray(data.members) ? data.members : [];
  const members: TeamMember[] = rawMembers
    .map((m) => {
      const r = m as Record<string, unknown>;
      return { name: str(r.name), role: str(r.role), photo: str(r.photo), bio: str(r.bio) };
    })
    .filter((m) => m.name);
  if (members.length === 0) return null;
  return (
    <section className="section-sand">
      <div className="wrap">
        {heading && (
          <h2 className="sect-title" style={{ fontSize: "clamp(30px,3.6vw,52px)" }}>
            {heading}
          </h2>
        )}
        <div className="team">
          {members.map((m, i) => (
            <div key={i} className="member">
              {m.photo && (
                <div className="photo">
                  <Image src={m.photo} alt={m.name} fill sizes="(max-width: 900px) 50vw, 33vw" />
                </div>
              )}
              <h3>{m.name}</h3>
              {m.role && <div className="role">{m.role}</div>}
              {m.bio && <p className="bio">{m.bio}</p>}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/** Extracts {question, answer} pairs from a block list — for callers that
 *  need the raw FAQ data too (e.g. to emit FAQPage JSON-LD), not just the
 *  rendered markup CmsBlocks produces on its own. */
export function extractFaqs(blocks: CmsBlock[]): { q: string; a: string }[] {
  return blocks
    .filter((b) => b.type === "faq")
    .map((b) => ({ q: str(b.data.question), a: str(b.data.answer) }))
    .filter((f) => f.q);
}
