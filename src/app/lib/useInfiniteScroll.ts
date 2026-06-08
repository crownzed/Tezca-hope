import { useCallback, useRef, useState } from 'react';
import { apiFetch } from './api';

type UsePaginationOptions<T> = {
  /** API endpoint path (VD: '/api/community/posts') */
  url: string;
  /** Số item mỗi trang */
  pageSize?: number;
  /** Auth token */
  token?: string | null;
  /** Query params thêm */
  params?: Record<string, string>;
  /** Key chứa data trong response (mặc định 'items') */
  dataKey?: string;
};

type UsePaginationResult<T> = {
  items: T[];
  loading: boolean;
  hasMore: boolean;
  error: string | null;
  loadMore: () => Promise<void>;
  reset: () => void;
  refresh: () => Promise<void>;
};

/**
 * Hook infinite scroll pagination.
 * Load thêm data khi gọi loadMore().
 * Dùng cursor-based (offset) pagination.
 */
export function useInfiniteScroll<T = unknown>(
  options: UsePaginationOptions<T>,
): UsePaginationResult<T> {
  const { url, pageSize = 20, token, params, dataKey = 'items' } = options;

  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const offsetRef = useRef(0);
  const loadingRef = useRef(false);

  const fetchPage = useCallback(
    async (offset: number, append: boolean) => {
      if (loadingRef.current) return;
      loadingRef.current = true;
      setLoading(true);
      setError(null);

      try {
        const searchParams = new URLSearchParams({
          limit: String(pageSize),
          offset: String(offset),
          ...params,
        });

        const separator = url.includes('?') ? '&' : '?';
        const fullUrl = `${url}${separator}${searchParams.toString()}`;

        const res = await apiFetch<Record<string, unknown>>(fullUrl, { token: token || undefined });
        const newItems = (res[dataKey] as T[]) || [];

        if (append) {
          setItems((prev) => [...prev, ...newItems]);
        } else {
          setItems(newItems);
        }

        setHasMore(newItems.length >= pageSize);
        offsetRef.current = offset + newItems.length;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Lỗi tải dữ liệu';
        setError(msg);
      } finally {
        setLoading(false);
        loadingRef.current = false;
      }
    },
    [url, pageSize, token, params, dataKey],
  );

  const loadMore = useCallback(async () => {
    if (!hasMore || loadingRef.current) return;
    await fetchPage(offsetRef.current, true);
  }, [hasMore, fetchPage]);

  const reset = useCallback(() => {
    setItems([]);
    setHasMore(true);
    setError(null);
    offsetRef.current = 0;
  }, []);

  const refresh = useCallback(async () => {
    offsetRef.current = 0;
    await fetchPage(0, false);
  }, [fetchPage]);

  return { items, loading, hasMore, error, loadMore, reset, refresh };
}
