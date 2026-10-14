"use client";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="fr">
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif", background: "#f7f6f1", color: "#17251d" }}>
        <main style={{ display: "grid", minHeight: "100vh", placeItems: "center", padding: 24 }}>
          <div style={{ maxWidth: 460, textAlign: "center" }}>
            <h1 style={{ fontSize: 28, margin: 0, fontWeight: 800 }}>HUGO FABLAB n&apos;a pas pu démarrer</h1>
            <p style={{ fontSize: 16, lineHeight: 1.6, color: "#4d5a51", marginTop: 12 }}>Rechargez la page. Si le problème continue, écrivez au responsable : hkabrame@gmail.com</p>
            {error.digest ? <p style={{ fontSize: 13, color: "#4d5a51", fontFamily: "monospace" }}>Réf. {error.digest}</p> : null}
            <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 24 }}>
              <button type="button" onClick={reset} style={{ background: "#1f5a40", color: "#fff", border: 0, borderRadius: 999, padding: "12px 22px", fontSize: 16, fontWeight: 700, cursor: "pointer" }}>Réessayer</button>
              <a href="/" style={{ border: "1px solid #d9dccd", borderRadius: 999, padding: "12px 22px", fontSize: 16, fontWeight: 700, color: "#17251d", textDecoration: "none" }}>Accueil</a>
            </div>
          </div>
        </main>
      </body>
    </html>
  );
}
