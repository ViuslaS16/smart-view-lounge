import { useState, useEffect, useCallback } from 'react';
import { apiFetch, fetcher } from './api';

export function useApi<T>(endpoint: string | null, pollInterval: number = 0) {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const mutate = useCallback(async (silent = false) => {
    if (!endpoint) return;
    if (!silent) setIsLoading(true);
    try {
      const res = await fetcher(endpoint);
      setData(res as T);
      setError(null);
    } catch (err: any) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      if (!silent) setIsLoading(false);
    }
  }, [endpoint]);

  useEffect(() => {
    if (!endpoint) {
      setData(null);
      setIsLoading(false);
      return;
    }
    
    // Initial fetch
    let isMounted = true;
    
    setIsLoading(true);
    fetcher(endpoint)
      .then(res => {
        if (isMounted) {
          setData(res as T);
          setError(null);
        }
      })
      .catch(err => {
        if (isMounted) {
          setError(err instanceof Error ? err : new Error(String(err)));
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    // Set up polling
    let intervalId: NodeJS.Timeout | null = null;
    if (pollInterval > 0) {
        intervalId = setInterval(() => {
            mutate(true); // silent true so we don't flash loading states
        }, pollInterval);
    }

    return () => {
      isMounted = false;
      if (intervalId) clearInterval(intervalId);
    };
  }, [endpoint, pollInterval, mutate]);

  // Expose a helper to optimistically mutate data without re-fetching
  const setOptimisticData = useCallback((newData: T | ((prev: T | null) => T)) => {
    setData(newData);
  }, []);

  return { data, isLoading, error, mutate, revalidate: mutate, setOptimisticData };
}
