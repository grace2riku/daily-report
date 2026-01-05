/**
 * LoginForm コンポーネントのテスト
 *
 * テスト仕様書 E2E-001 に基づいた単体テスト
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach } from 'vitest';

import { LoginForm } from '../LoginForm';

// useAuth フックのモック
const mockLogin = vi.fn();
const mockUseAuth = vi.fn(() => ({
  login: mockLogin,
  isLoading: false,
  isAuthenticated: false,
  user: null,
  logout: vi.fn(),
  refreshUser: vi.fn(),
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => mockUseAuth(),
}));

describe('LoginForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLogin.mockReset();
    mockUseAuth.mockImplementation(() => ({
      login: mockLogin,
      isLoading: false,
      isAuthenticated: false,
      user: null,
      logout: vi.fn(),
      refreshUser: vi.fn(),
    }));
  });

  describe('レンダリング', () => {
    it('メールアドレス入力欄が表示される', () => {
      render(<LoginForm />);
      expect(screen.getByLabelText('メールアドレス')).toBeInTheDocument();
    });

    it('パスワード入力欄が表示される', () => {
      render(<LoginForm />);
      expect(screen.getByLabelText('パスワード')).toBeInTheDocument();
    });

    it('ログインボタンが表示される', () => {
      render(<LoginForm />);
      expect(screen.getByRole('button', { name: 'ログイン' })).toBeInTheDocument();
    });
  });

  describe('バリデーション', () => {
    it('メールアドレス未入力で送信するとエラーメッセージが表示される (E001)', async () => {
      const user = userEvent.setup();
      render(<LoginForm />);

      await user.type(screen.getByLabelText('パスワード'), 'password123');
      await user.click(screen.getByRole('button', { name: 'ログイン' }));

      await waitFor(() => {
        // 空文字列の場合、Zodはメール形式エラーを返す
        expect(screen.getByText('有効なメールアドレスを入力してください')).toBeInTheDocument();
      });

      // login関数は呼ばれない
      expect(mockLogin).not.toHaveBeenCalled();
    });

    it('パスワード未入力で送信するとエラーメッセージが表示される (E002)', async () => {
      const user = userEvent.setup();
      render(<LoginForm />);

      await user.type(screen.getByLabelText('メールアドレス'), 'test@example.com');
      await user.click(screen.getByRole('button', { name: 'ログイン' }));

      await waitFor(() => {
        expect(screen.getByText('パスワードを入力してください')).toBeInTheDocument();
      });

      // login関数は呼ばれない
      expect(mockLogin).not.toHaveBeenCalled();
    });

    it('無効なメールアドレス形式で送信するとエラーメッセージが表示される', async () => {
      const user = userEvent.setup();
      render(<LoginForm />);

      await user.type(screen.getByLabelText('メールアドレス'), 'invalid-email');
      await user.type(screen.getByLabelText('パスワード'), 'password123');
      await user.click(screen.getByRole('button', { name: 'ログイン' }));

      await waitFor(() => {
        expect(screen.getByText('有効なメールアドレスを入力してください')).toBeInTheDocument();
      });

      expect(mockLogin).not.toHaveBeenCalled();
    });

    it('両方未入力で送信すると両方のエラーメッセージが表示される', async () => {
      const user = userEvent.setup();
      render(<LoginForm />);

      await user.click(screen.getByRole('button', { name: 'ログイン' }));

      await waitFor(() => {
        // 空文字列の場合、Zodはメール形式エラーを返す
        expect(screen.getByText('有効なメールアドレスを入力してください')).toBeInTheDocument();
        expect(screen.getByText('パスワードを入力してください')).toBeInTheDocument();
      });

      expect(mockLogin).not.toHaveBeenCalled();
    });

    it('入力するとエラーメッセージがクリアされる', async () => {
      const user = userEvent.setup();
      render(<LoginForm />);

      // まずエラーを発生させる
      await user.click(screen.getByRole('button', { name: 'ログイン' }));

      await waitFor(() => {
        // 空文字列の場合、Zodはメール形式エラーを返す
        expect(screen.getByText('有効なメールアドレスを入力してください')).toBeInTheDocument();
      });

      // 入力するとエラーがクリアされる
      await user.type(screen.getByLabelText('メールアドレス'), 'test@example.com');

      await waitFor(() => {
        expect(
          screen.queryByText('有効なメールアドレスを入力してください')
        ).not.toBeInTheDocument();
      });
    });
  });

  describe('ログイン処理', () => {
    it('有効な入力で送信するとlogin関数が呼ばれる', async () => {
      mockLogin.mockResolvedValue(undefined);
      const user = userEvent.setup();
      render(<LoginForm />);

      await user.type(screen.getByLabelText('メールアドレス'), 'test@example.com');
      await user.type(screen.getByLabelText('パスワード'), 'password123');
      await user.click(screen.getByRole('button', { name: 'ログイン' }));

      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalledWith('test@example.com', 'password123');
      });
    });

    it('ログイン失敗時にエラーメッセージが表示される (E003)', async () => {
      mockLogin.mockRejectedValue(new Error('メールアドレスまたはパスワードが正しくありません'));
      const user = userEvent.setup();
      render(<LoginForm />);

      await user.type(screen.getByLabelText('メールアドレス'), 'test@example.com');
      await user.type(screen.getByLabelText('パスワード'), 'wrongpassword');
      await user.click(screen.getByRole('button', { name: 'ログイン' }));

      await waitFor(() => {
        expect(
          screen.getByText('メールアドレスまたはパスワードが正しくありません')
        ).toBeInTheDocument();
      });
    });

    it('アカウント無効時にエラーメッセージが表示される (E004)', async () => {
      mockLogin.mockRejectedValue(new Error('アカウントが無効化されています'));
      const user = userEvent.setup();
      render(<LoginForm />);

      await user.type(screen.getByLabelText('メールアドレス'), 'disabled@example.com');
      await user.type(screen.getByLabelText('パスワード'), 'password123');
      await user.click(screen.getByRole('button', { name: 'ログイン' }));

      await waitFor(() => {
        expect(screen.getByText('アカウントが無効化されています')).toBeInTheDocument();
      });
    });

    it('ログイン中はボタンが無効化される', async () => {
      // login関数を遅延させる
      let resolveLogin: () => void;
      mockLogin.mockImplementation(
        () =>
          new Promise<void>((resolve) => {
            resolveLogin = resolve;
          })
      );

      const user = userEvent.setup();
      render(<LoginForm />);

      await user.type(screen.getByLabelText('メールアドレス'), 'test@example.com');
      await user.type(screen.getByLabelText('パスワード'), 'password123');
      await user.click(screen.getByRole('button', { name: 'ログイン' }));

      // ローディング中の状態を確認
      await waitFor(() => {
        expect(screen.getByRole('button')).toBeDisabled();
        expect(screen.getByText('ログイン中...')).toBeInTheDocument();
      });

      // ログイン完了
      resolveLogin!();
    });

    it('isLoading中は入力フィールドとボタンが無効化される', () => {
      mockUseAuth.mockImplementation(() => ({
        login: mockLogin,
        isLoading: true,
        isAuthenticated: false,
        user: null,
        logout: vi.fn(),
        refreshUser: vi.fn(),
      }));

      render(<LoginForm />);

      expect(screen.getByLabelText('メールアドレス')).toBeDisabled();
      expect(screen.getByLabelText('パスワード')).toBeDisabled();
      expect(screen.getByRole('button')).toBeDisabled();
    });
  });

  describe('アクセシビリティ', () => {
    it('フォーム要素に適切なラベルが設定されている', () => {
      render(<LoginForm />);

      const emailInput = screen.getByLabelText('メールアドレス');
      const passwordInput = screen.getByLabelText('パスワード');

      expect(emailInput).toHaveAttribute('type', 'email');
      expect(emailInput).toHaveAttribute('autocomplete', 'email');
      expect(passwordInput).toHaveAttribute('type', 'password');
      expect(passwordInput).toHaveAttribute('autocomplete', 'current-password');
    });

    it('エラー時にaria-invalidとaria-describedbyが設定される', async () => {
      const user = userEvent.setup();
      render(<LoginForm />);

      await user.click(screen.getByRole('button', { name: 'ログイン' }));

      await waitFor(() => {
        const emailInput = screen.getByLabelText('メールアドレス');
        expect(emailInput).toHaveAttribute('aria-invalid', 'true');
        expect(emailInput).toHaveAttribute('aria-describedby', 'email-error');

        const passwordInput = screen.getByLabelText('パスワード');
        expect(passwordInput).toHaveAttribute('aria-invalid', 'true');
        expect(passwordInput).toHaveAttribute('aria-describedby', 'password-error');
      });
    });

    it('エラーメッセージにrole="alert"が設定されている', async () => {
      const user = userEvent.setup();
      render(<LoginForm />);

      await user.click(screen.getByRole('button', { name: 'ログイン' }));

      await waitFor(() => {
        const alerts = screen.getAllByRole('alert');
        expect(alerts.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Enterキーで送信', () => {
    it('Enterキーでフォームを送信できる', async () => {
      mockLogin.mockResolvedValue(undefined);
      const user = userEvent.setup();
      render(<LoginForm />);

      await user.type(screen.getByLabelText('メールアドレス'), 'test@example.com');
      await user.type(screen.getByLabelText('パスワード'), 'password123{Enter}');

      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalledWith('test@example.com', 'password123');
      });
    });
  });
});
