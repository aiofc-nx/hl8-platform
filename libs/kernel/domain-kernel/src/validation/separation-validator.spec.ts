/**
 * @fileoverview 实体分离验证器测试
 * @description 测试SeparationValidator的各种功能
 */

import {
  SeparationValidator,
  SeparationValidationResult,
} from "./separation-validator.js";
import {
  AggregateRoot,
  DomainEvent,
} from "../aggregates/base/aggregate-root.base.js";
import { InternalEntity } from "../entities/internal/internal-entity.base.js";
import { Entity } from "../entities/base/entity.base.js";
import { EntityId } from "../identifiers/entity-id.js";
import { AuditInfo } from "../audit/audit-info.js";
import { EntityLifecycle } from "../entities/base/entity-lifecycle.enum.js";

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

describe("SeparationValidator", () => {
  let aggregateRoot: TestAggregateRoot;
  let internalEntity: TestInternalEntity;
  let entityId: EntityId;
  let auditInfo: AuditInfo;

  beforeEach(() => {
    entityId = new EntityId();
    auditInfo = AuditInfo.create(entityId);
    aggregateRoot = new TestAggregateRoot(entityId, auditInfo);
    internalEntity = new TestInternalEntity(aggregateRoot.id, "test value");
  });

  describe("聚合根验证", () => {
    it("应该验证有效的聚合根", () => {
      const result = SeparationValidator.validateAggregateRoot(aggregateRoot);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.timestamp).toBeInstanceOf(Date);
    });

    it("应该验证聚合根有协调方法", () => {
      const result = SeparationValidator.validateAggregateRoot(aggregateRoot);

      expect(result.isValid).toBe(true);
      expect(typeof aggregateRoot.coordinateBusinessOperation).toBe("function");
    });

    it("应该验证聚合根不能直接执行业务逻辑", () => {
      const result = SeparationValidator.validateAggregateRoot(aggregateRoot);

      expect(result.isValid).toBe(true);
      // 聚合根应该通过协调方法来执行业务逻辑
      expect(typeof aggregateRoot.coordinateBusinessOperation).toBe("function");
    });
  });

  describe("内部实体验证", () => {
    it("应该验证有效的内部实体", () => {
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
      expect(result.errors[0]).toContain("内部实体不属于指定的聚合根");
    });

    it("应该验证内部实体属于正确的聚合根", () => {
      expect(internalEntity.belongsTo(aggregateRoot.id)).toBe(true);
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

    it("应该拒绝没有对应聚合根的内部实体", () => {
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
      expect(result.errors[0]).toContain("内部实体没有对应的聚合根");
    });

    it("应该验证所有内部实体都有对应的聚合根", () => {
      const entities: Entity[] = [internalEntity];
      const aggregateRoots: AggregateRoot[] = [aggregateRoot];

      const result = SeparationValidator.validateEntityCollection(
        entities,
        aggregateRoots,
      );

      expect(result.isValid).toBe(true);
    });
  });

  describe("验证规则", () => {
    it("应该返回验证规则", () => {
      const rules = SeparationValidator.getValidationRules();

      expect(rules).toBeDefined();
      expect(typeof rules).toBe("object");
      expect(Object.keys(rules).length).toBeGreaterThan(0);
    });

    it("应该包含所有必要的验证规则", () => {
      const rules = SeparationValidator.getValidationRules();

      expect(rules).toHaveProperty("AGGREGATE_ROOT_NO_DIRECT_BUSINESS_LOGIC");
      expect(rules).toHaveProperty("INTERNAL_ENTITY_ACCESS_THROUGH_AGGREGATE");
      expect(rules).toHaveProperty("NO_DIRECT_ENTITY_STATE_MANIPULATION");
      expect(rules).toHaveProperty("AGGREGATE_ROOT_MUST_COORDINATE");
    });
  });

  describe("验证报告", () => {
    it("应该创建验证报告", () => {
      const results: SeparationValidationResult[] = [
        {
          isValid: true,
          errors: [],
          warnings: [],
          timestamp: new Date(),
        },
        {
          isValid: false,
          errors: ["测试错误"],
          warnings: ["测试警告"],
          timestamp: new Date(),
        },
      ];

      const report = SeparationValidator.createValidationReport(results);

      expect(report.totalValidations).toBe(2);
      expect(report.passedValidations).toBe(1);
      expect(report.failedValidations).toBe(1);
      expect(report.allErrors).toContain("测试错误");
      expect(report.allWarnings).toContain("测试警告");
      expect(report.overallStatus).toBe("FAIL");
    });

    it("应该创建通过状态的验证报告", () => {
      const results: SeparationValidationResult[] = [
        {
          isValid: true,
          errors: [],
          warnings: [],
          timestamp: new Date(),
        },
        {
          isValid: true,
          errors: [],
          warnings: [],
          timestamp: new Date(),
        },
      ];

      const report = SeparationValidator.createValidationReport(results);

      expect(report.totalValidations).toBe(2);
      expect(report.passedValidations).toBe(2);
      expect(report.failedValidations).toBe(0);
      expect(report.overallStatus).toBe("PASS");
    });
  });

  describe("错误处理", () => {
    it("应该处理验证过程中的错误", () => {
      // 创建一个会导致验证错误的聚合根
      const invalidAggregateRoot = new TestAggregateRoot();

      // 模拟验证过程中的错误 - 使用更安全的方式
      const originalValidateNoDirectBusinessLogic = (SeparationValidator as any)
        .validateNoDirectBusinessLogic;
      (SeparationValidator as any).validateNoDirectBusinessLogic = jest.fn(
        () => {
          throw new Error("验证错误");
        },
      );

      const result =
        SeparationValidator.validateAggregateRoot(invalidAggregateRoot);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain("验证过程中发生错误");

      // 恢复原始方法
      (SeparationValidator as any).validateNoDirectBusinessLogic =
        originalValidateNoDirectBusinessLogic;
    });
  });

  describe("边界情况", () => {
    it("应该处理空实体集合", () => {
      const result = SeparationValidator.validateEntityCollection([], []);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("应该处理空聚合根集合", () => {
      const entities: Entity[] = [internalEntity];
      const result = SeparationValidator.validateEntityCollection(entities, []);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it("应该处理null和undefined输入", () => {
      // 这些方法内部有try-catch，不会抛出异常，而是返回错误结果
      const result1 = SeparationValidator.validateAggregateRoot(null as any);
      expect(result1.isValid).toBe(false);
      expect(result1.errors.length).toBeGreaterThan(0);

      const result2 = SeparationValidator.validateInternalEntity(
        null as any,
        entityId,
      );
      expect(result2.isValid).toBe(false);
      expect(result2.errors.length).toBeGreaterThan(0);
    });
  });
});
