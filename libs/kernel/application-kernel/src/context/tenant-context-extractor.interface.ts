/**
 * @fileoverview 租户上下文提取器接口
 * @description 定义从各种来源提取租户上下文的接口
 */

import type { TenantContext } from "@hl8/domain-kernel";

/**
 * 租户上下文提取器接口
 * @description 定义从各种来源提取租户上下文的接口
 */
export interface ITenantContextExtractor {
  /**
   * 从HTTP请求中提取租户上下文
   * @param request HTTP请求对象
   * @returns 租户上下文或null（如果提取失败）
   */
  extractFromRequest(request: unknown): Promise<TenantContext | null>;

  /**
   * 从JWT Token中提取租户上下文
   * @param token JWT Token字符串
   * @returns 租户上下文或null（如果提取失败）
   */
  extractFromToken(token: string): Promise<TenantContext | null>;

  /**
   * 从用户信息中提取租户上下文
   * @param userId 用户ID
   * @returns 租户上下文或null（如果提取失败）
   */
  extractFromUser(userId: string): Promise<TenantContext | null>;

  /**
   * 从HTTP请求头中提取租户上下文
   * @param headers HTTP请求头对象
   * @returns 租户上下文或null（如果提取失败）
   */
  extractFromHeader(
    headers: Record<string, string>,
  ): Promise<TenantContext | null>;
}
