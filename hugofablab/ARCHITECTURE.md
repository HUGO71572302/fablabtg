# HUGO FABLAB — Architecture

```
src/
├─ app/                         Routage (App Router). Les groupes entre parenthèses n'affectent pas les URL.
│  ├─ (public)/                 Vitrine : accueil, /lab/[slug], /creer-mon-lab  → layout : progression de lecture + footer
│  ├─ (auth)/                   /login, /register
│  ├─ (workspace)/              Espaces connectés : /app (élève) et /admin (responsable), chacun avec son layout
│  ├─ api/                      Routes HTTP : auth Google, médias, notifications (SSE), santé
│  ├─ checkin/[token]/          Pointage par QR code
│  ├─ layout.tsx                Layout racine : polices, thème, PWA, classe `js` (animations progressives)
│  └─ globals.css               Point d'entrée des styles (importe src/styles/*)
├─ components/
│  ├─ ui/                       Primitives sans logique métier : boutons, cartes, badges, modal, champs, toggles
│  ├─ brand/                    Logo et marque
│  ├─ layout/                   Coquilles de page : en-tête/pied public, AppShell (sidebar + nav mobile), AuthCard
│  ├─ motion/                   Système d'animation : Reveal, Stagger, MaskLine, CountUp, ScrollProgress, Marquee
│  ├─ marketing/                Blocs de la vitrine : SectionHeading, annuaire des labs, FAQ
│  ├─ auth/                     Formulaires de connexion / inscription élève / création de lab
│  ├─ reservations/             Formulaire, carte, calendrier hebdo, QR code, actions élève
│  ├─ projects/                 Carte, formulaire et actions des projets
│  ├─ stock/                    Inventaire : jauge de niveau, graphe de consommation, carte article, éditeur, journal
│  ├─ admin/                    Éditeurs réservés au responsable (ressources, réservations, élèves)
│  └─ system/                   Comportements transverses : notifications temps réel, PWA, visionneuse d'images, réglages sonores
├─ actions/                     Server Actions (mutations) — une famille par domaine
├─ lib/                         Logique serveur partagée : auth, réservations, labs, stock, médias, dates, libellés…
├─ db/                          Schéma Drizzle, connexion, seed de démonstration
├─ config/site.ts               Identité de la plateforme (nom, slogan, navigation, bandeau)
└─ styles/                      Couches CSS ordonnées : tokens → base → components → motion
```

## Règles de dépendance
- `ui` ne dépend de rien d'autre que `lib/labels` (libellés) ; `motion` ne dépend de rien.
- `layout`, `marketing`, `auth`, `reservations`, `projects`, `admin` peuvent utiliser `ui`, `brand`, `motion`, `actions`, `lib`.
- `app/` compose uniquement ; aucune logique métier n'y vit en dehors du chargement des données.

## Système d'animation (motion)
- **Sans JavaScript, tout est visible** : les états masqués ne s'appliquent que sous `html.js`, posé par un script inline avant le premier rendu.
- **Un seul `IntersectionObserver`** partagé pour toute la page (`use-in-view.ts`).
- **Scroll-driven CSS natif** (`animation-timeline`) pour la barre de progression et le parallaxe : zéro écouteur de défilement ; repli JS uniquement pour la barre si le navigateur ne le supporte pas.
- **`prefers-reduced-motion`** neutralise toutes les animations.
- Variantes `Reveal` : `up` · `down` · `left` · `right` · `scale` · `blur` · `clip` (rideau) · `line` (trait) · `group` (déclenche les `MaskLine` enfants).

## Images plein écran et son personnalisé
- `components/system/image-viewer.tsx` : un seul gestionnaire global (délégation des clics/clavier + visionneuse en portail) pour les photos des machines, salles, projets, laboratoires, stocks et autres contenus. Groupes `data-gallery`; zoom molette/boutons/pincement, déplacement, flèches, téléchargement, Échap. Les images dans les formulaires utilisent `openImageViewer` via un bouton séparé pour ne pas gêner la sélection du fichier. Les logos de navigation, icônes et images `data-no-zoom` restent inchangés.
- `components/system/sound-settings.tsx` + `lib/sound.ts` : préférences sonores par événement. Choix de mélodie, volume, vibration, fichier personnel (IndexedDB) ; `localStorage` pour les réglages. Les données audio ne sont jamais envoyées au serveur. Le bouton de réglage est accessible depuis l'en-tête et le menu mobile.

## Outils
- `scripts/check-responsive.mjs` : parcours Chromium (360 → 1440 px), connexion, menus, débordements.
- `scripts/check-media-sound.mjs` : visionneuse (clavier/mobile/zoom) et personnalisation sonore (préférences, WAV, temps réel).
- `scripts/check-gallery-coverage.mjs` : photos machines, salles, stock et téléchargement, avec nettoyage des données de test.
- `scripts/generate-brand-assets.mjs` : icônes PWA et optimisation des visuels.

## Abonnements
- `lab_subscriptions` : essai de 10 minutes, formule, dates d'accès et statut du lab.
- `payment_requests` : demande Mobile Money, référence, preuve, décision et validation.
- `app/(billing)/abonnement` : responsable du lab ; paiement TMoney/Flooz + preuve + suivi de demande.
- `app/(billing)/gestion-abonnements` : administrateur plateforme ; validation humaine gratuite, refus ou accès de courtoisie.
- `requireUser()` bloque les espaces de travail si l'essai/abonnement est expiré ; `requireBillingUser()` garde `/abonnement` accessible pour réactiver.

## Journal, fiches et impressions
- `app/(workspace)/admin/stock/journal` : journal filtrable des entrées et sorties, bilan par article, export CSV.
- `app/(print)/print/*` : documents imprimables (journal, reçu d'un mouvement, fiche article) — sans menu, mise en page A4.
- `app/api/stock/journal` : export CSV (responsable uniquement).
- `components/print/*` : en-tête et signatures communs aux documents imprimés.
- `lib/image-compress.ts` : optimisation des photos dans le navigateur avant envoi (photos de téléphone jusqu'à 12 Mo).
