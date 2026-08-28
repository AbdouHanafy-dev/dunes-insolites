import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { site } from "@/lib/site";

export default async function AuthLayout({
  eyebrow,
  title,
  lead,
  image,
  children,
}: {
  eyebrow: string;
  title: string;
  lead: string;
  image: string;
  children: React.ReactNode;
}) {
  const t = await getTranslations("authForm");
  return (
    <section className="auth-page">
      <aside className="auth-art">
        <Image src={image} alt="" fill sizes="(max-width: 900px) 100vw, 45vw" preload />
        <div className="auth-art-copy">
          <span className="brand-line">
            {site.name} · {site.brandLine}
          </span>
          <p className="quote">{site.tagline}</p>
        </div>
      </aside>

      <div className="auth-panel">
        <div className="auth-inner">
          <Link href="/" className="auth-back">
            {t("backToSite")}
          </Link>
          <p className="sect-eyebrow">{eyebrow}</p>
          <h1 className="auth-title">{title}</h1>
          <p className="auth-lead">{lead}</p>
          {children}
        </div>
      </div>
    </section>
  );
}
