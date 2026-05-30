import { Link } from 'react-router';
import { ChevronRight } from 'lucide-react';
import { getRouteMeta } from '../../lib/routeMeta';
import { tezcaTheme } from '../../lib/tezcaTheme';

export function PageBreadcrumb({ pathname }: { pathname: string }) {
  const meta = getRouteMeta(pathname);
  if (!meta || meta.breadcrumbs.length <= 1) return null;

  return (
    <nav aria-label="Breadcrumb" className="mb-4 md:mb-6">
      {meta.section && (
        <p
          className="text-[10px] font-bold uppercase tracking-widest m-0 mb-1.5 opacity-45"
          style={{ color: tezcaTheme.text }}
        >
          {meta.section}
        </p>
      )}
      <ol className="flex flex-wrap items-center gap-1 text-xs md:text-sm m-0 p-0 list-none">
        {meta.breadcrumbs.map((item, i) => {
          const last = i === meta.breadcrumbs.length - 1;
          return (
            <li key={`${item.label}-${i}`} className="flex items-center gap-1 min-w-0">
              {i > 0 && (
                <ChevronRight size={14} className="shrink-0 opacity-35" aria-hidden style={{ color: tezcaTheme.text }} />
              )}
              {item.to && !last ? (
                <Link
                  to={item.to}
                  className="opacity-60 hover:opacity-100 no-underline truncate max-w-[140px] sm:max-w-none"
                  style={{ color: tezcaTheme.accentDark }}
                >
                  {item.label}
                </Link>
              ) : (
                <span
                  className={`truncate max-w-[180px] sm:max-w-none ${last ? 'font-semibold' : 'opacity-60'}`}
                  style={{ color: tezcaTheme.text }}
                  aria-current={last ? 'page' : undefined}
                >
                  {item.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
