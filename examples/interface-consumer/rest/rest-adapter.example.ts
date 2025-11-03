/**
 * @fileoverview REST 适配器示例
 * @description 演示如何使用 @hl8/interface-kernel 契约构建版本化的 REST API 端点
 */

import type { EntityId, TenantId } from "@hl8/interface-kernel";
import type { Pagination, Sorting } from "@hl8/interface-kernel/models";

/**
 * REST API 版本前缀（与 interface-kernel 的 MAJOR 版本对齐）
 */
const API_VERSION = "v1";

/**
 * 获取实体 REST 端点示例
 * @description 路径格式：/v{MAJOR}/tenants/:tenantId/entities/:entityId
 * @example
 * GET /v1/tenants/t-001/entities/e-001
 */
export async function fetchEntity(
  apiBase: string,
  tenantId: TenantId,
  entityId: EntityId,
): Promise<unknown> {
  const url = `${apiBase}/${API_VERSION}/tenants/${tenantId}/entities/${entityId}`;
  const response = await fetch(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  return await response.json();
}

/**
 * 分页查询实体列表 REST 端点示例
 * @description 路径格式：/v{MAJOR}/tenants/:tenantId/entities?page=1&size=10&sort=name:asc
 */
export async function listEntities(
  apiBase: string,
  tenantId: TenantId,
  pagination?: Pagination,
  sorting?: Sorting,
): Promise<unknown> {
  const params = new URLSearchParams();
  if (pagination) {
    params.set("page", String(pagination.page));
    params.set("limit", String(pagination.limit));
  }
  if (sorting) {
    params.set("sort", `${sorting.field}:${sorting.direction}`);
  }

  const url = `${apiBase}/${API_VERSION}/tenants/${tenantId}/entities?${params.toString()}`;
  const response = await fetch(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  return await response.json();
}

/**
 * 创建实体 REST 端点示例
 * @description 路径格式：/v{MAJOR}/tenants/:tenantId/entities
 */
export async function createEntity(
  apiBase: string,
  tenantId: TenantId,
  data: Record<string, unknown>,
): Promise<unknown> {
  const url = `${apiBase}/${API_VERSION}/tenants/${tenantId}/entities`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  return await response.json();
}

