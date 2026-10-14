import type { ReactNode } from "react";
import { PublicFooter } from "@/components/layout/public-footer";
import { ScrollProgress } from "@/components/motion";

/** Pages publiques (accueil, vitrines des labs, création de lab) : progression de lecture + pied de page communs. */
export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-clip">
      <ScrollProgress />
      {children}
      <PublicFooter />
    </div>
  );
}
