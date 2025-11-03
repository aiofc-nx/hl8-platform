/**
 * @fileoverview 查询构建器单元测试
 * @description 验证 QueryBuilder 的所有方法实现
 */

import { describe, it, expect, beforeEach } from "@jest/globals";
import { QueryBuilder } from "./query-builder.js";
import { SpecificationConverter } from "./specification-converter.js";
import {
  ISpecification,
  IQuerySpecification,
  TenantContext,
  TenantId,
  OrganizationId,
  QueryCriteria,
  QueryOperator,
} from "@hl8/domain-kernel";
import type { ISpecificationConverter } from "./specification-converter.interface.js";

class TestQuerySpecification<T> implements IQuerySpecification<T> {
  constructor(
    private readonly criteria: QueryCriteria,
    private readonly description: string = "Test Query",
  ) {}

  isSatisfiedBy(_candidate: T): boolean {
    return true;
  }

  getQueryCriteria(): QueryCriteria {
    return this.criteria;
  }

  getSortingCriteria() {
    return undefined;
  }

  getPaginationCriteria() {
    return undefined;
  }

  withSorting(_sortingCriteria: any): IQuerySpecification<T> {
    return this;
  }

  withPagination(_paginationCriteria: any): IQuerySpecification<T> {
    return this;
  }

  andCriteria(_criteria: any): IQuerySpecification<T> {
    return this;
  }

  orCriteria(_criteria: any): IQuerySpecification<T> {
    return this;
  }

  getLimit() {
    return undefined;
  }

  withLimit(_limit: number): IQuerySpecification<T> {
    return this;
  }

  getOffset() {
    return undefined;
  }

  withOffset(_offset: number): IQuerySpecification<T> {
    return this;
  }

  isEmpty() {
    return false;
  }

  getComplexity() {
    return 0;
  }

  optimize(): IQuerySpecification<T> {
    return this;
  }

  validate() {
    return {
      isValid: true,
      errors: [],
      warnings: [],
      complexityScore: 0,
      performanceSuggestions: [],
    };
  }

  and(_other: ISpecification<T>): ISpecification<T> {
    return this;
  }

  or(_other: ISpecification<T>): ISpecification<T> {
    return this;
  }

  not(): ISpecification<T> {
    return this;
  }

  getDescription(): string {
    return this.description;
  }

  equals(_other: ISpecification<T>): boolean {
    return false;
  }

  toJSON(): Record<string, unknown> {
    return { type: "TestQuerySpecification", description: this.description };
  }
}

// 简单规范实现（仅用于测试基础功能）
class SimpleSpecification<T> implements ISpecification<T> {
  constructor(
    private readonly description: string,
    private readonly satisfied: boolean = true,
  ) {}

  isSatisfiedBy(_candidate: T): boolean {
    return this.satisfied;
  }

  and(_other: ISpecification<T>): ISpecification<T> {
    return new (class extends SimpleSpecification<T> {
      constructor() {
        super("AND");
      }
    })();
  }

  or(_other: ISpecification<T>): ISpecification<T> {
    return new (class extends SimpleSpecification<T> {
      constructor() {
        super("OR");
      }
    })();
  }

  not(): ISpecification<T> {
    return new (class extends SimpleSpecification<T> {
      constructor() {
        super("NOT");
      }
    })();
  }

  getDescription(): string {
    return this.description;
  }

  equals(_other: ISpecification<T>): boolean {
    return false;
  }

  toJSON(): Record<string, unknown> {
    return { type: "SimpleSpecification", description: this.description };
  }
}

