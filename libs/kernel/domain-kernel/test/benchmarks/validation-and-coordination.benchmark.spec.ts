/**
 * @fileoverview 验证和协调性能基准测试
 * @description 测试业务规则验证和领域服务协调的性能指标
 */

import { describe, it, expect, beforeEach } from "@jest/globals";
import { EntityId } from "../../src/identifiers/entity-id.js";
import { AggregateRoot } from "../../src/aggregates/base/aggregate-root.base.js";
import { EntityLifecycle } from "../../src/entities/base/entity-lifecycle.enum.js";
import { AuditInfo } from "../../src/audit/audit-info.js";
import { BusinessRuleManager } from "../../src/business-rules/business-rule-manager.js";
import { CoordinationManager } from "../../src/coordination/coordination-manager.js";
import {
  ICoordinationRule,
  ICoordinationContext,
  ICoordinationResult,
} from "../../src/coordination/coordination-rule.interface.js";
import {
  BusinessRule,
  BusinessRuleSeverity,
  BusinessRuleType,
} from "../../src/business-rules/business-rule.interface.js";
import { BusinessRuleValidationResult } from "../../src/business-rules/business-rule-validation-result.js";
import { BusinessRuleViolation } from "../../src/business-rules/business-rule-violation.js";
import { ValidationResult } from "../../src/validation/rules/validation-result.interface.js";

// 测试用的聚合根
class TestAggregateRoot extends AggregateRoot {
  private _name: string = "";
  private _email: string = "";
  private _age: number = 0;

  constructor(
    id?: EntityId,
    auditInfo?: AuditInfo,
    lifecycleState: EntityLifecycle = EntityLifecycle.CREATED,
    version: number = 1,
  ) {
    super(id, auditInfo, lifecycleState, version);
  }

  public get name(): string {
    return this._name;
  }

  public set name(value: string) {
    this._name = value;
  }

  public get email(): string {
    return this._email;
  }

  public set email(value: string) {
    this._email = value;
  }

  public get age(): number {
    return this._age;
  }

  public set age(value: number) {
    this._age = value;
  }

  protected performCoordination(operation: string, params: unknown): unknown {
    return { success: true };
  }

  protected performBusinessInvariantValidation(): boolean {
    return this._name.length > 0 && this._email.length > 0 && this._age >= 0;
  }

  public validateBusinessRules(): boolean {
    return (
      this._name.length > 0 && this._email.includes("@") && this._age >= 18
    );
  }

  public executeBusinessLogic(operation: string, params: unknown): unknown {
    return this.performCoordination(operation, params);
  }

  public clone(): TestAggregateRoot {
    const cloned = new TestAggregateRoot(
      this.id.clone(),
      this.auditInfo.clone(),
      this.lifecycleState,
      this.version,
    );
    cloned.name = this._name;
    cloned.email = this._email;
    cloned.age = this._age;
    return cloned;
  }
}

// 简单的业务规则实现
class SimpleBusinessRule implements BusinessRule<TestAggregateRoot> {
  constructor(
    public readonly name: string,
    public readonly description: string,
    public readonly priority: number = 100,
    public readonly enabled: boolean = true,
    public readonly type: BusinessRuleType = BusinessRuleType.BUSINESS_LOGIC,
    public readonly severity: BusinessRuleSeverity = BusinessRuleSeverity.ERROR,
  ) {}

  public enable(): void {
    (this as any).enabled = true;
  }

  public disable(): void {
    (this as any).enabled = false;
  }

  public validate(entity: TestAggregateRoot): BusinessRuleValidationResult {
    if (!this.enabled) {
      return BusinessRuleValidationResult.success(
        "TestAggregateRoot",
        entity.id.value,
      );
    }

    const violations: BusinessRuleViolation[] = [];

    if (this.name === "EmailFormatRule") {
      if (!entity.email || !entity.email.includes("@")) {
        violations.push(
          BusinessRuleViolation.error(
            "无效邮箱格式",
            "INVALID_EMAIL",
            this.name,
          ),
        );
      }
    }

    if (this.name === "AgeValidationRule") {
      if (entity.age < 18) {
        violations.push(
          BusinessRuleViolation.error(
            "年龄必须至少18岁",
            "INVALID_AGE",
            this.name,
          ),
        );
      }
    }

    if (violations.length > 0) {
      return BusinessRuleValidationResult.failure(
        "TestAggregateRoot",
        entity.id.value,
        violations,
      );
    }

    return BusinessRuleValidationResult.success(
      "TestAggregateRoot",
      entity.id.value,
    );
  }

