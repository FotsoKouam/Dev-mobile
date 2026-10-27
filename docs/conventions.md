# Conventions du projet

Règles de travail communes à toute l'équipe (4 personnes) et à Antigravity. Le vocabulaire métier est défini dans `docs/glossary.md` : le lire en premier.

Les lignes marquées *(proposé)* n'ont pas encore été discutées par toute l'équipe.

---

## 1. Langue et nommage

**Le code est en anglais, l'interface est en français.**

- Anglais : routes, classes, entités, colonnes SQL, champs JSON, énumérations, noms de fichiers, messages de commit.
- Français : tout ce que l'utilisateur lit. Ces textes passent par des fichiers de traduction (outil à choisir pour Angular et pour React Native). Aucun texte français écrit en dur dans un composant. Le français est la langue principale ; l'architecture doit permettre d'en ajouter d'autres (cahier des charges §6).
- Pas d'accents ni d'espaces dans les identifiants, les noms de fichiers et les colonnes SQL.

| Élément | Style | Exemple |
|---|---|---|
| Classes, entités, interfaces | `PascalCase` | `School`, `CreateProgramDto` |
| Variables, fonctions, champs JSON | `camelCase` | `schoolId`, `createdAt` |
| Tables et colonnes SQL | `snake_case`, tables au pluriel | `programs`, `school_id` |
| Valeurs d'énumération | `snake_case` | `school_admin`, `scanned_pdf` |
| Fichiers (Angular, Nest) | `kebab-case` | `school-list.component.ts`, `schools.controller.ts` |
| Variables d'environnement | `UPPER_SNAKE_CASE` | `DATABASE_URL` |

---

## 2. API REST

**Préfixe et documentation**
- Toutes les routes sont sous `/api` (`setGlobalPrefix('api')` dans Nest).
- La documentation est générée avec `@nestjs/swagger` et servie sur `/api/docs`. C'est le contrat entre le backend, le web et le mobile.

**Routes**
- Noms au pluriel, en minuscules, sans verbe : `/api/schools`, pas `/api/getSchools`.
- Un seul niveau d'imbrication, pour lister ou créer sous un parent. Ensuite on accède directement à la ressource.
- Pas de `DELETE` pour les écoles, filières et utilisateurs : la désactivation est logique, avec `PATCH` et `status: 'inactive'`.
- Pour les documents, la suppression est logique : un document supprimé n'est plus jamais récupéré dans les nouvelles réponses.

Première tranche :

```
GET    /api/schools                      liste (?page=1&limit=10&status=active&search=...)
POST   /api/schools                      créer une école
GET    /api/schools/:id                  détail
PATCH  /api/schools/:id                  modifier / désactiver

GET    /api/schools/:schoolId/programs   filières d'une école
POST   /api/schools/:schoolId/programs   créer une filière
GET    /api/programs/:id                 détail d'une filière
PATCH  /api/programs/:id                 modifier / désactiver
```

La suite suivra le même modèle : `/api/programs/:programId/spaces`, puis `/api/spaces/:spaceId/documents`.

**Format des échanges**
- JSON en `camelCase`.
- Liste : `{ "data": [ ... ], "meta": { "page": 1, "limit": 10, "total": 42 } }`.
- Erreurs : format standard de Nest (`statusCode`, `message`, `error`).
- Entrées validées avec des DTO et `class-validator`. Les entités TypeORM ne sont jamais renvoyées telles quelles : on renvoie des DTO de réponse.
- Codes HTTP : `200` lecture/modification, `201` création, `400` données invalides, `401` non connecté, `403` droits insuffisants, `404` introuvable, `409` conflit (doublon).
- Identifiants en UUID. *(proposé)*
- Dates en ISO 8601, en UTC (`2026-10-21T09:30:00Z`). *(proposé)*

---

## 3. Architecture du code

L'architecture est imposée par le cahier des charges (§6 et §10) : architecture orientée composants et patrons de conception respectés.

### Backend (Nest.js) : MVC en couches
- Un **module par fonctionnalité** : `schools/`, `programs/`, `spaces/`, `documents/`, `users/`…
- Dans chaque module : `*.controller.ts`, `*.service.ts`, `*.entity.ts`, `dto/`.
- **Controller** : reçoit la requête, valide, appelle le service, renvoie la réponse. Aucune logique métier.
- **Service** : toute la logique métier.
- **Repository (TypeORM)** : accès à la base. Les services ne contiennent pas de SQL.
- La recherche vectorielle (SQL brut) est isolée dans **un seul module** de recherche.

