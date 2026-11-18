/**
 * Seed script.
 *
 *   npm run db:seed            -> reference data + sample events (idempotent)
 *   npm run db:unseed          -> removes ONLY the sample events and sample users
 *
 * Sample data is clearly marked: every sample event has isSample = true (shown as a
 * "Sample" badge in the UI), the organisers are fictional ("(exemple)") and the sample
 * users use the reserved domain @sample.ciup.test.
 */
import { PrismaClient } from "@prisma/client";
import { addDaysToKey, currentMonth, dayKeyOf, monthKey, parseLocalDateTime, shiftMonth } from "../src/lib/dates";

const db = new PrismaClient();
const SAMPLE_DOMAIN = "@sample.ciup.test";

const CATEGORIES = [
  { slug: "culture", nameFr: "Culture", nameEn: "Culture", color: "#6B2F8A", bgColor: "#F3ECF8", sortOrder: 1 },
  { slug: "sport", nameFr: "Sport", nameEn: "Sport", color: "#1C6542", bgColor: "#E5F2EA", sortOrder: 2 },
  { slug: "talks", nameFr: "Conférences & débats", nameEn: "Talks & debates", color: "#1E4F8A", bgColor: "#E7EEF8", sortOrder: 3 },
  { slug: "workshops", nameFr: "Ateliers", nameEn: "Workshops", color: "#8A4210", bgColor: "#FBEBDF", sortOrder: 4 },
  { slug: "community", nameFr: "Vie de la communauté", nameEn: "Community", color: "#8A1F45", bgColor: "#F8E8EE", sortOrder: 5 },
];

const VENUES = [
  { nameFr: "Maison internationale · Grand salon", nameEn: "Maison internationale · Grand salon", sortOrder: 1 },
  { nameFr: "Maison internationale · Auditorium", nameEn: "Maison internationale · Auditorium", sortOrder: 2 },
  { nameFr: "Maison internationale · Café", nameEn: "Maison internationale · Café", sortOrder: 3 },
  { nameFr: "Centre sportif", nameEn: "Sports centre", sortOrder: 4 },
  { nameFr: "Bibliothèque", nameEn: "Library", sortOrder: 5 },
  { nameFr: "Parc", nameEn: "Park", sortOrder: 6 },
  { nameFr: "Autre", nameEn: "Other", isOther: true, sortOrder: 7 },
];

const ORGANISERS = [
  { key: "arts", name: "Maison des Arts (exemple)" },
  { key: "sport", name: "Association Cité Sport (exemple)" },
  { key: "debats", name: "Club Débats (exemple)" },
  { key: "monde", name: "Ateliers du Monde (exemple)" },
  { key: "verte", name: "Maison Verte (exemple)" },
];

type Seed = {
  org: string;
  title: string;
  desc: string;
  cat: string;
  venue: string; // French name of the venue
  /** day of the month, 0 = this month, 1 = next month */
  m: 0 | 1;
  d: number;
  start: string;
  end: string;
  audience?: "RESIDENTS_ONLY" | "PUBLIC";
  recurrence?: "WEEKLY" | "MONTHLY";
  repeatUntilMonths?: number; // months after the start month
  custom?: string;
  registrationUrl?: string;
};

