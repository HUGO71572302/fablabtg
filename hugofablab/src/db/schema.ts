import {
  boolean,
  index,
  integer,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";

// ---------- Enums ----------
export const roleEnum = pgEnum("user_role", ["student", "external", "fabmanager"]);
export const levelEnum = pgEnum("skill_level", ["debutant", "confirme", "expert"]);
export const resourceTypeEnum = pgEnum("resource_type", ["salle", "machine"]);
export const resourceStatusEnum = pgEnum("resource_status", ["disponible", "maintenance", "desactivee"]);
export const reservationStatusEnum = pgEnum("reservation_status", ["en_attente", "confirmee", "annulee"]);
export const notificationTypeEnum = pgEnum("notification_type", [
  "confirmee",
  "modifiee",
  "annulee",
  "en_attente",
  "liste_attente",
  "presence",
  "niveau",
  "info",
]);
export const waitlistStatusEnum = pgEnum("waitlist_status", ["active", "promue", "annulee"]);

// ---------- Tables ----------
export const labs = pgTable("labs", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  schoolName: text("school_name").notNull(),
  city: text("city"),
  region: text("region"),
  country: text("country").notNull().default("Togo"),
  description: text("description"),
  motto: text("motto"),
  logoId: integer("logo_id"),
  coverId: integer("cover_id"),
  managerPhotoId: integer("manager_photo_id"),
  contactEmail: text("contact_email"),
  contactPhone: text("contact_phone"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const media = pgTable("media", {
  id: serial("id").primaryKey(),
  labId: integer("lab_id").references(() => labs.id, { onDelete: "cascade" }),
  mime: text("mime").notNull(),
  data: text("data").notNull(),
  bytes: integer("bytes").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").unique(),
  username: text("username").unique(),
  labId: integer("lab_id").references(() => labs.id, { onDelete: "cascade" }),
  classLevel: text("class_level"),
  /** N° de fiche attribué à l'inscription dans la classe : 6E-A-003 (stable, propre à chaque classe). */
  sheetNumber: text("sheet_number"),
  passwordHash: text("password_hash"),
  role: roleEnum("role").notNull().default("student"),
  autonomyLevel: levelEnum("autonomy_level").notNull().default("debutant"),
  organisation: text("organisation"),
  phone: text("phone"),
  emailVerified: boolean("email_verified").notNull().default(false),
  verificationCode: text("verification_code"),
  active: boolean("active").notNull().default(true),
  googleId: text("google_id"),
  failedAttempts: integer("failed_attempts").notNull().default(0),
  lockedUntil: timestamp("locked_until", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/**
 * Abonnement du lab : essai gratuit de 30 jours à la création, puis accès payant.
 * `activeUntil` est défini par validation manuelle du paiement Mobile Money.
 */
export const labSubscriptions = pgTable(
  "lab_subscriptions",
  {
    id: serial("id").primaryKey(),
    labId: integer("lab_id")
      .notNull()
      .references(() => labs.id, { onDelete: "cascade" }),
    plan: text("plan").notNull().default("essentiel"),
    status: text("status").notNull().default("trial"), // trial | active | pending | expired | suspended
    trialStartedAt: timestamp("trial_started_at", { withTimezone: true }).notNull().defaultNow(),
    trialEndsAt: timestamp("trial_ends_at", { withTimezone: true }).notNull(),
    activeFrom: timestamp("active_from", { withTimezone: true }),
    activeUntil: timestamp("active_until", { withTimezone: true }),
    lastPaymentAt: timestamp("last_payment_at", { withTimezone: true }),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("lab_subscriptions_lab_unique").on(t.labId)],
);

/** Demande de paiement Mobile Money : preuve, référence opérateur et validation humaine. */
export const paymentRequests = pgTable(
  "payment_requests",
  {
    id: serial("id").primaryKey(),
    labId: integer("lab_id")
      .notNull()
      .references(() => labs.id, { onDelete: "cascade" }),
    requestedBy: integer("requested_by")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    plan: text("plan").notNull(),
    months: integer("months").notNull().default(1),
    amount: integer("amount").notNull(),
    provider: text("provider").notNull(), // tmoney | flooz | autre
    payerPhone: text("payer_phone"),
    transactionRef: text("transaction_ref").notNull(),
    proofId: integer("proof_id").references(() => media.id, { onDelete: "set null" }),
    status: text("status").notNull().default("pending"), // pending | approved | rejected
    reference: text("reference").notNull().unique(),
    adminNote: text("admin_note"),
    reviewedBy: integer("reviewed_by").references(() => users.id, { onDelete: "set null" }),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("payment_requests_lab_idx").on(t.labId, t.status, t.id)],
);

export const sessions = pgTable("sessions", {
  id: text("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const resources = pgTable("resources", {
  id: serial("id").primaryKey(),
  labId: integer("lab_id").references(() => labs.id, { onDelete: "cascade" }),
  photoId: integer("photo_id"),
  type: resourceTypeEnum("type").notNull(),
  name: text("name").notNull(),
  category: text("category").notNull().default("Général"),
  description: text("description"),
  status: resourceStatusEnum("status").notNull().default("disponible"),
  requiredLevel: levelEnum("required_level").notNull().default("debutant"),
  capacity: integer("capacity").notNull().default(1),
  maxDurationMinutes: integer("max_duration_minutes").notNull().default(120),
  roomId: integer("room_id").references((): AnyPgColumn => resources.id, { onDelete: "set null" }),
  icon: text("icon").notNull().default("wrench"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const reservations = pgTable(
  "reservations",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    resourceId: integer("resource_id")
      .notNull()
      .references(() => resources.id, { onDelete: "cascade" }),
    startAt: timestamp("start_at", { withTimezone: true }).notNull(),
    endAt: timestamp("end_at", { withTimezone: true }).notNull(),
    status: reservationStatusEnum("status").notNull().default("en_attente"),
    purpose: text("purpose"),
    adminNote: text("admin_note"),
    createdBy: integer("created_by").notNull(),
    modifiedBy: integer("modified_by"),
    qrToken: text("qr_token").notNull().unique(),
    clientRequestId: text("client_request_id").unique(),
    checkedInAt: timestamp("checked_in_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("reservations_resource_start_idx").on(t.resourceId, t.startAt),
    index("reservations_user_idx").on(t.userId),
  ],
);

export const notifications = pgTable(
  "notifications_log",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    reservationId: integer("reservation_id").references(() => reservations.id, { onDelete: "set null" }),
    type: notificationTypeEnum("type").notNull(),
    title: text("title").notNull(),
    message: text("message").notNull(),
    read: boolean("read").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("notifications_user_id_idx").on(t.userId, t.id)],
);

export const waitlist = pgTable("waitlist", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  resourceId: integer("resource_id")
    .notNull()
    .references(() => resources.id, { onDelete: "cascade" }),
  startAt: timestamp("start_at", { withTimezone: true }).notNull(),
  endAt: timestamp("end_at", { withTimezone: true }).notNull(),
  purpose: text("purpose"),
  status: waitlistStatusEnum("status").notNull().default("active"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const closures = pgTable("closures", {
  id: serial("id").primaryKey(),
  labId: integer("lab_id").references(() => labs.id, { onDelete: "cascade" }),
  resourceId: integer("resource_id").references(() => resources.id, { onDelete: "cascade" }),
  startAt: timestamp("start_at", { withTimezone: true }).notNull(),
  endAt: timestamp("end_at", { withTimezone: true }).notNull(),
  reason: text("reason").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const userSkills = pgTable(
  "user_skills",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    resourceId: integer("resource_id")
      .notNull()
      .references(() => resources.id, { onDelete: "cascade" }),
    level: levelEnum("level").notNull().default("debutant"),
    grantedBy: integer("granted_by"),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("user_skills_user_resource_idx").on(t.userId, t.resourceId)],
);

export const labSettings = pgTable("lab_settings", {
  id: serial("id").primaryKey(),
  labId: integer("lab_id").unique().references(() => labs.id, { onDelete: "cascade" }),
  openDays: text("open_days").notNull().default("1,2,3,4,5,6"),
  openTime: text("open_time").notNull().default("08:00"),
  closeTime: text("close_time").notNull().default("18:00"),
  slotStepMinutes: integer("slot_step_minutes").notNull().default(30),
  maxDurationMinutes: integer("max_duration_minutes").notNull().default(120),
  maxActiveReservations: integer("max_active_reservations").notNull().default(3),
  announcement: text("announcement"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/**
 * Suivi pédagogique d'un apprenant : notes (sur n) et observations.
 * Chaque ligne est tracée avec l'enseignant qui l'a saisie et la date de l'évaluation.
 */
export const grades = pgTable(
  "grades",
  {
    id: serial("id").primaryKey(),
    labId: integer("lab_id")
      .notNull()
      .references(() => labs.id, { onDelete: "cascade" }),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    label: text("label").notNull(),
    kind: text("kind").notNull().default("note"), // note | observation
    score: integer("score"),
    maxScore: integer("max_score").notNull().default(20),
    gradedAt: timestamp("graded_at", { withTimezone: true }).notNull().defaultNow(),
    comment: text("comment"),
    createdBy: integer("created_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("grades_user_idx").on(t.userId, t.id), index("grades_lab_idx").on(t.labId, t.id)],
);

export const projects = pgTable("projects", {
  id: serial("id").primaryKey(),
  labId: integer("lab_id")
    .notNull()
    .references(() => labs.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  authors: text("authors"),
  classLevel: text("class_level"),
  machines: text("machines"),
  photoId: integer("photo_id"),
  imageUrl: text("image_url"),
  submittedBy: integer("submitted_by").references(() => users.id, { onDelete: "set null" }),
  published: boolean("published").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ---------- Stock & matériel ----------
export const stockCategoryEnum = pgEnum("stock_category", ["consommable", "matiere", "piece", "outillage", "securite", "divers"]);

/** Un article du stock du lab : consommable, matière première, pièce, outillage, EPI… */
export const stockItems = pgTable(
  "stock_items",
  {
    id: serial("id").primaryKey(),
    labId: integer("lab_id")
      .notNull()
      .references(() => labs.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    category: stockCategoryEnum("category").notNull().default("consommable"),
    unit: text("unit").notNull().default("unité"),
    quantity: integer("quantity").notNull().default(0),
    minQuantity: integer("min_quantity").notNull().default(0),
    location: text("location"),
    supplier: text("supplier"),
    note: text("note"),
    photoId: integer("photo_id"),
    icon: text("icon").notNull().default("box"),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("stock_items_lab_idx").on(t.labId, t.category)],
);

/**
 * Journal des mouvements de stock : chaque entrée, sortie, perte ou ajustement est tracé
 * avec la personne à l'origine du mouvement. C'est ce journal qui rend le stock « suivi ».
 */
export const stockMovements = pgTable(
  "stock_movements",
  {
    id: serial("id").primaryKey(),
    labId: integer("lab_id")
      .notNull()
      .references(() => labs.id, { onDelete: "cascade" }),
    itemId: integer("item_id")
      .notNull()
      .references(() => stockItems.id, { onDelete: "cascade" }),
    userId: integer("user_id").references(() => users.id, { onDelete: "set null" }),
    delta: integer("delta").notNull(),
    /** Personne qui reçoit la sortie (élève, classe, atelier) — figure sur le reçu. */
    beneficiary: text("beneficiary"),
    type: text("type").notNull().default("ajustement"), // entree | sortie | perte | ajustement
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("stock_movements_item_idx").on(t.itemId, t.id), index("stock_movements_lab_idx").on(t.labId, t.id)],
);

// ---------- Types ----------
export type User = typeof users.$inferSelect;
export type Resource = typeof resources.$inferSelect;
export type Reservation = typeof reservations.$inferSelect;
export type Notification = typeof notifications.$inferSelect;
export type WaitlistEntry = typeof waitlist.$inferSelect;
export type Closure = typeof closures.$inferSelect;
export type UserSkill = typeof userSkills.$inferSelect;
export type LabSettings = typeof labSettings.$inferSelect;
export type Role = (typeof roleEnum.enumValues)[number];
export type Level = (typeof levelEnum.enumValues)[number];
export type ResourceStatus = (typeof resourceStatusEnum.enumValues)[number];
export type ReservationStatus = (typeof reservationStatusEnum.enumValues)[number];
export type NotificationType = (typeof notificationTypeEnum.enumValues)[number];
export type Lab = typeof labs.$inferSelect;
export type Project = typeof projects.$inferSelect;
export type Grade = typeof grades.$inferSelect;
export type LabSubscription = typeof labSubscriptions.$inferSelect;
export type PaymentRequest = typeof paymentRequests.$inferSelect;
export type StockItem = typeof stockItems.$inferSelect;
export type StockMovement = typeof stockMovements.$inferSelect;
export type StockCategory = (typeof stockCategoryEnum.enumValues)[number];
