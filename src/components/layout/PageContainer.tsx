import { ChevronRight, Home } from 'lucide-react';
import Link from 'next/link';

import { cn } from '@/lib/utils';

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface PageContainerProps {
  children: React.ReactNode;
  title?: string;
  description?: string;
  actions?: React.ReactNode;
  breadcrumbs?: BreadcrumbItem[];
  className?: string;
}

export function PageContainer({
  children,
  title,
  description,
  actions,
  breadcrumbs,
  className,
}: PageContainerProps) {
  return (
    <div className={cn('container mx-auto px-4 py-8', className)}>
      {/* パンくずリスト */}
      {breadcrumbs && breadcrumbs.length > 0 && (
        <Breadcrumbs items={breadcrumbs} className="mb-4" />
      )}

      {/* ページヘッダー */}
      {(title || actions) && (
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            {title && <h1 className="text-2xl font-bold tracking-tight">{title}</h1>}
            {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}

      {/* ページコンテンツ */}
      {children}
    </div>
  );
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  className?: string;
}

export function Breadcrumbs({ items, className }: BreadcrumbsProps) {
  return (
    <nav aria-label="パンくずリスト" className={className}>
      <ol className="flex items-center gap-1 text-sm text-muted-foreground">
        <li>
          <Link
            href="/"
            className="flex items-center hover:text-foreground transition-colors"
            aria-label="ホーム"
          >
            <Home className="h-4 w-4" />
          </Link>
        </li>
        {items.map((item, index) => (
          <li key={index} className="flex items-center gap-1">
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
            {item.href ? (
              <Link href={item.href} className="hover:text-foreground transition-colors">
                {item.label}
              </Link>
            ) : (
              <span className="text-foreground font-medium" aria-current="page">
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
