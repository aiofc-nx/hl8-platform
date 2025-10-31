/**
 * @fileoverview Specification Tests - 规范模式测试
 * @description 规范模式的单元测试
 */

import { ISpecification } from "./specification.interface.js";
import { AndSpecification } from "./and-specification.js";
import { OrSpecification } from "./or-specification.js";
import { NotSpecification } from "./not-specification.js";
import { SortDirection, SortFieldType } from "./sorting-criteria.interface.js";
import { PaginationStrategy } from "./pagination-criteria.interface.js";

// 测试用的实体
class TestEntity {
  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly value: number,
    public readonly isActive: boolean,
  ) {}
}

// 测试用的规范
class NameSpecification implements ISpecification<TestEntity> {
  constructor(private readonly expectedName: string) {}

  isSatisfiedBy(candidate: TestEntity): boolean {
    return candidate?.name === this.expectedName;
  }

  and(other: ISpecification<TestEntity>): ISpecification<TestEntity> {
    return new AndSpecification(this, other);
  }

  or(other: ISpecification<TestEntity>): ISpecification<TestEntity> {
    return new OrSpecification(this, other);
  }

  not(): ISpecification<TestEntity> {
    return new NotSpecification(this);
  }

  getDescription(): string {
    return `Name equals "${this.expectedName}"`;
  }

  equals(other: ISpecification<TestEntity>): boolean {
    return (
      other instanceof NameSpecification &&
      this.expectedName === other.expectedName
    );
  }

  toJSON(): Record<string, unknown> {
    return {
      type: "NameSpecification",
      expectedName: this.expectedName,
    };
  }
}

class ValueSpecification implements ISpecification<TestEntity> {
  constructor(private readonly minValue: number) {}

  isSatisfiedBy(candidate: TestEntity): boolean {
    return candidate?.value >= this.minValue;
  }

  and(other: ISpecification<TestEntity>): ISpecification<TestEntity> {
    return new AndSpecification(this, other);
  }

  or(other: ISpecification<TestEntity>): ISpecification<TestEntity> {
    return new OrSpecification(this, other);
  }

  not(): ISpecification<TestEntity> {
    return new NotSpecification(this);
  }

  getDescription(): string {
    return `Value >= ${this.minValue}`;
  }

  equals(other: ISpecification<TestEntity>): boolean {
    return (
      other instanceof ValueSpecification && this.minValue === other.minValue
    );
  }

  toJSON(): Record<string, unknown> {
    return {
      type: "ValueSpecification",
      minValue: this.minValue,
    };
  }
}

class ActiveSpecification implements ISpecification<TestEntity> {
  isSatisfiedBy(candidate: TestEntity): boolean {
    return candidate?.isActive;
  }

  and(other: ISpecification<TestEntity>): ISpecification<TestEntity> {
    return new AndSpecification(this, other);
  }

  or(other: ISpecification<TestEntity>): ISpecification<TestEntity> {
    return new OrSpecification(this, other);
  }

  not(): ISpecification<TestEntity> {
    return new NotSpecification(this);
  }

  getDescription(): string {
    return "Is active";
  }

  equals(other: ISpecification<TestEntity>): boolean {
    return other instanceof ActiveSpecification;
  }

  toJSON(): Record<string, unknown> {
    return {
      type: "ActiveSpecification",
    };
  }
}

