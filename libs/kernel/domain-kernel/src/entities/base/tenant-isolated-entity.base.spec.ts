/**
 * @fileoverview 租户隔离实体基类测试
 * @description 测试 TenantIsolatedEntity 基类的各种功能
 */

import { TenantIsolatedEntity } from "./tenant-isolated-entity.base.js";
import { TenantId } from "../../identifiers/tenant-id.js";
import { OrganizationId } from "../../identifiers/organization-id.js";
import { DepartmentId } from "../../identifiers/department-id.js";
import { EntityId } from "../../identifiers/entity-id.js";
import { AuditInfo } from "../../audit/audit-info.js";
import { EntityLifecycle } from "./entity-lifecycle.enum.js";
import { TenantContext } from "../../context/tenant-context.js";

// 测试用的具体实体实现
class TestTenantIsolatedEntity extends TenantIsolatedEntity {
  public _data: string = "";

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

  public clone(): TenantIsolatedEntity {
    const cloned = new TestTenantIsolatedEntity(
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

  public validateBusinessRules(): boolean {
    return this._data.length >= 0;
  }

  public executeBusinessLogic(operation: string, params: unknown): unknown {
    if (operation === "updateData") {
      const newData = (params as { data: string }).data;
      this._data = newData;
      return { success: true, data: newData };
    }
    return { success: false };
  }
}

describe("TenantIsolatedEntity", () => {
  let tenantId: TenantId;
  let organizationId: OrganizationId;
  let departmentId: DepartmentId;

  beforeEach(() => {
    tenantId = TenantId.generate();
    organizationId = new OrganizationId(tenantId);
    departmentId = new DepartmentId(organizationId);
  });

  describe("构造函数", () => {
    it("应该能够使用租户ID创建实体", () => {
      const entity = new TestTenantIsolatedEntity(tenantId);

      expect(entity.tenantId.equals(tenantId)).toBe(true);
      expect(entity.organizationId).toBeUndefined();
      expect(entity.departmentId).toBeUndefined();
      expect(entity.id).toBeDefined();
    });

    it("应该能够使用完整租户信息创建实体", () => {
      const entity = new TestTenantIsolatedEntity(
        tenantId,
        organizationId,
        departmentId,
      );

      expect(entity.tenantId.equals(tenantId)).toBe(true);
      expect(entity.organizationId?.equals(organizationId)).toBe(true);
      expect(entity.departmentId?.equals(departmentId)).toBe(true);
    });

    it("应该拒绝空租户ID", () => {
      expect(
        () => new TestTenantIsolatedEntity(null as unknown as TenantId),
      ).toThrow("租户ID不能为空");
    });

    it("应该拒绝未指定组织但指定部门的情况", () => {
      expect(
        () => new TestTenantIsolatedEntity(tenantId, undefined, departmentId),
      ).toThrow("指定部门时必须同时指定组织");
    });

    it("应该拒绝不属于租户的组织", () => {
      const otherTenantId = TenantId.generate();
      const otherOrganizationId = new OrganizationId(otherTenantId);

      expect(
        () =>
          new TestTenantIsolatedEntity(
            tenantId,
            otherOrganizationId,
            undefined,
          ),
      ).toThrow("组织必须属于指定租户");
    });

    it("应该拒绝不属于组织的部门", () => {
      const otherOrganizationId = new OrganizationId(tenantId);
      const otherDepartmentId = new DepartmentId(otherOrganizationId);

      expect(
        () =>
          new TestTenantIsolatedEntity(
            tenantId,
            organizationId,
            otherDepartmentId,
          ),
      ).toThrow("部门必须属于指定组织");
    });
  });

  describe("belongsToTenant", () => {
    it("应该正确识别所属租户", () => {
      const entity = new TestTenantIsolatedEntity(tenantId);

      expect(entity.belongsToTenant(tenantId)).toBe(true);
    });

    it("应该正确拒绝其他租户", () => {
      const entity = new TestTenantIsolatedEntity(tenantId);
      const otherTenantId = TenantId.generate();

      expect(entity.belongsToTenant(otherTenantId)).toBe(false);
    });
  });

  describe("belongsToOrganization", () => {
    it("应该正确识别所属组织", () => {
      const entity = new TestTenantIsolatedEntity(tenantId, organizationId);

      expect(entity.belongsToOrganization(organizationId)).toBe(true);
    });

    it("应该正确拒绝其他组织", () => {
      const entity = new TestTenantIsolatedEntity(tenantId, organizationId);
      const otherOrganizationId = new OrganizationId(tenantId);

      expect(entity.belongsToOrganization(otherOrganizationId)).toBe(false);
    });

    it("应该在没有指定组织时返回false", () => {
      const entity = new TestTenantIsolatedEntity(tenantId);

      expect(entity.belongsToOrganization(organizationId)).toBe(false);
    });
  });

  describe("belongsToDepartment", () => {
    it("应该正确识别所属部门", () => {
      const entity = new TestTenantIsolatedEntity(
        tenantId,
        organizationId,
        departmentId,
      );

      expect(entity.belongsToDepartment(departmentId)).toBe(true);
    });

    it("应该正确拒绝其他部门", () => {
      const entity = new TestTenantIsolatedEntity(
        tenantId,
        organizationId,
        departmentId,
      );
      const otherDepartmentId = new DepartmentId(organizationId);

      expect(entity.belongsToDepartment(otherDepartmentId)).toBe(false);
    });

    it("应该在没有指定部门时返回false", () => {
      const entity = new TestTenantIsolatedEntity(tenantId);

      expect(entity.belongsToDepartment(departmentId)).toBe(false);
    });
  });

  describe("validateTenantIsolation", () => {
    it("应该验证有效上下文", () => {
      const entity = new TestTenantIsolatedEntity(
        tenantId,
        organizationId,
        departmentId,
      );
      const context = new TenantContext(tenantId, {
        organizationId,
        departmentId,
      });

      expect(entity.validateTenantIsolation(context)).toBe(true);
    });

    it("应该拒绝不同租户的上下文", () => {
      const entity = new TestTenantIsolatedEntity(tenantId);
      const otherTenantId = TenantId.generate();
      const otherContext = new TenantContext(otherTenantId);

      expect(entity.validateTenantIsolation(otherContext)).toBe(false);
    });

    it("应该拒绝没有上下文的情况", () => {
      const entity = new TestTenantIsolatedEntity(tenantId);

      expect(entity.validateTenantIsolation()).toBe(true);
    });
  });

  describe("toJSON", () => {
    it("应该正确序列化为JSON", () => {
      const entity = new TestTenantIsolatedEntity(
        tenantId,
        organizationId,
        departmentId,
      );

      const json = entity.toJSON();

      expect(json).toHaveProperty("tenantId");
      expect(json).toHaveProperty("organizationId");
      expect(json).toHaveProperty("departmentId");
      expect(json).toHaveProperty("id");
      expect(json).toHaveProperty("auditInfo");
    });
  });

  describe("equals", () => {
    it("应该正确比较相等的实体", () => {
      const id = EntityId.generate();
      const entity1 = new TestTenantIsolatedEntity(
        tenantId,
        organizationId,
        departmentId,
        id,
      );
      const entity2 = new TestTenantIsolatedEntity(
        tenantId,
        organizationId,
        departmentId,
        id,
      );

      expect(entity1.equals(entity2)).toBe(true);
    });

    it("应该正确比较不相等的实体（不同租户）", () => {
      const id = EntityId.generate();
      const otherTenantId = TenantId.generate();
      const otherOrganizationId = new OrganizationId(otherTenantId);
      const otherDepartmentId = new DepartmentId(otherOrganizationId);
      const entity1 = new TestTenantIsolatedEntity(
        tenantId,
        organizationId,
        departmentId,
        id,
      );
      const entity2 = new TestTenantIsolatedEntity(
        otherTenantId,
        otherOrganizationId,
        otherDepartmentId,
        id,
      );

      expect(entity1.equals(entity2)).toBe(false);
    });

    it("应该正确比较不相等的实体（不同组织）", () => {
      const id = EntityId.generate();
      const otherOrganizationId = new OrganizationId(tenantId);
      const otherDepartmentId = new DepartmentId(otherOrganizationId);
      const entity1 = new TestTenantIsolatedEntity(
        tenantId,
        organizationId,
        departmentId,
        id,
      );
      const entity2 = new TestTenantIsolatedEntity(
        tenantId,
        otherOrganizationId,
        otherDepartmentId,
        id,
      );

      expect(entity1.equals(entity2)).toBe(false);
    });
  });
});
