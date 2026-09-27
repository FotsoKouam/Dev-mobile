import { API_BASE_URL } from '../config/api';

/**
 * Service to interact with the backend API.
 * Uses centralized API_BASE_URL from ../config/api.
 */
export async function getBackendHello(): Promise<string> {
  const response = await fetch(`${API_BASE_URL}/`);
  if (!response.ok) {
    throw new Error(`Erreur HTTP: ${response.status} ${response.statusText}`);
  }
  return response.text();
}

export { API_BASE_URL };
