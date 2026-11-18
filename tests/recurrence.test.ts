import { describe, expect, it } from "vitest";
import { expandOccurrences } from "@/lib/recurrence";
import { monthGrid, parseLocalDateTime, dayKeyOf } from "@/lib/dates";

const d = (key: string, time = "00:00") => parseLocalDateTime(key, time)!;

describe("expandOccurrences", () => {
  it("returns a one-off event only when it starts inside the window", () => {
    const ev = { startAt: d("2026-11-20", "18:00"), endAt: d("2026-11-20", "20:00"), recurrence: "NONE" as const, recurrenceEnd: null };
    expect(expandOccurrences(ev, d("2026-11-01"), d("2026-12-01"))).toHaveLength(1);
    expect(expandOccurrences(ev, d("2026-12-01"), d("2027-01-01"))).toHaveLength(0);
  });

  it("expands weekly events up to and including the end date", () => {
    const ev = { startAt: d("2026-11-04", "19:00"), endAt: d("2026-11-04", "21:00"), recurrence: "WEEKLY" as const, recurrenceEnd: d("2026-12-02") };
    const occ = expandOccurrences(ev, d("2026-11-01"), d("2027-01-01"));
    expect(occ.map((o) => o.dayKey)).toEqual(["2026-11-04", "2026-11-11", "2026-11-18", "2026-11-25", "2026-12-02"]);
  });

  it("keeps the wall-clock time across the DST change (30 Oct 2027 -> CET)", () => {
    const ev = { startAt: d("2027-10-20", "19:00"), endAt: d("2027-10-20", "20:00"), recurrence: "WEEKLY" as const, recurrenceEnd: d("2027-11-10") };
    const occ = expandOccurrences(ev, d("2027-10-01"), d("2027-12-01"));
    expect(occ.map((o) => o.startAt.toISOString())).toEqual([
      "2027-10-20T17:00:00.000Z", // CEST
      "2027-10-27T17:00:00.000Z", // CEST
      "2027-11-03T18:00:00.000Z", // CET
      "2027-11-10T18:00:00.000Z",
    ]);
  });

  it("skips months without the day for monthly events (31st)", () => {
    const ev = { startAt: d("2026-10-31", "10:00"), endAt: d("2026-10-31", "11:00"), recurrence: "MONTHLY" as const, recurrenceEnd: d("2027-02-28") };
    const occ = expandOccurrences(ev, d("2026-10-01"), d("2027-03-01"));
    expect(occ.map((o) => o.dayKey)).toEqual(["2026-10-31", "2026-12-31", "2027-01-31"]); // Nov and Feb have no 31st
  });

  it("only returns occurrences inside the requested window", () => {
    const ev = { startAt: d("2026-09-02", "19:00"), endAt: d("2026-09-02", "20:00"), recurrence: "WEEKLY" as const, recurrenceEnd: d("2026-12-30") };
    const occ = expandOccurrences(ev, d("2026-11-01"), d("2026-12-01"));
    expect(occ.every((o) => o.dayKey >= "2026-11-01" && o.dayKey < "2026-12-01")).toBe(true);
    expect(occ).toHaveLength(4);
  });
});

describe("monthGrid", () => {
  it("starts on Monday and pads with adjacent months", () => {
    const grid = monthGrid({ year: 2026, month: 11 }); // 1 Nov 2026 is a Sunday
    expect(grid[0].key).toBe("2026-10-26");
    expect(grid[0].inMonth).toBe(false);
    expect(grid[6].key).toBe("2026-11-01");
    expect(grid[6].inMonth).toBe(true);
    expect(grid.length % 7).toBe(0);
    expect(grid.at(-1)!.key >= "2026-11-30").toBe(true);
  });
  it("uses Paris dates for day keys (23:30 UTC is already the next day in Paris)", () => {
    expect(dayKeyOf(new Date("2026-11-17T23:30:00Z"))).toBe("2026-11-18");
  });
});
