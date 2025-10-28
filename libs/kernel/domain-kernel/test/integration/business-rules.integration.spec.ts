/**
 * @fileoverview 业务规则集成测试
 * @description 测试业务规则框架的集成功能和端到端场景
 */

import { BusinessRuleManager } from "../../src/business-rules/business-rule-manager.js";
import { BusinessRuleFactory } from "../../src/business-rules/factories/business-rule-factory.js";
import { BusinessRuleValidationResult } from "../../src/business-rules/business-rule-validation-result.js";
import { BusinessRuleViolation } from "../../src/business-rules/business-rule-violation.js";
import {
  BusinessRuleSeverity,
  BusinessRuleType,
} from "../../src/business-rules/business-rule.interface.js";

// 模拟业务规则实现
class MockBusinessRule {
  public readonly name: string;
  public readonly description: string;
  public readonly priority: number;
  private _enabled: boolean;
  public readonly ruleType: string;
  public readonly severity: BusinessRuleSeverity;
  public readonly type: BusinessRuleType;

  constructor(
    name: string,
    description: string,
    priority: number = 100,
    enabled: boolean = true,
    ruleType: string = "MockRule",
    severity: BusinessRuleSeverity = BusinessRuleSeverity.ERROR,
  ) {
    this.name = name;
    this.description = description;
    this.priority = priority;
    this._enabled = enabled;
    this.ruleType = ruleType;
    this.severity = severity;
    this.type = BusinessRuleType.BUSINESS_LOGIC;
  }

  public get enabled(): boolean {
    return this._enabled;
  }

  public enable(): void {
    this._enabled = true;
  }

  public disable(): void {
    this._enabled = false;
  }

  public createViolation(
    message: string,
    code?: string,
    details?: Record<string, unknown>,
  ): BusinessRuleViolation {
    return BusinessRuleViolation.error(
      message,
      code || "MOCK_ERROR",
      this.name,
      details,
    );
  }

  public isApplicable(entity: unknown, context?: any): boolean {
    return this._enabled;
  }

  public getDependencies(): string[] {
    return [];
  }

  public conflictsWith(other: MockBusinessRule): boolean {
    return false;
  }

  public validate(value: unknown, context?: any): BusinessRuleValidationResult {
    if (!this._enabled) {
      return BusinessRuleValidationResult.success(
        context?.entityType ?? "Unknown",
        context?.entityId ?? "Unknown",
        { executionTime: 0, rulesExecuted: 0, entitiesValidated: 1, context },
      );
    }

    const violations: BusinessRuleViolation[] = [];
    const warnings: BusinessRuleViolation[] = [];
    const info: BusinessRuleViolation[] = [];

    // 模拟验证逻辑
    if (this.name === "EmailFormatRule") {
      let emailValue = value;
      if (typeof value === "object" && value !== null && "email" in value) {
        emailValue = (value as any).email;
      }
      if (typeof emailValue === "string" && !emailValue.includes("@")) {
        const violation = BusinessRuleViolation.error(
          "Invalid email format",
          "INVALID_EMAIL_FORMAT",
          this.name,
          { details: { value: emailValue, expected: "email@domain.com" } },
        );
        violations.push(violation);
      }
    }

    if (this.name === "PasswordStrengthRule") {
      let passwordValue = value;
      if (typeof value === "object" && value !== null && "password" in value) {
        passwordValue = (value as any).password;
      }
      if (typeof passwordValue === "string" && passwordValue.length < 8) {
        const violation = BusinessRuleViolation.warning(
          "Password too weak",
          "WEAK_PASSWORD",
          this.name,
          { details: { actualLength: passwordValue.length, minLength: 8 } },
        );
        warnings.push(violation);
      }
    }

    if (this.name === "AgeValidationRule") {
      let ageValue = value;
      if (typeof value === "object" && value !== null && "age" in value) {
        ageValue = (value as any).age;
      }
      console.log(
        `AgeValidationRule: value=${JSON.stringify(value)}, ageValue=${ageValue}, type=${typeof ageValue}`,
      );
      if (typeof ageValue === "number" && ageValue < 18) {
        const violation = BusinessRuleViolation.critical(
          "Age must be at least 18",
          "INVALID_AGE",
          this.name,
          { details: { actualAge: ageValue, minAge: 18 } },
        );
        violations.push(violation);
      }
    }

    // 如果有违规，返回失败结果
    if (violations.length > 0 || warnings.length > 0 || info.length > 0) {
      return BusinessRuleValidationResult.failure(
        context?.entityType ?? "Unknown",
        context?.entityId ?? "Unknown",
        violations,
        {
          warnings,
          info,
          executionTime: 10,
          rulesExecuted: 1,
          entitiesValidated: 1,
          context,
        },
      );
    }

    // 没有违规，返回成功结果
    return BusinessRuleValidationResult.success(
      context?.entityType ?? "Unknown",
      context?.entityId ?? "Unknown",
      { executionTime: 5, rulesExecuted: 1, entitiesValidated: 1, context },
    );
  }

