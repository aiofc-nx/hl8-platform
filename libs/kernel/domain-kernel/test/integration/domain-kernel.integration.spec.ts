/**
 * @fileoverview 领域核心模块集成测试
 * @description 测试所有组件协同工作的完整场景
 */

import { ValueObject } from "../../src/value-objects/base/value-object.base.js";
import { Entity } from "../../src/entities/base/entity.base.js";
import { InternalEntity } from "../../src/entities/internal/internal-entity.base.js";
import {
  AggregateRoot,
  DomainEvent,
} from "../../src/aggregates/base/aggregate-root.base.js";
import { DomainService } from "../../src/services/base/domain-service.base.js";
import { DomainEvent as DomainEventClass } from "../../src/events/base/domain-event.base.js";
import { IEventStore } from "../../src/events/store/event-store.interface.js";
import { EntityId } from "../../src/identifiers/entity-id.js";
import { AuditInfo } from "../../src/audit/audit-info.js";
import { EntityLifecycle } from "../../src/entities/base/entity-lifecycle.enum.js";
import { SeparationValidator } from "../../src/validation/separation-validator.js";
import {
  BusinessException,
  SystemException,
} from "../../src/exceptions/index.js";

// 测试用的值对象
class TestValueObject extends ValueObject<string> {
  constructor(value: string) {
    super(value);
  }

  protected validateValue(value: string): void {
    if (!value || value.length === 0) {
      throw new Error("值不能为空");
    }
  }
}

// 测试用的聚合根
class TestAggregateRoot extends AggregateRoot {
  private _name: string = "";
  private _value: number = 0;

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

  public get value(): number {
    return this._value;
  }

  public set value(val: number) {
    this._value = val;
  }

  protected performCoordination(operation: string, params: unknown): unknown {
    if (operation === "updateName") {
      const data = params as { name: string };
      this._name = data.name;
      return { success: true, name: this._name };
    }

    if (operation === "updateValue") {
      const data = params as { value: number };
      this._value = data.value;
      return { success: true, value: this._value };
    }

    return { success: false, error: "未知操作" };
  }

  protected performBusinessInvariantValidation(): boolean {
    return this._name.length > 0 && this._value >= 0;
  }

  public clone(): AggregateRoot {
    const cloned = new TestAggregateRoot(
      this.id,
      this.auditInfo,
      this.lifecycleState,
      this.version,
    );
    cloned._name = this._name;
    cloned._value = this._value;
    return cloned;
  }
}

// 测试用的内部实体
class TestInternalEntity extends InternalEntity {
  private _data: string = "";

  constructor(
    aggregateRootId: EntityId,
    data: string,
    id?: EntityId,
    auditInfo?: AuditInfo,
    lifecycleState: EntityLifecycle = EntityLifecycle.CREATED,
    version: number = 1,
  ) {
    super(aggregateRootId, id, auditInfo, lifecycleState, version);
    this._data = data;
  }

  public get data(): string {
    return this._data;
  }

  public set data(value: string) {
    this._data = value;
  }

  public getBusinessState(): unknown {
    return { data: this._data };
  }

  public setBusinessState(state: unknown): void {
    this._data = (state as { data: string }).data;
  }

  protected performBusinessOperation(params: unknown): unknown {
    return { result: this._data, operation: "test" };
  }

  protected performStateUpdate(newState: unknown): void {
    this._data = newState as string;
  }

  protected performNotification(event: unknown): void {
    // 模拟通知
  }

  protected performBusinessRuleValidation(): boolean {
    return this._data.length > 0;
  }

  public clone(): InternalEntity {
    return new TestInternalEntity(
      this.aggregateRootId,
      this._data,
      this.id,
      this.auditInfo,
      this.lifecycleState,
      this.version,
    );
  }
}

// 测试用的领域服务
class TestDomainService extends DomainService {
  constructor(serviceId?: EntityId, version: number = 1) {
    super(serviceId, version);
  }

  protected getRequiredDependencies(): string[] {
    return ["calculator"];
  }

  protected performBusinessLogic(operation: string, params: unknown): unknown {
    if (operation === "calculate") {
      const data = params as { a: number; b: number };
      return { result: data.a + data.b };
    }
    return { error: "未知操作" };
  }

  protected validateService(): void {
    // 验证逻辑
  }

  public clone(): DomainService {
    return new TestDomainService(this.serviceId, this.version);
  }
}

// 测试用的内存事件存储
class InMemoryEventStore implements IEventStore {
  private events: DomainEventClass[] = [];

  async appendEvents(events: DomainEventClass[]): Promise<void> {
    this.events.push(...events);
  }

