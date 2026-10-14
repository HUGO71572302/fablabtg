import { count } from "drizzle-orm";
import { db } from "@/db";
import { closures, grades, labSettings, labSubscriptions, labs, notifications, projects, reservations, resources, stockItems, stockMovements, userSkills, users } from "@/db/schema";
import { hashPassword, generateToken } from "@/lib/password";
import { addDays, startOfDayUTC } from "@/lib/dates";

const g = globalThis as typeof globalThis & { __hfSeeded?: Promise<void> };

/** Seed idempotent : ne s'exécute qu'une fois par processus et seulement si la base est vide. */
export function ensureSeeded() {
  // En production Vercel, définissez AUTO_SEED=false pour partir d'une base vierge Supabase
  // et créer votre vrai lab via /creer-mon-lab. Le mode démonstration reste le comportement par défaut.
  if (process.env.AUTO_SEED === "false") return Promise.resolve();
  if (!g.__hfSeeded) {
    g.__hfSeeded = seed().catch((e) => {
      g.__hfSeeded = undefined;
      console.error("[seed] échec :", e);
    });
  }
  return g.__hfSeeded;
}

function at(base: Date, dayOffset: number, hour: number, minute = 0) {
  const d = addDays(base, dayOffset);
  d.setUTCHours(hour, minute, 0, 0);
  return d;
}

/** Prochain jour ouvré (lun–sam) à partir d'un offset. */
function nextOpen(base: Date, offset: number) {
  let d = addDays(base, offset);
  while (d.getUTCDay() === 0) d = addDays(d, 1);
  return d;
}

