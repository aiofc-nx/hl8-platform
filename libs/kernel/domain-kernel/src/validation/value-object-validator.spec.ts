/**
 * @fileoverview Value Object Validator Tests - 值对象验证器测试
 * @description 值对象验证器的单元测试
 */

// Jest globals are available in test environment
import { ValueObject } from "../value-objects/base/value-object.base.js";
import { ValueObjectValidator } from "./value-object-validator.js";
import {
  NotEmptyRule,
  StringLengthRule,
  EmailRule,
  CustomRule,
} from "./rules/value-object-validation-rules.js";
import { SimpleValidationResult } from "./rules/simple-validation-result.js";

// 测试用的值对象
class TestValueObject extends ValueObject<string> {
  constructor(value: string) {
    super(value);
  }

  protected validateValue(value: string): void {
    // 简单的验证：值不能为null或undefined
    if (value === null || value === undefined) {
      throw new Error("Value cannot be null or undefined");
    }
  }

  clone(): TestValueObject {
    return new TestValueObject(this.value);
  }

  protected createClone(
    value: string,
    createdAt: Date,
    version: number,
  ): TestValueObject {
    return new TestValueObject(value);
  }
}

describe("ValueObjectValidator", () => {
  let validator: ValueObjectValidator<TestValueObject>;
  let testValue: TestValueObject;

  beforeEach(() => {
    validator = new ValueObjectValidator();
    testValue = new TestValueObject("test@example.com");
  });

  describe("validate", () => {
    it("should validate value object with single rule", () => {
      const rules = [new NotEmptyRule<TestValueObject>()];
      const result = validator.validate(testValue, rules);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.valueObjectType).toBe("TestValueObject");
      expect(result.validationRules).toContain("notEmpty");
    });

    it("should detect empty value", () => {
      const emptyValue = new TestValueObject("");
      const rules = [new NotEmptyRule<TestValueObject>()];
      const result = validator.validate(emptyValue, rules);

      expect(result.isValid).toBe(false);
      expect(result.getAllMessages()).toContain("Value cannot be empty");
      expect(result.fieldViolations).toHaveLength(1);
      expect(result.fieldViolations[0].severity).toBe("error");
    });

    it("should validate string length", () => {
      const shortValue = new TestValueObject("ab");
      const rules = [new StringLengthRule<TestValueObject>(3, 10)];
      const result = validator.validate(shortValue, rules);

      expect(result.isValid).toBe(false);
      expect(result.getAllMessages()[0]).toContain(
        "String length must be between 3 and 10",
      );
    });

    it("should validate email format", () => {
      const invalidEmail = new TestValueObject("invalid-email");
      const rules = [new EmailRule<TestValueObject>()];
      const result = validator.validate(invalidEmail, rules);

      expect(result.isValid).toBe(false);
      expect(result.getAllMessages()).toContain(
        "Value must be a valid email address",
      );
    });

    it("should validate with multiple rules", () => {
      const rules = [
        new NotEmptyRule<TestValueObject>(),
        new StringLengthRule<TestValueObject>(5, 20),
        new EmailRule<TestValueObject>(),
      ];
      const result = validator.validate(testValue, rules);

      expect(result.isValid).toBe(true);
      expect(result.validationRules).toHaveLength(3);
      expect(result.statistics.rulesCount).toBe(3);
    });

    it("should handle rule execution errors", () => {
      const errorRule = new CustomRule<TestValueObject>(
        "errorRule",
        "Rule that throws error",
        () => {
          throw new Error("Rule execution failed");
        },
      );
      const rules = [errorRule];
      const result = validator.validate(testValue, rules);

      expect(result.isValid).toBe(false);
      expect(result.fieldViolations[0].severity).toBe("critical");
      expect(result.fieldViolations[0].violation).toContain(
        "Rule execution failed",
      );
    });
  });

  describe("rule management", () => {
    it("should add rule", () => {
      const rule = new NotEmptyRule<TestValueObject>();
      validator.addRule(rule);

      expect(validator.getRules()).toContain(rule);
    });

    it("should remove rule", () => {
      const rule = new NotEmptyRule<TestValueObject>();
      validator.addRule(rule);
      const removed = validator.removeRule("notEmpty");

      expect(removed).toBe(true);
      expect(validator.getRules()).toHaveLength(0);
    });

    it("should clear all rules", () => {
      validator.addRule(new NotEmptyRule<TestValueObject>());
      validator.addRule(new EmailRule<TestValueObject>());
      validator.clearRules();

      expect(validator.getRules()).toHaveLength(0);
    });

    it("should update existing rule", () => {
      const rule1 = new NotEmptyRule<TestValueObject>();
      const rule2 = new NotEmptyRule<TestValueObject>();
      rule2.priority = 200;

      validator.addRule(rule1);
      validator.addRule(rule2);

      expect(validator.getRules()).toHaveLength(1);
      expect(validator.getRules()[0].priority).toBe(200);
    });
  });

  describe("statistics", () => {
    it("should provide validation statistics", () => {
      const rules = [new NotEmptyRule<TestValueObject>()];
      const result = validator.validate(testValue, rules);

      expect(result.statistics).toBeDefined();
      expect(result.statistics.rulesCount).toBe(1);
      expect(result.statistics.executedRulesCount).toBe(1);
      expect(result.statistics.violationsCount).toBe(0);
      expect(result.statistics.duration).toBeGreaterThanOrEqual(0);
    });
  });

  describe("priority ordering", () => {
    it("should execute rules in priority order", () => {
      const lowPriorityRule = new CustomRule<TestValueObject>(
        "low",
        "Low priority rule",
        () => new SimpleValidationResult(true, [], [], []),
        10,
      );
      const highPriorityRule = new CustomRule<TestValueObject>(
        "high",
        "High priority rule",
        () => new SimpleValidationResult(true, [], [], []),
        100,
      );

      const rules = [lowPriorityRule, highPriorityRule];
      const result = validator.validate(testValue, rules);

      // 高优先级规则应该先执行
      expect(result.validationRules[0]).toBe("high");
      expect(result.validationRules[1]).toBe("low");
    });
  });
});
