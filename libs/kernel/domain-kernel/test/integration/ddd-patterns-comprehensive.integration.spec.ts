/**
 * @fileoverview DDD 模式综合集成测试
 * @description 测试所有 DDD 模式（Repository、Factory、Specification、Business Rules、
 *              Domain Service Registry、Coordination、Operations、Events）的协同工作
 */

import { describe, it, expect, beforeEach } from "@jest/globals";
import { EntityId } from "../../src/identifiers/entity-id.js";
import { AggregateRoot } from "../../src/aggregates/base/aggregate-root.base.js";
import { EntityLifecycle } from "../../src/entities/base/entity-lifecycle.enum.js";
import { AuditInfo } from "../../src/audit/audit-info.js";
import { BusinessRuleManager } from "../../src/business-rules/business-rule-manager.js";
import { CoordinationManager } from "../../src/coordination/coordination-manager.js";
import { OperationManager } from "../../src/operations/operation-manager.js";
import { DomainServiceRegistry } from "../../src/services/domain-service-registry.js";
import { EventProcessor, EventRegistry } from "../../src/events/index.js";
import {
  IDomainEventHandler,
  EventHandlerMetadata,
  EventProcessingResult,
  EventHandlerResult,
} from "../../src/events/domain-event-handler.interface.js";
import { DomainEvent } from "../../src/events/base/domain-event.base.js";
import {
  IRepository,
  IRepositoryFactory,
} from "../../src/repositories/repository.interface.js";
import { BusinessRuleSeverity } from "../../src/business-rules/business-rule.interface.js";
import { BusinessOperationType } from "../../src/operations/business-operation.interface.js";

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
    if (operation === "updateProfile") {
      const { name, email, age } = params as {
        name: string;
        email: string;
        age: number;
      };
      this._name = name;
      this._email = email;
      this._age = age;
      return { success: true, updated: { name, email, age } };
    }
    return { success: false, error: "未知操作" };
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
}

// 模拟 Repository
class MockRepository<T extends AggregateRoot> implements IRepository<T> {
  private storage: Map<string, T> = new Map();

  async findById(id: EntityId): Promise<T | null> {
    return this.storage.get(id.value) || null;
  }

  async findAll(): Promise<T[]> {
    return Array.from(this.storage.values());
  }

  async save(entity: T): Promise<void> {
    this.storage.set(entity.id.value, entity);
  }

  async delete(id: EntityId): Promise<void> {
    this.storage.delete(id.value);
  }

  async exists(id: EntityId): Promise<boolean> {
    return this.storage.has(id.value);
  }

  async count(): Promise<number> {
    return this.storage.size;
  }
}

// 模拟 Repository Factory
class MockRepositoryFactory implements IRepositoryFactory<TestAggregateRoot> {
  create(): IRepository<TestAggregateRoot> {
    return new MockRepository<TestAggregateRoot>();
  }
}

// 模拟业务规则
class MockBusinessRule {
  public readonly name: string;
  public readonly description: string;
  public readonly priority: number;
  public readonly enabled: boolean;
  public readonly type: any;
  public readonly severity: BusinessRuleSeverity;

  constructor(
    name: string,
    description: string,
    priority: number = 100,
    enabled: boolean = true,
    severity: BusinessRuleSeverity = BusinessRuleSeverity.ERROR,
  ) {
    this.name = name;
    this.description = description;
    this.priority = priority;
    this.enabled = enabled;
    this.type = "BUSINESS_LOGIC";
    this.severity = severity;
  }

  public enable(): void {
    (this as any)._enabled = true;
  }

  public disable(): void {
    (this as any)._enabled = false;
  }

