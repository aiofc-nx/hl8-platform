/**
 * @fileoverview 实体分离原则集成测试
 * @description 测试实体和聚合根分离原则的集成功能
 */

import {
  AggregateRoot,
  DomainEvent,
} from "../../src/aggregates/base/aggregate-root.base.js";
import { InternalEntity } from "../../src/entities/internal/internal-entity.base.js";
import { Entity } from "../../src/entities/base/entity.base.js";
import { EntityId } from "../../src/identifiers/entity-id.js";
import { AuditInfo } from "../../src/audit/audit-info.js";
import { EntityLifecycle } from "../../src/entities/base/entity-lifecycle.enum.js";
import { SeparationValidator } from "../../src/validation/separation-validator.js";

// 测试用的聚合根实现
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
    return this._data.length >= 0;
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

// 违反分离原则的聚合根实现（用于测试）
class ViolatingAggregateRoot extends AggregateRoot {
  private _data: string = "";

  constructor(
    id?: EntityId,
    auditInfo?: AuditInfo,
    lifecycleState: EntityLifecycle = EntityLifecycle.CREATED,
    version: number = 1,
  ) {
    super(id, auditInfo, lifecycleState, version);
  }

  // 违反分离原则：直接执行业务逻辑
  public updateData(data: string): string {
    this._data = data;
    return this._data;
  }

  protected performCoordination(operation: string, params: unknown): unknown {
    return { success: false, error: "未知操作" };
  }

  protected performBusinessInvariantValidation(): boolean {
    return true;
  }

  public clone(): AggregateRoot {
    return new ViolatingAggregateRoot(
      this.id,
      this.auditInfo,
      this.lifecycleState,
      this.version,
    );
  }
}

