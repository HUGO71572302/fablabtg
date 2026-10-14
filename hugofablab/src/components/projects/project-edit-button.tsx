"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui";
import { Modal } from "@/components/ui/modal";
import { ProjectForm, type EditableProject } from "@/components/projects/project-form";

export function ProjectEditButton({ project }: { project: EditableProject }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button type="button" size="sm" variant="outline" onClick={() => setOpen(true)}>
        <Pencil className="h-3.5 w-3.5" /> Modifier
      </Button>
      {open && (
        <Modal onClose={() => setOpen(false)} label={`Modifier le projet ${project.title}`} className="max-w-3xl">
          <h2 className="mb-5 text-xl font-bold">Modifier « {project.title} »</h2>
          <ProjectForm isAdmin initialProject={project} onSaved={() => setOpen(false)} />
        </Modal>
      )}
    </>
  );
}