  public validate(value: unknown): any {
    const aggregate = value as TestAggregateRoot;
    const violations: any[] = [];

    if (this.name === "EmailFormatRule") {
      if (!aggregate.email || !aggregate.email.includes("@")) {
        violations.push({
          message: "Invalid email format",
          code: "INVALID_EMAIL",
          ruleName: this.name,
          severity: this.severity,
          timestamp: new Date(),
        });
      }
    }

    if (this.name === "AgeValidationRule") {
      if (aggregate.age < 18) {
        violations.push({
          message: "Age must be at least 18",
          code: "INVALID_AGE",
          ruleName: this.name,
          severity: this.severity,
          timestamp: new Date(),
        });
      }
    }

    return {
      isValid: violations.length === 0,
      violations,
      warnings: [],
      info: [],
      executionTime: 0,
      rulesExecuted: 1,
      entitiesValidated: 1,
    };
  }

  public isApplicable(entity: unknown): boolean {
    return entity instanceof TestAggregateRoot;
  }

  public getDependencies(): string[] {
    return [];
  }
}

describe("DDD 模式综合集成测试", () => {
  let repository: IRepository<TestAggregateRoot>;
  let businessRuleManager: BusinessRuleManager<any>;
  let coordinationManager: CoordinationManager;
  let operationManager: OperationManager;
  let serviceRegistry: DomainServiceRegistry;
  let eventRegistry: EventRegistry;
  let eventProcessor: EventProcessor;
  let aggregateId: EntityId;
  let auditInfo: AuditInfo;

  beforeEach(() => {
    // 初始化 Repository
    const factory = new MockRepositoryFactory();
    repository = factory.create();

    // 初始化业务规则管理器
    businessRuleManager = new BusinessRuleManager<any>();
    businessRuleManager.registerRule(
      new MockBusinessRule("EmailFormatRule", "Validates email format") as any,
    );
    businessRuleManager.registerRule(
      new MockBusinessRule(
        "AgeValidationRule",
        "Validates age requirement",
      ) as any,
    );

    // 初始化协调管理器
    coordinationManager = new CoordinationManager();

    // 初始化操作管理器
    operationManager = new OperationManager();

    // 初始化服务注册表
    serviceRegistry = new DomainServiceRegistry();

    // 初始化事件系统
    eventRegistry = new EventRegistry();
    eventProcessor = new EventProcessor(eventRegistry, {
      continueOnError: true,
      defaultTimeout: 5000,
    });

    // 初始化测试数据
    aggregateId = new EntityId();
    auditInfo = AuditInfo.create(aggregateId);
  });

  describe("端到端业务流程：创建和验证聚合根", () => {
    it("应该完整执行：创建 → 验证 → 持久化 → 事件处理", async () => {
      // 1. 创建聚合根（Factory Pattern 概念）
      const aggregate = new TestAggregateRoot(aggregateId, auditInfo);
      aggregate.name = "John Doe";
      aggregate.email = "john@example.com";
      aggregate.age = 25;

      // 2. 业务规则验证（Business Rule Validation）
      const validationResult = businessRuleManager.validateEntity(aggregate, {
        entityType: "User",
        entityId: aggregate.id.value,
      });

      expect(validationResult.isValid).toBe(true);
      expect(validationResult.violations).toHaveLength(0);

      // 3. 持久化（Repository Pattern）
      await repository.save(aggregate);
      const saved = await repository.findById(aggregateId);
      expect(saved).toBeDefined();
      expect(saved?.name).toBe("John Doe");

      // 4. 验证业务不变量
      expect(aggregate.validateBusinessRules()).toBe(true);
    });

    it("应该拒绝无效的聚合根（违反业务规则）", async () => {
      const aggregate = new TestAggregateRoot(aggregateId, auditInfo);
      aggregate.name = "Jane Doe";
      aggregate.email = "invalid-email"; // 无效邮箱
      aggregate.age = 16; // 年龄不足

      // 业务规则验证应该失败
      const validationResult = businessRuleManager.validateEntity(aggregate, {
        entityType: "User",
        entityId: aggregate.id.value,
      });

      expect(validationResult.isValid).toBe(false);
      expect(validationResult.violations.length).toBeGreaterThan(0);

      // 不应该持久化无效的聚合根
      expect(aggregate.validateBusinessRules()).toBe(false);
    });
  });

  describe("聚合根操作和协调", () => {
    it("应该通过操作管理器执行业务操作", async () => {
      const aggregate = new TestAggregateRoot(aggregateId, auditInfo);
      aggregate.name = "Test User";
      aggregate.email = "test@example.com";
      aggregate.age = 20;

      // 注册操作
      const operation = {
        id: "update-profile",
        name: "Update Profile",
        description: "Update user profile",
        operationType: BusinessOperationType.UPDATE,
        priority: 0,
        enabled: true,
        version: "1.0.0",
        createdAt: new Date(),
        updatedAt: new Date(),
        validateParameters: () => ({
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
          merge: () => ({}) as any,
          toJSON: () => ({}),
          toString: () => "",
        }),
        checkPreconditions: () => ({
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
          merge: () => ({}) as any,
          toJSON: () => ({}),
          toString: () => "",
        }),
        checkPostconditions: () => ({
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
          merge: () => ({}) as any,
          toJSON: () => ({}),
          toString: () => "",
        }),
        execute: async (agg: any, params: any) => ({
          id: "result-1",
          operationId: "update-profile",
          contextId: "context-1",
          success: true,
          data: params,
          message: "Operation completed",
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
            operationType: BusinessOperationType.UPDATE,
          }),
        }),
        isApplicable: () => true,
        getDependencies: () => [],
      } as any;

      operationManager.registerOperation(operation);

      // 创建上下文并执行操作
      const context = operationManager.createContext("user-1").build();
      const result = await operationManager.executeOperation(
        "update-profile",
        aggregate,
        { name: "Updated Name", email: "updated@example.com", age: 26 },
        context,
      );

      expect(result.success).toBe(true);
    });
  });

  describe("领域服务协调", () => {
    it("应该通过协调管理器执行服务协调", async () => {
      // 注册协调规则
      const rule = {
        id: "validate-user-rule",
        name: "Validate User Rule",
        description: "Validates user data",
        priority: 0,
        enabled: true,
        version: "1.0.0",
        createdAt: new Date(),
        updatedAt: new Date(),
        execute: async (context: any) => ({
          id: "result-1",
          ruleId: "validate-user-rule",
          contextId: context.id,
          success: true,
          data: {},
          message: "Validation passed",
          startTime: new Date(),
          endTime: new Date(),
          duration: 0,
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
        }),
        validate: () => ({
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
          merge: () => ({}) as any,
          toJSON: () => ({}),
          toString: () => "",
        }),
        isApplicable: () => true,
        getDependencies: () => [],
        getMetadata: () => ({}),
      } as any;

      coordinationManager.registerRule(rule);

      // 创建协调上下文并执行
      const context = coordinationManager
        .createContext("test-operation", { data: "test" }, ["Service1"])
        .build();
      const results = await coordinationManager.executeCoordination(context);

      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(true);
    });
  });

  describe("事件处理和领域服务", () => {
    it("应该处理领域事件并与服务注册表协同工作", async () => {
      let eventHandled = false;

      // 注册事件处理器
      const handler: IDomainEventHandler = {
        getMetadata: (): EventHandlerMetadata => ({
          handlerId: "user-created-handler",
          handlerName: "User Created Handler",
          description: "Handles user created events",
          supportedEventTypes: ["UserCreated"],
          priority: 0,
          enabled: true,
          version: "1.0.0",
        }),
        canHandle: (eventType: string): boolean => eventType === "UserCreated",
        handle: async (event: DomainEvent): Promise<EventProcessingResult> => {
          eventHandled = true;
          const startTime = new Date();
          const endTime = new Date();
          return {
            success: true,
            result: EventHandlerResult.SUCCESS,
            duration: endTime.getTime() - startTime.getTime(),
            context: {
              eventId: event.eventId.value,
              eventType: event.eventType,
              aggregateRootId: event.aggregateRootId.value,
              startTime,
              endTime,
              duration: 0,
              handlerId: "user-created-handler",
              result: EventHandlerResult.SUCCESS,
            },
            shouldRetry: false,
          };
        },
        validateEvent: (): boolean => true,
        getDependencies: (): string[] => [],
      };

      await eventRegistry.registerHandler(handler);

      // 处理事件
      class UserCreatedEvent extends DomainEvent {
        constructor(
          aggregateRootId: EntityId,
          data: unknown,
          metadata: Record<string, unknown> = {},
        ) {
          super(aggregateRootId, "UserCreated", data, metadata);
        }

        protected validateEvent(): void {
          // 验证逻辑
        }

        public clone(): DomainEvent {
          return new UserCreatedEvent(
            this.aggregateRootId,
            this.data,
            this.metadata,
          );
        }
      }

      const mockEvent = new UserCreatedEvent(aggregateId, { name: "John Doe" });

      const results = await eventProcessor.processEvent(mockEvent);

      expect(results.length).toBeGreaterThan(0);
      expect(results[0].success).toBe(true);
      expect(eventHandled).toBe(true);
    });
  });

  describe("完整业务流程集成", () => {
    it("应该执行完整的用户注册流程：验证 → 创建 → 持久化 → 事件", async () => {
      // 1. 创建聚合根
      const aggregate = new TestAggregateRoot(aggregateId, auditInfo);
      aggregate.name = "New User";
      aggregate.email = "newuser@example.com";
      aggregate.age = 25;

      // 2. 业务规则验证
      const validationResult = businessRuleManager.validateEntity(aggregate, {
        entityType: "User",
        entityId: aggregate.id.value,
        operationType: "REGISTRATION",
      });

      expect(validationResult.isValid).toBe(true);

      // 3. 执行业务操作
      const operation = {
        id: "register-user",
        name: "Register User",
        description: "Register new user",
        operationType: BusinessOperationType.CREATE,
        priority: 0,
        enabled: true,
        version: "1.0.0",
        createdAt: new Date(),
        updatedAt: new Date(),
        validateParameters: () => ({
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
          merge: () => ({}) as any,
          toJSON: () => ({}),
          toString: () => "",
        }),
        checkPreconditions: () => ({
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
          merge: () => ({}) as any,
          toJSON: () => ({}),
          toString: () => "",
        }),
        checkPostconditions: () => ({
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
          merge: () => ({}) as any,
          toJSON: () => ({}),
          toString: () => "",
        }),
        execute: async (agg: any) => ({
          id: "result-1",
          operationId: "register-user",
          contextId: "context-1",
          success: true,
          data: {},
          message: "User registered",
          events: [
            {
              aggregateRootId: agg.id,
              eventType: "UserRegistered",
              eventData: { name: agg.name, email: agg.email },
              metadata: {},
            },
          ],
          startTime: new Date(),
          endTime: new Date(),
          duration: 0,
          warnings: [],
          metadata: {},
          hasError: () => false,
          hasWarnings: () => false,
          hasEvents: () => true,
          getSummary: () => ({
            status: "success",
            duration: 0,
            errorCount: 0,
            warningCount: 0,
            eventCount: 1,
            operationType: BusinessOperationType.CREATE,
          }),
        }),
        isApplicable: () => true,
        getDependencies: () => [],
      } as any;

      operationManager.registerOperation(operation);

      // 注册事件处理器
      let userRegisteredEventHandled = false;
      const eventHandler: IDomainEventHandler = {
        getMetadata: (): EventHandlerMetadata => ({
          handlerId: "user-registered-handler",
          handlerName: "User Registered Handler",
          description: "Handles user registered events",
          supportedEventTypes: ["UserRegistered"],
          priority: 0,
          enabled: true,
          version: "1.0.0",
        }),
        canHandle: (eventType: string): boolean =>
          eventType === "UserRegistered",
        handle: async (event: DomainEvent): Promise<EventProcessingResult> => {
          userRegisteredEventHandled = true;
          const startTime = new Date();
          const endTime = new Date();
          return {
            success: true,
            result: EventHandlerResult.SUCCESS,
            duration: endTime.getTime() - startTime.getTime(),
            context: {
              eventId: event.eventId.value,
              eventType: event.eventType,
              aggregateRootId: event.aggregateRootId.value,
              startTime,
              endTime,
              duration: 0,
              handlerId: "user-registered-handler",
              result: EventHandlerResult.SUCCESS,
            },
            shouldRetry: false,
          };
        },
        validateEvent: (): boolean => true,
        getDependencies: (): string[] => [],
      };

      await eventRegistry.registerHandler(eventHandler);

      // 执行操作
      const context = operationManager.createContext("system").build();
      const operationResult = await operationManager.executeOperation(
        "register-user",
        aggregate,
        {},
        context,
      );

      expect(operationResult.success).toBe(true);
      expect(operationResult.hasEvents()).toBe(true);

      // 处理产生的事件
      if (operationResult.events && operationResult.events.length > 0) {
        // 将操作结果中的事件转换为 DomainEvent
        const eventData = operationResult.events[0];
        class UserRegisteredEvent extends DomainEvent {
          constructor(
            aggregateRootId: EntityId,
            data: unknown,
            metadata: Record<string, unknown> = {},
          ) {
            super(aggregateRootId, "UserRegistered", data, metadata);
          }

          protected validateEvent(): void {
            // 验证逻辑
          }

          public clone(): DomainEvent {
            return new UserRegisteredEvent(
              this.aggregateRootId,
              this.data,
              this.metadata,
            );
          }
        }

        const domainEvent = new UserRegisteredEvent(
          aggregateId,
          (eventData as any).eventData || {},
          (eventData as any).metadata || {},
        );
        const eventResults = await eventProcessor.processEvent(domainEvent);
        expect(eventResults.length).toBeGreaterThan(0);
        expect(eventResults[0].success).toBe(true);
        expect(userRegisteredEventHandled).toBe(true);
      }

      // 4. 持久化
      await repository.save(aggregate);
      const saved = await repository.findById(aggregateId);
      expect(saved).toBeDefined();
      expect(saved?.name).toBe("New User");
    });
  });

  describe("错误处理和异常场景", () => {
    it("应该正确处理违反业务规则的情况", async () => {
      const aggregate = new TestAggregateRoot(aggregateId, auditInfo);
      aggregate.name = "Invalid User";
      aggregate.email = "invalid"; // 无效邮箱
      aggregate.age = 15; // 年龄不足

      // 业务规则验证应该失败
      const validationResult = businessRuleManager.validateEntity(aggregate, {
        entityType: "User",
        entityId: aggregate.id.value,
      });

      expect(validationResult.isValid).toBe(false);
      expect(validationResult.violations.length).toBeGreaterThan(0);

      // 验证统计信息
      const stats = businessRuleManager.getValidationStats();
      expect(stats.failedValidations).toBeGreaterThan(0);
    });

    it("应该处理事件处理失败的情况", async () => {
      // 注册会失败的事件处理器
      const failingHandler: IDomainEventHandler = {
        getMetadata: (): EventHandlerMetadata => ({
          handlerId: "failing-handler",
          handlerName: "Failing Handler",
          description: "Handler that fails",
          supportedEventTypes: ["TestEvent"],
          priority: 0,
          enabled: true,
          version: "1.0.0",
        }),
        canHandle: (eventType: string): boolean => eventType === "TestEvent",
        handle: async (): Promise<EventProcessingResult> => {
          throw new Error("Handler failed");
        },
        validateEvent: (): boolean => true,
        getDependencies: (): string[] => [],
      };

      await eventRegistry.registerHandler(failingHandler);

      class TestEvent extends DomainEvent {
        constructor(
          aggregateRootId: EntityId,
          data: unknown,
          metadata: Record<string, unknown> = {},
        ) {
          super(aggregateRootId, "TestEvent", data, metadata);
        }

        protected validateEvent(): void {
          // 验证逻辑
        }

        public clone(): DomainEvent {
          return new TestEvent(this.aggregateRootId, this.data, this.metadata);
        }
      }

      const mockEvent = new TestEvent(aggregateId, {});

      // 由于 continueOnError 为 true，应该返回错误结果而不是抛出异常
      const results = await eventProcessor.processEvent(mockEvent);
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].success).toBe(false);
    });
  });
});
