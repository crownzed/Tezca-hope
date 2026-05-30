import { Link } from 'react-router';
import { ROUTES } from '../../routes';
import { LEGAL_DOCUMENTS } from '../../lib/legalContent';

type LegalDocNavProps = {
  currentPath: string;
};

export function LegalDocNav({ currentPath }: LegalDocNavProps) {
  const others = LEGAL_DOCUMENTS.filter((d) => d.path !== currentPath);

  return (
    <nav
      className="mt-12 pt-8 border-t space-y-4"
      style={{ borderColor: 'rgba(26, 32, 44, 0.1)' }}
      aria-label="Tài liệu pháp lý liên quan"
    >
      <h2 className="text-lg font-semibold m-0" style={{ color: '#1A202C' }}>
        Tài liệu liên quan
      </h2>
      <ul className="space-y-2 list-none p-0 m-0">
        {others.map((doc) => (
          <li key={doc.path}>
            <Link to={doc.path} className="font-medium hover:opacity-80" style={{ color: '#0F766E' }}>
              {doc.title}
            </Link>
            <span className="block text-sm opacity-60 mt-0.5">{doc.description}</span>
          </li>
        ))}
      </ul>
      <p className="text-sm m-0 opacity-60">
        <Link to={ROUTES.legal.root} style={{ color: '#0F766E' }}>
          Xem tất cả tài liệu pháp lý
        </Link>
        {' · '}
        <Link to={ROUTES.product.security} style={{ color: '#0F766E' }}>
          Bảo mật &amp; dữ liệu (sản phẩm)
        </Link>
      </p>
    </nav>
  );
}
