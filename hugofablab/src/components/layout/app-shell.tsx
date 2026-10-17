"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type MouseEvent, type ReactNode } from "react";
import { ArrowUpRight, BarChart3, Bell, Boxes, CalendarDays, ChevronRight, ClipboardList, CreditCard, Ellipsis, GraduationCap, Home, Images, LayoutDashboard, History, LogOut, Menu, Palette, Plus, Settings2, Star, UserCircle2, Users, Wrench, X } from "lucide-react";
import { OfflineLogoutButton } from "@/components/auth/offline-logout-button";
import { BrandMark } from "@/components/brand/logo";
import { SoundToggle } from "@/components/ui/sound-toggle";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { buttonClass, cn } from "@/components/ui";
import type { Role } from "@/db/schema";
import { PLAN_LABEL } from "@/lib/billing-shared";

type NavItem = { href: string; label: string; icon: typeof Home; section?: string };
const STUDENT_NAV: NavItem[] = [
  { href: "/app", label: "Mon tableau de bord", icon: Home, section: "Mon atelier" },
  { href: "/app/calendrier", label: "Calendrier", icon: CalendarDays },
  { href: "/app/reserver", label: "Réserver une machine", icon: Plus },
  { href: "/app/reservations", label: "Mes réservations", icon: ClipboardList, section: "Mon activité" },
  { href: "/app/projets", label: "Mes projets", icon: Images },
  { href: "/app/avis", label: "Avis des utilisateurs", icon: Star, section: "Communauté" },
  { href: "/app/stock", label: "Stock du lab", icon: Boxes },
  { href: "/app/profil", label: "Mon profil", icon: UserCircle2, section: "Mon compte" },
];
const ADMIN_NAV: NavItem[] = [
  { href: "/admin", label: "Tableau de bord", icon: LayoutDashboard, section: "Activité" },
  { href: "/admin/reservations", label: "Réservations", icon: ClipboardList },
  { href: "/app/calendrier", label: "Calendrier", icon: CalendarDays },
  { href: "/admin/ressources", label: "Machines & salles", icon: Wrench, section: "Atelier" },
  { href: "/admin/stock/journal", label: "Journal entrées / sorties", icon: History },
  { href: "/admin/stock", label: "Stock & matériel", icon: Boxes },
  { href: "/admin/projets", label: "Projets & galerie", icon: Images },
  { href: "/admin/utilisateurs", label: "Membres du lab", icon: Users, section: "Communauté" },
  { href: "/admin/avis", label: "Avis des utilisateurs", icon: Star },
  { href: "/admin/suivi", label: "Suivi pédagogique", icon: GraduationCap },
  { href: "/admin/statistiques", label: "Statistiques", icon: BarChart3 },
  { href: "/admin/identite", label: "Identité du lab", icon: Palette, section: "Configuration" },
  { href: "/admin/disponibilites", label: "Horaires & disponibilités", icon: Settings2 },
];

const OFFLINE_CACHE_ROUTES = new Set([
  "/app",
  "/app/calendrier",
  "/app/reserver",
  "/app/reservations",
  "/app/projets",
  "/app/avis",
  "/app/stock",
  "/app/profil",
  "/admin",
  "/admin/reservations",
  "/admin/ressources",
  "/admin/stock/journal",
  "/admin/stock",
  "/admin/projets",
  "/admin/utilisateurs",
  "/admin/avis",
  "/admin/suivi",
  "/admin/statistiques",
  "/admin/identite",
  "/admin/disponibilites",
]);

