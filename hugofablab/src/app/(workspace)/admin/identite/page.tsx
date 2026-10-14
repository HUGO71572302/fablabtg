import type { Metadata } from "next";
import Link from "next/link";
import { ExternalLink, KeyRound, Save, Share2 } from "lucide-react";
import { saveLabIdentityAction } from "@/actions/labs";
import { Badge, Card, CardContent, CardHeader, Input, Label, PageHeader, Textarea, buttonClass } from "@/components/ui";
import { DeactivateLabControl } from "@/components/admin/deactivate-lab-control";
import { CopyField } from "@/components/ui/copy-field";
import { ImageInput } from "@/components/ui/image-input";
import { requireAdmin } from "@/lib/auth";
import { getLab } from "@/lib/labs";
import { mediaUrl } from "@/lib/media-url";
import { googleOAuthConfigServer, publicOrigin } from "@/lib/origin";

export const metadata: Metadata = { title: "Identité du lab" };
export const dynamic = "force-dynamic";

export default async function LabIdentityPage({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string; reactivated?: string }> }) {
  const admin = await requireAdmin();
  const { saved, error, reactivated } = await searchParams;
  const lab = (await getLab(admin.labId))!;
  const origin = await publicOrigin();
  const signupLink = `${origin}/register?lab=${lab.slug}`;
  const googleConfig = await googleOAuthConfigServer();
  const googleConfigured = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
  const pinnedRedirect = Boolean(process.env.GOOGLE_REDIRECT_URI?.trim());
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader
        title="Identité du lab"
        subtitle="Nom, logo, photos et présentation affichés sur la vitrine publique de votre FabLab."
        action={
          <Link href={`/lab/${lab.slug}`} target="_blank" className={buttonClass("outline", "md")}>
            <ExternalLink className="h-4 w-4" /> Voir la vitrine
          </Link>
        }
      />
      {saved && <p className="rounded-xl bg-togo-green/10 px-4 py-2 text-base text-togo-green dark:text-emerald-300">✅ Identité du lab enregistrée.</p>}
      {reactivated && <p className="rounded-xl bg-togo-green/10 px-4 py-2 text-base text-togo-green dark:text-emerald-300">✅ Votre lab est de nouveau actif.</p>}
      {error && (
        <p className="rounded-xl bg-togo-red/10 px-4 py-2 text-base text-togo-red">
          ❌ {error === "image" ? "Une image n'a pas pu être lue (JPG/PNG/WebP, 10 Mo max)." : "Le nom du lab et de l'établissement sont obligatoires."}
        </p>
      )}

      <Card>
        <CardHeader title={<span className="flex items-center gap-2"><Share2 className="h-4 w-4" /> Lien d&apos;inscription pour vos élèves</span>} subtitle="Partagez-le (WhatsApp, affiche, QR code) : votre lab sera présélectionné." />
        <CardContent>
          <code className="block select-all break-all rounded-xl border border-border bg-muted px-3 py-2 text-base">{signupLink}</code>
        </CardContent>
      </Card>

      <Card>
        <CardHeader
          title={
            <span className="flex items-center gap-2">
              <KeyRound className="h-4 w-4" /> Connexion Google
              {googleConfigured ? <Badge tone="green">Configurée</Badge> : <Badge tone="yellow">À compléter</Badge>}
            </span>
          }
          subtitle="À enregistrer dans Google Cloud Console → Identifiants → votre client OAuth Web."
        />
        <CardContent className="space-y-4">
          <CopyField
            label="URI de redirection autorisée"
            value={googleConfig.redirectUri}
            hint="Collez cette adresse exacte dans « Authorized redirect URIs »."
          />
          <CopyField
            label="Origine JavaScript autorisée"
            value={googleConfig.jsOrigin}
            hint="Collez cette adresse dans « Authorized JavaScript origins »."
          />
          {!googleConfigured && (
            <p className="rounded-xl bg-togo-yellow/10 px-3 py-2 text-sm text-foreground">
              Ajoutez ensuite vos variables <code>GOOGLE_CLIENT_ID</code> et <code>GOOGLE_CLIENT_SECRET</code>. En cas d&apos;erreur
              « redirect_uri_mismatch », vérifiez que l&apos;URI ci-dessus est exactement celle enregistrée (elle suit l&apos;adresse de l&apos;aperçu).
            </p>
          )}
          {pinnedRedirect && (
            <p className="rounded-xl bg-togo-green/10 px-3 py-2 text-sm text-togo-green dark:text-emerald-300">
              URI figée via <code>GOOGLE_REDIRECT_URI</code> — utilisable avec un domaine stable.
            </p>
          )}
        </CardContent>
      </Card>

      <form action={saveLabIdentityAction} className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Informations" />
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="labName">Nom du FabLab</Label>
                <Input id="labName" name="labName" defaultValue={lab.name} required />
              </div>
              <div>
                <Label htmlFor="schoolName">Établissement</Label>
                <Input id="schoolName" name="schoolName" defaultValue={lab.schoolName} required />
              </div>
              <div>
                <Label htmlFor="city">Ville</Label>
                <Input id="city" name="city" defaultValue={lab.city ?? ""} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="region">Région</Label>
                  <Input id="region" name="region" defaultValue={lab.region ?? ""} />
                </div>
                <div>
                  <Label htmlFor="country">Pays</Label>
                  <Input id="country" name="country" defaultValue={lab.country} />
                </div>
              </div>
              <div>
                <Label htmlFor="contactEmail">E-mail de contact</Label>
                <Input id="contactEmail" name="contactEmail" type="email" defaultValue={lab.contactEmail ?? ""} />
              </div>
              <div>
                <Label htmlFor="contactPhone">Téléphone de contact</Label>
                <Input id="contactPhone" name="contactPhone" defaultValue={lab.contactPhone ?? ""} />
              </div>
            </div>
            <div>
              <Label htmlFor="motto">Devise / slogan</Label>
              <Input id="motto" name="motto" defaultValue={lab.motto ?? ""} maxLength={120} />
            </div>
            <div>
              <Label htmlFor="description">Présentation</Label>
              <Textarea id="description" name="description" defaultValue={lab.description ?? ""} className="min-h-[120px]" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader title="Images" subtitle="Laissez vide pour conserver l'image actuelle." />
          <CardContent className="space-y-4">
            <ImageInput name="logo" label="Logo" aspect="aspect-square" current={mediaUrl(lab.logoId)} />
            <ImageInput name="cover" label="Couverture" current={mediaUrl(lab.coverId, "/images/workshop.jpg")} />
            <ImageInput name="managerPhoto" label="Photo du responsable" aspect="aspect-[3/4]" current={mediaUrl(lab.managerPhotoId)} />
          </CardContent>
        </Card>
        <div className="lg:col-span-3">
          <button type="submit" className={buttonClass("primary", "lg")}>
            <Save className="h-4 w-4" /> Enregistrer l&apos;identité du lab
          </button>
        </div>
      </form>
      <Card className="border-togo-red/30">
        <CardHeader title="Mettre le lab en pause" subtitle="Le lab et toutes ses données seront conservés. Les élèves ne pourront plus y accéder tant que vous ne l&apos;aurez pas réactivé." />
        <CardContent><DeactivateLabControl labName={lab.name} /></CardContent>
      </Card>
    </div>
  );
}
