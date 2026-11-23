# ADR 0002 : Remplacement des embeddings locaux par l'API Gemini

## Statut

Proposé (23 novembre 2026, à valider avec M. Pessa).

## Contexte

Le cahier des charges (section 2.3) exige « un service d'embeddings compatible avec le traitement multilingue », sans préciser son lieu d'hébergement.

L'ADR 0001 prévoyait l'utilisation du modèle `intfloat/multilingual-e5-base` exécuté localement, produisant des vecteurs de 768 dimensions, encapsulé dans un service Python dédié (`embedding-service/`).

Deux contraintes empêchent ce déploiement en production :
- Le plan gratuit Render est limité à 512 Mo de RAM. Le modèle `multilingual-e5-base` requiert environ 2 Go de RAM au démarrage.
- Le plan 2 Go Render (Standard) n'est pas financé. Le budget du projet est nul.

## Décision

Les vecteurs sémantiques sont désormais calculés via l'API Gemini, avec le modèle **`gemini-embedding-2`** (stable, annoncé en avril 2026).

1. **Dimension** : fixée à 768 avec le paramètre `output_dimensionality=768`. La colonne `embedding vector(768)` de la base de données reste inchangée : aucune migration de schéma n'est nécessaire.

2. **Tâches de vectorisation** :
   - `RETRIEVAL_DOCUMENT` lors de l'indexation des passages.
   - `RETRIEVAL_QUERY` lors de la recherche par question.

3. **Normalisation** : les vecteurs reçus sont normalisés en L2 côté backend, par prudence, avant insertion en base.

4. **Niveau tarifaire et confidentialité** :
   - Niveau gratuit : Google peut utiliser les contenus envoyés pour améliorer ses produits (mention « Used to improve our products : Yes », page Pricing de l'API Gemini, consultée le 23 novembre 2026).
   - **Décision** : seuls des documents de démonstration non sensibles sont indexés avec le niveau gratuit. Aucun procès-verbal, contrat, cours ou donnée personnelle d'étudiant ne doit être envoyé.
   - Bascule prévue vers le niveau payant (0,20 $ par million de tokens, « Used to improve our products : No ») dès que des données réelles doivent être traitées. Ce changement ne nécessite ni modification de code ni migration de dimension.

5. **Quotas** (relevés dans AI Studio pour le projet « Gemini Project 2 », le 23 novembre 2026) :
   - Modèle Gemini Embedding 2 : 100 requêtes par minute (RPM), 30 000 tokens par minute (TPM), 1 000 requêtes par jour (RPD).
   - Ces limites sont à revérifier avant tout usage intensif ou passage en production réelle.

## Alternatives écartées

- **Embeddings locaux (`multilingual-e5-base`)** : non déployable en gratuit sur Render ; modèle de 1,1 Go, incompatible avec le plan 512 Mo.
- **`multilingual-e5-small`** : risque de crash mémoire sur 512 Mo ; dimension 384, incompatible avec la colonne `vector(768)` existante.
- **Mistral `mistral-embed`** : dimension 1024, nécessite une migration de colonne et une réindexation complète ; conservé en plan de secours.
- **Grok** : pas d'API d'embeddings confirmée au moment de la rédaction.
- **Niveau payant Gemini pour tout** : non retenu à ce stade en raison du budget nul.

## Conséquences

- Le service Python `embedding-service/` n'est plus utilisé par le backend. Il est retiré du déploiement ; son code est conservé dans le dépôt jusqu'à la validation formelle de cet ADR.
- `EmbeddingClient` appelle l'API Gemini au lieu de `POST /embed` sur le service local.
- La variable d'environnement `EMBEDDING_SERVICE_URL` est remplacée par une clé d'API (`GEMINI_API_KEY`), stockée hors Git et fournie via les variables d'environnement Render.
- Le service `rag-embeddings` décrit dans le `render.yaml` n'est pas créé.
- Les passages déjà vectorisés avec un autre modèle devront être réindexés. Aucun passage de production n'est indexé à ce jour : la réindexation est sans objet pour l'instant.
- **Restriction en vigueur** : aucun document sensible ne peut être traité tant que le niveau gratuit est actif.

## Points ouverts

1. Validation de M. Pessa sur le niveau gratuit et la restriction aux documents de démonstration non sensibles.
2. Vérification réelle de la dimension renvoyée par l'API (un appel de test doit confirmer 768 valeurs par vecteur).
3. Vérification des conditions de confidentialité sur la page Pricing officielle Gemini à la date de validation de cet ADR.
