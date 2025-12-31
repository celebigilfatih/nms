import { useState, useCallback } from 'react';

interface ApiOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  data?: any;
  timeout?: number;
}

interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  status?: number;
}

const DEFAULT_TIMEOUT = 30000; // 30 seconds

export const useApi = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const call = useCallback(
    async <T = any>(
      endpoint: string,
      options: ApiOptions = {}
    ): Promise<ApiResponse<T>> => {
      setLoading(true);
      setError(null);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), options.timeout || DEFAULT_TIMEOUT);

      try {
        const { method = 'GET', data, headers = {} } = options;
        const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4001/api';

        const fetchOptions: RequestInit = {
          method,
          headers: {
            'Content-Type': 'application/json',
            ...headers,
          },
          signal: controller.signal,
        };

        // Add request body for non-GET requests
        if (data && method !== 'GET') {
          fetchOptions.body = JSON.stringify(data);
        }

        // Add authentication token if available (client-side only)
        if (typeof window !== 'undefined') {
          const token = localStorage.getItem('auth_token');
          if (token) {
            fetchOptions.headers = {
              ...fetchOptions.headers,
              Authorization: `Bearer ${token}`,
            };
          }
        }

        const fullUrl = baseUrl.endsWith('/api') ? `${baseUrl}${endpoint}` : `${baseUrl}/api${endpoint}`;
        const response = await fetch(fullUrl, fetchOptions);

        // Handle non-200 responses
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          const errorMessage =
            errorData.message ||
            errorData.error ||
            `API Error: ${response.status} ${response.statusText}`;

          setError(errorMessage);
          return {
            success: false,
            error: errorMessage,
            status: response.status,
          };
        }

        const result: ApiResponse<T> = await response.json();
        return result;
      } catch (err) {
        let errorMessage = 'Unknown error occurred';

        if ((err as any)?.name === 'AbortError') {
          errorMessage = 'Request timeout';
        } else if (err instanceof TypeError) {
          errorMessage = 'Network error - check your connection';
        } else if (err instanceof Error) {
          errorMessage = err.message;
        }

        setError(errorMessage);
        return {
          success: false,
          error: errorMessage,
        };
      } finally {
        clearTimeout(timeoutId);
        setLoading(false);
      }
    },
    []
  );

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return { call, loading, error, clearError };
};