  async getEvents(aggregateRootId: EntityId): Promise<DomainEventClass[]> {
    return this.events.filter((event) =>
      event.aggregateRootId.equals(aggregateRootId),
    );
  }

  async getEventsFromVersion(
    aggregateRootId: EntityId,
    fromVersion: number,
  ): Promise<DomainEventClass[]> {
    return this.events.filter(
      (event) =>
        event.aggregateRootId.equals(aggregateRootId) &&
        event.version >= fromVersion,
    );
  }

  async getEventsInTimeRange(
    aggregateRootId: EntityId,
    fromDate: Date,
    toDate: Date,
  ): Promise<DomainEventClass[]> {
    return this.events.filter(
      (event) =>
        event.aggregateRootId.equals(aggregateRootId) &&
        event.timestamp >= fromDate &&
        event.timestamp <= toDate,
    );
  }

  async getAllEvents(
    limit?: number,
    offset?: number,
  ): Promise<DomainEventClass[]> {
    const start = offset || 0;
    const end = limit ? start + limit : this.events.length;
    return this.events.slice(start, end);
  }

  async getEventsByType(
    eventType: string,
    limit?: number,
    offset?: number,
  ): Promise<DomainEventClass[]> {
    const filtered = this.events.filter(
      (event) => event.eventType === eventType,
    );
    const start = offset || 0;
    const end = limit ? start + limit : filtered.length;
    return filtered.slice(start, end);
  }

  async getLatestVersion(aggregateRootId: EntityId): Promise<number> {
    const aggregateEvents = this.events.filter((event) =>
      event.aggregateRootId.equals(aggregateRootId),
    );
    return aggregateEvents.length > 0
      ? Math.max(...aggregateEvents.map((event) => event.version))
      : 0;
  }

  async eventExists(eventId: EntityId): Promise<boolean> {
    return this.events.some((event) => event.eventId.equals(eventId));
  }

  async deleteEvents(aggregateRootId: EntityId): Promise<void> {
    this.events = this.events.filter(
      (event) => !event.aggregateRootId.equals(aggregateRootId),
    );
  }

  async clearAllEvents(): Promise<void> {
    this.events = [];
  }

  async getStats(): Promise<any> {
    return {
      totalEvents: this.events.length,
      aggregateRootCount: new Set(
        this.events.map((event) => event.aggregateRootId.value),
      ).size,
      eventTypeCount: new Set(this.events.map((event) => event.eventType)).size,
      earliestEventTime:
        this.events.length > 0
          ? new Date(
              Math.min(
                ...this.events.map((event) => event.timestamp.getTime()),
              ),
            )
          : null,
      latestEventTime:
        this.events.length > 0
          ? new Date(
              Math.max(
                ...this.events.map((event) => event.timestamp.getTime()),
              ),
            )
          : null,
      storageSize: JSON.stringify(this.events).length,
    };
  }
}

