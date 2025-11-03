/**
 * @fileoverview 查询构建器
 * @description 用于构建 MikroORM 查询，自动注入租户过滤条件
 */

import {
  ISpecification,
  TenantContext,
  QueryCriteria,
} from "@hl8/domain-kernel";
import {
  ISpecificationConverter,
  MikroORMQueryOptions,
} from "./specification-converter.interface.js";
import { buildTenantFilterOptions } from "../repositories/tenant-isolated/tenant-filter.js";

/**
 * 查询构建器
 * @description 提供查询构建功能，支持规范转换和租户过滤自动注入
 */
export class QueryBuilder {
  /**
   * 创建查询构建器实例
   * @description 初始化查询构建器，需要提供规范转换器
   * @param converter - 规范转换器实例，用于将规范转换为查询条件
   * @throws {Error} 当converter为空时抛出
   */
  constructor(private readonly converter: ISpecificationConverter) {
    if (!converter) {
      throw new Error("规范转换器不能为空");
    }
  }

  /**
   * 从规范构建查询选项
   * @description 将规范转换为MikroORM查询选项，并自动注入租户过滤条件
   * @template T 实体类型
   * @param spec - 规范实例，实现ISpecification接口
   * @param entityName - 实体名称，用于查询时指定实体类型
   * @param tenantContext - 租户上下文（可选，如果提供则自动注入租户过滤条件）
   * @returns MikroORM查询选项，可直接用于EntityManager的find方法
   * @example
   * ```typescript
   * const spec = new PriceGreaterThanSpec(100);
   * const options = queryBuilder.buildFromSpecification(spec, 'ProductEntity', tenantContext);
   * const products = await em.find('ProductEntity', options.where, options);
   * ```
   */
  buildFromSpecification<T>(
    spec: ISpecification<T>,
    entityName: string,
    tenantContext?: TenantContext,
  ): MikroORMQueryOptions {
    // 转换规范为查询选项
    const options = this.converter.convertToQuery(spec, entityName);

    // 如果提供了租户上下文，自动注入租户过滤条件
    if (tenantContext) {
      const tenantFilters = buildTenantFilterOptions(tenantContext);

      // 合并租户过滤条件到 where 条件中
      if (options.where) {
        // 合并现有条件和租户过滤条件（使用 AND 逻辑）
        options.where = {
          $and: [options.where, tenantFilters.filters.tenant],
        };
      } else {
        // 如果现有条件为空，直接使用租户过滤条件
        options.where = tenantFilters.filters.tenant;
      }

      // 如果有 filters 选项，合并到其中
      if (!options.filters) {
        options.filters = {};
      }
      Object.assign(options.filters, tenantFilters.filters);
    }

    return options;
  }

  /**
   * 从查询条件构建查询选项
   * @description 将QueryCriteria转换为MikroORM查询选项，并自动注入租户过滤条件
   * @param criteria - 查询条件对象，包含条件、排序、分页等信息
   * @param tenantContext - 租户上下文（可选，如果提供则自动注入租户过滤）
   * @returns MikroORM查询选项，可直接用于EntityManager的find方法
   * @example
   * ```typescript
   * const criteria: QueryCriteria = {
   *   conditions: [{ field: 'name', operator: 'EQUALS', value: 'test' }],
   *   pagination: { page: 1, limit: 10 }
   * };
   * const options = queryBuilder.buildFromCriteria(criteria, tenantContext);
   * const entities = await em.find('Entity', options.where, options);
   * ```
   */
  buildFromCriteria(
    criteria: QueryCriteria,
    tenantContext?: TenantContext,
  ): MikroORMQueryOptions {
    // 转换查询条件为查询选项
    const options = this.converter.convertCriteriaToQuery(criteria);

    // 如果提供了租户上下文，自动注入租户过滤条件
    if (tenantContext) {
      const tenantFilters = buildTenantFilterOptions(tenantContext);

      // 合并租户过滤条件到 where 条件中
      if (options.where) {
        options.where = {
          $and: [options.where, tenantFilters.filters.tenant],
        };
      } else {
        options.where = tenantFilters.filters.tenant;
      }

      // 如果有 filters 选项，合并到其中
      if (!options.filters) {
        options.filters = {};
      }
      Object.assign(options.filters, tenantFilters.filters);
    }

    return options;
  }
}
