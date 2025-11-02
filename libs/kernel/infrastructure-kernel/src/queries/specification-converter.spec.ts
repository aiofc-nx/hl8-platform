/**
 * @fileoverview 规范转换器单元测试
 * @description 验证 SpecificationConverter 的所有方法实现
 */

import { describe, it, expect, beforeEach } from "@jest/globals";
import {
  ISpecification,
  IQuerySpecification,
  QueryCriteria,
  QueryOperator,
  AndSpecification,
  OrSpecification,
  NotSpecification,
} from "@hl8/domain-kernel";
import { SpecificationConverter } from "./specification-converter.js";
import type { ISpecificationConverter } from "./specification-converter.interface.js";

// 测试用的简单规范实现
class SimpleSpecification<T> implements ISpecification<T> {
  constructor(
    private readonly description: string,
    private readonly satisfied: boolean = true,
  ) {}

  isSatisfiedBy(_candidate: T): boolean {
    return this.satisfied;
  }

  and(other: ISpecification<T>): ISpecification<T> {
    return new AndSpecification(this, other);
  }

  or(other: ISpecification<T>): ISpecification<T> {
    return new OrSpecification(this, other);
  }

  not(): ISpecification<T> {
    return new NotSpecification(this);
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

// 测试用的查询规范实现
class TestQuerySpecification<T> implements IQuerySpecification<T> {
  constructor(private readonly criteria: QueryCriteria) {}

  isSatisfiedBy(_candidate: T): boolean {
    return true;
  }

  and(other: ISpecification<T>): ISpecification<T> {
    return new AndSpecification(this, other);
  }

  or(other: ISpecification<T>): ISpecification<T> {
    return new OrSpecification(this, other);
  }

  not(): ISpecification<T> {
    return new NotSpecification(this);
  }

  getDescription(): string {
    return "Test Query Specification";
  }

  equals(_other: ISpecification<T>): boolean {
    return false;
  }

  toJSON(): Record<string, unknown> {
    return { type: "TestQuerySpecification" };
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
}

describe("SpecificationConverter", () => {
  let converter: ISpecificationConverter;

  beforeEach(() => {
    converter = new SpecificationConverter();
  });

  describe("构造函数", () => {
    it("应该能够创建转换器实例", () => {
      expect(converter).toBeDefined();
      expect(converter instanceof SpecificationConverter).toBe(true);
    });
  });

  describe("getNestingDepth", () => {
    it("应该正确计算简单规范的嵌套深度（0层）", () => {
      const spec = new SimpleSpecification("simple");
      expect(converter.getNestingDepth(spec)).toBe(0);
    });

    it("应该正确计算 AND 规范的嵌套深度", () => {
      const left = new SimpleSpecification("left");
      const right = new SimpleSpecification("right");
      const andSpec = new AndSpecification(left, right);
      expect(converter.getNestingDepth(andSpec)).toBe(1);
    });

    it("应该正确计算 OR 规范的嵌套深度", () => {
      const left = new SimpleSpecification("left");
      const right = new SimpleSpecification("right");
      const orSpec = new OrSpecification(left, right);
      expect(converter.getNestingDepth(orSpec)).toBe(1);
    });

    it("应该正确计算 NOT 规范的嵌套深度", () => {
      const inner = new SimpleSpecification("inner");
      const notSpec = new NotSpecification(inner);
      expect(converter.getNestingDepth(notSpec)).toBe(1);
    });

    it("应该正确计算多层嵌套的深度", () => {
      const level1 = new SimpleSpecification("level1");
      const level2 = new SimpleSpecification("level2");
      const level3 = new SimpleSpecification("level3");
      const nested = new AndSpecification(
        level1,
        new OrSpecification(level2, level3),
      );
      expect(converter.getNestingDepth(nested)).toBe(2);
    });

    it("应该正确计算最多5层嵌套的深度", () => {
      let spec: ISpecification<any> = new SimpleSpecification("base");
      for (let i = 0; i < 5; i++) {
        spec = new AndSpecification(spec, new SimpleSpecification(`level${i}`));
      }
      expect(converter.getNestingDepth(spec)).toBe(5);
    });
  });

  describe("convertCriteriaToQuery", () => {
    it("应该能够转换简单的 QueryCriteria", () => {
      const criteria: QueryCriteria = {
        conditions: [
          {
            field: "name",
            operator: QueryOperator.EQUALS,
            value: "Test",
          },
        ],
      };

      const result = converter.convertCriteriaToQuery(criteria);
      expect(result.where).toBeDefined();
      expect(result.where?.name).toBe("Test");
    });

    it("应该能够转换多个查询条件", () => {
      const criteria: QueryCriteria = {
        conditions: [
          {
            field: "name",
            operator: QueryOperator.EQUALS,
            value: "Test",
          },
          {
            field: "age",
            operator: QueryOperator.GREATER_THAN,
            value: 18,
          },
        ],
      };

      const result = converter.convertCriteriaToQuery(criteria);
      expect(result.where?.name).toBe("Test");
      expect(result.where?.age).toEqual({ $gt: 18 });
    });

    it("应该能够转换排序条件", () => {
      const criteria: QueryCriteria = {
        conditions: [],
        sortBy: {
          field: "name",
          direction: "asc",
        },
      };

      const result = converter.convertCriteriaToQuery(criteria);
      expect(result.orderBy).toEqual({ name: "asc" });
    });

    it("应该能够转换分页条件", () => {
      const criteria: QueryCriteria = {
        conditions: [],
        pagination: {
          page: 2,
          pageSize: 10,
        },
      };

      const result = converter.convertCriteriaToQuery(criteria);
      expect(result.limit).toBe(10);
      expect(result.offset).toBe(10); // (2-1) * 10
    });

    it("应该能够转换字段选择", () => {
      const criteria: QueryCriteria = {
        conditions: [],
        selectFields: ["name", "age"],
      };

      const result = converter.convertCriteriaToQuery(criteria);
      expect(result.fields).toEqual(["name", "age"]);
    });

    it("应该能够转换去重选项", () => {
      const criteria: QueryCriteria = {
        conditions: [],
        distinct: true,
      };

      const result = converter.convertCriteriaToQuery(criteria);
      expect(result.distinct).toBe(true);
    });

    it("应该能够转换所有操作符", () => {
      const operators = [
        { op: QueryOperator.EQUALS, expected: "value" },
        { op: QueryOperator.NOT_EQUALS, expected: { $ne: "value" } },
        { op: QueryOperator.GREATER_THAN, expected: { $gt: 10 } },
        { op: QueryOperator.GREATER_THAN_OR_EQUAL, expected: { $gte: 10 } },
        { op: QueryOperator.LESS_THAN, expected: { $lt: 10 } },
        { op: QueryOperator.LESS_THAN_OR_EQUAL, expected: { $lte: 10 } },
        { op: QueryOperator.IN, expected: { $in: [1, 2, 3] } },
        { op: QueryOperator.NOT_IN, expected: { $nin: [1, 2, 3] } },
        { op: QueryOperator.IS_NULL, expected: null },
        { op: QueryOperator.IS_NOT_NULL, expected: { $ne: null } },
        { op: QueryOperator.IS_EMPTY, expected: "" },
        { op: QueryOperator.IS_NOT_EMPTY, expected: { $ne: "" } },
      ];

      for (const { op, expected } of operators) {
        const criteria: QueryCriteria = {
          conditions: [
            {
              field: "test",
              operator: op,
              value:
                op === QueryOperator.IS_NULL
                  ? undefined
                  : op === QueryOperator.IN || op === QueryOperator.NOT_IN
                    ? [1, 2, 3]
                    : op === QueryOperator.GREATER_THAN ||
                        op === QueryOperator.GREATER_THAN_OR_EQUAL ||
                        op === QueryOperator.LESS_THAN ||
                        op === QueryOperator.LESS_THAN_OR_EQUAL
                      ? 10
                      : "value",
            },
          ],
        };

        const result = converter.convertCriteriaToQuery(criteria);
        expect(result.where?.test).toEqual(expected);
      }
    });
  });

  describe("convertToQuery", () => {
    it("应该能够转换实现了 IQuerySpecification 的规范", () => {
      const criteria: QueryCriteria = {
        conditions: [
          {
            field: "name",
            operator: QueryOperator.EQUALS,
            value: "Test",
          },
        ],
      };

      const spec = new TestQuerySpecification(criteria);
      const result = converter.convertToQuery(spec, "TestEntity");

      expect(result.where).toBeDefined();
      expect(result.where?.name).toBe("Test");
    });

    it("应该在嵌套深度超过限制时抛出错误", () => {
      let spec: ISpecification<any> = new SimpleSpecification("base");
      for (let i = 0; i < 6; i++) {
        spec = new AndSpecification(spec, new SimpleSpecification(`level${i}`));
      }

      expect(() => {
        converter.convertToQuery(spec, "TestEntity");
      }).toThrow(/嵌套深度.*超过最大限制/);
    });

    it("应该能够转换 AND 规范", () => {
      const left = new SimpleSpecification("left");
      const right = new SimpleSpecification("right");
      const andSpec = new AndSpecification(left, right);

      // AND 规范需要转换为查询，但由于 SimpleSpecification 没有 QueryCriteria，
      // 所以会返回空查询
      const result = converter.convertToQuery(andSpec, "TestEntity");
      expect(result).toBeDefined();
    });

    it("应该能够转换 OR 规范", () => {
      const left = new SimpleSpecification("left");
      const right = new SimpleSpecification("right");
      const orSpec = new OrSpecification(left, right);

      const result = converter.convertToQuery(orSpec, "TestEntity");
      expect(result).toBeDefined();
    });

    it("应该能够转换 NOT 规范", () => {
      const inner = new SimpleSpecification("inner");
      const notSpec = new NotSpecification(inner);

      const result = converter.convertToQuery(notSpec, "TestEntity");
      expect(result).toBeDefined();
    });
  });
});
