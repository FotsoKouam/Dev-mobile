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

## Périmètre

Les profils gérés dans cette itération sont **Étudiant**, **Personnel** et **Administrateur**.
Le mode Réalité Augmentée et le profil "Technicien terrain" sont exclus du développement actuel.