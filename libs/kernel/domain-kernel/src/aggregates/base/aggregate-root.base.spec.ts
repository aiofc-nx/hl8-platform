/**
 * @fileoverview 聚合根基类测试
 * @description 测试AggregateRoot基类的各种功能
 */

import { AggregateRoot, DomainEvent } from "./aggregate-root.base.js";
import { InternalEntity } from "../../entities/internal/internal-entity.base.js";
import { EntityId } from "../../identifiers/entity-id.js";
import { AuditInfo } from "../../audit/audit-info.js";
import { EntityLifecycle } from "../../entities/base/entity-lifecycle.enum.js";

// 测试用的具体聚合根实现
class TestAggregateRoot extends AggregateRoot {
  private _data: string = "";

  constructor(
    id?: EntityId,
    auditInfo?: AuditInfo,
    lifecycleState: EntityLifecycle = EntityLifecycle.CREATED,
    version: number = 1,
  ) {
    super(id, auditInfo, lifecycleState, version);
  }

  public get data(): string {
    return this._data;
  }

  public set data(value: string) {
    this._data = value;
  }

  protected performCoordination(operation: string, params: unknown): unknown {
    if (operation === "updateData") {
      const newData = (params as { data: string }).data;
      this._data = newData;
      return { success: true, data: newData };
    }
    return { success: false, error: "未知操作" };
  }

  protected performBusinessInvariantValidation(): boolean {
    return this._data.length >= 0; // 简单的业务不变量：数据长度不能为负
  }

  public validateBusinessRules(): boolean {
    return this._data.length >= 0;
  }

  public executeBusinessLogic(operation: string, params: unknown): unknown {
    if (operation === "updateData") {
      const newData = (params as { data: string }).data;
      this._data = newData;
      return { success: true, data: newData };
    }
    return { success: false, error: "未知操作" };
  }

  public clone(): AggregateRoot {
    const cloned = new TestAggregateRoot(
      this.id,
      this.auditInfo,
      this.lifecycleState,
      this.version,
    );
    cloned._data = this._data;
    return cloned;
  }
}

// 测试用的内部实体实现
class TestInternalEntity extends InternalEntity {
  private _value: string;

  constructor(
    aggregateRootId: EntityId,
    value: string,
    id?: EntityId,
    auditInfo?: AuditInfo,
    lifecycleState: EntityLifecycle = EntityLifecycle.CREATED,
    version: number = 1,
  ) {
    super(aggregateRootId, id, auditInfo, lifecycleState, version);
    this._value = value;
  }

  public get value(): string {
    return this._value;
  }

  public set value(val: string) {
    this._value = val;
  }

  public getBusinessState(): unknown {
    return { value: this._value };
  }

  public setBusinessState(state: unknown): void {
    this._value = (state as { value: string }).value;
  }

  protected performBusinessOperation(params: unknown): unknown {
    return { result: this._value, operation: "test" };
  }

  protected performStateUpdate(newState: unknown): void {
    this._value = newState as string;
  }

  protected performNotification(event: unknown): void {
    // 模拟通知
  }

  protected performBusinessRuleValidation(): boolean {
    return this._value != null && this._value !== undefined;
  }

  public clone(): InternalEntity {
    return new TestInternalEntity(
      this.aggregateRootId,
      this._value,
      this.id,
      this.auditInfo,
      this.lifecycleState,
      this.version,
    );
  }
}

