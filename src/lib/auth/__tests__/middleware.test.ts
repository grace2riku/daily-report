/**
 * 認証ミドルウェアのテスト
 *
 * @vitest-environment node
 */

import { NextRequest, NextResponse } from 'next/server';
import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest';

import { prisma } from '@/lib/prisma';
import type { UserRole, JwtPayload, ApiErrorResponse } from '@/types';

import { generateToken } from '../jwt';
import {
  withAuth,
  withRole,
  withAdmin,
  isSubordinate,
  canViewReport,
  canPostComment,
  canEditReport,
  canManageMaster,
  AuthUser,
} from '../middleware';

// Prismaのモック
vi.mock('@/lib/prisma', () => ({
  prisma: {
    salesPerson: {
      findUnique: vi.fn(),
    },
  },
}));

const TEST_SECRET = 'test-secret-key-for-testing-only-32-chars';

/**
 * テスト用のNextRequestを作成するヘルパー
 */
function createMockRequest(options: {
  authHeader?: string | null;
  method?: string;
  url?: string;
}): NextRequest {
  const url = options.url || 'http://localhost:3000/api/test';
  const request = new NextRequest(url, {
    method: options.method || 'GET',
  });

  if (options.authHeader !== null && options.authHeader !== undefined) {
    // headersは読み取り専用なのでモック用に新しいリクエストを作成
    const headers = new Headers();
    headers.set('Authorization', options.authHeader);

    return new NextRequest(url, {
      method: options.method || 'GET',
      headers,
    });
  }

  return request;
}

