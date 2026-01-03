'use client';

import { ChevronDown } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

interface NavigationProps {
  userRole?: 'member' | 'manager' | 'admin';
  className?: string;
}

interface NavItem {
  label: string;
  href: string;
}

const mainNavItems: NavItem[] = [{ label: 'ダッシュボード', href: '/' }];

const adminNavItems: NavItem[] = [
  { label: '営業マスタ', href: '/admin/sales-persons' },
  { label: '顧客マスタ', href: '/admin/customers' },
];

/**
 * パスがアクティブかどうかを判定するカスタムフック
 */
function useIsActive() {
  const pathname = usePathname();

  return (href: string) => {
    if (href === '/') {
      return pathname === '/';
    }
    return pathname.startsWith(href);
  };
}

export function Navigation({ userRole, className }: NavigationProps) {
  const isActive = useIsActive();
  const isAdmin = userRole === 'admin';

  return (
    <nav className={cn('flex items-center gap-6', className)}>
      {mainNavItems.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={cn(
            'text-sm font-medium transition-colors hover:text-primary',
            isActive(item.href) ? 'text-primary' : 'text-muted-foreground'
          )}
        >
          {item.label}
        </Link>
      ))}

      {isAdmin && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className={cn(
                'gap-1',
                adminNavItems.some((item) => isActive(item.href)) && 'text-primary'
              )}
            >
              マスタ管理
              <ChevronDown className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            {adminNavItems.map((item) => (
              <DropdownMenuItem key={item.href} asChild>
                <Link href={item.href} className={cn(isActive(item.href) && 'bg-accent')}>
                  {item.label}
                </Link>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </nav>
  );
}

interface MobileNavigationProps {
  userRole?: 'member' | 'manager' | 'admin';
  onNavigate?: () => void;
  className?: string;
}

export function MobileNavigation({ userRole, onNavigate, className }: MobileNavigationProps) {
  const isActive = useIsActive();
  const isAdmin = userRole === 'admin';

  return (
    <nav className={cn('flex flex-col gap-1', className)}>
      {mainNavItems.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          onClick={onNavigate}
          className={cn(
            'flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent',
            isActive(item.href) && 'bg-accent text-accent-foreground'
          )}
        >
          {item.label}
        </Link>
      ))}

      {isAdmin && (
        <>
          <div className="my-2 h-px bg-border" />
          <p className="px-3 py-1 text-xs font-semibold text-muted-foreground">マスタ管理</p>
          {adminNavItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                'flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent',
                isActive(item.href) && 'bg-accent text-accent-foreground'
              )}
            >
              {item.label}
            </Link>
          ))}
        </>
      )}
    </nav>
  );
}
