import { describe, expect, it } from "vitest";
import { badgeLabel, latest, notificationHref, timeAgo, type AdminNotification } from "./notifications";

const NOW = new Date("2026-09-25T12:00:00Z");
const ago = (ms: number) => new Date(NOW.getTime() - ms).toISOString();

describe("timeAgo", () => {
  it("speaks in minutes, hours and days", () => {
    expect(timeAgo(ago(20_000), NOW)).toBe("à l’instant");
    expect(timeAgo(ago(5 * 60_000), NOW)).toBe("il y a 5 min");
    expect(timeAgo(ago(3 * 3_600_000), NOW)).toBe("il y a 3 h");
    expect(timeAgo(ago(30 * 3_600_000), NOW)).toBe("hier");
    expect(timeAgo(ago(3 * 86_400_000), NOW)).toBe("il y a 3 j");
  });
  it("falls back to the date after a week, and to nothing for garbage", () => {
    expect(timeAgo(ago(20 * 86_400_000), NOW)).toMatch(/\d{2}\/\d{2}\/2026/);
    expect(timeAgo("not a date", NOW)).toBe("");
  });
});

describe("badgeLabel", () => {
  it("hides zero and caps large counts", () => {
    expect(badgeLabel(0)).toBeNull();
    expect(badgeLabel(-1)).toBeNull();
    expect(badgeLabel(4)).toBe("4");
    expect(badgeLabel(150)).toBe("99+");
  });
});

describe("notificationHref", () => {
  it("leads to the reservation when there is one", () => {
    expect(notificationHref({ reservationId: "abc" })).toBe("/reservations/abc");
    expect(notificationHref({ reservationId: null })).toBeNull();
  });
});

describe("latest", () => {
  const make = (id: string, at: number): AdminNotification => ({
    notificationId: id, reservationId: null, type: "X", title: id, message: "", isRead: false, createdAt: ago(at),
  });
  it("puts the newest first and keeps only the recent ones", () => {
    const many = Array.from({ length: 30 }, (_, i) => make(`n${i}`, i * 60_000));
    const shown = latest(many);
    expect(shown).toHaveLength(20);
    expect(shown[0].notificationId).toBe("n0");
  });
});
