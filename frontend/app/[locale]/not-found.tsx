import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";

export default async function NotFound() {
  const t = await getTranslations("notFound");

  return (
    <section className="notfound">
      <div className="bg">
        <Image
          src="/images/gate.jpg"
          alt=""
          fill
          sizes="100vw"
          preload
          style={{ objectFit: "cover" }}
        />
      </div>
      <div className="wrap">
        <p className="eyebrow" style={{ justifyContent: "center" }}>
          {t("eyebrow")}
        </p>
        <div className="code">404</div>
        <p className="hero-sub" style={{ margin: "22px auto 0" }}>
          {t("sub")}
        </p>
        <div className="hero-ctas">
          <Link href="/" className="cta-primary">
            {t("backToGate")}
          </Link>
          <Link href="/activities" className="cta-ghost">
            {t("seeTrips")}
          </Link>
        </div>
      </div>
    </section>
  );
}
