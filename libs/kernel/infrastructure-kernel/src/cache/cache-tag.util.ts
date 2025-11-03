/**
 * @fileoverview 缓存标签构建工具
 * @description 统一生成仓储相关的实体/实体ID标签，包含全局与租户粒度，便于精准或全局失效。
 */

/**
 * 生成实体类型相关标签
 * - 全局：entity:{entityName}
 * - 租户：{tenantId}:entity:{entityName}（当提供租户ID时）
 */
export function buildEntityTypeTags(
  entityName: string,
  tenantId?: string,
): string[] {
  const tags = [`entity:${entityName}`];
  if (tenantId && tenantId.trim()) {
    tags.push(`${tenantId}:entity:${entityName}`);
  }
  return tags;
}

/**
 * 生成实体ID相关标签
 * - 全局：entity:{entityName}:id:{id}
 * - 租户：{tenantId}:entity:{entityName}:id:{id}（当提供租户ID时）
 */
export function buildEntityIdTags(
  entityName: string,
  id: string,
  tenantId?: string,
): string[] {
  const tags = [`entity:${entityName}:id:${id}`];
  if (tenantId && tenantId.trim()) {
    tags.push(`${tenantId}:entity:${entityName}:id:${id}`);
  }
  return tags;
}