async function seed() {
  const [{ n }] = await db.select({ n: count() }).from(labSettings);
  if (n > 0) return;

  const [lab] = await db
    .insert(labs)
    .values({
      slug: "hugo-fablab",
      name: "HUGO FABLAB",
      schoolName: "Lycée Nassablé de Dapaong",
      city: "Dapaong",
      region: "Savanes",
      description:
        "Le laboratoire de fabrication numérique du Lycée Nassablé, ouvert à tous les élèves de la 6e à la Terminale : impression 3D, découpe laser, électronique et robotique.",
      motto: "Fabriquer, apprendre, innover.",
      contactEmail: "hkabrame@gmail.com",
      contactPhone: "96 93 38 93",
    })
    .returning();
  const L = lab.id;

  await db.insert(labSettings).values({
    labId: L,
    openDays: "1,2,3,4,5,6",
    openTime: "08:00",
    closeTime: "18:00",
    slotStepMinutes: 30,
    maxDurationMinutes: 120,
    maxActiveReservations: 3,
    announcement:
      "Bienvenue au HUGO FABLAB ! Pensez à apporter votre fichier (STL, SVG, DXF) sur clé USB ou par e-mail avant votre créneau.",
  });

  // Lab de démonstration : actif 30 jours à l'initialisation. Les nouveaux labs créés par un responsable ont un essai de 10 min.
  await db.insert(labSubscriptions).values({
    labId: L,
    plan: "plus",
    status: "active",
    trialEndsAt: addDays(new Date(), 30),
    activeFrom: new Date(),
    activeUntil: addDays(new Date(), 30),
    note: "Période de démonstration initiale",
  });

  // ⚠️ Le rôle fabmanager n'est jamais attribuable via l'application : uniquement ici (base de données).
  const [hugo, awa, kossi, afi] = await db
    .insert(users)
    .values([
      {
        name: "Hugo (Atissoli) KABRAME",
        email: "hkabrame@gmail.com",
        username: "hkabrame",
        labId: L,
        passwordHash: hashPassword(process.env.FABMANAGER_PASSWORD ?? "dalshim71"),
        role: "fabmanager",
        autonomyLevel: "expert",
        organisation: "FabManager & Enseignant Référent",
        phone: "96 93 38 93",
        emailVerified: true,
      },
      {
        name: "Awa Lare",
        email: "awa.lare@example.com",
        username: "awa.lare",
        labId: L,
        classLevel: "Tle",
        passwordHash: hashPassword("1234"),
        role: "student",
        autonomyLevel: "confirme",
        organisation: "D2",
        emailVerified: true,
      },
      {
        name: "Kossi Tchamie",
        email: "kossi.tchamie@example.com",
        username: "kossi.tchamie",
        labId: L,
        classLevel: "3e",
        passwordHash: hashPassword("1234"),
        role: "student",
        autonomyLevel: "debutant",
        organisation: "B",
        emailVerified: true,
      },
      {
        name: "Afi Bassabi",
        email: "afi.bassabi@example.com",
        username: "afi.bassabi",
        labId: L,
        classLevel: "1re",
        passwordHash: hashPassword("1234"),
        role: "student",
        autonomyLevel: "debutant",
        organisation: "C1",
        emailVerified: true,
      },
    ])
    .returning();

  const [fab, elec, formation] = await db
    .insert(resources)
    .values([
      { labId: L, type: "salle", name: "Salle Fabrication", category: "Salle", description: "Atelier principal : imprimantes 3D, découpe laser, CNC et établis.", capacity: 12, maxDurationMinutes: 180, icon: "room", sortOrder: 1 },
      { labId: L, type: "salle", name: "Salle Électronique", category: "Salle", description: "Postes de soudure, oscilloscope, kits Arduino / Raspberry Pi.", capacity: 8, maxDurationMinutes: 180, icon: "room", sortOrder: 2 },
      { labId: L, type: "salle", name: "Salle Formation", category: "Salle", description: "Salle de cours équipée d'un vidéoprojecteur pour les ateliers et initiations.", capacity: 20, maxDurationMinutes: 240, icon: "room", sortOrder: 3 },
    ])
    .returning();

  const [imp1, imp2, laser, cnc, soudure, kits, vinyle, pcs] = await db
    .insert(resources)
    .values([
      { labId: L, type: "machine", name: "Imprimante 3D #1", category: "Impression 3D", description: "Creality Ender-3 V3 · PLA/PETG · volume 220×220×250 mm.", requiredLevel: "debutant", capacity: 1, maxDurationMinutes: 180, roomId: fab.id, icon: "printer", sortOrder: 10 },
      { labId: L, type: "machine", name: "Imprimante 3D #2", category: "Impression 3D", description: "Prusa MK4 · haute précision · PLA/ABS.", requiredLevel: "debutant", capacity: 1, maxDurationMinutes: 180, roomId: fab.id, icon: "printer", sortOrder: 11 },
      { labId: L, type: "machine", name: "Découpeuse laser CO2", category: "Découpe laser", description: "Laser CO2 40 W · bois, contreplaqué, acrylique · 500×300 mm. Machine sensible.", requiredLevel: "confirme", capacity: 1, maxDurationMinutes: 90, roomId: fab.id, icon: "laser", sortOrder: 12 },
      { labId: L, type: "machine", name: "Fraiseuse CNC de bureau", category: "Usinage CNC", description: "CNC 3018 Pro · gravure et fraisage bois/PCB. Réservée aux experts.", requiredLevel: "expert", capacity: 1, maxDurationMinutes: 120, roomId: fab.id, icon: "cnc", sortOrder: 13 },
      { labId: L, type: "machine", name: "Postes de soudure", category: "Électronique", description: "4 stations fer à souder + multimètres + alimentation de labo.", requiredLevel: "debutant", capacity: 4, maxDurationMinutes: 120, roomId: elec.id, icon: "electronics", sortOrder: 20 },
      { labId: L, type: "machine", name: "Kits Arduino & Raspberry Pi", category: "Électronique", description: "6 kits complets : cartes, capteurs, moteurs, breadboards.", requiredLevel: "debutant", capacity: 6, maxDurationMinutes: 120, roomId: elec.id, icon: "robot", sortOrder: 21 },
      { labId: L, type: "machine", name: "Plotter de découpe vinyle", category: "Découpe vinyle", description: "Silhouette Cameo 4 · stickers, pochoirs, flocage textile.", requiredLevel: "debutant", capacity: 1, maxDurationMinutes: 90, roomId: fab.id, icon: "vinyl", sortOrder: 30 },
      { labId: L, type: "machine", name: "Postes de conception (PC)", category: "Informatique", description: "5 ordinateurs avec Tinkercad, FreeCAD, Inkscape et Arduino IDE.", requiredLevel: "debutant", capacity: 5, maxDurationMinutes: 120, roomId: formation.id, icon: "computer", sortOrder: 40 },
    ])
    .returning();

  await db.insert(userSkills).values([
    { userId: awa.id, resourceId: laser.id, level: "confirme", grantedBy: hugo.id },
    { userId: awa.id, resourceId: imp1.id, level: "expert", grantedBy: hugo.id },
  ]);

  const today = startOfDayUTC(new Date());
  const d1 = nextOpen(today, 1);
  const d2 = nextOpen(today, 2);
  const d3 = nextOpen(today, 3);
  const past1 = addDays(today, -3);
  const past2 = addDays(today, -8);

  const rows = await db
    .insert(reservations)
    .values([
      { userId: awa.id, resourceId: imp2.id, startAt: at(d1, 0, 14), endAt: at(d1, 0, 16), status: "confirmee", purpose: "Impression du boîtier de la station météo (projet TPE)", createdBy: awa.id, modifiedBy: hugo.id, qrToken: generateToken() },
      { userId: awa.id, resourceId: laser.id, startAt: at(d2, 0, 10), endAt: at(d2, 0, 11, 30), status: "en_attente", purpose: "Découpe de la carte du Togo en contreplaqué 3 mm", createdBy: awa.id, qrToken: generateToken() },
      { userId: kossi.id, resourceId: soudure.id, startAt: at(d1, 0, 9), endAt: at(d1, 0, 11), status: "en_attente", purpose: "Réparation de lampes solaires (atelier association)", createdBy: kossi.id, qrToken: generateToken() },
      { userId: afi.id, resourceId: kits.id, startAt: at(d3, 0, 15), endAt: at(d3, 0, 16, 30), status: "confirmee", purpose: "Robot suiveur de ligne — initiation Arduino", createdBy: afi.id, modifiedBy: hugo.id, qrToken: generateToken() },
      { userId: afi.id, resourceId: pcs.id, startAt: at(d1, 0, 10), endAt: at(d1, 0, 11), status: "confirmee", purpose: "Modélisation Tinkercad", createdBy: afi.id, modifiedBy: hugo.id, qrToken: generateToken() },
      { userId: awa.id, resourceId: imp1.id, startAt: at(past1, 0, 10), endAt: at(past1, 0, 12), status: "confirmee", purpose: "Prototype d'engrenages", createdBy: awa.id, modifiedBy: hugo.id, qrToken: generateToken(), checkedInAt: at(past1, 0, 10, 5) },
      { userId: kossi.id, resourceId: vinyle.id, startAt: at(past2, 0, 15), endAt: at(past2, 0, 16), status: "annulee", purpose: "Stickers pour l'association", adminNote: "Annulée : plotter en maintenance ce jour-là.", createdBy: kossi.id, modifiedBy: hugo.id, qrToken: generateToken() },
      { userId: afi.id, resourceId: soudure.id, startAt: at(past2, 0, 9), endAt: at(past2, 0, 10, 30), status: "confirmee", purpose: "Premier circuit LED", createdBy: afi.id, modifiedBy: hugo.id, qrToken: generateToken(), checkedInAt: at(past2, 0, 9, 2) },
    ])
    .returning();

  const dd = `${String(d1.getUTCDate()).padStart(2, "0")}/${String(d1.getUTCMonth() + 1).padStart(2, "0")}`;
  await db.insert(notifications).values([
    { userId: awa.id, reservationId: rows[0].id, type: "confirmee", title: "✅ Réservation confirmée", message: `Réservation Imprimante 3D #2 — confirmée pour le ${dd} à 14h00.`, read: true },
    { userId: awa.id, reservationId: rows[1].id, type: "en_attente", title: "⏳ Demande enregistrée", message: "Réservation Découpeuse laser CO2 : en attente de validation par le FabManager.", read: false },
    { userId: hugo.id, reservationId: rows[1].id, type: "en_attente", title: "⏳ Nouvelle demande de réservation", message: "Awa Lare — Réservation Découpeuse laser CO2 (carte du Togo).", read: false },
    { userId: hugo.id, reservationId: rows[2].id, type: "en_attente", title: "⏳ Nouvelle demande de réservation", message: "Kossi Tchamie — Réservation Postes de soudure (réparation de lampes solaires).", read: false },
    { userId: awa.id, reservationId: null, type: "niveau", title: "🏅 Nouveau niveau débloqué", message: "Niveau Confirmé accordé pour la Découpeuse laser CO2 par le FabManager.", read: true },
  ]);

  // Stock de démarrage : consommables, matières, pièces, outillage et EPI réalistes.
  const stockRows = await db
    .insert(stockItems)
    .values([
      { labId: L, name: "Filament PLA vert 1,75 mm", category: "consommable", unit: "rouleau", quantity: 4, minQuantity: 2, location: "Étagère A · bac 1", supplier: "Kara Maker Supply", note: "Bobines de 1 kg pour les imprimantes 3D.", icon: "filament" },
      { labId: L, name: "Contreplaqué 3 mm", category: "matiere", unit: "feuille", quantity: 6, minQuantity: 4, location: "Râtelier bois", note: "Format 600 x 400 mm pour la découpe laser.", icon: "material" },
      { labId: L, name: "Cartes Arduino Uno", category: "piece", unit: "pièce", quantity: 8, minQuantity: 4, location: "Tiroir électronique", supplier: "Lomé Électronique", icon: "chip" },
      { labId: L, name: "Lunettes de protection laser", category: "securite", unit: "paire", quantity: 2, minQuantity: 4, location: "Casier sécurité", note: "Indispensables à la découpeuse laser.", icon: "safety" },
      { labId: L, name: "Mèches à bois 6 mm", category: "outillage", unit: "pièce", quantity: 12, minQuantity: 6, location: "Établi · mallette outils", icon: "tool" },
      { labId: L, name: "Colle blanche 500 ml", category: "consommable", unit: "bouteille", quantity: 3, minQuantity: 2, location: "Étagère A · bac 2", supplier: "Quincaillerie Nassablé", icon: "boxes" },
    ])
    .returning({ id: stockItems.id, quantity: stockItems.quantity });
  await db.insert(stockMovements).values(stockRows.map((s) => ({ labId: L, itemId: s.id, userId: hugo.id, delta: s.quantity, type: "entree", note: "Stock initial du lab" })));

  // Suivi pédagogique de démonstration : une note et une observation par élève de démonstration.
  await db.insert(grades).values([
    { labId: L, userId: awa.id, label: "Impression 3D — qualité de finition", kind: "note", score: 17, maxScore: 20, gradedAt: new Date(Date.now() - 21 * 86400000), comment: "Très bon calage, reprise sur le support", createdBy: hugo.id },
    { labId: L, userId: awa.id, label: "Découpe laser — sécurité & réglages", kind: "note", score: 15, maxScore: 20, gradedAt: new Date(Date.now() - 14 * 86400000), comment: "Sécurité maîtrisée, paramètres à consolider", createdBy: hugo.id },
    { labId: L, userId: awa.id, label: "Esprit d'équipe en atelier", kind: "observation", score: null, maxScore: 20, gradedAt: new Date(Date.now() - 7 * 86400000), comment: "Aide régulièrement ses camarades", createdBy: hugo.id },
    { labId: L, userId: afi.id, label: "Initiation électronique — soudure", kind: "note", score: 13, maxScore: 20, gradedAt: new Date(Date.now() - 10 * 86400000), comment: "Cordon de soudure propre à améliorer", createdBy: hugo.id },
    { labId: L, userId: kossi.id, label: "Atelier découpage — assiduité", kind: "note", score: 11, maxScore: 20, gradedAt: new Date(Date.now() - 5 * 86400000), comment: "Peut faire mieux sur la planification", createdBy: hugo.id },
  ]);

  const maint = nextOpen(today, 6);
  await db.insert(projects).values([
    { labId: L, title: "Prototypes imprimés en 3D", description: "Engrenages, supports et un petit robot Arduino conçus et imprimés par les élèves.", authors: "Club robotique", classLevel: "Tle", machines: "Imprimante 3D, Kits Arduino", imageUrl: "/images/real-1.jpg", published: true },
    { labId: L, title: "Carte du Togo découpée au laser", description: "Contreplaqué 3 mm gravé avec les cinq régions du Togo.", authors: "Awa Lare", classLevel: "Tle", machines: "Découpeuse laser CO2", imageUrl: "/images/real-2.jpg", published: true },
    { labId: L, title: "Atelier électronique", description: "Initiation à la soudure et premiers circuits LED.", authors: "Classes de 4e et 3e", classLevel: "3e", machines: "Postes de soudure", imageUrl: "/images/real-3.jpg", published: true },
  ]);

  await db.insert(closures).values([
    { labId: L, resourceId: cnc.id, startAt: at(maint, 0, 8), endAt: at(maint, 0, 18), reason: "Maintenance annuelle de la fraiseuse CNC" },
  ]);
}
