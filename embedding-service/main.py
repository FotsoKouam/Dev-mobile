from contextlib import asynccontextmanager
import logging
from typing import List, Optional
from fastapi import FastAPI, HTTPException, status
from pydantic import BaseModel, Field
import numpy as np
from sentence_transformers import SentenceTransformer

# Désactiver les logs verbeux ou fuites de données
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("embedding-service")

MODEL_NAME = "intfloat/multilingual-e5-base"
DIMENSION = 768

model: Optional[SentenceTransformer] = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global model
    logger.info("Chargement du modèle %s...", MODEL_NAME)
    # Chargé une seule fois au démarrage
    model = SentenceTransformer(MODEL_NAME)
    logger.info("Modèle %s chargé avec succès (dim=%d)", MODEL_NAME, DIMENSION)
    yield
    model = None


app = FastAPI(title="CampusIA Embedding Service", lifespan=lifespan)


class EmbedRequest(BaseModel):
    texts: List[str] = Field(
        ...,
        min_length=1,
        max_length=64,
        description="Liste de 1 à 64 textes à vectoriser.",
    )


class EmbedResponse(BaseModel):
    embeddings: List[List[float]]
    dimension: int


@app.get("/health")
def health():
    return {
        "status": "ok",
        "model": "multilingual-e5-base",
        "dimension": DIMENSION,
    }


@app.post("/embed", response_model=EmbedResponse)
def embed(request: EmbedRequest):
    # Validation règle 1 : au plus 64 textes (géré par Field max_length=64 et min_length=1)
    if not request.texts:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="La liste des textes ne peut pas être vide.",
        )
    if len(request.texts) > 64:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Le nombre de textes ne peut excéder 64.",
        )

    # Validation règle 1 : au plus 4000 caractères par texte
    for idx, text in enumerate(request.texts):
        if len(text) > 4000:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Le texte à l'index {idx} dépasse la limite autorisée de 4000 caractères.",
            )

    if model is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Le modèle n'est pas encore initialisé.",
        )

    # Calcul des embeddings avec normalisation L2 pour similarité cosinus
    # Aucune donnée journalisée (pas de contenu dans les logs)
    vectors = model.encode(
        request.texts,
        normalize_embeddings=True,
        convert_to_numpy=True,
    )

    # Conversion en liste Python de floats
    embeddings_list = vectors.tolist()

    return EmbedResponse(
        embeddings=embeddings_list,
        dimension=DIMENSION,
    )


if __name__ == "__main__":
    import uvicorn

    # Écouter sur 127.0.0.1 uniquement
    uvicorn.run(app, host="127.0.0.1", port=8001)
