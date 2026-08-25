import Image from "next/image";
import Link from "next/link";
import { getActivities } from "@/lib/api";
import { site } from "@/lib/site";
import Newsletter from "@/components/Newsletter";

export default async function Footer() {
  const activities = await getActivities();

  return (
    <footer className="site-footer">
      <div className="wrap">
        <div className="top">
          <div>
            <Link href="/" className="brand">
              <Image src="/logo-mark.png" alt="" width={62} height={62} />
              <span className="brand-text">
                <span className="bn">{site.name}</span>
                <span className="bl">{site.brandLine}</span>
              </span>
            </Link>
            <p>Camel treks, quad safaris, and sandboarding across the Sahara at sunset.</p>
            <Newsletter />
          </div>
          <div className="cols">
            <div>
              <h5>Adventures</h5>
              <ul>
                {activities.map((a) => (
                  <li key={a.slug}>
                    <Link href={`/activities/${a.slug}`}>{a.title}</Link>
                  </li>
                ))}
                <li>
                  <Link href="/activities">All experiences</Link>
                </li>
              </ul>
            </div>
            <div>
              <h5>Company</h5>
              <ul>
                <li>
                  <Link href="/about">About</Link>
                </li>
                <li>
                  <Link href="/about#guides">Guides</Link>
                </li>
                <li>
                  <Link href="/safety">Safety</Link>
                </li>
                <li>
                  <Link href="/contact">Contact</Link>
                </li>
              </ul>
            </div>
            <div>
              <h5>Follow</h5>
              <ul>
                {site.social.map((s) => (
                  <li key={s.label}>
                    <a href={s.href} target="_blank" rel="noreferrer noopener">
                      {s.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
        <div className="bar">
          <span>© {new Date().getFullYear()} {site.legalName}.</span>
          <span style={{ display: "flex", gap: 18 }}>
            <Link href="/legal/privacy">Privacy</Link>
            <Link href="/legal/terms">Terms</Link>
          </span>
          <span>Sahara · Tunisia</span>
        </div>
      </div>
    </footer>
  );
}
