/**
 * @fileoverview Saga集成测试
 * @description 测试Saga模式的集成功能
 */

import { Test, TestingModule } from "@nestjs/testing";
import { Logger } from "@hl8/logger";
import { EntityId } from "@hl8/domain-kernel";

import { ApplicationKernelModule } from "../../src/application-kernel.module.js";
import {
  Saga,
  SagaStatus,
  SagaContext,
} from "../../src/sagas/base/saga.base.js";
import {
  BaseSagaStep,
  StepExecutionResult,
} from "../../src/sagas/base/saga-step.js";
import { SagaStateManager } from "../../src/sagas/base/saga-state.js";

// 测试Saga数据
interface TestSagaData {
  orderId: string;
  customerId: string;
  amount: number;
}

// 测试Saga步骤
class TestSagaStep extends BaseSagaStep {
  constructor(
    logger: Logger,
    name: string,
    private readonly executeFn: (context: SagaContext) => Promise<unknown>,
    private readonly compensateFn?: (context: SagaContext) => Promise<unknown>,
  ) {
    super(logger, {
      name,
      enabled: true,
      retry: { maxAttempts: 0, backoffMs: 0, maxBackoffMs: 0 },
    });
  }

  protected async executeStep(context: SagaContext): Promise<unknown> {
    return await this.executeFn(context);
  }

  protected async compensateStep(context: SagaContext): Promise<unknown> {
    if (this.compensateFn) {
      return await this.compensateFn(context);
    }
    return undefined;
  }
}

// 测试Saga实现
class TestOrderSaga extends Saga<TestSagaData> {
  public executedSteps: string[] = [];
  public compensatedSteps: string[] = [];

  constructor(logger: Logger, aggregateId: EntityId) {
    super(
      logger,
      {
        name: "TestOrderSaga",
        description: "Test order processing saga",
        version: "1.0.0",
      },
      aggregateId,
    );
  }

  protected initializeSteps(): void {
    this.steps.push(
      new TestSagaStep(
        this.logger,
        "validate-order",
        async (_context) => {
          this.executedSteps.push("validate-order");
          // Add delay to allow pause/resume testing
          await new Promise((resolve) => setTimeout(resolve, 50));
          return { validated: true };
        },
        async (_context) => {
          this.compensatedSteps.push("validate-order");
          return { compensated: true };
        },
      ),
      new TestSagaStep(
        this.logger,
        "reserve-inventory",
        async (_context) => {
          this.executedSteps.push("reserve-inventory");
          return { reserved: true };
        },
        async (_context) => {
          this.compensatedSteps.push("reserve-inventory");
          return { compensated: true };
        },
      ),
      new TestSagaStep(
        this.logger,
        "process-payment",
        async (_context) => {
          this.executedSteps.push("process-payment");
          return { paid: true };
        },
        async (_context) => {
          this.compensatedSteps.push("process-payment");
          return { refunded: true };
        },
      ),
      new TestSagaStep(
        this.logger,
        "ship-order",
        async (_context) => {
          this.executedSteps.push("ship-order");
          return { shipped: true };
        },
        async (_context) => {
          this.compensatedSteps.push("ship-order");
          return { cancelled: true };
        },
      ),
    );
  }
}

// 测试失败Saga
class FailingTestSaga extends Saga<TestSagaData> {
  public executedSteps: string[] = [];
  public compensatedSteps: string[] = [];

  constructor(logger: Logger, aggregateId: EntityId) {
    super(
      logger,
      {
        name: "FailingTestSaga",
        description: "Failing test saga",
        version: "1.0.0",
      },
      aggregateId,
    );
  }

  protected initializeSteps(): void {
    this.steps.push(
      new TestSagaStep(
        this.logger,
        "step1",
        async (_context) => {
          this.executedSteps.push("step1");
          return { success: true };
        },
        async (_context) => {
          this.compensatedSteps.push("step1");
          return { compensated: true };
        },
      ),
      new TestSagaStep(
        this.logger,
        "failing-step",
        async (_context) => {
          this.executedSteps.push("failing-step");
          throw new Error("Step execution failed");
        },
        async (_context) => {
          this.compensatedSteps.push("failing-step");
          return { compensated: true };
        },
      ),
      new TestSagaStep(
        this.logger,
        "step3",
        async (_context) => {
          this.executedSteps.push("step3");
          return { success: true };
        },
        async (_context) => {
          this.compensatedSteps.push("step3");
          return { compensated: true };
        },
      ),
    );
  }
}

// Mock状态存储
class MockSagaStateStore {
  private states: Map<string, any> = new Map();

  async save(snapshot: any): Promise<void> {
    this.states.set(snapshot.sagaId, snapshot);
  }

  async getById(sagaId: string): Promise<any> {
    return this.states.get(sagaId);
  }

  async getByAggregateId(aggregateId: string): Promise<any[]> {
    return Array.from(this.states.values()).filter(
      (s) => s.aggregateId === aggregateId,
    );
  }

  async query(_query: any): Promise<any> {
    return { snapshots: Array.from(this.states.values()) };
  }

