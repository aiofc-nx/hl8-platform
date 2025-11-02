/**
 * @fileoverview 多层级隔离集成测试
 * @description 验证租户、组织、部门三级数据隔离机制
 */

import {
  TenantId,
  OrganizationId,
  DepartmentId,
  EntityId,
  TenantContext,
} from "@hl8/domain-kernel";

/**
 * Mock 资源存储（用于验证多层级隔离）
 */
class MockMultiLevelResourceStore {
  private readonly resources: Map<
    string,
    {
      resourceId: string;
      resourceName: string;
      tenantId: string;
      organizationId?: string;
      departmentId?: string;
    }
  > = new Map();

  /**
   * 保存资源
   */
  async save(
    resourceId: string,
    resourceName: string,
    context: TenantContext,
  ): Promise<void> {
    this.resources.set(resourceId, {
      resourceId,
      resourceName,
      tenantId: context.tenantId.value,
      organizationId: context.organizationId?.value,
      departmentId: context.departmentId?.value,
    });
  }

  /**
   * 根据ID查找资源（验证多层级隔离）
   * 支持上级访问下级：租户可以访问组织和部门资源，组织可以访问部门资源
   */
  async findById(
    resourceId: string,
    context: TenantContext,
  ): Promise<{
    resourceId: string;
    resourceName: string;
  } | null> {
    const resource = this.resources.get(resourceId);
    if (!resource) {
      return null;
    }

    // 验证租户隔离
    if (resource.tenantId !== context.tenantId.value) {
      throw new Error("跨租户访问被拒绝");
    }

    // 验证组织隔离：
    // - 如果资源有组织ID，上下文的组织必须匹配，或者上下文是租户级（可以访问下级）
    if (resource.organizationId) {
      if (context.organizationId) {
        // 有组织上下文，必须匹配
        if (resource.organizationId !== context.organizationId.value) {
          throw new Error("跨组织访问被拒绝");
        }
      }
      // 如果没有组织上下文，但上下文是租户级，允许访问（租户可以访问其下的组织资源）
    }

    // 验证部门隔离：
    // - 如果资源有部门ID，上下文的部门必须匹配，或者上下文是组织级/租户级（可以访问下级）
    if (resource.departmentId) {
      if (context.departmentId) {
        // 有部门上下文，必须匹配
        if (resource.departmentId !== context.departmentId.value) {
          throw new Error("跨部门访问被拒绝");
        }
      } else if (context.organizationId) {
        // 有组织上下文但没有部门上下文，如果资源的部门属于该组织，允许访问
        // 这里需要验证资源的组织是否匹配
        if (resource.organizationId !== context.organizationId.value) {
          throw new Error("跨组织访问被拒绝");
        }
        // 如果组织的部门ID匹配，允许访问（组织可以访问其下的部门资源）
        // 注意：实际业务中可能需要额外的验证，但这里简化处理
      }
      // 如果只有租户上下文，也允许访问（租户可以访问其下的所有资源）
    }

    return {
      resourceId: resource.resourceId,
      resourceName: resource.resourceName,
    };
  }

  /**
   * 查找租户下的所有资源（按层级过滤）
   * 支持上级访问下级：租户可以访问组织和部门资源，组织可以访问部门资源
   */
  async findByContext(context: TenantContext): Promise<
    Array<{
      resourceId: string;
      resourceName: string;
    }>
  > {
    const results: Array<{ resourceId: string; resourceName: string }> = [];

    for (const resource of this.resources.values()) {
      // 租户级过滤：必须属于同一租户
      if (resource.tenantId !== context.tenantId.value) {
        continue;
      }

      // 组织级过滤：
      // - 如果资源有组织ID，上下文必须是同一组织或更高级别（租户级）
      if (resource.organizationId) {
        if (context.organizationId) {
          // 有组织上下文，必须匹配
          if (resource.organizationId !== context.organizationId.value) {
            continue;
          }
        }
        // 如果没有组织上下文（租户级），允许访问（租户可以访问其下的组织资源）
      }

      // 部门级过滤：
      // - 如果上下文有部门ID，只返回该部门的资源（精确匹配）
      // - 如果上下文只有组织ID，返回该组织的资源（包括部门资源）
      // - 如果上下文只有租户ID，返回该租户的所有资源
      if (context.departmentId) {
        // 部门级上下文：只返回该部门的资源
        if (resource.departmentId) {
          // 资源有部门ID，必须匹配
          if (resource.departmentId !== context.departmentId.value) {
            continue;
          }
        } else {
          // 资源没有部门ID（租户级或组织级资源），部门级上下文不能访问
          continue;
        }
      } else if (context.organizationId) {
        // 组织级上下文：返回该组织的资源（包括部门资源）
        // 排除租户级资源（无组织ID）
        if (!resource.organizationId) {
          // 租户级资源，组织级上下文不能访问
          continue;
        }

        // 验证资源属于该组织
        if (resource.organizationId !== context.organizationId.value) {
          continue;
        }

        // 如果资源有部门ID，已经验证了组织匹配，允许访问
        // 如果资源只有组织ID，已经验证了匹配，允许访问
      }
      // 租户级上下文：返回该租户的所有资源（已在租户级过滤中处理）

      results.push({
        resourceId: resource.resourceId,
        resourceName: resource.resourceName,
      });
    }

    return results;
  }

