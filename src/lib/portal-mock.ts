/**
 * Mock content for the parts of the residents' portal that are not part of this prototype.
 * Only the Calendar tab is real; everything here stands in for data the portal already has.
 */

export const MOCK_RESIDENT = { firstName: "Camille", lastName: "Martin" };

/** Postal address shown on the house card (the Cité's main address, for every house). */
export const CIUP_ADDRESS = "17, boulevard Jourdan 75014 Paris";

export type MockNews = {
  id: string;
  title: { fr: string; en: string };
  excerpt: { fr: string; en: string };
  label: { fr: string; en: string };
  author: string;
  hoursAgo: number;
  /** Second shape of the cover graphic. */
  accent: "purple" | "yellow" | "pink" | "blue";
};

export const MOCK_NEWS: MockNews[] = [
  {
    id: "bracelets",
    title: { fr: "Distribution des bracelets d’accès", en: "Access wristband distribution" },
    excerpt: {
      fr: "Les bracelets ne sont plus disponibles à l’accueil. Nous les distribuons directement dans votre maison cette semaine.",
      en: "Wristbands are no longer available at reception. We are distributing them directly in your house this week.",
    },
    label: { fr: "Événement", en: "Event" },
    author: "Maison du Japon",
    hoursAgo: 4,
    accent: "purple",
  },
  {
    id: "contest",
    title: { fr: "Concours photo et vidéo | C’est quoi le bonheur ?", en: "Photo and video contest | What is happiness?" },
    excerpt: {
      fr: "Et si le bonheur avait un sens différent selon les cultures ? Une association de la Cité lance un concours ouvert à tous les résidents.",
      en: "What if happiness meant something different across cultures? An association of the Cité launches a contest open to all residents.",
    },
    label: { fr: "Concours", en: "Contest" },
    author: "Cité internationale",
    hoursAgo: 8,
    accent: "pink",
  },
  {
    id: "library",
    title: { fr: "Nouveaux horaires de la bibliothèque", en: "New library opening hours" },
    excerpt: {
      fr: "Pendant la période des examens, la bibliothèque de la Maison internationale reste ouverte jusqu’à minuit.",
      en: "During the exam period, the library of the Maison internationale stays open until midnight.",
    },
    label: { fr: "Info pratique", en: "Good to know" },
    author: "Maison internationale",
    hoursAgo: 26,
    accent: "yellow",
  },
  {
    id: "sport",
    title: { fr: "Inscriptions aux cours de sport du semestre", en: "Sign-ups for this semester’s sports classes" },
    excerpt: {
      fr: "Yoga, badminton, natation : les inscriptions au Centre sportif ouvrent lundi à 9 h sur le portail.",
      en: "Yoga, badminton, swimming: sign-ups at the sports centre open on Monday at 9am on the portal.",
    },
    label: { fr: "Sport", en: "Sport" },
    author: "Centre sportif",
    hoursAgo: 50,
    accent: "blue",
  },
];