export function AppShell({ user, unread, lab, subscription, platformAdmin = false, children }: {
  user: { name: string; role: Role; email: string };
  platformAdmin?: boolean;
  unread: number;
  lab: { name: string; school: string; logoUrl: string | null; slug?: string };
  subscription?: { phase: "trial" | "active" | "pending" | "expired" | "suspended"; plan: "essentiel" | "plus" | "reseau"; endsAt: string; accessAvailable: boolean; exempt?: boolean };
  children: ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [offlineCacheStatus, setOfflineCacheStatus] = useState<"preparing" | "ready" | "partial" | "error" | null>(null);
  const [offlineCachedCount, setOfflineCachedCount] = useState(0);
  const closeRef = useRef<HTMLButtonElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const admin = user.role === "fabmanager";
  const platformAdminNav: NavItem = { href: "/gestion-abonnements", label: "Gestion des abonnements", icon: CreditCard, section: "Plateforme" };
  const nav = admin ? (platformAdmin ? [...ADMIN_NAV, platformAdminNav] : ADMIN_NAV) : STUDENT_NAV;
  // Un seul élément actif : le chemin le plus précis (ex. /admin/stock/journal plutôt que /admin/stock).
  const activeHref = nav.filter((n) => pathname === n.href || pathname.startsWith(n.href + "/")).sort((a, b) => b.href.length - a.href.length)[0]?.href;
  const active = (href: string) => href === activeHref;
  const current = nav.find((n) => active(n.href));
  const initials = user.name.split(/\s+/).filter((p) => /^[A-Za-zÀ-ÿ]/.test(p)).slice(0, 2).map((p) => p[0]).join("").toUpperCase();
  const bottom = admin ? ADMIN_NAV.slice(0, 4) : STUDENT_NAV.slice(0, 4);
  const subscriptionDate = subscription && !subscription.exempt ? new Date(subscription.endsAt).toLocaleDateString("fr-FR") : null;

  const navigateFromOfflineCache = (event: MouseEvent<HTMLDivElement>) => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const target = event.target;
    if (!(target instanceof Element)) return;
    const link = target.closest<HTMLAnchorElement>("a[href]");
    if (!link || link.target || link.hasAttribute("download")) return;
    const destination = new URL(link.href, window.location.href);
    if (destination.origin !== window.location.origin) return;

    if (navigator.onLine) {
      if (OFFLINE_CACHE_ROUTES.has(destination.pathname)) {
        void fetch(`${destination.pathname}${destination.search}`, {
          credentials: "same-origin",
          cache: "no-store",
          headers: { Accept: "text/html", "x-hf-offline-prefetch": "1" },
        }).catch(() => undefined);
      }
      return;
    }

    event.preventDefault();
    window.location.assign(`${destination.pathname}${destination.search}${destination.hash}`);
  };

  useEffect(() => {
    const closeMenu = () => setOpen(false);
    window.addEventListener("hf-close-mobile-menu", closeMenu);
    return () => window.removeEventListener("hf-close-mobile-menu", closeMenu);
  }, []);
  useEffect(() => {
    if (!navigator.onLine || !("serviceWorker" in navigator)) return;

    // Prépare les principaux écrans de l'espace actif dès son ouverture en ligne.
    // Ainsi l'application installée reste accessible même si l'on perd ensuite le réseau.
    const routes = admin
      ? [
          "/admin", "/admin/reservations", "/app/calendrier", "/app/reserver",
          "/admin/ressources", "/admin/stock/journal", "/admin/stock", "/admin/projets",
          "/admin/utilisateurs", "/admin/avis", "/admin/suivi", "/admin/statistiques", "/admin/identite",
          "/admin/disponibilites",
        ]
      : ["/app", "/app/calendrier", "/app/reserver", "/app/reservations", "/app/projets", "/app/avis", "/app/stock", "/app/profil"];
    let cancelled = false;
    const controller = new AbortController();
    const stopWhenOffline = () => controller.abort();
    window.addEventListener("offline", stopWhenOffline, { once: true });
    setOfflineCachedCount(0);
    setOfflineCacheStatus("preparing");

    void navigator.serviceWorker.ready.then(async () => {
      if (!navigator.serviceWorker.controller) {
        await new Promise<void>((resolve) => {
          const timeout = window.setTimeout(resolve, 2000);
          navigator.serviceWorker.addEventListener("controllerchange", () => {
            window.clearTimeout(timeout);
            resolve();
          }, { once: true });
        });
      }
      if (cancelled) return;
      if (!navigator.onLine) {
        setOfflineCacheStatus("partial");
        window.setTimeout(() => setOfflineCacheStatus(null), 8000);
        return;
      }
      if (!navigator.serviceWorker.controller) {
        setOfflineCacheStatus("error");
        window.setTimeout(() => setOfflineCacheStatus(null), 8000);
        return;
      }

      // Laisse l’écran courant devenir interactif avant de lancer les téléchargements de fond.
      await new Promise((resolve) => window.setTimeout(resolve, 800));
      if (cancelled) return;
      if (controller.signal.aborted || !navigator.onLine) {
        setOfflineCacheStatus("partial");
        window.setTimeout(() => setOfflineCacheStatus(null), 8000);
        return;
      }

      let cachedPages = 0;
      const prepareRoute = async (route: string) => {
        try {
          const response = await fetch(route, {
            credentials: "same-origin",
            cache: "no-store",
            headers: { Accept: "text/html", "x-hf-offline-prefetch": "1" },
            signal: controller.signal,
          });
          const responsePath = new URL(response.url).pathname;
          if (response.ok && !response.redirected && responsePath === route && response.headers.get("content-type")?.includes("text/html")) {
            const pageKey = new Request(new URL(route, window.location.origin).toString());
            const cached = await caches.open("hf-private-pages-v1").then((cache) => cache.match(pageKey, { ignoreVary: true }));
            return Boolean(cached);
          }
          return false;
        } catch {
          return false;
        }
      };

      // Trois pages en parallèle réduisent nettement l’attente sans saturer le téléphone.
      for (let index = 0; index < routes.length; index += 3) {
        if (cancelled || controller.signal.aborted || !navigator.onLine) break;
        const results = await Promise.all(routes.slice(index, index + 3).map(prepareRoute));
        cachedPages += results.filter(Boolean).length;
        setOfflineCachedCount(cachedPages);
      }
      if (!cancelled) {
        setOfflineCacheStatus(cachedPages === routes.length ? "ready" : cachedPages > 0 ? "partial" : "error");
        window.setTimeout(() => setOfflineCacheStatus(null), 8000);
      }
    }).catch(() => {
      if (!cancelled) {
        setOfflineCacheStatus("error");
        window.setTimeout(() => setOfflineCacheStatus(null), 8000);
      }
    });

    return () => {
      cancelled = true;
      controller.abort();
      window.removeEventListener("offline", stopWhenOffline);
    };
  }, [admin]);
  useEffect(() => {
    if (!open) return;
    const old = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
      if (e.key === "Tab") {
        const items = sheetRef.current?.querySelectorAll<HTMLElement>('a[href], button:not(:disabled), input:not(:disabled)');
        if (!items?.length) return;
        const first = items[0]; const last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = old; window.removeEventListener("keydown", onKey); };
  }, [open]);

  const labLogo = <div className="flex items-center gap-3">{lab.logoUrl ? <img src={lab.logoUrl} alt="" className="h-11 w-11 shrink-0 rounded-[14px] bg-white object-contain p-1" /> : <BrandMark className="bg-white/10" />}<div className="min-w-0"><p className="truncate font-display text-base font-extrabold tracking-tight text-white">{lab.name}</p><p className="mt-1 truncate text-[13px] text-white/70">{lab.school}</p></div></div>;
  const navigation = <nav aria-label="Navigation du lab" className="space-y-1">{nav.map((n) => <div key={n.href}>{n.section && <p className="mb-3 mt-6 px-3 first:mt-0 text-[13px] font-semibold uppercase tracking-[0.18em] text-white/70">{n.section}</p>}<Link href={n.href} onClick={() => setOpen(false)} aria-current={active(n.href) ? "page" : undefined} className={cn("flex min-h-11 items-center gap-3 rounded-xl px-3 text-[15px] font-medium transition", active(n.href) ? "bg-lime text-forest" : "text-white/70 hover:bg-white/5 hover:text-white")}><n.icon className="h-[17px] w-[17px] shrink-0 stroke-[1.7]" /><span>{n.label}</span>{active(n.href) && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-forest/60" />}</Link></div>)}</nav>;
  const profile = <div className="border-t border-white/10 pt-4">{admin && <><Link href="/abonnement" onClick={() => setOpen(false)} className="mb-2 flex items-center justify-between rounded-xl border border-white/10 px-3 py-2.5 text-[11px] font-bold text-white/70 hover:border-lime/50 hover:text-lime"><span className="inline-flex items-center gap-2"><CreditCard className="h-3.5 w-3.5" /> {subscription?.exempt ? "Accès gratuit du lab" : "Abonnement du lab"}</span><ArrowUpRight className="h-3.5 w-3.5" /></Link>{subscription && <p className={cn("mb-3 rounded-lg px-3 py-2 text-[10px] font-bold", subscription.exempt || subscription.phase === "active" ? "bg-lime/15 text-lime" : subscription.phase === "trial" || (subscription.phase === "pending" && subscription.accessAvailable) ? "bg-togo-yellow/20 text-togo-yellow" : "bg-togo-red/15 text-red-200")}>{subscription.exempt ? "✓ Accès responsable · gratuit et permanent" : subscription.phase === "active" ? `✓ ${PLAN_LABEL[subscription.plan]} · jusqu’au ${subscriptionDate}` : subscription.phase === "trial" ? `Essai gratuit · jusqu’au ${subscriptionDate}` : subscription.phase === "pending" ? subscription.accessAvailable ? `Paiement en vérification · accès jusqu’au ${subscriptionDate}` : "Validation en attente · accès suspendu" : subscription.phase === "expired" ? "Abonnement expiré · renouvellement requis" : "Lab suspendu · contactez la plateforme"}</p>}</>}<div className="flex items-center gap-3"><Link href={admin ? "/admin/identite" : "/app/profil"} onClick={() => setOpen(false)} className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/10 text-[13px] font-semibold text-lime" aria-label="Mon profil">{initials || "U"}</Link><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium text-white">{user.name}</p><p className="mt-0.5 text-[13px] text-white/70">{admin ? "Responsable du lab" : user.role === "external" ? "Membre externe" : "Espace élève"}</p></div><OfflineLogoutButton className="grid h-9 w-9 place-items-center rounded-full text-white/70 hover:bg-white/10 hover:text-white" ariaLabel="Se déconnecter"><LogOut className="h-4 w-4" /></OfflineLogoutButton></div></div>;

  return (
    <div className="min-h-screen bg-background" onClickCapture={navigateFromOfflineCache}>
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[242px] flex-col bg-forest px-4 py-6 lg:flex">
        <Link href={admin ? "/admin" : "/app"} className="px-2">{labLogo}</Link>
        <div className="no-scrollbar mt-4 min-h-0 flex-1 overflow-y-auto">{navigation}</div>
        <div className="py-5"><Link href={lab.slug ? `/lab/${lab.slug}` : "/"} className="flex items-center justify-between rounded-xl border border-white/15 px-3 py-3 text-[13px] text-white/70 transition hover:border-lime/50 hover:text-lime">Voir la vitrine du lab<ArrowUpRight className="h-3.5 w-3.5" /></Link></div>
        {profile}
        <p className="mt-5 text-center text-[13px] tracking-wide text-white/70">PROPULSÉ PAR HUGO FABLAB</p>
      </aside>

      <div className="min-w-0 lg:pl-[242px]">
        <header className="sticky top-0 z-30 border-b border-border/70 bg-background/95 backdrop-blur-xl">
          <div className="flex h-[72px] items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
            <div className="flex min-w-0 items-center gap-3"><button type="button" onClick={() => setOpen(true)} className="icon-button lg:hidden" aria-label="Ouvrir le menu du lab" aria-expanded={open}><Menu className="h-4.5 w-4.5" /></button><div className="min-w-0"><p className="hidden items-center gap-2 text-[13px] text-muted-foreground sm:flex">Mon espace<ChevronRight className="h-3 w-3" /><span className="font-medium text-foreground">{current?.label ?? "Notifications"}</span></p><p className="max-w-[155px] truncate font-display text-sm font-bold sm:hidden">{lab.name}</p><p className="hidden text-[13px] text-muted-foreground lg:block">{lab.school}</p></div></div>
            <div className="flex shrink-0 items-center gap-2 sm:gap-3">
              <Link href="/app/reserver" className={buttonClass("primary", "sm", "hidden md:inline-flex")}><Plus className="h-3.5 w-3.5" />Réserver</Link>
              <div className="hidden sm:block"><SoundToggle /></div>
              <div className="hidden sm:block"><ThemeToggle /></div>
              <Link href="/app/notifications" aria-label={unread ? `Notifications, ${unread} non lues` : "Notifications"} className="icon-button relative"><Bell className="h-4.5 w-4.5" />{unread > 0 && <span className="absolute -right-0.5 -top-0.5 grid h-[17px] min-w-[17px] place-items-center rounded-full border-2 border-background bg-togo-red px-0.5 text-[13px] font-bold text-white">{unread > 99 ? "99+" : unread}</span>}</Link>
              <Link href={admin ? "/admin/identite" : "/app/profil"} aria-label="Mon profil" className="grid h-9 w-9 place-items-center rounded-full bg-lime text-[13px] font-bold text-forest lg:hidden">{initials || "U"}</Link>
            </div>
          </div>
        </header>
        <main className="stagger mx-auto w-full min-w-0 max-w-[1460px] px-4 pb-[110px] pt-6 sm:px-6 sm:pt-8 lg:px-8 lg:pb-10">{children}</main>
      </div>

      <nav className="mobile-safe-bottom fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card/95 backdrop-blur-xl lg:hidden" aria-label="Navigation rapide">
        <ul className="mx-auto grid max-w-xl grid-cols-5">{bottom.map((n) => <li key={n.href}><Link href={n.href} aria-current={active(n.href) ? "page" : undefined} className={cn("flex min-h-[60px] flex-col items-center justify-center gap-1.5 text-[13px] font-semibold", active(n.href) ? "text-togo-green dark:text-lime" : "text-muted-foreground")}><span className={cn("grid h-7 w-10 place-items-center rounded-full", active(n.href) && "bg-togo-green/10 dark:bg-lime/10")}><n.icon className="h-[18px] w-[18px]" /></span>{n.href === "/app" || n.href === "/admin" ? "Accueil" : n.href.endsWith("reserver") ? "Réserver" : n.href.endsWith("ressources") ? "Machines" : n.href.endsWith("reservations") ? "Réservations" : "Calendrier"}</Link></li>)}<li><button type="button" onClick={() => setOpen(true)} className="flex min-h-[60px] w-full flex-col items-center justify-center gap-1.5 text-[13px] font-semibold text-muted-foreground" aria-label="Tous les menus"><span className="grid h-7 w-10 place-items-center"><Ellipsis className="h-5 w-5" /></span>Plus</button></li></ul>
      </nav>

      {offlineCacheStatus && <p role="status" className="fixed bottom-24 left-1/2 z-40 max-w-[calc(100vw-2rem)] -translate-x-1/2 rounded-full border border-border bg-card px-4 py-2 text-center text-sm font-medium text-foreground shadow-lg lg:bottom-6">{offlineCacheStatus === "preparing" ? `Préparation de l’accès hors ligne… ${offlineCachedCount}/${admin ? 13 : 7}` : offlineCacheStatus === "ready" ? `Accès hors ligne prêt : ${offlineCachedCount} écrans enregistrés.` : offlineCacheStatus === "partial" ? `Accès hors ligne partiel : ${offlineCachedCount} écrans enregistrés.` : "Préparation hors ligne impossible. Vérifie la connexion et recharge l’application."}</p>}

      {open && <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm lg:hidden" onClick={() => setOpen(false)}><div ref={sheetRef} role="dialog" aria-modal="true" aria-label="Tous les menus du FabLab" className="dialog-in absolute inset-y-0 left-0 flex w-full max-w-[330px] flex-col bg-forest px-5 pb-6 pt-5 shadow-2xl" onClick={(e) => e.stopPropagation()}><div className="mb-6 flex items-center justify-between gap-3"><div className="min-w-0">{labLogo}</div><button ref={closeRef} type="button" onClick={() => setOpen(false)} className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/10 text-white" aria-label="Fermer le menu"><X className="h-4 w-4" /></button></div><div className="no-scrollbar min-h-0 flex-1 overflow-y-auto">{navigation}<Link href={lab.slug ? `/lab/${lab.slug}` : "/"} onClick={() => setOpen(false)} className="mt-6 flex items-center justify-between border-t border-white/10 px-3 py-4 text-sm text-white/70">Vitrine du lab<ArrowUpRight className="h-4 w-4" /></Link></div><div className="mb-5 flex items-center justify-between rounded-xl bg-white/5 px-3 py-2"><span className="text-[13px] text-white/70">Son & apparence</span><div className="flex gap-2"><SoundToggle /><ThemeToggle /></div></div>{profile}</div></div>}
    </div>
  );
}
