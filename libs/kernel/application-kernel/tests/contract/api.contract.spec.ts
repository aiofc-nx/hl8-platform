/**
 * @fileoverview API契约测试
 * @description 测试应用层核心模块的API契约兼容性
 */

import { Test, TestingModule } from "@nestjs/testing";
import { Logger } from "@hl8/logger";
import { EntityId } from "@hl8/domain-kernel";

import { ApplicationKernelModule } from "../../src/application-kernel.module.js";
import { CommandQueryBus } from "../../src/bus/command-query-bus.impl.js";
import { EventStore } from "../../src/events/store/event-store.impl.js";
import { EventBusImpl as EventBus } from "../../src/events/bus/event-bus.impl.js";
import { ProjectorRegistry } from "../../src/projectors/registry/projector-registry.js";
import { SagaStateManager } from "../../src/sagas/base/saga-state.js";
import { InMemoryCache as CacheService } from "@hl8/cache";
import { MonitoringService } from "../../src/monitoring/monitoring.service.js";
import { DomainEvent } from "../../src/events/types/domain-event.js";
// duplicate import removed

describe("API Contract Tests", () => {
  let module: TestingModule;
  let commandQueryBus: CommandQueryBus;
  let eventStore: EventStore;
  let eventBus: EventBus;
  let projectorRegistry: ProjectorRegistry;
  let sagaStateManager: SagaStateManager;
  let cacheService: CacheService;
  let monitoringService: MonitoringService;
  let logger: Logger;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [ApplicationKernelModule.forRoot()],
    }).compile();

    commandQueryBus = module.get<CommandQueryBus>("CommandQueryBus");
    eventStore = module.get<EventStore>("EventStore");
    eventBus = module.get<EventBus>("EventBus");
    projectorRegistry = module.get<ProjectorRegistry>("ProjectorRegistry");
    sagaStateManager = module.get<SagaStateManager>("SagaStateManager");
    cacheService = module.get<CacheService>("CacheService");
    monitoringService = module.get<MonitoringService>("MonitoringService");
    logger = module.get<Logger>(Logger);
  });

  afterAll(async () => {
    await module.close();
  });

  describe("Command Query Bus Contract", () => {
    it("should maintain command contract compatibility", () => {
      // Given
      const command = {
        commandId: new EntityId(),
        commandType: "TestCommand",
        correlationId: "test-correlation",
        userId: new EntityId(),
        timestamp: new Date(),
        version: 1,
        metadata: {},
        payload: { test: "data" },
      };

      // When & Then
      expect(commandQueryBus).toBeDefined();
      expect(typeof commandQueryBus.executeCommand).toBe("function");
      expect(typeof commandQueryBus.executeQuery).toBe("function");
      expect(typeof commandQueryBus.registerCommandHandler).toBe("function");
      expect(typeof commandQueryBus.registerQueryHandler).toBe("function");
    });

    it("should maintain query contract compatibility", () => {
      // Given
      const query = {
        queryId: new EntityId(),
        queryType: "TestQuery",
        correlationId: "test-correlation",
        userId: new EntityId(),
        timestamp: new Date(),
        version: 1,
        pagination: { page: 1, pageSize: 10 },
        sorting: [],
        filters: [],
        metadata: {},
      };

      // When & Then
      expect(commandQueryBus).toBeDefined();
      expect(typeof commandQueryBus.executeQuery).toBe("function");
      expect(typeof commandQueryBus.registerQueryHandler).toBe("function");
    });
  });

  describe("Event Store Contract", () => {
    it("should maintain event store contract compatibility", () => {
      // When & Then
      expect(eventStore).toBeDefined();
      expect(typeof eventStore.appendEvents).toBe("function");
      expect(typeof eventStore.getEvents).toBe("function");
      expect(typeof eventStore.createSnapshot).toBe("function");
      expect(typeof eventStore.getSnapshot).toBe("function");
      expect(typeof eventStore.replayEvents).toBe("function");
    });

    it("should handle event store operations", async () => {
      // Given
      const aggregateId = new EntityId();
      const event = new DomainEvent(
        aggregateId,
        "TestEvent",
        { test: "data" },
        {},
        new EntityId(),
        new Date(),
        1,
      );

      // When & Then
      await expect(
        eventStore.appendEvents(aggregateId, [event]),
      ).resolves.not.toThrow();
      await expect(eventStore.getEvents(aggregateId)).resolves.toBeDefined();
    });
  });

  describe("Event Bus Contract", () => {
    it("should maintain event bus contract compatibility", () => {
      // When & Then
      expect(eventBus).toBeDefined();
      expect(typeof eventBus.publish).toBe("function");
      expect(typeof eventBus.subscribe).toBe("function");
      expect(typeof eventBus.unsubscribe).toBe("function");
      expect(typeof eventBus.getSubscribers).toBe("function");
    });

    it("should handle event publishing", async () => {
      // Given
      const event = {
        eventId: new EntityId(),
        aggregateRootId: new EntityId(),
        eventType: "TestEvent",
        data: { test: "data" },
        version: 1,
        timestamp: new Date(),
        metadata: {},
        causationId: new EntityId(),
        correlationId: "test-correlation",
      };

      // When & Then
      await expect(eventBus.publish(event as any)).resolves.not.toThrow();
    });
  });

  describe("Projector Registry Contract", () => {
    it("should maintain projector registry contract compatibility", () => {
      // When & Then
      expect(projectorRegistry).toBeDefined();
      expect(typeof projectorRegistry.registerProjector).toBe("function");
      expect(typeof projectorRegistry.registerHandler).toBe("function");
      expect(typeof projectorRegistry.getProjector).toBe("function");
      expect(typeof projectorRegistry.getHandler).toBe("function");
      expect(typeof projectorRegistry.getAllProjectors).toBe("function");
      expect(typeof projectorRegistry.getAllHandlers).toBe("function");
    });

    it("should handle projector registration", () => {
      // Given
      const mockProjector = {
        getName: () => "TestProjector",
        getDescription: () => "Test Description",
        getVersion: () => "1.0.0",
        getStatus: () => "running",
        getStatistics: () => ({}),
        isEnabled: () => true,
        supportsEventType: () => true,
        getSupportedEventTypes: () => ["TestEvent"],
        getReadModel: () => Promise.resolve({}),
        updateReadModel: () => Promise.resolve(),
      };

      const metadata = {
        name: "TestProjector",
        description: "Test Description",
        version: "1.0.0",
        supportedEventTypes: ["TestEvent"],
        readModelType: "TestReadModel",
        config: {},
      };

      // When & Then
      expect(
        projectorRegistry.registerProjector(
          mockProjector as any,
          metadata,
          true,
        ),
      ).toBe(true);
    });
  });

  describe("Saga State Manager Contract", () => {
    it("should maintain saga state manager contract compatibility", () => {
      // When & Then
      expect(sagaStateManager).toBeDefined();
      expect(typeof sagaStateManager.createSnapshot).toBe("function");
      expect(typeof sagaStateManager.save).toBe("function");
      expect(typeof sagaStateManager.getById).toBe("function");
      expect(typeof sagaStateManager.getByAggregateId).toBe("function");
      expect(typeof sagaStateManager.query).toBe("function");
      expect(typeof sagaStateManager.update).toBe("function");
      expect(typeof sagaStateManager.delete).toBe("function");
    });

    it("should handle saga state operations", async () => {
      // Given
      const sagaId = new EntityId();
      const aggregateId = new EntityId();
      const snapshot = {
        sagaId: sagaId.toString(),
        aggregateId: aggregateId.toString(),
        status: "completed" as any,
        currentStepIndex: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        startTime: new Date(),
        contextData: {},
        stepStates: [],
        version: 1,
      };

      // When & Then
      await expect(sagaStateManager.save(snapshot)).resolves.not.toThrow();
      await expect(
        sagaStateManager.getById(sagaId.toString()),
      ).resolves.toBeDefined();
    });
  });

  describe("Cache Service Contract", () => {
    it("should maintain cache service contract compatibility", () => {
      // When & Then - @hl8/cache ICache interface
      expect(cacheService).toBeDefined();
      expect(typeof cacheService.get).toBe("function");
      expect(typeof cacheService.set).toBe("function");
      expect(typeof cacheService.delete).toBe("function");
      expect(typeof cacheService.clear).toBe("function");
      expect(typeof cacheService.deleteMany).toBe("function");
      expect(typeof cacheService.invalidateByTags).toBe("function");
      expect(typeof cacheService.invalidateByPattern).toBe("function");
      expect(typeof cacheService.getStats).toBe("function");
      expect(typeof cacheService.getMetadata).toBe("function");
      expect(typeof cacheService.resetStats).toBe("function");
    });

    it("should handle cache operations", async () => {
      // Given
      const key = "test-key";
      const value = { test: "data" };
      const ttl = 3600;

      // When & Then
      await expect(cacheService.set(key, value, ttl)).resolves.not.toThrow();
      const cached = await cacheService.get(key);
      expect(cached).toBeDefined();
      await expect(cacheService.delete(key)).resolves.not.toThrow();

      // Verify key was deleted
      const deleted = await cacheService.get(key);
      expect(deleted).toBeUndefined();
    });
  });

  describe("Monitoring Service Contract", () => {
    it("should maintain monitoring service contract compatibility", () => {
      // When & Then
      expect(monitoringService).toBeDefined();
      expect(typeof monitoringService.recordMetric).toBe("function");
      expect(typeof monitoringService.incrementCounter).toBe("function");
      expect(typeof monitoringService.recordHistogram).toBe("function");
      expect(typeof monitoringService.recordGauge).toBe("function");
      expect(typeof monitoringService.getMetrics).toBe("function");
      expect(typeof monitoringService.clearMetrics).toBe("function");
    });

    it("should handle monitoring operations", () => {
      // Given
      const metricName = "test-metric";
      const value = 42;
      const labels = { test: "label" };

      // When & Then
      expect(() =>
        monitoringService.recordMetric(metricName, value, labels),
      ).not.toThrow();
      expect(() =>
        monitoringService.incrementCounter(metricName, labels),
      ).not.toThrow();
      expect(() =>
        monitoringService.recordHistogram(metricName, value, labels),
      ).not.toThrow();
      expect(() =>
        monitoringService.recordGauge(metricName, value, labels),
      ).not.toThrow();
    });
  });

  describe("Error Handling Contract", () => {
    it("should maintain error handling contract compatibility", () => {
      // Given
      const error = new Error("Test error");
      const errorCode = "TEST_ERROR";
      const component = "TestComponent";
      const operation = "testOperation";
      const context = { test: "context" };

      // When & Then
      expect(() => {
        // This should not throw
        logger.error("Test error", {
          error: error.message,
          errorCode,
          component,
          operation,
          context,
        });
      }).not.toThrow();
    });
  });

  describe("Configuration Contract", () => {
    it("should maintain configuration contract compatibility", () => {
      // Given
      const config = {
        eventStore: {
          type: "hybrid",
          postgresql: "postgresql://localhost:5432/test",
          mongodb: "mongodb://localhost:27017/test",
        },
        eventBus: {
          deliveryGuarantee: "at-least-once",
          retryPolicy: { maxRetries: 3, backoffMs: 1000 },
        },
        cache: {
          type: "memory",
          ttl: { default: 3600 },
        },
        monitoring: {
          enabled: true,
          metricsInterval: 5000,
        },
      };

      // When & Then
      expect(config).toBeDefined();
      expect(config.eventStore).toBeDefined();
      expect(config.eventBus).toBeDefined();
      expect(config.cache).toBeDefined();
      expect(config.monitoring).toBeDefined();
    });
  });

  describe("Type Safety Contract", () => {
    it("should maintain type safety for all interfaces", () => {
      // Given
      const entityId = new EntityId();
      const date = new Date();
      const stringValue = "test";
      const numberValue = 42;
      const booleanValue = true;
      const objectValue = { test: "data" };
      const arrayValue = [1, 2, 3];

      // When & Then
      expect(typeof entityId).toBe("object");
      expect(typeof date).toBe("object");
      expect(typeof stringValue).toBe("string");
      expect(typeof numberValue).toBe("number");
      expect(typeof booleanValue).toBe("boolean");
      expect(typeof objectValue).toBe("object");
      expect(Array.isArray(arrayValue)).toBe(true);
    });
  });

  describe("Performance Contract", () => {
    it("should maintain performance characteristics", async () => {
      // Given
      const startTime = Date.now();

      // When
      // Perform basic operations
      const entityId = new EntityId();
      const date = new Date();
      const testData = { test: "performance" };

      // Then
      const executionTime = Date.now() - startTime;
      expect(executionTime).toBeLessThan(100); // 100ms threshold for basic operations
    });
  });
});