  public toJSON(): object {
    return {
      name: this.name,
      description: this.description,
      priority: this.priority,
      enabled: this.enabled,
      ruleType: this.ruleType,
      severity: this.severity,
    };
  }
}

describe("Business Rules Integration Tests", () => {
  let manager: BusinessRuleManager;
  let factory: BusinessRuleFactory;

  beforeEach(() => {
    manager = new BusinessRuleManager();
    factory = new BusinessRuleFactory();

    // 注册 MockRule 类型
    factory.registerRuleType("MockRule", {
      create: (config: any) =>
        new MockBusinessRule(
          config.name,
          config.description,
          config.priority,
          config.enabled,
          config.type,
          config.severity,
        ),
      getType: () => "MockRule",
      getDescription: () => "Mock rule for testing",
      getVersion: () => "1.0.0",
      validateConfig: (config: any) => !!config.name && !!config.description,
      getDefaultConfig: () => ({
        priority: 100,
        enabled: true,
        config: {},
        dependencies: [],
        tags: [],
      }),
      toJSON: () => ({
        type: "MockRule",
        description: "Mock rule for testing",
        version: "1.0.0",
        defaultConfig: {},
      }),
    });
  });

  describe("业务规则管理器集成", () => {
    it("应该注册和管理业务规则", () => {
      const emailRule = new MockBusinessRule(
        "EmailFormatRule",
        "Validates email format",
      );
      const passwordRule = new MockBusinessRule(
        "PasswordStrengthRule",
        "Validates password strength",
      );
      const ageRule = new MockBusinessRule(
        "AgeValidationRule",
        "Validates age requirement",
      );

      // 注册规则
      expect(manager.registerRule(emailRule)).toBe(true);
      expect(manager.registerRule(passwordRule)).toBe(true);
      expect(manager.registerRule(ageRule)).toBe(true);

      // 验证规则数量
      expect(manager.getRuleCount()).toBe(3);
      expect(manager.getEnabledRuleCount()).toBe(3);

      // 获取规则
      expect(manager.getRule("EmailFormatRule")).toBe(emailRule);
      expect(manager.getRule("NonExistentRule")).toBeUndefined();

      // 检查规则存在性
      expect(manager.hasRule("EmailFormatRule")).toBe(true);
      expect(manager.hasRule("NonExistentRule")).toBe(false);

      // 检查规则启用状态
      expect(manager.isRuleEnabled("EmailFormatRule")).toBe(true);
    });

    it("应该启用和禁用业务规则", () => {
      const rule = new MockBusinessRule("TestRule", "Test rule");
      manager.registerRule(rule);

      // 禁用规则
      expect(manager.disableRule("TestRule")).toBe(true);
      expect(manager.isRuleEnabled("TestRule")).toBe(false);
      expect(manager.getDisabledRuleCount()).toBe(1);

      // 启用规则
      expect(manager.enableRule("TestRule")).toBe(true);
      expect(manager.isRuleEnabled("TestRule")).toBe(true);
      expect(manager.getEnabledRuleCount()).toBe(1);
    });

    it("应该按类型和优先级获取规则", () => {
      const validationRule = new MockBusinessRule(
        "ValidationRule1",
        "Validation rule 1",
        100,
        true,
        "Validation",
      );
      const businessRule = new MockBusinessRule(
        "BusinessRule1",
        "Business rule 1",
        200,
        true,
        "Business",
      );
      const securityRule = new MockBusinessRule(
        "SecurityRule1",
        "Security rule 1",
        300,
        true,
        "Security",
      );

      manager.registerRule(validationRule);
      manager.registerRule(businessRule);
      manager.registerRule(securityRule);

      // 按类型获取规则
      const validationRules = manager.getRulesByType("Validation");
      expect(validationRules).toHaveLength(1);
      expect(validationRules[0].name).toBe("ValidationRule1");

      // 按优先级获取规则
      const priority200Rules = manager.getRulesByPriority(200);
      expect(priority200Rules).toHaveLength(1);
      expect(priority200Rules[0].name).toBe("BusinessRule1");
    });

    it("应该清空所有规则", () => {
      const rule1 = new MockBusinessRule("Rule1", "Rule 1");
      const rule2 = new MockBusinessRule("Rule2", "Rule 2");

      manager.registerRule(rule1);
      manager.registerRule(rule2);

      expect(manager.getRuleCount()).toBe(2);

      const clearedCount = manager.clearRules();
      expect(clearedCount).toBe(2);
      expect(manager.getRuleCount()).toBe(0);
    });
  });

  describe("业务规则验证集成", () => {
    beforeEach(() => {
      // 注册测试规则
      manager.registerRule(
        new MockBusinessRule("EmailFormatRule", "Validates email format"),
      );
      manager.registerRule(
        new MockBusinessRule(
          "PasswordStrengthRule",
          "Validates password strength",
        ),
      );
      manager.registerRule(
        new MockBusinessRule("AgeValidationRule", "Validates age requirement"),
      );
    });

    it("应该验证单个实体", () => {
      const user = {
        email: "invalid-email",
        password: "weak",
        age: 16,
      };

      console.log("Rules count:", manager.getRuleCount());
      console.log("Enabled rules count:", manager.getEnabledRuleCount());
      console.log(
        "All rules:",
        manager.getAllRules().map((r) => r.name),
      );

      const result = manager.validateEntity(user, {
        entityType: "User",
        entityId: "user-123",
      });

      console.log("Result:", JSON.stringify(result, null, 2));

      expect(result.isValid).toBe(false);
      expect(result.hasViolations()).toBe(true);
      expect(result.violations).toHaveLength(2); // Email and age violations
      expect(result.warnings).toHaveLength(1); // Password warning
    });

    it("应该验证实体属性", () => {
      const user = {
        email: "invalid-email",
        password: "strongpassword123",
        age: 25,
      };

      const result = manager.validateEntityProperty(user, "email", {
        entityType: "User",
        entityId: "user-123",
      });

      expect(result.isValid).toBe(false);
      expect(result.hasViolations()).toBe(true);
      expect(result.violations[0].message).toBe("Invalid email format");
    });

    it("应该验证实体集合", () => {
      const users = [
        { email: "user1@example.com", password: "strong123", age: 25 },
        { email: "invalid-email", password: "weak", age: 16 },
        { email: "user3@example.com", password: "strong456", age: 30 },
      ];

      const result = manager.validateEntityCollection(users, {
        entityType: "User",
        entityId: "users-collection",
      });

      expect(result.isValid).toBe(false);
      expect(result.hasViolations()).toBe(true);
      expect(result.entitiesValidated).toBe(3);
    });

    it("应该验证指定规则", () => {
      const result = manager.validateRule("EmailFormatRule", "invalid-email", {
        entityType: "User",
        entityId: "user-123",
      });

      expect(result.isValid).toBe(false);
      expect(result.hasViolations()).toBe(true);
      expect(result.violations[0].ruleName).toBe("EmailFormatRule");
    });

    it("应该验证指定规则集合", () => {
      const result = manager.validateRules(
        ["EmailFormatRule", "PasswordStrengthRule"],
        "invalid-email",
        {
          entityType: "User",
          entityId: "user-123",
        },
      );

      expect(result.isValid).toBe(false);
      expect(result.hasViolations()).toBe(true);
      expect(result.rulesExecuted).toBe(2);
    });

    it("应该验证所有规则", () => {
      const result = manager.validateAllRules("invalid-email", {
        entityType: "User",
        entityId: "user-123",
      });

      expect(result.isValid).toBe(false);
      expect(result.hasViolations()).toBe(true);
      expect(result.rulesExecuted).toBe(3);
    });
  });

  describe("业务规则工厂集成", () => {
    it("应该创建业务规则配置", () => {
      const ruleConfig = {
        name: "TestRule",
        type: "MockRule",
        description: "Test rule",
        priority: 100,
        enabled: true,
        config: { test: true },
        dependencies: [],
        tags: ["test"],
      };

      const config = factory.createRule("MockRule", {
        ...ruleConfig,
        toJSON: () => ruleConfig,
      });

      expect(config).toBeDefined();
      expect(config.name).toBe("TestRule");
    });

    it("应该创建业务规则验证结果", () => {
      const violation = BusinessRuleViolation.error(
        "Test violation",
        "TEST_VIOLATION",
        "TestRule",
      );

      const result = factory.createValidationResult({
        isValid: false,
        entityType: "User",
        entityId: "user-123",
        violations: [violation],
        executionTime: 100,
        rulesExecuted: 1,
        entitiesValidated: 1,
        toJSON: () => ({
          isValid: false,
          entityType: "User",
          entityId: "user-123",
          violations: [
            {
              ...violation,
              timestamp: violation.timestamp.toISOString(),
            },
          ],
          executionTime: 100,
          rulesExecuted: 1,
          entitiesValidated: 1,
        }),
      });

      expect(result.isValid).toBe(false);
      expect(result.hasViolations()).toBe(true);
      expect(result.violations).toHaveLength(1);
    });

    it("应该创建业务规则违反", () => {
      const violation = factory.createViolation({
        message: "Test violation",
        code: "TEST_VIOLATION",
        ruleName: "TestRule",
        severity: BusinessRuleSeverity.ERROR,
        details: { test: true },
        toJSON: () => ({
          message: "Test violation",
          code: "TEST_VIOLATION",
          ruleName: "TestRule",
          severity: BusinessRuleSeverity.ERROR,
          details: { test: true },
          timestamp: new Date().getTime().toString(),
        }),
      });

      expect(violation.message).toBe("Test violation");
      expect(violation.code).toBe("TEST_VIOLATION");
      expect(violation.ruleName).toBe("TestRule");
      expect(violation.severity).toBe(BusinessRuleSeverity.ERROR);
    });

    it("应该创建业务规则集合", () => {
      const configs = [
        {
          name: "Rule1",
          type: "MockRule",
          description: "Rule 1",
          priority: 100,
          enabled: true,
          config: {},
          dependencies: [],
          tags: [],
          toJSON: () => ({
            name: "Rule1",
            type: "MockRule",
            description: "Rule 1",
            priority: 100,
            enabled: true,
            config: {},
            dependencies: [],
            tags: [],
          }),
        },
        {
          name: "Rule2",
          type: "MockRule",
          description: "Rule 2",
          priority: 200,
          enabled: true,
          config: {},
          dependencies: [],
          tags: [],
          toJSON: () => ({
            name: "Rule2",
            type: "MockRule",
            description: "Rule 2",
            priority: 200,
            enabled: true,
            config: {},
            dependencies: [],
            tags: [],
          }),
        },
      ];

      const rules = factory.createRules(configs);
      expect(rules).toHaveLength(2);
      expect(rules[0].name).toBe("Rule1");
      expect(rules[1].name).toBe("Rule2");
    });
  });

  describe("端到端场景测试", () => {
    it("应该处理用户注册验证场景", () => {
      // 注册用户相关规则
      manager.registerRule(
        new MockBusinessRule("EmailFormatRule", "Validates email format"),
      );
      manager.registerRule(
        new MockBusinessRule(
          "PasswordStrengthRule",
          "Validates password strength",
        ),
      );
      manager.registerRule(
        new MockBusinessRule("AgeValidationRule", "Validates age requirement"),
      );

      // 模拟用户注册数据
      const registrationData = {
        email: "invalid-email",
        password: "weak",
        age: 16,
        name: "John Doe",
      };

      // 验证注册数据
      const result = manager.validateEntity(registrationData, {
        entityType: "User",
        entityId: "new-user",
        operationType: "REGISTRATION",
      });

      // 验证结果
      expect(result.isValid).toBe(false);
      expect(result.hasViolations()).toBe(true);
      expect(result.hasWarnings()).toBe(true);
      expect(result.violations).toHaveLength(2); // Email and age violations
      expect(result.warnings).toHaveLength(1); // Password warning

      // 验证统计信息
      const stats = manager.getValidationStats();
      expect(stats.totalValidations).toBe(1);
      expect(stats.failedValidations).toBe(1);
      expect(stats.warningValidations).toBe(1);
    });

    it("应该处理批量数据验证场景", () => {
      // 注册规则
      manager.registerRule(
        new MockBusinessRule("EmailFormatRule", "Validates email format"),
      );

      // 模拟批量用户数据
      const users = [
        { email: "user1@example.com", name: "User 1" },
        { email: "user2@example.com", name: "User 2" },
        { email: "invalid-email", name: "User 3" },
        { email: "user4@example.com", name: "User 4" },
      ];

      // 验证批量数据
      const result = manager.validateEntityCollection(users, {
        entityType: "User",
        entityId: "bulk-import",
      });

      // 验证结果
      expect(result.isValid).toBe(false);
      expect(result.hasViolations()).toBe(true);
      expect(result.entitiesValidated).toBe(4);
      expect(result.violations).toHaveLength(1); // 只有一个无效邮箱
    });

    it("应该处理规则优先级场景", () => {
      // 注册不同优先级的规则
      const highPriorityRule = new MockBusinessRule(
        "HighPriorityRule",
        "High priority rule",
        300,
      );
      const mediumPriorityRule = new MockBusinessRule(
        "MediumPriorityRule",
        "Medium priority rule",
        200,
      );
      const lowPriorityRule = new MockBusinessRule(
        "LowPriorityRule",
        "Low priority rule",
        100,
      );

      manager.registerRule(highPriorityRule);
      manager.registerRule(mediumPriorityRule);
      manager.registerRule(lowPriorityRule);

      // 按优先级获取规则
      const highPriorityRules = manager.getRulesByPriority(300);
      expect(highPriorityRules).toHaveLength(1);
      expect(highPriorityRules[0].name).toBe("HighPriorityRule");

      const mediumPriorityRules = manager.getRulesByPriority(200);
      expect(mediumPriorityRules).toHaveLength(1);
      expect(mediumPriorityRules[0].name).toBe("MediumPriorityRule");
    });

    it("应该处理规则类型场景", () => {
      // 注册不同类型的规则
      const validationRule = new MockBusinessRule(
        "ValidationRule",
        "Validation rule",
        100,
        true,
        "Validation",
      );
      const businessRule = new MockBusinessRule(
        "BusinessRule",
        "Business rule",
        200,
        true,
        "Business",
      );
      const securityRule = new MockBusinessRule(
        "SecurityRule",
        "Security rule",
        300,
        true,
        "Security",
      );

      manager.registerRule(validationRule);
      manager.registerRule(businessRule);
      manager.registerRule(securityRule);

      // 按类型获取规则
      const validationRules = manager.getRulesByType("Validation");
      expect(validationRules).toHaveLength(1);
      expect(validationRules[0].name).toBe("ValidationRule");

      const businessRules = manager.getRulesByType("Business");
      expect(businessRules).toHaveLength(1);
      expect(businessRules[0].name).toBe("BusinessRule");

      const securityRules = manager.getRulesByType("Security");
      expect(securityRules).toHaveLength(1);
      expect(securityRules[0].name).toBe("SecurityRule");
    });
  });

  describe("错误处理和边界情况", () => {
    it("应该处理规则执行错误", () => {
      // 创建一个会抛出错误的规则
      const errorRule = new MockBusinessRule(
        "ErrorRule",
        "Rule that throws error",
      );
      errorRule.validate = () => {
        throw new Error("Rule execution failed");
      };

      manager.registerRule(errorRule);

      const result = manager.validateEntity("test-value", {
        entityType: "Test",
        entityId: "test-123",
      });

      expect(result.isValid).toBe(false);
      expect(result.hasViolations()).toBe(true);
      expect(result.violations[0].message).toContain("Rule execution failed");
    });

    it("应该处理空值验证", () => {
      manager.registerRule(
        new MockBusinessRule("EmailFormatRule", "Validates email format"),
      );

      const result = manager.validateEntity(null, {
        entityType: "User",
        entityId: "user-123",
      });

      // 空值应该通过验证（因为我们的模拟规则只检查字符串）
      expect(result.isValid).toBe(true);
    });

    it("应该处理未注册规则的验证", () => {
      expect(() => {
        manager.validateRule("NonExistentRule", "test-value", {
          entityType: "Test",
          entityId: "test-123",
        });
      }).toThrow("Rule 'NonExistentRule' not found");
    });
  });
});
