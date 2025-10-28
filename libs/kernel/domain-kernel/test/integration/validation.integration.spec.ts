/**
 * @fileoverview 验证框架集成测试
 * @description 测试验证框架的完整功能
 */

import { ValueObjectValidator } from "../../src/validation/value-object-validator.js";
import { ValidationRule } from "../../src/validation/rules/validation-rule.js";
import { CommonValidationRulesImpl } from "../../src/validation/rules/common-validation-rules.js";

const commonValidationRules = new CommonValidationRulesImpl();

/**
 * 测试验证框架集成
 */
describe("Validation Framework Integration", () => {
  let validator: ValueObjectValidator<string>;

  beforeEach(() => {
    validator = ValueObjectValidator.create(
      "testValidator",
      "Test validator for strings",
    );
  });

  describe("基本验证功能", () => {
    it("应该创建空的验证器", () => {
      expect(validator.name).toBe("testValidator");
      expect(validator.description).toBe("Test validator for strings");
      expect(validator.getRuleCount()).toBe(0);
      expect(validator.enabled).toBe(true);
    });

    it("应该添加验证规则", () => {
      const rule = commonValidationRules.stringMinLength(3);
      validator = validator.addRule(rule);

      expect(validator.getRuleCount()).toBe(1);
      expect(validator.hasRule("stringMinLength")).toBe(true);
    });

    it("应该执行验证", () => {
      const rule = commonValidationRules.stringMinLength(3);
      const testValidator = validator.addRule(rule);

      const result = testValidator.validate("hello");
      expect(result.isValid).toBe(true);

      const invalidResult = testValidator.validate("hi");
      expect(invalidResult.isValid).toBe(false);
      expect(invalidResult.hasErrors()).toBe(true);
    });

    it("应该移除验证规则", () => {
      const rule = commonValidationRules.stringMinLength(3);
      let testValidator = validator.addRule(rule);
      expect(testValidator.getRuleCount()).toBe(1);

      testValidator = testValidator.removeRule("stringMinLength");
      expect(testValidator.getRuleCount()).toBe(0);
      expect(testValidator.hasRule("stringMinLength")).toBe(false);
    });
  });

  describe("多个规则验证", () => {
    let testValidator: ValueObjectValidator<string>;

    beforeEach(() => {
      testValidator = validator
        .addRule(commonValidationRules.stringMinLength(3))
        .addRule(commonValidationRules.stringMaxLength(10))
        .addRule(commonValidationRules.notEmpty());
    });

    it("应该通过所有规则", () => {
      const result = testValidator.validate("hello");
      expect(result.isValid).toBe(true);
      expect(result.hasErrors()).toBe(false);
    });

    it("应该失败于最小长度规则", () => {
      const result = testValidator.validate("hi");
      expect(result.isValid).toBe(false);
      expect(result.hasErrors()).toBe(true);
      expect(result.errors[0].ruleName).toBe("stringMinLength");
    });

    it("应该失败于最大长度规则", () => {
      const result = testValidator.validate("verylongstring");
      expect(result.isValid).toBe(false);
      expect(result.hasErrors()).toBe(true);
      expect(result.errors[0].ruleName).toBe("stringMaxLength");
    });

    it("应该失败于非空规则", () => {
      const result = testValidator.validate("");
      expect(result.isValid).toBe(false);
      expect(result.hasErrors()).toBe(true);
      expect(result.errors[0].ruleName).toBe("notEmpty");
    });
  });

  describe("验证器状态管理", () => {
    it("应该禁用验证器", () => {
      const rule = commonValidationRules.stringMinLength(3);
      validator = validator.addRule(rule).disable();

      expect(validator.enabled).toBe(false);

      const result = validator.validate("hi");
      expect(result.isValid).toBe(true); // 禁用的验证器总是返回成功
    });

    it("应该启用验证器", () => {
      validator = validator.disable().enable();
      expect(validator.enabled).toBe(true);
    });

    it("应该清空所有规则", () => {
      validator = validator
        .addRule(commonValidationRules.stringMinLength(3))
        .addRule(commonValidationRules.stringMaxLength(10))
        .clearRules();

      expect(validator.getRuleCount()).toBe(0);
    });
  });

  describe("验证结果分析", () => {
    let testValidator: ValueObjectValidator<string>;

    beforeEach(() => {
      testValidator = validator
        .addRule(commonValidationRules.stringMinLength(3))
        .addRule(commonValidationRules.stringMaxLength(10));
    });

    it("应该提供详细的验证结果", () => {
      const result = testValidator.validate("hello");

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
      expect(result.info).toHaveLength(0);
      expect(result.rulesExecuted).toBe(2);
      expect(result.fieldsValidated).toBe(1);
    });

    it("应该提供错误详情", () => {
      const result = testValidator.validate("hi");

      expect(result.isValid).toBe(false);
      expect(result.hasErrors()).toBe(true);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toContain("at least 3");
      expect(result.errors[0].code).toBe("STRING_MIN_LENGTH_ERROR");
    });
  });
});
