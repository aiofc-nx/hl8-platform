/**
 * @fileoverview 协调管理器单元测试
 * @description 测试协调管理器的功能和协调规则执行
 */

import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import { CoordinationManager } from "./coordination-manager.js";
import { CoordinationManagerException } from "../exceptions/coordination-exceptions.js";
import {
  ICoordinationRule,
  ICoordinationContext,
  ICoordinationResult,
} from "./coordination-rule.interface.js";
import {
  ValidationResult,
  ValidationErrorLevel,
} from "../validation/rules/validation-result.interface.js";

// 模拟协调规则类
class MockCoordinationRule implements ICoordinationRule {
  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly description: string,
    public readonly priority: number = 0,
    public readonly enabled: boolean = true,
    public readonly version: string = "1.0.0",
    public readonly createdAt: Date = new Date(),
    public readonly updatedAt: Date = new Date(),
    private shouldSucceed: boolean = true,
    private executionDelay: number = 0,
  ) {}

  async execute(context: ICoordinationContext): Promise<ICoordinationResult> {
    if (this.executionDelay > 0) {
      await new Promise((resolve) => setTimeout(resolve, this.executionDelay));
    }

    return {
      id: `result_${this.id}`,
      ruleId: this.id,
      contextId: context.id,
      success: this.shouldSucceed,
      data: { ruleId: this.id, contextId: context.id },
      message: this.shouldSucceed
        ? "Rule executed successfully"
        : "Rule execution failed",
      startTime: new Date(),
      endTime: new Date(),
      duration: this.executionDelay,
      error: this.shouldSucceed ? undefined : new Error("Mock error"),
      warnings: [],
      metadata: {},
      hasError: () => !this.shouldSucceed,
      hasWarnings: () => false,
      getSummary: () => ({
        status: this.shouldSucceed ? "success" : "failed",
        duration: this.executionDelay,
        errorCount: this.shouldSucceed ? 0 : 1,
        warningCount: 0,
        serviceCount: 0,
        ruleCount: 1,
        successRate: this.shouldSucceed ? 100 : 0,
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
    return context.operationType === "test" || context.operationType === "mock";
  }

  getDependencies(): string[] {
    return [];
  }

  getMetadata() {
    return {
      type: "mock",
      category: "test",
      tags: ["test", "mock"],
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

describe("CoordinationManager", () => {
  let manager: CoordinationManager;
  let mockContext: ICoordinationContext;

  beforeEach(() => {
    manager = new CoordinationManager();
    mockContext = {
      id: "test-context-1",
      operationType: "test",
      operationData: { test: "data" },
      participatingServices: ["Service1", "Service2"],
      startTime: new Date(),
      timeout: 30000,
      priority: 0,
      tags: ["test"],
      metadata: {},
      history: [],
      status: "initialized" as any,
      addHistoryEntry: jest.fn(),
      updateStatus: jest.fn(),
      isTimeout: () => false,
      getRemainingTime: () => 30000,
    };
  });

  describe("registerRule", () => {
    it("应该成功注册协调规则", () => {
      const rule = new MockCoordinationRule(
        "rule-1",
        "Test Rule",
        "A test rule",
      );

      expect(() => {
        manager.registerRule(rule);
      }).not.toThrow();

      expect(manager.getRule("rule-1")).toBe(rule);
    });

    it("应该拒绝注册重复的规则", () => {
      const rule1 = new MockCoordinationRule(
        "rule-1",
        "Test Rule 1",
        "A test rule",
      );
      const rule2 = new MockCoordinationRule(
        "rule-1",
        "Test Rule 2",
        "Another test rule",
      );

      manager.registerRule(rule1);

      expect(() => {
        manager.registerRule(rule2);
      }).toThrow(CoordinationManagerException);
    });

    it("应该拒绝注册无效的规则", () => {
      const invalidRule = {
        ...new MockCoordinationRule("rule-1", "Test Rule", "A test rule"),
        validate: () => ({
          isValid: false,
          errors: [
            {
              message: "Validation failed",
              code: "INVALID",
              level: ValidationErrorLevel.ERROR,
              timestamp: Date.now(),
            } as any,
          ],
          warnings: [],
          info: [],
          executionTime: 0,
          rulesExecuted: 0,
          fieldsValidated: 0,
          hasErrors: () => true,
          hasWarnings: () => false,
          hasInfo: () => false,
          getAllMessages: () => ["Validation failed"],
          getMessagesByLevel: () => [],
          getErrorsForField: () => [],
          getErrorsForRule: () => [],
          merge: () => new MockCoordinationRule("rule-1", "", "").validate(),
          toJSON: () => ({}),
          toString: () => "Invalid",
        }),
      } as unknown as ICoordinationRule;

      expect(() => {
        manager.registerRule(invalidRule);
      }).toThrow(CoordinationManagerException);
    });
  });

  describe("unregisterRule", () => {
    it("应该成功注销协调规则", () => {
      const rule = new MockCoordinationRule(
        "rule-1",
        "Test Rule",
        "A test rule",
      );
      manager.registerRule(rule);

      const removed = manager.unregisterRule("rule-1");

      expect(removed).toBe(true);
      expect(manager.getRule("rule-1")).toBeNull();
    });

    it("应该返回false对于不存在的规则", () => {
      const removed = manager.unregisterRule("non-existent-rule");

      expect(removed).toBe(false);
    });
  });

  describe("getRule", () => {
    it("应该返回已注册的规则", () => {
      const rule = new MockCoordinationRule(
        "rule-1",
        "Test Rule",
        "A test rule",
      );
      manager.registerRule(rule);

      const retrievedRule = manager.getRule("rule-1");

      expect(retrievedRule).toBe(rule);
    });

    it("应该返回null对于未注册的规则", () => {
      const retrievedRule = manager.getRule("non-existent-rule");

      expect(retrievedRule).toBeNull();
    });
  });

  describe("getAllRules", () => {
    it("应该返回所有已注册的规则", () => {
      const rule1 = new MockCoordinationRule(
        "rule-1",
        "Test Rule 1",
        "A test rule",
      );
      const rule2 = new MockCoordinationRule(
        "rule-2",
        "Test Rule 2",
        "Another test rule",
      );

      manager.registerRule(rule1);
      manager.registerRule(rule2);

      const allRules = manager.getAllRules();

      expect(allRules).toHaveLength(2);
      expect(allRules).toContain(rule1);
      expect(allRules).toContain(rule2);
    });

    it("应该返回空数组当没有注册规则时", () => {
      const allRules = manager.getAllRules();

      expect(allRules).toEqual([]);
    });
  });

  describe("executeCoordination", () => {
    it("应该成功执行协调", async () => {
      const rule1 = new MockCoordinationRule(
        "rule-1",
        "Test Rule 1",
        "A test rule",
        1,
      );
      const rule2 = new MockCoordinationRule(
        "rule-2",
        "Test Rule 2",
        "Another test rule",
        2,
      );

      manager.registerRule(rule1);
      manager.registerRule(rule2);

      const results = await manager.executeCoordination(mockContext);

      expect(results).toHaveLength(2);
      expect(results.every((r) => r.success)).toBe(true);
    });

    it("应该按优先级执行规则", async () => {
      const rule1 = new MockCoordinationRule(
        "rule-1",
        "Test Rule 1",
        "A test rule",
        1,
      );
      const rule2 = new MockCoordinationRule(
        "rule-2",
        "Test Rule 2",
        "Another test rule",
        2,
      );

      manager.registerRule(rule1);
      manager.registerRule(rule2);

      const results = await manager.executeCoordination(mockContext);

      expect(results[0].ruleId).toBe("rule-2"); // 优先级高的先执行
      expect(results[1].ruleId).toBe("rule-1");
    });

    it("应该只执行适用的规则", async () => {
      const applicableRule = new MockCoordinationRule(
        "rule-1",
        "Applicable Rule",
        "An applicable rule",
      );
      const nonApplicableRule = {
        ...new MockCoordinationRule(
          "rule-2",
          "Non-Applicable Rule",
          "A non-applicable rule",
        ),
        isApplicable: () => false,
        validate: () => new MockCoordinationRule("rule-2", "", "").validate(),
      } as unknown as ICoordinationRule;

      manager.registerRule(applicableRule);
      manager.registerRule(nonApplicableRule);

      const results = await manager.executeCoordination(mockContext);

      expect(results).toHaveLength(1);
      expect(results[0].ruleId).toBe("rule-1");
    });

    it("应该处理规则执行失败", async () => {
      const failingRule = new MockCoordinationRule(
        "rule-1",
        "Failing Rule",
        "A failing rule",
        0,
        true,
        "1.0.0",
        new Date(),
        new Date(),
        false,
      );

      manager.registerRule(failingRule);

      const results = await manager.executeCoordination(mockContext);

      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(false);
      expect(results[0].hasError()).toBe(true);
    });
  });

  describe("createContext", () => {
    it("应该创建协调上下文构建器", () => {
      const builder = manager.createContext("test", { data: "test" }, [
        "Service1",
      ]);

      expect(builder).toBeDefined();
      expect(typeof builder.build).toBe("function");
    });
  });

  describe("getActiveContext", () => {
    it("应该返回活跃的协调上下文", async () => {
      const rule = new MockCoordinationRule(
        "rule-1",
        "Test Rule",
        "A test rule",
        0,
        true,
        "1.0.0",
        new Date(),
        new Date(),
        true,
        100,
      );
      manager.registerRule(rule);

      const executionPromise = manager.executeCoordination(mockContext);

      // 等待一小段时间让上下文变为活跃状态
      await new Promise((resolve) => setTimeout(resolve, 50));

      const activeContext = manager.getActiveContext(mockContext.id);

      expect(activeContext).toBeDefined();
      expect(activeContext?.id).toBe(mockContext.id);

      // 等待执行完成
      await executionPromise;
    });

    it("应该返回null对于不存在的上下文", () => {
      const activeContext = manager.getActiveContext("non-existent-context");

      expect(activeContext).toBeNull();
    });
  });

  describe("getAllActiveContexts", () => {
    it("应该返回所有活跃的协调上下文", async () => {
      const rule = new MockCoordinationRule(
        "rule-1",
        "Test Rule",
        "A test rule",
        0,
        true,
        "1.0.0",
        new Date(),
        new Date(),
        true,
        100,
      );
      manager.registerRule(rule);

      const executionPromise = manager.executeCoordination(mockContext);

      // 等待一小段时间让上下文变为活跃状态
      await new Promise((resolve) => setTimeout(resolve, 50));

      const activeContexts = manager.getAllActiveContexts();

      expect(activeContexts).toHaveLength(1);
      expect(activeContexts[0].id).toBe(mockContext.id);

      // 等待执行完成
      await executionPromise;
    });
  });

  describe("cancelCoordination", () => {
    it("应该成功取消协调", async () => {
      const rule = new MockCoordinationRule(
        "rule-1",
        "Test Rule",
        "A test rule",
        0,
        true,
        "1.0.0",
        new Date(),
        new Date(),
        true,
        1000,
      );
      manager.registerRule(rule);

      const executionPromise = manager.executeCoordination(mockContext);

      // 等待一小段时间让上下文变为活跃状态
      await new Promise((resolve) => setTimeout(resolve, 50));

      const cancelled = manager.cancelCoordination(mockContext.id);

      expect(cancelled).toBe(true);

      // 等待执行完成
      await executionPromise;
    });

    it("应该返回false对于不存在的上下文", () => {
      const cancelled = manager.cancelCoordination("non-existent-context");

      expect(cancelled).toBe(false);
    });
  });

  describe("getExecutionHistory", () => {
    it("应该返回执行历史", async () => {
      const rule = new MockCoordinationRule(
        "rule-1",
        "Test Rule",
        "A test rule",
      );
      manager.registerRule(rule);

      await manager.executeCoordination(mockContext);

      const history = manager.getExecutionHistory();

      expect(history).toHaveLength(1);
      expect(history[0].contextId).toBe(mockContext.id);
      expect(history[0].operationType).toBe(mockContext.operationType);
    });

    it("应该按上下文ID过滤执行历史", async () => {
      const rule = new MockCoordinationRule(
        "rule-1",
        "Test Rule",
        "A test rule",
      );
      manager.registerRule(rule);

      await manager.executeCoordination(mockContext);

      const history = manager.getExecutionHistory(mockContext.id);

      expect(history).toHaveLength(1);
      expect(history[0].contextId).toBe(mockContext.id);
    });
  });

  describe("getCoordinationStats", () => {
    it("应该返回协调统计信息", async () => {
      const rule = new MockCoordinationRule(
        "rule-1",
        "Test Rule",
        "A test rule",
      );
      manager.registerRule(rule);

      await manager.executeCoordination(mockContext);

      const stats = manager.getCoordinationStats();

      expect(stats.totalRules).toBe(1);
      expect(stats.activeContexts).toBe(0);
      expect(stats.totalExecutions).toBe(1);
      expect(stats.successfulExecutions).toBe(1);
      expect(stats.failedExecutions).toBe(0);
      expect(stats.successRate).toBe(100);
    });
  });
});
