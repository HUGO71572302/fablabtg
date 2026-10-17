"use client";

import { useActionState } from "react";
import { KeyRound, Loader2, Save } from "lucide-react";
import { updateManagerProfileAction } from "@/actions/labs";
import type { ActionState } from "@/actions/auth";
import { Alert } from "@/components/auth/auth-forms";
import { Button, Input, Label } from "@/components/ui";

export function ManagerProfileForm({ profile }: { profile: { name: string; username: string | null; phone: string | null; email: string | null } }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(updateManagerProfileAction, null);

  return (
    <form action={action} className="space-y-4">
      <Alert state={state} />
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="manager-name">Nom affiché</Label>
          <Input id="manager-name" name="name" defaultValue={profile.name} required minLength={2} maxLength={100} autoComplete="name" />
        </div>
        <div>
          <Label htmlFor="manager-username">Identifiant de connexion</Label>
          <Input id="manager-username" name="username" defaultValue={profile.username ?? ""} required minLength={3} maxLength={30} pattern="[a-z0-9][a-z0-9._-]{2,29}" autoComplete="username" />
        </div>
        <div>
          <Label htmlFor="manager-phone">Téléphone</Label>
          <Input id="manager-phone" name="phone" type="tel" defaultValue={profile.phone ?? ""} maxLength={30} autoComplete="tel" />
        </div>
        <div>
          <Label htmlFor="manager-email">E-mail du compte</Label>
          <Input id="manager-email" value={profile.email ?? "Non renseigné"} readOnly aria-describedby="manager-email-hint" />
          <p id="manager-email-hint" className="mt-1 text-xs text-muted-foreground">L’e-mail reste lié à la connexion Google et aux droits du responsable de plateforme.</p>
        </div>
      </div>

      <div className="rounded-xl border border-border p-4">
        <h3 className="flex items-center gap-2 text-sm font-bold"><KeyRound className="h-4 w-4" /> Changer le mot de passe <span className="font-normal text-muted-foreground">(facultatif)</span></h3>
        <p className="mt-1 text-xs text-muted-foreground">Laissez ces champs vides si vous souhaitez seulement modifier vos informations.</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <div>
            <Label htmlFor="manager-current-password">Mot de passe actuel</Label>
            <Input id="manager-current-password" name="currentPassword" type="password" autoComplete="current-password" />
          </div>
          <div>
            <Label htmlFor="manager-new-password">Nouveau mot de passe</Label>
            <Input id="manager-new-password" name="newPassword" type="password" autoComplete="new-password" maxLength={256} />
          </div>
          <div>
            <Label htmlFor="manager-confirm-password">Confirmer le nouveau mot de passe</Label>
            <Input id="manager-confirm-password" name="confirmPassword" type="password" autoComplete="new-password" maxLength={256} />
          </div>
        </div>
      </div>

      <Button type="submit" disabled={pending}>
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
        Enregistrer mon profil
      </Button>
    </form>
  );
}
