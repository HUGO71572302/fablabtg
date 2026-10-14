"use client";

import { useTransition } from "react";
import { Eye, EyeOff, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { deleteProjectAction, setProjectPublishedAction } from "@/actions/projects";
import { Button } from "@/components/ui";

export function ProjectActions({ id, published, canPublish }: { id: number; published: boolean; canPublish: boolean }) {
  const [pending, start] = useTransition();
  const run = (fn: () => Promise<{ error?: string; success?: string }>) =>
    start(async () => {
      const r = await fn();
      if (r.error) toast.error(r.error);
      else toast.success(r.success);
    });
  return (
    <>
      {canPublish && (
        <Button type="button" size="sm" variant={published ? "outline" : "success"} disabled={pending} onClick={() => run(() => setProjectPublishedAction(id, !published))}>
          {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : published ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
          {published ? "Retirer" : "Publier"}
        </Button>
      )}
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="text-togo-red"
        disabled={pending}
        onClick={() => {
          if (confirm("Supprimer ce projet ?")) run(() => deleteProjectAction(id));
        }}
      >
        <Trash2 className="h-3.5 w-3.5" /> Supprimer
      </Button>
    </>
  );
}
