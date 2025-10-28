/**
 * @fileoverview 业务规则验证结果单元测试
 * @description 测试业务规则验证结果的功能和边界情况
 */

import {
  BusinessRuleValidationResult,
  BusinessRuleValidationResultBuilder,
} from "./business-rule-validation-result.js";
import { BusinessRuleViolation } from "./business-rule-violation.js";
import { BusinessRuleSeverity } from "./business-rule.interface.js";

describe("BusinessRuleValidationResult", () => {
  describe("构造函数", () => {
    it("应该创建成功的验证结果", () => {
      const result = new BusinessRuleValidationResult({
        isValid: true,
        entityType: "User",
        entityId: "user-123",
        violations: [],
        warnings: [],
        info: [],
        executionTime: 100,
        rulesExecuted: 5,
        entitiesValidated: 1,
      });

      expect(result.isValid).toBe(true);
      expect(result.entityType).toBe("User");
      expect(result.entityId).toBe("user-123");
      expect(result.violations).toEqual([]);
      expect(result.warnings).toEqual([]);
      expect(result.info).toEqual([]);
      expect(result.executionTime).toBe(100);
      expect(result.rulesExecuted).toBe(5);
      expect(result.entitiesValidated).toBe(1);
    });

    it("应该创建失败的验证结果", () => {
      const violations = [
        {
          message: "Invalid email format",
          code: "INVALID_EMAIL",
          ruleName: "EmailFormatRule",
          severity: BusinessRuleSeverity.ERROR,
          timestamp: new Date(),
          isError: () => true,
          isWarning: () => false,
          isInfo: () => false,
          isCritical: () => false,
          getFullPath: () => "EmailFormatRule",
          getFormattedMessage: () => "Invalid email format",
          toJSON: () => ({}),
          toString: () => "Invalid email format",
          clone: () => violations[0],
        } as BusinessRuleViolation,
      ];

      const result = new BusinessRuleValidationResult({
        isValid: false,
        entityType: "User",
        entityId: "user-123",
        violations,
        warnings: [],
        info: [],
        executionTime: 150,
        rulesExecuted: 3,
        entitiesValidated: 1,
      });

      expect(result.isValid).toBe(false);
      expect(result.violations).toEqual(violations);
      expect(result.hasViolations()).toBe(true);
    });
  });

  describe("静态方法", () => {
    it("应该创建成功的验证结果", () => {
      const result = BusinessRuleValidationResult.success("User", "user-123", {
        executionTime: 50,
        rulesExecuted: 2,
        entitiesValidated: 1,
      });

      expect(result.isValid).toBe(true);
      expect(result.entityType).toBe("User");
      expect(result.entityId).toBe("user-123");
      expect(result.executionTime).toBe(50);
      expect(result.rulesExecuted).toBe(2);
      expect(result.entitiesValidated).toBe(1);
    });

    it("应该创建失败的验证结果", () => {
      const violations = [
        {
          message: "Invalid password",
          code: "INVALID_PASSWORD",
          ruleName: "PasswordRule",
          severity: BusinessRuleSeverity.ERROR,
          timestamp: new Date(),
          isError: () => true,
          isWarning: () => false,
          isInfo: () => false,
          isCritical: () => false,
          getFullPath: () => "PasswordRule",
          getFormattedMessage: () => "Invalid password",
          toJSON: () => ({}),
          toString: () => "Invalid password",
          clone: () => violations[0],
        } as BusinessRuleViolation,
      ];

      const result = BusinessRuleValidationResult.failure(
        "User",
        "user-123",
        violations,
        {
          executionTime: 75,
          rulesExecuted: 1,
          entitiesValidated: 1,
        },
      );

      expect(result.isValid).toBe(false);
      expect(result.violations).toEqual(violations);
      expect(result.executionTime).toBe(75);
    });
  });

  describe("实例方法", () => {
    let result: BusinessRuleValidationResult;
    let violations: BusinessRuleViolation[];
    let warnings: BusinessRuleViolation[];
    let info: BusinessRuleViolation[];

    beforeEach(() => {
      violations = [
        {
          message: "Error violation",
          code: "ERROR_CODE",
          ruleName: "ErrorRule",
          severity: BusinessRuleSeverity.ERROR,
          timestamp: new Date(),
          isError: () => true,
          isWarning: () => false,
          isInfo: () => false,
          isCritical: () => false,
          getFullPath: () => "ErrorRule",
          getFormattedMessage: () => "Error violation",
          toJSON: () => ({}),
          toString: () => "Error violation",
          clone: () => violations[0],
        } as BusinessRuleViolation,
      ];

      warnings = [
        {
          message: "Warning violation",
          code: "WARNING_CODE",
          ruleName: "WarningRule",
          severity: BusinessRuleSeverity.WARNING,
          timestamp: new Date(),
          isError: () => false,
          isWarning: () => true,
          isInfo: () => false,
          isCritical: () => false,
          getFullPath: () => "WarningRule",
          getFormattedMessage: () => "Warning violation",
          toJSON: () => ({}),
          toString: () => "Warning violation",
          clone: () => warnings[0],
        } as BusinessRuleViolation,
      ];

      info = [
        {
          message: "Info violation",
          code: "INFO_CODE",
          ruleName: "InfoRule",
          severity: BusinessRuleSeverity.INFO,
          timestamp: new Date(),
          isError: () => false,
          isWarning: () => false,
          isInfo: () => true,
          isCritical: () => false,
          getFullPath: () => "InfoRule",
          getFormattedMessage: () => "Info violation",
          toJSON: () => ({}),
          toString: () => "Info violation",
          clone: () => info[0],
        } as BusinessRuleViolation,
      ];

      result = new BusinessRuleValidationResult({
        isValid: false,
        entityType: "User",
        entityId: "user-123",
        violations,
        warnings,
        info,
        executionTime: 100,
        rulesExecuted: 3,
        entitiesValidated: 1,
      });
    });

    it("应该检查是否有违反", () => {
      expect(result.hasViolations()).toBe(true);

      const successResult = new BusinessRuleValidationResult({
        isValid: true,
        entityType: "User",
        entityId: "user-123",
        violations: [],
        warnings: [],
        info: [],
        executionTime: 50,
        rulesExecuted: 2,
        entitiesValidated: 1,
      });

      expect(successResult.hasViolations()).toBe(false);
    });

    it("应该检查是否有警告", () => {
      expect(result.hasWarnings()).toBe(true);

      const noWarningResult = new BusinessRuleValidationResult({
        isValid: false,
        entityType: "User",
        entityId: "user-123",
        violations,
        warnings: [],
        info: [],
        executionTime: 50,
        rulesExecuted: 2,
        entitiesValidated: 1,
      });

      expect(noWarningResult.hasWarnings()).toBe(false);
    });

    it("应该检查是否有信息", () => {
      expect(result.hasInfo()).toBe(true);

      const noInfoResult = new BusinessRuleValidationResult({
        isValid: false,
        entityType: "User",
        entityId: "user-123",
        violations,
        warnings,
        info: [],
        executionTime: 50,
        rulesExecuted: 2,
        entitiesValidated: 1,
      });

      expect(noInfoResult.hasInfo()).toBe(false);
    });

    it("应该获取所有消息", () => {
      const messages = result.getAllMessages();
      expect(messages).toHaveLength(3);
      expect(messages).toContain("Error violation");
      expect(messages).toContain("Warning violation");
      expect(messages).toContain("Info violation");
    });

    it("应该按严重程度获取消息", () => {
      const errorMessages = result.getMessagesBySeverity(
        BusinessRuleSeverity.ERROR,
      );
      expect(errorMessages).toHaveLength(1);
      expect(errorMessages).toContain("Error violation");

      const warningMessages = result.getMessagesBySeverity(
        BusinessRuleSeverity.WARNING,
      );
      expect(warningMessages).toHaveLength(1);
      expect(warningMessages).toContain("Warning violation");

      const infoMessages = result.getMessagesBySeverity(
        BusinessRuleSeverity.INFO,
      );
      expect(infoMessages).toHaveLength(1);
      expect(infoMessages).toContain("Info violation");
    });

    it("应该按规则名称获取违反", () => {
      const errorViolations = result.getViolationsForRule("ErrorRule");
      expect(errorViolations).toHaveLength(1);
      expect(errorViolations[0].message).toBe("Error violation");

      const nonExistentViolations =
        result.getViolationsForRule("NonExistentRule");
      expect(nonExistentViolations).toHaveLength(0);
    });

    it("应该按严重程度获取违反", () => {
      const errorViolations = result.getViolationsBySeverity(
        BusinessRuleSeverity.ERROR,
      );
      expect(errorViolations).toHaveLength(1);
      expect(errorViolations[0].message).toBe("Error violation");

      const warningViolations = result.getViolationsBySeverity(
        BusinessRuleSeverity.WARNING,
      );
      expect(warningViolations).toHaveLength(0); // 警告不在违反列表中
    });

    it("应该按规则类型获取违反", () => {
      const errorViolations = result.getViolationsByRuleType("ErrorRule");
      expect(errorViolations).toHaveLength(0); // 规则类型不匹配

      // 添加规则类型
      const violationWithType = {
        ...violations[0],
        ruleType: "ErrorRule",
      } as BusinessRuleViolation;

      const resultWithType = new BusinessRuleValidationResult({
        isValid: false,
        entityType: "User",
        entityId: "user-123",
        violations: [violationWithType],
        warnings: [],
        info: [],
        executionTime: 100,
        rulesExecuted: 1,
        entitiesValidated: 1,
      });

      const typeViolations =
        resultWithType.getViolationsByRuleType("ErrorRule");
      expect(typeViolations).toHaveLength(1);
    });

    it("应该合并验证结果", () => {
      const otherViolations = [
        {
          message: "Another error",
          code: "ANOTHER_ERROR",
          ruleName: "AnotherRule",
          severity: BusinessRuleSeverity.ERROR,
          timestamp: new Date(),
          isError: () => true,
          isWarning: () => false,
          isInfo: () => false,
          isCritical: () => false,
          getFullPath: () => "AnotherRule",
          getFormattedMessage: () => "Another error",
          toJSON: () => ({}),
          toString: () => "Another error",
          clone: () => otherViolations[0],
        } as BusinessRuleViolation,
      ];

      const otherResult = new BusinessRuleValidationResult({
        isValid: false,
        entityType: "User",
        entityId: "user-123",
        violations: otherViolations,
        warnings: [],
        info: [],
        executionTime: 50,
        rulesExecuted: 1,
        entitiesValidated: 1,
      });

      const mergedResult = result.merge(otherResult);

      expect(mergedResult.isValid).toBe(false);
      expect(mergedResult.violations).toHaveLength(2);
      expect(mergedResult.violations[0].message).toBe("Error violation");
      expect(mergedResult.violations[1].message).toBe("Another error");
      expect(mergedResult.executionTime).toBe(100); // 取最大值
      expect(mergedResult.rulesExecuted).toBe(4); // 3 + 1
    });

    it("应该转换为JSON格式", () => {
      const json = result.toJSON();

      expect(json.isValid).toBe(false);
      expect(json.entityType).toBe("User");
      expect(json.entityId).toBe("user-123");
      expect(json.violationCount).toBe(1);
      expect(json.warningCount).toBe(1);
      expect(json.infoCount).toBe(1);
      expect(json.executionTime).toBe(100);
      expect(json.rulesExecuted).toBe(3);
      expect(json.entitiesValidated).toBe(1);
      expect(json.violations).toHaveLength(1);
      expect(json.warnings).toHaveLength(1);
      expect(json.info).toHaveLength(1);
    });

    it("应该转换为字符串格式", () => {
      const str = result.toString();
      expect(str).toContain("Business rule validation failed");
      expect(str).toContain("User");
      expect(str).toContain("user-123");
    });
  });
});

