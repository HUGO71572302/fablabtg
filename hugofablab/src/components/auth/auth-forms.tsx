"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { AlertCircle, CheckCircle2, Eye, EyeOff, Loader2 } from "lucide-react";
import { loginAction, registerMemberAction, type ActionState } from "@/actions/auth";
import { Button, Input, Label, Select, cn } from "@/components/ui";
import { CLASS_LEVELS } from "@/lib/labels";

export function Alert({ state }: { state: ActionState }) {
  if (!state?.error && !state?.success) return null;
  const ok = Boolean(state?.success);
  return (
    <div
      className={cn(
        "flex items-start gap-2 rounded-xl px-3 py-2.5 text-base",
        ok ? "bg-togo-green/10 text-togo-green dark:text-emerald-300" : "bg-togo-red/10 text-togo-red dark:text-red-300",
      )}
    >
      {ok ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> : <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />}
      <span>{state?.success ?? state?.error}</span>
    </div>
  );
}

export function SecretInput({
  name,
  placeholder,
  autoComplete,
  pin = false,
  minLength,
}: {
  name: string;
  placeholder?: string;
  autoComplete?: string;
  pin?: boolean;
  minLength?: number;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Input
        id={name}
        name={name}
        type={show ? "text" : "password"}
        placeholder={placeholder}
        autoComplete={autoComplete}
        required
        minLength={minLength}
        inputMode={pin ? "numeric" : undefined}
        pattern={pin ? "[0-9]{4,6}" : undefined}
        maxLength={pin ? 6 : undefined}
        className={cn("pr-11", pin && "tracking-[0.4em]")}
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-muted-foreground"
        aria-label={show ? "Masquer" : "Afficher"}
      >
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}

function GoogleButton() {
  return (
    <a href="/api/auth/google" className="flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-border bg-card text-base font-medium hover:bg-muted">
      <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
        <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.2 1.3-1.6 3.8-5.5 3.8-3.3 0-6-2.7-6-6.1s2.7-6.1 6-6.1c1.9 0 3.1.8 3.9 1.5l2.6-2.6C16.9 3.1 14.7 2 12 2 6.5 2 2 6.5 2 12s4.5 10 10 10c5.8 0 9.6-4.1 9.6-9.8 0-.7-.1-1.2-.2-1.7H12z" />
      </svg>
      Responsable : continuer avec Google
    </a>
  );
}

export function LoginForm({ googleEnabled }: { googleEnabled: boolean }) {
  const [state, action, pending] = useActionState(loginAction, null);
  return (
    <form action={action} className="space-y-4">
      <Alert state={state} />
      <div>
        <Label htmlFor="identifier">Identifiant, e-mail ou téléphone</Label>
        <Input
          id="identifier"
          name="identifier"
          autoComplete="username"
          autoCapitalize="none"
          placeholder="Élève / externe : identifiant ou tél · Responsable : e-mail"
          required
        />
      </div>
      <div>
        <Label htmlFor="secret">Code PIN ou mot de passe</Label>
        <SecretInput
          name="secret"
          autoComplete="current-password"
          placeholder="Élève / externe : code PIN · Responsable : mot de passe"
        />
        <p className="mt-1 text-sm text-muted-foreground">
          Élève ou membre externe ayant oublié son PIN ? Le responsable de votre lab peut vous en générer un nouveau.
        </p>
      </div>
      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Se connecter
      </Button>
      {googleEnabled && <GoogleButton />}
      <p className="text-center text-sm text-muted-foreground">
        Responsable ? <Link href="/recuperer-mot-de-passe" className="font-semibold text-togo-green hover:underline dark:text-emerald-300">Mot de passe oublié</Link>
      </p>
      <div className="grid gap-2 text-center text-base text-muted-foreground sm:grid-cols-2">
        <Link href="/register" className="rounded-xl border border-border px-3 py-2 font-semibold text-togo-green hover:bg-muted dark:text-emerald-300">
          Élève / externe : créer un compte
        </Link>
        <Link href="/creer-mon-lab" className="rounded-xl border border-border px-3 py-2 font-semibold hover:bg-muted">
          Responsable : créer mon lab
        </Link>
      </div>
    </form>
  );
}

function suggestUsername(name: string) {
  const parts = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z\s]/g, "")
    .split(/\s+/)
    .filter(Boolean);
  if (!parts.length) return "";
  return parts.length === 1 ? parts[0] : `${parts[0]}.${parts[parts.length - 1]}`;
}

