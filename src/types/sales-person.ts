/**
 * 営業担当者関連の型定義
 */

import type { UserRole } from './auth';

/**
 * 上長情報（簡易版）
 */
export interface ManagerInfo {
  id: number;
  name: string;
}

/**
 * 営業担当者（一覧表示用）
 */
export interface SalesPerson {
  id: number;
  employee_code: string;
  name: string;
  email: string;
  role: UserRole;
  manager: ManagerInfo | null;
  is_active: boolean;
  created_at: string;
}

/**
 * 営業担当者詳細
 */
export interface SalesPersonDetail extends SalesPerson {
  subordinates: ManagerInfo[];
  updated_at: string;
}

/**
 * 営業担当者作成リクエスト
 */
export interface CreateSalesPersonRequest {
  employee_code: string;
  name: string;
  email: string;
  password: string;
  role: UserRole;
  manager_id: number | null;
  is_active: boolean;
}

/**
 * 営業担当者更新リクエスト
 */
export interface UpdateSalesPersonRequest {
  name?: string;
  email?: string;
  password?: string;
  role?: UserRole;
  manager_id?: number | null;
  is_active?: boolean;
}

/**
 * 営業担当者フォームデータ
 */
export interface SalesPersonFormData {
  employeeCode: string;
  name: string;
  email: string;
  password: string;
  role: UserRole;
  managerId: number | null;
  isActive: boolean;
}

/**
 * 役職の表示名マッピング
 */
export const ROLE_LABELS: Record<UserRole, string> = {
  member: '一般',
  manager: '上長',
  admin: '管理者',
};
