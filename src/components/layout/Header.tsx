'use client';

import { ChevronDown, LogOut, Menu, User } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Separator } from '@/components/ui/separator';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';

interface HeaderProps {
  userName?: string;
  userRole?: 'member' | 'manager' | 'admin';
  onLogout?: () => void;
}

export function Header({ userName, userRole, onLogout }: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isAdmin = userRole === 'admin';

  const closeMobileMenu = () => setMobileMenuOpen(false);

  return (
    <header className="border-b bg-background">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        {/* ロゴ・システム名 */}
        <Link href="/" className="flex items-center gap-2">
          <span className="text-xl font-bold">営業日報システム</span>
        </Link>

        {/* デスクトップナビゲーション */}
        <nav className="hidden md:flex items-center gap-6">
          <Link href="/" className="text-sm font-medium transition-colors hover:text-primary">
            ダッシュボード
          </Link>

          {isAdmin && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="gap-1">
                  マスタ管理
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem asChild>
                  <Link href="/admin/sales-persons">営業マスタ</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/admin/customers">顧客マスタ</Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </nav>

        <div className="flex items-center gap-2">
          {/* デスクトップユーザーメニュー */}
          {userName && (
            <div className="hidden md:flex items-center gap-4">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="gap-2">
                    <User className="h-4 w-4" />
                    {userName}
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem disabled>
                    <span className="text-muted-foreground">
                      {userRole === 'admin'
                        ? '管理者'
                        : userRole === 'manager'
                          ? '上長'
                          : '一般営業'}
                    </span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={onLogout}>
                    <LogOut className="mr-2 h-4 w-4" />
                    ログアウト
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}

          {/* モバイルメニューボタン */}
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden">
                <Menu className="h-5 w-5" />
                <span className="sr-only">メニューを開く</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[280px] sm:w-[320px]">
              <SheetHeader>
                <SheetTitle>メニュー</SheetTitle>
              </SheetHeader>

              {/* ユーザー情報 */}
              {userName && (
                <div className="mt-6 flex items-center gap-3 px-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                    <User className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-medium">{userName}</p>
                    <p className="text-sm text-muted-foreground">
                      {userRole === 'admin'
                        ? '管理者'
                        : userRole === 'manager'
                          ? '上長'
                          : '一般営業'}
                    </p>
                  </div>
                </div>
              )}

              <Separator className="my-4" />

              {/* モバイルナビゲーション */}
              <nav className="flex flex-col gap-1">
                <Link
                  href="/"
                  onClick={closeMobileMenu}
                  className="flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent"
                >
                  ダッシュボード
                </Link>

                {isAdmin && (
                  <>
                    <Separator className="my-2" />
                    <p className="px-3 py-1 text-xs font-semibold text-muted-foreground">
                      マスタ管理
                    </p>
                    <Link
                      href="/admin/sales-persons"
                      onClick={closeMobileMenu}
                      className="flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent"
                    >
                      営業マスタ
                    </Link>
                    <Link
                      href="/admin/customers"
                      onClick={closeMobileMenu}
                      className="flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent"
                    >
                      顧客マスタ
                    </Link>
                  </>
                )}
              </nav>

              {/* ログアウトボタン */}
              {userName && (
                <>
                  <Separator className="my-4" />
                  <Button
                    variant="outline"
                    className="w-full justify-start gap-2"
                    onClick={() => {
                      closeMobileMenu();
                      onLogout?.();
                    }}
                  >
                    <LogOut className="h-4 w-4" />
                    ログアウト
                  </Button>
                </>
              )}
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
