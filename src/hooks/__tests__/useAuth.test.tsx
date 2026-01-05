/**
 * useAuth フックのテスト
 *
 * テスト仕様書 UT-010 に基づいた単体テスト
 */

import { renderHook, waitFor, act } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';

import { AuthProvider, type AuthUser } from '@/contexts/AuthContext';

import { useAuth, useRequireAuth, useRequireRole } from '../useAuth';

// next/navigation のモック
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

// fetch のモック
const mockFetch = vi.fn();
global.fetch = mockFetch;

// テスト用のモックユーザーデータ
const mockMemberUser: AuthUser = {
  id: 1,
  employee_code: 'EMP001',
  name: '山田太郎',
  email: 'yamada@example.com',
  role: 'member',
  manager: {
    id: 3,
    name: '佐藤次郎',
  },
};

const mockManagerUser: AuthUser = {
  id: 3,
  employee_code: 'EMP003',
  name: '佐藤次郎',
  email: 'sato@example.com',
  role: 'manager',
  manager: null,
};

const mockAdminUser: AuthUser = {
  id: 4,
  employee_code: 'EMP004',
  name: '管理者太郎',
  email: 'admin@example.com',
  role: 'admin',
  manager: null,
};

/**
 * AuthProviderでラップするヘルパー関数
 */
function createWrapper() {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <AuthProvider>{children}</AuthProvider>;
  };
}

describe('useAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();
  });

  describe('基本機能', () => {
    it('AuthContextの値を取得できる', async () => {
      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify({ success: false }), { status: 401 })
      );

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      // 初期状態
      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.user).toBe(null);
      expect(result.current.isAuthenticated).toBe(false);
      expect(typeof result.current.login).toBe('function');
      expect(typeof result.current.logout).toBe('function');
      expect(typeof result.current.refreshUser).toBe('function');
    });

    it('認証済みの場合はユーザー情報が取得できる', async () => {
      mockFetch.mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            success: true,
            data: mockMemberUser,
          }),
          { status: 200 }
        )
      );

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.user).toEqual(mockMemberUser);
      expect(result.current.isAuthenticated).toBe(true);
    });
  });
});

describe('useRequireAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();
  });

  it('認証済みの場合はリダイレクトしない', async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          success: true,
          data: mockMemberUser,
        }),
        { status: 200 }
      )
    );

    const { result } = renderHook(() => useRequireAuth(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isAuthenticated).toBe(true);
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('未認証の場合は /login にリダイレクトする', async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ success: false }), { status: 401 })
    );

    const { result } = renderHook(() => useRequireAuth(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isAuthenticated).toBe(false);
    expect(mockPush).toHaveBeenCalledWith('/login');
  });

  it('ローディング中はリダイレクトしない', async () => {
    let resolveMe: (value: Response) => void;
    mockFetch.mockImplementation(() => {
      return new Promise((resolve) => {
        resolveMe = resolve;
      });
    });

    const { result } = renderHook(() => useRequireAuth(), {
      wrapper: createWrapper(),
    });

    // ローディング中
    expect(result.current.isLoading).toBe(true);
    expect(mockPush).not.toHaveBeenCalled();

    // リクエストを解決
    await act(async () => {
      resolveMe!(new Response(JSON.stringify({ success: false }), { status: 401 }));
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(mockPush).toHaveBeenCalledWith('/login');
  });
});

describe('useRequireRole', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();
  });

  describe('未認証の場合', () => {
    it('/login にリダイレクトする', async () => {
      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify({ success: false }), { status: 401 })
      );

      const { result } = renderHook(() => useRequireRole(['admin']), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockPush).toHaveBeenCalledWith('/login');
    });
  });

  describe('認証済みでロールが一致する場合', () => {
    it('adminユーザーがadminページにアクセスできる', async () => {
      mockFetch.mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            success: true,
            data: mockAdminUser,
          }),
          { status: 200 }
        )
      );

      const { result } = renderHook(() => useRequireRole(['admin']), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.user?.role).toBe('admin');
      expect(mockPush).not.toHaveBeenCalled();
    });

    it('managerユーザーがmanager/adminページにアクセスできる', async () => {
      mockFetch.mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            success: true,
            data: mockManagerUser,
          }),
          { status: 200 }
        )
      );

      const { result } = renderHook(() => useRequireRole(['manager', 'admin']), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.user?.role).toBe('manager');
      expect(mockPush).not.toHaveBeenCalled();
    });

    it('adminユーザーがmanager/adminページにアクセスできる', async () => {
      mockFetch.mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            success: true,
            data: mockAdminUser,
          }),
          { status: 200 }
        )
      );

      const { result } = renderHook(() => useRequireRole(['manager', 'admin']), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.user?.role).toBe('admin');
      expect(mockPush).not.toHaveBeenCalled();
    });
  });

  describe('認証済みでロールが不足している場合', () => {
    it('memberユーザーがadminページにアクセスすると / にリダイレクトされる', async () => {
      mockFetch.mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            success: true,
            data: mockMemberUser,
          }),
          { status: 200 }
        )
      );

      const { result } = renderHook(() => useRequireRole(['admin']), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.user?.role).toBe('member');
      expect(mockPush).toHaveBeenCalledWith('/');
    });

    it('memberユーザーがmanager/adminページにアクセスすると / にリダイレクトされる', async () => {
      mockFetch.mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            success: true,
            data: mockMemberUser,
          }),
          { status: 200 }
        )
      );

      const { result } = renderHook(() => useRequireRole(['manager', 'admin']), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockPush).toHaveBeenCalledWith('/');
    });

    it('managerユーザーがadminページにアクセスすると / にリダイレクトされる', async () => {
      mockFetch.mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            success: true,
            data: mockManagerUser,
          }),
          { status: 200 }
        )
      );

      const { result } = renderHook(() => useRequireRole(['admin']), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockPush).toHaveBeenCalledWith('/');
    });
  });

  describe('ローディング中', () => {
    it('ローディング中はリダイレクトしない', async () => {
      let resolveMe: (value: Response) => void;
      mockFetch.mockImplementation(() => {
        return new Promise((resolve) => {
          resolveMe = resolve;
        });
      });

      const { result } = renderHook(() => useRequireRole(['admin']), {
        wrapper: createWrapper(),
      });

      // ローディング中
      expect(result.current.isLoading).toBe(true);
      expect(mockPush).not.toHaveBeenCalled();

      // リクエストを解決（権限不足のユーザー）
      await act(async () => {
        resolveMe!(
          new Response(
            JSON.stringify({
              success: true,
              data: mockMemberUser,
            }),
            { status: 200 }
          )
        );
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // ローディング完了後にリダイレクト
      expect(mockPush).toHaveBeenCalledWith('/');
    });
  });
});
