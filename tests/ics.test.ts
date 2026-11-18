import { describe, expect, it } from "vitest";
import { buildCalendar, escapeText, foldLine, type IcsEvent } from "@/lib/ics";
import { parseLocalDateTime } from "@/lib/dates";

const base: IcsEvent = {
  id: "evt1",
  title: "Concert, jazz; \"Nuit\" d'été",
  description: "Ligne 1\nLigne 2",
  startAt: parseLocalDateTime("2026-11-25", "19:00")!,
  endAt: parseLocalDateTime("2026-11-25", "21:00")!,
  location: "Maison internationale · Grand salon",
  categoryName: "Culture",
  organiserName: "Maison du Japon",
  audienceLabel: "Public",
  url: "https://events.example.org/events/evt1",
  recurrence: "NONE",
  recurrenceEnd: null,
  updatedAt: new Date("2026-11-01T08:00:00Z"),
};
const opts = { calendarName: "Cité internationale", domain: "events.example.org", now: new Date("2026-11-18T09:00:00Z") };

describe("buildCalendar", () => {
  const ics = buildCalendar([base], opts);

  it("produces a valid VCALENDAR envelope with CRLF line endings", () => {
    expect(ics.startsWith("BEGIN:VCALENDAR\r\nVERSION:2.0\r\n")).toBe(true);
    expect(ics.endsWith("END:VCALENDAR\r\n")).toBe(true);
    expect(ics.replace(/\r\n/g, "")).not.toMatch(/[\r\n]/);
    expect(ics).toContain("X-WR-CALNAME:Cité internationale");
    expect(ics).toContain("BEGIN:VTIMEZONE\r\nTZID:Europe/Paris");
  });

  it("emits one VEVENT with Paris local times, a stable UID and escaped text", () => {
    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(1);
    expect(ics).toContain("UID:evt1@events.example.org");
    expect(ics).toContain("DTSTART;TZID=Europe/Paris:20261125T190000");
    expect(ics).toContain("DTEND;TZID=Europe/Paris:20261125T210000");
    expect(ics).toContain("DTSTAMP:20261118T090000Z");
    expect(ics).toContain("SUMMARY:Concert\\, jazz\; \"Nuit\" d'été");
    expect(ics).toContain("CATEGORIES:Culture");
    expect(ics.slice(ics.indexOf("BEGIN:VEVENT"))).not.toContain("RRULE");
  });

  it("never emits a line longer than 75 octets", () => {
    const long = buildCalendar([{ ...base, description: "é".repeat(400) }], opts);
    for (const line of long.split("\r\n")) {
      expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75);
    }
    // Unfolding gives the original description back.
    const unfolded = long.replace(/\r\n /g, "");
    expect(unfolded).toContain("é".repeat(400));
  });

  it("adds an RRULE with a UTC UNTIL for recurring events", () => {
    const rec = buildCalendar(
      [{ ...base, recurrence: "WEEKLY", recurrenceEnd: parseLocalDateTime("2026-12-30", "00:00") }],
      opts,
    );
    // End of 30 Dec in Paris (CET) is 23:59:59 local = 22:59:59Z
    expect(rec).toContain("RRULE:FREQ=WEEKLY;UNTIL=20261230T225959Z");
  });

  it("exports a single occurrence of a recurring event without RRULE", () => {
    const one = buildCalendar(
      [{ ...base, recurrence: "WEEKLY", recurrenceEnd: parseLocalDateTime("2026-12-30", "00:00") }],
      { ...opts, occurrenceDate: "2026-12-09" },
    );
    expect(one).toContain("DTSTART;TZID=Europe/Paris:20261209T190000");
    // (the VTIMEZONE block has its own RRULEs, so only look inside the VEVENT)
    expect(one.slice(one.indexOf("BEGIN:VEVENT"))).not.toContain("RRULE");
  });

  it("builds an empty but valid calendar", () => {
    const empty = buildCalendar([], opts);
    expect(empty).toContain("BEGIN:VCALENDAR");
    expect(empty).not.toContain("BEGIN:VEVENT");
  });
});

describe("helpers", () => {
  it("escapes ICS special characters", () => {
    expect(escapeText("a,b;c\\d\ne")).toBe("a\\,b\;c\\\\d\\ne");
  });
  it("folds without splitting multi-byte characters", () => {
    const folded = foldLine("X:" + "€".repeat(60));
    expect(folded.split("\r\n").every((l) => new TextEncoder().encode(l).length <= 75)).toBe(true);
    expect(folded.replace(/\r\n /g, "")).toBe("X:" + "€".repeat(60));
  });
});
