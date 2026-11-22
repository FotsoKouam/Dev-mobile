import { Injectable, Logger } from '@nestjs/common';

export interface EmbedResponsePayload {
  embeddings: number[][];
  dimension: number;
}

@Injectable()
export class EmbeddingClient {
  private readonly logger = new Logger(EmbeddingClient.name);
  private readonly serviceUrl: string;
  private readonly timeoutMs: number;
  private readonly batchSize = 16;
  private readonly expectedDimension = 768;

  constructor() {
    this.serviceUrl = process.env.EMBEDDING_SERVICE_URL || 'http://127.0.0.1:8001';
    this.timeoutMs = parseInt(process.env.EMBEDDING_TIMEOUT_MS || '30000', 10);
  }

  /**
   * Vectorise une liste de textes en découpant par lots de 16.
   * Ajoute le préfixe "passage: " requis par la convention multilingual-e5.
   * Valide que chaque vecteur fait exactement 768 dimensions.
   */
  async embedPassages(texts: string[]): Promise<number[][]> {
    if (!texts || texts.length === 0) {
      return [];
    }

    const allEmbeddings: number[][] = [];

    // Envoi par lots de 16
    for (let i = 0; i < texts.length; i += this.batchSize) {
      const batch = texts.slice(i, i + this.batchSize);
      // Préfixe passage: obligatoire
      const prefixedTexts = batch.map((t) => `passage: ${t}`);

      const batchEmbeddings = await this.callEmbedApi(prefixedTexts);

      if (batchEmbeddings.length !== batch.length) {
        this.logger.error(
          `Nombre de vecteurs retourné (${batchEmbeddings.length}) différent du nombre envoyé (${batch.length})`,
        );
        throw new Error("Erreur de dimension dans la réponse du service d'embeddings");
      }

      for (const emb of batchEmbeddings) {
        if (!Array.isArray(emb) || emb.length !== this.expectedDimension) {
          this.logger.error(
            `Dimension de vecteur non conforme reçue: ${emb?.length} (attendu: ${this.expectedDimension})`,
          );
          throw new Error("Dimension d'embedding non conforme");
        }
      }

      allEmbeddings.push(...batchEmbeddings);
    }

    return allEmbeddings;
  }

  private async callEmbedApi(prefixedTexts: string[]): Promise<number[][]> {
    const url = `${this.serviceUrl.replace(/\/+$/, '')}/embed`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ texts: prefixedTexts }),
        signal: controller.signal,
      });

      if (!response.ok) {
        this.logger.error(`Échec appel embedding service: HTTP ${response.status}`);
        throw new Error(`Embedding service returned HTTP ${response.status}`);
      }

      const data = (await response.json()) as EmbedResponsePayload;

      if (!data || !Array.isArray(data.embeddings) || data.dimension !== this.expectedDimension) {
        this.logger.error(
          `Réponse non conforme du service d'embeddings: dimension=${data?.dimension}`,
        );
        throw new Error("Réponse non conforme du service d'embeddings");
      }

      return data.embeddings;
    } catch (err: any) {
      if (err.name === 'AbortError') {
        this.logger.error(`Timeout lors de l'appel au service d'embeddings (${this.timeoutMs}ms)`);
        throw new Error("Timeout du service d'embeddings");
      }
      this.logger.error(`Erreur réseau/appel embedding: ${err?.message}`);
      throw err;
    } finally {
      clearTimeout(timeout);
    }
  }
}
