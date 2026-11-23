FROM python:3.12-slim

WORKDIR /app

# Installation des dépendances Python
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Téléchargement anticipé du modèle au build pour éviter tout téléchargement au runtime
RUN python -c "from sentence_transformers import SentenceTransformer; SentenceTransformer('intfloat/multilingual-e5-base')"

# Copie du code applicatif
COPY main.py .

ENV HOST=0.0.0.0
ENV PORT=8001

EXPOSE 8001

CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8001}"]
