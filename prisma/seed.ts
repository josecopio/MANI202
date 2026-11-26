/**
 * Seed script.
 *
 *   npm run db:seed            -> reference data + sample events (idempotent)
 *   npm run db:unseed          -> removes ONLY the sample events and sample users
 *
 * Sample data is clearly marked: every sample event has isSample = true (shown as a
 * "Sample" notice in the UI), the organisers are fictional and the sample
 * users use the reserved domain @sample.ciup.test.
 */
import { PrismaClient } from "@prisma/client";
import { addDaysToKey, dayKeyOf, parseLocalDateTime } from "../src/lib/dates";

const db = new PrismaClient();
const SAMPLE_DOMAIN = "@sample.ciup.test";

const CATEGORIES = [
  { slug: "culture", nameFr: "Culture", nameEn: "Culture", color: "#6B2F8A", bgColor: "#F3ECF8", sortOrder: 1 },
  { slug: "sport", nameFr: "Sport", nameEn: "Sport", color: "#1C6542", bgColor: "#E5F2EA", sortOrder: 2 },
  { slug: "talks", nameFr: "Conférences & débats", nameEn: "Talks & debates", color: "#1E4F8A", bgColor: "#E7EEF8", sortOrder: 3 },
  { slug: "workshops", nameFr: "Ateliers", nameEn: "Workshops", color: "#8A4210", bgColor: "#FBEBDF", sortOrder: 4 },
  { slug: "community", nameFr: "Vie de la communauté", nameEn: "Community", color: "#8A1F45", bgColor: "#F8E8EE", sortOrder: 5 },
];

type HouseSeed = { slug: string; nameFr: string; nameEn: string; isResidence: boolean; spaces: [string, string][] };

// Residences are real CIUP houses; shared sites are places everybody uses. Admins can edit all of this.
const COMMON: [string, string][] = [["Salon commun", "Common lounge"], ["Cuisine collective", "Shared kitchen"], ["Jardin", "Garden"]];
const HOUSES: HouseSeed[] = [
  { slug: "etats-unis", nameFr: "Fondation des États-Unis", nameEn: "Fondation des États-Unis", isResidence: true, spaces: COMMON },
  { slug: "japon", nameFr: "Maison du Japon", nameEn: "Maison du Japon", isResidence: true, spaces: COMMON },
  { slug: "inde", nameFr: "Maison de l’Inde", nameEn: "Maison de l’Inde", isResidence: true, spaces: COMMON },
  { slug: "franco-britannique", nameFr: "Collège franco-britannique", nameEn: "Collège franco-britannique", isResidence: true, spaces: COMMON },
  { slug: "deutsch-de-la-meurthe", nameFr: "Fondation Deutsch de la Meurthe", nameEn: "Fondation Deutsch de la Meurthe", isResidence: true, spaces: COMMON },
  { slug: "armeniens", nameFr: "Maison des étudiants arméniens", nameEn: "Armenian Students’ House", isResidence: true, spaces: COMMON },
  { slug: "maroc", nameFr: "Maison du Maroc", nameEn: "Maison du Maroc", isResidence: true, spaces: COMMON },
  { slug: "neerlandais", nameFr: "Collège néerlandais", nameEn: "Collège néerlandais", isResidence: true, spaces: COMMON },
  { slug: "maison-internationale", nameFr: "Maison internationale", nameEn: "Maison internationale", isResidence: false, spaces: [["Grand salon", "Grand salon"], ["Auditorium", "Auditorium"], ["Café", "Café"]] },
  { slug: "bibliotheque", nameFr: "Bibliothèque", nameEn: "Library", isResidence: false, spaces: [["Salle de lecture", "Reading room"]] },
  { slug: "restaurant-crous", nameFr: "Restaurant Crous", nameEn: "Crous Restaurant", isResidence: false, spaces: [["Salle de restaurant", "Dining hall"], ["Cafétéria", "Cafeteria"]] },
  { slug: "piscine", nameFr: "Piscine", nameEn: "Swimming Pool", isResidence: false, spaces: [["Bassin", "Pool"], ["Vestiaires", "Changing rooms"]] },
  { slug: "salle-de-musculation", nameFr: "Salle de musculation", nameEn: "Gym", isResidence: false, spaces: [["Plateau de musculation", "Weights area"], ["Salle de cardio", "Cardio room"]] },
];
// Sites dropped from the list: removed from the database by the seed (with their sample events).
const RETIRED_HOUSES = ["centre-sportif", "parc"];
// Generic space usable in any house; the organiser types the exact place.
const OTHER_SPACE = { nameFr: "Autre", nameEn: "Other", isOther: true, sortOrder: 99 };

