import { describe, expect, it } from "vitest";
import { routeStops, tourMap } from "@/lib/tourRoute";
import type { Tour } from "@/lib/types";

type Step = Tour["itinerary"][number];

const step = (over: Partial<Step> = {}): Step => ({
  label: null,
  title: "t",
  description: null,
  segmentType: "ACTIVITY",
  optionalSegment: false,
  durationMinutes: null,
  ...over,
});

describe("routeStops", () => {
  it("takes the pickup first, the attractions between and the drop-off last, in order", () => {
    const steps = [
      step({ pickupPoint: "Tunis Clock Tower" }),
      step({ attraction: "Amphithéâtre d'El Jem" }),
      step({ attraction: "Matmata" }),
      step({ dropoffPoint: "Bab al-Bhar" }),
    ];
    expect(routeStops(steps)).toEqual(["Tunis Clock Tower", "Amphithéâtre d'El Jem", "Matmata", "Bab al-Bhar"]);
  });

  it("ignores a place left on a step whose position no longer allows it", () => {
    const steps = [step({ pickupPoint: "A", attraction: "not used on a first step" }), step({ dropoffPoint: "B", attraction: "not used on a last step" })];
    expect(routeStops(steps)).toEqual(["A", "B"]);
  });

  it("skips blanks and a place repeated back to back", () => {
    const steps = [step({ pickupPoint: " Djerba " }), step({ attraction: "  " }), step({ dropoffPoint: "Djerba" })];
    expect(routeStops(steps)).toEqual(["Djerba"]);
  });

  it("keeps at most ten stops", () => {
    const steps = Array.from({ length: 14 }, (_, i) => step(i === 0 ? { pickupPoint: "P0" } : { attraction: `P${i}` }));
    expect(routeStops(steps)).toHaveLength(10);
  });
});

describe("tourMap", () => {
  it("draws a route through two or more named places", () => {
    const map = tourMap([step({ pickupPoint: "Tunis" }), step({ attraction: "El Jem" }), step({ dropoffPoint: "Douz" })], "Djerba");
    expect(map?.embed).toBe("https://www.google.com/maps?saddr=Tunis&daddr=El%20Jem+to:Douz&output=embed");
    expect(map?.open).toBe("https://www.google.com/maps?saddr=Tunis&daddr=El%20Jem+to:Douz");
  });

  it("shows the single named place when there is only one", () => {
    const map = tourMap([step({ pickupPoint: "Tunis" }), step()], null);
    expect(map?.embed).toBe("https://www.google.com/maps?q=Tunis&output=embed");
  });

  it("falls back to the departure location, then to no map at all", () => {
    expect(tourMap([step(), step()], "Djerba")?.embed).toContain("q=Djerba");
    expect(tourMap([step(), step()], "  ")).toBeNull();
  });
});
