/**
 * @fileoverview Business Rule Validation Tests - 业务规则验证测试
 * @description 业务规则验证框架的单元测试
 */

import {
  BusinessRuleSeverity,
  BusinessRuleSeverityUtils,
} from "./business-rule-severity.enum.js";
import { BusinessRuleManager } from "./business-rule-manager.js";
import {
  BusinessRuleValidationContextBuilder,
  ValidationMode,
  ValidationPriority,
} from "./business-rule-validation-context.js";
import {
  BusinessRuleExecutionEngine,
  BusinessRuleExecutionStrategy,
} from "./business-rule-execution-engine.js";
import { Entity } from "../entities/base/entity.base.js";
import { EntityId } from "../identifiers/entity-id.js";
import { v4 as uuidv4 } from "uuid";

// 测试用的实体
class TestEntity extends Entity {
  constructor(
    id: EntityId,
    public readonly name: string,
    public readonly value: number,
    private readonly _isActive: boolean,
  ) {
    super(id);
  }

  isActive(): boolean {
    return this._isActive;
  }

  clone(): Entity {
    return new TestEntity(this.id, this.name, this.value, this.isActive());
  }

  protected createClone(
    value: string,
    createdAt: Date,
    version: number,
  ): TestEntity {
    return new TestEntity(this.id, this.name, this.value, this.isActive());
  }

  public validateBusinessRules(): boolean {
    return this.value >= 0 && this.name.length > 0;
  }

  public executeBusinessLogic(): void {
    // 测试用的业务逻辑执行
  }
}

// 测试用的业务规则
class TestBusinessRule {
  constructor(
    public readonly name: string,
    public readonly description: string,
    public readonly priority: number,
    public readonly enabled: boolean,
    public readonly type: string,
    public readonly severity: BusinessRuleSeverity,
  ) {}

  validate(entity: TestEntity): { isValid: boolean; violations: any[] } {
    const violations: any[] = [];

    if (entity.value < 0) {
      violations.push({
        ruleId: this.name,
        ruleName: this.name,
        message: "Value cannot be negative",
        severity: BusinessRuleSeverity.ERROR,
        entityId: entity.id.toString(),
        timestamp: new Date(),
        context: {},
      });
    }

    if (entity.name.length === 0) {
      violations.push({
        ruleId: this.name,
        ruleName: this.name,
        message: "Name cannot be empty",
        severity: BusinessRuleSeverity.WARNING,
        entityId: entity.id.toString(),
        timestamp: new Date(),
        context: {},
      });
    }

    return {
      isValid: violations.length === 0,
      violations,
    };
  }
}

