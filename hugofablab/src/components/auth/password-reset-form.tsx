"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Loader2 } from "lucide-react";
import { resetManagerPasswordAction, type ActionState } from "@/actions/auth";
import { Alert } from "@/components/auth/auth-forms";
import { Button, Input, Label, buttonClass } from "@/components/ui";

export function PasswordResetForm() {
  const [state, action, pending] = useActionState<ActionState, FormData>(resetManagerPasswordAction, null);
  if (state?.success) {
    return <div className="space-y-4"><Alert state={state} /><Link href="/login" className={buttonClass("primary", "lg", "w-full")}>Retour à la connexion</Link></div>;
  }

  return (
    <form action={action} className="space-y-4">
      <Alert state={state} />
      <div>
        <Label htmlFor="reset-password">Nouveau mot de passe</Label>
        <Input id="reset-password" name="password" type="password" autoComplete="new-password" minLength={10} maxLength={256} required />
        <p className="mt-1 text-xs text-muted-foreground">10 caractères minimum, avec une minuscule, une majuscule et un chiffre.</p>
      </div>
      <div>
        <Label htmlFor="reset-confirm-password">Confirmer le nouveau mot de passe</Label>
        <Input id="reset-confirm-password" name="confirmPassword" type="password" autoComplete="new-password" minLength={10} maxLength={256} required />
      </div>
      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Enregistrer le nouveau mot de passe
      </Button>
    </form>
  );
}