  public isApplicable(entity: unknown): boolean {
    return entity instanceof TestAggregateRoot;
  }

  public getDependencies(): string[] {
    return [];
  }

  public createViolation(
    message: string,
    code: string = "BUSINESS_RULE_VIOLATION",
    details?: Record<string, unknown>,
  ): BusinessRuleViolation {
    return BusinessRuleViolation.error(message, code, this.name);
  }

  public conflictsWith(_other: BusinessRule<TestAggregateRoot>): boolean {
    return false;
  }
}

// 简单的协调规则实现
class SimpleCoordinationRule implements ICoordinationRule {
  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly description: string,
    public readonly priority: number = 0,
    public readonly enabled: boolean = true,
    public readonly version: string = "1.0.0",
    public readonly createdAt: Date = new Date(),
    public readonly updatedAt: Date = new Date(),
  ) {}

  async execute(context: ICoordinationContext): Promise<ICoordinationResult> {
    const startTime = new Date();
    const endTime = new Date();

    return {
      id: `result_${this.id}`,
      ruleId: this.id,
      contextId: context.id,
      success: true,
      data: {},
      message: "规则执行成功",
      startTime,
      endTime,
      duration: endTime.getTime() - startTime.getTime(),
      warnings: [],
      metadata: {},
      hasError: () => false,
      hasWarnings: () => false,
      getSummary: () => ({
        status: "success",
        duration: 0,
        errorCount: 0,
        warningCount: 0,
        serviceCount: 0,
        ruleCount: 1,
        successRate: 100,
      }),
    };
  }

  validate(): ValidationResult {
    return {
      isValid: true,
      errors: [],
      warnings: [],
      info: [],
      executionTime: 0,
      rulesExecuted: 0,
      fieldsValidated: 0,
      hasErrors: () => false,
      hasWarnings: () => false,
      hasInfo: () => false,
      getAllMessages: () => [],
      getMessagesByLevel: () => [],
      getErrorsForField: () => [],
      getErrorsForRule: () => [],
      merge: () => this.validate(),
      toJSON: () => ({
        isValid: true,
        errorCount: 0,
        warningCount: 0,
        infoCount: 0,
        executionTime: 0,
        rulesExecuted: 0,
        fieldsValidated: 0,
        errors: [],
        warnings: [],
        info: [],
      }),
      toString: () => "ValidationResult: 0 errors, 0 warnings",
    };
  }

  isApplicable(context: ICoordinationContext): boolean {
    return true;
  }

  getDependencies(): string[] {
    return [];
  }

  getMetadata() {
    return {
      type: "test",
      category: "benchmark",
      tags: ["test", "benchmark"],
      author: "test",
      maintainer: "test",
      examples: [],
      configuration: {},
      constraints: {
        maxExecutionTime: 5000,
        maxRetries: 3,
        retryInterval: 1000,
        concurrencyLimit: 1,
        resourceLimits: {},
        dependencyConstraints: [],
      },
    };
  }
}

