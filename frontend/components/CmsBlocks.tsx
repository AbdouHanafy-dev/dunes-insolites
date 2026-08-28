import { Link } from "@/i18n/navigation";
import type { CmsBlock } from "@/lib/api";

/**
 * Renders the block types the admin CMS's page builder can produce
 * (admin/components/pages/blockTypes.tsx) into the vitrine's existing
 * visual language (.prose, .btn-accent) rather than inventing a parallel
 * style system for CMS content.
 *
 * accommodationShowcase isn't rendered publicly yet — it stores TourType
 * ids, and there's no public endpoint yet to resolve those into cards here.
 * A page using that block will just skip it rather than show broken data.
 */
export default function CmsBlocks({ blocks }: { blocks: CmsBlock[] }) {
  return (
    <>
      {blocks.map((block, i) => {
        switch (block.type) {
          case "hero":
            return <HeroBlock key={i} data={block.data} />;
          case "richText":
            return <RichTextBlock key={i} data={block.data} />;
          case "cta":
            return <CtaBlock key={i} data={block.data} />;
          case "faq":
            return <FaqBlock key={i} data={block.data} />;
          default:
            return null;
        }
      })}
    </>
  );
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

function RichTextBlock({ data }: { data: Record<string, unknown> }) {
  const content = str(data.content);
  if (!content) return null;
  const paragraphs = content.split(/\n{2,}/).filter(Boolean);
  return (
    <section className="section-sand">
      <div className="wrap">
        <div className="prose">
          {paragraphs.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>
      </div>
    </section>
  );
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

function FaqBlock({ data }: { data: Record<string, unknown> }) {
  const question = str(data.question);
  const answer = str(data.answer);
  if (!question) return null;
  return (
    <div className="prose" style={{ marginBottom: 24 }}>
      <h3>{question}</h3>
      {answer && <p>{answer}</p>}
    </div>
  );
}
