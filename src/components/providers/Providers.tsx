'use client';

import type { ReactNode } from 'react';

import { AuthProvider } from '@/contexts/AuthContext';

interface ProvidersProps {
  children: ReactNode;
}

/**
 * アプリケーション全体で使用するプロバイダーをまとめたコンポーネント
 *
 * RootLayoutはServer Componentのため、クライアントプロバイダーは
 * このコンポーネントでラップして使用する。
 */
export function Providers({ children }: ProvidersProps) {
  return <AuthProvider>{children}</AuthProvider>;
}
