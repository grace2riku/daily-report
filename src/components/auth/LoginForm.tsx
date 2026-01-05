'use client';

import { AlertCircle, Loader2 } from 'lucide-react';
import { useState } from 'react';
import type { FormEvent } from 'react';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';
import { loginSchema } from '@/lib/validations/auth';

/**
 * API認証エラーの表示メッセージ定義
 *
 * バリデーションエラー（E001/E002）はZodスキーマで定義されているため、
 * ここではAPI認証エラー（E003/E004）のみを定義する。
 */
const API_ERROR_MESSAGES = {
  /** メールアドレスまたはパスワードが正しくありません */
  INVALID_CREDENTIALS: 'メールアドレスまたはパスワードが正しくありません',
  /** アカウントが無効化されています */
  ACCOUNT_DISABLED: 'アカウントが無効化されています',
} as const;

/**
 * フィールドエラーの型定義
 */
interface FieldErrors {
  email?: string;
  password?: string;
}

/**
 * APIエラーメッセージを画面表示用メッセージに変換
 */
function mapApiErrorToDisplayMessage(errorMessage: string): string {
  if (errorMessage.includes('無効化') || errorMessage.includes('disabled')) {
    return API_ERROR_MESSAGES.ACCOUNT_DISABLED;
  }
  if (
    errorMessage.includes('正しくありません') ||
    errorMessage.includes('Invalid') ||
    errorMessage.includes('credentials')
  ) {
    return API_ERROR_MESSAGES.INVALID_CREDENTIALS;
  }
  return API_ERROR_MESSAGES.INVALID_CREDENTIALS;
}

/**
 * ログインフォームコンポーネント
 *
 * メールアドレスとパスワードを入力してログインを行う。
 * バリデーションエラーと認証エラーを適切に表示する。
 */
export function LoginForm() {
  const { login, isLoading: isAuthLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isLoading = isAuthLoading || isSubmitting;

  /**
   * フィールドの値が変更されたときにエラーをクリア
   */
  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
    if (fieldErrors.email) {
      setFieldErrors((prev) => ({ ...prev, email: undefined }));
    }
    if (submitError) {
      setSubmitError(null);
    }
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value);
    if (fieldErrors.password) {
      setFieldErrors((prev) => ({ ...prev, password: undefined }));
    }
    if (submitError) {
      setSubmitError(null);
    }
  };

  /**
   * フォーム送信処理
   */
  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFieldErrors({});
    setSubmitError(null);

    // クライアントサイドバリデーション
    const result = loginSchema.safeParse({ email, password });
    if (!result.success) {
      const errors: FieldErrors = {};
      result.error.issues.forEach((issue) => {
        const field = issue.path[0];
        if (field === 'email') {
          errors.email = issue.message;
        } else if (field === 'password') {
          errors.password = issue.message;
        }
      });
      setFieldErrors(errors);
      return;
    }

    // ログイン処理
    setIsSubmitting(true);
    try {
      await login(email, password);
      // 成功時はAuthContextでリダイレクトされる
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'ログインに失敗しました';
      setSubmitError(mapApiErrorToDisplayMessage(errorMessage));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6" noValidate>
      {/* エラーメッセージ表示エリア */}
      {submitError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{submitError}</AlertDescription>
        </Alert>
      )}

      {/* メールアドレス */}
      <div className="space-y-2">
        <Label htmlFor="email">メールアドレス</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="example@example.com"
          value={email}
          onChange={handleEmailChange}
          disabled={isLoading}
          aria-invalid={!!fieldErrors.email}
          aria-describedby={fieldErrors.email ? 'email-error' : undefined}
        />
        {fieldErrors.email && (
          <p id="email-error" className="text-sm text-destructive" role="alert">
            {fieldErrors.email}
          </p>
        )}
      </div>

      {/* パスワード */}
      <div className="space-y-2">
        <Label htmlFor="password">パスワード</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          placeholder="パスワード"
          value={password}
          onChange={handlePasswordChange}
          disabled={isLoading}
          aria-invalid={!!fieldErrors.password}
          aria-describedby={fieldErrors.password ? 'password-error' : undefined}
        />
        {fieldErrors.password && (
          <p id="password-error" className="text-sm text-destructive" role="alert">
            {fieldErrors.password}
          </p>
        )}
      </div>

      {/* ログインボタン */}
      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ログイン中...
          </>
        ) : (
          'ログイン'
        )}
      </Button>
    </form>
  );
}
