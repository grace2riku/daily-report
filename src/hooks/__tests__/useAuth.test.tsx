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

  // UT-010-01: 初期状態
  describe('UT-010-01: 初期状態', () => {
    it('初期状態では user: null, isLoading: true である', async () => {
      // 未認証のレスポンスを遅延させて初期状態を確認
      let resolveAuth: (value: Response) => void;
      mockFetch.mockImplementation(() => {
        return new Promise((resolve) => {
          resolveAuth = resolve;
        });
      });

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      // 初期状態の確認
      expect(result.current.user).toBe(null);
      expect(result.current.isLoading).toBe(true);
      expect(result.current.isAuthenticated).toBe(false);

      // リクエストを解決
      await act(async () => {
        resolveAuth!(new Response(JSON.stringify({ success: false }), { status: 401 }));
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });

    it('認証チェック中はisLoadingがtrueを維持する', async () => {
      let resolveAuth: (value: Response) => void;
      mockFetch.mockImplementation(() => {
        return new Promise((resolve) => {
          resolveAuth = resolve;
        });
      });

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      // 認証チェック中
      expect(result.current.isLoading).toBe(true);

      // 認証成功で解決
      await act(async () => {
        resolveAuth!(
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

      expect(result.current.user).toEqual(mockMemberUser);
    });
  });

  // UT-010-02: ログイン成功後
  describe('UT-010-02: ログイン成功後', () => {
    it('ログイン成功後は user が設定され isAuthenticated が true になる', async () => {
      // 初期状態: 未認証
      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify({ success: false }), { status: 401 })
      );

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      // 初期状態確認
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
      expect(result.current.user).toBe(null);
      expect(result.current.isAuthenticated).toBe(false);

      // ログインAPIのモック
      mockFetch.mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            success: true,
            data: {
              token: 'test-token',
              expires_at: '2025-01-16T10:00:00Z',
              user: {
                id: 1,
                employee_code: 'EMP001',
                name: '山田太郎',
                email: 'yamada@example.com',
                role: 'member',
              },
            },
          }),
          { status: 200 }
        )
      );

      // refreshUser（/api/v1/auth/me）のモック
      mockFetch.mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            success: true,
            data: mockMemberUser,
          }),
          { status: 200 }
        )
      );

      // ログイン実行
      await act(async () => {
        await result.current.login('yamada@example.com', 'password123');
      });

      // ログイン後の状態確認
      expect(result.current.user).toEqual(mockMemberUser);
      expect(result.current.isAuthenticated).toBe(true);
      expect(mockPush).toHaveBeenCalledWith('/');
    });

    it('ログイン失敗時はエラーがスローされ状態は変わらない', async () => {
      // 初期状態: 未認証
      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify({ success: false }), { status: 401 })
      );

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // ログインAPI失敗のモック
      mockFetch.mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            success: false,
            error: {
              code: 'INVALID_CREDENTIALS',
              message: 'メールアドレスまたはパスワードが正しくありません',
            },
          }),
          { status: 401 }
        )
      );

      // ログイン失敗
      let thrownError: Error | null = null;
      await act(async () => {
        try {
          await result.current.login('wrong@example.com', 'wrongpassword');
        } catch (e) {
          thrownError = e as Error;
        }
      });

      // エラーがスローされることを確認
      expect(thrownError).not.toBeNull();
      expect(thrownError!.message).toBe('メールアドレスまたはパスワードが正しくありません');

      // 状態が変わらないことを確認
      expect(result.current.user).toBe(null);
      expect(result.current.isAuthenticated).toBe(false);
    });

    it('無効化されたアカウントでログインするとエラーになる', async () => {
      // 初期状態: 未認証
      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify({ success: false }), { status: 401 })
      );

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // アカウント無効化エラーのモック
      mockFetch.mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            success: false,
            error: {
              code: 'ACCOUNT_DISABLED',
              message: 'アカウントが無効化されています',
            },
          }),
          { status: 401 }
        )
      );

      let thrownError: Error | null = null;
      await act(async () => {
        try {
          await result.current.login('disabled@example.com', 'password123');
        } catch (e) {
          thrownError = e as Error;
        }
      });

      expect(thrownError).not.toBeNull();
      expect(thrownError!.message).toBe('アカウントが無効化されています');
    });
  });

  // UT-010-03: ログアウト後
  describe('UT-010-03: ログアウト後', () => {
    it('ログアウト後は user: null, isAuthenticated: false になる', async () => {
      // 初期状態: 認証済み
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

      // 認証済み状態を確認
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
      expect(result.current.user).toEqual(mockMemberUser);
      expect(result.current.isAuthenticated).toBe(true);

      // ログアウトAPIのモック
      mockFetch.mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            success: true,
            data: { message: 'ログアウトしました' },
          }),
          { status: 200 }
        )
      );

      // ログアウト実行
      await act(async () => {
        await result.current.logout();
      });

      // ログアウト後の状態確認
      expect(result.current.user).toBe(null);
      expect(result.current.isAuthenticated).toBe(false);
      expect(mockPush).toHaveBeenCalledWith('/login');
    });

    it('ログアウトAPIが失敗してもユーザー情報はクリアされる', async () => {
      // 初期状態: 認証済み
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

      // ログアウトAPI失敗のモック
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      // ログアウト実行
      await act(async () => {
        await result.current.logout();
      });

      // APIが失敗してもユーザー情報はクリアされる
      expect(result.current.user).toBe(null);
      expect(result.current.isAuthenticated).toBe(false);
      expect(mockPush).toHaveBeenCalledWith('/login');
    });

    it('ログアウト後にログインページにリダイレクトされる', async () => {
      // 初期状態: 認証済み
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

      // ログアウトAPIのモック
      mockFetch.mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            success: true,
            data: { message: 'ログアウトしました' },
          }),
          { status: 200 }
        )
      );

      // ログアウト実行
      await act(async () => {
        await result.current.logout();
      });

      // /login にリダイレクトされることを確認
      expect(mockPush).toHaveBeenCalledWith('/login');
    });
  });

  // refreshUser のテスト
  describe('refreshUser', () => {
    it('ユーザー情報を再取得できる', async () => {
      // 初期状態: 認証済み
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

      // 更新されたユーザー情報のモック
      const updatedUser = {
        ...mockMemberUser,
        name: '山田太郎（更新）',
      };
      mockFetch.mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            success: true,
            data: updatedUser,
          }),
          { status: 200 }
        )
      );

      // refreshUser実行
      await act(async () => {
        await result.current.refreshUser();
      });

      // ユーザー情報が更新されることを確認
      expect(result.current.user?.name).toBe('山田太郎（更新）');
    });

    it('refreshUserでセッションが無効な場合はuserがnullになる', async () => {
      // 初期状態: 認証済み
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

      // セッション無効のモック
      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify({ success: false }), { status: 401 })
      );

      // refreshUser実行
      await act(async () => {
        await result.current.refreshUser();
      });

      // ユーザー情報がnullになることを確認
      expect(result.current.user).toBe(null);
      expect(result.current.isAuthenticated).toBe(false);
    });
  });

  // AuthProviderの外で使用した場合のテスト
  describe('AuthProvider外での使用', () => {
    it('AuthProviderの外でuseAuthを使用するとエラーがスローされる', () => {
      // AuthProviderなしでuseAuthを呼び出す
      expect(() => {
        renderHook(() => useAuth());
      }).toThrow('useAuth must be used within an AuthProvider');
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
