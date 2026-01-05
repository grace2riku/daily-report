'use client';

import { useRouter } from 'next/navigation';
import { useContext, useEffect } from 'react';

import { AuthContext, type AuthContextType } from '@/contexts/AuthContext';
import type { UserRole } from '@/types/auth';

/**
 * 認証コンテキストを使用するカスタムフック
 *
 * @returns 認証コンテキストの値
 * @throws AuthProviderの外で使用された場合
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { user, isAuthenticated, login, logout } = useAuth();
 *
 *   if (!isAuthenticated) {
 *     return <LoginPrompt />;
 *   }
 *
 *   return <div>Welcome, {user?.name}!</div>;
 * }
 * ```
 */
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);

  if (context === null) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
}

/**
 * 認証を必須とするページで使用するカスタムフック
 *
 * 未認証の場合、自動的にログイン画面にリダイレクトする。
 *
 * @returns 認証コンテキストの値
 *
 * @example
 * ```tsx
 * function ProtectedPage() {
 *   const { user, isLoading } = useRequireAuth();
 *
 *   if (isLoading) {
 *     return <Loading />;
 *   }
 *
 *   // userは必ず存在する（未認証ならリダイレクトされるため）
 *   return <div>Hello, {user?.name}</div>;
 * }
 * ```
 */
export function useRequireAuth(): AuthContextType {
  const auth = useAuth();
  const router = useRouter();

  useEffect(() => {
    // ローディング中は何もしない
    if (auth.isLoading) {
      return;
    }

    // 未認証の場合はログイン画面にリダイレクト
    if (!auth.isAuthenticated) {
      router.push('/login');
    }
  }, [auth.isLoading, auth.isAuthenticated, router]);

  return auth;
}

/**
 * 特定のロールを必須とするページで使用するカスタムフック
 *
 * 未認証の場合はログイン画面に、認証済みだがロールが不足している場合は
 * ダッシュボードにリダイレクトする。
 *
 * @param allowedRoles 許可されたロールの配列
 * @returns 認証コンテキストの値
 *
 * @example
 * ```tsx
 * function AdminPage() {
 *   const { user, isLoading } = useRequireRole(['admin']);
 *
 *   if (isLoading) {
 *     return <Loading />;
 *   }
 *
 *   // userは必ずadminロールを持つ
 *   return <AdminDashboard />;
 * }
 *
 * function ManagerOrAdminPage() {
 *   const { user, isLoading } = useRequireRole(['manager', 'admin']);
 *   // ...
 * }
 * ```
 */
export function useRequireRole(allowedRoles: UserRole[]): AuthContextType {
  const auth = useAuth();
  const router = useRouter();

  useEffect(() => {
    // ローディング中は何もしない
    if (auth.isLoading) {
      return;
    }

    // 未認証の場合はログイン画面にリダイレクト
    if (!auth.isAuthenticated) {
      router.push('/login');
      return;
    }

    // ロールチェック
    if (auth.user && !allowedRoles.includes(auth.user.role)) {
      // 権限がない場合はダッシュボードにリダイレクト
      router.push('/');
    }
  }, [auth.isLoading, auth.isAuthenticated, auth.user, allowedRoles, router]);

  return auth;
}
