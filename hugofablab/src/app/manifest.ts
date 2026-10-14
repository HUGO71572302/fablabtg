import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "HUGO FABLAB — L’atelier des possibles",
    short_name: "HUGO FABLAB",
    description: "Le réseau des ateliers scolaires, de la 6e à la Terminale.",
    start_url: "/app?source=pwa",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f8f9f3",
    theme_color: "#173f30",
    lang: "fr",
    dir: "ltr",
    categories: ["education", "productivity"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Réserver un créneau", short_name: "Réserver", url: "/app/reserver", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Mes réservations", short_name: "Réservations", url: "/app/reservations", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Calendrier", short_name: "Calendrier", url: "/app/calendrier", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
    ],
  };
}
