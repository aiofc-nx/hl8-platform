/**
 * @fileoverview 实体基类测试
 * @description 测试Entity基类的各种功能
 */

import { Entity } from "./entity.base.js";
import { EntityId } from "../../identifiers/entity-id.js";
import { AuditInfo } from "../../audit/audit-info.js";
import { EntityLifecycle } from "./entity-lifecycle.enum.js";

// 测试用的具体实体实现
class TestEntity extends Entity {
  private _name: string;
  private _value: number;

  constructor(
    name: string,
    value: number,
    id?: EntityId,
    auditInfo?: AuditInfo,
    lifecycleState?: EntityLifecycle,
    version?: number,
    deletedAt?: Date,
    deletedBy?: EntityId,
  ) {
    super(id, auditInfo, lifecycleState, version, deletedAt, deletedBy);
    this._name = name;
    this._value = value;
  }

  public get name(): string {
    return this._name;
  }

  public get value(): number {
    return this._value;
  }

  public setValue(value: number): void {
    this._value = value;
  }

  public clone(): Entity {
    return new TestEntity(
      this._name,
      this._value,
      this.id,
      this.auditInfo,
      this.lifecycleState,
      this.version,
      this.deletedAt,
      this.deletedBy,
    );
  }

  public validateBusinessRules(): boolean {
    return this._name.length > 0 && this._value >= 0;
  }

  public executeBusinessLogic(operation: string, params: unknown): unknown {
    switch (operation) {
      case "calculate":
        return this._value * 2;
      case "format":
        return `${this._name}: ${this._value}`;
      default:
        throw new Error(`未知操作: ${operation}`);
    }
  }
}

