import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";

export default async function CTA({
  title,
  body,
  href = "/book",
  label,
}: {
  title?: string;
  body?: string;
  href?: string;
  label?: string;
}) {
  // Defaults come from translations rather than parameter defaults, since a
  // parameter default can't be an awaited translation call. Callers that
  // pass their own title/body/label (most detail pages) skip this entirely.
  const t = await getTranslations("ctaDefault");

  return (
    <section className="block cta">
      <div className="bg">
        <Image
          src="/images/gate.jpg"
          alt="Desert gate at dusk"
          fill
          sizes="100vw"
          style={{ objectFit: "cover" }}
        />
      </div>
      <div className="wrap">
        <h2 className="serif">{title ?? t("title")}</h2>
        <p>{body ?? t("body")}</p>
        <Link href={href} className="btn-primary">
          {label ?? t("label")}
        </Link>
      </div>
    </section>
  );
}
