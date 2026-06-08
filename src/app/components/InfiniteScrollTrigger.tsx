import { useEffect, useRef } from 'react';

type InfiniteScrollTriggerProps = {
  /** Gọi khi element hiện ra trong viewport */
  onTrigger: () => void;
  /** Đang loading — tạm dừng trigger */
  loading?: boolean;
  /** Còn data để load không */
  hasMore?: boolean;
  /** Khoảng cách trigger trước khi tới cuối (px) */
  rootMargin?: string;
};

/**
 * Component sentinel — đặt cuối danh sách.
 * Khi scroll tới nó → gọi onTrigger (loadMore).
 */
export function InfiniteScrollTrigger({
  onTrigger,
  loading = false,
  hasMore = true,
  rootMargin = '200px',
}: InfiniteScrollTriggerProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!hasMore || loading) return;

    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasMore && !loading) {
          onTrigger();
        }
      },
      { rootMargin },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [onTrigger, loading, hasMore, rootMargin]);

  if (!hasMore) return null;

  return (
    <div ref={ref} style={{ height: '1px', width: '100%' }} aria-hidden="true" />
  );
}
