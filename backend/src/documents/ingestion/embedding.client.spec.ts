import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { EmbeddingClient } from './embedding.client.js';

/** Fabrique un vecteur unitaire de dimension 768 */
function makeVec(len = 768, val = 1): number[] {
  const v = Array.from({ length: len }, () => val);
  const norm = Math.sqrt(v.reduce((s, x) => s + x * x, 0));
  return v.map((x) => x / norm);
}

/** Réponse Gemini batchEmbedContents simulée */
function geminiResponse(vectors: number[][]) {
  return {
    ok: true,
    status: 200,
    json: async () => ({
      embeddings: vectors.map((values) => ({ values })),
    }),
  };
}

describe('EmbeddingClient (Gemini)', () => {
  let client: EmbeddingClient;
  let originalFetch: any;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
    process.env.GEMINI_API_KEY = 'test-gemini-key';
    client = new EmbeddingClient();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    delete process.env.GEMINI_API_KEY;
    vi.restoreAllMocks();
  });

  it('appelle batchEmbedContents avec le bon modèle, outputDimensionality=768 et RETRIEVAL_DOCUMENT', async () => {
    const vec = makeVec();
    const fetchMock = vi.fn().mockResolvedValue(geminiResponse([vec]));
    globalThis.fetch = fetchMock;

    const result = await client.embedPassages(['Texte de démonstration']);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, opts] = fetchMock.mock.calls[0];

    // URL correcte (modèle + clé)
    expect(url).toContain('gemini-embedding-2');
    expect(url).toContain('batchEmbedContents');
    expect(url).toContain('test-gemini-key');

    // Corps de la requête
    const parsed = JSON.parse(opts.body);
    expect(parsed.requests).toHaveLength(1);
    expect(parsed.requests[0].taskType).toBe('RETRIEVAL_DOCUMENT');
    expect(parsed.requests[0].outputDimensionality).toBe(768);
    expect(parsed.requests[0].content.parts[0].text).toBe('Texte de démonstration');

    // Résultat normalisé, 768 dimensions
    expect(result).toHaveLength(1);
    expect(result[0]).toHaveLength(768);
  });

  it('découpe par lots de 16 et agrège correctement', async () => {
    const fetchMock = vi.fn().mockImplementation(async (_url: string, opts: any) => {
      const { requests } = JSON.parse(opts.body);
      return geminiResponse(requests.map(() => makeVec()));
    });
    globalThis.fetch = fetchMock;

    const texts = Array.from({ length: 25 }, (_, i) => `Texte ${i}`);
    const result = await client.embedPassages(texts);

    // 25 textes → 2 appels (16 + 9)
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(result).toHaveLength(25);
    result.forEach((v) => expect(v).toHaveLength(768));
  });

  it("renvoie une erreur si un vecteur n'a pas 768 dimensions", async () => {
    const badVec = Array.from({ length: 512 }, () => 0.1);
    globalThis.fetch = vi.fn().mockResolvedValue(geminiResponse([badVec]));

    await expect(client.embedPassages(['Texte'])).rejects.toThrow();
  });

  it('sur 429, réessaie deux fois puis lève une erreur', async () => {
    const tooManyReq = { ok: false, status: 429, json: async () => ({}) };
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(tooManyReq)
      .mockResolvedValueOnce(tooManyReq)
      .mockResolvedValueOnce(tooManyReq);
    globalThis.fetch = fetchMock;

    await expect(client.embedPassages(['Texte'])).rejects.toThrow();
    // 1 appel initial + 2 tentatives = 3
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('lève une erreur explicite si GEMINI_API_KEY est absente', async () => {
    delete process.env.GEMINI_API_KEY;
    const clientNoKey = new EmbeddingClient();

    await expect(clientNoKey.embedPassages(['Texte'])).rejects.toThrow(
      "Le service d'embeddings est indisponible.",
    );
  });

  it('normalise chaque vecteur en L2 (norme proche de 1)', async () => {
    // Vecteur non normalisé envoyé par l'API
    const rawVec = Array.from({ length: 768 }, () => 2.0);
    globalThis.fetch = vi.fn().mockResolvedValue(geminiResponse([rawVec]));

    const result = await client.embedPassages(['Texte']);
    const norm = Math.sqrt(result[0].reduce((s, v) => s + v * v, 0));
    expect(norm).toBeCloseTo(1.0, 5);
  });

  it('embedQuery utilise la tâche RETRIEVAL_QUERY', async () => {
    const vec = makeVec();
    const fetchMock = vi.fn().mockResolvedValue(geminiResponse([vec]));
    globalThis.fetch = fetchMock;

    const result = await client.embedQuery('Une question');

    const parsed = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(parsed.requests[0].taskType).toBe('RETRIEVAL_QUERY');
    expect(result).toHaveLength(768);
  });
});
