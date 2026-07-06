import { useCallback, useEffect, useRef, useState } from 'react';

export interface UseApiOptions<TData> {
  immediate?: boolean;
  initialData?: TData | null;
  onSuccess?: (data: TData) => void;
  onError?: (error: Error) => void;
}

export interface UseApiReturn<TData, TParams extends unknown[]> {
  data: TData | null;
  loading: boolean;
  error: Error | null;
  execute: (...params: TParams) => Promise<TData | null>;
  reset: () => void;
  setData: React.Dispatch<React.SetStateAction<TData | null>>;
}

/**
 * Shared data-fetching and API execution wrapper hook for web and mobile modules.
 */
export function useApi<TData, TParams extends unknown[] = []>(
  fn: (...params: TParams) => Promise<TData>,
  options: UseApiOptions<TData> = {},
): UseApiReturn<TData, TParams> {
  const [data, setData] = useState<TData | null>(options.initialData ?? null);
  const [loading, setLoading] = useState<boolean>(options.immediate ?? false);
  const [error, setError] = useState<Error | null>(null);

  const fnRef = useRef(fn);
  fnRef.current = fn;

  const onSuccessRef = useRef(options.onSuccess);
  onSuccessRef.current = options.onSuccess;

  const onErrorRef = useRef(options.onError);
  onErrorRef.current = options.onError;

  const execute = useCallback(
    async (...params: TParams): Promise<TData | null> => {
      setLoading(true);
      setError(null);
      try {
        const result = await fnRef.current(...params);
        setData(result);
        onSuccessRef.current?.(result);
        return result;
      } catch (err: unknown) {
        const normalizedError =
          err instanceof Error ? err : new Error(String(err));
        setError(normalizedError);
        onErrorRef.current?.(normalizedError);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const reset = useCallback(() => {
    setData(options.initialData ?? null);
    setLoading(false);
    setError(null);
  }, [options.initialData]);

  useEffect(() => {
    if (options.immediate) {
      void execute(...([] as unknown as TParams));
    }
  }, [options.immediate, execute]);

  return {
    data,
    loading,
    error,
    execute,
    reset,
    setData,
  };
}
