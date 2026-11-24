import { Injectable, Logger } from '@nestjs/common';

/** Tâche d'embedding Gemini (ADR 0002) */
export type GeminiTaskType = 'RETRIEVAL_DOCUMENT' | 'RETRIEVAL_QUERY';

@Injectable()
export class EmbeddingClient {
  private readonly logger = new Logger(EmbeddingClient.name);
  private readonly apiKey: string | undefined;
  private readonly model = 'gemini-embedding-2';
  private readonly expectedDimension = 768;
  private readonly batchSize = 16;
  private readonly maxRetries = 2;

  // URL de base de l'API Gemini Embedding
  private readonly apiBase =
    'https://generativelanguage.googleapis.com/v1beta/models';

  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY;
  }

  /**
   * Vectorise une liste de passages pour l'indexation (RETRIEVAL_DOCUMENT).
   * Découpe par lots, valide les dimensions, normalise en L2.
   */
  async embedPassages(texts: string[]): Promise<number[][]> {
    return this.embed(texts, 'RETRIEVAL_DOCUMENT');
  }

  /**
   * Vectorise une question pour la recherche (RETRIEVAL_QUERY).
   * À utiliser lors des requêtes RAG (non appelé dans ce brief).
   */
  async embedQuery(text: string): Promise<number[]> {
    const result = await this.embed([text], 'RETRIEVAL_QUERY');
    return result[0];
  }

  private async embed(texts: string[], taskType: GeminiTaskType): Promise<number[][]> {
    if (!texts || texts.length === 0) {
      return [];
    }

    if (!this.apiKey) {
      this.logger.error('GEMINI_API_KEY absente : impossible de calculer les embeddings.');
      throw new Error("Le service d'embeddings est indisponible.");
    }

    const allEmbeddings: number[][] = [];

    for (let i = 0; i < texts.length; i += this.batchSize) {
      const batch = texts.slice(i, i + this.batchSize);
      const batchEmbeddings = await this.callGeminiApi(batch, taskType);
      allEmbeddings.push(...batchEmbeddings);
    }

    return allEmbeddings;
  }

  private async callGeminiApi(
    texts: string[],
    taskType: GeminiTaskType,
    attempt = 0,
  ): Promise<number[][]> {
    const url = `${this.apiBase}/${this.model}:batchEmbedContents?key=${this.apiKey}`;

    const body = {
      requests: texts.map((text) => ({
        model: `models/${this.model}`,
        content: { parts: [{ text }] },
        taskType,
        outputDimensionality: this.expectedDimension,
      })),
    };

    let response: Response;
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
    } catch (networkErr: any) {
      this.logger.error(`Erreur réseau appel Gemini Embedding: ${networkErr?.message}`);
      throw new Error("Le service d'embeddings est indisponible.");
    }

    // 429 : trop de requêtes → attendre 1 s puis réessayer (max 2 tentatives)
    if (response.status === 429) {
      if (attempt < this.maxRetries) {
        this.logger.warn(
          `Gemini Embedding 429 (tentative ${attempt + 1}/${this.maxRetries}). Nouvelle tentative dans 1 s.`,
        );
        await new Promise((resolve) => setTimeout(resolve, 1000));
        return this.callGeminiApi(texts, taskType, attempt + 1);
      }
      this.logger.error('Gemini Embedding 429 : quota dépassé après 2 tentatives.');
      throw new Error("Le service d'embeddings est indisponible.");
    }

    if (!response.ok) {
      this.logger.error(`Gemini Embedding HTTP ${response.status} : réponse non valide.`);
      throw new Error("Le service d'embeddings est indisponible.");
    }

    let data: any;
    try {
      data = await response.json();
    } catch {
      this.logger.error('Réponse Gemini Embedding non lisible (JSON invalide).');
      throw new Error("Le service d'embeddings est indisponible.");
    }

    if (!Array.isArray(data?.embeddings)) {
      this.logger.error('Réponse Gemini Embedding : champ embeddings manquant ou invalide.');
      throw new Error("Le service d'embeddings est indisponible.");
    }

    if (data.embeddings.length !== texts.length) {
      this.logger.error(
        `Gemini Embedding : nombre de vecteurs reçus (${data.embeddings.length}) ≠ envoyés (${texts.length}).`,
      );
      throw new Error("Le service d'embeddings est indisponible.");
    }

    const result: number[][] = [];
    for (let i = 0; i < data.embeddings.length; i++) {
      const values: number[] = data.embeddings[i]?.values;
      if (!Array.isArray(values) || values.length !== this.expectedDimension) {
        this.logger.error(
          `Gemini Embedding : dimension non conforme (reçu ${values?.length}, attendu ${this.expectedDimension}).`,
        );
        throw new Error("Le service d'embeddings est indisponible.");
      }
      result.push(this.normalizeL2(values));
    }

    return result;
  }

  /** Normalisation L2 d'un vecteur (norme L2 unitaire). */
  private normalizeL2(vec: number[]): number[] {
    const norm = Math.sqrt(vec.reduce((sum, v) => sum + v * v, 0));
    if (norm === 0) return vec;
    return vec.map((v) => v / norm);
  }
}