describe("BusinessRuleValidationResultBuilder", () => {
  let builder: BusinessRuleValidationResultBuilder;

  beforeEach(() => {
    builder = new BusinessRuleValidationResultBuilder();
  });

  it("应该设置实体信息", () => {
    builder.setEntity("User", "user-123");
    const result = builder.build();

    expect(result.entityType).toBe("User");
    expect(result.entityId).toBe("user-123");
  });

  it("应该添加违反", () => {
    const violation = {
      message: "Test violation",
      code: "TEST_CODE",
      ruleName: "TestRule",
      severity: BusinessRuleSeverity.ERROR,
      timestamp: new Date(),
      isError: () => true,
      isWarning: () => false,
      isInfo: () => false,
      isCritical: () => false,
      getFullPath: () => "TestRule",
      getFormattedMessage: () => "Test violation",
      toJSON: () => ({}),
      toString: () => "Test violation",
      clone: () => violation,
    } as BusinessRuleViolation;

    builder.setEntity("User", "user-123").addViolation(violation);

    const result = builder.build();

    expect(result.hasViolations()).toBe(true);
    expect(result.violations).toHaveLength(1);
    expect(result.violations[0].message).toBe("Test violation");
  });

  it("应该添加警告", () => {
    const warning = {
      message: "Test warning",
      code: "WARNING_CODE",
      ruleName: "WarningRule",
      severity: BusinessRuleSeverity.WARNING,
      timestamp: new Date(),
      isError: () => false,
      isWarning: () => true,
      isInfo: () => false,
      isCritical: () => false,
      getFullPath: () => "WarningRule",
      getFormattedMessage: () => "Test warning",
      toJSON: () => ({}),
      toString: () => "Test warning",
      clone: () => warning,
    } as BusinessRuleViolation;

    builder.setEntity("User", "user-123").addWarning(warning);

    const result = builder.build();

    expect(result.hasWarnings()).toBe(true);
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0].message).toBe("Test warning");
  });

  it("应该添加信息", () => {
    const info = {
      message: "Test info",
      code: "INFO_CODE",
      ruleName: "InfoRule",
      severity: BusinessRuleSeverity.INFO,
      timestamp: new Date(),
      isError: () => false,
      isWarning: () => false,
      isInfo: () => true,
      isCritical: () => false,
      getFullPath: () => "InfoRule",
      getFormattedMessage: () => "Test info",
      toJSON: () => ({}),
      toString: () => "Test info",
      clone: () => info,
    } as BusinessRuleViolation;

    builder.setEntity("User", "user-123").addInfo(info);

    const result = builder.build();

    expect(result.hasInfo()).toBe(true);
    expect(result.info).toHaveLength(1);
    expect(result.info[0].message).toBe("Test info");
  });

  it("应该设置执行时间", () => {
    builder.setEntity("User", "user-123").setExecutionTime(150);

    const result = builder.build();

    expect(result.executionTime).toBe(150);
  });

  it("应该设置规则执行数量", () => {
    builder.setEntity("User", "user-123").setRulesExecuted(5);

    const result = builder.build();

    expect(result.rulesExecuted).toBe(5);
  });

  it("应该设置实体验证数量", () => {
    builder.setEntity("User", "user-123").setEntitiesValidated(3);

    const result = builder.build();

    expect(result.entitiesValidated).toBe(3);
  });

  it("应该清空所有内容", () => {
    const violation = {
      message: "Test violation",
      code: "TEST_CODE",
      ruleName: "TestRule",
      severity: BusinessRuleSeverity.ERROR,
      timestamp: new Date(),
      isError: () => true,
      isWarning: () => false,
      isInfo: () => false,
      isCritical: () => false,
      getFullPath: () => "TestRule",
      getFormattedMessage: () => "Test violation",
      toJSON: () => ({}),
      toString: () => "Test violation",
      clone: () => violation,
    } as BusinessRuleViolation;

    builder.setEntity("User", "user-123").addViolation(violation).clearAll();

    const result = builder.build();

    expect(result.hasViolations()).toBe(false);
    expect(result.hasWarnings()).toBe(false);
    expect(result.hasInfo()).toBe(false);
  });

  it("应该重置构建器", () => {
    builder.setEntity("User", "user-123").setExecutionTime(100).reset();

    expect(() => builder.build()).toThrow("Entity type and ID are required");
  });

  it("应该在缺少实体信息时抛出错误", () => {
    expect(() => builder.build()).toThrow("Entity type and ID are required");
  });
});
