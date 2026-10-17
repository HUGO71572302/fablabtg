"use client";

import { useTransition } from "react";
import { Loader2, Megaphone, Star, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { setReviewStatusAction } from "@/actions/reviews";
import { Button } from "@/components/ui";

export function ReviewControls({ id, published, featured }: { id: number; published: boolean; featured: boolean }) {
  const [pending, start] = useTransition();
  const run = (status: "publish" | "unpublish" | "feature" | "unfeature") => start(async () => {
    const result = await setReviewStatusAction(id, status);
    if (result.error) toast.error(result.error);
    else toast.success(result.success);
  });
  return (
    <div className="flex flex-wrap gap-2">
      <Button type="button" size="sm" variant={published ? "outline" : "success"} disabled={pending} onClick={() => run(published ? "unpublish" : "publish")}>
        {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : published ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
        {published ? "Retirer" : "Publier"}
      </Button>
      <Button type="button" size="sm" variant="outline" disabled={pending || !published} onClick={() => run(featured ? "unfeature" : "feature")}>
        {featured ? <Megaphone className="h-3.5 w-3.5" /> : <Star className="h-3.5 w-3.5" />}
        {featured ? "Retirer de la sélection" : "Mettre en avant"}
      </Button>
    </div>
  );
}
