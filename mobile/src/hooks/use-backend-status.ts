import { useEffect, useState } from 'react';
import { API_BASE_URL, getBackendHello } from '../services/api';

export interface BackendStatus {
  loading: boolean;
  message: string | null;
  error: string | null;
  apiUrl: string;
}

export function useBackendStatus() {
  const [status, setStatus] = useState<BackendStatus>({
    loading: true,
    message: null,
    error: null,
    apiUrl: API_BASE_URL,
  });

  const checkStatus = async () => {
    setStatus((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const message = await getBackendHello();
      setStatus({
        loading: false,
        message,
        error: null,
        apiUrl: API_BASE_URL,
      });
    } catch (err: unknown) {
      setStatus({
        loading: false,
        message: null,
        error: err instanceof Error ? err.message : 'Erreur de connexion',
        apiUrl: API_BASE_URL,
      });
    }
  };

  useEffect(() => {
    checkStatus();
  }, []);

  return { ...status, refresh: checkStatus };
}
