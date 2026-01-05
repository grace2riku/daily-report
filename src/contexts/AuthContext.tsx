'use client';

import { useRouter } from 'next/navigation';
import { createContext, useCallback, useEffect, useState, type ReactNode } from 'react';

import type { ApiSuccessResponse, ApiErrorResponse } from '@/types/api';
import type { UserRole } from '@/types/auth';

/**
 * 認証済みユーザー情報
 */
export interface AuthUser {
  id: number;
  employee_code: string;
  name: string;
  email: string;
  role: UserRole;
  manager?: {
    id: number;
    name: string;
  } | null;
}

/**
 * ログインレスポンスのユーザー情報
 */
interface LoginResponseUser {
  id: number;
  employee_code: string;
  name: string;
  email: string;
  role: UserRole;
}

/**
 * ログインレスポンスデータ
 */
interface LoginResponseData {
  token: string;
  expires_at: string;
  user: LoginResponseUser;
}

/**
 * 認証コンテキストの型定義
 */
export interface AuthContextType {
  /** 現在のユーザー情報 */
  user: AuthUser | null;
  /** 認証状態の読み込み中フラグ */
  isLoading: boolean;
  /** 認証済みかどうか */
  isAuthenticated: boolean;
  /** ログイン処理 */
  login: (email: string, password: string) => Promise<void>;
  /** ログアウト処理 */
  logout: () => Promise<void>;
  /** ユーザー情報を再取得 */
  refreshUser: () => Promise<void>;
}

/**
 * 認証コンテキスト
 *
 * デフォルト値をnullにすることで、AuthProviderの外で使用された場合に
 * useAuthフックがエラーをスローできるようにしている。
 */
export const AuthContext = createContext<AuthContextType | null>(null);

/**
 * AuthProviderのProps
 */
interface AuthProviderProps {
  children: ReactNode;
}

/**
 * 認証プロバイダーコンポーネント
 *
 * アプリケーション全体で認証状態を管理し、ログイン・ログアウト機能を提供する。
 */
export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  /**
   * ユーザー情報を取得する内部関数
   */
  const fetchUser = useCallback(async (): Promise<AuthUser | null> => {
    try {
      const response = await fetch('/api/v1/auth/me', {
        method: 'GET',
        credentials: 'include',
      });

      if (!response.ok) {
        return null;
      }

      const data = (await response.json()) as ApiSuccessResponse<AuthUser>;
      if (data.success) {
        return data.data;
      }
      return null;
    } catch {
      return null;
    }
  }, []);

  /**
   * ユーザー情報を再取得
   */
  const refreshUser = useCallback(async () => {
    const userData = await fetchUser();
    setUser(userData);
  }, [fetchUser]);

  /**
   * ログイン処理
   */
  const login = useCallback(
    async (email: string, password: string) => {
      const response = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      });

      const data = (await response.json()) as
        | ApiSuccessResponse<LoginResponseData>
        | ApiErrorResponse;

      if (!response.ok || !data.success) {
        const errorData = data as ApiErrorResponse;
        throw new Error(errorData.error.message);
      }

      // ログイン成功時、ユーザー情報をセット
      // manager情報はloginレスポンスに含まれないので、/api/v1/auth/meから取得
      await refreshUser();
      // ダッシュボードにリダイレクト
      router.push('/');
    },
    [refreshUser, router]
  );

  /**
   * ログアウト処理
   */
  const logout = useCallback(async () => {
    try {
      await fetch('/api/v1/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
    } catch {
      // ログアウトAPI失敗は無視（ユーザー情報クリアは必ず行う）
    } finally {
      // ログアウトAPIの結果に関わらずユーザー情報をクリア
      setUser(null);
      // ログイン画面にリダイレクト
      router.push('/login');
    }
  }, [router]);

  /**
   * 初期化処理
   * アプリ起動時にユーザー情報を取得
   */
  useEffect(() => {
    const initAuth = async () => {
      setIsLoading(true);
      const userData = await fetchUser();
      setUser(userData);
      setIsLoading(false);
    };

    initAuth();
  }, [fetchUser]);

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: user !== null,
    login,
    logout,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