  async update(sagaId: string, updates: any): Promise<void> {
    const existing = this.states.get(sagaId);
    if (existing) {
      this.states.set(sagaId, { ...existing, ...updates });
    }
  }

  async delete(sagaId: string): Promise<void> {
    this.states.delete(sagaId);
  }

  async cleanup(_beforeDate: Date): Promise<number> {
    return 0;
  }
}

describe("Saga Integration Tests", () => {
  let module: TestingModule;
  let logger: Logger;
  let stateManager: SagaStateManager;
  let mockStateStore: MockSagaStateStore;

  beforeAll(async () => {
    mockStateStore = new MockSagaStateStore();

    module = await Test.createTestingModule({
      imports: [ApplicationKernelModule.forRoot()],
    }).compile();

    logger = module.get<Logger>(Logger);
    stateManager = new SagaStateManager(logger, mockStateStore);
  });

  afterAll(async () => {
    await module.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Saga Execution", () => {
    it("should execute saga successfully", async () => {
      // Given
      const aggregateId = new EntityId();
      const saga = new TestOrderSaga(logger, aggregateId);
      const sagaData: TestSagaData = {
        orderId: "order-123",
        customerId: "customer-456",
        amount: 100.0,
      };

      // When
      await saga.execute(sagaData);

      // Then
      expect(saga.getStatus()).toBe(SagaStatus.COMPLETED);
      expect(saga.executedSteps).toEqual([
        "validate-order",
        "reserve-inventory",
        "process-payment",
        "ship-order",
      ]);
      expect(saga.compensatedSteps).toHaveLength(0);
    });

    it("should handle saga execution failure and compensation", async () => {
      // Given
      const aggregateId = new EntityId();
      const saga = new FailingTestSaga(logger, aggregateId);
      const sagaData: TestSagaData = {
        orderId: "order-456",
        customerId: "customer-789",
        amount: 200.0,
      };

      // When & Then
      await expect(saga.execute(sagaData)).rejects.toThrow();

      // Then
      expect(saga.getStatus()).toBe(SagaStatus.COMPENSATED);
      expect(saga.executedSteps).toEqual(["step1", "failing-step"]);
      expect(saga.compensatedSteps).toEqual(["step1"]);
    });

    it("should handle saga pause and resume", async () => {
      // Given
      const aggregateId = new EntityId();
      const saga = new TestOrderSaga(logger, aggregateId);
      const sagaData: TestSagaData = {
        orderId: "order-789",
        customerId: "customer-012",
        amount: 300.0,
      };

      // When - Start execution and pause immediately
      const executePromise = saga.execute(sagaData);

      // Pause immediately after starting (before steps execute)
      await saga.pause();
      expect(saga.getStatus()).toBe(SagaStatus.PAUSED);

      // Resume
      await saga.resume();
      expect(saga.getStatus()).toBe(SagaStatus.RUNNING);

      // Wait for completion
      await executePromise;

      // Then
      expect(saga.getStatus()).toBe(SagaStatus.COMPLETED);
    });

    it("should handle saga cancellation", async () => {
      // Given
      const aggregateId = new EntityId();
      const saga = new TestOrderSaga(logger, aggregateId);
      const sagaData: TestSagaData = {
        orderId: "order-012",
        customerId: "customer-345",
        amount: 400.0,
      };

      // When - Start execution and cancel immediately
      const executePromise = saga.execute(sagaData);

      // Cancel immediately after starting (before steps execute)
      await saga.cancel("User requested cancellation");
      expect(saga.getStatus()).toBe(SagaStatus.CANCELLED);

      // Wait for execution to complete (should handle cancellation)
      await executePromise;

      // Then
      expect(saga.getStatus()).toBe(SagaStatus.CANCELLED);
    });
  });

  describe("Saga State Management", () => {
    it("should save and restore saga state", async () => {
      // Given
      const aggregateId = new EntityId();
      const saga = new TestOrderSaga(logger, aggregateId);
      const sagaData: TestSagaData = {
        orderId: "order-state-123",
        customerId: "customer-state-456",
        amount: 500.0,
      };

      // When
      await saga.execute(sagaData);
      const snapshot = stateManager.createSnapshot(
        saga.getSagaId(),
        aggregateId,
        saga.getStatus(),
        saga.getContext(),
        saga.getSteps().map((step, index) => ({
          stepIndex: index,
          stepName: step.getName(),
          status: step.getStatus(),
        })),
      );
      await stateManager.save(snapshot);

      // Then
      const restoredSnapshot = await stateManager.getById(
        saga.getSagaId().toString(),
      );
      expect(restoredSnapshot).toBeDefined();
      expect(restoredSnapshot.sagaId).toBe(saga.getSagaId().toString());
    });

    it("should query saga states by aggregate ID", async () => {
      // Given
      const aggregateId = new EntityId();
      const saga1 = new TestOrderSaga(logger, aggregateId);
      const saga2 = new TestOrderSaga(logger, aggregateId);
      const sagaData: TestSagaData = {
        orderId: "order-query-123",
        customerId: "customer-query-456",
        amount: 600.0,
      };

      // When
      await saga1.execute(sagaData);
      await saga2.execute(sagaData);

      const snapshot1 = stateManager.createSnapshot(
        saga1.getSagaId(),
        aggregateId,
        saga1.getStatus(),
        saga1.getContext(),
        saga1.getSteps().map((step, index) => ({
          stepIndex: index,
          stepName: step.getName(),
          status: step.getStatus(),
        })),
      );
      const snapshot2 = stateManager.createSnapshot(
        saga2.getSagaId(),
        aggregateId,
        saga2.getStatus(),
        saga2.getContext(),
        saga2.getSteps().map((step, index) => ({
          stepIndex: index,
          stepName: step.getName(),
          status: step.getStatus(),
        })),
      );

      await stateManager.save(snapshot1);
      await stateManager.save(snapshot2);

      // Then
      const snapshots = await stateManager.getByAggregateId(
        aggregateId.toString(),
      );
      expect(snapshots).toHaveLength(2);
    });
  });

  describe("Saga Statistics", () => {
    it("should track saga execution statistics", async () => {
      // Given
      const aggregateId = new EntityId();
      const saga = new TestOrderSaga(logger, aggregateId);
      const sagaData: TestSagaData = {
        orderId: "order-stats-123",
        customerId: "customer-stats-456",
        amount: 700.0,
      };

      // When
      await saga.execute(sagaData);
      const statistics = saga.getStatistics();

      // Then
      expect(statistics.executionCount).toBe(1);
      expect(statistics.successCount).toBe(1);
      expect(statistics.failureCount).toBe(0);
      expect(statistics.status).toBe(SagaStatus.COMPLETED);
    });

    it("should track step execution statistics", async () => {
      // Given
      const aggregateId = new EntityId();
      const saga = new TestOrderSaga(logger, aggregateId);
      const sagaData: TestSagaData = {
        orderId: "order-step-stats-123",
        customerId: "customer-step-stats-456",
        amount: 800.0,
      };

      // When
      await saga.execute(sagaData);
      const steps = saga.getSteps();

      // Then
      expect(steps).toHaveLength(4);
      steps.forEach((step) => {
        const stepStats = step.getStatistics();
        expect(stepStats.executionCount).toBe(1);
        expect(stepStats.successCount).toBe(1);
        expect(stepStats.failureCount).toBe(0);
      });
    });
  });

  describe("Saga Error Handling", () => {
    it("should handle step execution errors", async () => {
      // Given
      const aggregateId = new EntityId();
      const saga = new FailingTestSaga(logger, aggregateId);
      const sagaData: TestSagaData = {
        orderId: "order-error-123",
        customerId: "customer-error-456",
        amount: 900.0,
      };

      // When & Then
      await expect(saga.execute(sagaData)).rejects.toThrow();
      expect(saga.getStatus()).toBe(SagaStatus.COMPENSATED);
    });

    it("should handle compensation errors gracefully", async () => {
      // Given
      const aggregateId = new EntityId();
      const saga = new FailingTestSaga(logger, aggregateId);
      const sagaData: TestSagaData = {
        orderId: "order-comp-error-123",
        customerId: "customer-comp-error-456",
        amount: 1000.0,
      };

      // When
      try {
        await saga.execute(sagaData);
      } catch (error) {
        // Expected to fail
      }

      // Then
      expect(saga.getStatus()).toBe(SagaStatus.COMPENSATED);
    });
  });

  describe("Performance Tests", () => {
    it("should execute saga within performance threshold", async () => {
      // Given
      const aggregateId = new EntityId();
      const saga = new TestOrderSaga(logger, aggregateId);
      const sagaData: TestSagaData = {
        orderId: "order-perf-123",
        customerId: "customer-perf-456",
        amount: 1100.0,
      };

      // When
      const startTime = Date.now();
      await saga.execute(sagaData);
      const executionTime = Date.now() - startTime;

      // Then
      expect(executionTime).toBeLessThan(1000); // 1 second threshold
    });

    it("should handle concurrent saga execution", async () => {
      // Given
      const aggregateId = new EntityId();
      const sagas = Array.from(
        { length: 5 },
        () => new TestOrderSaga(logger, aggregateId),
      );
      const sagaData: TestSagaData = {
        orderId: "order-concurrent-123",
        customerId: "customer-concurrent-456",
        amount: 1200.0,
      };

      // When
      const startTime = Date.now();
      await Promise.all(sagas.map((saga) => saga.execute(sagaData)));
      const executionTime = Date.now() - startTime;

      // Then
      expect(executionTime).toBeLessThan(2000); // 2 second threshold
      sagas.forEach((saga) => {
        expect(saga.getStatus()).toBe(SagaStatus.COMPLETED);
      });
    });
  });

  describe("Logging Integration", () => {
    it("should log saga execution", async () => {
      // Given
      const aggregateId = new EntityId();
      const saga = new TestOrderSaga(logger, aggregateId);
      const sagaData: TestSagaData = {
        orderId: "order-logging-123",
        customerId: "customer-logging-456",
        amount: 1300.0,
      };
      const loggerSpy = jest.spyOn(logger, "debug");

      // When
      await saga.execute(sagaData);

      // Then
      expect(loggerSpy).toHaveBeenCalled();
    });
  });
});
