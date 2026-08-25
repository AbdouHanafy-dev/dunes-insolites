import Image from "next/image";
import Link from "next/link";

export default function CTA({
  title = "Ready for the dunes?",
  body = "Golden-hour slots fill fast. Reserve your Sahara adventure and we'll handle the rest.",
  href = "/book",
  label = "Book a trip →",
}: {
  title?: string;
  body?: string;
  href?: string;
  label?: string;
}) {
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
        <h2 className="serif">{title}</h2>
        <p>{body}</p>
        <Link href={href} className="btn-primary">
          {label}
        </Link>
      </div>
    </section>
  );
}
