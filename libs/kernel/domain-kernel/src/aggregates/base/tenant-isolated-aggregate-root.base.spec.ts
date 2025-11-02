/**
 * @fileoverview 租户隔离聚合根基类测试
 * @description 测试 TenantIsolatedAggregateRoot 基类的各种功能
 */

import { TenantIsolatedAggregateRoot } from "./tenant-isolated-aggregate-root.base.js";
import { TenantId } from "../../identifiers/tenant-id.js";
import { OrganizationId } from "../../identifiers/organization-id.js";
import { DepartmentId } from "../../identifiers/department-id.js";
import { EntityId } from "../../identifiers/entity-id.js";
import { AuditInfo } from "../../audit/audit-info.js";
import { EntityLifecycle } from "../../entities/base/entity-lifecycle.enum.js";
import { TenantContext } from "../../context/tenant-context.js";
import type { DomainEvent } from "./aggregate-root.base.js";

// 测试用的具体聚合根实现
class TestTenantIsolatedAggregateRoot extends TenantIsolatedAggregateRoot {
  private _data: string = "";

  constructor(
    tenantId: TenantId,
    organizationId?: OrganizationId,
    departmentId?: DepartmentId,
    id?: EntityId,
    auditInfo?: AuditInfo,
    lifecycleState: EntityLifecycle = EntityLifecycle.CREATED,
    version: number = 1,
  ) {
    super(
      tenantId,
      organizationId,
      departmentId,
      id,
      auditInfo,
      lifecycleState,
      version,
    );
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
    return { success: false };
  }

  protected performBusinessInvariantValidation(): boolean {
    return this._data.length >= 0;
  }

  public clone(): TenantIsolatedAggregateRoot {
    const cloned = new TestTenantIsolatedAggregateRoot(
      this.tenantId,
      this.organizationId,
      this.departmentId,
      this.id,
      this.auditInfo,
      this.lifecycleState,
      this.version,
    );
    cloned._data = this._data;
    return cloned;
  }
}

describe("TenantIsolatedAggregateRoot", () => {
  let tenantId: TenantId;
  let organizationId: OrganizationId;
  let departmentId: DepartmentId;

  beforeEach(() => {
    tenantId = TenantId.generate();
    organizationId = new OrganizationId(tenantId);
    departmentId = new DepartmentId(organizationId);
  });

  describe("构造函数", () => {
    it("应该能够使用租户ID创建聚合根", () => {
      const aggregate = new TestTenantIsolatedAggregateRoot(tenantId);

      expect(aggregate.tenantId.equals(tenantId)).toBe(true);
      expect(aggregate.organizationId).toBeUndefined();
      expect(aggregate.departmentId).toBeUndefined();
    });

    it("应该能够使用完整租户信息创建聚合根", () => {
      const aggregate = new TestTenantIsolatedAggregateRoot(
        tenantId,
        organizationId,
        departmentId,
      );

      expect(aggregate.tenantId.equals(tenantId)).toBe(true);
      expect(aggregate.organizationId?.equals(organizationId)).toBe(true);
      expect(aggregate.departmentId?.equals(departmentId)).toBe(true);
    });

    it("应该拒绝空租户ID", () => {
      expect(
        () => new TestTenantIsolatedAggregateRoot(null as unknown as TenantId),
      ).toThrow("租户ID不能为空");
    });
  });

  describe("租户隔离方法", () => {
    let aggregate: TestTenantIsolatedAggregateRoot;

    beforeEach(() => {
      aggregate = new TestTenantIsolatedAggregateRoot(
        tenantId,
        organizationId,
        departmentId,
      );
    });

    it("应该正确识别所属租户", () => {
      expect(aggregate.belongsToTenant(tenantId)).toBe(true);
      expect(aggregate.belongsToTenant(TenantId.generate())).toBe(false);
    });

    it("应该正确识别所属组织", () => {
      expect(aggregate.belongsToOrganization(organizationId)).toBe(true);
    });

    it("应该正确识别所属部门", () => {
      expect(aggregate.belongsToDepartment(departmentId)).toBe(true);
    });

    it("应该正确验证租户隔离", () => {
      const context = new TenantContext(tenantId, {
        organizationId,
        departmentId,
      });

      expect(aggregate.validateTenantIsolation(context)).toBe(true);
    });
  });

  describe("领域事件", () => {
    let aggregate: TestTenantIsolatedAggregateRoot;

    beforeEach(() => {
      aggregate = new TestTenantIsolatedAggregateRoot(
        tenantId,
        organizationId,
        departmentId,
      );
    });

    it("应该自动将租户信息添加到领域事件", () => {
      const event: DomainEvent = {
        type: "TestEvent",
        aggregateRootId: aggregate.id,
        timestamp: new Date(),
        data: { someField: "value" },
      };

      aggregate.addDomainEvent(event);

      const events = aggregate.domainEvents;
      expect(events.length).toBe(1);
      expect(events[0].data).toHaveProperty("tenantId");
      expect(events[0].data).toHaveProperty("organizationId");
      expect(events[0].data).toHaveProperty("departmentId");
    });

    it("应该在事件数据为对象时合并租户信息", () => {
      const event: DomainEvent = {
        type: "TestEvent",
        aggregateRootId: aggregate.id,
        timestamp: new Date(),
        data: { originalField: "original" },
      };

      aggregate.addDomainEvent(event);

      const events = aggregate.domainEvents;
      expect(events[0].data).toEqual(
        expect.objectContaining({
          originalField: "original",
          tenantId: tenantId.toJSON(),
          organizationId: organizationId.toJSON(),
          departmentId: departmentId.toJSON(),
        }),
      );
    });

    it("应该在事件数据非对象时包装租户信息", () => {
      const event: DomainEvent = {
        type: "TestEvent",
        aggregateRootId: aggregate.id,
        timestamp: new Date(),
        data: "simple string",
      };

      aggregate.addDomainEvent(event);

      const events = aggregate.domainEvents;
      expect(events[0].data).toHaveProperty("originalData");
      expect(events[0].data).toHaveProperty("tenantId");
    });
  });

  describe("toJSON", () => {
    it("应该正确序列化为JSON", () => {
      const aggregate = new TestTenantIsolatedAggregateRoot(
        tenantId,
        organizationId,
        departmentId,
      );

      const json = aggregate.toJSON();

      expect(json).toHaveProperty("tenantId");
      expect(json).toHaveProperty("organizationId");
      expect(json).toHaveProperty("departmentId");
    });
  });

  describe("equals", () => {
    it("应该正确比较相等的聚合根", () => {
      const id = EntityId.generate();
      const aggregate1 = new TestTenantIsolatedAggregateRoot(
        tenantId,
        organizationId,
        departmentId,
        id,
      );
      const aggregate2 = new TestTenantIsolatedAggregateRoot(
        tenantId,
        organizationId,
        departmentId,
        id,
      );

      expect(aggregate1.equals(aggregate2)).toBe(true);
    });

    it("应该正确比较不相等的聚合根", () => {
      const aggregate1 = new TestTenantIsolatedAggregateRoot(tenantId);
      const aggregate2 = new TestTenantIsolatedAggregateRoot(
        tenantId,
        organizationId,
      );

      expect(aggregate1.equals(aggregate2)).toBe(false);
    });
  });
});