// Fictitious external organisations renting spaces of the Cité.
const ORGANISERS = [
  { key: "horizon", name: "Fondation Horizon Santé" },
  { key: "alteris", name: "Groupe Altéris" },
  { key: "nova", name: "Nova Events" },
  { key: "lumen", name: "Studio Lumen" },
  { key: "europa", name: "Réseau Europa Campus" },
  { key: "capavenir", name: "Institut Cap Avenir" },
];

type Seed = {
  org: string;
  title: string;
  desc: string;
  cat: string;
  house: string; // house slug
  space: string; // French name of the space in that house, or "Autre"
  impact: "LIMITED" | "CLOSED";
  note: string; // what it changes for residents
  pass?: string; // bracelet / pass residents need
  /** days from today (0 = today) */
  days: number;
  start: string;
  end: string;
  recurrence?: "WEEKLY";
  weeks?: number; // number of weekly repetitions after the first
  custom?: string;
};

// A few examples, one per kind of situation (closed / limited, pass, weekly series, shared sites).
const PUBLISHED: Seed[] = [
  { org: "horizon", days: 0, start: "08:00", end: "18:30", cat: "talks", house: "maison-internationale", space: "Auditorium", impact: "CLOSED", title: "Colloque international de santé publique", desc: "Deux journées de conférences et d’ateliers réunissant chercheurs, médecins et décideurs autour de la prévention en santé publique. Environ 400 participants sont attendus.", pass: "Bracelet vert « Maison internationale », à retirer à l’accueil sur présentation de votre carte de résident.", note: "Auditorium et foyer fermés aux résidents de 7h30 à 19h. Le café reste accessible par l’entrée latérale." },
  { org: "alteris", days: 0, start: "14:00", end: "19:00", cat: "workshops", house: "japon", space: "Salon commun", impact: "CLOSED", title: "Séminaire de direction", desc: "Séminaire stratégique annuel de l’équipe de direction d’une entreprise privée, avec ateliers et déjeuner sur place.", note: "Salon commun privatisé. Accès aux étages par l’entrée arrière." },
  { org: "capavenir", days: 2, start: "12:00", end: "14:30", cat: "community", house: "restaurant-crous", space: "Salle de restaurant", impact: "LIMITED", title: "Déjeuner de séminaire", desc: "Déjeuner assis pour les 120 participants d’un séminaire de formation.", note: "La moitié de la salle est réservée de 11h30 à 14h30 ; le service aux résidents continue, prévoyez plus d’attente." },
  { org: "europa", days: 3, start: "19:00", end: "21:00", cat: "sport", house: "piscine", space: "Bassin", impact: "LIMITED", title: "Entraînement d’un club de natation", desc: "Entraînement hebdomadaire d’un club de natation extérieur, chaque semaine le même soir.", note: "Quatre lignes d’eau sur six réservées au club ; deux lignes restent ouvertes aux résidents.", recurrence: "WEEKLY", weeks: 6 },
  { org: "nova", days: 5, start: "07:00", end: "12:00", cat: "sport", house: "salle-de-musculation", space: "Plateau de musculation", impact: "CLOSED", title: "Tournage d’une vidéo de fitness", desc: "Tournage d’une vidéo promotionnelle pour une marque d’équipement sportif.", pass: "Bracelet jaune « Salle de musculation » pour accéder à la salle de cardio, à retirer à l’accueil.", note: "Plateau de musculation fermé jusqu’à midi. La salle de cardio reste ouverte." },
];

