import type { ReactNode } from "react";
import { Expand, Layers3 } from "lucide-react";
import { Badge } from "@/components/ui";
import type { Project } from "@/db/schema";
import { classLabel } from "@/lib/labels";
import { mediaUrl } from "@/lib/media-url";

export function ProjectCard({ p, actions, showStatus = false }: { p: Project; actions?: ReactNode; showStatus?: boolean }) {
  const img = mediaUrl(p.photoId, p.imageUrl);
  return (
    <figure className="image-zoom flex h-full min-w-0 flex-col overflow-hidden rounded-[22px] border border-border bg-card">
      <div className="relative aspect-[4/3] overflow-hidden bg-muted">{img ? <><img src={img} alt={p.title} data-gallery="projets" className="h-full w-full object-cover" loading="lazy" /><span aria-hidden="true" className="pointer-events-none absolute right-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-black/65 px-3 py-1.5 text-xs font-bold text-white backdrop-blur-sm"><Expand className="h-3.5 w-3.5" /> Agrandir</span></> : <div className="grid h-full place-items-center text-muted-foreground"><Layers3 className="h-8 w-8" /></div>}{p.classLevel && <span className="pointer-events-none absolute bottom-4 left-4 rounded-full border border-white/50 bg-white/95 px-3 py-1.5 text-[13px] font-semibold text-forest">{classLabel(p.classLevel)}</span>}</div>
      <figcaption className="flex flex-1 flex-col p-5">
        <div className="flex items-start justify-between gap-2"><h3 className="text-base font-extrabold leading-snug tracking-tight">{p.title}</h3>{showStatus && <Badge tone={p.published ? "green" : "yellow"}>{p.published ? "Publié" : "À valider"}</Badge>}</div>
        {p.authors && <p className="mt-1.5 text-[13px] font-medium text-muted-foreground">Par {p.authors}</p>}
        {p.description && <p className="mt-3 line-clamp-3 text-sm leading-6 text-muted-foreground">{p.description}</p>}
        {p.machines && <p className="mt-4 flex items-start gap-1.5 border-t border-border pt-3 text-[13px] font-medium text-togo-green dark:text-lime"><Layers3 className="mt-0.5 h-3 w-3 shrink-0" />{p.machines}</p>}
        {actions && <div className="mt-4 flex flex-wrap gap-2">{actions}</div>}
      </figcaption>
    </figure>
  );
}
