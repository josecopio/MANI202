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
  house: string; // house slug
  space: string; // French name of the space in that house, or "Autre"
  impact?: "LIMITED" | "CLOSED";
  note?: string; // restriction note shown to residents
  /** day of the month, 0 = this month, 1 = next month */
  m: 0 | 1;
  d: number;
  start: string;
  end: string;
  audience?: "RESIDENTS_ONLY" | "PUBLIC" | "HOUSE_ONLY";
  recurrence?: "WEEKLY" | "MONTHLY";
  repeatUntilMonths?: number; // months after the start month
  custom?: string;
  registrationUrl?: string;
};

const PUBLISHED: Seed[] = [
  { org: "verte", m: 0, d: 2, start: "18:30", end: "20:00", cat: "community", house: "maison-internationale", space: "Café", title: "Accueil des nouveaux résidents", desc: "Un verre, des rencontres et toutes les infos pratiques pour bien démarrer à la Cité : services, associations, bons plans.", audience: "RESIDENTS_ONLY" },
  { org: "arts", m: 0, d: 4, start: "19:00", end: "21:00", cat: "culture", house: "maison-internationale", space: "Auditorium", title: "Concert de jazz : quartet universitaire", desc: "Quatre étudiants-musiciens reprennent des standards et des compositions originales. Entrée libre, dans la limite des places disponibles.", audience: "PUBLIC", impact: "CLOSED", note: "L’auditorium est indisponible de 17h à 22h (installation, répétition et concert)." },
  { org: "monde", m: 0, d: 4, start: "12:30", end: "13:30", cat: "workshops", house: "maison-internationale", space: "Grand salon", title: "Atelier CV et entretiens d’embauche", desc: "Conseils pratiques pour rédiger un CV à la française et préparer un entretien. Apportez votre CV, nous le relirons ensemble." },
  { org: "sport", m: 0, d: 4, start: "18:30", end: "19:30", cat: "sport", house: "centre-sportif", space: "Gymnase", title: "Yoga du soir", desc: "Une séance douce pour décompresser en milieu de semaine. Tous niveaux, prêtez-vous un tapis ou apportez le vôtre.", recurrence: "WEEKLY", repeatUntilMonths: 1, impact: "LIMITED", note: "Seule la moitié du gymnase est utilisable pendant le cours." },
  { org: "sport", m: 0, d: 6, start: "10:00", end: "12:00", cat: "sport", house: "parc", space: "Pelouse centrale", title: "Course d’orientation dans le parc", desc: "Par équipes de trois, retrouvez les balises cachées dans le parc. Chaussures de sport conseillées, goûter offert à l’arrivée.", audience: "PUBLIC" },
  { org: "debats", m: 0, d: 9, start: "18:00", end: "19:30", cat: "talks", house: "maison-internationale", space: "Auditorium", title: "Conférence : les mobilités étudiantes en Europe", desc: "Deux chercheuses présentent les grandes tendances de la mobilité étudiante et répondent à vos questions.", audience: "PUBLIC", registrationUrl: "https://example.org/inscription-mobilites" },
  { org: "verte", m: 0, d: 10, start: "20:00", end: "22:30", cat: "community", house: "maison-internationale", space: "Café", title: "Soirée jeux de société", desc: "Des dizaines de jeux à disposition, du plus simple au plus stratégique. Venez seul(e) ou à plusieurs, les parties se forment sur place.", impact: "LIMITED", note: "Les tables du café sont occupées par les jeux jusqu’à 22h30." },
  { org: "monde", m: 0, d: 12, start: "14:00", end: "17:00", cat: "workshops", house: "bibliotheque", space: "Salle de lecture", title: "Atelier d’écriture en français", desc: "Un atelier bienveillant pour écrire de courts textes et progresser en français, quel que soit votre niveau." },
  { org: "sport", m: 0, d: 14, start: "09:30", end: "11:30", cat: "sport", house: "centre-sportif", space: "Gymnase", title: "Tournoi de badminton", desc: "Tournoi amical en double, ouvert à tous les niveaux. Les raquettes sont fournies sur place.", audience: "PUBLIC", impact: "CLOSED", note: "Le gymnase est fermé aux autres usages de 9h à 12h." },
  { org: "arts", m: 0, d: 16, start: "19:30", end: "22:00", cat: "culture", house: "maison-internationale", space: "Grand salon", title: "Ciné-club : cinéma coréen", desc: "Projection en version originale sous-titrée, suivie d’une discussion animée par des résidents passionnés de cinéma." },
  { org: "monde", m: 0, d: 18, start: "12:30", end: "14:00", cat: "community", house: "maison-internationale", space: "Café", title: "Déjeuner partagé des maisons", desc: "Chacun apporte un plat de son pays. Un buffet de saveurs pour se rencontrer entre maisons." },
  { org: "monde", m: 0, d: 18, start: "17:00", end: "18:30", cat: "workshops", house: "bibliotheque", space: "Salle de lecture", title: "Initiation à la recherche documentaire", desc: "Apprenez à trouver des sources fiables et à gérer vos références avec les bibliothécaires." },
  { org: "debats", m: 0, d: 18, start: "18:30", end: "20:30", cat: "talks", house: "maison-internationale", space: "Grand salon", title: "Débat : l’IA à l’université, chance ou danger ?", desc: "Étudiants et enseignants confrontent leurs points de vue sur l’usage de l’intelligence artificielle dans les études.", audience: "PUBLIC", impact: "CLOSED", note: "Le grand salon est réservé de 18h à 21h." },
  { org: "arts", m: 0, d: 21, start: "15:00", end: "18:00", cat: "culture", house: "maison-internationale", space: "Auditorium", title: "Scène ouverte musique et poésie", desc: "Chantez, jouez, lisez : trois minutes de scène pour tous ceux qui le souhaitent. Inscription sur place." },
  { org: "debats", m: 0, d: 24, start: "19:00", end: "20:30", cat: "talks", house: "maison-internationale", space: "Auditorium", title: "Table ronde : vivre à Paris avec un petit budget", desc: "Logement, transports, alimentation, loisirs : anciens et nouveaux résidents partagent leurs astuces." },
  { org: "monde", m: 0, d: 26, start: "18:00", end: "21:00", cat: "workshops", house: "maison-internationale", space: "Grand salon", title: "Cuisine du monde : atelier raviolis", desc: "Préparez et dégustez des raviolis de trois traditions culinaires différentes. Places limitées.", registrationUrl: "https://example.org/inscription-cuisine" },
  { org: "arts", m: 0, d: 28, start: "20:00", end: "21:30", cat: "culture", house: "maison-internationale", space: "Auditorium", title: "Spectacle de danse contemporaine", desc: "Une création de la compagnie universitaire, mêlant danses traditionnelles et chorégraphie contemporaine.", audience: "PUBLIC" },
  { org: "debats", m: 1, d: 2, start: "18:30", end: "20:00", cat: "talks", house: "maison-internationale", space: "Auditorium", title: "Les villes du futur", desc: "Architectes et urbanistes imaginent la ville de demain : mobilité, nature, logement.", audience: "PUBLIC" },
  { org: "verte", m: 1, d: 5, start: "14:00", end: "18:00", cat: "community", house: "maison-internationale", space: "Grand salon", title: "Marché de Noël des maisons", desc: "Artisanat, spécialités et boissons chaudes proposés par les maisons de la Cité. Une belle occasion de faire des cadeaux.", audience: "PUBLIC" },
  { org: "sport", m: 1, d: 6, start: "10:00", end: "12:30", cat: "sport", house: "centre-sportif", space: "Gymnase", title: "Match amical de football inter-maisons", desc: "Les équipes des maisons s’affrontent dans la bonne humeur. Supporters bienvenus.", audience: "PUBLIC" },
  { org: "arts", m: 1, d: 9, start: "19:00", end: "20:30", cat: "culture", house: "bibliotheque", space: "Salle de lecture", title: "Lecture de poésie multilingue", desc: "Un même poème lu en cinq langues. Venez écouter, ou lire dans votre langue maternelle." },
  { org: "monde", m: 1, d: 11, start: "18:00", end: "19:30", cat: "workshops", house: "maison-internationale", space: "Café", title: "Tandem des langues : conversation FR / EN", desc: "Chaque mois, pratiquez le français et l’anglais en binôme avec un résident. Café offert.", recurrence: "MONTHLY", repeatUntilMonths: 6 },
  { org: "arts", m: 1, d: 14, start: "19:00", end: "21:00", cat: "culture", house: "maison-internationale", space: "Auditorium", title: "Concert de Noël de la chorale", desc: "La chorale de la Cité interprète des chants de Noël du monde entier.", audience: "PUBLIC" },
  { org: "verte", m: 1, d: 17, start: "18:30", end: "23:00", cat: "community", house: "japon", space: "Salon commun", title: "Soirée de fin d’année de la Maison du Japon", desc: "Dîner, musique et danse pour fêter la fin d’année ensemble.", audience: "HOUSE_ONLY", impact: "CLOSED", note: "Le salon commun est réservé aux résidents de la Maison du Japon de 18h à 23h30." },

  // ---- Events inside the residences, with their restrictions
  { org: "verte", m: 0, d: 20, start: "19:00", end: "22:00", cat: "community", house: "japon", space: "Salon commun", title: "Soirée thé et calligraphie", desc: "Une soirée calme entre résidents de la maison : cérémonie du thé, initiation à la calligraphie, discussion.", audience: "HOUSE_ONLY", impact: "CLOSED", note: "Le salon commun est réservé à l’événement de 18h30 à 22h30." },
  { org: "arts", m: 0, d: 27, start: "18:00", end: "20:00", cat: "culture", house: "japon", space: "Salon commun", title: "Projection : cinéma japonais classique", desc: "Un film en version originale sous-titrée. Les résidents des autres maisons sont les bienvenus.", audience: "RESIDENTS_ONLY", impact: "LIMITED", note: "Le salon reste accessible, mais la moitié de la pièce est occupée par l’écran." },
  { org: "debats", m: 0, d: 19, start: "18:30", end: "21:00", cat: "talks", house: "etats-unis", space: "Salon commun", title: "Conférence : les élections américaines vues d’Europe", desc: "Deux politistes analysent le scrutin et répondent aux questions de la salle.", audience: "PUBLIC" },
  { org: "verte", m: 0, d: 22, start: "17:00", end: "23:00", cat: "community", house: "etats-unis", space: "Cuisine collective", title: "Thanksgiving dinner", desc: "Le dîner traditionnel de la maison : dinde, tourtes et bonne humeur. Réservé aux résidents de la fondation.", audience: "HOUSE_ONLY", impact: "CLOSED", note: "Cuisine collective et salon indisponibles de 14h à 23h pour la préparation et le service." },
  { org: "arts", m: 0, d: 18, start: "19:00", end: "22:00", cat: "culture", house: "inde", space: "Jardin", title: "Soirée Diwali : lumières et danses", desc: "Lanternes, danses et pâtisseries pour fêter Diwali. Tous les résidents de la Cité sont invités.", audience: "RESIDENTS_ONLY", impact: "LIMITED", note: "Musique en extérieur jusqu’à 22h : le jardin est partiellement occupé." },
  { org: "monde", m: 0, d: 23, start: "17:00", end: "19:00", cat: "workshops", house: "franco-britannique", space: "Salon commun", title: "Atelier de conversation en anglais", desc: "Un cercle de conversation informel, tous niveaux. Thé et biscuits offerts.", audience: "PUBLIC" },
  { org: "arts", m: 0, d: 25, start: "19:00", end: "21:00", cat: "culture", house: "deutsch-de-la-meurthe", space: "Salon commun", title: "Concert de musique de chambre", desc: "Un quatuor d’étudiants-musiciens de la maison joue Haydn et Schubert.", audience: "RESIDENTS_ONLY", impact: "LIMITED", note: "Merci de ne pas utiliser le salon pour travailler pendant le concert." },
  { org: "verte", m: 0, d: 29, start: "12:00", end: "16:00", cat: "community", house: "armeniens", space: "Cuisine collective", title: "Brunch arménien de la maison", desc: "Un brunch partagé entre les résidents de la maison pour l’arrivée de l’hiver.", audience: "HOUSE_ONLY", impact: "CLOSED", note: "La cuisine collective est fermée de 9h à 16h." },
  { org: "verte", m: 0, d: 30, start: "20:00", end: "23:30", cat: "community", house: "neerlandais", space: "Salon commun", title: "Fête de Sinterklaas", desc: "Chansons, cadeaux surprises et chocolat chaud. Réservé aux résidents du collège.", audience: "HOUSE_ONLY", impact: "LIMITED", note: "Nuisances sonores possibles jusqu’à 23h30." },
  { org: "arts", m: 1, d: 3, start: "18:00", end: "21:00", cat: "culture", house: "maroc", space: "Jardin", title: "Soirée thé à la menthe et musique andalouse", desc: "Une soirée musicale dans le jardin de la maison, ouverte aux résidents de toutes les maisons.", audience: "RESIDENTS_ONLY" },
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
        venueId: spaceOf(s.house, s.space),
        houseId: houseIds[s.house],
        spaceImpact: s.impact ?? "NONE",
        restrictionNote: s.note ?? null,
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
    { org: "sport", status: "PENDING" as const, days: 5, start: "19:00", end: "21:00", cat: "sport", house: "centre-sportif", space: "Gymnase", title: "Tournoi de ping-pong", desc: "Tournoi en simple, élimination directe. Inscriptions ouvertes jusqu’au début de la soirée." },
    { org: "monde", status: "PENDING" as const, days: 9, start: "14:00", end: "16:30", cat: "workshops", house: "maison-internationale", space: "Grand salon", title: "Atelier photo : portraits de rue", desc: "Sortie photo encadrée dans le quartier, puis sélection et retouche des meilleures images." },
    { org: "verte", status: "PENDING" as const, days: 12, start: "21:00", end: "23:30", cat: "community", house: "maison-internationale", space: "Café", title: "Soirée karaoké internationale", desc: "Chansons du monde entier au micro. Les textes sont projetés, aucune honte à avoir." },
    { org: "arts", status: "DRAFT" as const, days: 20, start: "18:00", end: "20:00", cat: "culture", house: "maison-internationale", space: "Grand salon", title: "Exposition photo des résidents", desc: "" },
    { org: "verte", status: "REJECTED" as const, days: 7, start: "11:00", end: "17:00", cat: "community", house: "parc", space: "Pelouse centrale", title: "Vente de produits dérivés", desc: "Vente de t-shirts et de mugs aux couleurs de l’association.", reason: "La vente commerciale n’est pas autorisée dans le parc. Vous pouvez proposer un stand à but non lucratif." },
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
