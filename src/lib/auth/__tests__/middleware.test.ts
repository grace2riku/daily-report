import { NextRequest, NextResponse } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import prisma from '@/lib/prisma';

import { generateToken } from '../jwt';
import {
  authenticateRequest,
  withAdmin,
  withAuth,
  withManagerOrAdmin,
  withRole,
  type AuthenticatedUser,
} from '../middleware';

// Prisma モック
vi.mock('@/lib/prisma', () => ({
  default: {
    salesPerson: {
      findUnique: vi.fn(),
    },
  },
}));

// モックデータ
const mockMember = {
  id: 1,
  employeeCode: 'EMP001',
  name: '山田太郎',
  email: 'yamada@example.com',
  role: 'member' as const,
  managerId: 3,
  isActive: true,
};

const mockManager = {
  id: 3,
  employeeCode: 'EMP003',
  name: '佐藤次郎',
  email: 'sato@example.com',
  role: 'manager' as const,
  managerId: null,
  isActive: true,
};

const mockAdmin = {
  id: 4,
  employeeCode: 'EMP004',
  name: 'テスト管理者',
  email: 'admin@example.com',
  role: 'admin' as const,
  managerId: null,
  isActive: true,
};

const mockDisabledUser = {
  id: 5,
  employeeCode: 'EMP005',
  name: '無効ユーザー',
  email: 'disabled@example.com',
  role: 'member' as const,
  managerId: null,
  isActive: false,
};

/**
 * テスト用のリクエストを作成
 */
function createRequest(token?: string): NextRequest {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return new NextRequest('http://localhost:3000/api/test', {
    method: 'GET',
    headers,
  });
}

