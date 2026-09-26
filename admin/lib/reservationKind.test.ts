import { describe, expect, it } from "vitest";
import { isCircuitReservation, isStayReservation, ofKind } from "./reservationKind";

const line = { name: "x" } as never;
const stay = { tourTypes: [line], tours: [] };
const circuit = { tourTypes: [], tours: [line] };
const mixed = { tourTypes: [line], tours: [line] };
const bare = { tourTypes: [], tours: [] };

describe("reservation kind", () => {
  it("recognises a stay and a circuit", () => {
    expect(isStayReservation(stay)).toBe(true);
    expect(isCircuitReservation(stay)).toBe(false);
    expect(isCircuitReservation(circuit)).toBe(true);
    expect(isStayReservation(circuit)).toBe(false);
  });

  it("splits a list by kind and never hides anything from 'all'", () => {
    const all = [stay, circuit, mixed, bare];
    expect(ofKind(all, "stays")).toEqual([stay, mixed]);
    expect(ofKind(all, "circuits")).toEqual([circuit, mixed]);
    expect(ofKind(all, "all")).toEqual(all);
  });
});
