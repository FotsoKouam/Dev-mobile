# ADR 0001 : Choix techniques pour le pipeline documentaire et le RAG

## Statut

Partiellement remplacé par 0003 (accès aux espaces).
Partiellement remplacé par 0002 (embeddings) — 23 novembre 2026.

Proposé (20 novembre 2026, à valider avec M. Pessa).

## Contexte

Le projet CampusIA intègre un assistant documentaire reposant sur une architecture RAG (*Retrieval-Augmented Generation* ou génération augmentée par récupération) pour un établissement d'enseignement.
Les documents pris en charge sont variés : documents PDF natifs, documents PDF scannés et images numérisées.
Le projet dispose d'un budget nul pour l'infrastructure et les services tiers.
Le cahier des charges impose deux contraintes majeures :
- Une première réponse retournée en moins de 8 secondes ;
- Le français comme langue principale de traitement et d'échange.

Enfin, les réponses générées doivent impérativement citer leurs sources exactes et ne doivent jamais inventer d'informations (absence d'hallucination).

## Décision

1. **Reconnaissance optique de caractères (OCR)** :
   Utilisation de Tesseract en local avec le pack linguistique français (`fra`). Tesseract est exécuté uniquement pour les PDF scannés et les fichiers image. Les PDF natifs voient leur texte extrait directement sans passer par l'OCR.

2. **Génération des vecteurs sémantiques (Embeddings)** :
   Utilisation du modèle `multilingual-e5-base` exécuté localement, produisant des vecteurs de dimension 768. Il est encapsulé dans un service Python dédié et exposé via une API interne.

3. **Modèle de langage (LLM)** :
   Utilisation d'une API gratuite pour l'inférence. Le choix prioritaire est Groq (palier gratuit avec modèles open source rapides comme Llama 3). Les alternatives gratuites retenues sont Google Gemini ou Mistral.
   L'appel est encapsulé derrière une interface applicative `LlmService` permettant de changer de fournisseur sans réécrire le code métier.

4. **Stockage vectoriel** :
   Utilisation de l'extension `pgvector` directement sur l'instance PostgreSQL existante du projet.
   ```sql
   embedding vector(768)
   ```

5. **Confidentialité et gouvernance des données** :
   Seuls les courts extraits de texte retenus pour répondre à une question utilisateur sont envoyés au LLM externe, jamais le corpus documentaire complet. Les documents utilisés pour les démonstrations et tests doivent être strictement non sensibles. Les conditions d'utilisation du fournisseur LLM retenu doivent être vérifiées et archivées avec leur date d'évaluation.

## Alternatives écartées

- **OCR via API Cloud (Google Cloud Vision, AWS Textract)** : Écarté car payant à l'usage et impliquant l'envoi de documents complets vers des serveurs tiers.
- **Calcul des embeddings via API externe (OpenAI, Cohere)** : Écarté en raison des coûts ou des quotas gratuits trop contraignants pour indexer un volume important de documents.
- **LLM hébergé en local (ex. via Ollama sur CPU/GPU local)** : Écarté en raison du besoin de ressources matérielles GPU inexistantes sur les hébergements gratuits, et d'une latence d'inférence incompatible avec le seuil des 8 secondes.
- **Grok comme LLM externe** : Écarté en raison d'un palier gratuit incertain et de conditions d'utilisation sur la réutilisation des données nécessitant des vérifications complémentaires.

## Conséquences

- La dimension vectorielle de 768 est figée dans la base de données via `pgvector`. Tout changement futur de modèle d'embeddings nécessitera une réindexation complète de l'ensemble des documents.
- L'isolation du composant LLM derrière l'interface `LlmService` permet de basculer vers un LLM payant ou un modèle local sans impacter le reste du backend.
- L'outil système Tesseract et son paquet de données `fra` doivent être présents sur l'environnement d'exécution de production. Cette dépendance système doit être validée préalablement sur la plateforme d'hébergement cible (notamment Render).
- La précision de l'OCR local sera inférieure sur les numérisations dégradées, de faible contraste ou manuscrites.

## Points ouverts

1. Validation formelle par M. Pessa concernant l'envoi d'extraits documentaires ciblés vers un fournisseur d'API LLM externe.
2. Choix final du fournisseur LLM (Groq, Gemini ou Mistral) selon la disponibilité effective des quotas gratuits au moment de la mise en production.
3. Choix de l'hébergement dédié pour le micro-service Python de calcul d'embeddings.
