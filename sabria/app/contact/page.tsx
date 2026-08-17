import type { Metadata } from "next";
import ContactForm from "@/components/ContactForm";
import PageHead from "@/components/PageHead";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Get in touch with Dunes Insolites in Sabria, southern Tunisia — questions, private groups, and custom desert itineraries.",
  alternates: { canonical: "/contact" },
};

const mapSrc = `https://www.openstreetmap.org/export/embed.html?bbox=${
  site.coords.lng - 0.08
}%2C${site.coords.lat - 0.06}%2C${site.coords.lng + 0.08}%2C${
  site.coords.lat + 0.06
}&layer=mapnik&marker=${site.coords.lat}%2C${site.coords.lng}`;

export default function ContactPage() {
  return (
    <>
      <PageHead
        eyebrow="Say hello"
        title="Ask us anything."
        lead="Private groups, custom routes, wedding parties, film crews — if it happens on sand, we've probably done it."
        image="/images/sandboard.jpg"
      />

      <section className="section-sand">
        <div className="wrap">
          <div className="contact-grid">
            <div>
              <ContactForm />
            </div>

            <aside>
              <div className="info-list">
                <div>
                  <div className="k">Email</div>
                  <div className="v">
                    <a href={`mailto:${site.email}`}>{site.email}</a>
                  </div>
                </div>
                <div>
                  <div className="k">Phone / WhatsApp</div>
                  <div className="v">
                    <a href={`tel:${site.phone.replace(/\s/g, "")}`}>{site.phone}</a>
                  </div>
                </div>
                <div>
                  <div className="k">The gate</div>
                  <div className="v">{site.address}</div>
                </div>
                <div>
                  <div className="k">Desk hours</div>
                  <div className="v">Every day, 07:00 – 20:00 (GMT+1)</div>
                </div>
              </div>

              <div className="map-frame">
                <iframe
                  src={mapSrc}
                  title="Map showing Sabria, southern Tunisia"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              </div>
            </aside>
          </div>
        </div>
      </section>
    </>
  );
}
