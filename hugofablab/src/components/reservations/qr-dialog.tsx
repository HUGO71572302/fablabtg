"use client";

import { useEffect, useRef, useState } from "react";
import QRCode from "react-qr-code";
import { Download, QrCode, X } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui";

export function QrDialog({ token, title, subtitle }: { token: string; title: string; subtitle: string }) {
  const [open, setOpen] = useState(false);
  const [origin, setOrigin] = useState("");
  const qr = useRef<HTMLDivElement>(null);
  useEffect(() => setOrigin(window.location.origin), []);
  const download = () => {
    const svg = qr.current?.querySelector("svg");
    if (!svg) return;
    const blob = new Blob([new XMLSerializer().serializeToString(svg)], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `hugo-fablab-${token.slice(0, 8)}.svg`; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  return <><Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}><QrCode className="h-3.5 w-3.5" />Mon QR code</Button>{open && <Modal onClose={() => setOpen(false)} label="QR code de réservation" className="max-w-sm text-center"><div className="mb-5 flex items-start justify-between gap-3 text-left"><div><p className="font-display text-base font-bold">{title}</p><p className="mt-1 text-[13px] text-muted-foreground">{subtitle}</p></div><button type="button" onClick={() => setOpen(false)} className="icon-button" aria-label="Fermer le QR code"><X className="h-4 w-4" /></button></div><div ref={qr} className="mx-auto w-fit rounded-2xl border-2 border-togo-green bg-white p-5"><QRCode value={`${origin}/checkin/${token}`} size={200} fgColor="#173f30" /></div><p className="mt-5 text-sm leading-6 text-muted-foreground">Présentez ce code au responsable à l&apos;entrée de l&apos;atelier pour enregistrer votre présence.</p><Button type="button" variant="primary" className="mt-4 w-full" onClick={download}><Download className="h-4 w-4" />Enregistrer mon QR code</Button><p className="mt-4 font-mono text-[13px] tracking-[0.2em] text-muted-foreground">{token.slice(0, 16).toUpperCase()}</p></Modal>}</>;
}