describe("AggregateRoot", () => {
  let aggregateRoot: TestAggregateRoot;
  let entityId: EntityId;
  let auditInfo: AuditInfo;

  beforeEach(() => {
    entityId = new EntityId();
    auditInfo = AuditInfo.create(entityId);
    aggregateRoot = new TestAggregateRoot(entityId, auditInfo);
  });

  describe("构造函数", () => {
    it("应该创建有效的聚合根", () => {
      expect(aggregateRoot.id.equals(entityId)).toBe(true);
      expect(aggregateRoot.auditInfo.equals(auditInfo)).toBe(true);
      expect(aggregateRoot.lifecycleState).toBe(EntityLifecycle.CREATED);
      expect(aggregateRoot.version).toBe(1);
    });

    it("应该自动生成标识符和审计信息", () => {
      const autoAggregate = new TestAggregateRoot();

      expect(autoAggregate.id).toBeDefined();
      expect(autoAggregate.auditInfo).toBeDefined();
      expect(autoAggregate.lifecycleState).toBe(EntityLifecycle.CREATED);
    });
  });

  describe("内部实体管理", () => {
    let internalEntity: TestInternalEntity;

    beforeEach(() => {
      internalEntity = new TestInternalEntity(aggregateRoot.id, "test value");
      internalEntity.activate(); // 激活内部实体以允许业务操作
    });

    it("应该添加内部实体", () => {
      aggregateRoot.addInternalEntity(internalEntity);

      expect(aggregateRoot.internalEntities.size).toBe(1);
      expect(aggregateRoot.getInternalEntity(internalEntity.id)).toBe(
        internalEntity,
      );
    });

    it("应该拒绝添加无效的内部实体", () => {
      const invalidEntity = new TestInternalEntity(new EntityId(), "invalid");

      expect(() => aggregateRoot.addInternalEntity(invalidEntity)).toThrow(
        "内部实体不属于此聚合根",
      );
    });

    it("应该拒绝添加重复的内部实体", () => {
      aggregateRoot.addInternalEntity(internalEntity);

      expect(() => aggregateRoot.addInternalEntity(internalEntity)).toThrow(
        "内部实体已存在",
      );
    });

    it("应该移除内部实体", () => {
      aggregateRoot.addInternalEntity(internalEntity);
      aggregateRoot.removeInternalEntity(internalEntity.id);

      expect(aggregateRoot.internalEntities.size).toBe(0);
      expect(
        aggregateRoot.getInternalEntity(internalEntity.id),
      ).toBeUndefined();
    });

    it("应该拒绝移除不存在的内部实体", () => {
      const nonExistentId = new EntityId();

      expect(() => aggregateRoot.removeInternalEntity(nonExistentId)).toThrow(
        "内部实体不存在",
      );
    });

    it("应该获取内部实体", () => {
      aggregateRoot.addInternalEntity(internalEntity);
      const retrieved = aggregateRoot.getInternalEntity(internalEntity.id);

      expect(retrieved).toBe(internalEntity);
    });
  });

  describe("业务操作协调", () => {
    beforeEach(() => {
      aggregateRoot.activate();
    });

    it("应该协调业务操作", () => {
      const result = aggregateRoot.coordinateBusinessOperation("updateData", {
        data: "new data",
      });

      expect(result).toEqual({ success: true, data: "new data" });
      expect(aggregateRoot.data).toBe("new data");
    });

    it("应该拒绝在无效状态下协调业务操作", () => {
      aggregateRoot.delete();

      expect(() =>
        aggregateRoot.coordinateBusinessOperation("updateData", {}),
      ).toThrow("聚合根状态不允许执行业务操作");
    });

    it("应该验证业务不变量", () => {
      expect(aggregateRoot.validateBusinessInvariants()).toBe(true);
    });
  });

  describe("领域事件管理", () => {
    it("应该添加领域事件", () => {
      const event: DomainEvent = {
        type: "TestEvent",
        aggregateRootId: aggregateRoot.id,
        timestamp: new Date(),
        data: { test: "data" },
      };

      aggregateRoot.addDomainEvent(event);

      expect(aggregateRoot.domainEvents).toHaveLength(1);
      expect(aggregateRoot.domainEvents[0]).toBe(event);
    });

    it("应该获取领域事件", () => {
      const event: DomainEvent = {
        type: "TestEvent",
        aggregateRootId: aggregateRoot.id,
        timestamp: new Date(),
        data: { test: "data" },
      };

      aggregateRoot.addDomainEvent(event);
      const events = aggregateRoot.getDomainEvents();

      expect(events).toHaveLength(1);
      expect(events[0]).toBe(event);
    });

    it("应该清空领域事件", () => {
      const event: DomainEvent = {
        type: "TestEvent",
        aggregateRootId: aggregateRoot.id,
        timestamp: new Date(),
        data: { test: "data" },
      };

      aggregateRoot.addDomainEvent(event);
      aggregateRoot.clearDomainEvents();

      expect(aggregateRoot.domainEvents).toHaveLength(0);
    });

    it("应该在添加内部实体时发布事件", () => {
      const internalEntity = new TestInternalEntity(aggregateRoot.id, "test");
      internalEntity.activate(); // 激活内部实体
      aggregateRoot.addInternalEntity(internalEntity);

      const events = aggregateRoot.getDomainEvents();
      expect(events).toHaveLength(1);
      expect(events[0].type).toBe("InternalEntityAdded");
    });

    it("应该在移除内部实体时发布事件", () => {
      const internalEntity = new TestInternalEntity(aggregateRoot.id, "test");
      internalEntity.activate(); // 激活内部实体
      aggregateRoot.addInternalEntity(internalEntity);
      aggregateRoot.removeInternalEntity(internalEntity.id);

      const events = aggregateRoot.getDomainEvents();
      expect(events).toHaveLength(2);
      expect(events[1].type).toBe("InternalEntityRemoved");
    });
  });

  describe("equals", () => {
    it("应该正确比较相等的聚合根", () => {
      const sameAggregate = new TestAggregateRoot(entityId, auditInfo);
      sameAggregate.data = aggregateRoot.data;

      expect(aggregateRoot.equals(sameAggregate)).toBe(true);
    });

    it("应该正确比较不相等的聚合根", () => {
      const differentAggregate = new TestAggregateRoot();
      differentAggregate.data = "different";

      expect(aggregateRoot.equals(differentAggregate)).toBe(false);
    });

    it("应该正确处理非AggregateRoot对象", () => {
      const other = { id: entityId };
      expect(aggregateRoot.equals(other as any)).toBe(false);
    });
  });

  describe("toJSON", () => {
    it("应该返回JSON表示", () => {
      const internalEntity = new TestInternalEntity(aggregateRoot.id, "test");
      internalEntity.activate(); // 激活内部实体
      aggregateRoot.addInternalEntity(internalEntity);

      const json = aggregateRoot.toJSON();

      expect(json).toHaveProperty("id");
      expect(json).toHaveProperty("auditInfo");
      expect(json).toHaveProperty("lifecycleState");
      expect(json).toHaveProperty("version");
      expect(json).toHaveProperty("internalEntities");
      expect(json).toHaveProperty("domainEvents");
    });
  });

  describe("clone", () => {
    it("应该创建聚合根的副本", () => {
      aggregateRoot.data = "test data";
      const cloned = aggregateRoot.clone() as TestAggregateRoot;

      expect(cloned).not.toBe(aggregateRoot);
      expect(cloned.equals(aggregateRoot)).toBe(true);
      expect(cloned.data).toBe(aggregateRoot.data);
    });
  });

  describe("继承功能", () => {
    it("应该继承Entity的所有功能", () => {
      expect(aggregateRoot.id).toBeDefined();
      expect(aggregateRoot.auditInfo).toBeDefined();
      expect(aggregateRoot.lifecycleState).toBeDefined();
      expect(aggregateRoot.version).toBeDefined();
      expect(aggregateRoot.createdAt).toBeDefined();
      expect(aggregateRoot.updatedAt).toBeDefined();
    });

    it("应该支持生命周期管理", () => {
      aggregateRoot.activate();
      expect(aggregateRoot.isActive()).toBe(true);

      aggregateRoot.deactivate();
      expect(aggregateRoot.isActive()).toBe(false);
    });
  });
});
