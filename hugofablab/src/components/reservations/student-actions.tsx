"use client";

import { useTransition } from "react";
import { Loader2, Trash2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { cancelMyReservationAction, leaveWaitlistAction } from "@/actions/reservations";
import { Button } from "@/components/ui";

export function CancelReservationButton({ id }: { id: number }) {
  const [pending, start] = useTransition();
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={pending}
      className="text-togo-red hover:bg-togo-red/10"
      onClick={() => {
        if (!confirm("Annuler cette réservation ?")) return;
        start(async () => {
          const res = await cancelMyReservationAction(id);
          if (res.error) toast.error(res.error);
        });
      }}
    >
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />} Annuler
    </Button>
  );
}

export function LeaveWaitlistButton({ id }: { id: number }) {
  const [pending, start] = useTransition();
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const res = await leaveWaitlistAction(id);
          if (res.error) toast.error(res.error);
          else toast.success(res.success);
        })
      }
    >
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />} Retirer
    </Button>
  );
}
