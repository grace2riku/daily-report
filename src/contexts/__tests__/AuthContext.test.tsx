/**
 * AuthContext のテスト
 *
 * テスト仕様書 UT-010 に基づいた単体テスト
 */

import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useContext, useState } from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';

import { AuthProvider, AuthContext, type AuthUser } from '../AuthContext';

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
const mockUser: AuthUser = {
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

/**
 * AuthContextの値を表示するテスト用コンポーネント
 */
function TestConsumer() {
  const auth = useContext(AuthContext);
  const [loginError, setLoginError] = useState<string | null>(null);

  const handleLogin = async () => {
    try {
      setLoginError(null);
      await auth.login('test@example.com', 'password123');
    } catch (error) {
      setLoginError(error instanceof Error ? error.message : 'Unknown error');
    }
  };

  return (
    <div>
      <span data-testid="user">{auth.user ? JSON.stringify(auth.user) : 'null'}</span>
      <span data-testid="isLoading">{String(auth.isLoading)}</span>
      <span data-testid="isAuthenticated">{String(auth.isAuthenticated)}</span>
      <span data-testid="loginError">{loginError ?? 'null'}</span>
      <button onClick={handleLogin}>Login</button>
      <button onClick={() => auth.logout()}>Logout</button>
      <button onClick={() => auth.refreshUser()}>Refresh</button>
    </div>
  );
}

describe('AuthContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();
  });

  describe('UT-010-01: 初期状態', () => {
    it('初期状態では user: null, isLoading: true', async () => {
      // /api/v1/auth/me が呼ばれるまでisLoadingはtrue
      // リクエストは保留状態にしておく
      let resolveMe: (value: Response) => void;
      mockFetch.mockImplementation(() => {
        return new Promise((resolve) => {
          resolveMe = resolve;
        });
      });

      render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      );

      // 初期レンダリング直後は isLoading: true, user: null
      expect(screen.getByTestId('isLoading').textContent).toBe('true');
      expect(screen.getByTestId('user').textContent).toBe('null');
      expect(screen.getByTestId('isAuthenticated').textContent).toBe('false');

      // リクエストを解決してクリーンアップ
      await act(async () => {
        resolveMe!(
          new Response(JSON.stringify({ success: false }), {
            status: 401,
          })
        );
      });
    });

    it('初期化処理で /api/v1/auth/me を呼び出す', async () => {
      mockFetch.mockResolvedValue(
        new Response(JSON.stringify({ success: false }), {
          status: 401,
        })
      );

      render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/v1/auth/me', {
          method: 'GET',
          credentials: 'include',
        });
      });
    });

    it('認証情報がない場合は isLoading: false, user: null になる', async () => {
      mockFetch.mockResolvedValue(
        new Response(JSON.stringify({ success: false }), {
          status: 401,
        })
      );

      render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('isLoading').textContent).toBe('false');
      });

      expect(screen.getByTestId('user').textContent).toBe('null');
      expect(screen.getByTestId('isAuthenticated').textContent).toBe('false');
    });

    it('認証情報がある場合は user にユーザー情報がセットされる', async () => {
      mockFetch.mockResolvedValue(
        new Response(
          JSON.stringify({
            success: true,
            data: mockUser,
          }),
          { status: 200 }
        )
      );

      render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('isLoading').textContent).toBe('false');
      });

      expect(screen.getByTestId('isAuthenticated').textContent).toBe('true');
      const userData = JSON.parse(screen.getByTestId('user').textContent!);
      expect(userData.id).toBe(1);
      expect(userData.name).toBe('山田太郎');
    });
  });

  describe('UT-010-02: ログイン成功後', () => {
    it('ログイン成功後は user にユーザー情報がセット, isAuthenticated: true', async () => {
      const user = userEvent.setup();

      // 初期状態: 未認証
      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify({ success: false }), { status: 401 })
      );

      render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('isLoading').textContent).toBe('false');
      });

      expect(screen.getByTestId('isAuthenticated').textContent).toBe('false');

      // ログインAPI成功
      mockFetch.mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            success: true,
            data: {
              token: 'mock.jwt.token',
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

      // /api/v1/auth/me で詳細情報取得
      mockFetch.mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            success: true,
            data: mockUser,
          }),
          { status: 200 }
        )
      );

      // ログインボタンをクリック
      await user.click(screen.getByText('Login'));

      await waitFor(() => {
        expect(screen.getByTestId('isAuthenticated').textContent).toBe('true');
      });

      const userData = JSON.parse(screen.getByTestId('user').textContent!);
      expect(userData.id).toBe(1);
      expect(userData.name).toBe('山田太郎');
      expect(userData.manager?.name).toBe('佐藤次郎');

      // ダッシュボードにリダイレクト
      expect(mockPush).toHaveBeenCalledWith('/');
    });

    it('ログインAPIが正しいパラメータで呼ばれる', async () => {
      const user = userEvent.setup();

      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify({ success: false }), { status: 401 })
      );

      render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('isLoading').textContent).toBe('false');
      });

      mockFetch.mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            success: true,
            data: {
              token: 'mock.jwt.token',
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

      mockFetch.mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            success: true,
            data: mockUser,
          }),
          { status: 200 }
        )
      );

      await user.click(screen.getByText('Login'));

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/v1/auth/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            email: 'test@example.com',
            password: 'password123',
          }),
        });
      });
    });

    it('ログイン失敗時はエラーがスローされる', async () => {
      const user = userEvent.setup();

      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify({ success: false }), { status: 401 })
      );

      render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('isLoading').textContent).toBe('false');
      });

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

      // ログインボタンクリックでエラーがスローされることを検証
      // TestConsumerではエラーをキャッチしてloginErrorにセットする
      await user.click(screen.getByText('Login'));

      await waitFor(() => {
        expect(screen.getByTestId('loginError').textContent).toBe(
          'メールアドレスまたはパスワードが正しくありません'
        );
      });

      // 認証状態は変わらない
      expect(screen.getByTestId('isAuthenticated').textContent).toBe('false');
    });
  });

  describe('UT-010-03: ログアウト後', () => {
    it('ログアウト後は user: null, isAuthenticated: false', async () => {
      const user = userEvent.setup();

      // 初期状態: 認証済み
      mockFetch.mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            success: true,
            data: mockUser,
          }),
          { status: 200 }
        )
      );

      render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('isAuthenticated').textContent).toBe('true');
      });

      // ログアウトAPI成功
      mockFetch.mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            success: true,
            data: { message: 'ログアウトしました' },
          }),
          { status: 200 }
        )
      );

      // ログアウトボタンをクリック
      await user.click(screen.getByText('Logout'));

      await waitFor(() => {
        expect(screen.getByTestId('isAuthenticated').textContent).toBe('false');
      });

      expect(screen.getByTestId('user').textContent).toBe('null');

      // ログイン画面にリダイレクト
      expect(mockPush).toHaveBeenCalledWith('/login');
    });

    it('ログアウトAPIが呼ばれる', async () => {
      const user = userEvent.setup();

      mockFetch.mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            success: true,
            data: mockUser,
          }),
          { status: 200 }
        )
      );

      render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('isAuthenticated').textContent).toBe('true');
      });

      mockFetch.mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            success: true,
            data: { message: 'ログアウトしました' },
          }),
          { status: 200 }
        )
      );

      await user.click(screen.getByText('Logout'));

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/v1/auth/logout', {
          method: 'POST',
          credentials: 'include',
        });
      });
    });

    it('ログアウトAPI失敗時でもユーザー情報はクリアされる', async () => {
      const user = userEvent.setup();

      mockFetch.mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            success: true,
            data: mockUser,
          }),
          { status: 200 }
        )
      );

      render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('isAuthenticated').textContent).toBe('true');
      });

      // ログアウトAPI失敗
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await user.click(screen.getByText('Logout'));

      await waitFor(() => {
        expect(screen.getByTestId('isAuthenticated').textContent).toBe('false');
      });

      expect(screen.getByTestId('user').textContent).toBe('null');
      expect(mockPush).toHaveBeenCalledWith('/login');
    });
  });

  describe('refreshUser', () => {
    it('refreshUserで最新のユーザー情報を取得できる', async () => {
      const user = userEvent.setup();

      // 初期状態
      mockFetch.mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            success: true,
            data: mockUser,
          }),
          { status: 200 }
        )
      );

      render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('isLoading').textContent).toBe('false');
      });

      // 更新されたユーザー情報
      const updatedUser = { ...mockUser, name: '山田次郎' };
      mockFetch.mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            success: true,
            data: updatedUser,
          }),
          { status: 200 }
        )
      );

      await user.click(screen.getByText('Refresh'));

      await waitFor(() => {
        const userData = JSON.parse(screen.getByTestId('user').textContent!);
        expect(userData.name).toBe('山田次郎');
      });
    });
  });

  describe('エッジケース', () => {
    it('fetch例外時はユーザー情報がnullになる', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('isLoading').textContent).toBe('false');
      });

      expect(screen.getByTestId('user').textContent).toBe('null');
      expect(screen.getByTestId('isAuthenticated').textContent).toBe('false');
    });

    it('APIレスポンスのsuccess: falseの場合はユーザー情報がnullになる', async () => {
      mockFetch.mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            success: false,
            error: { code: 'UNAUTHORIZED', message: '認証が必要です' },
          }),
          { status: 401 }
        )
      );

      render(
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('isLoading').textContent).toBe('false');
      });

      expect(screen.getByTestId('user').textContent).toBe('null');
    });
  });
});
