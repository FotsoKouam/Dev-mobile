# Projet — Assistant IA documentaire (RAG) pour institution scolaire

## Vue d'ensemble

Application mobile (iOS/Android) permettant à des étudiants et personnels d'une institution scolaire (Saint Jean Institut Universitaire) de dialoguer avec un assistant IA qui répond **exclusivement** à partir de documents importés (PDF, images, scans) propres à l'établissement. Chaque réponse est traçable jusqu'à sa source exacte (document, page, extrait). Un portail web d'administration complète l'application pour la gestion des écoles, utilisateurs, rôles et documents.

Projet réalisé dans le cadre du cours combiné "Architecture Web Avancée & Développement Mobile", Cycle Ingénieur niveau 4, filière Informatique et Systèmes d'Information (Institut Universitaire Saint Jean).

## Structure du Dépôt

Ce dépôt est structuré en monorepo :

- `backend/` : API et Pipeline RAG en Nest.js
- `mobile/` : Application mobile en React Native via Expo
- `web/` : Portail d'administration web en Angular
- `docs/` : Documentation (cadrage, briefs de design, specs)

## Configuration

Les variables d'environnement du backend sont configurées dans `backend/.env` (voir `backend/.env.example` pour les valeurs fictives documentées) :

- `PORT` : Port d'écoute du serveur HTTP (défaut : 3000).
- `DATABASE_URL` : Chaîne de connexion PostgreSQL.
- `DATABASE_SSL` : `true` pour SSL strict (bases distantes), `false` en local.
- `GOOGLE_CLIENT_ID` : Identifiant client OAuth Google (audience attendue).
- `JWT_ACCESS_SECRET` : Clé secrète pour signer les jetons d'accès.
- `JWT_REFRESH_SECRET` : Clé secrète distincte pour les jetons de rafraîchissement.
- `JWT_ACCESS_TTL` : Durée de validité des jetons d'accès (ex. `15m`).
- `JWT_REFRESH_TTL` : Durée de validité des jetons de rafraîchissement (ex. `7d`).
- `ADMIN_SEED_PASSWORD` : Mot de passe initial utilisé uniquement par le script de seed pour initialiser les administrateurs.

## Périmètre

Les profils gérés dans cette itération sont **Étudiant**, **Personnel** et **Administrateur**.
Le mode Réalité Augmentée et le profil "Technicien terrain" sont exclus du développement actuel.
