# Service d'embeddings local (CampusIA)

Micro-service FastAPI calculant les vecteurs sémantiques (embeddings) de dimension 768 via le modèle `intfloat/multilingual-e5-base` (décision ADR 0001).

## Déploiement Render

Le service d'embeddings s'exécute dans un conteneur Docker Python avec pré-téléchargement du modèle `intfloat/multilingual-e5-base` (~1,1 Go) lors du build Docker.

### Ordre de déploiement
Déployer **`rag-embeddings` en premier**, avant de configurer `EMBEDDING_SERVICE_URL` sur `rag-backend`.

### Configuration du service `rag-embeddings` sur Render
- **Type :** Web Service
- **Runtime :** Docker
- **Root Directory :** `embedding-service`
- **Plan recommandé :** Standard ou supérieur (**au moins 2 Go de RAM** exigés pour le modèle et SentenceTransformer).

#### Variables d'environnement à définir manuellement dans Render

| Variable | Description / Rôle | Exemple de valeur |
|---|---|---|
| `PORT` | Port d'écoute du serveur FastAPI (fourni par Render) | `8001` ou `10000` |
| `HOST` | Interface réseau d'écoute dans le conteneur | `0.0.0.0` |

Une fois le service déployé, tester l'URL publique :
```bash
curl https://<rag-embeddings-url>/health
# Réponse attendue : {"status":"ok","model":"multilingual-e5-base","dimension":768}
```
L'URL obtenue servira à renseigner `EMBEDDING_SERVICE_URL` dans le service `rag-backend`.

---

## Prérequis

- Python 3.10+
- PyTorch / Sentence-Transformers

## Installation

Dans un environnement virtuel Python dédié :

```bash
cd embedding-service
python -m venv .venv
# Sur Windows :
.venv\Scripts\activate
# Sur Linux / macOS :
source .venv/bin/activate

pip install -r requirements.txt
```

## Lancement

Écoute exclusivement sur `127.0.0.1:8001` :

```bash
uvicorn main:app --host 127.0.0.1 --port 8001
```

> **Note :** Au tout premier lancement, le modèle `intfloat/multilingual-e5-base` (~1,1 Go) est automatiquement téléchargé et mis en cache dans le répertoire HuggingFace par défaut (`~/.cache/huggingface/hub/`).

## Tests

Exécution de la suite de tests unitaires (avec modèle mocké sans téléchargement) :

```bash
pytest
```

## Spécification de l'API

### `GET /health`
Vérifie la disponibilité du service.

**Réponse :**
```json
{
  "status": "ok",
  "model": "multilingual-e5-base",
  "dimension": 768
}
```

### `POST /embed`
Vectorise une liste de textes (au plus 64 textes, au plus 4000 caractères par texte). Chaque passage doit être préfixé par `passage: ` selon la convention E5.

**Corps de la requête :**
```json
{
  "texts": ["passage: Premier texte", "passage: Deuxième texte"]
}
```

**Réponse (HTTP 200) :**
```json
{
  "embeddings": [
    [-0.0123, 0.0456, ...],
    [0.0789, -0.0012, ...]
  ],
  "dimension": 768
}
```

**Erreurs (HTTP 422) :**
- Liste vide
- Plus de 64 textes
- Texte de plus de 4000 caractères
