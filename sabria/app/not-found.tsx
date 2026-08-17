import Image from "next/image";
import Link from "next/link";

export default function NotFound() {
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
          Lost in the erg
        </p>
        <div className="code">404</div>
        <p className="hero-sub" style={{ margin: "22px auto 0" }}>
          This dune isn&apos;t on our map. The gate is back the other way.
        </p>
        <div className="hero-ctas">
          <Link href="/" className="cta-primary">
            Back to the gate →
          </Link>
          <Link href="/activities" className="cta-ghost">
            See the trips
          </Link>
        </div>
      </div>
    </section>
  );
}