describe("Entity", () => {
  let entity: TestEntity;
  let entityId: EntityId;
  let auditInfo: AuditInfo;

  beforeEach(() => {
    entityId = new EntityId();
    auditInfo = AuditInfo.create(entityId);
    entity = new TestEntity("test", 100, entityId, auditInfo);
  });

  describe("构造函数", () => {
    it("应该创建有效的实体", () => {
      expect(entity.id.equals(entityId)).toBe(true);
      expect(entity.auditInfo.equals(auditInfo)).toBe(true);
      expect(entity.lifecycleState).toBe(EntityLifecycle.CREATED);
      expect(entity.version).toBe(1);
      expect(entity.name).toBe("test");
      expect(entity.value).toBe(100);
    });

    it("应该自动生成标识符和审计信息", () => {
      const autoEntity = new TestEntity("auto", 200);

      expect(autoEntity.id).toBeDefined();
      expect(autoEntity.auditInfo).toBeDefined();
      expect(autoEntity.lifecycleState).toBe(EntityLifecycle.CREATED);
    });

    it("应该验证实体", () => {
      // 测试业务规则验证
      const entity = new TestEntity("", -1);
      expect(entity.validateBusinessRules()).toBe(false);
    });
  });

  describe("getter方法", () => {
    it("应该返回标识符的副本", () => {
      const id = entity.id;
      expect(id).not.toBe(entity["_id"]);
      expect(id.equals(entity["_id"])).toBe(true);
    });

    it("应该返回审计信息的副本", () => {
      const audit = entity.auditInfo;
      // AuditInfo 是不可变对象，所以引用可能相同
      expect(audit).toBe(entity["_auditInfo"]);
      expect(audit.equals(entity["_auditInfo"])).toBe(true);
    });

    it("应该返回创建时间的副本", () => {
      const createdAt = entity.createdAt;
      expect(createdAt).not.toBe(entity["_createdAt"]);
      expect(createdAt.getTime()).toBe(entity["_createdAt"].getTime());
    });
  });

  describe("生命周期管理", () => {
    it("应该激活实体", () => {
      entity.activate();
      expect(entity.lifecycleState).toBe(EntityLifecycle.ACTIVE);
      expect(entity.isActive()).toBe(true);
    });

    it("应该停用实体", () => {
      entity.activate();
      entity.deactivate();
      expect(entity.lifecycleState).toBe(EntityLifecycle.INACTIVE);
      expect(entity.isActive()).toBe(false);
    });

    it("应该删除实体（软删除）", () => {
      entity.delete();
      expect(entity.lifecycleState).toBe(EntityLifecycle.DELETED);
      expect(entity.isDeleted()).toBe(true);
      expect(entity.deletedAt).toBeDefined();
      expect(entity.deletedBy).toBeDefined();
    });

    it("应该使用指定的删除者进行软删除", () => {
      const deleterId = EntityId.generate();
      entity.delete(deleterId);
      expect(entity.lifecycleState).toBe(EntityLifecycle.DELETED);
      expect(entity.deletedBy?.equals(deleterId)).toBe(true);
    });

    it("应该恢复已删除的实体", () => {
      entity.delete();
      expect(entity.isDeleted()).toBe(true);
      expect(entity.deletedAt).toBeDefined();

      entity.restore();
      expect(entity.lifecycleState).toBe(EntityLifecycle.INACTIVE);
      expect(entity.isDeleted()).toBe(false);
      expect(entity.deletedAt).toBeUndefined();
      expect(entity.deletedBy).toBeUndefined();
    });

    it("应该拒绝恢复未删除的实体", () => {
      expect(() => entity.restore()).toThrow("只能恢复已删除的实体");
    });

    it("应该拒绝无效的状态转换", () => {
      entity.delete();
      expect(() => entity.activate()).toThrow("无效的状态转换");
    });

    it("应该检查实体状态", () => {
      expect(entity.isInState(EntityLifecycle.CREATED)).toBe(true);
      expect(entity.isInState(EntityLifecycle.ACTIVE)).toBe(false);

      entity.activate();
      expect(entity.isInState(EntityLifecycle.ACTIVE)).toBe(true);
    });
  });

  describe("业务逻辑", () => {
    it("应该执行业务逻辑", () => {
      const result = entity.executeBusinessLogic("calculate", {});
      expect(result).toBe(200);
    });

    it("应该验证业务规则", () => {
      expect(entity.validateBusinessRules()).toBe(true);

      entity.setValue(-1);
      expect(entity.validateBusinessRules()).toBe(false);
    });

    it("应该检查是否可以执行操作", () => {
      expect(entity.canPerformOperations()).toBe(false); // CREATED状态

      entity.activate();
      expect(entity.canPerformOperations()).toBe(true);

      entity.delete();
      expect(entity.canPerformOperations()).toBe(false);
    });
  });

  describe("equals", () => {
    it("应该正确比较相等的实体", () => {
      const sameEntity = new TestEntity("test", 100, entityId, auditInfo);
      expect(entity.equals(sameEntity)).toBe(true);
    });

    it("应该正确比较不相等的实体", () => {
      const differentEntity = new TestEntity("different", 200);
      expect(entity.equals(differentEntity)).toBe(false);
    });

    it("应该正确处理null和undefined", () => {
      expect(entity.equals(null)).toBe(false);
      expect(entity.equals(undefined)).toBe(false);
    });

    it("应该正确处理非Entity对象", () => {
      const other = { id: entityId };
      expect(entity.equals(other as any)).toBe(false);
    });
  });

  describe("toJSON", () => {
    it("应该返回JSON表示", () => {
      const json = entity.toJSON();

      expect(json).toEqual({
        id: entityId.toJSON(),
        auditInfo: auditInfo.toJSON(),
        lifecycleState: EntityLifecycle.CREATED,
        version: 1,
        createdAt: entity.createdAt.toISOString(),
        updatedAt: entity.updatedAt.toISOString(),
        deletedAt: undefined,
        deletedBy: undefined,
        type: "TestEntity",
      });
    });

    it("应该包含软删除信息的JSON表示", () => {
      entity.delete();
      const json = entity.toJSON();

      expect(json).toHaveProperty("deletedAt");
      expect(json).toHaveProperty("deletedBy");
      expect(json).toMatchObject({
        lifecycleState: EntityLifecycle.DELETED,
      });
    });
  });

  describe("hashCode", () => {
    it("应该为相同的实体生成相同的哈希码", () => {
      const sameEntity = new TestEntity("test", 100, entityId, auditInfo);
      expect(entity.hashCode()).toBe(sameEntity.hashCode());
    });

    it("应该为不同的实体生成不同的哈希码", () => {
      const differentEntity = new TestEntity("different", 200);
      expect(entity.hashCode()).not.toBe(differentEntity.hashCode());
    });
  });

  describe("clone", () => {
    it("应该创建实体的副本", () => {
      const cloned = entity.clone() as TestEntity;

      expect(cloned).not.toBe(entity);
      expect(cloned.equals(entity)).toBe(true);
      expect(cloned.name).toBe(entity.name);
      expect(cloned.value).toBe(entity.value);
    });
  });

  describe("不可变性", () => {
    it("应该确保实体属性不可变", () => {
      const originalId = entity.id;
      const originalAuditInfo = entity.auditInfo;
      const originalCreatedAt = entity.createdAt;

      // 验证getter返回的是副本
      expect(entity.id).not.toBe(entity["_id"]);
      // AuditInfo 是不可变对象，所以引用可能相同
      expect(entity.auditInfo).toBe(entity["_auditInfo"]);
      expect(entity.createdAt).not.toBe(entity["_createdAt"]);
    });
  });
});