describe('認証ミドルウェア', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('authenticateRequest', () => {
    it('有効なトークンでユーザー情報を返す', async () => {
      const findUniqueMock = vi.mocked(prisma.salesPerson.findUnique);
      findUniqueMock.mockResolvedValueOnce(mockMember);

      const { token } = await generateToken({
        userId: mockMember.id,
        email: mockMember.email,
        role: mockMember.role,
      });

      const request = createRequest(token);
      const result = await authenticateRequest(request);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.user.id).toBe(mockMember.id);
        expect(result.user.email).toBe(mockMember.email);
        expect(result.user.role).toBe(mockMember.role);
      }
    });

    it('トークンがない場合はエラーを返す', async () => {
      const request = createRequest();
      const result = await authenticateRequest(request);

      expect(result.success).toBe(false);
      if (!result.success) {
        const data = await result.response.json();
        expect(data.error.code).toBe('UNAUTHORIZED');
        expect(data.error.message).toBe('認証トークンが必要です');
      }
    });

    it('無効なトークンの場合はエラーを返す', async () => {
      const request = createRequest('invalid-token');
      const result = await authenticateRequest(request);

      expect(result.success).toBe(false);
      if (!result.success) {
        const data = await result.response.json();
        expect(data.error.code).toBe('UNAUTHORIZED');
        expect(data.error.message).toBe('無効なトークンです');
      }
    });

    it('ユーザーが存在しない場合はエラーを返す', async () => {
      const findUniqueMock = vi.mocked(prisma.salesPerson.findUnique);
      findUniqueMock.mockResolvedValueOnce(null);

      const { token } = await generateToken({
        userId: 999,
        email: 'notexist@example.com',
        role: 'member',
      });

      const request = createRequest(token);
      const result = await authenticateRequest(request);

      expect(result.success).toBe(false);
      if (!result.success) {
        const data = await result.response.json();
        expect(data.error.code).toBe('UNAUTHORIZED');
        expect(data.error.message).toBe('ユーザーが見つかりません');
      }
    });

    it('アカウントが無効化されている場合はエラーを返す', async () => {
      const findUniqueMock = vi.mocked(prisma.salesPerson.findUnique);
      findUniqueMock.mockResolvedValueOnce(mockDisabledUser);

      const { token } = await generateToken({
        userId: mockDisabledUser.id,
        email: mockDisabledUser.email,
        role: mockDisabledUser.role,
      });

      const request = createRequest(token);
      const result = await authenticateRequest(request);

      expect(result.success).toBe(false);
      if (!result.success) {
        const data = await result.response.json();
        expect(data.error.code).toBe('ACCOUNT_DISABLED');
      }
    });
  });

  describe('withAuth', () => {
    it('認証済みの場合はハンドラーを実行する', async () => {
      const findUniqueMock = vi.mocked(prisma.salesPerson.findUnique);
      findUniqueMock.mockResolvedValueOnce(mockMember);

      const handler = vi.fn(async (_req: NextRequest, user: AuthenticatedUser) => {
        return NextResponse.json({ success: true, userId: user.id });
      });

      const wrappedHandler = withAuth(handler);

      const { token } = await generateToken({
        userId: mockMember.id,
        email: mockMember.email,
        role: mockMember.role,
      });

      const request = createRequest(token);
      const response = await wrappedHandler(request);
      const data = await response.json();

      expect(handler).toHaveBeenCalled();
      expect(data.success).toBe(true);
      expect(data.userId).toBe(mockMember.id);
    });

    it('未認証の場合はハンドラーを実行しない', async () => {
      const handler = vi.fn();
      const wrappedHandler = withAuth(handler);

      const request = createRequest();
      const response = await wrappedHandler(request);
      const data = await response.json();

      expect(handler).not.toHaveBeenCalled();
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('UNAUTHORIZED');
    });
  });

  describe('withRole', () => {
    it('許可されたロールの場合はハンドラーを実行する', async () => {
      const findUniqueMock = vi.mocked(prisma.salesPerson.findUnique);
      findUniqueMock.mockResolvedValueOnce(mockManager);

      const handler = vi.fn(async () => {
        return NextResponse.json({ success: true });
      });

      const wrappedHandler = withRole(['manager', 'admin'], handler);

      const { token } = await generateToken({
        userId: mockManager.id,
        email: mockManager.email,
        role: mockManager.role,
      });

      const request = createRequest(token);
      const response = await wrappedHandler(request);
      const data = await response.json();

      expect(handler).toHaveBeenCalled();
      expect(data.success).toBe(true);
    });

    it('許可されていないロールの場合はエラーを返す', async () => {
      const findUniqueMock = vi.mocked(prisma.salesPerson.findUnique);
      findUniqueMock.mockResolvedValueOnce(mockMember);

      const handler = vi.fn();
      const wrappedHandler = withRole(['manager', 'admin'], handler);

      const { token } = await generateToken({
        userId: mockMember.id,
        email: mockMember.email,
        role: mockMember.role,
      });

      const request = createRequest(token);
      const response = await wrappedHandler(request);
      const data = await response.json();

      expect(handler).not.toHaveBeenCalled();
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('FORBIDDEN');
    });
  });

  describe('withAdmin', () => {
    it('管理者の場合はハンドラーを実行する', async () => {
      const findUniqueMock = vi.mocked(prisma.salesPerson.findUnique);
      findUniqueMock.mockResolvedValueOnce(mockAdmin);

      const handler = vi.fn(async () => {
        return NextResponse.json({ success: true });
      });

      const wrappedHandler = withAdmin(handler);

      const { token } = await generateToken({
        userId: mockAdmin.id,
        email: mockAdmin.email,
        role: mockAdmin.role,
      });

      const request = createRequest(token);
      const response = await wrappedHandler(request);
      const data = await response.json();

      expect(handler).toHaveBeenCalled();
      expect(data.success).toBe(true);
    });

    it('管理者以外の場合はエラーを返す', async () => {
      const findUniqueMock = vi.mocked(prisma.salesPerson.findUnique);
      findUniqueMock.mockResolvedValueOnce(mockManager);

      const handler = vi.fn();
      const wrappedHandler = withAdmin(handler);

      const { token } = await generateToken({
        userId: mockManager.id,
        email: mockManager.email,
        role: mockManager.role,
      });

      const request = createRequest(token);
      const response = await wrappedHandler(request);
      const data = await response.json();

      expect(handler).not.toHaveBeenCalled();
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('FORBIDDEN');
    });
  });

  describe('withManagerOrAdmin', () => {
    it('上長の場合はハンドラーを実行する', async () => {
      const findUniqueMock = vi.mocked(prisma.salesPerson.findUnique);
      findUniqueMock.mockResolvedValueOnce(mockManager);

      const handler = vi.fn(async () => {
        return NextResponse.json({ success: true });
      });

      const wrappedHandler = withManagerOrAdmin(handler);

      const { token } = await generateToken({
        userId: mockManager.id,
        email: mockManager.email,
        role: mockManager.role,
      });

      const request = createRequest(token);
      const response = await wrappedHandler(request);
      const data = await response.json();

      expect(handler).toHaveBeenCalled();
      expect(data.success).toBe(true);
    });

    it('管理者の場合はハンドラーを実行する', async () => {
      const findUniqueMock = vi.mocked(prisma.salesPerson.findUnique);
      findUniqueMock.mockResolvedValueOnce(mockAdmin);

      const handler = vi.fn(async () => {
        return NextResponse.json({ success: true });
      });

      const wrappedHandler = withManagerOrAdmin(handler);

      const { token } = await generateToken({
        userId: mockAdmin.id,
        email: mockAdmin.email,
        role: mockAdmin.role,
      });

      const request = createRequest(token);
      const response = await wrappedHandler(request);
      const data = await response.json();

      expect(handler).toHaveBeenCalled();
      expect(data.success).toBe(true);
    });

    it('一般営業の場合はエラーを返す', async () => {
      const findUniqueMock = vi.mocked(prisma.salesPerson.findUnique);
      findUniqueMock.mockResolvedValueOnce(mockMember);

      const handler = vi.fn();
      const wrappedHandler = withManagerOrAdmin(handler);

      const { token } = await generateToken({
        userId: mockMember.id,
        email: mockMember.email,
        role: mockMember.role,
      });

      const request = createRequest(token);
      const response = await wrappedHandler(request);
      const data = await response.json();

      expect(handler).not.toHaveBeenCalled();
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('FORBIDDEN');
    });
  });
});