describe("验证和协调性能基准测试", () => {
  let businessRuleManager: BusinessRuleManager<any>;
  let coordinationManager: CoordinationManager;
  let aggregateId: EntityId;
  let auditInfo: AuditInfo;

  beforeEach(() => {
    businessRuleManager = new BusinessRuleManager<any>();
    coordinationManager = new CoordinationManager();
    aggregateId = new EntityId();
    auditInfo = AuditInfo.create(aggregateId);
  });

  describe("业务规则验证性能", () => {
    it("应该快速验证单个实体（目标：<10ms）", () => {
      // 注册规则
      businessRuleManager.registerRule(
        new SimpleBusinessRule("EmailFormatRule", "验证邮箱格式") as any,
      );
      businessRuleManager.registerRule(
        new SimpleBusinessRule("AgeValidationRule", "验证年龄") as any,
      );

      // 创建测试实体
      const aggregate = new TestAggregateRoot(aggregateId, auditInfo);
      aggregate.name = "Test User";
      aggregate.email = "test@example.com";
      aggregate.age = 25;

      // 执行验证并测量时间
      const startTime = Date.now();
      const result = businessRuleManager.validateEntity(aggregate, {
        entityType: "TestAggregateRoot",
        entityId: aggregate.id.value,
      });
      const endTime = Date.now();
      const duration = endTime - startTime;

      // 验证结果
      expect(result.isValid).toBe(true);
      expect(duration).toBeLessThan(10); // 应该在10ms内完成

      console.log(`✅ 单个实体验证耗时: ${duration}ms (目标: <10ms)`);
    });

    it("应该高效验证大量实体（100个实体，目标：<100ms）", () => {
      // 注册规则
      businessRuleManager.registerRule(
        new SimpleBusinessRule("EmailFormatRule", "验证邮箱格式") as any,
      );
      businessRuleManager.registerRule(
        new SimpleBusinessRule("AgeValidationRule", "验证年龄") as any,
      );

      // 创建100个测试实体
      const aggregates: TestAggregateRoot[] = [];
      for (let i = 0; i < 100; i++) {
        const aggregate = new TestAggregateRoot(new EntityId(), auditInfo);
        aggregate.name = `User ${i}`;
        aggregate.email = `user${i}@example.com`;
        aggregate.age = 20 + (i % 30);
        aggregates.push(aggregate);
      }

      // 执行批量验证
      const startTime = Date.now();
      const results = aggregates.map((agg) =>
        businessRuleManager.validateEntity(agg, {
          entityType: "TestAggregateRoot",
          entityId: agg.id.value,
        }),
      );
      const endTime = Date.now();
      const duration = endTime - startTime;

      // 验证结果
      expect(results.length).toBe(100);
      expect(results.every((r) => r.isValid)).toBe(true);
      expect(duration).toBeLessThan(100); // 应该在100ms内完成

      console.log(
        `✅ 100个实体验证耗时: ${duration}ms (目标: <100ms, 平均: ${(duration / 100).toFixed(2)}ms/实体)`,
      );
    });

    it("应该高效处理大量规则（50个规则，目标：<50ms）", () => {
      // 注册50个规则
      for (let i = 0; i < 50; i++) {
        businessRuleManager.registerRule(
          new SimpleBusinessRule(`Rule${i}`, `规则 ${i}`, 100 + i) as any,
        );
      }

      // 创建测试实体
      const aggregate = new TestAggregateRoot(aggregateId, auditInfo);
      aggregate.name = "Test User";
      aggregate.email = "test@example.com";
      aggregate.age = 25;

      // 执行验证
      const startTime = Date.now();
      const result = businessRuleManager.validateEntity(aggregate, {
        entityType: "TestAggregateRoot",
        entityId: aggregate.id.value,
      });
      const endTime = Date.now();
      const duration = endTime - startTime;

      // 验证结果
      expect(result.isValid).toBe(true);
      expect(duration).toBeLessThan(50); // 应该在50ms内完成

      console.log(
        `✅ 50个规则验证耗时: ${duration}ms (目标: <50ms, 平均: ${(duration / 50).toFixed(2)}ms/规则)`,
      );
    });

    it("应该高效处理并发验证（10个并发，目标：<50ms）", async () => {
      // 注册规则
      businessRuleManager.registerRule(
        new SimpleBusinessRule("EmailFormatRule", "验证邮箱格式") as any,
      );

      // 创建10个测试实体
      const aggregates: TestAggregateRoot[] = [];
      for (let i = 0; i < 10; i++) {
        const aggregate = new TestAggregateRoot(new EntityId(), auditInfo);
        aggregate.name = `User ${i}`;
        aggregate.email = `user${i}@example.com`;
        aggregate.age = 25;
        aggregates.push(aggregate);
      }

      // 并发执行验证
      const startTime = Date.now();
      const results = await Promise.all(
        aggregates.map((agg) =>
          Promise.resolve(
            businessRuleManager.validateEntity(agg, {
              entityType: "TestAggregateRoot",
              entityId: agg.id.value,
            }),
          ),
        ),
      );
      const endTime = Date.now();
      const duration = endTime - startTime;

      // 验证结果
      expect(results.length).toBe(10);
      expect(results.every((r) => r.isValid)).toBe(true);
      expect(duration).toBeLessThan(50); // 应该在50ms内完成

      console.log(
        `✅ 10个并发验证耗时: ${duration}ms (目标: <50ms, 平均: ${(duration / 10).toFixed(2)}ms/实体)`,
      );
    });
  });

  describe("领域服务协调性能", () => {
    it("应该快速执行单个协调规则（目标：<5ms）", async () => {
      // 注册协调规则
      const rule = new SimpleCoordinationRule(
        "rule-1",
        "Test Rule",
        "A test rule",
      );
      coordinationManager.registerRule(rule);

      // 创建协调上下文
      const context = coordinationManager
        .createContext("test-operation", { data: "test" }, ["Service1"])
        .build();

      // 执行协调并测量时间
      const startTime = Date.now();
      const results = await coordinationManager.executeCoordination(context);
      const endTime = Date.now();
      const duration = endTime - startTime;

      // 验证结果
      expect(results.length).toBe(1);
      expect(results[0].success).toBe(true);
      expect(duration).toBeLessThan(5); // 应该在5ms内完成

      console.log(`✅ 单个协调规则执行耗时: ${duration}ms (目标: <5ms)`);
    });

    it("应该高效执行多个协调规则（20个规则，目标：<100ms）", async () => {
      // 注册20个协调规则
      for (let i = 0; i < 20; i++) {
        const rule = new SimpleCoordinationRule(
          `rule-${i}`,
          `Rule ${i}`,
          `A test rule ${i}`,
          i,
        );
        coordinationManager.registerRule(rule);
      }

      // 创建协调上下文
      const context = coordinationManager
        .createContext("test-operation", { data: "test" }, ["Service1"])
        .build();

      // 执行协调
      const startTime = Date.now();
      const results = await coordinationManager.executeCoordination(context);
      const endTime = Date.now();
      const duration = endTime - startTime;

      // 验证结果
      expect(results.length).toBe(20);
      expect(results.every((r) => r.success)).toBe(true);
      expect(duration).toBeLessThan(100); // 应该在100ms内完成

      console.log(
        `✅ 20个协调规则执行耗时: ${duration}ms (目标: <100ms, 平均: ${(duration / 20).toFixed(2)}ms/规则)`,
      );
    });

    it("应该高效处理并发协调（5个并发，目标：<30ms）", async () => {
      // 注册规则
      const rule = new SimpleCoordinationRule(
        "rule-1",
        "Test Rule",
        "A test rule",
      );
      coordinationManager.registerRule(rule);

      // 创建5个协调上下文
      const contexts = [];
      for (let i = 0; i < 5; i++) {
        const context = coordinationManager
          .createContext(`operation-${i}`, { data: `test-${i}` }, [
            `Service${i}`,
          ])
          .build();
        contexts.push(context);
      }

      // 并发执行协调
      const startTime = Date.now();
      const results = await Promise.all(
        contexts.map((ctx) => coordinationManager.executeCoordination(ctx)),
      );
      const endTime = Date.now();
      const duration = endTime - startTime;

      // 验证结果
      expect(results.length).toBe(5);
      expect(results.every((r) => r.length === 1 && r[0].success)).toBe(true);
      expect(duration).toBeLessThan(30); // 应该在30ms内完成

      console.log(
        `✅ 5个并发协调耗时: ${duration}ms (目标: <30ms, 平均: ${(duration / 5).toFixed(2)}ms/协调)`,
      );
    });

    it("应该高效处理复杂协调场景（多服务、多规则，目标：<200ms）", async () => {
      // 注册多个规则
      const services = ["UserService", "EmailService", "NotificationService"];
      for (let i = 0; i < 10; i++) {
        const rule = new SimpleCoordinationRule(
          `rule-${i}`,
          `Rule ${i}`,
          `A test rule ${i}`,
          i % 3,
        );
        coordinationManager.registerRule(rule);
      }

      // 创建包含多个服务的协调上下文
      const context = coordinationManager
        .createContext("complex-operation", { userId: "123" }, services)
        .build();

      // 执行协调
      const startTime = Date.now();
      const results = await coordinationManager.executeCoordination(context);
      const endTime = Date.now();
      const duration = endTime - startTime;

      // 验证结果
      expect(results.length).toBe(10);
      expect(results.every((r) => r.success)).toBe(true);
      expect(duration).toBeLessThan(200); // 应该在200ms内完成

      console.log(
        `✅ 复杂协调场景耗时: ${duration}ms (目标: <200ms, 10个规则, 3个服务)`,
      );
    });
  });

  describe("综合性能测试", () => {
    it("应该高效处理完整的业务流程：验证 → 协调（目标：<50ms）", async () => {
      // 设置业务规则验证
      businessRuleManager.registerRule(
        new SimpleBusinessRule("EmailFormatRule", "验证邮箱格式") as any,
      );

      // 设置协调规则
      const rule = new SimpleCoordinationRule(
        "rule-1",
        "Test Rule",
        "A test rule",
      );
      coordinationManager.registerRule(rule);

      // 创建聚合根
      const aggregate = new TestAggregateRoot(aggregateId, auditInfo);
      aggregate.name = "Test User";
      aggregate.email = "test@example.com";
      aggregate.age = 25;

      // 执行完整流程
      const startTime = Date.now();

      // 1. 业务规则验证
      const validationResult = businessRuleManager.validateEntity(aggregate, {
        entityType: "TestAggregateRoot",
        entityId: aggregate.id.value,
      });

      // 2. 协调执行
      const context = coordinationManager
        .createContext("test-operation", { data: "test" }, ["Service1"])
        .build();
      const coordinationResults =
        await coordinationManager.executeCoordination(context);

      const endTime = Date.now();
      const duration = endTime - startTime;

      // 验证结果
      expect(validationResult.isValid).toBe(true);
      expect(coordinationResults.length).toBe(1);
      expect(coordinationResults[0].success).toBe(true);
      expect(duration).toBeLessThan(50); // 应该在50ms内完成

      console.log(
        `✅ 完整业务流程耗时: ${duration}ms (目标: <50ms, 验证 + 协调)`,
      );
    });

    it("应该高效处理大量聚合根的完整流程（50个聚合根，目标：<500ms）", async () => {
      // 设置业务规则验证
      businessRuleManager.registerRule(
        new SimpleBusinessRule("EmailFormatRule", "验证邮箱格式") as any,
      );

      // 设置协调规则
      const rule = new SimpleCoordinationRule(
        "rule-1",
        "Test Rule",
        "A test rule",
      );
      coordinationManager.registerRule(rule);

      // 创建50个聚合根
      const aggregates: TestAggregateRoot[] = [];
      for (let i = 0; i < 50; i++) {
        const aggregate = new TestAggregateRoot(new EntityId(), auditInfo);
        aggregate.name = `User ${i}`;
        aggregate.email = `user${i}@example.com`;
        aggregate.age = 25;
        aggregates.push(aggregate);
      }

      // 执行完整流程
      const startTime = Date.now();

      // 验证所有聚合根
      const validationResults = aggregates.map((agg) =>
        businessRuleManager.validateEntity(agg, {
          entityType: "TestAggregateRoot",
          entityId: agg.id.value,
        }),
      );

      // 为每个聚合根执行协调
      const coordinationPromises = aggregates.map(async (agg) => {
        const context = coordinationManager
          .createContext("test-operation", { aggregateId: agg.id.value }, [
            "Service1",
          ])
          .build();
        return coordinationManager.executeCoordination(context);
      });
      const coordinationResults = await Promise.all(coordinationPromises);

      const endTime = Date.now();
      const duration = endTime - startTime;

      // 验证结果
      expect(validationResults.length).toBe(50);
      expect(validationResults.every((r) => r.isValid)).toBe(true);
      expect(coordinationResults.length).toBe(50);
      expect(
        coordinationResults.every((r) => r.length === 1 && r[0].success),
      ).toBe(true);
      expect(duration).toBeLessThan(500); // 应该在500ms内完成

      console.log(
        `✅ 50个聚合根完整流程耗时: ${duration}ms (目标: <500ms, 平均: ${(duration / 50).toFixed(2)}ms/聚合根)`,
      );
    });
  });
});
