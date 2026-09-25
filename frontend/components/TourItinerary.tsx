import Image from "next/image";
import { getTranslations } from "next-intl/server";
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

/** 45 -> "45 min", 120 -> "2 h", 90 -> "1 h 30". Unit abbreviations read the same in every locale. */
function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h} h` : `${h} h ${m}`;
}

/**
 * The circuit's programme as a vertical timeline: a round icon per stop joined by a
 * dotted line, the first step being the pickup and the last the drop-off. Pickup,
 * attraction and drop-off names come from the back office and only show when filled.
 */
export default async function TourItinerary({ steps }: { steps: Step[] }) {
  const t = await getTranslations("tourDetail");
  const total = steps.length;

  return (
    <ol className="ti">
      {steps.map((step, index) => {
        const first = index === 0;
        const last = index === total - 1 && total > 1;
        const kind: Kind = first ? "start" : last ? "end" : step.segmentType === "TRANSFER" ? "transfer" : "stop";
        const places: { icon: string; label: string; value: string }[] = [];
        if (first && step.pickupPoint) {
          places.push({ icon: "bi-geo-alt", label: t("pickupPointLabel"), value: step.pickupPoint });
        }
        if (!first && !last && step.attraction) {
          places.push({ icon: "bi-stars", label: t("attractionLabel"), value: step.attraction });
        }
        if ((last || total === 1) && step.dropoffPoint) {
          places.push({ icon: "bi-flag", label: t("dropoffPointLabel"), value: step.dropoffPoint });
        }
        const images = step.images ?? [];

        return (
          <li className="ti-step" data-kind={kind} key={`${step.label ?? index}-${step.title ?? index}`}>
            <span className="ti-node" aria-hidden="true">
              <i className={`bi ${NODE_ICON[kind]}`} />
            </span>
            <div className="ti-body">
              {(step.label || step.durationMinutes != null) && (
                <div className="ti-meta">
                  {step.label && <span className="ti-label">{step.label}</span>}
                  {step.durationMinutes != null && (
                    <span className="ti-time">
                      <i className="bi bi-clock" aria-hidden="true" /> {formatMinutes(step.durationMinutes)}
                    </span>
                  )}
                </div>
              )}
              {step.title && (
                <h3>
                  {step.title}
                  {step.segmentType === "TRANSFER" && <span className="ti-badge">{t("transferBadge")}</span>}
                  {step.optionalSegment && (
                    <span className="ti-badge ti-badge--extra">{t("optionalSegmentBadge")}</span>
                  )}
                </h3>
              )}
              {places.map((p) => (
                <p className="ti-place" key={p.label}>
                  <i className={`bi ${p.icon}`} aria-hidden="true" />
                  <span>
                    <strong>{p.label}</strong> {p.value}
                  </span>
                </p>
              ))}
              {step.description && <p className="ti-text">{step.description}</p>}
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
