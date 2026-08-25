import Image from "next/image";

export default function PageHead({
  eyebrow,
  title,
  lead,
  image = "/images/gate.jpg",
  children,
}: {
  eyebrow: string;
  title: React.ReactNode;
  lead?: string;
  image?: string;
  children?: React.ReactNode;
}) {
  return (
    <section className="page-head">
      <div className="bg">
        <Image src={image} alt="" fill sizes="100vw" preload style={{ objectFit: "cover" }} />
      </div>
      <div className="wrap">
        <p className="sect-eyebrow">{eyebrow}</p>
        <h1 className="sect-title">{title}</h1>
        {lead && <p className="lead">{lead}</p>}
        {children}
      </div>
    </section>
  );
}