/** English versions of the sample texts, keyed by the French title. */
const EN: Record<string, { title: string; desc: string; note: string; pass?: string }> = {
  "Colloque international de santé publique": { title: "International public health conference", desc: "Two days of talks and workshops bringing together researchers, doctors and policy makers around prevention in public health. About 400 participants are expected.", note: "Auditorium and foyer closed to residents from 7:30am to 7pm. The café stays open via the side entrance.", pass: "Green “Maison internationale” bracelet, to collect at reception with your resident card." },
  "Séminaire de direction": { title: "Management seminar", desc: "Annual strategy seminar of a private company’s management team, with workshops and lunch on site.", note: "Common lounge booked privately. Use the rear entrance to reach the upper floors." },
  "Déjeuner de séminaire": { title: "Seminar lunch", desc: "Seated lunch for the 120 participants of a training seminar.", note: "Half of the dining hall is booked from 11:30am to 2:30pm; residents are still served, expect a longer wait." },
  "Entraînement d’un club de natation": { title: "Swimming club training", desc: "Weekly training of an outside swimming club, on the same evening every week.", note: "Four of the six lanes are booked for the club; two lanes stay open to residents." },
  "Tournage d’une vidéo de fitness": { title: "Fitness video shoot", desc: "Shooting of a promotional video for a sports equipment brand.", note: "Weights area closed until noon. The cardio room stays open.", pass: "Yellow “Salle de musculation” bracelet to reach the cardio room, to collect at reception." },
};

async function removeSamples() {
  const events = await db.event.deleteMany({ where: { isSample: true } });
  const users = await db.user.deleteMany({ where: { email: { endsWith: SAMPLE_DOMAIN } } });
  console.log(`Removed ${events.count} sample events and ${users.count} sample users.`);
}

