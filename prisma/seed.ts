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
  { slug: "centre-sportif", nameFr: "Centre sportif", nameEn: "Sports centre", isResidence: false, spaces: [["Gymnase", "Sports hall"], ["Terrains extérieurs", "Outdoor courts"]] },
  { slug: "bibliotheque", nameFr: "Bibliothèque", nameEn: "Library", isResidence: false, spaces: [["Salle de lecture", "Reading room"]] },
  { slug: "parc", nameFr: "Parc", nameEn: "Park", isResidence: false, spaces: [["Pelouse centrale", "Main lawn"]] },
];
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

const PUBLISHED: Seed[] = [
  { org: "horizon", days: 0, start: "08:00", end: "18:30", cat: "talks", house: "maison-internationale", space: "Auditorium", impact: "CLOSED", title: "Colloque international de santé publique", desc: "Deux journées de conférences et d’ateliers réunissant chercheurs, médecins et décideurs autour de la prévention en santé publique. Environ 400 participants sont attendus.", pass: "Bracelet vert « Maison internationale », à retirer à l’accueil sur présentation de votre carte de résident.", note: "Auditorium et foyer fermés aux résidents de 7h30 à 19h. Le café reste accessible par l’entrée latérale." },
  { org: "alteris", days: 0, start: "14:00", end: "19:00", cat: "workshops", house: "japon", space: "Salon commun", impact: "CLOSED", title: "Séminaire de direction", desc: "Séminaire stratégique annuel de l’équipe de direction d’une entreprise privée, avec ateliers et déjeuner sur place.", note: "Salon commun privatisé. Accès aux étages par l’entrée arrière." },
  { org: "nova", days: 1, start: "09:00", end: "17:00", cat: "community", house: "centre-sportif", space: "Gymnase", impact: "CLOSED", title: "Salon de recrutement", desc: "Salon de l’emploi pour jeunes diplômés : une trentaine d’entreprises présentent leurs offres de stages et d’emplois.", pass: "Bracelet orange « Centre sportif » pour accéder aux vestiaires, à retirer à l’accueil du centre.", note: "Gymnase fermé toute la journée (montage dès 7h). Les cours de sport du jour sont annulés." },
  { org: "nova", days: 1, start: "18:00", end: "21:00", cat: "community", house: "etats-unis", space: "Salon commun", impact: "LIMITED", title: "Réception de partenaires", desc: "Réception privée organisée par une agence événementielle pour ses clients et partenaires.", pass: "Badge résident à présenter à l’entrée ; les invités extérieurs passent par un contrôle de sécurité.", note: "Hall d’entrée filtré par un service de sécurité : présentez votre carte de résident." },
  { org: "europa", days: 2, start: "09:00", end: "13:00", cat: "talks", house: "maison-internationale", space: "Grand salon", impact: "CLOSED", title: "Assemblée générale", desc: "Assemblée générale annuelle d’un réseau d’universités européennes : bilan de l’année et vote des projets.", note: "Grand salon indisponible. Les salles de travail du 1er étage restent ouvertes." },
  { org: "lumen", days: 2, start: "10:00", end: "16:00", cat: "culture", house: "bibliotheque", space: "Salle de lecture", impact: "LIMITED", title: "Tournage d’un documentaire", desc: "Tournage d’un documentaire sur l’histoire de la Cité internationale, avec interviews dans la salle de lecture.", note: "La moitié de la salle de lecture est fermée ; silence demandé pendant les prises." },
  { org: "nova", days: 3, start: "08:00", end: "20:00", cat: "community", house: "parc", space: "Pelouse centrale", impact: "LIMITED", title: "Village d’exposants", desc: "Village de stands en plein air pour un salon professionnel sur la ville durable.", note: "Pelouse centrale clôturée ; cheminement piéton dévié côté boulevard Jourdan." },
  { org: "capavenir", days: 3, start: "13:00", end: "18:00", cat: "workshops", house: "inde", space: "Salon commun", impact: "CLOSED", title: "Session de formation professionnelle", desc: "Formation continue pour adultes sur la gestion de projet, organisée par un institut privé.", note: "Salon commun réservé. La cuisine collective reste accessible." },
  { org: "alteris", days: 4, start: "11:00", end: "15:00", cat: "community", house: "japon", space: "Jardin", impact: "LIMITED", title: "Cocktail déjeunatoire", desc: "Cocktail de clôture d’un séminaire d’entreprise, servi dans le jardin.", note: "Jardin partiellement privatisé de 10h à 16h." },
  { org: "horizon", days: 4, start: "18:00", end: "22:30", cat: "culture", house: "maison-internationale", space: "Auditorium", impact: "CLOSED", title: "Gala de remise de prix", desc: "Soirée de gala d’une fondation : remise de prix à des projets de recherche, suivie d’un dîner.", pass: "Bracelet vert « Maison internationale » obligatoire après 18h pour traverser le hall.", note: "Auditorium et parvis fermés de 16h à 23h. Accès résidents par la porte nord." },
  { org: "nova", days: 5, start: "09:00", end: "18:00", cat: "sport", house: "centre-sportif", space: "Terrains extérieurs", impact: "CLOSED", title: "Tournoi inter-entreprises", desc: "Tournoi sportif amical entre salariés de plusieurs entreprises (football à cinq et basket).", note: "Terrains extérieurs fermés aux résidents toute la journée." },
  { org: "europa", days: 5, start: "10:00", end: "17:00", cat: "talks", house: "franco-britannique", space: "Salon commun", impact: "CLOSED", title: "Journée d’étude", desc: "Journée d’étude universitaire sur les migrations étudiantes en Europe, avec tables rondes.", note: "Salon commun fermé ; bruit possible dans le hall aux pauses." },
  { org: "alteris", days: 6, start: "09:00", end: "12:00", cat: "workshops", house: "etats-unis", space: "Salon commun", impact: "LIMITED", title: "Conseil d’administration", desc: "Réunion trimestrielle du conseil d’administration d’une entreprise privée.", note: "Une partie du salon est réservée ; merci de limiter le bruit." },
  { org: "capavenir", days: 6, start: "08:00", end: "11:00", cat: "community", house: "maison-internationale", space: "Café", impact: "CLOSED", title: "Petit-déjeuner professionnel", desc: "Petit-déjeuner de réseautage pour entrepreneurs du sud de Paris.", note: "Café fermé aux résidents jusqu’à 11h." },
  { org: "capavenir", days: 8, start: "09:00", end: "18:00", cat: "talks", house: "japon", space: "Salon commun", impact: "CLOSED", title: "Conférence annuelle", desc: "Conférence annuelle d’un institut de formation : interventions, tables rondes et cocktail.", pass: "Bracelet bleu « Maison du Japon » pour accéder aux étages, à retirer à l’accueil de la maison.", note: "Salon commun et hall fermés de 8h à 18h30." },
  { org: "horizon", days: 9, start: "18:00", end: "20:00", cat: "talks", house: "maison-internationale", space: "Auditorium", impact: "CLOSED", title: "Cycle de conférences santé", desc: "Cycle hebdomadaire de conférences pour professionnels de santé, chaque mardi soir.", note: "Auditorium indisponible de 17h à 20h30.", recurrence: "WEEKLY", weeks: 6 },
  { org: "lumen", days: 11, start: "07:00", end: "19:00", cat: "culture", house: "maroc", space: "Jardin", impact: "CLOSED", title: "Tournage d’une publicité", desc: "Tournage d’un spot publicitaire dans le jardin de la maison.", note: "Jardin fermé, véhicules techniques devant la maison." },
  { org: "nova", days: 13, start: "10:00", end: "18:00", cat: "community", house: "centre-sportif", space: "Gymnase", impact: "LIMITED", title: "Salon des associations professionnelles", desc: "Salon réunissant des associations professionnelles du secteur de l’éducation.", note: "Seule la moitié du gymnase est utilisable." },
];

