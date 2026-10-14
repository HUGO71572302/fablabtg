import { Plus } from "lucide-react";

export function Faq() {
  const questions = [
    ["À qui s'adresse HUGO FABLAB ?", "À toutes les écoles qui disposent d'un atelier, et à leurs élèves de la 6e à la Terminale. Le responsable gère son propre lab ; chaque élève rejoint celui de son établissement."],
    ["Faut-il un e-mail pour inscrire un élève ?", "Non. L'élève choisit un identifiant et un code PIN de 4 à 6 chiffres. Il indique sa classe et un numéro de téléphone (le sien ou celui d'un parent). Il peut se connecter dès l'inscription."],
    ["Puis-je utiliser l'application sur mon téléphone ?", "Oui, sur Android et iPhone, comme sur ordinateur. Sur Android/Chrome, choisissez « Installer l'application » ; sur iPhone/Safari, « Partager » puis « Sur l'écran d'accueil ». Une connexion internet reste nécessaire pour réserver."],
    ["Comment réserver une machine en toute sécurité ?", "L'élève propose un créneau disponible. Le responsable le valide et vérifie son niveau d'autonomie. Les machines sensibles sont accessibles seulement après validation du niveau requis. Confirmation, modification et annulation sont notifiées en direct."],
  ];
  return <div className="divide-y divide-border">{questions.map(([q, a]) => <details key={q} className="group"><summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-5 text-[15px] font-semibold [&::-webkit-details-marker]:hidden">{q}<Plus className="h-4 w-4 shrink-0 text-muted-foreground transition group-open:rotate-45" /></summary><p className="max-w-2xl pb-5 pr-5 text-[15px] leading-7 text-muted-foreground">{a}</p></details>)}</div>;
}
