/**
 * @fileoverview 缓存键构建器
 * @description 提供标准化的缓存键生成功能，支持实体缓存键和查询缓存键
 */

/**
 * 缓存键构建器
 * @description 用于构建标准化的缓存键，确保缓存键格式统一且避免冲突
 *
 * @example
 * ```typescript
 * const builder = new CacheKeyBuilder();
 *
 * // 构建实体缓存键
 * const entityKey = builder.buildEntityKey('user', '123', 'tenant1');
 * // 结果: 'tenant1:repo:user:123'
 *
 * // 构建查询缓存键
 * const queryKey = builder.buildQueryKey('GetUserProfile', { userId: '123' });
 * // 结果: 'query:GetUserProfile:base64(hash)'
 * ```
 */
export class CacheKeyBuilder {
  /**
   * 构建实体缓存键
   * @description 格式：{tenantId?}:repo:{entityName}:{entityId}
   *
   * @param entityName 实体名称（如 "user"）
   * @param entityId 实体 ID
   * @param tenantId 租户 ID（可选，多租户场景）
   * @returns 缓存键
   *
   * @throws {Error} 当 entityName 或 entityId 为空时抛出错误
   *
   * @example
   * ```typescript
   * builder.buildEntityKey('user', '123');
   * // 返回: 'repo:user:123'
   *
   * builder.buildEntityKey('user', '123', 'tenant1');
   * // 返回: 'tenant1:repo:user:123'
   * ```
   */
  buildEntityKey(
    entityName: string,
    entityId: string,
    tenantId?: string,
  ): string {
    if (!entityName || !entityId) {
      throw new Error("Entity name and ID cannot be empty");
    }

    const baseKey = `repo:${entityName}:${entityId}`;

    // 当调用方显式提供第三个参数（即租户ID），但为空字符串或仅空白时，抛出错误
    if (arguments.length >= 3 && tenantId !== undefined) {
      if (!tenantId.trim()) {
        throw new Error("Tenant ID cannot be empty when provided");
      }
      return `${tenantId}:${baseKey}`;
    }

    return baseKey;
  }

  /**
   * 构建查询缓存键
   * @description 格式：query:{queryType}:{paramsHash}
   *
   * @param queryType 查询类型（如 "GetUserProfile"）
   * @param params 查询参数对象
   * @returns 缓存键
   *
   * @throws {Error} 当 queryType 为空时抛出错误
   *
   * @example
   * ```typescript
   * builder.buildQueryKey('GetUserProfile', { userId: '123' });
   * // 返回: 'query:GetUserProfile:dXNlcklkPTEyMw=='
   * ```
   */
  buildQueryKey(queryType: string, params: Record<string, unknown>): string {
    if (!queryType || !queryType.trim()) {
      throw new Error("Query type cannot be empty");
    }

    // 将参数对象序列化为稳定的字符串
    const paramsStr = this.serializeParams(params);
    // 使用 base64 编码避免特殊字符问题
    const paramsHash = Buffer.from(paramsStr).toString("base64");

    return `query:${queryType}:${paramsHash}`;
  }

  /**
   * 序列化查询参数
   * @description 将参数对象序列化为稳定的字符串，用于生成缓存键
   *
   * @param params 查询参数对象
   * @returns 序列化后的字符串
   *
   * @private
   */
  private serializeParams(params: Record<string, unknown>): string {
    // 将对象按键排序，确保相同参数的顺序一致
    const sortedKeys = Object.keys(params).sort();
    const pairs = sortedKeys.map((key) => `${key}=${String(params[key])}`);

    return pairs.join("&");
  }
}