/** English versions of the sample texts, keyed by the French title. */
const EN: Record<string, { title: string; desc: string; note: string; pass?: string }> = {
  "Colloque international de santé publique": { title: "International public health conference", desc: "Two days of talks and workshops bringing together researchers, doctors and policy makers around prevention in public health. About 400 participants are expected.", note: "Auditorium and foyer closed to residents from 7:30am to 7pm. The café stays open via the side entrance.", pass: "Green “Maison internationale” bracelet, to collect at reception with your resident card." },
  "Séminaire de direction": { title: "Management seminar", desc: "Annual strategy seminar of a private company’s management team, with workshops and lunch on site.", note: "Common lounge booked privately. Use the rear entrance to reach the upper floors." },
  "Salon de recrutement": { title: "Recruitment fair", desc: "Job fair for recent graduates: about thirty companies present their internships and job offers.", note: "Sports hall closed all day (set-up from 7am). Today’s sports classes are cancelled.", pass: "Orange “Centre sportif” bracelet to reach the changing rooms, to collect at the sports centre reception." },
  "Réception de partenaires": { title: "Partners’ reception", desc: "Private reception held by an events agency for its clients and partners.", note: "Security check at the entrance hall: show your resident card.", pass: "Show your resident badge at the entrance; outside guests go through a security check." },
  "Assemblée générale": { title: "General assembly", desc: "Annual general assembly of a network of European universities: review of the year and vote on projects.", note: "Grand salon unavailable. The study rooms on the first floor stay open." },
  "Tournage d’un documentaire": { title: "Documentary shoot", desc: "Shooting of a documentary on the history of the Cité internationale, with interviews in the reading room.", note: "Half of the reading room is closed; please keep quiet during takes." },
  "Village d’exposants": { title: "Exhibitors’ village", desc: "Open-air village of stands for a trade fair on sustainable cities.", note: "Main lawn fenced off; the footpath is diverted along boulevard Jourdan." },
  "Session de formation professionnelle": { title: "Professional training session", desc: "Adult training course on project management, run by a private institute.", note: "Common lounge booked. The shared kitchen stays open." },
  "Cocktail déjeunatoire": { title: "Lunch reception", desc: "Closing reception of a company seminar, served in the garden.", note: "Garden partly booked from 10am to 4pm." },
  "Gala de remise de prix": { title: "Awards gala", desc: "A foundation’s gala evening: awards for research projects, followed by dinner.", note: "Auditorium and forecourt closed from 4pm to 11pm. Residents’ access via the north door.", pass: "Green “Maison internationale” bracelet required after 6pm to cross the hall." },
  "Tournoi inter-entreprises": { title: "Corporate sports tournament", desc: "Friendly tournament between employees of several companies (five-a-side football and basketball).", note: "Outdoor courts closed to residents all day." },
  "Journée d’étude": { title: "Study day", desc: "Academic study day on student migration in Europe, with round tables.", note: "Common lounge closed; possible noise in the hall during breaks." },
  "Conseil d’administration": { title: "Board meeting", desc: "Quarterly board meeting of a private company.", note: "Part of the lounge is booked; please keep the noise down." },
  "Petit-déjeuner professionnel": { title: "Business breakfast", desc: "Networking breakfast for entrepreneurs from the south of Paris.", note: "Café closed to residents until 11am." },
  "Conférence annuelle": { title: "Annual conference", desc: "Annual conference of a training institute: talks, round tables and a reception.", note: "Common lounge and hall closed from 8am to 6:30pm.", pass: "Blue “Maison du Japon” bracelet to reach the upper floors, to collect at the house reception." },
  "Cycle de conférences santé": { title: "Health lecture series", desc: "Weekly lecture series for health professionals, every Tuesday evening.", note: "Auditorium unavailable from 5pm to 8:30pm." },
  "Tournage d’une publicité": { title: "Commercial shoot", desc: "Shooting of an advertisement in the house garden.", note: "Garden closed; technical vehicles parked in front of the house." },
  "Salon des associations professionnelles": { title: "Professional associations fair", desc: "Fair bringing together professional associations from the education sector.", note: "Only half of the sports hall can be used." },
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
    { org: "lumen", status: "PENDING" as const, days: 9, start: "07:00", end: "20:00", cat: "culture", house: "parc", space: "Pelouse centrale", impact: "LIMITED" as const, note: "Zone de tournage balisée.", title: "Tournage d’un long métrage", desc: "Tournage en extérieur." },
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
