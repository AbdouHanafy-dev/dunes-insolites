import Image from "next/image";
import { getLocale, getTranslations } from "next-intl/server";
import "bootstrap-icons/font/bootstrap-icons.css";
import type { Tour } from "@/lib/types";

type Step = Tour["itinerary"][number];
type Kind = "start" | "end" | "transfer" | "stop";

const NODE_ICON: Record<Kind, string> = {
  start: "bi-geo-alt-fill",
  end: "bi-flag-fill",
  transfer: "bi-bus-front-fill",
  stop: "bi-pin-map-fill",
};

/** 120 -> "2 heures", 90 -> "1 heure 30 minutes", 45 -> "45 minutes", in the page language. */
function formatDuration(minutes: number, locale: string): string {
  const unit = (value: number, name: "hour" | "minute") =>
    new Intl.NumberFormat(locale, { style: "unit", unit: name, unitDisplay: "long" }).format(value);
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return unit(m, "minute");
  return m === 0 ? unit(h, "hour") : `${unit(h, "hour")} ${unit(m, "minute")}`;
}

/**
 * The circuit's programme as a vertical timeline: a round icon per stop joined by a
 * dotted line, the first step being the pickup and the last the drop-off. Pickup,
 * attraction and drop-off names come from the back office and only show when filled.
 */
export default async function TourItinerary({ steps }: { steps: Step[] }) {
  const [t, locale] = await Promise.all([getTranslations("tourDetail"), getLocale()]);
  const total = steps.length;

  return (
    <ol className="ti">
      {steps.map((step, index) => {
        const first = index === 0;
        const last = index === total - 1 && total > 1;
        const kind: Kind = first ? "start" : last ? "end" : step.segmentType === "TRANSFER" ? "transfer" : "stop";
        const places: { label: string; value: string }[] = [];
        if (first && step.pickupPoint) {
          places.push({ label: t("pickupPointLabel"), value: step.pickupPoint });
        }
        if (!first && !last && step.attraction) {
          places.push({ label: t("attractionLabel"), value: step.attraction });
        }
        if ((last || total === 1) && step.dropoffPoint) {
          places.push({ label: t("dropoffPointLabel"), value: step.dropoffPoint });
        }
        const images = step.images ?? [];

        return (
          <li className="ti-step" data-kind={kind} key={`${step.label ?? index}-${step.title ?? index}`}>
            <span className="ti-node" aria-hidden="true">
              {kind !== "end" && <i className={`bi ${NODE_ICON[kind]}`} />}
            </span>
            <div className="ti-body">
              {step.label && <p className="ti-meta">{step.label}</p>}
              {step.title && (
                <h3>
                  {step.title}
                </h3>
              )}
              {places.map((p) => (
                <p className="ti-place" key={p.label}>
                  <span className="ti-place-label">{p.label}</span>
                  <span className="ti-place-value">{p.value}</span>
                </p>
              ))}
              {step.description && <p className="ti-text">{step.description}</p>}
              {step.durationMinutes != null && (
                <p className="ti-duration">({formatDuration(step.durationMinutes, locale)})</p>
              )}
              {step.optionalSegment && <p className="ti-extra">{t("optionalExtraNote")}</p>}
              {images.length > 0 && (
                <div className="ti-media" data-count={Math.min(images.length, 4)}>
                  {images.map((src, i) => (
                    <span className="ti-photo" key={src}>
                      <Image
                        src={src}
                        alt={`${step.title ?? ""} — ${i + 1}`.trim()}
                        fill
                        sizes="(max-width: 700px) 92vw, 300px"
                      />
                    </span>
                  ))}
                </div>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
