import { cache } from "react";
import { and, asc, count, eq, ne, sql } from "drizzle-orm";
import { db } from "@/db";
import { labs, projects, resources, users, type Lab } from "@/db/schema";
import { mediaUrl } from "@/lib/media-url";

export const getLab = cache(async (id: number): Promise<Lab | null> => {
  const [l] = await db.select().from(labs).where(eq(labs.id, id)).limit(1);
  return l ?? null;
});

export async function getLabBySlug(slug: string): Promise<Lab | null> {
  const [l] = await db.select().from(labs).where(and(eq(labs.slug, slug), eq(labs.active, true))).limit(1);
  return l ?? null;
}

export async function isLabActive(labId: number | null) {
  if (!labId) return false;
  const [lab] = await db.select({ active: labs.active }).from(labs).where(eq(labs.id, labId)).limit(1);
  return lab?.active ?? false;
}

export function labBrand(lab: Lab) {
  return { id: lab.id, name: lab.name, slug: lab.slug, school: lab.schoolName, logoUrl: mediaUrl(lab.logoId) };
}

export async function listLabs() {
  const rows = await db.select().from(labs).where(eq(labs.active, true)).orderBy(asc(labs.createdAt));
  return Promise.all(
    rows.map(async (l) => {
      const [[{ m }], [{ s }], [{ p }]] = await Promise.all([
        db.select({ m: count() }).from(resources).where(and(eq(resources.labId, l.id), eq(resources.type, "machine"), ne(resources.status, "desactivee"))),
        db.select({ s: count() }).from(users).where(and(eq(users.labId, l.id), eq(users.role, "student"))),
        db.select({ p: count() }).from(projects).where(and(eq(projects.labId, l.id), eq(projects.published, true))),
      ]);
      return { ...l, machines: m, students: s, projects: p };
    }),
  );
}

export function slugify(input: string) {
  return (
    input
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48) || "fablab"
  );
}

export async function uniqueSlug(base: string) {
  const root = slugify(base);
  let slug = root;
  for (let i = 2; ; i++) {
    const [hit] = await db.select({ id: labs.id }).from(labs).where(eq(labs.slug, slug)).limit(1);
    if (!hit) return slug;
    slug = `${root}-${i}`;
  }
}

export async function uniqueUsername(base: string) {
  const root = base
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, "")
    .replace(/^[._-]+|[._-]+$/g, "")
    .slice(0, 24) || "user";
  let username = root;
  for (let i = 2; ; i++) {
    const [hit] = await db.select({ id: users.id }).from(users).where(eq(sql`lower(${users.username})`, username)).limit(1);
    if (!hit) return username;
    username = `${root}${i}`;
  }
}