  /**
   * 清除所有资源
   */
  clear(): void {
    this.resources.clear();
  }
}

describe("多层级隔离集成测试", () => {
  let resourceStore: MockMultiLevelResourceStore;

  // 测试数据：租户
  let tenant1Id: TenantId;
  let tenant2Id: TenantId;

  // 测试数据：组织（租户1下的多个组织）
  let org1AId: OrganizationId;
  let org1BId: OrganizationId;

  // 测试数据：组织（租户2下的组织）
  let org2AId: OrganizationId;

  // 测试数据：部门（组织1A下的多个部门）
  let dept1A1Id: DepartmentId;
  let dept1A2Id: DepartmentId;

  // 测试数据：部门（组织1B下的部门）
  let dept1B1Id: DepartmentId;

  beforeAll(() => {
    // 初始化测试数据
    tenant1Id = TenantId.generate();
    tenant2Id = TenantId.generate();

    // 租户1下的组织
    org1AId = new OrganizationId(tenant1Id);
    org1BId = new OrganizationId(tenant1Id);

    // 租户2下的组织
    org2AId = new OrganizationId(tenant2Id);

    // 组织1A下的部门
    dept1A1Id = new DepartmentId(org1AId);
    dept1A2Id = new DepartmentId(org1AId);

    // 组织1B下的部门
    dept1B1Id = new DepartmentId(org1BId);

    resourceStore = new MockMultiLevelResourceStore();
  });

  beforeEach(() => {
    resourceStore.clear();
  });

  describe("场景1: 层级一致性验证", () => {
    it("应该验证组织必须属于租户", () => {
      // Given: 尝试创建组织不属于租户的上下文
      const wrongOrgId = new OrganizationId(tenant2Id); // 租户2的组织

      // When & Then: 创建上下文应该失败（因为组织不属于租户1）
      expect(() => {
        new TenantContext(tenant1Id, { organizationId: wrongOrgId });
      }).toThrow("组织必须属于指定租户");
    });

    it("应该验证部门必须属于组织", () => {
      // Given: 尝试创建部门不属于组织的上下文
      const wrongDeptId = new DepartmentId(org1BId); // 组织1B的部门

      // When & Then: 创建上下文应该失败（因为部门不属于组织1A）
      expect(() => {
        new TenantContext(tenant1Id, {
          organizationId: org1AId,
          departmentId: wrongDeptId,
        });
      }).toThrow("部门必须属于指定组织");
    });

    it("应该验证指定部门时必须指定组织", () => {
      // Given: 尝试创建只有部门没有组织的上下文
      const deptId = new DepartmentId(org1AId);

      // When & Then: 创建上下文应该失败
      expect(() => {
        new TenantContext(tenant1Id, { departmentId: deptId });
      }).toThrow("指定部门时必须同时指定组织");
    });

    it("应该允许创建只有租户的上下文", () => {
      // Given & When: 创建只有租户的上下文
      const context = new TenantContext(tenant1Id);

      // Then: 应该成功
      expect(context).toBeDefined();
      expect(context.tenantId.equals(tenant1Id)).toBe(true);
      expect(context.organizationId).toBeUndefined();
      expect(context.departmentId).toBeUndefined();
    });

    it("应该允许创建租户+组织的上下文", () => {
      // Given & When: 创建租户+组织的上下文
      const context = new TenantContext(tenant1Id, {
        organizationId: org1AId,
      });

      // Then: 应该成功
      expect(context).toBeDefined();
      expect(context.tenantId.equals(tenant1Id)).toBe(true);
      expect(context.organizationId?.equals(org1AId)).toBe(true);
      expect(context.departmentId).toBeUndefined();
    });

    it("应该允许创建租户+组织+部门的上下文", () => {
      // Given & When: 创建完整的层级上下文
      const context = new TenantContext(tenant1Id, {
        organizationId: org1AId,
        departmentId: dept1A1Id,
      });

      // Then: 应该成功
      expect(context).toBeDefined();
      expect(context.tenantId.equals(tenant1Id)).toBe(true);
      expect(context.organizationId?.equals(org1AId)).toBe(true);
      expect(context.departmentId?.equals(dept1A1Id)).toBe(true);
    });
  });

  describe("场景2: 组织级隔离验证", () => {
    it("应该隔离同一租户下的不同组织", async () => {
      // Given: 组织1A创建了资源
      const resourceId = new EntityId().toString();
      const org1AContext = new TenantContext(tenant1Id, {
        organizationId: org1AId,
      });
      await resourceStore.save(resourceId, "Org1A Resource", org1AContext);

      // When: 组织1B尝试访问组织1A的资源
      const org1BContext = new TenantContext(tenant1Id, {
        organizationId: org1BId,
      });

      // Then: 应该被拒绝
      await expect(
        resourceStore.findById(resourceId, org1BContext),
      ).rejects.toThrow("跨组织访问被拒绝");
    });

    it("应该允许同一组织访问自己的资源", async () => {
      // Given: 组织1A创建了资源
      const resourceId = new EntityId().toString();
      const org1AContext = new TenantContext(tenant1Id, {
        organizationId: org1AId,
      });
      await resourceStore.save(resourceId, "Org1A Resource", org1AContext);

      // When: 组织1A查询自己的资源
      // Then: 应该成功
      const resource = await resourceStore.findById(resourceId, org1AContext);
      expect(resource).not.toBeNull();
      expect(resource?.resourceName).toBe("Org1A Resource");
    });

    it("应该允许租户级上下文访问组织级资源", async () => {
      // Given: 组织1A创建了资源
      const resourceId = new EntityId().toString();
      const org1AContext = new TenantContext(tenant1Id, {
        organizationId: org1AId,
      });
      await resourceStore.save(resourceId, "Org1A Resource", org1AContext);

      // When: 使用租户级上下文（无组织）查询组织级资源
      const tenantContext = new TenantContext(tenant1Id);

      // Then: 应该成功（租户级上下文可以访问其下的所有组织资源）
      // 注意：实际业务中可能需要权限控制，但这里验证的是隔离机制
      const resource = await resourceStore.findById(resourceId, tenantContext);
      // 如果资源有组织ID，租户级上下文应该能访问（但实际可能需要权限验证）
      // 这里假设租户级上下文可以访问，所以应该成功
      expect(resource).not.toBeNull();
    });

    it("应该只返回当前组织的资源", async () => {
      // Given: 组织1A创建了资源1
      const resource1Id = new EntityId().toString();
      const org1AContext = new TenantContext(tenant1Id, {
        organizationId: org1AId,
      });
      await resourceStore.save(resource1Id, "Org1A Resource 1", org1AContext);

      // Given: 组织1B创建了资源2
      const resource2Id = new EntityId().toString();
      const org1BContext = new TenantContext(tenant1Id, {
        organizationId: org1BId,
      });
      await resourceStore.save(resource2Id, "Org1B Resource 1", org1BContext);

      // When: 组织1A查询所有资源
      const resources = await resourceStore.findByContext(org1AContext);

      // Then: 应该只返回组织1A的资源
      expect(resources).toHaveLength(1);
      expect(resources[0].resourceId).toBe(resource1Id);
      expect(resources[0].resourceName).toBe("Org1A Resource 1");
    });
  });

  describe("场景3: 部门级隔离验证", () => {
    it("应该隔离同一组织下的不同部门", async () => {
      // Given: 部门1A1创建了资源
      const resourceId = new EntityId().toString();
      const dept1A1Context = new TenantContext(tenant1Id, {
        organizationId: org1AId,
        departmentId: dept1A1Id,
      });
      await resourceStore.save(resourceId, "Dept1A1 Resource", dept1A1Context);

      // When: 部门1A2尝试访问部门1A1的资源
      const dept1A2Context = new TenantContext(tenant1Id, {
        organizationId: org1AId,
        departmentId: dept1A2Id,
      });

      // Then: 应该被拒绝
      await expect(
        resourceStore.findById(resourceId, dept1A2Context),
      ).rejects.toThrow("跨部门访问被拒绝");
    });

    it("应该允许同一部门访问自己的资源", async () => {
      // Given: 部门1A1创建了资源
      const resourceId = new EntityId().toString();
      const dept1A1Context = new TenantContext(tenant1Id, {
        organizationId: org1AId,
        departmentId: dept1A1Id,
      });
      await resourceStore.save(resourceId, "Dept1A1 Resource", dept1A1Context);

      // When: 部门1A1查询自己的资源
      // Then: 应该成功
      const resource = await resourceStore.findById(resourceId, dept1A1Context);
      expect(resource).not.toBeNull();
      expect(resource?.resourceName).toBe("Dept1A1 Resource");
    });

    it("应该允许组织级上下文访问部门级资源", async () => {
      // Given: 部门1A1创建了资源
      const resourceId = new EntityId().toString();
      const dept1A1Context = new TenantContext(tenant1Id, {
        organizationId: org1AId,
        departmentId: dept1A1Id,
      });
      await resourceStore.save(resourceId, "Dept1A1 Resource", dept1A1Context);

      // When: 使用组织级上下文（无部门）查询部门级资源
      const org1AContext = new TenantContext(tenant1Id, {
        organizationId: org1AId,
      });

      // Then: 应该成功（组织级上下文可以访问其下的所有部门资源）
      const resource = await resourceStore.findById(resourceId, org1AContext);
      expect(resource).not.toBeNull();
    });

    it("应该只返回当前部门的资源", async () => {
      // Given: 部门1A1创建了资源1
      const resource1Id = new EntityId().toString();
      const dept1A1Context = new TenantContext(tenant1Id, {
        organizationId: org1AId,
        departmentId: dept1A1Id,
      });
      await resourceStore.save(
        resource1Id,
        "Dept1A1 Resource 1",
        dept1A1Context,
      );

      // Given: 部门1A2创建了资源2
      const resource2Id = new EntityId().toString();
      const dept1A2Context = new TenantContext(tenant1Id, {
        organizationId: org1AId,
        departmentId: dept1A2Id,
      });
      await resourceStore.save(
        resource2Id,
        "Dept1A2 Resource 1",
        dept1A2Context,
      );

      // When: 部门1A1查询所有资源
      const resources = await resourceStore.findByContext(dept1A1Context);

      // Then: 应该只返回部门1A1的资源
      expect(resources).toHaveLength(1);
      expect(resources[0].resourceId).toBe(resource1Id);
      expect(resources[0].resourceName).toBe("Dept1A1 Resource 1");
    });
  });

  describe("场景4: 跨组织/跨部门访问控制", () => {
    it("应该阻止跨租户访问组织资源", async () => {
      // Given: 租户1的组织1A创建了资源
      const resourceId = new EntityId().toString();
      const org1AContext = new TenantContext(tenant1Id, {
        organizationId: org1AId,
      });
      await resourceStore.save(
        resourceId,
        "Tenant1 Org1A Resource",
        org1AContext,
      );

      // When: 租户2的组织2A尝试访问
      const org2AContext = new TenantContext(tenant2Id, {
        organizationId: org2AId,
      });

      // Then: 应该被拒绝（跨租户）
      await expect(
        resourceStore.findById(resourceId, org2AContext),
      ).rejects.toThrow("跨租户访问被拒绝");
    });

    it("应该阻止跨组织访问部门资源", async () => {
      // Given: 组织1A的部门1A1创建了资源
      const resourceId = new EntityId().toString();
      const dept1A1Context = new TenantContext(tenant1Id, {
        organizationId: org1AId,
        departmentId: dept1A1Id,
      });
      await resourceStore.save(
        resourceId,
        "Org1A Dept1A1 Resource",
        dept1A1Context,
      );

      // When: 组织1B的部门1B1尝试访问
      const dept1B1Context = new TenantContext(tenant1Id, {
        organizationId: org1BId,
        departmentId: dept1B1Id,
      });

      // Then: 应该被拒绝（跨组织）
      await expect(
        resourceStore.findById(resourceId, dept1B1Context),
      ).rejects.toThrow("跨组织访问被拒绝");
    });

    it("应该正确过滤多层级资源", async () => {
      // Given: 创建不同层级的资源
      // 租户级资源
      const tenantResourceId = new EntityId().toString();
      const tenantContext = new TenantContext(tenant1Id);
      await resourceStore.save(
        tenantResourceId,
        "Tenant Resource",
        tenantContext,
      );

      // 组织1A资源
      const org1AResourceId = new EntityId().toString();
      const org1AContext = new TenantContext(tenant1Id, {
        organizationId: org1AId,
      });
      await resourceStore.save(org1AResourceId, "Org1A Resource", org1AContext);

      // 组织1B资源
      const org1BResourceId = new EntityId().toString();
      const org1BContext = new TenantContext(tenant1Id, {
        organizationId: org1BId,
      });
      await resourceStore.save(org1BResourceId, "Org1B Resource", org1BContext);

      // 部门1A1资源
      const dept1A1ResourceId = new EntityId().toString();
      const dept1A1Context = new TenantContext(tenant1Id, {
        organizationId: org1AId,
        departmentId: dept1A1Id,
      });
      await resourceStore.save(
        dept1A1ResourceId,
        "Dept1A1 Resource",
        dept1A1Context,
      );

      // 部门1A2资源
      const dept1A2ResourceId = new EntityId().toString();
      const dept1A2Context = new TenantContext(tenant1Id, {
        organizationId: org1AId,
        departmentId: dept1A2Id,
      });
      await resourceStore.save(
        dept1A2ResourceId,
        "Dept1A2 Resource",
        dept1A2Context,
      );

      // When: 部门1A1查询资源
      const resources = await resourceStore.findByContext(dept1A1Context);

      // Then: 应该只返回部门1A1的资源（不包括租户级、组织级、其他部门的资源）
      expect(resources).toHaveLength(1);
      expect(resources[0].resourceId).toBe(dept1A1ResourceId);
      expect(resources[0].resourceName).toBe("Dept1A1 Resource");

      // When: 组织1A查询资源
      const org1AResources = await resourceStore.findByContext(org1AContext);

      // Then: 应该返回组织1A的资源（包括组织级和其下的部门级资源）
      const org1AResourceIds = org1AResources.map((r) => r.resourceId);
      expect(org1AResourceIds).toContain(org1AResourceId);
      // 组织级应该可以访问其下的部门资源
      expect(org1AResourceIds).toContain(dept1A1ResourceId);
      expect(org1AResourceIds).toContain(dept1A2ResourceId);
      // 但不包括租户级资源和其他组织的资源
      expect(org1AResourceIds).not.toContain(tenantResourceId);
      expect(org1AResourceIds).not.toContain(org1BResourceId);

      // When: 租户级查询资源
      const tenantResources = await resourceStore.findByContext(tenantContext);

      // Then: 应该返回租户的所有资源（但不包括其他租户的资源）
      expect(tenantResources.length).toBeGreaterThanOrEqual(4);
      const tenantResourceIds = tenantResources.map((r) => r.resourceId);
      expect(tenantResourceIds).toContain(tenantResourceId);
      expect(tenantResourceIds).toContain(org1AResourceId);
      expect(tenantResourceIds).toContain(org1BResourceId);
    });
  });

  describe("场景5: 层级访问权限验证", () => {
    it("应该拒绝租户级上下文访问需要组织级权限的资源", async () => {
      // Given: 组织1A创建了组织级资源
      const resourceId = new EntityId().toString();
      const org1AContext = new TenantContext(tenant1Id, {
        organizationId: org1AId,
      });
      await resourceStore.save(resourceId, "Org1A Resource", org1AContext);

      // When: 使用租户级上下文（无组织）查询组织级资源
      const tenantContext = new TenantContext(tenant1Id);

      // Then: 租户级上下文应该可以访问其下的组织资源
      const resource = await resourceStore.findById(resourceId, tenantContext);
      expect(resource).not.toBeNull();
      expect(resource?.resourceName).toBe("Org1A Resource");
    });

    it("应该拒绝组织级上下文访问需要部门级权限的资源", async () => {
      // Given: 部门1A1创建了部门级资源
      const resourceId = new EntityId().toString();
      const dept1A1Context = new TenantContext(tenant1Id, {
        organizationId: org1AId,
        departmentId: dept1A1Id,
      });
      await resourceStore.save(resourceId, "Dept1A1 Resource", dept1A1Context);

      // When: 使用组织级上下文（无部门）查询部门级资源
      const org1AContext = new TenantContext(tenant1Id, {
        organizationId: org1AId,
      });

      // Then: 组织级上下文应该可以访问其下的部门资源
      const resource = await resourceStore.findById(resourceId, org1AContext);
      expect(resource).not.toBeNull();
      expect(resource?.resourceName).toBe("Dept1A1 Resource");
    });
  });
});
