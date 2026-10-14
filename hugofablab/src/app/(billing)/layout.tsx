import type { ReactNode } from "react";
import { PublicFooter } from "@/components/layout/public-footer";
import { ScrollProgress } from "@/components/motion";

export default function BillingLayout({ children }: { children: ReactNode }) {
  return <div className="min-h-screen bg-background"><ScrollProgress />{children}<PublicFooter /></div>;
}
