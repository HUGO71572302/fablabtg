"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { registerLabAction } from "@/actions/labs";
import { Alert, SecretInput } from "@/components/auth/auth-forms";
import { ImageInput } from "@/components/ui/image-input";
import { Button, Input, Label, Textarea } from "@/components/ui";

export function LabSignupForm({ requireCode }: { requireCode: boolean }) {
  const [state, action, pending] = useActionState(registerLabAction, null);
  return (
    <form action={action} className="space-y-6">
      <Alert state={state} />
      <fieldset className="space-y-4">
        <legend className="mb-2 text-base font-bold uppercase tracking-wide text-togo-green dark:text-emerald-300">1 · Identité de votre FabLab</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="labName">Nom du FabLab</Label>
            <Input id="labName" name="labName" required placeholder="ex. FabLab Kara Innov" />
          </div>
          <div>
            <Label htmlFor="schoolName">Établissement</Label>
            <Input id="schoolName" name="schoolName" required placeholder="ex. Lycée de Tomdè" />
          </div>
          <div>
            <Label htmlFor="city">Ville</Label>
            <Input id="city" name="city" placeholder="ex. Kara" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="region">Région</Label>
              <Input id="region" name="region" placeholder="ex. Kara" />
            </div>
            <div>
              <Label htmlFor="country">Pays</Label>
              <Input id="country" name="country" defaultValue="Togo" />
            </div>
          </div>
        </div>
        <div>
          <Label htmlFor="motto">Devise / slogan</Label>
          <Input id="motto" name="motto" placeholder="ex. Apprendre en fabriquant" maxLength={120} />
        </div>
        <div>
          <Label htmlFor="description">Présentation du lab</Label>
          <Textarea id="description" name="description" placeholder="Ce que les élèves peuvent y faire, les clubs, les horaires…" />
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <ImageInput name="logo" label="Logo" aspect="aspect-square" hint="Carré, fond clair de préférence" />
          <div className="sm:col-span-2">
            <ImageInput name="cover" label="Photo de couverture" hint="Une belle photo de votre atelier et de ses machines" />
          </div>
        </div>
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="mb-2 text-base font-bold uppercase tracking-wide text-togo-green dark:text-emerald-300">2 · Vous, responsable du lab</legend>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-4 sm:col-span-2">
            <div>
              <Label htmlFor="managerName">Nom complet</Label>
              <Input id="managerName" name="managerName" required autoComplete="name" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="email">E-mail (votre identifiant)</Label>
                <Input id="email" name="email" type="email" required autoComplete="email" />
              </div>
              <div>
                <Label htmlFor="phone">Téléphone</Label>
                <Input id="phone" name="phone" type="tel" required autoComplete="tel" placeholder="90 00 00 00" />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="password">Mot de passe (8 caractères min.)</Label>
                <SecretInput name="password" autoComplete="new-password" minLength={8} />
              </div>
              <div>
                <Label htmlFor="confirm">Confirmer</Label>
                <SecretInput name="confirm" autoComplete="new-password" minLength={8} />
              </div>
            </div>
          </div>
          <ImageInput name="managerPhoto" label="Votre photo (optionnel)" aspect="aspect-[3/4]" />
        </div>
        {requireCode && (
          <div>
            <Label htmlFor="creationCode">Code d'autorisation</Label>
            <Input id="creationCode" name="creationCode" required placeholder="Fourni par l'administrateur de la plateforme" />
          </div>
        )}
      </fieldset>

      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Créer mon FabLab
      </Button>
      <p className="text-center text-base text-muted-foreground">
        Vous avez déjà un lab ?{" "}
        <Link href="/login" className="font-semibold text-togo-green hover:underline dark:text-emerald-300">
          Se connecter
        </Link>
      </p>
    </form>
  );
}
