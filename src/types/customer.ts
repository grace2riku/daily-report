/**
 * 顧客関連の型定義
 */

/**
 * 顧客（一覧表示用）
 */
export interface Customer {
  id: number;
  customer_code: string;
  name: string;
  address: string | null;
  phone: string | null;
  is_active: boolean;
  created_at: string;
}

/**
 * 顧客詳細
 */
export interface CustomerDetail extends Customer {
  updated_at: string;
}

/**
 * 顧客作成リクエスト
 */
export interface CreateCustomerRequest {
  customer_code: string;
  name: string;
  address?: string | null;
  phone?: string | null;
  is_active: boolean;
}

/**
 * 顧客更新リクエスト
 */
export interface UpdateCustomerRequest {
  name?: string;
  address?: string | null;
  phone?: string | null;
  is_active?: boolean;
}

/**
 * 顧客フォームデータ
 */
export interface CustomerFormData {
  customerCode: string;
  name: string;
  address: string;
  phone: string;
  isActive: boolean;
}
