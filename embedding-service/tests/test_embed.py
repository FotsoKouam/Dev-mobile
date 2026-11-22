import pytest
import numpy as np
from fastapi.testclient import TestClient
from main import app, DIMENSION
import main


class FakeSentenceTransformer:
    def __init__(self, model_name=None):
        self.model_name = model_name

    def encode(self, texts, normalize_embeddings=True, convert_to_numpy=True):
        count = len(texts)
        np.random.seed(42)
        raw_vectors = np.random.randn(count, DIMENSION).astype(np.float32)

        if normalize_embeddings:
            norms = np.linalg.norm(raw_vectors, axis=1, keepdims=True)
            raw_vectors = raw_vectors / norms

        if convert_to_numpy:
            return raw_vectors
        return raw_vectors.tolist()


@pytest.fixture(autouse=True)
def mock_model(monkeypatch):
    # Remplacer la classe SentenceTransformer pour empêcher tout téléchargement lors du lifespan
    fake = FakeSentenceTransformer()
    monkeypatch.setattr(main, "SentenceTransformer", lambda *args, **kwargs: fake)
    monkeypatch.setattr(main, "model", fake)
    yield


@pytest.fixture
def client():
    with TestClient(app) as test_client:
        yield test_client


def test_health(client):
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["model"] == "multilingual-e5-base"
    assert data["dimension"] == 768


def test_embed_dimension_and_normalization(client):
    texts = ["passage: Document de test 1", "passage: Document de test 2"]
    response = client.post("/embed", json={"texts": texts})
    assert response.status_code == 200
    data = response.json()

    assert data["dimension"] == 768
    assert len(data["embeddings"]) == 2

    # Vérification dimension de chaque vecteur
    for vec in data["embeddings"]:
        assert len(vec) == 768
        norm = np.linalg.norm(vec)
        assert pytest.approx(norm, 1e-4) == 1.0


def test_embed_422_empty_list(client):
    response = client.post("/embed", json={"texts": []})
    assert response.status_code == 422


def test_embed_422_too_many_texts(client):
    texts = [f"passage: texte {i}" for i in range(65)]
    response = client.post("/embed", json={"texts": texts})
    assert response.status_code == 422


def test_embed_422_text_too_long(client):
    long_text = "passage: " + "a" * 4001
    response = client.post("/embed", json={"texts": [long_text]})
    assert response.status_code == 422
