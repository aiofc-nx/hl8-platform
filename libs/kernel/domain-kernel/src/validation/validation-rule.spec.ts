/**
 * @fileoverview 验证规则单元测试
 * @description 测试验证规则的基本功能
 */

import { ValidationRule } from "./rules/validation-rule.js";
import { ValidationErrorLevel } from "./rules/validation-result.interface.js";

/**
 * 测试验证规则类
 */
describe("ValidationRule", () => {
  let testRule: ValidationRule<string>;

  beforeEach(() => {
    testRule = new (class extends ValidationRule<string> {
      constructor() {
        super("testRule", "Test validation rule", 10, true);
      }

      protected doValidate(value: string): any {
        if (value.length < 3) {
          return this.createFailureResult([
            this.createError(
              "Value must be at least 3 characters long",
              "MIN_LENGTH_ERROR",
            ),
          ]);
        }
        return this.createSuccessResult();
      }
    })();
  });

  describe("基本功能", () => {
    it("应该正确创建验证规则", () => {
      expect(testRule.name).toBe("testRule");
      expect(testRule.description).toBe("Test validation rule");
      expect(testRule.priority).toBe(10);
      expect(testRule.enabled).toBe(true);
    });

    it("应该验证通过有效的值", () => {
      const result = testRule.validate("hello");
      expect(result.isValid).toBe(true);
      expect(result.hasErrors()).toBe(false);
    });

    it("应该验证失败无效的值", () => {
      const result = testRule.validate("hi");
      expect(result.isValid).toBe(false);
      expect(result.hasErrors()).toBe(true);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toBe(
        "Value must be at least 3 characters long",
      );
    });

    it("应该检查规则适用性", () => {
      expect(testRule.isApplicable("test")).toBe(true);
    });
  });

  describe("错误创建", () => {
    it("应该创建错误级别的错误", () => {
      const error = testRule.createError("Test error", "TEST_ERROR");
      expect(error.message).toBe("Test error");
      expect(error.code).toBe("TEST_ERROR");
      expect(error.level).toBe(ValidationErrorLevel.ERROR);
      expect(error.isError()).toBe(true);
    });

    it("应该创建警告级别的错误", () => {
      const warning = testRule.createWarning("Test warning", "TEST_WARNING");
      expect(warning.message).toBe("Test warning");
      expect(warning.code).toBe("TEST_WARNING");
      expect(warning.level).toBe(ValidationErrorLevel.WARNING);
      expect(warning.isWarning()).toBe(true);
    });

    it("应该创建信息级别的错误", () => {
      const info = testRule.createInfo("Test info", "TEST_INFO");
      expect(info.message).toBe("Test info");
      expect(info.code).toBe("TEST_INFO");
      expect(info.level).toBe(ValidationErrorLevel.INFO);
      expect(info.isInfo()).toBe(true);
    });
  });
});