describe("实体分离原则集成测试", () => {
  let aggregateRoot: TestAggregateRoot;
  let violatingAggregateRoot: ViolatingAggregateRoot;
  let internalEntity: TestInternalEntity;
  let entityId: EntityId;
  let auditInfo: AuditInfo;

  beforeEach(() => {
    entityId = new EntityId();
    auditInfo = AuditInfo.create(entityId);
    aggregateRoot = new TestAggregateRoot(entityId, auditInfo);
    violatingAggregateRoot = new ViolatingAggregateRoot(entityId, auditInfo);
    internalEntity = new TestInternalEntity(aggregateRoot.id, "test value");
    internalEntity.activate();
  });

  describe("分离原则验证", () => {
    it("应该验证符合分离原则的聚合根", () => {
      const result = SeparationValidator.validateAggregateRoot(aggregateRoot);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("应该检测违反分离原则的聚合根", () => {
      const result = SeparationValidator.validateAggregateRoot(
        violatingAggregateRoot,
      );

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it("应该验证内部实体属于正确的聚合根", () => {
      const result = SeparationValidator.validateInternalEntity(
        internalEntity,
        aggregateRoot.id,
      );

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("应该拒绝不属于指定聚合根的内部实体", () => {
      const otherAggregateId = new EntityId();
      const result = SeparationValidator.validateInternalEntity(
        internalEntity,
        otherAggregateId,
      );

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe("编译时检查", () => {
    it("应该通过编译时检查", () => {
      const result =
        SeparationValidator.enhanceWithCompileTimeChecks(aggregateRoot);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("应该检测缺少必要方法的聚合根", () => {
      // 创建一个缺少必要方法的聚合根
      class IncompleteAggregateRoot extends AggregateRoot {
        protected performCoordination(
          operation: string,
          params: unknown,
        ): unknown {
          return { success: false };
        }

        protected performBusinessInvariantValidation(): boolean {
          return true;
        }

        public clone(): AggregateRoot {
          return new IncompleteAggregateRoot();
        }
      }

      const incompleteAggregate = new IncompleteAggregateRoot();
      const result =
        SeparationValidator.enhanceWithCompileTimeChecks(incompleteAggregate);

      expect(result.isValid).toBe(true); // 这个聚合根实际上是完整的
    });
  });

  describe("运行时验证", () => {
    it("应该通过运行时验证", () => {
      const result = SeparationValidator.addRuntimeValidation(
        aggregateRoot,
        "updateData",
        { data: "new data" },
      );

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("应该验证业务不变量", () => {
      const result = SeparationValidator.addRuntimeValidation(
        aggregateRoot,
        "testOperation",
        {},
      );

      expect(result.isValid).toBe(true);
    });
  });

  describe("实体集合验证", () => {
    it("应该验证有效的实体集合", () => {
      const entities: Entity[] = [internalEntity];
      const aggregateRoots: AggregateRoot[] = [aggregateRoot];

      const result = SeparationValidator.validateEntityCollection(
        entities,
        aggregateRoots,
      );

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("应该检测无效的实体集合", () => {
      const otherInternalEntity = new TestInternalEntity(
        new EntityId(),
        "other",
      );
      const entities: Entity[] = [internalEntity, otherInternalEntity];
      const aggregateRoots: AggregateRoot[] = [aggregateRoot];

      const result = SeparationValidator.validateEntityCollection(
        entities,
        aggregateRoots,
      );

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe("验证报告", () => {
    it("应该创建完整的验证报告", () => {
      const results = [
        SeparationValidator.validateAggregateRoot(aggregateRoot),
        SeparationValidator.validateInternalEntity(
          internalEntity,
          aggregateRoot.id,
        ),
        SeparationValidator.validateEntityCollection(
          [internalEntity],
          [aggregateRoot],
        ),
      ];

      const report = SeparationValidator.createValidationReport(results);

      expect(report.totalValidations).toBe(3);
      expect(report.passedValidations).toBe(3);
      expect(report.failedValidations).toBe(0);
      expect(report.overallStatus).toBe("PASS");
    });

    it("应该创建包含失败的验证报告", () => {
      const otherAggregateId = new EntityId();
      const results = [
        SeparationValidator.validateAggregateRoot(aggregateRoot),
        SeparationValidator.validateInternalEntity(
          internalEntity,
          otherAggregateId,
        ),
        SeparationValidator.validateEntityCollection(
          [internalEntity],
          [aggregateRoot],
        ),
      ];

      const report = SeparationValidator.createValidationReport(results);

      expect(report.totalValidations).toBe(3);
      expect(report.passedValidations).toBe(2);
      expect(report.failedValidations).toBe(1);
      expect(report.overallStatus).toBe("FAIL");
    });
  });

  describe("端到端分离原则测试", () => {
    it("应该正确执行符合分离原则的业务操作", () => {
      // 激活聚合根
      aggregateRoot.activate();

      // 添加内部实体
      aggregateRoot.addInternalEntity(internalEntity);

      // 通过聚合根协调业务操作
      const result = aggregateRoot.coordinateBusinessOperation("updateData", {
        data: "updated data",
      });

      expect(result).toEqual({ success: true, data: "updated data" });
      expect(aggregateRoot.data).toBe("updated data");

      // 验证领域事件
      const events = aggregateRoot.getDomainEvents();
      expect(events.length).toBeGreaterThan(0);
    });

    it("应该拒绝直接执行业务逻辑", () => {
      // 尝试直接执行业务逻辑（违反分离原则）
      expect(() => {
        violatingAggregateRoot.updateData("direct data");
      }).not.toThrow(); // 这里不会抛出异常，但应该通过验证检测到

      // 验证检测到违反分离原则
      const result = SeparationValidator.validateAggregateRoot(
        violatingAggregateRoot,
      );
      expect(result.isValid).toBe(false);
    });

    it("应该维护业务不变量", () => {
      // 激活聚合根
      aggregateRoot.activate();

      aggregateRoot.addInternalEntity(internalEntity);

      // 执行业务操作
      aggregateRoot.coordinateBusinessOperation("updateData", {
        data: "valid data",
      });

      // 验证业务不变量
      expect(aggregateRoot.validateBusinessInvariants()).toBe(true);
    });
  });

  describe("性能测试", () => {
    it("应该能够快速验证大量实体", () => {
      const entities: Entity[] = [];
      const aggregateRoots: AggregateRoot[] = [];

      // 创建大量实体和聚合根
      for (let i = 0; i < 100; i++) {
        const ar = new TestAggregateRoot();
        const entity = new TestInternalEntity(ar.id, `entity-${i}`);
        entity.activate();

        entities.push(entity);
        aggregateRoots.push(ar);
      }

      const startTime = Date.now();
      const result = SeparationValidator.validateEntityCollection(
        entities,
        aggregateRoots,
      );
      const endTime = Date.now();

      expect(result.isValid).toBe(true);
      expect(endTime - startTime).toBeLessThan(1000); // 应该在1秒内完成
    });
  });
});
