import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { EmbeddingClient } from './embedding.client.js';

describe('EmbeddingClient', () => {
  let client: EmbeddingClient;
  let originalFetch: any;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
    process.env.EMBEDDING_SERVICE_URL = 'http://127.0.0.1:8001';
    process.env.EMBEDDING_TIMEOUT_MS = '1000';
    client = new EmbeddingClient();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('appelle le service avec le bon chemin /embed et le préfixe "passage: "', async () => {
    const mockVector = Array.from({ length: 768 }, () => 0.1);
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        embeddings: [mockVector],
        dimension: 768,
      }),
    });
    globalThis.fetch = fetchMock;

    const result = await client.embedPassages(['Texte de démonstration']);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe('http://127.0.0.1:8001/embed');
    expect(options.method).toBe('POST');
    const parsedBody = JSON.parse(options.body);
    expect(parsedBody.texts).toEqual(['passage: Texte de démonstration']);
    expect(result).toHaveLength(1);
    expect(result[0]).toHaveLength(768);
  });

  it('découpe les requêtes par lots de 16 textes', async () => {
    const mockVector = Array.from({ length: 768 }, () => 0.05);
    const fetchMock = vi.fn().mockImplementation(async (url, options) => {
      const body = JSON.parse(options.body);
      return {
        ok: true,
        json: async () => ({
          embeddings: body.texts.map(() => mockVector),
          dimension: 768,
        }),
      };
    });
    globalThis.fetch = fetchMock;

    // 25 textes -> 1er lot = 16, 2e lot = 9 -> 2 appels
    const texts = Array.from({ length: 25 }, (_, i) => `Texte ${i}`);
    const result = await client.embedPassages(texts);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    const firstCallBody = JSON.parse(fetchMock.mock.calls[0][1].body);
    const secondCallBody = JSON.parse(fetchMock.mock.calls[1][1].body);

    expect(firstCallBody.texts).toHaveLength(16);
    expect(secondCallBody.texts).toHaveLength(9);
    expect(firstCallBody.texts[0]).toBe('passage: Texte 0');
    expect(secondCallBody.texts[0]).toBe('passage: Texte 16');
    expect(result).toHaveLength(25);
  });

  it('échoue si la dimension retournée est différente de 768', async () => {
    const invalidVector = Array.from({ length: 512 }, () => 0.1); // mauvaise dimension
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        embeddings: [invalidVector],
        dimension: 512,
      }),
    });

    await expect(client.embedPassages(['Texte'])).rejects.toThrow();
  });

  it('échoue en cas de timeout réseau', async () => {
    globalThis.fetch = vi.fn().mockImplementation(async () => {
      const error: any = new Error('The operation was aborted');
      error.name = 'AbortError';
      throw error;
    });

    await expect(client.embedPassages(['Texte'])).rejects.toThrow("Timeout du service d'embeddings");
  });

  it('échoue en cas d erreur HTTP 500 ou indisponibilité réseau', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
    });

    await expect(client.embedPassages(['Texte'])).rejects.toThrow();
  });
});
