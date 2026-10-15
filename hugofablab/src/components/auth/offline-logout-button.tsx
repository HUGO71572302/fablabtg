"use client";

import { useTransition, type ReactNode } from "react";
import { toast } from "sonner";
import { logoutAction } from "@/actions/auth";
import { clearOfflineData } from "@/lib/offline-reservations";

export function OfflineLogoutButton({
  children,
  className,
  ariaLabel,
}: {
  children: ReactNode;
  className?: string;
  ariaLabel?: string;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        startTransition(async () => {
          try {
            await clearOfflineData();
          } catch (error) {
            console.error("Impossible d’effacer les données hors ligne avant la déconnexion.", error);
            toast.error("Déconnexion annulée : impossible d’effacer les demandes conservées sur cet appareil.");
            return;
          }
          await logoutAction();
        });
      }}
    >
      <button type="submit" disabled={pending} aria-label={ariaLabel} className={className}>
        {children}
      </button>
    </form>
  );
}
