"use client";

import { useActionState, useEffect, useState } from "react";
import { Boxes, Loader2, Pencil, Plus, Save } from "lucide-react";
import { toast } from "sonner";
import { saveStockItemAction } from "@/actions/stock";
import { Alert } from "@/components/auth/auth-forms";
import { ImageInput } from "@/components/ui/image-input";
import { Modal } from "@/components/ui/modal";
import { STOCK_ICONS, StockIcon } from "@/components/ui/stock-icon";
import { Button, Input, Label, Select, Textarea, cn } from "@/components/ui";
import { STOCK_CATEGORIES, type StockItemView } from "@/lib/stock-shared";

const UNIT_SUGGESTIONS = ["unité", "pièce", "rouleau", "feuille", "lot", "paire", "boîte", "tube", "litre", "kg", "mètre"];

/** Formulaire de création / modification d'un article du stock (photo, seuil d'alerte, emplacement). */
export function StockEditor({ item, compact = false }: { item?: StockItemView; compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState(item?.category ?? "consommable");
  const [state, action, pending] = useActionState(saveStockItemAction, null);
  useEffect(() => {
    if (state?.success) {
      toast.success(state.success);
      setOpen(false);
    } else if (state?.error) toast.error(state.error);
  }, [state]);

  return (
    <>
      {compact ? (
        <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)} aria-label={`Modifier ${item?.name ?? "l'article"}`}>
          <Pencil className="h-3.5 w-3.5" /> Modifier
        </Button>
      ) : (
        <Button type="button" onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" /> Nouvel article
        </Button>
      )}
      {open && (
        <Modal onClose={() => setOpen(false)} label={item ? "Modifier l'article" : "Nouvel article du stock"}>
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-2xl bg-lime text-forest">
              <Boxes className="h-5 w-5" />
            </span>
            <div>
              <h3 className="text-[16px] font-extrabold tracking-tight">{item ? `Modifier « ${item.name} »` : "Ajouter au stock"}</h3>
              <p className="text-[13px] text-muted-foreground">Une photo et un seuil d'alerte facilitent le réapprovisionnement.</p>
            </div>
          </div>

          <form action={action} className="mt-5 space-y-4">
            {item && <input type="hidden" name="id" value={item.id} />}
            <div>
              <Label htmlFor="stock-name">Désignation</Label>
              <Input id="stock-name" name="name" defaultValue={item?.name} required placeholder="Ex. Filament PLA vert 1,75 mm" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="stock-category">Catégorie</Label>
                <Select id="stock-category" name="category" value={category} onChange={(e) => setCategory(e.target.value as typeof category)}>
                  {STOCK_CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </Select>
                <p className="mt-1.5 text-[13px] text-muted-foreground">{STOCK_CATEGORIES.find((c) => c.value === category)?.hint}</p>
              </div>
              <div>
                <Label htmlFor="stock-unit">Unité</Label>
                <Input id="stock-unit" name="unit" list="unit-suggestions" defaultValue={item?.unit ?? "unité"} placeholder="unité" />
                <datalist id="unit-suggestions">
                  {UNIT_SUGGESTIONS.map((u) => (
                    <option key={u} value={u} />
                  ))}
                </datalist>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="stock-quantity">Quantité en stock</Label>
                <Input id="stock-quantity" name="quantity" type="number" min={0} step={1} defaultValue={item?.quantity ?? 0} required />
              </div>
              <div>
                <Label htmlFor="stock-min">Seuil d'alerte</Label>
                <Input id="stock-min" name="minQuantity" type="number" min={0} step={1} defaultValue={item?.minQuantity ?? 0} />
                <p className="mt-1.5 text-[13px] text-muted-foreground">Sous cette valeur, l'article remonte dans les alertes.</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="stock-location">Emplacement</Label>
                <Input id="stock-location" name="location" defaultValue={item?.location ?? ""} placeholder="Ex. Étagère B · bac 3" />
              </div>
              <div>
                <Label htmlFor="stock-supplier">Fournisseur</Label>
                <Input id="stock-supplier" name="supplier" defaultValue={item?.supplier ?? ""} placeholder="Ex. Marché de Kara" />
              </div>
            </div>
            <div>
              <Label htmlFor="stock-note">Note</Label>
              <Textarea id="stock-note" name="note" defaultValue={item?.note ?? ""} className="min-h-[64px]" placeholder="Référence, taille, précautions…" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="stock-icon">Pictogramme</Label>
                <Select id="stock-icon" name="icon" defaultValue={item?.icon ?? "box"}>
                  {STOCK_ICONS.map((i) => (
                    <option key={i.value} value={i.value}>
                      {i.label}
                    </option>
                  ))}
                </Select>
              </div>
              <ImageInput name="photo" label="Photo" current={item?.photoId ? `/api/media/${item.photoId}` : null} aspect="aspect-[4/3]" />
            </div>
            <div className="flex gap-2 pt-1">
              <Button type="submit" disabled={pending} className="flex-1">
                {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Enregistrer
              </Button>
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                Fermer
              </Button>
            </div>
            {state?.error && (
              <p className={cn("text-sm")}>
                <Alert state={state} />
              </p>
            )}
          </form>
        </Modal>
      )}
    </>
  );
}

export { StockIcon };
