/**
 * @fileoverview 操作管理器单元测试
 * @description 测试操作管理器的功能和业务操作执行
 */
import {
  OperationManager,
  OperationManagerException,
} from "./operation-manager.js";
import {
  IBusinessOperation,
  OperationParameters,
  OperationResult,
  BusinessOperationType,
  OperationStatus,
  ValidationResult,
} from "./business-operation.interface.js";
import { ValidationErrorLevel } from "../validation/rules/validation-result.interface.js";

// 模拟聚合根类
class MockAggregate {
  constructor(
    public id: string,
    public name: string,
  ) {}
}

// 模拟业务操作类
class MockBusinessOperation implements IBusinessOperation<MockAggregate> {
  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly description: string,
    public readonly operationType: BusinessOperationType,
    public readonly priority: number = 0,
    public readonly enabled: boolean = true,
    public readonly version: string = "1.0.0",
    public readonly createdAt: Date = new Date(),
    public readonly updatedAt: Date = new Date(),
    private shouldSucceed: boolean = true,
  ) {}

  async execute(
    aggregate: MockAggregate,
    parameters: OperationParameters,
    context: any,
  ): Promise<OperationResult> {
    return {
      id: `result_${this.id}`,
      operationId: this.id,
      contextId: context.id,
      success: this.shouldSucceed,
      data: { aggregateId: aggregate.id, parameters },
      message: this.shouldSucceed
        ? "Operation executed successfully"
        : "Operation execution failed",
      events: [],
      startTime: new Date(),
      endTime: new Date(),
      duration: 0,
      error: this.shouldSucceed ? undefined : new Error("Mock error"),
      warnings: [],
      metadata: {},
      hasError: () => !this.shouldSucceed,
      hasWarnings: () => false,
      hasEvents: () => false,
      getSummary: () => ({
        status: this.shouldSucceed ? "success" : "failed",
        duration: 0,
        errorCount: this.shouldSucceed ? 0 : 1,
        warningCount: 0,
        eventCount: 0,
        operationType: this.operationType,
      }),
    };
  }

  validateParameters(
    parameters: OperationParameters,
    aggregate: MockAggregate,
  ): ValidationResult {
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
      merge: () => this.validateParameters(parameters, aggregate),
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

  checkPreconditions(
    aggregate: MockAggregate,
    parameters: OperationParameters,
  ): ValidationResult {
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
      merge: () => this.checkPreconditions(aggregate, parameters),
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

  checkPostconditions(
    aggregate: MockAggregate,
    result: OperationResult,
  ): ValidationResult {
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
      merge: () => this.checkPostconditions(aggregate, result),
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

  getDependencies() {
    return [];
  }

  getMetadata() {
    return {
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
        preconditions: [],
        postconditions: [],
      },
    };
  }

  isApplicable(aggregate: MockAggregate): boolean {
    return true;
  }
}

describe("OperationManager", () => {
  let manager: OperationManager;
  let mockAggregate: MockAggregate;

  beforeEach(() => {
    manager = new OperationManager();
    mockAggregate = new MockAggregate("aggregate-1", "Test Aggregate");
  });

  describe("registerOperation", () => {
    it("应该成功注册业务操作", () => {
      const operation = new MockBusinessOperation(
        "operation-1",
        "Test Operation",
        "A test operation",
        BusinessOperationType.UPDATE,
      );

      expect(() => {
        manager.registerOperation(operation);
      }).not.toThrow();

      expect(manager.getOperation("operation-1")).toBe(operation);
    });

    it("应该拒绝注册重复的操作", () => {
      const operation1 = new MockBusinessOperation(
        "operation-1",
        "Test Operation 1",
        "A test operation",
        BusinessOperationType.UPDATE,
      );
      const operation2 = new MockBusinessOperation(
        "operation-1",
        "Test Operation 2",
        "Another test operation",
        BusinessOperationType.CREATE,
      );

      manager.registerOperation(operation1);

      expect(() => {
        manager.registerOperation(operation2);
      }).toThrow(OperationManagerException);
    });
  });

  describe("unregisterOperation", () => {
    it("应该成功注销业务操作", () => {
      const operation = new MockBusinessOperation(
        "operation-1",
        "Test Operation",
        "A test operation",
        BusinessOperationType.UPDATE,
      );
      manager.registerOperation(operation);

      const removed = manager.unregisterOperation("operation-1");

      expect(removed).toBe(true);
      expect(manager.getOperation("operation-1")).toBeNull();
    });

    it("应该返回false对于不存在的操作", () => {
      const removed = manager.unregisterOperation("non-existent-operation");

      expect(removed).toBe(false);
    });
  });

  describe("getOperation", () => {
    it("应该返回已注册的操作", () => {
      const operation = new MockBusinessOperation(
        "operation-1",
        "Test Operation",
        "A test operation",
        BusinessOperationType.UPDATE,
      );
      manager.registerOperation(operation);

      const retrievedOperation = manager.getOperation("operation-1");

      expect(retrievedOperation).toBe(operation);
    });

    it("应该返回null对于未注册的操作", () => {
      const retrievedOperation = manager.getOperation("non-existent-operation");

      expect(retrievedOperation).toBeNull();
    });
  });

  describe("getAllOperations", () => {
    it("应该返回所有已注册的操作", () => {
      const operation1 = new MockBusinessOperation(
        "operation-1",
        "Test Operation 1",
        "A test operation",
        BusinessOperationType.UPDATE,
      );
      const operation2 = new MockBusinessOperation(
        "operation-2",
        "Test Operation 2",
        "Another test operation",
        BusinessOperationType.CREATE,
      );

      manager.registerOperation(operation1);
      manager.registerOperation(operation2);

      const allOperations = manager.getAllOperations();

      expect(allOperations).toHaveLength(2);
      expect(allOperations).toContain(operation1);
      expect(allOperations).toContain(operation2);
    });

    it("应该返回空数组当没有注册操作时", () => {
      const allOperations = manager.getAllOperations();

      expect(allOperations).toEqual([]);
    });
  });

  describe("executeOperation", () => {
    it("应该成功执行业务操作", async () => {
      const operation = new MockBusinessOperation(
        "operation-1",
        "Test Operation",
        "A test operation",
        BusinessOperationType.UPDATE,
      );
      manager.registerOperation(operation);

      const context = manager.createContext("user-1", "Test execution").build();
      const parameters: OperationParameters = { data: { value: "test" } };

      const result = await manager.executeOperation(
        "operation-1",
        mockAggregate,
        parameters,
        context,
      );

      expect(result.success).toBe(true);
      expect(result.operationId).toBe("operation-1");
    });

    it("应该拒绝执行不存在的操作", async () => {
      const context = manager.createContext("user-1").build();
      const parameters: OperationParameters = { data: {} };

      await expect(
        manager.executeOperation(
          "non-existent-operation",
          mockAggregate,
          parameters,
          context,
        ),
      ).rejects.toThrow(OperationManagerException);
    });

    it("应该拒绝执行禁用的操作", async () => {
      const operation = new MockBusinessOperation(
        "operation-1",
        "Test Operation",
        "A test operation",
        BusinessOperationType.UPDATE,
        0,
        false, // disabled
      );
      manager.registerOperation(operation);

      const context = manager.createContext("user-1").build();
      const parameters: OperationParameters = { data: {} };

      await expect(
        manager.executeOperation(
          "operation-1",
          mockAggregate,
          parameters,
          context,
        ),
      ).rejects.toThrow(OperationManagerException);
    });

    it("应该验证操作参数", async () => {
      const operation = new MockBusinessOperation(
        "operation-1",
        "Test Operation",
        "A test operation",
        BusinessOperationType.UPDATE,
      );

      // 先正常注册，让 validateParameters 在注册时返回有效结果
      manager.registerOperation(operation);

      // 然后在执行时 mock 验证失败
      jest.spyOn(operation, "validateParameters").mockReturnValue({
        isValid: false,
        errors: [
          {
            message: "Invalid parameter",
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
        getAllMessages: () => ["Invalid parameter"],
        getMessagesByLevel: () => [],
        getErrorsForField: () => [],
        getErrorsForRule: () => [],
        merge: () => operation.validateParameters({ data: {} }, mockAggregate),
        toJSON: () => ({
          isValid: false,
          errorCount: 1,
          warningCount: 0,
          infoCount: 0,
          executionTime: 0,
          rulesExecuted: 0,
          fieldsValidated: 0,
          errors: [
            {
              message: "Invalid parameter",
              code: "INVALID",
              level: "error",
            },
          ],
          warnings: [],
          info: [],
        }),
        toString: () => "Invalid",
      } as ValidationResult);

      const context = manager.createContext("user-1").build();
      const parameters: OperationParameters = { data: {} };

      const result = await manager.executeOperation(
        "operation-1",
        mockAggregate,
        parameters,
        context,
      );

      expect(result.success).toBe(false);
      expect(result.hasError()).toBe(true);
    });
  });

  describe("createContext", () => {
    it("应该创建操作上下文构建器", () => {
      const builder = manager.createContext("user-1", "Test reason");

      expect(builder).toBeDefined();
      expect(typeof builder.build).toBe("function");
    });
  });

  describe("getActiveOperation", () => {
    it("应该返回活跃的操作执行上下文", async () => {
      const operation = new MockBusinessOperation(
        "operation-1",
        "Test Operation",
        "A test operation",
        BusinessOperationType.UPDATE,
        0,
        true,
        "1.0.0",
        new Date(),
        new Date(),
        true,
      );
      manager.registerOperation(operation);

      // Mock execute 方法，添加延迟以确保在执行过程中可以查询到活跃状态
      let executeResolve: () => void;
      const executePromise = new Promise<OperationResult>((resolve) => {
        executeResolve = () => {
          resolve({
            id: `result_${operation.id}`,
            operationId: operation.id,
            contextId: "context-1",
            success: true,
            data: {},
            message: "Operation executed successfully",
            events: [],
            startTime: new Date(),
            endTime: new Date(),
            duration: 0,
            warnings: [],
            metadata: {},
            hasError: () => false,
            hasWarnings: () => false,
            hasEvents: () => false,
            getSummary: () => ({
              status: "success",
              duration: 0,
              errorCount: 0,
              warningCount: 0,
              eventCount: 0,
              operationType: operation.operationType,
            }),
          });
        };
      });

      jest.spyOn(operation, "execute").mockImplementation(async () => {
        // 等待一小段时间确保操作被设置为活跃状态
        await new Promise((resolve) => setTimeout(resolve, 10));
        return executePromise;
      });

      const context = manager.createContext("user-1").build();
      const parameters: OperationParameters = { data: {} };

      const executionPromise = manager.executeOperation(
        "operation-1",
        mockAggregate,
        parameters,
        context,
      );

      // 等待操作变为活跃状态
      await new Promise((resolve) => setTimeout(resolve, 50));

      const activeOperation = manager.getActiveOperation(context.id);

      expect(activeOperation).toBeDefined();
      expect(activeOperation?.contextId).toBe(context.id);

      // 完成执行
      executeResolve!();
      await executionPromise;
    });

    it("应该返回null对于不存在的上下文", () => {
      const activeOperation = manager.getActiveOperation(
        "non-existent-context",
      );

      expect(activeOperation).toBeNull();
    });
  });

  describe("getExecutionHistory", () => {
    it("应该返回执行历史", async () => {
      const operation = new MockBusinessOperation(
        "operation-1",
        "Test Operation",
        "A test operation",
        BusinessOperationType.UPDATE,
      );
      manager.registerOperation(operation);

      const context = manager.createContext("user-1").build();
      const parameters: OperationParameters = { data: {} };

      await manager.executeOperation(
        "operation-1",
        mockAggregate,
        parameters,
        context,
      );

      const history = manager.getExecutionHistory();

      expect(history).toHaveLength(1);
      expect(history[0].operationId).toBe("operation-1");
      expect(history[0].contextId).toBe(context.id);
    });

    it("应该按操作ID过滤执行历史", async () => {
      const operation = new MockBusinessOperation(
        "operation-1",
        "Test Operation",
        "A test operation",
        BusinessOperationType.UPDATE,
      );
      manager.registerOperation(operation);

      const context = manager.createContext("user-1").build();
      const parameters: OperationParameters = { data: {} };

      await manager.executeOperation(
        "operation-1",
        mockAggregate,
        parameters,
        context,
      );

      const history = manager.getExecutionHistory("operation-1");

      expect(history).toHaveLength(1);
      expect(history[0].operationId).toBe("operation-1");
    });
  });

  describe("getOperationStats", () => {
    it("应该返回操作统计信息", async () => {
      const operation = new MockBusinessOperation(
        "operation-1",
        "Test Operation",
        "A test operation",
        BusinessOperationType.UPDATE,
      );
      manager.registerOperation(operation);

      const context = manager.createContext("user-1").build();
      const parameters: OperationParameters = { data: {} };

      await manager.executeOperation(
        "operation-1",
        mockAggregate,
        parameters,
        context,
      );

      const stats = manager.getOperationStats();

      expect(stats.totalOperations).toBe(1);
      expect(stats.activeOperations).toBe(0);
      expect(stats.totalExecutions).toBe(1);
      expect(stats.successfulExecutions).toBe(1);
      expect(stats.failedExecutions).toBe(0);
      expect(stats.successRate).toBe(100);
    });
  });
});