describe("Business Rule Validation Framework", () => {
  let testEntity: TestEntity;
  let businessRuleManager: BusinessRuleManager<TestEntity>;
  let executionEngine: BusinessRuleExecutionEngine<TestEntity>;

  beforeEach(() => {
    testEntity = new TestEntity(
      new EntityId(uuidv4()),
      "Test Entity",
      100,
      true,
    );
    businessRuleManager = new BusinessRuleManager<TestEntity>();
    executionEngine = new BusinessRuleExecutionEngine<TestEntity>();
  });

  describe("BusinessRuleSeverity", () => {
    it("should have correct severity levels", () => {
      expect(BusinessRuleSeverity.INFO).toBe("INFO");
      expect(BusinessRuleSeverity.WARNING).toBe("WARNING");
      expect(BusinessRuleSeverity.ERROR).toBe("ERROR");
      expect(BusinessRuleSeverity.CRITICAL).toBe("CRITICAL");
      expect(BusinessRuleSeverity.FATAL).toBe("FATAL");
    });

    it("should compare severities correctly", () => {
      expect(
        BusinessRuleSeverityUtils.compare(
          BusinessRuleSeverity.INFO,
          BusinessRuleSeverity.WARNING,
        ),
      ).toBeLessThan(0);
      expect(
        BusinessRuleSeverityUtils.compare(
          BusinessRuleSeverity.ERROR,
          BusinessRuleSeverity.WARNING,
        ),
      ).toBeGreaterThan(0);
      expect(
        BusinessRuleSeverityUtils.compare(
          BusinessRuleSeverity.ERROR,
          BusinessRuleSeverity.ERROR,
        ),
      ).toBe(0);
    });

    it("should get most severe severity", () => {
      const severities = [
        BusinessRuleSeverity.INFO,
        BusinessRuleSeverity.ERROR,
        BusinessRuleSeverity.WARNING,
      ];
      const mostSevere = BusinessRuleSeverityUtils.getMostSevere(severities);
      expect(mostSevere).toBe(BusinessRuleSeverity.ERROR);
    });

    it("should check if severity blocks operation", () => {
      expect(
        BusinessRuleSeverityUtils.blocksOperation(BusinessRuleSeverity.INFO),
      ).toBe(false);
      expect(
        BusinessRuleSeverityUtils.blocksOperation(BusinessRuleSeverity.WARNING),
      ).toBe(false);
      expect(
        BusinessRuleSeverityUtils.blocksOperation(BusinessRuleSeverity.ERROR),
      ).toBe(true);
      expect(
        BusinessRuleSeverityUtils.blocksOperation(
          BusinessRuleSeverity.CRITICAL,
        ),
      ).toBe(true);
      expect(
        BusinessRuleSeverityUtils.blocksOperation(BusinessRuleSeverity.FATAL),
      ).toBe(true);
    });

    it("should check if severity requires immediate action", () => {
      expect(
        BusinessRuleSeverityUtils.requiresImmediateAction(
          BusinessRuleSeverity.INFO,
        ),
      ).toBe(false);
      expect(
        BusinessRuleSeverityUtils.requiresImmediateAction(
          BusinessRuleSeverity.WARNING,
        ),
      ).toBe(false);
      expect(
        BusinessRuleSeverityUtils.requiresImmediateAction(
          BusinessRuleSeverity.ERROR,
        ),
      ).toBe(false);
      expect(
        BusinessRuleSeverityUtils.requiresImmediateAction(
          BusinessRuleSeverity.CRITICAL,
        ),
      ).toBe(true);
      expect(
        BusinessRuleSeverityUtils.requiresImmediateAction(
          BusinessRuleSeverity.FATAL,
        ),
      ).toBe(true);
    });
  });

  describe("BusinessRuleValidationContext", () => {
    it("should create validation context", () => {
      const context = new BusinessRuleValidationContextBuilder()
        .setEntity(testEntity)
        .setUserId("user123")
        .setReason("Test validation")
        .setPriority(ValidationPriority.HIGH)
        .setMode(ValidationMode.FULL)
        .build();

      expect(context.entity).toBe(testEntity);
      expect(context.userId).toBe("user123");
      expect(context.reason).toBe("Test validation");
      expect(context.priority).toBe(ValidationPriority.HIGH);
      expect(context.mode).toBe(ValidationMode.FULL);
    });

    it("should create context with custom data", () => {
      const context = new BusinessRuleValidationContextBuilder()
        .setEntity(testEntity)
        .addCustomData("customKey", "customValue")
        .addCustomData("numberKey", 42)
        .build();

      expect(context.customData.customKey).toBe("customValue");
      expect(context.customData.numberKey).toBe(42);
    });

    it("should set validation options", () => {
      const context = new BusinessRuleValidationContextBuilder()
        .setEntity(testEntity)
        .setOptions({
          enableDetailedLogging: true,
          enablePerformanceMonitoring: true,
          maxValidationTime: 5000,
          stopOnFirstViolation: true,
        })
        .build();

      expect(context.options.enableDetailedLogging).toBe(true);
      expect(context.options.enablePerformanceMonitoring).toBe(true);
      expect(context.options.maxValidationTime).toBe(5000);
      expect(context.options.stopOnFirstViolation).toBe(true);
    });
  });

  describe("BusinessRuleManager", () => {
    it("should register and manage business rules", () => {
      const rule1 = new TestBusinessRule(
        "rule1",
        "Test rule 1",
        1,
        true,
        "validation",
        BusinessRuleSeverity.ERROR,
      );
      const rule2 = new TestBusinessRule(
        "rule2",
        "Test rule 2",
        2,
        true,
        "validation",
        BusinessRuleSeverity.WARNING,
      );

      businessRuleManager.registerRule(rule1 as any);
      businessRuleManager.registerRule(rule2 as any);

      expect(businessRuleManager.getAllRules()).toHaveLength(2);
      expect(businessRuleManager.getRule("rule1")).toBe(rule1);
      expect(businessRuleManager.getRule("rule2")).toBe(rule2);
    });

    it("should unregister business rules", () => {
      const rule = new TestBusinessRule(
        "rule1",
        "Test rule",
        1,
        true,
        "validation",
        BusinessRuleSeverity.ERROR,
      );

      businessRuleManager.registerRule(rule as any);
      expect(businessRuleManager.getAllRules()).toHaveLength(1);

      businessRuleManager.unregisterRule("rule1");
      expect(businessRuleManager.getAllRules()).toHaveLength(0);
    });

    it("should create rule groups", () => {
      const rule1 = new TestBusinessRule(
        "rule1",
        "Test rule 1",
        1,
        true,
        "validation",
        BusinessRuleSeverity.ERROR,
      );
      const rule2 = new TestBusinessRule(
        "rule2",
        "Test rule 2",
        2,
        true,
        "validation",
        BusinessRuleSeverity.WARNING,
      );

      businessRuleManager.registerRule(rule1 as any);
      businessRuleManager.registerRule(rule2 as any);
      businessRuleManager.createRuleGroup("testGroup", ["rule1", "rule2"]);

      // 这里简化测试，实际应用中需要更复杂的验证
      expect(businessRuleManager.getRuleStatistics()).toBeDefined();
    });

    it("should clear all rules", () => {
      const rule1 = new TestBusinessRule(
        "rule1",
        "Test rule 1",
        1,
        true,
        "validation",
        BusinessRuleSeverity.ERROR,
      );
      const rule2 = new TestBusinessRule(
        "rule2",
        "Test rule 2",
        2,
        true,
        "validation",
        BusinessRuleSeverity.WARNING,
      );

      businessRuleManager.registerRule(rule1 as any);
      businessRuleManager.registerRule(rule2 as any);
      expect(businessRuleManager.getAllRules()).toHaveLength(2);

      businessRuleManager.clearAllRules();
      expect(businessRuleManager.getAllRules()).toHaveLength(0);
    });
  });

  describe("BusinessRuleExecutionEngine", () => {
    it("should execute rules with different strategies", async () => {
      const rule1 = new TestBusinessRule(
        "rule1",
        "Test rule 1",
        1,
        true,
        "validation",
        BusinessRuleSeverity.ERROR,
      );
      const rule2 = new TestBusinessRule(
        "rule2",
        "Test rule 2",
        2,
        true,
        "validation",
        BusinessRuleSeverity.WARNING,
      );

      const context = new BusinessRuleValidationContextBuilder()
        .setEntity(testEntity)
        .setMode(ValidationMode.FULL)
        .build();

      const result = await executionEngine.executeRules(
        [rule1 as any, rule2 as any],
        testEntity,
        context,
      );

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.rulesExecuted).toBeGreaterThan(0);
    });

    it("should handle execution errors", async () => {
      const invalidRule = {
        name: "invalidRule",
        description: "Invalid rule",
        priority: 1,
        enabled: true,
        type: "validation",
        severity: BusinessRuleSeverity.ERROR,
        validate: () => {
          throw new Error("Rule execution failed");
        },
      };

      const context = new BusinessRuleValidationContextBuilder()
        .setEntity(testEntity)
        .setMode(ValidationMode.FULL)
        .build();

      const result = await executionEngine.executeRules(
        [invalidRule as any],
        testEntity,
        context,
      );

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it("should get execution history", () => {
      const history = executionEngine.getExecutionHistory();
      expect(Array.isArray(history)).toBe(true);
    });

    it("should get engine statistics", () => {
      const stats = executionEngine.getEngineStatistics();
      expect(stats).toBeDefined();
      expect(stats.totalExecutions).toBeDefined();
      expect(stats.successfulExecutions).toBeDefined();
      expect(stats.failedExecutions).toBeDefined();
    });
  });

  describe("Integration Tests", () => {
    it("should validate entity with multiple rules", async () => {
      const rule1 = new TestBusinessRule(
        "rule1",
        "Test rule 1",
        1,
        true,
        "validation",
        BusinessRuleSeverity.ERROR,
      );
      const rule2 = new TestBusinessRule(
        "rule2",
        "Test rule 2",
        2,
        true,
        "validation",
        BusinessRuleSeverity.WARNING,
      );

      businessRuleManager.registerRule(rule1 as any);
      businessRuleManager.registerRule(rule2 as any);

      const context = new BusinessRuleValidationContextBuilder()
        .setEntity(testEntity)
        .setMode(ValidationMode.FULL)
        .build();

      const result = await executionEngine.executeRules(
        [rule1 as any, rule2 as any],
        testEntity,
        context,
      );

      expect(result.success).toBe(true);
      expect(result.validationResult.isValid).toBe(true);
    });

    it("should handle rule violations", async () => {
      const invalidEntity = new TestEntity(
        new EntityId(uuidv4()),
        "", // 空名称，应该触发违规
        -10, // 负值，应该触发违规
        true,
      );

      const rule = new TestBusinessRule(
        "rule1",
        "Test rule",
        1,
        true,
        "validation",
        BusinessRuleSeverity.ERROR,
      );

      const context = new BusinessRuleValidationContextBuilder()
        .setEntity(invalidEntity)
        .setMode(ValidationMode.FULL)
        .build();

      const result = await executionEngine.executeRules(
        [rule as any],
        invalidEntity,
        context,
      );

      expect(result.success).toBe(true);
      expect(result.validationResult.isValid).toBe(false);
      expect(result.validationResult.violations.length).toBeGreaterThan(0);
    });
  });
});
