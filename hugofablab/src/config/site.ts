/** Identité et constantes de la plateforme (partagées par les layouts, le manifest et les métadonnées). */
export const SITE = {
  name: "HUGO FABLAB",
  tagline: "L’atelier des possibles",
  description:
    "Le réseau des FabLabs scolaires : créez le lab de votre école, réservez vos machines et partagez les projets des élèves de la 6e à la Terminale.",
  themeColor: { light: "#173f30", dark: "#111c16" },
  nav: [
    { href: "/#labs", label: "Les FabLabs" },
    { href: "/#fonctionnement", label: "Comment ça marche" },
    { href: "/#projets", label: "Les projets" },
  ],
  /** Mots du bandeau défilant de la page d'accueil. */
  marquee: ["Imprimer en 3D", "Souder", "Découper au laser", "Coder un robot", "Prototyper", "Partager", "Recommencer"],
} as const;