const PUBLISHED: Seed[] = [
  { org: "verte", m: 0, d: 2, start: "18:30", end: "20:00", cat: "community", venue: "Maison internationale · Café", title: "Accueil des nouveaux résidents", desc: "Un verre, des rencontres et toutes les infos pratiques pour bien démarrer à la Cité : services, associations, bons plans.", audience: "RESIDENTS_ONLY" },
  { org: "arts", m: 0, d: 4, start: "19:00", end: "21:00", cat: "culture", venue: "Maison internationale · Auditorium", title: "Concert de jazz : quartet universitaire", desc: "Quatre étudiants-musiciens reprennent des standards et des compositions originales. Entrée libre, dans la limite des places disponibles.", audience: "PUBLIC" },
  { org: "monde", m: 0, d: 4, start: "12:30", end: "13:30", cat: "workshops", venue: "Maison internationale · Grand salon", title: "Atelier CV et entretiens d’embauche", desc: "Conseils pratiques pour rédiger un CV à la française et préparer un entretien. Apportez votre CV, nous le relirons ensemble." },
  { org: "sport", m: 0, d: 4, start: "18:30", end: "19:30", cat: "sport", venue: "Centre sportif", title: "Yoga du soir", desc: "Une séance douce pour décompresser en milieu de semaine. Tous niveaux, prêtez-vous un tapis ou apportez le vôtre.", recurrence: "WEEKLY", repeatUntilMonths: 1 },
  { org: "sport", m: 0, d: 6, start: "10:00", end: "12:00", cat: "sport", venue: "Parc", title: "Course d’orientation dans le parc", desc: "Par équipes de trois, retrouvez les balises cachées dans le parc. Chaussures de sport conseillées, goûter offert à l’arrivée.", audience: "PUBLIC" },
  { org: "debats", m: 0, d: 9, start: "18:00", end: "19:30", cat: "talks", venue: "Maison internationale · Auditorium", title: "Conférence : les mobilités étudiantes en Europe", desc: "Deux chercheuses présentent les grandes tendances de la mobilité étudiante et répondent à vos questions.", audience: "PUBLIC", registrationUrl: "https://example.org/inscription-mobilites" },
  { org: "verte", m: 0, d: 10, start: "20:00", end: "22:30", cat: "community", venue: "Maison internationale · Café", title: "Soirée jeux de société", desc: "Des dizaines de jeux à disposition, du plus simple au plus stratégique. Venez seul(e) ou à plusieurs, les parties se forment sur place." },
  { org: "monde", m: 0, d: 12, start: "14:00", end: "17:00", cat: "workshops", venue: "Bibliothèque", title: "Atelier d’écriture en français", desc: "Un atelier bienveillant pour écrire de courts textes et progresser en français, quel que soit votre niveau." },
  { org: "sport", m: 0, d: 14, start: "09:30", end: "11:30", cat: "sport", venue: "Centre sportif", title: "Tournoi de badminton", desc: "Tournoi amical en double, ouvert à tous les niveaux. Les raquettes sont fournies sur place.", audience: "PUBLIC" },
  { org: "arts", m: 0, d: 16, start: "19:30", end: "22:00", cat: "culture", venue: "Maison internationale · Grand salon", title: "Ciné-club : cinéma coréen", desc: "Projection en version originale sous-titrée, suivie d’une discussion animée par des résidents passionnés de cinéma." },
  { org: "monde", m: 0, d: 18, start: "12:30", end: "14:00", cat: "community", venue: "Maison internationale · Café", title: "Déjeuner partagé des maisons", desc: "Chacun apporte un plat de son pays. Un buffet de saveurs pour se rencontrer entre maisons." },
  { org: "monde", m: 0, d: 18, start: "17:00", end: "18:30", cat: "workshops", venue: "Bibliothèque", title: "Initiation à la recherche documentaire", desc: "Apprenez à trouver des sources fiables et à gérer vos références avec les bibliothécaires." },
  { org: "debats", m: 0, d: 18, start: "18:30", end: "20:30", cat: "talks", venue: "Maison internationale · Grand salon", title: "Débat : l’IA à l’université, chance ou danger ?", desc: "Étudiants et enseignants confrontent leurs points de vue sur l’usage de l’intelligence artificielle dans les études.", audience: "PUBLIC" },
  { org: "arts", m: 0, d: 21, start: "15:00", end: "18:00", cat: "culture", venue: "Maison internationale · Auditorium", title: "Scène ouverte musique et poésie", desc: "Chantez, jouez, lisez : trois minutes de scène pour tous ceux qui le souhaitent. Inscription sur place." },
  { org: "debats", m: 0, d: 24, start: "19:00", end: "20:30", cat: "talks", venue: "Maison internationale · Auditorium", title: "Table ronde : vivre à Paris avec un petit budget", desc: "Logement, transports, alimentation, loisirs : anciens et nouveaux résidents partagent leurs astuces." },
  { org: "monde", m: 0, d: 26, start: "18:00", end: "21:00", cat: "workshops", venue: "Maison internationale · Grand salon", title: "Cuisine du monde : atelier raviolis", desc: "Préparez et dégustez des raviolis de trois traditions culinaires différentes. Places limitées.", registrationUrl: "https://example.org/inscription-cuisine" },
  { org: "arts", m: 0, d: 28, start: "20:00", end: "21:30", cat: "culture", venue: "Maison internationale · Auditorium", title: "Spectacle de danse contemporaine", desc: "Une création de la compagnie universitaire, mêlant danses traditionnelles et chorégraphie contemporaine.", audience: "PUBLIC" },
  { org: "debats", m: 1, d: 2, start: "18:30", end: "20:00", cat: "talks", venue: "Maison internationale · Auditorium", title: "Les villes du futur", desc: "Architectes et urbanistes imaginent la ville de demain : mobilité, nature, logement.", audience: "PUBLIC" },
  { org: "verte", m: 1, d: 5, start: "14:00", end: "18:00", cat: "community", venue: "Maison internationale · Grand salon", title: "Marché de Noël des maisons", desc: "Artisanat, spécialités et boissons chaudes proposés par les maisons de la Cité. Une belle occasion de faire des cadeaux.", audience: "PUBLIC" },
  { org: "sport", m: 1, d: 6, start: "10:00", end: "12:30", cat: "sport", venue: "Centre sportif", title: "Match amical de football inter-maisons", desc: "Les équipes des maisons s’affrontent dans la bonne humeur. Supporters bienvenus.", audience: "PUBLIC" },
  { org: "arts", m: 1, d: 9, start: "19:00", end: "20:30", cat: "culture", venue: "Bibliothèque", title: "Lecture de poésie multilingue", desc: "Un même poème lu en cinq langues. Venez écouter, ou lire dans votre langue maternelle." },
  { org: "monde", m: 1, d: 11, start: "18:00", end: "19:30", cat: "workshops", venue: "Maison internationale · Café", title: "Tandem des langues : conversation FR / EN", desc: "Chaque mois, pratiquez le français et l’anglais en binôme avec un résident. Café offert.", recurrence: "MONTHLY", repeatUntilMonths: 6 },
  { org: "arts", m: 1, d: 14, start: "19:00", end: "21:00", cat: "culture", venue: "Maison internationale · Auditorium", title: "Concert de Noël de la chorale", desc: "La chorale de la Cité interprète des chants de Noël du monde entier.", audience: "PUBLIC" },
  { org: "verte", m: 1, d: 17, start: "18:30", end: "23:00", cat: "community", venue: "Autre", custom: "Maison Verte, salle commune", title: "Soirée de fin d’année de la Maison Verte", desc: "Dîner, musique et danse pour fêter la fin d’année ensemble.", audience: "RESIDENTS_ONLY" },
];

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
  for (const v of VENUES) {
    const existing = await db.venue.findFirst({ where: { nameEn: v.nameEn } });
    if (!existing) await db.venue.create({ data: v });
  }
  const categories = Object.fromEntries((await db.category.findMany()).map((c) => [c.slug, c.id]));
  const venues = Object.fromEntries((await db.venue.findMany()).map((v) => [v.nameFr, v.id]));

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
  const thisMonth = currentMonth(now);
  const monthOf = (m: 0 | 1) => monthKey(shiftMonth(thisMonth, m));
  const contact = (key: string) => `sample-${key}${SAMPLE_DOMAIN}`;

  let count = 0;
  for (const s of PUBLISHED) {
    const date = `${monthOf(s.m)}-${String(s.d).padStart(2, "0")}`;
    const startAt = parseLocalDateTime(date, s.start)!;
    const endAt = parseLocalDateTime(date, s.end)!;
    let recurrenceEnd: Date | null = null;
    if (s.recurrence) {
      const last = shiftMonth(thisMonth, s.m + (s.repeatUntilMonths ?? 1) + 1);
      recurrenceEnd = parseLocalDateTime(addDaysToKey(`${monthKey(last)}-01`, -1), "00:00");
    }
    await db.event.create({
      data: {
        title: s.title,
        description: s.desc,
        categoryId: categories[s.cat],
        startAt,
        endAt,
        venueId: venues[s.venue],
        customLocation: s.custom ?? null,
        audience: s.audience ?? "RESIDENTS_ONLY",
        organiserName: orgName[s.org],
        contactEmail: contact(s.org),
        registrationUrl: s.registrationUrl ?? null,
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
  const today = dayKeyOf(now);
  const inDays = (n: number, time: string) => parseLocalDateTime(addDaysToKey(today, n), time)!;
  const others = [
    { org: "sport", status: "PENDING" as const, days: 5, start: "19:00", end: "21:00", cat: "sport", venue: "Centre sportif", title: "Tournoi de ping-pong", desc: "Tournoi en simple, élimination directe. Inscriptions ouvertes jusqu’au début de la soirée." },
    { org: "monde", status: "PENDING" as const, days: 9, start: "14:00", end: "16:30", cat: "workshops", venue: "Maison internationale · Grand salon", title: "Atelier photo : portraits de rue", desc: "Sortie photo encadrée dans le quartier, puis sélection et retouche des meilleures images." },
    { org: "verte", status: "PENDING" as const, days: 12, start: "21:00", end: "23:30", cat: "community", venue: "Maison internationale · Café", title: "Soirée karaoké internationale", desc: "Chansons du monde entier au micro. Les textes sont projetés, aucune honte à avoir." },
    { org: "arts", status: "DRAFT" as const, days: 20, start: "18:00", end: "20:00", cat: "culture", venue: "Maison internationale · Grand salon", title: "Exposition photo des résidents", desc: "" },
    { org: "verte", status: "REJECTED" as const, days: 7, start: "11:00", end: "17:00", cat: "community", venue: "Parc", title: "Vente de produits dérivés", desc: "Vente de t-shirts et de mugs aux couleurs de l’association.", reason: "La vente commerciale n’est pas autorisée dans le parc. Vous pouvez proposer un stand à but non lucratif." },
  ];
  for (const o of others) {
    await db.event.create({
      data: {
        title: o.title,
        description: o.desc,
        categoryId: categories[o.cat],
        startAt: inDays(o.days, o.start),
        endAt: inDays(o.days, o.end),
        venueId: venues[o.venue],
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

  console.log(`Seeded ${CATEGORIES.length} categories, ${VENUES.length} venues and ${count} SAMPLE events (isSample = true).`);
  console.log("Remove them any time with: npm run db:unseed");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
