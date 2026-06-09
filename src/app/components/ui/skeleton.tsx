import React from 'react';

type SkeletonProps = {
  className?: string;
  width?: string;
  height?: string;
  rounded?: boolean;
  circle?: boolean;
};

/** Skeleton loading placeholder — animate pulse */
export function Skeleton({
  className = '',
  width,
  height = '1rem',
  rounded = true,
  circle = false,
}: SkeletonProps) {
  const style: React.CSSProperties = {
    width: circle ? height : width || '100%',
    height,
    borderRadius: circle ? '50%' : rounded ? '8px' : '0',
    backgroundColor: '#e5e7eb',
    animation: 'skeleton-pulse 1.5s ease-in-out infinite',
  };

  return <div className={className} style={style} aria-hidden="true" />;
}

/** Skeleton cho một card (post, item) */
export function SkeletonCard() {
  return (
    <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <Skeleton circle height="2.5rem" />
        <div style={{ flex: 1 }}>
          <Skeleton width="40%" height="0.875rem" />
          <Skeleton width="25%" height="0.75rem" className="mt-1" />
        </div>
      </div>
      <Skeleton height="0.875rem" />
      <Skeleton width="80%" height="0.875rem" />
      <Skeleton width="60%" height="0.875rem" />
    </div>
  );
}

/** Skeleton cho danh sách */
export function SkeletonList({ count = 3 }: { count?: number }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {Array.from({ length: count }, (_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}

/** Skeleton cho page content */
export function SkeletonPage() {
  return (
    <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <Skeleton width="50%" height="1.5rem" />
      <Skeleton height="0.875rem" />
      <Skeleton width="90%" height="0.875rem" />
      <Skeleton width="75%" height="0.875rem" />
      <div style={{ marginTop: '1rem' }}>
        <SkeletonList count={3} />
      </div>
    </div>
  );
}