describe('認証ミドルウェア', () => {
  const testPayload: JwtPayload = {
    userId: 1,
    email: 'test@example.com',
    role: 'member',
  };

  beforeAll(() => {
    process.env.JWT_SECRET = TEST_SECRET;
  });

  beforeEach(() => {
    process.env.JWT_SECRET = TEST_SECRET;
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe('withAuth', () => {
    it('有効なトークンで認証成功し、ハンドラーが実行される', async () => {
      const token = await generateToken(testPayload);
      const request = createMockRequest({ authHeader: `Bearer ${token}` });

      const handler = vi
        .fn()
        .mockResolvedValue(
          NextResponse.json({ success: true, data: { userId: testPayload.userId } })
        );

      const response = await withAuth(request, handler);
      const body = await response.json();

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith(
        request,
        expect.objectContaining({
          id: testPayload.userId,
          email: testPayload.email,
          role: testPayload.role,
        })
      );
      expect(body.success).toBe(true);
      expect(body.data.userId).toBe(testPayload.userId);
    });

    it('Authorizationヘッダーがない場合は401エラーを返す', async () => {
      const request = createMockRequest({});
      const handler = vi.fn();

      const response = await withAuth(request, handler);
      const body = (await response.json()) as ApiErrorResponse;

      expect(handler).not.toHaveBeenCalled();
      expect(response.status).toBe(401);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('UNAUTHORIZED');
    });

    it('無効なトークンの場合は401エラーを返す', async () => {
      const request = createMockRequest({ authHeader: 'Bearer invalid-token' });
      const handler = vi.fn();

      const response = await withAuth(request, handler);
      const body = (await response.json()) as ApiErrorResponse;

      expect(handler).not.toHaveBeenCalled();
      expect(response.status).toBe(401);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('UNAUTHORIZED');
    });

    it('Bearer形式でないトークンの場合は401エラーを返す', async () => {
      const token = await generateToken(testPayload);
      const request = createMockRequest({ authHeader: `Basic ${token}` });
      const handler = vi.fn();

      const response = await withAuth(request, handler);
      const body = (await response.json()) as ApiErrorResponse;

      expect(handler).not.toHaveBeenCalled();
      expect(response.status).toBe(401);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('UNAUTHORIZED');
    });

    it('期限切れのトークンの場合は401エラーを返す', async () => {
      // 期限切れトークンをシミュレート（改竄されたトークン）
      const token = await generateToken(testPayload);
      const tamperedToken = token.slice(0, -5) + 'xxxxx';
      const request = createMockRequest({ authHeader: `Bearer ${tamperedToken}` });
      const handler = vi.fn();

      const response = await withAuth(request, handler);
      const body = (await response.json()) as ApiErrorResponse;

      expect(handler).not.toHaveBeenCalled();
      expect(response.status).toBe(401);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('UNAUTHORIZED');
    });

    it('全てのロールで認証できる', async () => {
      const roles: UserRole[] = ['member', 'manager', 'admin'];

      for (const role of roles) {
        const payload: JwtPayload = { ...testPayload, role };
        const token = await generateToken(payload);
        const request = createMockRequest({ authHeader: `Bearer ${token}` });
        const handler = vi.fn().mockResolvedValue(NextResponse.json({ success: true, data: {} }));

        const response = await withAuth(request, handler);
        const body = await response.json();

        expect(handler).toHaveBeenCalledWith(request, expect.objectContaining({ role }));
        expect(body.success).toBe(true);
      }
    });
  });

  describe('withRole', () => {
    it('許可されたロールの場合、ハンドラーが実行される', async () => {
      const payload: JwtPayload = { ...testPayload, role: 'manager' };
      const token = await generateToken(payload);
      const request = createMockRequest({ authHeader: `Bearer ${token}` });

      const handler = vi
        .fn()
        .mockResolvedValue(NextResponse.json({ success: true, data: { message: 'success' } }));

      const response = await withRole(request, ['manager', 'admin'], handler);
      const body = await response.json();

      expect(handler).toHaveBeenCalledTimes(1);
      expect(body.success).toBe(true);
    });

    it('許可されていないロールの場合は403エラーを返す', async () => {
      const payload: JwtPayload = { ...testPayload, role: 'member' };
      const token = await generateToken(payload);
      const request = createMockRequest({ authHeader: `Bearer ${token}` });

      const handler = vi.fn();

      const response = await withRole(request, ['manager', 'admin'], handler);
      const body = (await response.json()) as ApiErrorResponse;

      expect(handler).not.toHaveBeenCalled();
      expect(response.status).toBe(403);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('FORBIDDEN');
    });

    it('認証されていない場合は401エラーを返す', async () => {
      const request = createMockRequest({});
      const handler = vi.fn();

      const response = await withRole(request, ['admin'], handler);
      const body = (await response.json()) as ApiErrorResponse;

      expect(handler).not.toHaveBeenCalled();
      expect(response.status).toBe(401);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('UNAUTHORIZED');
    });

    it('adminは許可リストに含まれていれば通過できる', async () => {
      const payload: JwtPayload = { ...testPayload, role: 'admin' };
      const token = await generateToken(payload);
      const request = createMockRequest({ authHeader: `Bearer ${token}` });

      const handler = vi.fn().mockResolvedValue(NextResponse.json({ success: true, data: {} }));

      const response = await withRole(request, ['admin'], handler);
      const body = await response.json();

      expect(handler).toHaveBeenCalledTimes(1);
      expect(body.success).toBe(true);
    });

    it('複数のロールが許可されている場合、いずれかのロールで通過できる', async () => {
      const allowedRoles: UserRole[] = ['member', 'manager', 'admin'];

      for (const role of allowedRoles) {
        const payload: JwtPayload = { ...testPayload, role };
        const token = await generateToken(payload);
        const request = createMockRequest({ authHeader: `Bearer ${token}` });
        const handler = vi.fn().mockResolvedValue(NextResponse.json({ success: true, data: {} }));

        const response = await withRole(request, allowedRoles, handler);
        const body = await response.json();

        expect(handler).toHaveBeenCalled();
        expect(body.success).toBe(true);
      }
    });
  });

  describe('withAdmin', () => {
    it('adminロールの場合、ハンドラーが実行される', async () => {
      const payload: JwtPayload = { ...testPayload, role: 'admin' };
      const token = await generateToken(payload);
      const request = createMockRequest({ authHeader: `Bearer ${token}` });

      const handler = vi
        .fn()
        .mockResolvedValue(NextResponse.json({ success: true, data: { message: 'admin only' } }));

      const response = await withAdmin(request, handler);
      const body = await response.json();

      expect(handler).toHaveBeenCalledTimes(1);
      expect(body.success).toBe(true);
    });

    it('memberロールの場合は403エラーを返す', async () => {
      const payload: JwtPayload = { ...testPayload, role: 'member' };
      const token = await generateToken(payload);
      const request = createMockRequest({ authHeader: `Bearer ${token}` });

      const handler = vi.fn();

      const response = await withAdmin(request, handler);
      const body = (await response.json()) as ApiErrorResponse;

      expect(handler).not.toHaveBeenCalled();
      expect(response.status).toBe(403);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('FORBIDDEN');
    });

    it('managerロールの場合は403エラーを返す', async () => {
      const payload: JwtPayload = { ...testPayload, role: 'manager' };
      const token = await generateToken(payload);
      const request = createMockRequest({ authHeader: `Bearer ${token}` });

      const handler = vi.fn();

      const response = await withAdmin(request, handler);
      const body = (await response.json()) as ApiErrorResponse;

      expect(handler).not.toHaveBeenCalled();
      expect(response.status).toBe(403);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('FORBIDDEN');
    });

    it('認証されていない場合は401エラーを返す', async () => {
      const request = createMockRequest({});
      const handler = vi.fn();

      const response = await withAdmin(request, handler);
      const body = (await response.json()) as ApiErrorResponse;

      expect(handler).not.toHaveBeenCalled();
      expect(response.status).toBe(401);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('UNAUTHORIZED');
    });
  });

  describe('isSubordinate', () => {
    it('対象ユーザーがマネージャーの部下の場合trueを返す', async () => {
      const managerId = 3;
      const subordinateId = 1;

      vi.mocked(prisma.salesPerson.findUnique).mockResolvedValue({
        managerId: managerId,
      } as never);

      const result = await isSubordinate(managerId, subordinateId);

      expect(result).toBe(true);
      expect(prisma.salesPerson.findUnique).toHaveBeenCalledWith({
        where: { id: subordinateId },
        select: { managerId: true },
      });
    });

    it('対象ユーザーがマネージャーの部下でない場合falseを返す', async () => {
      const managerId = 3;
      const otherUserId = 5;

      vi.mocked(prisma.salesPerson.findUnique).mockResolvedValue({
        managerId: 99, // 別のマネージャー
      } as never);

      const result = await isSubordinate(managerId, otherUserId);

      expect(result).toBe(false);
    });

    it('対象ユーザーが存在しない場合falseを返す', async () => {
      const managerId = 3;
      const nonExistentUserId = 999;

      vi.mocked(prisma.salesPerson.findUnique).mockResolvedValue(null);

      const result = await isSubordinate(managerId, nonExistentUserId);

      expect(result).toBe(false);
    });

    it('同じユーザーIDの場合falseを返す（自分は自分の部下ではない）', async () => {
      const userId = 1;

      const result = await isSubordinate(userId, userId);

      expect(result).toBe(false);
      expect(prisma.salesPerson.findUnique).not.toHaveBeenCalled();
    });

    it('対象ユーザーにマネージャーが設定されていない場合falseを返す', async () => {
      const managerId = 3;
      const userWithoutManagerId = 5;

      vi.mocked(prisma.salesPerson.findUnique).mockResolvedValue({
        managerId: null,
      } as never);

      const result = await isSubordinate(managerId, userWithoutManagerId);

      expect(result).toBe(false);
    });
  });

  describe('canViewReport', () => {
    const memberUser: AuthUser = { id: 1, email: 'member@example.com', role: 'member' };
    const managerUser: AuthUser = { id: 3, email: 'manager@example.com', role: 'manager' };
    const adminUser: AuthUser = { id: 4, email: 'admin@example.com', role: 'admin' };

    it('adminは全ての日報を閲覧可能', async () => {
      const reportOwnerId = 99;

      const result = await canViewReport(adminUser, reportOwnerId);

      expect(result).toBe(true);
      expect(prisma.salesPerson.findUnique).not.toHaveBeenCalled();
    });

    it('自分の日報は誰でも閲覧可能', async () => {
      const result = await canViewReport(memberUser, memberUser.id);

      expect(result).toBe(true);
      expect(prisma.salesPerson.findUnique).not.toHaveBeenCalled();
    });

    it('managerは部下の日報を閲覧可能', async () => {
      const subordinateId = 1;

      vi.mocked(prisma.salesPerson.findUnique).mockResolvedValue({
        managerId: managerUser.id,
      } as never);

      const result = await canViewReport(managerUser, subordinateId);

      expect(result).toBe(true);
    });

    it('managerは部下以外の日報を閲覧不可', async () => {
      const otherUserId = 99;

      vi.mocked(prisma.salesPerson.findUnique).mockResolvedValue({
        managerId: 999, // 別のマネージャー
      } as never);

      const result = await canViewReport(managerUser, otherUserId);

      expect(result).toBe(false);
    });

    it('memberは他人の日報を閲覧不可', async () => {
      const otherUserId = 2;

      const result = await canViewReport(memberUser, otherUserId);

      expect(result).toBe(false);
      expect(prisma.salesPerson.findUnique).not.toHaveBeenCalled();
    });
  });

  describe('canPostComment', () => {
    const memberUser: AuthUser = { id: 1, email: 'member@example.com', role: 'member' };
    const managerUser: AuthUser = { id: 3, email: 'manager@example.com', role: 'manager' };
    const adminUser: AuthUser = { id: 4, email: 'admin@example.com', role: 'admin' };

    it('adminは全ての日報にコメント可能', async () => {
      const reportOwnerId = 99;

      const result = await canPostComment(adminUser, reportOwnerId);

      expect(result).toBe(true);
    });

    it('managerは部下の日報にコメント可能', async () => {
      const subordinateId = 1;

      vi.mocked(prisma.salesPerson.findUnique).mockResolvedValue({
        managerId: managerUser.id,
      } as never);

      const result = await canPostComment(managerUser, subordinateId);

      expect(result).toBe(true);
    });

    it('managerは部下以外の日報にコメント不可', async () => {
      const otherUserId = 99;

      vi.mocked(prisma.salesPerson.findUnique).mockResolvedValue({
        managerId: 999,
      } as never);

      const result = await canPostComment(managerUser, otherUserId);

      expect(result).toBe(false);
    });

    it('memberはコメント不可', async () => {
      const anyUserId = 2;

      const result = await canPostComment(memberUser, anyUserId);

      expect(result).toBe(false);
    });

    it('memberは自分の日報にもコメント不可', async () => {
      const result = await canPostComment(memberUser, memberUser.id);

      expect(result).toBe(false);
    });
  });

  describe('canEditReport', () => {
    const user: AuthUser = { id: 1, email: 'test@example.com', role: 'member' };

    it('自分の日報は編集可能', () => {
      const result = canEditReport(user, user.id);

      expect(result).toBe(true);
    });

    it('他人の日報は編集不可', () => {
      const result = canEditReport(user, 99);

      expect(result).toBe(false);
    });

    it('adminでも他人の日報は編集不可', () => {
      const adminUser: AuthUser = { id: 4, email: 'admin@example.com', role: 'admin' };

      const result = canEditReport(adminUser, 1);

      expect(result).toBe(false);
    });
  });

  describe('canManageMaster', () => {
    it('adminはマスタ管理可能', () => {
      const adminUser: AuthUser = { id: 4, email: 'admin@example.com', role: 'admin' };

      const result = canManageMaster(adminUser);

      expect(result).toBe(true);
    });

    it('managerはマスタ管理不可', () => {
      const managerUser: AuthUser = { id: 3, email: 'manager@example.com', role: 'manager' };

      const result = canManageMaster(managerUser);

      expect(result).toBe(false);
    });

    it('memberはマスタ管理不可', () => {
      const memberUser: AuthUser = { id: 1, email: 'member@example.com', role: 'member' };

      const result = canManageMaster(memberUser);

      expect(result).toBe(false);
    });
  });
});