describe("Specification Pattern", () => {
  let testEntity: TestEntity;
  let nameSpec: NameSpecification;
  let valueSpec: ValueSpecification;
  let activeSpec: ActiveSpecification;

  beforeEach(() => {
    testEntity = new TestEntity("1", "Test Entity", 100, true);
    nameSpec = new NameSpecification("Test Entity");
    valueSpec = new ValueSpecification(50);
    activeSpec = new ActiveSpecification();
  });

  describe("Basic Specifications", () => {
    it("should create and test basic specifications", () => {
      expect(nameSpec.isSatisfiedBy(testEntity)).toBe(true);
      expect(valueSpec.isSatisfiedBy(testEntity)).toBe(true);
      expect(activeSpec.isSatisfiedBy(testEntity)).toBe(true);
    });

    it("should get specification descriptions", () => {
      expect(nameSpec.getDescription()).toBe('Name equals "Test Entity"');
      expect(valueSpec.getDescription()).toBe("Value >= 50");
      expect(activeSpec.getDescription()).toBe("Is active");
    });

    it("should convert specifications to JSON", () => {
      expect(nameSpec.toJSON()).toEqual({
        type: "NameSpecification",
        expectedName: "Test Entity",
      });
      expect(valueSpec.toJSON()).toEqual({
        type: "ValueSpecification",
        minValue: 50,
      });
      expect(activeSpec.toJSON()).toEqual({
        type: "ActiveSpecification",
      });
    });
  });

  describe("AndSpecification", () => {
    it("should create and test AND specification", () => {
      const andSpec = nameSpec.and(valueSpec);
      expect(andSpec.isSatisfiedBy(testEntity)).toBe(true);
    });

    it("should return false when one condition fails", () => {
      const lowValueSpec = new ValueSpecification(200);
      const andSpec = nameSpec.and(lowValueSpec);
      expect(andSpec.isSatisfiedBy(testEntity)).toBe(false);
    });

    it("should get AND specification description", () => {
      const andSpec = nameSpec.and(valueSpec);
      expect(andSpec.getDescription()).toBe(
        '(Name equals "Test Entity") AND (Value >= 50)',
      );
    });

    it("should support chaining AND operations", () => {
      const chainedSpec = nameSpec.and(valueSpec).and(activeSpec);
      expect(chainedSpec.isSatisfiedBy(testEntity)).toBe(true);
    });

    it("should convert AND specification to JSON", () => {
      const andSpec = nameSpec.and(valueSpec);
      const json = andSpec.toJSON();
      expect(json.type).toBe("AndSpecification");
      expect(json.left).toBeDefined();
      expect(json.right).toBeDefined();
    });
  });

  describe("OrSpecification", () => {
    it("should create and test OR specification", () => {
      const orSpec = nameSpec.or(valueSpec);
      expect(orSpec.isSatisfiedBy(testEntity)).toBe(true);
    });

    it("should return true when at least one condition passes", () => {
      const lowValueSpec = new ValueSpecification(200);
      const orSpec = nameSpec.or(lowValueSpec);
      expect(orSpec.isSatisfiedBy(testEntity)).toBe(true);
    });

    it("should return false when all conditions fail", () => {
      const wrongNameSpec = new NameSpecification("Wrong Name");
      const lowValueSpec = new ValueSpecification(200);
      const orSpec = wrongNameSpec.or(lowValueSpec);
      expect(orSpec.isSatisfiedBy(testEntity)).toBe(false);
    });

    it("should get OR specification description", () => {
      const orSpec = nameSpec.or(valueSpec);
      expect(orSpec.getDescription()).toBe(
        '(Name equals "Test Entity") OR (Value >= 50)',
      );
    });

    it("should support chaining OR operations", () => {
      const chainedSpec = nameSpec.or(valueSpec).or(activeSpec);
      expect(chainedSpec.isSatisfiedBy(testEntity)).toBe(true);
    });

    it("should convert OR specification to JSON", () => {
      const orSpec = nameSpec.or(valueSpec);
      const json = orSpec.toJSON();
      expect(json.type).toBe("OrSpecification");
      expect(json.left).toBeDefined();
      expect(json.right).toBeDefined();
    });
  });

  describe("NotSpecification", () => {
    it("should create and test NOT specification", () => {
      const notSpec = nameSpec.not();
      expect(notSpec.isSatisfiedBy(testEntity)).toBe(false);
    });

    it("should return true when original condition fails", () => {
      const wrongNameSpec = new NameSpecification("Wrong Name");
      const notSpec = wrongNameSpec.not();
      expect(notSpec.isSatisfiedBy(testEntity)).toBe(true);
    });

    it("should get NOT specification description", () => {
      const notSpec = nameSpec.not();
      expect(notSpec.getDescription()).toBe('NOT (Name equals "Test Entity")');
    });

    it("should support double negation", () => {
      const notNotSpec = nameSpec.not().not();
      expect(notNotSpec.isSatisfiedBy(testEntity)).toBe(true);
    });

    it("should convert NOT specification to JSON", () => {
      const notSpec = nameSpec.not();
      const json = notSpec.toJSON();
      expect(json.type).toBe("NotSpecification");
      expect(json.specification).toBeDefined();
    });
  });

  describe("Complex Specification Combinations", () => {
    it("should handle complex AND/OR combinations", () => {
      const complexSpec = nameSpec.and(valueSpec).or(activeSpec.not());
      expect(complexSpec.isSatisfiedBy(testEntity)).toBe(true);
    });

    it("should handle nested specifications", () => {
      const nestedSpec = nameSpec.and(valueSpec.or(activeSpec.not()));
      expect(nestedSpec.isSatisfiedBy(testEntity)).toBe(true);
    });

    it("should handle multiple levels of negation", () => {
      const complexNotSpec = nameSpec.not().and(valueSpec.not()).or(activeSpec);
      expect(complexNotSpec.isSatisfiedBy(testEntity)).toBe(true);
    });
  });

  describe("Sorting Criteria", () => {
    it("should create sorting criteria", () => {
      const sortingCriteria = {
        fields: [
          {
            fieldName: "name",
            direction: SortDirection.ASC,
            fieldType: SortFieldType.STRING,
          },
          {
            fieldName: "value",
            direction: SortDirection.DESC,
            fieldType: SortFieldType.NUMBER,
          },
        ],
        defaultField: "name",
        defaultDirection: SortDirection.ASC,
      };

      expect(sortingCriteria.fields).toHaveLength(2);
      expect(sortingCriteria.fields[0].fieldName).toBe("name");
      expect(sortingCriteria.fields[0].direction).toBe(SortDirection.ASC);
      expect(sortingCriteria.defaultField).toBe("name");
    });

    it("should validate sorting field types", () => {
      expect(SortFieldType.STRING).toBe("STRING");
      expect(SortFieldType.NUMBER).toBe("NUMBER");
      expect(SortFieldType.DATE).toBe("DATE");
      expect(SortFieldType.BOOLEAN).toBe("BOOLEAN");
    });
  });

  describe("Pagination Criteria", () => {
    it("should create pagination criteria", () => {
      const paginationCriteria = {
        page: 1,
        limit: 10,
        options: {
          calculateTotal: true,
          calculateTotalPages: true,
          includeMetadata: true,
          maxLimit: 100,
          defaultLimit: 10,
          strategy: PaginationStrategy.OFFSET_BASED,
        },
      };

      expect(paginationCriteria.page).toBe(1);
      expect(paginationCriteria.limit).toBe(10);
      expect(paginationCriteria.options?.strategy).toBe(
        PaginationStrategy.OFFSET_BASED,
      );
    });

    it("should validate pagination strategies", () => {
      expect(PaginationStrategy.OFFSET_BASED).toBe("OFFSET_BASED");
      expect(PaginationStrategy.CURSOR_BASED).toBe("CURSOR_BASED");
      expect(PaginationStrategy.KEY_BASED).toBe("KEY_BASED");
      expect(PaginationStrategy.TIMESTAMP_BASED).toBe("TIMESTAMP_BASED");
    });
  });

  describe("Specification Composition", () => {
    it("should compose specifications with different operators", () => {
      const composedSpec = nameSpec
        .and(valueSpec)
        .or(activeSpec.not())
        .and(nameSpec.not().or(valueSpec));

      expect(composedSpec.isSatisfiedBy(testEntity)).toBe(true);
    });

    it("should handle empty specification lists", () => {
      const emptySpec = new AndSpecification(
        new NameSpecification("Non-existent"),
        new ValueSpecification(999),
      );
      expect(emptySpec.isSatisfiedBy(testEntity)).toBe(false);
    });

    it("should maintain specification immutability", () => {
      const originalSpec = nameSpec.and(valueSpec);
      const modifiedSpec = originalSpec.or(activeSpec);

      // Original specification should not be affected
      expect(originalSpec.isSatisfiedBy(testEntity)).toBe(true);
      expect(modifiedSpec.isSatisfiedBy(testEntity)).toBe(true);
    });
  });

  describe("Edge Cases", () => {
    it("should handle null and undefined values", () => {
      const nullEntity = null as unknown as TestEntity;
      const undefinedEntity = undefined as unknown as TestEntity;

      expect(nameSpec.isSatisfiedBy(nullEntity)).toBe(false);
      expect(nameSpec.isSatisfiedBy(undefinedEntity)).toBe(false);
    });

    it("should handle specifications with same conditions", () => {
      const sameSpec1 = new NameSpecification("Test Entity");
      const sameSpec2 = new NameSpecification("Test Entity");
      const andSpec = sameSpec1.and(sameSpec2);

      expect(andSpec.isSatisfiedBy(testEntity)).toBe(true);
    });

    it("should handle deeply nested specifications", () => {
      const deeplyNested = nameSpec
        .and(valueSpec)
        .or(activeSpec.not())
        .and(nameSpec.or(valueSpec.not()))
        .or(activeSpec.and(valueSpec));

      expect(deeplyNested.isSatisfiedBy(testEntity)).toBe(true);
    });
  });
});
