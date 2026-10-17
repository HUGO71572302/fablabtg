import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { labs } from "@/db/schema";
import { AuthCard } from "@/components/layout/auth-card";
import { MemberRegisterForm } from "@/components/auth/auth-forms";
import { buttonClass } from "@/components/ui";
import { getCurrentUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Inscription au FabLab" };
export const dynamic = "force-dynamic";

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ lab?: string }> }) {
  const user = await getCurrentUser();
  if (user) redirect(user.role === "fabmanager" ? "/admin" : "/app");
  const { lab } = await searchParams;
  const list = await db.select({ id: labs.id, name: labs.name, school: labs.schoolName, slug: labs.slug }).from(labs).where(eq(labs.active, true)).orderBy(asc(labs.name));
  const preset = list.find((l) => l.slug === lab)?.id;
  return (
    <AuthCard title="Rejoindre un FabLab" subtitle="Créez un compte élève ou externe avec un identifiant, un code PIN et un numéro de téléphone. Aucun e-mail n'est demandé.">
      {list.length ? (
        <MemberRegisterForm labs={list} defaultLabId={preset} />
      ) : (
        <div className="space-y-3 text-base">
          <p>Aucun FabLab n&apos;est encore inscrit. Le responsable de votre établissement doit d&apos;abord créer le lab.</p>
          <Link href="/creer-mon-lab" className={buttonClass("primary", "md")}>
            Créer le lab de mon école
          </Link>
        </div>
      )}
    </AuthCard>
  );
}
