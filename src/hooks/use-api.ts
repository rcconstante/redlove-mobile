import { useCallback, useEffect, useState } from 'react';

export type ResourceState<T> = {
  data: T | null;
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
  setData: (value: T | null) => void;
};

export function useResource<T>(loader: () => Promise<T>): ResourceState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const next = await loader();
      setData(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  }, [loader]);

  useEffect(() => {
    let alive = true;
    void Promise.resolve().then(async () => {
      setLoading(true);
      setError(null);
      try {
        const next = await loader();
        if (alive) setData(next);
      } catch (err) {
        if (alive) setError(err instanceof Error ? err.message : 'Something went wrong.');
      } finally {
        if (alive) setLoading(false);
      }
    });
    return () => {
      alive = false;
    };
  }, [loader]);

  return { data, loading, error, reload, setData };
}
