"use client";

import { useEffect, useId, useState, type ChangeEvent } from "react";
import { Camera, Expand, ImagePlus, Loader2 } from "lucide-react";
import { openImageViewer } from "@/components/system/image-viewer";
import { cn } from "@/components/ui";
import { compressImage } from "@/lib/image-compress";

const MAX_BYTES = 10 * 1024 * 1024;

/**
 * Sélecteur de photo : l'image est optimisée dans le navigateur (taille et format) puis remplacée
 * dans le champ, pour que le formulaire envoie toujours un fichier léger.
 */
export function ImageInput({ name, label, current, required = false, aspect = "aspect-video", hint }: {
  name: string;
  label: string;
  current?: string | null;
  required?: boolean;
  aspect?: string;
  hint?: string;
}) {
  const id = useId();
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const shown = preview ?? current ?? null;
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  async function onPick(e: ChangeEvent<HTMLInputElement>) {
    const input = e.currentTarget;
    const picked = input.files?.[0];
    if (!picked) return;
    setError("");
    if (!picked.type.startsWith("image/")) {
      setError("Ce fichier n'est pas une image. Choisissez une photo (JPG ou PNG).");
      input.value = "";
      return;
    }
    setBusy(true);
    const optimized = await compressImage(picked);
    setBusy(false);
    if (optimized.size > MAX_BYTES) {
      setError("Cette photo reste trop lourde, même optimisée. Essayez une autre photo.");
      input.value = "";
      return;
    }
    if (optimized !== picked) {
      const dt = new DataTransfer();
      dt.items.add(optimized);
      input.files = dt.files;
    }
    setPreview(URL.createObjectURL(optimized));
  }

  return (
    <div className="relative min-w-0">
      <label htmlFor={id} className="group block cursor-pointer">
        <span className="mb-2 block text-base font-bold">{label}</span>
        <span className={cn("relative grid w-full place-items-center overflow-hidden rounded-[16px] border-2 border-dashed border-togo-green/30 bg-muted/50 text-muted-foreground transition group-focus-within:ring-2 group-focus-within:ring-ring group-hover:border-togo-green", aspect)}>
          {shown ? (
            <>
              <img src={shown} alt={`Aperçu : ${label}`} data-no-zoom className="absolute inset-0 h-full w-full object-cover" />
              <span className="absolute bottom-3 left-3 inline-flex items-center gap-1.5 rounded-full bg-card/95 px-3 py-1.5 text-[15px] font-bold text-foreground">
                <Camera className="h-4 w-4" />
                Changer la photo
              </span>
            </>
          ) : (
            <span className="flex flex-col items-center gap-2 p-4 text-center">
              <span className="grid h-12 w-12 place-items-center rounded-full bg-card text-togo-green dark:text-lime">
                {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <ImagePlus className="h-5 w-5" />}
              </span>
              <span className="text-base font-bold text-foreground">{busy ? "Optimisation de la photo…" : "Ajouter une photo"}</span>
              <span className="text-[15px]">Galerie ou appareil photo</span>
            </span>
          )}
          {busy && shown && (
            <span className="absolute inset-0 grid place-items-center bg-card/70">
              <Loader2 className="h-6 w-6 animate-spin text-togo-green dark:text-lime" />
            </span>
          )}
        </span>
        <input id={id} type="file" name={name} accept="image/*" required={required && !current} className="sr-only" onChange={onPick} />
      </label>
      {shown && (
        <button
          type="button"
          onClick={() => openImageViewer(shown, label)}
          aria-label={`Agrandir la photo : ${label}`}
          className="absolute right-3 top-11 z-10 inline-flex min-h-10 items-center gap-2 rounded-full bg-card/95 px-3 text-[12px] font-bold text-foreground shadow-sm transition hover:bg-card"
        >
          <Expand className="h-4 w-4" /> Voir en grand
        </button>
      )}
      {error ? (
        <p role="alert" className="mt-2 text-base font-semibold text-togo-red">{error}</p>
      ) : hint ? (
        <p className="mt-2 text-[15px] leading-5 text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}
