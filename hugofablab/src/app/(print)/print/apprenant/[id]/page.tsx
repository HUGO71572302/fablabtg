import type { Metadata } from "next";
import type React from "react";
import { notFound } from "next/navigation";
import { asc, desc, eq, ilike, or } from "drizzle-orm";
import { PrintBar } from "@/components/print/print-bar";
import { PrintHeader, PrintSection, PrintSignatures } from "@/components/print/print-parts";
import { ContactButtons } from "@/components/ui/contact";
import { db } from "@/db";
import { projects, reservations, resources, stockItems, stockMovements, userSkills, users } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { fmtDate, fmtDateCompact, fmtTime } from "@/lib/dates";
import { CLASS_LABEL, LEVEL_LABEL, STATUS_LABEL, classLabel } from "@/lib/labels";
import { getLab } from "@/lib/labs";
import { assignSheetNumber, classRank, gradesStats, listGrades } from "@/lib/pedagogy";

export const metadata: Metadata = { title: "Fiche de suivi de l'apprenant" };
export const dynamic = "force-dynamic";

export default async function PrintLearnerSheet({ params }: { params: Promise<{ id: string }> }) {
  const current = await requireUser();
  const { id } = await params;
  const [student] = await db.select().from(users).where(eq(users.id, Number(id))).limit(1);
  if (!student || student.labId == null) notFound();
  const isSelf = current.id === student.id;
  const isManager = current.role === "fabmanager" && current.labId === student.labId;
  if (!isSelf && !isManager) notFound();

  const lab = (await getLab(student.labId))!;
  const sheetNumber = await assignSheetNumber(student);
  const [rank, stats, gradeRows] = await Promise.all([classRank(student), gradesStats(student.id), listGrades(student.id)]);
  const firstName = student.name.split(" ")[0];
  const [reservationRows, skills, projectsList, movements] = await Promise.all([
    db.select({ id: reservations.id, startAt: reservations.startAt, endAt: reservations.endAt, status: reservations.status, purpose: reservations.purpose, resourceName: resources.name }).from(reservations).innerJoin(resources, eq(reservations.resourceId, resources.id)).where(eq(reservations.userId, student.id)).orderBy(desc(reservations.startAt)).limit(60),
    db.select({ id: userSkills.id, level: userSkills.level, resourceName: resources.name }).from(userSkills).innerJoin(resources, eq(userSkills.resourceId, resources.id)).where(eq(userSkills.userId, student.id)).orderBy(asc(resources.name)),
    db.select({ id: projects.id, title: projects.title, classLevel: projects.classLevel, machines: projects.machines, published: projects.published, createdAt: projects.createdAt }).from(projects).where(eq(projects.submittedBy, student.id)).orderBy(desc(projects.createdAt)).limit(30),
    db.select({ id: stockMovements.id, createdAt: stockMovements.createdAt, note: stockMovements.note, userName: users.name, itemName: stockItems.name }).from(stockMovements).innerJoin(stockItems, eq(stockMovements.itemId, stockItems.id)).leftJoin(users, eq(stockMovements.userId, users.id)).where(or(eq(stockMovements.userId, student.id), ilike(stockMovements.beneficiary, `%${student.name}%`), ilike(stockMovements.beneficiary, `%${firstName}%`))).orderBy(desc(stockMovements.createdAt)).limit(60),
  ]);
  const confirmed = reservationRows.filter((r) => r.status === "confirmee").length;
  const active = reservationRows.filter((r) => r.status === "confirmee" || r.status === "en_attente").length;
  const backHref = isSelf ? "/app/profil" : "/admin/utilisateurs";
  const rankText = rank ? `Classe ${rank.code} · fiche ${rank.rank} sur ${rank.total}` : "Fiche individuelle";
  const identity = [
    ["Classe / série", student.classLevel ? classLabel(student.classLevel, student.organisation) : student.organisation ?? "—"],
    ["Niveau d'autonomie", LEVEL_LABEL[student.autonomyLevel]],
    ["N° de fiche", sheetNumber ?? "—"],
    ["Identifiant", student.username ?? "—"],
  ];

  return (
    <main className="print-screen">
      <PrintBar backHref={backHref} label="Imprimer la fiche" />
      <article className="print-sheet print-learner-sheet">
        <PrintHeader lab={lab} title="Fiche de suivi de l'apprenant" reference={sheetNumber ?? "SANS N°"} subtitle={`${rankText} · éditée le ${fmtDate(new Date())}`} />

        <PrintSection title="Identité de l'apprenant">
          <div className="print-identity">
            <div className="print-identity-main">
              <h2 className="print-person-name">{student.name}</h2>
              <dl className="print-kv-grid">{identity.map(([k, v]) => <div key={k} className="print-kv"><dt>{k}</dt><dd>{v}</dd></div>)}</dl>
            </div>
            <div className="print-contact">
              <p className="print-kicker">Contact</p>
              {student.phone ? <p className="mt-1 text-[17px] font-bold">{student.phone}</p> : <p className="mt-1 text-[14px] text-[#4b5563]">Téléphone non renseigné</p>}
              {student.email && <p className="mt-1 break-all text-[12px] font-bold">{student.email}</p>}
              <p className="mt-2 text-[11px] text-[#4b5563]">Membre depuis le {fmtDate(student.createdAt)}</p>
              <span className="no-print mt-2 inline-block"><ContactButtons phone={student.phone} email={student.email} compact /></span>
            </div>
          </div>
        </PrintSection>

        <PrintSection title="Repères d'activité">
          <div className="print-metrics" style={{ "--metric-columns": 4 } as React.CSSProperties}>
            {[[reservationRows.length, "Réservations"], [confirmed, "Confirmées"], [active, "En cours"], [projectsList.length, "Projets"]].map(([n, l]) => <div key={l} className="print-metric"><p className="print-metric-value">{n}</p><p className="print-metric-label">{l}</p></div>)}
          </div>
        </PrintSection>

        <PrintSection title="Suivi pédagogique">
          <div className="print-metrics" style={{ "--metric-columns": 4 } as React.CSSProperties}>
            {[[stats.moyenne == null ? "—" : stats.moyenne.toFixed(1), "Moyenne / 20"], [String(stats.notes), "Notes"], [String(stats.observations), "Observations"], [stats.best == null ? "—" : stats.best.toFixed(1), "Meilleure note"]].map(([n, l]) => <div key={l} className="print-metric"><p className="print-metric-value">{n}</p><p className="print-metric-label">{l}</p></div>)}
          </div>
          <div className="print-table-wrap mt-3"><table className="print-table"><thead><tr><th>Date</th><th>Intitulé</th><th className="num">Note</th><th>Appréciation</th></tr></thead><tbody>
            {gradeRows.length === 0 && <tr><td colSpan={4} className="muted" style={{ textAlign: "center", padding: 24 }}>Aucune évaluation enregistrée.</td></tr>}
            {gradeRows.map((g) => <tr key={g.id}><td className="whitespace-nowrap">{fmtDateCompact(new Date(g.gradedAt))}</td><td><span className="strong">{g.label}</span>{g.author && <span className="muted"> · {g.author}</span>}</td><td className="num strong">{g.kind === "note" && g.score != null ? `${g.score}/${g.maxScore}` : "—"}</td><td>{g.comment ?? "—"}</td></tr>)}
          </tbody></table></div>
        </PrintSection>

        <PrintSection title={`Réservations · ${reservationRows.length}`}>
          <div className="print-table-wrap"><table className="print-table"><thead><tr><th>Date</th><th>Machine / salle</th><th>Créneau</th><th>Statut</th><th>Objet</th></tr></thead><tbody>
            {reservationRows.length === 0 && <tr><td colSpan={5} className="muted" style={{ textAlign: "center", padding: 24 }}>Aucune réservation.</td></tr>}
            {reservationRows.map((r) => <tr key={r.id}><td className="whitespace-nowrap">{fmtDateCompact(r.startAt)}</td><td className="strong">{r.resourceName}</td><td className="whitespace-nowrap">{fmtTime(r.startAt)} – {fmtTime(r.endAt)}</td><td>{STATUS_LABEL[r.status]}</td><td>{r.purpose ?? "—"}</td></tr>)}
          </tbody></table></div>
        </PrintSection>

        <PrintSection title={`Projets réalisés · ${projectsList.length}`}>
          <div className="print-table-wrap"><table className="print-table"><thead><tr><th>Titre</th><th>Classe</th><th>Machines</th><th>Publié</th><th>Le</th></tr></thead><tbody>
            {projectsList.length === 0 && <tr><td colSpan={5} className="muted" style={{ textAlign: "center", padding: 24 }}>Aucun projet soumis.</td></tr>}
            {projectsList.map((p) => <tr key={p.id}><td className="strong">{p.title}</td><td>{p.classLevel ? CLASS_LABEL[p.classLevel] ?? p.classLevel : "—"}</td><td>{p.machines ?? "—"}</td><td>{p.published ? "Oui" : "Non"}</td><td className="whitespace-nowrap">{fmtDateCompact(p.createdAt)}</td></tr>)}
          </tbody></table></div>
        </PrintSection>

        {(movements.length > 0 || skills.length > 0) && <PrintSection title="Participation à l'atelier">
          {movements.length > 0 && <div className="print-table-wrap"><table className="print-table"><thead><tr><th>Date</th><th>Matériel</th><th>Remarque</th><th>Par</th></tr></thead><tbody>{movements.map((m) => <tr key={m.id}><td className="whitespace-nowrap">{fmtDateCompact(m.createdAt)}</td><td>{m.itemName ?? "—"}</td><td>{m.note ?? "—"}</td><td>{m.userName ?? "—"}</td></tr>)}</tbody></table></div>}
          {skills.length > 0 && <div className={movements.length > 0 ? "mt-4 print-table-wrap" : "print-table-wrap"}><table className="print-table"><thead><tr><th>Machine</th><th>Niveau acquis</th></tr></thead><tbody>{skills.map((s) => <tr key={s.id}><td>{s.resourceName}</td><td className="strong">{LEVEL_LABEL[s.level]}</td></tr>)}</tbody></table></div>}
        </PrintSection>}

        <PrintSignatures labels={["L'apprenant", "Le responsable du FabLab"]} />
        <p className="print-footnote">Document généré par {lab.name} · {lab.schoolName}. Cette fiche récapitule les éléments enregistrés dans le système à sa date d'édition.</p>
      </article>
    </main>
  );
}