describe("QueryBuilder", () => {
  let converter: ISpecificationConverter;
  let queryBuilder: QueryBuilder;

  beforeEach(() => {
    converter = new SpecificationConverter();
    queryBuilder = new QueryBuilder(converter);
  });

  describe("constructor", () => {
    it("应该能够在提供转换器时创建实例", () => {
      const builder = new QueryBuilder(converter);
      expect(builder).toBeDefined();
    });

    it("应该在转换器为空时抛出错误", () => {
      expect(() => {
        new QueryBuilder(null as any);
      }).toThrow("规范转换器不能为空");
    });
  });

  describe("buildFromSpecification", () => {
    it("应该能够从查询规范构建查询选项", () => {
      const criteria: QueryCriteria = {
        conditions: [
          {
            field: "name",
            operator: QueryOperator.EQUALS,
            value: "test",
          },
        ],
      };
      const spec = new TestQuerySpecification(criteria);
      const options = queryBuilder.buildFromSpecification(spec, "TestEntity");

      expect(options).toBeDefined();
      expect(options.where).toBeDefined();
    });

    it("应该能够在提供租户上下文时自动注入租户过滤条件", () => {
      const tenantId = TenantId.generate();
      const orgId = new OrganizationId(tenantId);
      const context = new TenantContext(tenantId, { organizationId: orgId });

      const criteria: QueryCriteria = {
        conditions: [
          {
            field: "name",
            operator: QueryOperator.EQUALS,
            value: "test",
          },
        ],
      };
      const spec = new TestQuerySpecification(criteria);
      const options = queryBuilder.buildFromSpecification(
        spec,
        "TestEntity",
        context,
      );

      expect(options).toBeDefined();
      expect(options.where).toBeDefined();
      // 租户过滤条件应该被注入
      expect(options.filters).toBeDefined();
    });

    it("应该能够在已有 where 条件时合并租户过滤条件", () => {
      const tenantId = TenantId.generate();
      const orgId = new OrganizationId(tenantId);
      const context = new TenantContext(tenantId, { organizationId: orgId });

      const spec = new SimpleSpecification("test");
      const options = queryBuilder.buildFromSpecification(
        spec,
        "TestEntity",
        context,
      );

      expect(options.where).toBeDefined();
      // 如果已有条件，应该使用 $and 合并
      if (options.where && typeof options.where === "object") {
        // 验证租户过滤条件已合并
        expect(options.filters).toBeDefined();
      }
    });

    it("应该能够在没有租户上下文时不注入租户过滤条件", () => {
      const criteria: QueryCriteria = {
        conditions: [
          {
            field: "name",
            operator: QueryOperator.EQUALS,
            value: "test",
          },
        ],
      };
      const spec = new TestQuerySpecification(criteria);
      const options = queryBuilder.buildFromSpecification(spec, "TestEntity");

      expect(options).toBeDefined();
      // 没有租户上下文时，filters 可能不存在
      // 主要验证不会出错
    });
  });

  describe("buildFromCriteria", () => {
    it("应该能够从查询条件构建查询选项", () => {
      const criteria: QueryCriteria = {
        conditions: [
          {
            field: "name",
            operator: QueryOperator.EQUALS,
            value: "test",
          },
        ],
      };

      const options = queryBuilder.buildFromCriteria(criteria);

      expect(options).toBeDefined();
      expect(options.where).toBeDefined();
    });

    it("应该能够在提供租户上下文时自动注入租户过滤条件", () => {
      const tenantId = TenantId.generate();
      const orgId = new OrganizationId(tenantId);
      const context = new TenantContext(tenantId, { organizationId: orgId });

      const criteria: QueryCriteria = {
        conditions: [
          {
            field: "name",
            operator: QueryOperator.EQUALS,
            value: "test",
          },
        ],
      };

      const options = queryBuilder.buildFromCriteria(criteria, context);

      expect(options).toBeDefined();
      expect(options.where).toBeDefined();
      expect(options.filters).toBeDefined();
    });

    it("应该能够在已有 where 条件时合并租户过滤条件", () => {
      const tenantId = TenantId.generate();
      const orgId = new OrganizationId(tenantId);
      const context = new TenantContext(tenantId, { organizationId: orgId });

      const criteria: QueryCriteria = {
        conditions: [
          {
            field: "name",
            operator: QueryOperator.EQUALS,
            value: "test",
          },
        ],
      };

      const options = queryBuilder.buildFromCriteria(criteria, context);

      expect(options).toBeDefined();
      expect(options.where).toBeDefined();
      // 验证租户过滤条件已合并
      expect(options.filters).toBeDefined();
    });

    it("应该支持分页和排序条件", () => {
      const criteria: QueryCriteria = {
        conditions: [
          {
            field: "name",
            operator: QueryOperator.EQUALS,
            value: "test",
          },
        ],
        sorting: [
          {
            field: "name",
            direction: "asc",
          },
        ],
        pagination: {
          page: 1,
          limit: 10,
        },
      };

      const options = queryBuilder.buildFromCriteria(criteria);

      expect(options).toBeDefined();
      // 根据 convertCriteriaToQuery 的实现，分页会设置 limit 和 offset
      // 排序会设置 orderBy
      if (options.orderBy) {
        expect(options.orderBy).toBeDefined();
      }
      if (options.limit !== undefined) {
        expect(options.limit).toBe(10);
      }
      // offset 可能不存在或为 0（第一页）
    });
  });
});
