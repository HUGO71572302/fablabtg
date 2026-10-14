"use client";

import { useActionState, useEffect, useId, useState } from "react";
import { Loader2, Save, Upload } from "lucide-react";
import { toast } from "sonner";
import { saveProjectAction, updatePublishedProjectAction } from "@/actions/projects";
import type { ActionState } from "@/actions/auth";
import { Alert } from "@/components/auth/auth-forms";
import { ImageInput } from "@/components/ui/image-input";
import { Button, Input, Label, Select, Textarea } from "@/components/ui";
import { CLASS_LEVELS } from "@/lib/labels";

export type EditableProject = {
  id: number;
  title: string;
  description: string | null;
  authors: string | null;
  classLevel: string | null;
  machines: string | null;
  photoUrl: string | null;
};

export function ProjectForm({ defaultAuthors, defaultClass, isAdmin, initialProject, onSaved }: {
  defaultAuthors?: string;
  defaultClass?: string | null;
  isAdmin: boolean;
  initialProject?: EditableProject;
  onSaved?: () => void;
}) {
  const [formKey, setFormKey] = useState(0);
  const formId = useId();
  const submitAction = async (previous: ActionState, fd: FormData): Promise<ActionState> => {
    const result = initialProject
      ? await updatePublishedProjectAction(previous, fd)
      : await saveProjectAction(previous, fd);
    if (result?.success) {
      if (initialProject) onSaved?.();
      else setFormKey((key) => key + 1);
    }
    return result;
  };
  const [state, action, pending] = useActionState(submitAction, null);
  useEffect(() => {
    if (state?.success) {
      toast.success("Projet enregistré", { description: state.success });
    }
  }, [state]);
  return (
    <form key={formKey} action={action} className="grid gap-4 md:grid-cols-5">
      {initialProject && <input type="hidden" name="id" value={initialProject.id} />}
      <div className="md:col-span-2">
        <ImageInput name="photo" label="Photo du projet" current={initialProject?.photoUrl} required={!initialProject} aspect="aspect-[4/3]" hint={initialProject ? "Laissez la photo actuelle ou choisissez-en une nouvelle." : undefined} />
      </div>
      <div className="space-y-3 md:col-span-3">
        {state?.error && <Alert state={state} />}
        <div>
          <Label htmlFor={`${formId}-title`}>Titre du projet</Label>
          <Input id={`${formId}-title`} name="title" defaultValue={initialProject?.title} required minLength={3} placeholder="ex. Lampe solaire imprimée en 3D" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor={`${formId}-authors`}>Réalisé par</Label>
            <Input id={`${formId}-authors`} name="authors" defaultValue={initialProject?.authors ?? (isAdmin ? "" : defaultAuthors)} placeholder="Noms des élèves ou du club" />
          </div>
          <div>
            <Label htmlFor={`${formId}-classLevel`}>Classe</Label>
            <Select id={`${formId}-classLevel`} name="classLevel" defaultValue={initialProject?.classLevel ?? defaultClass ?? ""}>
              <option value="">—</option>
              {CLASS_LEVELS.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </Select>
          </div>
        </div>
        <div>
          <Label htmlFor={`${formId}-machines`}>Machines utilisées</Label>
          <Input id={`${formId}-machines`} name="machines" defaultValue={initialProject?.machines ?? ""} placeholder="ex. Imprimante 3D, découpe laser" />
        </div>
        <div>
          <Label htmlFor={`${formId}-description`}>Description</Label>
          <Textarea id={`${formId}-description`} name="description" defaultValue={initialProject?.description ?? ""} placeholder="Objectif, étapes, ce que vous avez appris…" />
        </div>
        <Button type="submit" disabled={pending}>
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : initialProject ? <Save className="h-4 w-4" /> : <Upload className="h-4 w-4" />} {initialProject ? "Enregistrer les modifications" : isAdmin ? "Publier le projet" : "Envoyer au responsable"}
        </Button>
      </div>
    </form>
  );
}
