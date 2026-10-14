"use client";

import { useActionState, useState } from "react";
import { AlertTriangle, Loader2, PauseCircle } from "lucide-react";
import { deactivateOwnLabAction } from "@/actions/labs";
import { Button, Input, Label } from "@/components/ui";
import { Modal } from "@/components/ui/modal";

export function DeactivateLabControl({ labName }: { labName: string }) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [state, action, pending] = useActionState(deactivateOwnLabAction, null);

  function close() {
    setOpen(false);
    setStep(1);
  }

  return (
    <>
      <Button type="button" variant="outline" className="border-togo-red/40 text-togo-red" onClick={() => setOpen(true)}>
        <PauseCircle className="h-4 w-4" /> Mettre mon lab en pause
      </Button>
      {open && (
        <Modal onClose={close} label="Mettre le lab en pause">
          {step === 1 ? (
            <>
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-1 h-6 w-6 shrink-0 text-togo-red" />
                <div>
                  <h2 className="text-xl font-bold">Mettre « {labName} » en pause ?</h2>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">
                    Le lab sera retiré de l&apos;annuaire et de sa vitrine publique. Les élèves ne pourront plus se connecter à son espace,
                    réserver ou s&apos;inscrire. Les comptes, projets, réservations, paiements et autres données seront conservés.
                  </p>
                  <p className="mt-3 text-sm font-semibold">Vous pourrez réactiver le lab ultérieurement avec le compte responsable.</p>
                </div>
              </div>
              <div className="mt-6 flex justify-end gap-2">
                <Button type="button" variant="ghost" onClick={close}>Annuler</Button>
                <Button type="button" variant="outline" className="border-togo-red/40 text-togo-red" onClick={() => setStep(2)}>Continuer vers la confirmation</Button>
              </div>
            </>
          ) : (
            <form action={action} className="space-y-4">
              <h2 className="text-xl font-bold">Confirmation finale</h2>
              <p className="text-sm leading-6 text-muted-foreground">Pour éviter une mise en pause accidentelle, confirmez le nom du lab et saisissez la phrase demandée.</p>
              {state?.error && <p role="alert" className="rounded-lg bg-togo-red/10 p-3 text-sm text-togo-red">{state.error}</p>}
              <div>
                <Label htmlFor="labNameConfirmation">Nom exact du lab : {labName}</Label>
                <Input id="labNameConfirmation" name="labNameConfirmation" autoComplete="off" required />
              </div>
              <div>
                <Label htmlFor="confirmationPhrase">Tapez METTRE EN PAUSE</Label>
                <Input id="confirmationPhrase" name="confirmationPhrase" autoComplete="off" required />
              </div>
              <label className="flex items-start gap-2 text-sm leading-5">
                <input type="checkbox" name="acknowledgeData" required className="mt-1" />
                <span>Je comprends que le lab sera masqué et que les élèves n&apos;y auront plus accès, et je confirme que ses données seront conservées.</span>
              </label>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="ghost" onClick={() => setStep(1)}>Retour</Button>
                <Button type="submit" disabled={pending} className="bg-togo-red text-white hover:bg-togo-red/90">
                  {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <PauseCircle className="h-4 w-4" />} Mettre le lab en pause
                </Button>
              </div>
            </form>
          )}
        </Modal>
      )}
    </>
  );
}