export function MemberRegisterForm({ labs, defaultLabId }: { labs: { id: number; name: string; school: string }[]; defaultLabId?: number }) {
  const [state, action, pending] = useActionState(registerMemberAction, null);
  const [accountType, setAccountType] = useState<"student" | "external">("student");
  const [username, setUsername] = useState("");
  const [touched, setTouched] = useState(false);
  return (
    <form action={action} className="space-y-4">
      <Alert state={state} />
      <div>
        <Label htmlFor="labId">Mon établissement / FabLab</Label>
        <Select id="labId" name="labId" defaultValue={defaultLabId ?? labs[0]?.id} required>
          {labs.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name} — {l.school}
            </option>
          ))}
        </Select>
      </div>
      <div>
        <Label htmlFor="accountType">Type de compte</Label>
        <Select id="accountType" name="accountType" value={accountType} onChange={(e) => setAccountType(e.target.value as "student" | "external")}>
          <option value="student">Élève</option>
          <option value="external">Utilisateur externe (non élève)</option>
        </Select>
        <p className="mt-1 text-sm text-muted-foreground">Un compte externe n’a pas de classe ni de suivi pédagogique. Le responsable doit l’activer avant la première connexion.</p>
      </div>
      <div>
        <Label htmlFor="name">Nom et prénom</Label>
        <Input
          id="name"
          name="name"
          autoComplete="name"
          placeholder="Prénom NOM"
          required
          minLength={2}
          onChange={(e) => {
            if (!touched) setUsername(suggestUsername(e.target.value));
          }}
        />
      </div>
      {accountType === "student" ? (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="classLevel">Classe</Label>
            <Select id="classLevel" name="classLevel" required defaultValue="">
              <option value="" disabled>Choisir…</option>
              {CLASS_LEVELS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </Select>
          </div>
          <div>
            <Label htmlFor="section">Série / groupe (optionnel)</Label>
            <Input id="section" name="section" placeholder="ex. D, C1, A4, B" maxLength={20} />
          </div>
        </div>
      ) : (
        <div>
          <Label htmlFor="organisation">Organisation / structure (facultatif)</Label>
          <Input id="organisation" name="organisation" placeholder="ex. Association, entreprise, indépendant" maxLength={80} />
        </div>
      )}
      <div>
        <Label htmlFor="username">Identifiant (pour se connecter)</Label>
        <Input
          id="username"
          name="username"
          autoCapitalize="none"
          autoComplete="username"
          placeholder="ex. awa.lare"
          required
          pattern="[a-z0-9][a-z0-9._\-]{2,29}"
          value={username}
          onChange={(e) => {
            setTouched(true);
            setUsername(e.target.value.toLowerCase().replace(/\s+/g, ""));
          }}
        />
        <p className="mt-1 text-sm text-muted-foreground">Lettres minuscules, chiffres, point ou tiret. Notez-le bien !</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="pin">Code PIN (4 à 6 chiffres)</Label>
          <SecretInput name="pin" pin autoComplete="new-password" placeholder="••••" />
        </div>
        <div>
          <Label htmlFor="pinConfirm">Confirmer le PIN</Label>
          <SecretInput name="pinConfirm" pin autoComplete="new-password" placeholder="••••" />
        </div>
      </div>
      <div>
        <Label htmlFor="phone">Numéro de téléphone</Label>
        <Input id="phone" name="phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="90 00 00 00" required />
        <p className="mt-1 text-sm text-muted-foreground">{accountType === "student" ? "Le vôtre ou celui d'un parent : il permet au responsable de vous joindre." : "Il permet au responsable du FabLab de vous joindre."}</p>
      </div>
      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Créer mon compte {accountType === "student" ? "élève" : "externe"}
      </Button>
      <p className="text-center text-base text-muted-foreground">
        Déjà inscrit ?{" "}
        <Link href="/login" className="font-semibold text-togo-green underline-offset-2 hover:underline dark:text-emerald-300">
          Se connecter
        </Link>
      </p>
    </form>
  );
}
