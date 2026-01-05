'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

import { LoginForm } from '@/components/auth/LoginForm';
import { LoadingPage } from '@/components/common/Loading';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';

/**
 * ログインページ (SCR-001)
 *
 * ユーザー認証を行うページ。
 * ログイン済みの場合はダッシュボードにリダイレクトする。
 */
export default function LoginPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  // ログイン済みの場合はダッシュボードにリダイレクト
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.push('/');
    }
  }, [isAuthenticated, isLoading, router]);

  // 認証状態の読み込み中
  if (isLoading) {
    return <LoadingPage />;
  }

  // ログイン済みの場合はリダイレクト中の表示
  if (isAuthenticated) {
    return <LoadingPage />;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">営業日報システム</CardTitle>
        </CardHeader>
        <CardContent>
          <LoginForm />
        </CardContent>
      </Card>
    </div>
  );
}