describe("领域核心模块集成测试", () => {
  let aggregateRoot: TestAggregateRoot;
  let internalEntity: TestInternalEntity;
  let domainService: TestDomainService;
  let eventStore: IEventStore;
  let entityId: EntityId;
  let auditInfo: AuditInfo;

  beforeEach(() => {
    entityId = new EntityId();
    auditInfo = AuditInfo.create(entityId);
    aggregateRoot = new TestAggregateRoot(entityId, auditInfo);
    internalEntity = new TestInternalEntity(aggregateRoot.id, "test data");
    internalEntity.activate();
    domainService = new TestDomainService();
    domainService.registerDependency("calculator", {
      add: (a: number, b: number) => a + b,
    });
    eventStore = new InMemoryEventStore();
  });

  describe("完整业务流程", () => {
    it("应该支持完整的领域操作流程", async () => {
      // 1. 激活聚合根
      aggregateRoot.activate();

      // 2. 添加内部实体
      aggregateRoot.addInternalEntity(internalEntity);

      // 3. 通过聚合根协调业务操作
      const result = aggregateRoot.coordinateBusinessOperation("updateName", {
        name: "Test Aggregate",
      });

      expect(result).toEqual({ success: true, name: "Test Aggregate" });
      expect(aggregateRoot.name).toBe("Test Aggregate");

      // 4. 验证业务不变量
      expect(aggregateRoot.validateBusinessInvariants()).toBe(true);

      // 5. 检查领域事件
      const events = aggregateRoot.getDomainEvents();
      expect(events.length).toBeGreaterThan(0);

      // 6. 存储事件
      const domainEvents = events.map(
        (event) =>
          new DomainEventClass(
            event.aggregateRootId,
            event.type,
            event.data,
            {},
            event.entityId,
            event.timestamp,
          ),
      );
      await eventStore.appendEvents(domainEvents);

      // 7. 验证事件存储
      const storedEvents = await eventStore.getEvents(aggregateRoot.id);
      expect(storedEvents.length).toBe(events.length);
    });

    it("应该支持领域服务操作", () => {
      const result = domainService.executeBusinessLogic("calculate", {
        a: 10,
        b: 20,
      });

      expect(result).toEqual({ result: 30 });
    });

    it("应该支持值对象操作", () => {
      const valueObject = new TestValueObject("test value");
      expect(valueObject.value).toBe("test value");
      expect(valueObject.equals(new TestValueObject("test value"))).toBe(true);
    });
  });

  describe("异常处理", () => {
    it("应该正确处理业务异常", () => {
      const businessException = new BusinessException(
        "业务规则违反",
        "BUSINESS_RULE_VIOLATION",
        { rule: "name_required" },
      );

      expect(businessException.exceptionType).toBe("BUSINESS");
      expect(businessException.isRecoverable()).toBe(true);
      expect(businessException.getSeverity()).toBe("MEDIUM");
    });

    it("应该正确处理系统异常", () => {
      const systemException = new SystemException(
        "数据库连接失败",
        "DATABASE_CONNECTION_FAILED",
        { host: "localhost", port: 5432 },
      );

      expect(systemException.exceptionType).toBe("SYSTEM");
      expect(systemException.isRecoverable()).toBe(false);
      expect(systemException.getSeverity()).toBe("HIGH");
    });
  });

  describe("分离原则验证", () => {
    it("应该验证聚合根符合分离原则", () => {
      const result = SeparationValidator.validateAggregateRoot(aggregateRoot);
      expect(result.isValid).toBe(true);
    });

    it("应该验证内部实体符合分离原则", () => {
      const result = SeparationValidator.validateInternalEntity(
        internalEntity,
        aggregateRoot.id,
      );
      expect(result.isValid).toBe(true);
    });

    it("应该验证实体集合符合分离原则", () => {
      const entities = [internalEntity];
      const aggregateRoots = [aggregateRoot];

      const result = SeparationValidator.validateEntityCollection(
        entities,
        aggregateRoots,
      );
      expect(result.isValid).toBe(true);
    });
  });

  describe("事件存储集成", () => {
    it("应该支持事件存储操作", async () => {
      const event = new DomainEventClass(aggregateRoot.id, "TestEvent", {
        data: "test",
      });

      await eventStore.appendEvents([event]);
      const events = await eventStore.getEvents(aggregateRoot.id);

      expect(events.length).toBe(1);
      expect(events[0].eventType).toBe("TestEvent");
    });

    it("应该支持事件查询", async () => {
      const event1 = new DomainEventClass(aggregateRoot.id, "Event1", {
        data: "1",
      });
      const event2 = new DomainEventClass(aggregateRoot.id, "Event2", {
        data: "2",
      });

      await eventStore.appendEvents([event1, event2]);

      const eventsByType = await eventStore.getEventsByType("Event1");
      expect(eventsByType.length).toBe(1);

      const allEvents = await eventStore.getAllEvents();
      expect(allEvents.length).toBe(2);
    });
  });

  describe("性能测试", () => {
    it("应该能够处理大量操作", async () => {
      const startTime = Date.now();

      // 创建大量实体和事件
      for (let i = 0; i < 100; i++) {
        const entity = new TestInternalEntity(aggregateRoot.id, `data-${i}`);
        entity.activate();
        aggregateRoot.addInternalEntity(entity);
      }

      // 激活聚合根
      aggregateRoot.activate();

      // 执行大量业务操作
      for (let i = 0; i < 100; i++) {
        aggregateRoot.coordinateBusinessOperation("updateValue", {
          value: i,
        });
      }

      const endTime = Date.now();
      expect(endTime - startTime).toBeLessThan(1000); // 应该在1秒内完成
    });
  });

  describe("错误恢复", () => {
    it("应该支持错误恢复机制", () => {
      // 模拟业务异常
      const businessException = new BusinessException(
        "业务规则违反",
        "BUSINESS_RULE_VIOLATION",
      );

      expect(businessException.isRecoverable()).toBe(true);
      expect(businessException.getSuggestion()).toContain("检查业务规则");
    });

    it("应该正确处理不可恢复的系统异常", () => {
      const systemException = new SystemException("系统故障", "SYSTEM_FAILURE");

      expect(systemException.isRecoverable()).toBe(false);
      expect(systemException.getSuggestion()).toContain("技术支持");
    });
  });
});
