/**
 * @fileoverview Factory Tests - 工厂接口测试
 * @description 工厂接口的单元测试
 */

import { Entity } from "../entities/base/entity.base.js";
import { EntityId } from "../identifiers/entity-id.js";
import { ValueObject } from "../value-objects/base/value-object.base.js";
import { DomainEvent } from "../events/base/domain-event.base.js";
import { AggregateRoot } from "../aggregates/base/aggregate-root.base.js";
import { v4 as uuidv4 } from "uuid";

// 测试用的实体
class TestEntity extends Entity {
  constructor(
    id: EntityId,
    public readonly name: string,
    public readonly value: number,
  ) {
    super(id);
  }

  clone(): Entity {
    return new TestEntity(this.id, this.name, this.value);
  }

  protected createClone(
    value: string,
    createdAt: Date,
    version: number,
  ): TestEntity {
    return new TestEntity(this.id, this.name, this.value);
  }

  public validateBusinessRules(): boolean {
    if (this.value < 0) {
      throw new Error("Value cannot be negative");
    }
    return true;
  }

  public executeBusinessLogic(): void {
    // 测试用的业务逻辑执行
  }
}

// 测试用的值对象
class TestValueObject extends ValueObject<string> {
  constructor(value: string) {
    super(value);
  }

  protected validateValue(value: string): void {
    if (value === null || value === undefined) {
      throw new Error("Value cannot be null or undefined");
    }
  }

  clone(): TestValueObject {
    return new TestValueObject(this.value);
  }

  protected createClone(
    value: string,
    createdAt: Date,
    version: number,
  ): TestValueObject {
    return new TestValueObject(value);
  }
}

// 测试用的领域事件
class TestDomainEvent extends DomainEvent {
  constructor(
    eventId: string,
    aggregateId: EntityId,
    version: number,
    data: unknown,
  ) {
    super(
      aggregateId,
      "TestDomainEvent",
      data,
      {},
      new EntityId(eventId),
      new Date(),
      version,
    );
  }

  getEventType(): string {
    return "TestDomainEvent";
  }

  getEventData(): unknown {
    return this.data;
  }

  validateEvent(): boolean {
    return true;
  }

  clone(): DomainEvent {
    return new TestDomainEvent(
      this.eventId.toString(),
      this.aggregateRootId,
      this.version,
      this.data,
    );
  }
}

// 测试用的聚合根
class TestAggregateRoot extends AggregateRoot {
  constructor(
    id: EntityId,
    public readonly name: string,
    public readonly value: number,
  ) {
    super(id);
  }

  clone(): AggregateRoot {
    return new TestAggregateRoot(this.id, this.name, this.value);
  }

  protected createClone(
    value: string,
    createdAt: Date,
    version: number,
  ): TestAggregateRoot {
    return new TestAggregateRoot(this.id, this.name, this.value);
  }

  public validateBusinessRules(): boolean {
    if (this.value < 0) {
      throw new Error("Value cannot be negative");
    }
    return true;
  }

  public executeBusinessLogic(): void {
    // 测试用的业务逻辑执行
  }

  protected performCoordination(): void {
    // 测试用的协调逻辑
  }

  protected performBusinessInvariantValidation(): boolean {
    // 测试用的业务不变量验证
    return this.value >= 0;
  }
}

