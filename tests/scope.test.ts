import { describe, expect, it } from "vitest";
import { inScope } from "@/lib/queries";
import { followedHouses, isEligible } from "@/lib/prefs-shared";
import { hasRestrictions } from "@/lib/restrictions";

describe("isEligible", () => {
  it("only blocks house-only events of other houses", () => {
    expect(isEligible("PUBLIC", "japon", null)).toBe(true);
    expect(isEligible("RESIDENTS_ONLY", "japon", "inde")).toBe(true);
    expect(isEligible("HOUSE_ONLY", "japon", "japon")).toBe(true);
    expect(isEligible("HOUSE_ONLY", "japon", "inde")).toBe(false);
    expect(isEligible("HOUSE_ONLY", "japon", null)).toBe(false);
    expect(isEligible("HOUSE_ONLY", null, "japon")).toBe(false);
  });
});

describe("followedHouses", () => {
  it("puts the home first and removes duplicates", () => {
    expect(followedHouses({ home: "japon", houses: ["inde", "japon"] })).toEqual(["japon", "inde"]);
    expect(followedHouses({ home: null, houses: ["inde"] })).toEqual(["inde"]);
  });
});

describe("inScope", () => {
  const mine = { kind: "mine" as const, houses: ["japon"], interests: ["culture"], general: true };

  it("shows everything of a followed house, even what is reserved for another house", () => {
    expect(inScope(mine, { houseSlug: "japon", categorySlug: "sport", eligible: false })).toBe(true);
  });
  it("shows general events only if they match the interests and the resident may attend", () => {
    expect(inScope(mine, { houseSlug: "inde", categorySlug: "culture", eligible: true })).toBe(true);
    expect(inScope(mine, { houseSlug: "inde", categorySlug: "sport", eligible: true })).toBe(false);
    expect(inScope(mine, { houseSlug: "inde", categorySlug: "culture", eligible: false })).toBe(false);
    expect(inScope(mine, { houseSlug: null, categorySlug: "culture", eligible: true })).toBe(true);
  });
  it("drops all general events when they are switched off", () => {
    expect(inScope({ ...mine, general: false }, { houseSlug: "inde", categorySlug: "culture", eligible: true })).toBe(false);
  });
  it("a house scope shows that house only, the general scope what the resident may attend", () => {
    expect(inScope({ kind: "house", slug: "japon" }, { houseSlug: "japon", categorySlug: "x", eligible: false })).toBe(true);
    expect(inScope({ kind: "house", slug: "japon" }, { houseSlug: "inde", categorySlug: "x", eligible: true })).toBe(false);
    expect(inScope({ kind: "general" }, { houseSlug: "inde", categorySlug: "x", eligible: false })).toBe(false);
    expect(inScope({ kind: "general" }, { houseSlug: "inde", categorySlug: "x", eligible: true })).toBe(true);
  });
});

describe("hasRestrictions", () => {
  it("flags reserved events and affected spaces", () => {
    expect(hasRestrictions({ audience: "PUBLIC", spaceImpact: "NONE" })).toBe(false);
    expect(hasRestrictions({ audience: "RESIDENTS_ONLY", spaceImpact: "NONE" })).toBe(false);
    expect(hasRestrictions({ audience: "HOUSE_ONLY", spaceImpact: "NONE" })).toBe(true);
    expect(hasRestrictions({ audience: "PUBLIC", spaceImpact: "LIMITED" })).toBe(true);
  });
});
