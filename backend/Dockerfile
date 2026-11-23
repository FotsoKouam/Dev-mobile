FROM node:24-bookworm-slim AS builder

WORKDIR /app

# Dépendances de compilation et outils système si nécessaire
COPY package.json package-lock.json ./
RUN npm ci

COPY . .

RUN npm run build
RUN npm prune --omit=dev


FROM node:24-bookworm-slim AS runner

WORKDIR /app

# Installation des dépendances système en nettoyant le cache apt dans la même couche
RUN apt-get update && apt-get install -y --no-install-recommends \
    tesseract-ocr \
    tesseract-ocr-fra \
    poppler-utils \
    qpdf \
 && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production
ENV PORT=3000

COPY package.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist

EXPOSE 3000

CMD ["node", "dist/main.js"]
