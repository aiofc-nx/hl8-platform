/**
 * @fileoverview 部门实体映射器
 * @description 在领域实体Department和持久化实体DepartmentPersistenceEntity之间进行转换
 */

import { TenantId, OrganizationId, DepartmentId } from "@hl8/domain-kernel";
import { Department } from "../../../../domain/department/aggregates/department.aggregate.js";
import { DepartmentNameValueObject } from "../../../../domain/department/value-objects/department-name.value-object.js";
import { DepartmentPathValueObject } from "../../../../domain/department/value-objects/department-path.value-object.js";
import { DepartmentPersistenceEntity } from "../entities/department.persistence-entity.js";

/**
 * 部门实体映射器
 * @description 负责领域实体和持久化实体之间的双向转换
 */
export class DepartmentMapper {
  /**
   * 将领域实体转换为持久化实体
   * @param domainEntity 领域实体（Department聚合根）
   * @param persistenceEntity 持久化实体（可选，如果提供则更新，否则创建新实例）
   * @returns 持久化实体
   */
  public static toPersistence(
    domainEntity: Department,
    persistenceEntity?: DepartmentPersistenceEntity,
  ): DepartmentPersistenceEntity {
    const entity = persistenceEntity || new DepartmentPersistenceEntity();

    entity.id = domainEntity.id.value;
    entity.tenantId = domainEntity.organizationId.tenantId.value; // 从organizationId获取tenantId
    entity.organizationId = domainEntity.organizationId.value;
    entity.parentDepartmentId = domainEntity.parentDepartmentId
      ? domainEntity.parentDepartmentId.value
      : null;
    entity.name = domainEntity.name.value;
    entity.level = domainEntity.level;
    entity.path = domainEntity.path.value;
    entity.isRoot = domainEntity.isRoot;
    entity.createdAt = domainEntity.createdAt;
    entity.updatedAt = domainEntity.updatedAt;
    entity.version = domainEntity.version;

    return entity;
  }

  /**
   * 将持久化实体转换为领域实体
   * @param persistenceEntity 持久化实体
   * @returns 领域实体（Department聚合根）
   */
  public static toDomain(
    persistenceEntity: DepartmentPersistenceEntity,
  ): Department {
    // 创建值对象
    const name = new DepartmentNameValueObject(persistenceEntity.name);
    const path = new DepartmentPathValueObject(persistenceEntity.path);

    // 创建ID值对象
    // 首先需要从持久化实体获取tenantId，然后创建organizationId
    const tenantId = TenantId.fromString(persistenceEntity.tenantId);
    const organizationId = OrganizationId.fromString(
      tenantId,
      persistenceEntity.organizationId,
    );
    const departmentId = DepartmentId.fromString(
      organizationId,
      persistenceEntity.id,
    );
    const parentDepartmentId = persistenceEntity.parentDepartmentId
      ? DepartmentId.fromString(
          organizationId,
          persistenceEntity.parentDepartmentId,
        )
      : null;

    // 使用Department的fromPersistence静态方法重建实例
    const department = Department.fromPersistence(
      departmentId,
      organizationId,
      parentDepartmentId,
      name,
      persistenceEntity.level,
      path,
      persistenceEntity.isRoot,
      persistenceEntity.createdAt,
      persistenceEntity.version,
    );

    return department;
  }
}