### Web (Angular) : MVVM
- Composants standalone, **un dossier par écran** dans `features/`.
- Le composant est la vue et son modèle de vue ; les services injectés sont le modèle.
- Les appels HTTP sont uniquement dans les services (`core/`). Les composants ne font pas d'appel direct.
- Composants réutilisables dans `shared/` : tableau, badge de statut, panneau latéral, fenêtre modale, carte statistique.
- L'URL de l'API vient de `environment.ts` / `environment.prod.ts`, jamais écrite en dur.

### Mobile (React Native / Expo) : MVVM par hooks
- Les composants sont la vue ; les **hooks personnalisés** sont le modèle de vue (`useChat()`, `useSpaces()`…) ; les appels API et le stockage local sont le modèle.
- L'URL de l'API vient du fichier de configuration centralisé, jamais écrite en dur.

---

## 4. Base de données

- PostgreSQL, accédée avec **TypeORM**.
- **Les migrations sont obligatoires** pour tout changement de structure. Jamais `synchronize: true`, ni en local partagé ni en production.
- Une migration par changement, committée avec le code qui en dépend, relue en PR avant d'être appliquée.
- Chaque table a `id`, `created_at`, `updated_at`.
- Les données de départ (les 5 rôles système, les permissions) sont créées par un script de *seed* versionné, pas à la main.
- La connexion se fait avec la variable `DATABASE_URL`.
- **Toute propriété qui référence une autre entité est typée avec `Relation<>`** (importé depuis `typeorm` via `import type { Relation } from 'typeorm'`). Exemple : `school: Relation<School>`, `programs: Relation<Program[]>`. Cela évite l'erreur `ReferenceError: Cannot access '...' before initialization` causée par les imports circulaires entre entités sous Node 24 / ESM avec `emitDecoratorMetadata`. L'import `type` est obligatoire car `isolatedModules: true` interdit de mélanger des valeurs runtime et des types dans le même import (TS1272).

---

## 5. Sécurité

Règles à ne jamais enfreindre :

1. **Aucun secret dans le code ni dans Git** : mots de passe, clés d'API, `DATABASE_URL`. Ils vont dans un fichier `.env` local (ignoré par Git) et dans les variables d'environnement de Render ou Vercel. Un `.env.example` sans valeurs est committé pour documenter les variables attendues.
2. **Le filtrage des accès se fait dans la requête de recherche**, jamais après la génération de la réponse. Un passage non autorisé ne doit pas pouvoir entrer dans le contexte du modèle (cahier des charges §4.7).
3. **Les espaces personnels ne sont jamais visibles dans le portail web**, y compris par un administrateur.
4. Seuls les administrateurs créent des écoles, des filières et des espaces institutionnels.
5. Aucune autorisation n'est accordée uniquement parce qu'un compte Google est valide : le backend vérifie le compte interne, son statut, ses affectations et ses rôles.
6. Les actions d'administration sont journalisées dans l'audit.

---

## 6. Git et revues

- `main` est protégée : pas de push direct, PR obligatoire, CI verte obligatoire.
- **Une branche par tâche**, créée à partir d'un `main` à jour (`git checkout main && git pull`).
- Noms de branche : `feature/…`, `fix/…`, `chore/…`, `docs/…`. Exemple : `feature/schools-crud`.
- Messages de commit : `feat:`, `fix:`, `chore:`, `ci:`, `docs:`, `refactor:`, `test:`, suivis d'une description courte en anglais.
- **PR petites**, une idée par PR, qui s'appuient sur les conventions de ce document.
- La branche est supprimée après le merge.
- Ne jamais committer `node_modules/`, `.env`, `dist/`, ni les clés de signature Android.
- Les modifications de ces fichiers de conventions passent par PR comme le reste du code.

---

## 7. Tests et qualité

- La CI exécute lint, tests et build pour chaque dossier concerné (`backend/`, `web/`, `mobile/`). Une PR n'est mergée que si elle est verte.
- Chaque service du backend a au moins un test unitaire sur sa logique métier.
- Chaque nouvelle route est documentée dans Swagger (décorateurs `@nestjs/swagger`).
- Les trois pipelines CI restent séparées : le mobile et le backend ne partagent jamais de pipeline.

---

## 8. Ce qui reste hors périmètre pour l'instant

- Réalité augmentée et profil Technicien terrain.
- Publication automatique sur le Play Store : volontairement manuelle, à la présentation finale.
