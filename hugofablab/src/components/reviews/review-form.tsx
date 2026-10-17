"use client";

import { useActionState, useState } from "react";
import { Loader2, Star } from "lucide-react";
import { submitReviewAction } from "@/actions/reviews";
import { Alert } from "@/components/auth/auth-forms";
import { Button, Textarea } from "@/components/ui";

export function ReviewForm({ initialRating = 5, initialMessage = "", isUpdate = false }: { initialRating?: number; initialMessage?: string; isUpdate?: boolean }) {
  const [state, action, pending] = useActionState(submitReviewAction, null);
  const [rating, setRating] = useState(Math.min(5, Math.max(1, initialRating)));
  return (
    <form action={action} className="space-y-4">
      <Alert state={state} />
      <fieldset>
        <legend className="mb-2 text-sm font-bold">Votre note</legend>
        <input type="hidden" name="rating" value={rating} />
        <div className="flex items-center gap-1" role="group" aria-label="Choisir une note de 1 à 5 étoiles">
          {[1, 2, 3, 4, 5].map((value) => (
            <button key={value} type="button" onClick={() => setRating(value)} aria-label={`${value} étoile${value > 1 ? "s" : ""}`} aria-pressed={rating === value} className="rounded-lg p-1.5 transition hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <Star className={`h-8 w-8 ${value <= rating ? "fill-amber-400 text-amber-500" : "text-muted-foreground/40"}`} />
            </button>
          ))}
          <span className="ml-2 text-sm font-semibold text-muted-foreground">{rating}/5</span>
        </div>
      </fieldset>
      <div>
        <label htmlFor="review-message" className="mb-2 block text-sm font-bold">Votre expérience au FabLab</label>
        <Textarea id="review-message" name="message" defaultValue={initialMessage} minLength={10} maxLength={1000} required placeholder="Qu’avez-vous aimé ? Que pourrions-nous améliorer ?" className="min-h-32" />
        <p className="mt-1 text-xs text-muted-foreground">10 caractères minimum. Votre nom apparaîtra avec l’avis après validation par le responsable.</p>
      </div>
      <Button type="submit" size="md" disabled={pending}>
        {pending && <Loader2 className="h-4 w-4 animate-spin" />}{isUpdate ? "Mettre à jour mon avis" : "Envoyer mon avis"}
      </Button>
    </form>
  );
}