describe("Factory Interfaces", () => {
  describe("Entity Factory", () => {
    it("should create entity with valid parameters", () => {
      const entityId = new EntityId(uuidv4());
      const entity = new TestEntity(entityId, "Test Entity", 100);

      expect(entity).toBeDefined();
      expect(entity.id.toString()).toBe(entityId.toString());
      expect(entity.name).toBe("Test Entity");
      expect(entity.value).toBe(100);
    });

    it("should clone entity correctly", () => {
      const entityId = new EntityId(uuidv4());
      const originalEntity = new TestEntity(entityId, "Test Entity", 100);
      const clonedEntity = originalEntity.clone();

      expect(clonedEntity).toBeDefined();
      expect(clonedEntity.id.toString()).toBe(originalEntity.id.toString());
      expect((clonedEntity as TestEntity).name).toBe(originalEntity.name);
      expect((clonedEntity as TestEntity).value).toBe(originalEntity.value);
    });

    it("should validate business rules", () => {
      const entityId = new EntityId(uuidv4());
      const validEntity = new TestEntity(entityId, "Test Entity", 100);
      const invalidEntity = new TestEntity(entityId, "Test Entity", -10);

      expect(() => validEntity.validateBusinessRules()).not.toThrow();
      expect(() => invalidEntity.validateBusinessRules()).toThrow(
        "Value cannot be negative",
      );
    });
  });

  describe("Value Object Factory", () => {
    it("should create value object with valid value", () => {
      const valueObject = new TestValueObject("test value");

      expect(valueObject).toBeDefined();
      expect(valueObject.value).toBe("test value");
    });

    it("should clone value object correctly", () => {
      const originalValueObject = new TestValueObject("test value");
      const clonedValueObject = originalValueObject.clone();

      expect(clonedValueObject).toBeDefined();
      expect(clonedValueObject.value).toBe(originalValueObject.value);
    });

    it("should validate value object value", () => {
      expect(() => new TestValueObject("valid value")).not.toThrow();
      expect(() => new TestValueObject(null as unknown as string)).toThrow(
        "Value cannot be null or undefined",
      );
    });
  });

  describe("Domain Event Factory", () => {
    it("should create domain event with valid parameters", () => {
      const eventId = uuidv4();
      const aggregateId = new EntityId(uuidv4());
      const event = new TestDomainEvent(eventId, aggregateId, 1, {
        test: "data",
      });

      expect(event).toBeDefined();
      expect(event.eventId.toString()).toBe(eventId);
      expect(event.aggregateRootId.toString()).toBe(aggregateId.toString());
      expect(event.version).toBe(1);
      expect(event.data).toEqual({ test: "data" });
    });

    it("should get event type correctly", () => {
      const eventId = uuidv4();
      const aggregateId = new EntityId(uuidv4());
      const event = new TestDomainEvent(eventId, aggregateId, 1, {
        test: "data",
      });

      expect(event.getEventType()).toBe("TestDomainEvent");
    });

    it("should get event data correctly", () => {
      const eventId = uuidv4();
      const aggregateId = new EntityId(uuidv4());
      const eventData = { test: "data" };
      const event = new TestDomainEvent(eventId, aggregateId, 1, eventData);

      expect(event.getEventData()).toEqual(eventData);
    });

    it("should clone domain event correctly", () => {
      const eventId = uuidv4();
      const aggregateId = new EntityId(uuidv4());
      const originalEvent = new TestDomainEvent(eventId, aggregateId, 1, {
        test: "data",
      });
      const clonedEvent = originalEvent.clone();

      expect(clonedEvent).toBeDefined();
      expect(clonedEvent.eventId.toString()).toBe(
        originalEvent.eventId.toString(),
      );
      expect(clonedEvent.aggregateRootId.toString()).toBe(
        originalEvent.aggregateRootId.toString(),
      );
      expect(clonedEvent.version).toBe(originalEvent.version);
      expect(clonedEvent.data).toEqual(originalEvent.data);
    });
  });

  describe("Aggregate Root Factory", () => {
    it("should create aggregate root with valid parameters", () => {
      const aggregateId = new EntityId(uuidv4());
      const aggregate = new TestAggregateRoot(
        aggregateId,
        "Test Aggregate",
        100,
      );

      expect(aggregate).toBeDefined();
      expect(aggregate.id.toString()).toBe(aggregateId.toString());
      expect(aggregate.name).toBe("Test Aggregate");
      expect(aggregate.value).toBe(100);
    });

    it("should clone aggregate root correctly", () => {
      const aggregateId = new EntityId(uuidv4());
      const originalAggregate = new TestAggregateRoot(
        aggregateId,
        "Test Aggregate",
        100,
      );
      const clonedAggregate = originalAggregate.clone();

      expect(clonedAggregate).toBeDefined();
      expect(clonedAggregate.id.toString()).toBe(
        originalAggregate.id.toString(),
      );
      expect((clonedAggregate as TestAggregateRoot).name).toBe(
        originalAggregate.name,
      );
      expect((clonedAggregate as TestAggregateRoot).value).toBe(
        originalAggregate.value,
      );
    });

    it("should validate business rules", () => {
      const aggregateId = new EntityId(uuidv4());
      const validAggregate = new TestAggregateRoot(
        aggregateId,
        "Test Aggregate",
        100,
      );
      const invalidAggregate = new TestAggregateRoot(
        aggregateId,
        "Test Aggregate",
        -10,
      );

      expect(() => validAggregate.validateBusinessRules()).not.toThrow();
      expect(() => invalidAggregate.validateBusinessRules()).toThrow(
        "Value cannot be negative",
      );
    });
  });

  describe("Factory Pattern Integration", () => {
    it("should create complex object hierarchy", () => {
      // 创建聚合根
      const aggregateId = new EntityId(uuidv4());
      const aggregate = new TestAggregateRoot(
        aggregateId,
        "Test Aggregate",
        100,
      );

      // 创建实体
      const entityId = new EntityId(uuidv4());
      const entity = new TestEntity(entityId, "Test Entity", 50);

      // 创建值对象
      const valueObject = new TestValueObject("test value");

      // 创建领域事件
      const eventId = uuidv4();
      const event = new TestDomainEvent(eventId, aggregateId, 1, {
        entity: entity.name,
        value: valueObject.value,
      });

      expect(aggregate).toBeDefined();
      expect(entity).toBeDefined();
      expect(valueObject).toBeDefined();
      expect(event).toBeDefined();

      // 验证对象之间的关系
      expect(event.aggregateRootId.toString()).toBe(aggregate.id.toString());
      expect((event.data as any).entity).toBe(entity.name);
      expect((event.data as any).value).toBe(valueObject.value);
    });

    it("should handle object cloning in complex hierarchy", () => {
      // 创建原始对象
      const aggregateId = new EntityId(uuidv4());
      const originalAggregate = new TestAggregateRoot(
        aggregateId,
        "Test Aggregate",
        100,
      );

      const entityId = new EntityId(uuidv4());
      const originalEntity = new TestEntity(entityId, "Test Entity", 50);

      const originalValueObject = new TestValueObject("test value");

      // 克隆对象
      const clonedAggregate = originalAggregate.clone();
      const clonedEntity = originalEntity.clone();
      const clonedValueObject = originalValueObject.clone();

      // 验证克隆结果
      expect(clonedAggregate).toBeDefined();
      expect(clonedEntity).toBeDefined();
      expect(clonedValueObject).toBeDefined();

      // 验证克隆的对象与原始对象具有相同的值
      expect((clonedAggregate as TestAggregateRoot).name).toBe(
        originalAggregate.name,
      );
      expect((clonedAggregate as TestAggregateRoot).value).toBe(
        originalAggregate.value,
      );
      expect((clonedEntity as TestEntity).name).toBe(originalEntity.name);
      expect((clonedEntity as TestEntity).value).toBe(originalEntity.value);
      expect(clonedValueObject.value).toBe(originalValueObject.value);
    });
  });
});
