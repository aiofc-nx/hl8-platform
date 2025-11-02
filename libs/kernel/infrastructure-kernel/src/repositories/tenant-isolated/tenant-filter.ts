/**
 * @fileoverview 租户过滤器
 * @description MikroORM过滤器，自动为租户隔离实体添加多层级过滤条件
 */

/**
 * 租户过滤器参数
 * @description 定义租户过滤器的输入参数
 */
export interface TenantFilterArgs {
  /** 租户ID（必需） */
  tenantId: string;
  /** 组织ID（可选） */
  organizationId?: string;
  /** 部门ID（可选） */
  departmentId?: string;
}

/**
 * 租户过滤器条件
 * @description 根据租户过滤器参数构建MikroORM查询条件
 * @param args 租户过滤器参数
 * @returns MikroORM查询条件对象
 */
function tenantFilterCondition(args: TenantFilterArgs): object {
  const condition: Record<string, any> = {
    tenantId: args.tenantId,
  };

  // 如果指定了组织ID，添加到条件中
  if (args.organizationId) {
    condition.organizationId = args.organizationId;
  }

  // 如果指定了部门ID，添加到条件中
  if (args.departmentId) {
    condition.departmentId = args.departmentId;
  }

  return condition;
}

/**
 * 租户过滤器定义
 * @description 用于TenantIsolatedPersistenceEntity实体的MikroORM过滤器
 */
export const tenantFilter = {
  name: "tenant",
  cond: tenantFilterCondition,
  default: false, // 默认不启用，需要显式启用
};

/**
 * 启用租户过滤器的示例
 * @example
 * ```typescript
 * // 在查询时启用租户过滤器
 * const entities = await em.find(Entity, {}, {
 *   filters: {
 *     tenant: {
 *       tenantId: context.tenantId.value,
 *       organizationId: context.organizationId?.value,
 *       departmentId: context.departmentId?.value,
 *     }
 *   }
 * });
 * ```
 */
export function enableTenantFilter(
  tenantId: string,
  organizationId?: string,
  departmentId?: string,
): { filters: { tenant: TenantFilterArgs } } {
  return {
    filters: {
      tenant: {
        tenantId,
        organizationId,
        departmentId,
      },
    },
  };
}

/**
 * 从TenantContext构建过滤器选项
 * @description 将TenantContext转换为MikroORM过滤器选项
 * @param context 租户上下文
 * @returns MikroORM FindOptions配置对象
 */
export function buildTenantFilterOptions(
  context: any, // 使用any避免循环依赖
): { filters: { tenant: TenantFilterArgs } } {
  const filterArgs: TenantFilterArgs = {
    tenantId: context.tenantId.value,
  };

  if (context.organizationId) {
    filterArgs.organizationId = context.organizationId.value;
  }

  if (context.departmentId) {
    filterArgs.departmentId = context.departmentId.value;
  }

  return {
    filters: {
      tenant: filterArgs,
    },
  };
}
