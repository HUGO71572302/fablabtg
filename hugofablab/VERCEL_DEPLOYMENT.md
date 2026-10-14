# Déployer HUGO FABLAB sur Vercel — guide fiable

Ce guide corrige la majorité des erreurs « Cette page n'a pas pu s'afficher » sur Vercel : en pratique, elles viennent presque toujours de `DATABASE_URL` absent, d'une base Supabase non migrée, ou d'une URI Google différente de celle attendue.

> **URL de santé après déploiement** : `https://VOTRE-DOMAINE/api/health` doit retourner `{ "ok": true }`.

---

## 1. Créer la base Supabase

1. Ouvrir [Supabase](https://supabase.com) → **New project**.
2. Choisir une région proche (Europe ou Afrique du Sud selon disponibilité).
3. Dans **Connect**, copier la chaîne **Transaction Pooler** (port `6543`). Elle ressemble à :

```text
postgresql://postgres.PROJECT_REF:VOTRE_MOT_DE_PASSE@aws-0-REGION.pooler.supabase.com:6543/postgres
```

4. Sur votre ordinateur, à la racine du projet, appliquer le schéma :

```bash
DATABASE_URL='VOTRE_URL_SUPABASE' DATABASE_SSL=require npx drizzle-kit push
```

Cette commande crée les tables des labs, comptes, réservations, stock, notes, abonnements et paiements.

### Mise à jour d'une base déjà déployée

Pour activer la mise en pause réversible d'un lab, ajoutez la colonne `active` à la base de production avant de redéployer le nouveau code. Dans Supabase → **SQL Editor**, exécutez :

```sql
ALTER TABLE public.labs
ADD COLUMN IF NOT EXISTS active boolean NOT NULL DEFAULT true;
```

Cette migration laisse les labs existants actifs et ne supprime ni ne modifie leurs données.

### Base vierge ou démonstration ?

- Pour créer uniquement vos vrais labs : ajoutez `AUTO_SEED=false` dans Vercel, puis ouvrez `/creer-mon-lab` après déploiement.
- Pour conserver la démonstration HUGO FABLAB : ne définissez pas `AUTO_SEED=false`.

---

## 2. Variables à renseigner dans Vercel

Vercel → **Project → Settings → Environment Variables**. Cochez au minimum **Production** et **Preview** pour chaque variable essentielle.

| Variable | Valeur / exemple | Obligatoire |
|---|---|---|
| `DATABASE_URL` | URL Transaction Pooler Supabase | ✅ |
| `DATABASE_SSL` | `require` | ✅ recommandé |
| `AUTO_SEED` | `false` pour une base de production vierge | recommandé |
| `APP_URL` | `https://votre-domaine.vercel.app` ou domaine final | ✅ recommandé |
| `ALLOWED_ORIGINS` | `votre-domaine.vercel.app` | ✅ recommandé |
| `GOOGLE_CLIENT_ID` | Client ID Google | si Google |
| `GOOGLE_CLIENT_SECRET` | Secret Google | si Google |
| `GOOGLE_REDIRECT_URI` | `https://votre-domaine/api/auth/google/callback` | si Google |
| `PLATFORM_ADMIN_EMAILS` | `hkabrame@gmail.com` (une seule adresse pour un responsable unique) | recommandé |
| `MOBILE_MONEY_TMOONEY_NUMBER` | `96 93 38 93` | recommandé |
| `MOBILE_MONEY_FLOOZ_NUMBER` | `96 93 38 93` | recommandé |
| `MOBILE_MONEY_RECIPIENT_NAME` | `HUGO FABLAB` | recommandé |

> Ne copiez jamais votre `.env` local dans Git. Le fichier est ignoré volontairement ; les secrets doivent être saisis dans Vercel.

---

## 3. Connexion Google : corriger `redirect_uri_mismatch`

Dans Google Cloud Console → **APIs & Services → Credentials** → votre **OAuth 2.0 Client ID** → type **Web application** :

```text
Authorized JavaScript origins
https://VOTRE-DOMAINE

Authorized redirect URIs
https://VOTRE-DOMAINE/api/auth/google/callback
```

Les trois éléments doivent coïncider **caractère pour caractère** :

1. `APP_URL` dans Vercel ;
2. `GOOGLE_REDIRECT_URI` dans Vercel ;
3. l'URI dans Google Cloud Console.

Après chaque changement de domaine Vercel, mettez à jour les trois. L'application affiche aussi l'URI exacte dans **Admin → Identité du lab → Connexion Google** après connexion.

Si Google affiche « Accès bloqué » après avoir corrigé l'URI : Google Cloud Console → **OAuth consent screen** → ajoutez votre compte aux utilisateurs de test ou passez l'application en production.

---

## 4. Déployer

1. Pousser le projet GitHub/GitLab (sans `.env`).
2. Dans Vercel : **Add New → Project → Import Git Repository**.
3. Framework : Next.js (détecté automatiquement), laisser Build Command : `npm run build`.
4. Ajouter les variables de l'étape 2.
5. Déployer.
6. Ouvrir :

```text
https://VOTRE-DOMAINE/api/health
```

Le résultat attendu :

```json
{"ok":true,"service":"hugo-fablab"}
```

---

## 5. Si Vercel affiche encore « Cette page n'a pas pu s'afficher »

1. Ouvrir Vercel → **Project → Deployments → dernier déploiement → Functions / Logs**.
2. Rechercher la ligne qui précède le `digest` affiché sur la page. Les causes et solutions courantes :

| Log Vercel | Correction |
|---|---|
| `DATABASE_URL is missing` ou `database_not_configured` | Ajouter `DATABASE_URL` dans Vercel, Production + Preview, puis redéployer. |
| `password authentication failed` | Copier à nouveau l'URL Supabase, avec le bon mot de passe. |
| `relation ... does not exist` | Exécuter `npx drizzle-kit push` avec l'URL Supabase depuis l'étape 1. |
| `timeout` / `ECONNREFUSED` | Utiliser l'URL **Transaction Pooler** (port 6543), `DATABASE_SSL=require`. |
| `redirect_uri_mismatch` | Suivre l'étape 3 exactement. |
| `Invalid Server Actions request` | Définir `APP_URL` et `ALLOWED_ORIGINS` avec votre domaine sans `https://` dans `ALLOWED_ORIGINS`. |

### Diagnostic privé (facultatif)

Définissez un secret Vercel `DEPLOYMENT_DIAGNOSTIC_TOKEN`, puis ouvrez :

```text
https://VOTRE-DOMAINE/api/health?token=VOTRE_TOKEN
```

Vous obtiendrez le statut de la connexion sans rendre l'erreur PostgreSQL publique. Ne communiquez jamais ce lien/token à un élève.

---

## 6. Mobile Money et réactivation gratuite

Aucune API Mobile Money payante n'est requise : le responsable paie en TMoney/Flooz, saisit la référence et une preuve ; Hugo valide dans `/gestion-abonnements`. Cette validation active immédiatement le lab. Vous pouvez aussi accorder un accès de courtoisie de 24 h si le paiement est en cours de vérification.

---

## Checklist finale

- [ ] Schéma Supabase appliqué (`drizzle-kit push`)
- [ ] `DATABASE_URL` + `DATABASE_SSL=require` ajoutés dans Vercel
- [ ] `APP_URL` + `ALLOWED_ORIGINS` définis avec le domaine final
- [ ] `/api/health` retourne `ok: true`
- [ ] URI Google enregistrée exactement dans Google Cloud Console
- [ ] `PLATFORM_ADMIN_EMAILS` contient l'adresse d'Hugo
- [ ] Numéros TMoney/Flooz renseignés
- [ ] Premier responsable créé sur `/creer-mon-lab` (si base vierge)