async function main() {
  if (process.argv.includes("--remove-samples")) {
    await removeSamples();
    return;
  }

  // Reference data: created if missing, never overwritten (admins may have edited them).
  for (const c of CATEGORIES) {
    await db.category.upsert({ where: { slug: c.slug }, update: {}, create: c });
  }
  const houseIds: Record<string, string> = {};
  const spaceIds: Record<string, string> = {}; // "slug/Name FR" -> venue id
  for (const [i, h] of HOUSES.entries()) {
    const house = await db.house.upsert({
      where: { slug: h.slug },
      update: {},
      create: { slug: h.slug, nameFr: h.nameFr, nameEn: h.nameEn, isResidence: h.isResidence, sortOrder: i + 1 },
    });
    houseIds[h.slug] = house.id;
    for (const [j, [fr, en]] of h.spaces.entries()) {
      const existing = await db.venue.findFirst({ where: { houseId: house.id, nameFr: fr } });
      const venue = existing ?? (await db.venue.create({ data: { houseId: house.id, nameFr: fr, nameEn: en, sortOrder: j + 1 } }));
      spaceIds[`${h.slug}/${fr}`] = venue.id;
    }
  }
  // Retired sites: drop their sample events, then the site itself if no real event uses it.
  for (const slug of RETIRED_HOUSES) {
    const house = await db.house.findUnique({ where: { slug }, select: { id: true } });
    if (!house) continue;
    await db.event.deleteMany({ where: { houseId: house.id, isSample: true } });
    if ((await db.event.count({ where: { houseId: house.id } })) === 0) {
      await db.event.deleteMany({ where: { isSample: true, venue: { houseId: house.id } } });
      await db.house.delete({ where: { id: house.id } });
      console.log(`Removed the retired site “${slug}”.`);
    } else console.log(`Kept “${slug}”: real events still use it (remove it in the admin).`);
  }
  // --if-empty (used when the server starts on Render): reference data only, unless the
  // database has no events yet. SEED_SAMPLES=refresh forces a full re-seed of the samples.
  if (process.argv.includes("--if-empty") && process.env.SEED_SAMPLES !== "refresh") {
    const events = await db.event.count();
    if (events > 0) {
      console.log(`Seed skipped: the database already has ${events} event(s). Set SEED_SAMPLES=refresh to re-create the samples.`);
      return;
    }
  }

  const other = (await db.venue.findFirst({ where: { isOther: true, houseId: null } })) ?? (await db.venue.create({ data: OTHER_SPACE }));
  const categories = Object.fromEntries((await db.category.findMany()).map((c) => [c.slug, c.id]));
  const spaceOf = (house: string, space: string) => (space === "Autre" ? other.id : spaceIds[`${house}/${space}`]);

  // Sample organisers and events (re-created on every run).
  await db.event.deleteMany({ where: { isSample: true } });
  const users: Record<string, string> = {};
  for (const o of ORGANISERS) {
    const email = `sample-${o.key}${SAMPLE_DOMAIN}`;
    const u = await db.user.upsert({
      where: { email },
      update: { name: o.name, organisation: o.name },
      create: { email, name: o.name, organisation: o.name, emailVerified: new Date() },
    });
    users[o.key] = u.id;
  }
  const orgName = Object.fromEntries(ORGANISERS.map((o) => [o.key, o.name]));

  const now = new Date();
  const today = dayKeyOf(now);
  const contact = (key: string) => `sample-${key}${SAMPLE_DOMAIN}`;

  let count = 0;
  for (const s of PUBLISHED) {
    const date = addDaysToKey(today, s.days);
    const startAt = parseLocalDateTime(date, s.start)!;
    const endAt = parseLocalDateTime(date, s.end)!;
    const recurrenceEnd = s.recurrence ? parseLocalDateTime(addDaysToKey(date, 7 * (s.weeks ?? 4)), "23:59") : null;
    await db.event.create({
      data: {
        title: s.title,
        description: s.desc,
        categoryId: categories[s.cat],
        startAt,
        endAt,
        venueId: spaceOf(s.house, s.space),
        houseId: houseIds[s.house],
        spaceImpact: s.impact,
        restrictionNote: s.note,
        accessPass: s.pass ?? null,
        titleEn: EN[s.title]?.title ?? null,
        descriptionEn: EN[s.title]?.desc ?? null,
        restrictionNoteEn: EN[s.title]?.note ?? null,
        accessPassEn: EN[s.title]?.pass ?? null,
        customLocation: s.custom ?? null,
        audience: "PUBLIC",
        organiserName: orgName[s.org],
        contactEmail: contact(s.org),
        recurrence: s.recurrence ?? "NONE",
        recurrenceEnd,
        status: "PUBLISHED",
        reviewedAt: new Date(),
        isSample: true,
        createdById: users[s.org],
      },
    });
    count++;
  }

  // A few submissions in other states so the review queue and "My events" are not empty.
  const inDays = (n: number, time: string) => parseLocalDateTime(addDaysToKey(today, n), time)!;
  const others = [
    { org: "alteris", status: "PENDING" as const, days: 5, start: "09:00", end: "17:00", cat: "workshops", house: "neerlandais", space: "Salon commun", impact: "CLOSED" as const, note: "Salon commun privatisé.", title: "Séminaire commercial", desc: "Séminaire d’entreprise." },
    { org: "lumen", status: "PENDING" as const, days: 9, start: "07:00", end: "20:00", cat: "culture", house: "maroc", space: "Jardin", impact: "LIMITED" as const, note: "Zone de tournage balisée dans le jardin.", title: "Tournage d’un long métrage", desc: "Tournage en extérieur." },
    { org: "europa", status: "DRAFT" as const, days: 20, start: "09:00", end: "18:00", cat: "talks", house: "maison-internationale", space: "Auditorium", impact: "CLOSED" as const, note: "", title: "Congrès annuel", desc: "" },
    { org: "nova", status: "REJECTED" as const, days: 7, start: "20:00", end: "02:00", cat: "community", house: "japon", space: "Jardin", impact: "CLOSED" as const, note: "", title: "Soirée privée", desc: "Soirée privée avec DJ.", reason: "Les soirées privées en extérieur ne sont pas autorisées dans les maisons." },
  ];
  for (const o of others) {
    await db.event.create({
      data: {
        title: o.title,
        description: o.desc,
        categoryId: categories[o.cat],
        startAt: inDays(o.days, o.start),
        endAt: inDays(o.days, o.end),
        venueId: spaceOf(o.house, o.space),
        houseId: houseIds[o.house],
        spaceImpact: o.impact,
        restrictionNote: o.note || null,
        organiserName: orgName[o.org],
        contactEmail: contact(o.org),
        status: o.status,
        rejectionReason: "reason" in o ? o.reason : null,
        isSample: true,
        createdById: users[o.org],
      },
    });
    count++;
  }

  // Sample organisers from earlier versions of the seed.
  await db.user.deleteMany({
    where: { email: { endsWith: SAMPLE_DOMAIN, notIn: ORGANISERS.map((o) => `sample-${o.key}${SAMPLE_DOMAIN}`) }, events: { none: {} } },
  });

  // Legacy flat venues (from before houses existed) that no event uses any more.
  const legacy = await db.venue.deleteMany({ where: { houseId: null, isOther: false, events: { none: {} } } });
  if (legacy.count) console.log(`Removed ${legacy.count} legacy venues without a house.`);

  console.log(`Seeded ${CATEGORIES.length} categories, ${HOUSES.length} houses and ${count} SAMPLE events (isSample = true).`);
  console.log("Remove them any time with: npm run db:unseed");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
