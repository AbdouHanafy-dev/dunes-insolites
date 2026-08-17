import Image from "next/image";
import Link from "next/link";
import Reveal from "@/components/Reveal";
import { getGalleryStrip } from "@/lib/api";

export default async function GalleryStrip() {
  const galleryItems = await getGalleryStrip();

  return (
    <section className="block gallery" id="gallery">
      <div className="wrap">
        <Reveal>
          <p className="sect-eyebrow">From the sand</p>
          <h2 className="sect-title">Golden hour, every time.</h2>
        </Reveal>
        <Reveal className="strip">
          {galleryItems.map((item, i) => (
            <div key={`${item.src}-${i}`} className={`g${item.tall ? " tall" : ""}`}>
              <Image
                src={item.src}
                alt={item.alt}
                fill
                sizes="(max-width: 900px) 50vw, 33vw"
                style={{ objectFit: "cover" }}
              />
            </div>
          ))}
        </Reveal>
        <div style={{ marginTop: 40 }}>
          <Link href="/gallery" className="btn-quiet">
            See the full gallery →
          </Link>
        </div>
      </div>
    </section>
  );
}
