"use client";

import { useEffect, useMemo, useState } from "react";
import { Archive, ArchiveRestore, Boxes, MapPin, Printer, Search, ShieldAlert, Truck } from "lucide-react";
import { toast } from "sonner";
import { archiveStockItemAction } from "@/actions/stock";
import { Reveal, Stagger } from "@/components/motion";
import { StockEditor } from "@/components/stock/stock-editor";
import { HistoryButton, QuickMove, StockHistory } from "@/components/stock/stock-history";
import { StockGauge } from "@/components/stock/stock-gauge";
import { StockIcon } from "@/components/ui/stock-icon";
import { Badge, Button, EmptyState, buttonClass, cn } from "@/components/ui";
import { STOCK_CATEGORIES, STOCK_CATEGORY_LABEL, type StockItemView, type StockMovementView } from "@/lib/stock-shared";

const SORTS = [
  { value: "alerte", label: "Alertes d'abord" },
  { value: "nom", label: "Nom (A → Z)" },
  { value: "quantite", label: "Quantité" },
  { value: "recent", label: "Mis à jour récemment" },
] as const;

export function StockBoard({ items: fromServer, movementsByItem, readOnly = false }: {
  items: StockItemView[];
  movementsByItem: Record<number, StockMovementView[]>;
  readOnly?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>("all");
  const [onlyAlerts, setOnlyAlerts] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [sort, setSort] = useState<(typeof SORTS)[number]["value"]>("alerte");

  // Mise à jour optimiste : la carte réagit immédiatement au doigt ; le serveur reste la source de vérité.
  const [items, setItems] = useState<StockItemView[]>(fromServer);
  useEffect(() => setItems(fromServer), [fromServer]);

  const patchItem = (id: number, patch: Partial<StockItemView>) => setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch } : i)));
  const applyQuantity = (id: number, quantity: number) => {
    const min = items.find((i) => i.id === id)?.minQuantity ?? 0;
    patchItem(id, { quantity, out: quantity <= 0, low: quantity > 0 && quantity <= min });
  };

  const visible = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase("fr");
    const rank = (i: StockItemView) => (i.out ? 0 : i.low ? 1 : 2);
    return items
      .filter((i) => (showArchived ? !i.active : i.active))
      .filter((i) => category === "all" || i.category === category)
      .filter((i) => !onlyAlerts || i.low || i.out)
      .filter((i) => !needle || [i.name, i.location, i.supplier, i.note, STOCK_CATEGORY_LABEL[i.category]].filter(Boolean).join(" ").toLocaleLowerCase("fr").includes(needle))
      .sort((a, b) =>
        sort === "nom" ? a.name.localeCompare(b.name, "fr")
          : sort === "quantite" ? b.quantity - a.quantity
            : sort === "recent" ? b.updatedAt.localeCompare(a.updatedAt)
              : rank(a) - rank(b) || a.name.localeCompare(b.name, "fr"),
      );
  }, [items, query, category, onlyAlerts, showArchived, sort]);

  return (
    <section aria-label="Inventaire du stock">
      <div className="mb-5 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[210px] flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher un article, un emplacement…"
              aria-label="Rechercher dans le stock"
              className="min-h-11 w-full rounded-full border border-border bg-card py-2 pl-10 pr-4 text-[15px] font-medium focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/15"
            />
          </div>
          <select value={sort} onChange={(e) => setSort(e.target.value as typeof sort)} aria-label="Trier les articles" className="min-h-11 rounded-full border border-border bg-card px-4 text-[15px] font-medium">
            {SORTS.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => setOnlyAlerts((v) => !v)}
            aria-pressed={onlyAlerts}
            className={cn(
              "inline-flex min-h-11 items-center gap-1.5 rounded-full border px-4 text-[13px] font-bold transition",
              onlyAlerts ? "border-togo-red bg-togo-red text-white" : "border-border bg-card text-muted-foreground hover:bg-muted",
            )}
          >
            <ShieldAlert className="h-3.5 w-3.5" /> Alertes
          </button>
          {!readOnly && (
            <button
              type="button"
              onClick={() => setShowArchived((v) => !v)}
              aria-pressed={showArchived}
              className={cn("inline-flex min-h-11 items-center gap-1.5 rounded-full border px-4 text-[13px] font-bold transition", showArchived ? "border-foreground bg-foreground text-background" : "border-border bg-card text-muted-foreground hover:bg-muted")}
            >
              {showArchived ? <ArchiveRestore className="h-3.5 w-3.5" /> : <Archive className="h-3.5 w-3.5" />} Archivés
            </button>
          )}
          {!readOnly && <div className="ml-auto"><StockEditor /></div>}
        </div>

        <div className="no-scrollbar -mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
          {[{ value: "all", label: "Tout" }, ...STOCK_CATEGORIES].map((c) => {
            const count = items.filter((i) => i.active && (c.value === "all" || i.category === c.value)).length;
            return (
              <button
                key={c.value}
                type="button"
                onClick={() => setCategory(c.value)}
                aria-pressed={category === c.value}
                className={cn(
                  "shrink-0 rounded-full border px-3.5 py-2 text-[13px] font-bold transition",
                  category === c.value ? "border-togo-green bg-togo-green text-white dark:bg-lime dark:text-forest" : "border-border bg-card text-muted-foreground hover:bg-muted",
                )}
              >
                {c.label} <span className="ml-1 opacity-70 tabular-nums">{count}</span>
              </button>
            );
          })}
        </div>
      </div>

      {visible.length === 0 ? (
        <EmptyState
          icon={<Boxes className="h-7 w-7" />}
          title={showArchived ? "Aucun article archivé" : "Rien à afficher ici"}
          text={readOnly ? "Le responsable du lab n'a pas encore enregistré de matériel." : "Modifiez vos filtres, ou ajoutez votre premier article au stock."}
          action={!readOnly && !showArchived ? <StockEditor /> : undefined}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          <Stagger>
            {visible.map((item) => {
              const photo = item.photoId ? `/api/media/${item.photoId}` : null;
              return (
                <Reveal key={item.id} data-stock-item={item.id} className={cn("flex min-w-0 flex-col rounded-[18px] border border-border bg-card p-4", !item.active && "opacity-60")}>
                  <div className="flex items-start gap-3">
                    {photo ? (
                      <img src={photo} alt={item.name} data-gallery="stock" className="h-12 w-12 shrink-0 rounded-[12px] object-cover" loading="lazy" />
                    ) : (
                      <span className="grid h-12 w-12 shrink-0 place-items-center rounded-[12px] bg-muted text-togo-green dark:text-lime">
                        <StockIcon icon={item.icon} className="h-5 w-5 stroke-[1.6]" />
                      </span>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-start justify-between gap-1.5">
                        <h3 className="text-[15px] font-extrabold leading-snug tracking-[-0.01em]">{item.name}</h3>
                        {item.out ? <Badge tone="red">Rupture</Badge> : item.low ? <Badge tone="yellow">Stock bas</Badge> : null}
                      </div>
                      <p className="mt-1 text-[13px] font-bold uppercase tracking-[0.12em] text-muted-foreground">{STOCK_CATEGORY_LABEL[item.category]}</p>
                    </div>
                  </div>

                  <div className="mt-3.5">
                    <div className="flex items-end justify-between gap-2">
                      <p className="font-display text-[27px] font-extrabold leading-none tracking-tight tabular-nums">
                        {item.quantity}
                        <span className="ml-1 text-[13px] font-bold text-muted-foreground">{item.unit}</span>
                      </p>
                      {!readOnly && (
                        <div className="flex items-center gap-1.5">
                          <QuickMove item={item} kind="sortie" onUpdate={(q) => applyQuantity(item.id, q)} />
                          <QuickMove item={item} kind="entree" onUpdate={(q) => applyQuantity(item.id, q)} />
                        </div>
                      )}
                    </div>
                    <StockGauge quantity={item.quantity} minQuantity={item.minQuantity} unit={item.unit} className="mt-2.5" />
                  </div>

                  {(item.location || item.supplier) && (
                    <p className="mt-2.5 space-x-3 text-[13px] font-medium text-muted-foreground">
                      {item.location && <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{item.location}</span>}
                      {item.supplier && <span className="inline-flex items-center gap-1"><Truck className="h-3 w-3" />{item.supplier}</span>}
                    </p>
                  )}
                  {item.note && <p className="mt-2 line-clamp-2 text-[13px] leading-5 text-muted-foreground">{item.note}</p>}

                  <div className="mt-3.5 flex flex-wrap items-center gap-1.5 border-t border-border pt-3">
                    <a href={`/print/stock/fiche/${item.id}`} target="_blank" rel="noreferrer" className={buttonClass("outline", "sm")}><Printer className="h-4 w-4" />Fiche</a>
                    <StockHistory
                      item={item}
                      movements={movementsByItem[item.id] ?? []}
                      readOnly={readOnly}
                      onUpdate={(q) => applyQuantity(item.id, q)}
                      trigger={<button type="button" className="contents"><HistoryButton /></button>}
                    />
                    {!readOnly && (
                      <>
                        <StockEditor item={item} compact />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="ml-auto text-muted-foreground"
                          onClick={async () => {
                            const res = await archiveStockItemAction(item.id);
                            if (res.error) toast.error(res.error);
                            else if (res.success) {
                              patchItem(item.id, { active: !item.active });
                              toast.success(res.success);
                            }
                          }}
                        >
                          {item.active ? <Archive className="h-3.5 w-3.5" /> : <ArchiveRestore className="h-3.5 w-3.5" />}
                          {item.active ? "Archiver" : "Réintégrer"}
                        </Button>
                      </>
                    )}
                  </div>
                </Reveal>
              );
            })}
          </Stagger>
        </div>
      )}
    </section>
  );
}
