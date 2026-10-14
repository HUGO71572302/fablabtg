"use client";

import { useState, useTransition } from "react";
import { Loader2, PlayCircle } from "lucide-react";
import { reactivateOwnLabAction } from "@/actions/labs";
import { Button } from "@/components/ui";

export function ReactivateLabButton() {
  const [pending, start] = useTransition();
  const reactivate = () => {
    if (!confirm("Réactiver ce lab ? Sa vitrine et l'accès des élèves seront rétablis.")) return;
    start(async () => reactivateOwnLabAction());
  };
  return (
    <Button type="button" size="lg" disabled={pending} onClick={reactivate}>
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlayCircle className="h-4 w-4" />}
      Réactiver mon lab
    </Button>
  );
}
