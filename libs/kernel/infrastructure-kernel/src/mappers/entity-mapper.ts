/**
 * @fileoverview 实体映射器实现
 * @description 提供领域实体和持久化实体之间的双向转换，支持自动映射和手动配置
 */

import { IEntityMapper } from "./entity-mapper.interface.js";
import {
  MappingConfig,
  FieldMappingRule,
  NestedMappingConfig,
} from "./mapping-config.js";
import {
  Entity,
  TenantIsolatedEntity,
  EntityId,
  TenantId,
  OrganizationId,
  DepartmentId,
} from "@hl8/domain-kernel";
import { BaseEntity } from "../entities/base/base-entity.js";
import { TenantIsolatedPersistenceEntity } from "../entities/base/tenant-isolated-persistence-entity.js";

/**
 * 实体映射器实现
 * @description 实现领域实体和持久化实体之间的双向转换
 * 支持自动映射（基于字段名和类型匹配）和手动配置覆盖（复杂场景）
 * @template TDomain 领域实体类型
 * @template TPersistence 持久化实体类型
 */
export class EntityMapper<
  TDomain extends Entity,
  TPersistence extends BaseEntity,
> implements IEntityMapper<TDomain, TPersistence>
{
  /**
   * 创建实体映射器实例
   * @param config 映射配置（可选，如果不提供则使用默认自动映射）
   */
  constructor(private readonly config?: MappingConfig<TDomain, TPersistence>) {}

  /**
   * 将持久化实体转换为领域实体
   * @description 使用自动映射和手动配置将持久化实体转换为领域实体，保持业务逻辑完整性
   * @param persistence 持久化实体
   * @returns 领域实体
   * @throws {Error} 当映射失败或验证失败时抛出
   */
  toDomain(persistence: TPersistence): TDomain {
    try {
      const domainData: Partial<TDomain> = {};

      // 1. 基础字段映射（id, createdAt, updatedAt, version）
      this.mapBaseFieldsToDomain(persistence, domainData);

      // 2. 租户隔离字段映射（如果持久化实体支持）
      if (this.isTenantIsolated(persistence)) {
        this.mapTenantIsolatedFieldsToDomain(
          persistence as unknown as TenantIsolatedPersistenceEntity,
          domainData,
        );
      }

      // 3. 嵌套聚合映射（如果配置）
      if (this.config?.nestedMappings) {
        this.mapNestedAggregatesToDomain(
          persistence,
          domainData,
          this.config.nestedMappings,
        );
      }

      // 4. 应用手动配置的字段映射规则
      if (this.config?.fieldMappings) {
        this.applyFieldMappings(
          persistence,
          domainData,
          this.config.fieldMappings,
          "toDomain",
        );
      }

      // 5. 自动映射剩余字段（如果启用）
      if (this.config?.autoMap !== false) {
        this.autoMapToDomain(persistence, domainData);
      }

      // 6. 创建领域实体
      let domainEntity: TDomain;
      if (this.config?.domainEntityFactory) {
        domainEntity = this.config.domainEntityFactory(domainData);
      } else {
        // 默认工厂：尝试直接构造（需要具体实现类提供构造函数）
        domainEntity = this.createDomainEntity(domainData);
      }

      // 6. 验证领域实体
      if (this.config?.validateDomain) {
        if (!this.config.validateDomain(domainEntity)) {
          throw new Error("领域实体验证失败");
        }
      }

      return domainEntity;
    } catch (error) {
      throw new Error(
        `持久化实体转换为领域实体失败: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * 将领域实体转换为持久化实体
   * @description 使用自动映射和手动配置将领域实体转换为持久化实体，保持数据完整性
   * @param domain 领域实体
   * @returns 持久化实体
   * @throws {Error} 当映射失败或验证失败时抛出
   */
  toPersistence(domain: TDomain): TPersistence {
    try {
      const persistenceData: Partial<TPersistence> = {};

      // 1. 基础字段映射
      this.mapBaseFieldsToPersistence(domain, persistenceData);

      // 2. 租户隔离字段映射（如果领域实体支持）
      if (this.isTenantIsolatedDomain(domain)) {
        this.mapTenantIsolatedFieldsToPersistence(
          domain as unknown as TenantIsolatedEntity,
          persistenceData,
        );
      }

      // 3. 嵌套聚合映射（如果配置）
      if (this.config?.nestedMappings) {
        this.mapNestedAggregatesToPersistence(
          domain,
          persistenceData,
          this.config.nestedMappings,
        );
      }

      // 4. 应用手动配置的字段映射规则
      if (this.config?.fieldMappings) {
        this.applyFieldMappings(
          domain,
          persistenceData,
          this.config.fieldMappings,
          "toPersistence",
        );
      }

      // 5. 自动映射剩余字段（如果启用）
      if (this.config?.autoMap !== false) {
        this.autoMapToPersistence(domain, persistenceData);
      }

      // 6. 创建持久化实体
      let persistenceEntity: TPersistence;
      if (this.config?.persistenceEntityFactory) {
        persistenceEntity =
          this.config.persistenceEntityFactory(persistenceData);
      } else {
        // 默认工厂：尝试直接构造（需要具体实现类提供构造函数）
        persistenceEntity = this.createPersistenceEntity(persistenceData);
      }

      // 6. 验证持久化实体
      if (this.config?.validatePersistence) {
        if (!this.config.validatePersistence(persistenceEntity)) {
          throw new Error("持久化实体验证失败");
        }
      }

      return persistenceEntity;
    } catch (error) {
      throw new Error(
        `领域实体转换为持久化实体失败: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * 批量将持久化实体转换为领域实体
   * @description 批量转换持久化实体列表为领域实体列表
   * @param persistenceList 持久化实体列表
   * @returns 领域实体列表
   */
  toDomainList(persistenceList: TPersistence[]): TDomain[] {
    return persistenceList.map((persistence) => this.toDomain(persistence));
  }

  /**
   * 批量将领域实体转换为持久化实体
   * @description 批量转换领域实体列表为持久化实体列表
   * @param domainList 领域实体列表
   * @returns 持久化实体列表
   */
  toPersistenceList(domainList: TDomain[]): TPersistence[] {
    return domainList.map((domain) => this.toPersistence(domain));
  }

  /**
   * 映射基础字段到领域实体
   * @private
   */
  private mapBaseFieldsToDomain(
    persistence: TPersistence,
    domainData: Partial<TDomain>,
  ): void {
    // ID 映射：string -> EntityId
    if (persistence.id) {
      (domainData as any)._id = new EntityId(persistence.id);
    }

    // 时间戳映射
    if (persistence.createdAt) {
      (domainData as any)._createdAt = new Date(persistence.createdAt);
    }
    if (persistence.updatedAt) {
      (domainData as any)._updatedAt = new Date(persistence.updatedAt);
    }

    // 版本号映射
    if (persistence.version !== undefined) {
      (domainData as any)._version = persistence.version;
    }

    // 软删除字段映射
    if (persistence.deletedAt !== null && persistence.deletedAt !== undefined) {
      (domainData as any)._deletedAt = new Date(persistence.deletedAt);
    }

    // 审计信息映射（需要从持久化实体的其他字段或上下文获取）
    // 这里假设可以从持久化实体的 metadata 或通过其他方式获取
    // 如果持久化实体没有直接的审计信息，需要从外部上下文获取
    // 注意：审计信息（创建者、更新者等）可以从持久化实体的扩展字段或元数据中获取
    // 如果实体有扩展字段存储审计信息，可以在此处进行映射
  }

  /**
   * 映射租户隔离字段到领域实体
   * @private
   */
  private mapTenantIsolatedFieldsToDomain(
    persistence: TenantIsolatedPersistenceEntity,
    domainData: Partial<TDomain>,
  ): void {
    // 租户ID映射：string -> TenantId
    if (persistence.tenantId) {
      (domainData as any)._tenantId = new TenantId(persistence.tenantId);
    }

    // 组织ID映射：string | null -> OrganizationId | undefined
    if (persistence.organizationId) {
      const tenantId = (domainData as any)._tenantId as TenantId | undefined;
      if (tenantId) {
        (domainData as any)._organizationId = new OrganizationId(
          tenantId,
          persistence.organizationId,
        );
      }
    }

    // 部门ID映射：string | null -> DepartmentId | undefined
    if (persistence.departmentId && (domainData as any)._organizationId) {
      const orgId = (domainData as any)._organizationId as OrganizationId;
      (domainData as any)._departmentId = new DepartmentId(
        orgId,
        persistence.departmentId,
      );
    }
  }

  /**
   * 映射基础字段到持久化实体
   * @private
   */
  private mapBaseFieldsToPersistence(
    domain: TDomain,
    persistenceData: Partial<TPersistence>,
  ): void {
    // ID 映射：EntityId -> string
    if (domain.id) {
      (persistenceData as any).id = domain.id.value;
    }

    // 时间戳映射
    if (domain.createdAt) {
      (persistenceData as any).createdAt = new Date(domain.createdAt);
    }
    if (domain.updatedAt) {
      (persistenceData as any).updatedAt = new Date(domain.updatedAt);
    }

    // 版本号映射
    if (domain.version !== undefined) {
      (persistenceData as any).version = domain.version;
    }

    // 软删除字段映射
    if (domain.deletedAt) {
      (persistenceData as any).deletedAt = new Date(domain.deletedAt);
    } else {
      (persistenceData as any).deletedAt = null;
    }

    // 审计信息：持久化实体通常不需要直接存储完整的 AuditInfo
    // 可以通过 createdBy/updatedBy 等字段存储，具体取决于持久化实体的设计
  }

  /**
   * 映射租户隔离字段到持久化实体
   * @private
   */
  private mapTenantIsolatedFieldsToPersistence(
    domain: TenantIsolatedEntity,
    persistenceData: Partial<TPersistence>,
  ): void {
    // 租户ID映射：TenantId -> string
    if (domain.tenantId) {
      (persistenceData as any).tenantId = domain.tenantId.value;
    }

    // 组织ID映射：OrganizationId | undefined -> string | null
    if (domain.organizationId) {
      (persistenceData as any).organizationId = domain.organizationId.value;
    } else {
      (persistenceData as any).organizationId = null;
    }

    // 部门ID映射：DepartmentId | undefined -> string | null
    if (domain.departmentId) {
      (persistenceData as any).departmentId = domain.departmentId.value;
    } else {
      (persistenceData as any).departmentId = null;
    }
  }

  /**
   * 应用手动配置的字段映射规则
   * @private
   */
  private applyFieldMappings(
    source: unknown,
    target: Partial<TDomain | TPersistence>,
    rules: FieldMappingRule[],
    direction: "toDomain" | "toPersistence",
  ): void {
    for (const rule of rules) {
      if (rule.ignore) {
        continue;
      }

      const sourceField =
        direction === "toDomain" ? rule.targetField : rule.sourceField;
      const targetField =
        direction === "toDomain" ? rule.sourceField : rule.targetField;

      const sourceValue = (source as Record<string, unknown>)[sourceField];

      if (sourceValue !== undefined) {
        let transformedValue = sourceValue;

        // 应用转换函数
        if (direction === "toDomain" && rule.reverseTransform) {
          transformedValue = rule.reverseTransform(sourceValue);
        } else if (direction === "toPersistence" && rule.transform) {
          transformedValue = rule.transform(sourceValue);
        }

        (target as Record<string, unknown>)[targetField] = transformedValue;
      }
    }
  }

  /**
   * 自动映射到领域实体（基于字段名匹配）
   * @private
   */
  private autoMapToDomain(
    persistence: TPersistence,
    domainData: Partial<TDomain>,
  ): void {
    // 使用反射自动映射同名同类型字段
    const persistenceObj = persistence as Record<string, unknown>;
    const domainObj = domainData as Record<string, unknown>;

    for (const key in persistenceObj) {
      // 跳过已映射的字段和特殊字段
      if (
        key === "id" ||
        key === "createdAt" ||
        key === "updatedAt" ||
        key === "version" ||
        key === "deletedAt" ||
        key === "tenantId" ||
        key === "organizationId" ||
        key === "departmentId" ||
        domainObj[key] !== undefined
      ) {
        continue;
      }

      // 自动映射：直接复制值（假设类型兼容）
      const value = persistenceObj[key];
      if (value !== null && value !== undefined) {
        domainObj[key] = value;
      }
    }
  }

  /**
   * 自动映射到持久化实体（基于字段名匹配）
   * @private
   */
  private autoMapToPersistence(
    domain: TDomain,
    persistenceData: Partial<TPersistence>,
  ): void {
    // 使用反射自动映射同名同类型字段
    const domainObj = domain as Record<string, unknown>;
    const persistenceObj = persistenceData as Record<string, unknown>;

    // 获取领域实体的所有可枚举属性
    // 注意：由于 Entity 使用私有字段，我们需要通过 getter 访问
    for (const key in domainObj) {
      // 跳过已映射的字段和特殊字段
      if (
        key === "_id" ||
        key === "_createdAt" ||
        key === "_updatedAt" ||
        key === "_version" ||
        key === "_deletedAt" ||
        key === "_tenantId" ||
        key === "_organizationId" ||
        key === "_departmentId" ||
        key === "_auditInfo" ||
        key === "_lifecycleState" ||
        persistenceObj[key] !== undefined
      ) {
        continue;
      }

      try {
        // 尝试通过 getter 获取值
        const value = (domain as any)[key];
        if (value !== null && value !== undefined) {
          persistenceObj[key] = value;
        }
      } catch {
        // 如果无法访问，跳过
        continue;
      }
    }
  }

  /**
   * 创建领域实体（默认工厂）
   * @private
   */
  private createDomainEntity(_data: Partial<TDomain>): TDomain {
    // 这是一个占位实现，具体实现需要根据实际的领域实体类型
    // 在实际使用中，应该通过 MappingConfig 提供 domainEntityFactory
    throw new Error(
      "创建领域实体需要提供 domainEntityFactory 或使用具体的实体类构造函数",
    );
  }

  /**
   * 创建持久化实体（默认工厂）
   * @private
   */
  private createPersistenceEntity(_data: Partial<TPersistence>): TPersistence {
    // 这是一个占位实现，具体实现需要根据实际的持久化实体类型
    // 在实际使用中，应该通过 MappingConfig 提供 persistenceEntityFactory
    throw new Error(
      "创建持久化实体需要提供 persistenceEntityFactory 或使用具体的实体类构造函数",
    );
  }

  /**
   * 检查是否为租户隔离的持久化实体
   * @private
   */
  private isTenantIsolated(entity: TPersistence): boolean {
    return "tenantId" in entity && typeof (entity as any).tenantId === "string";
  }

  /**
   * 检查是否为租户隔离的领域实体
   * @private
   */
  private isTenantIsolatedDomain(entity: TDomain): boolean {
    return "tenantId" in entity && (entity as any).tenantId instanceof TenantId;
  }

  /**
   * 映射嵌套聚合到领域实体
   * @description 处理领域实体中的嵌套聚合根和内部实体
   * @private
   */
  private mapNestedAggregatesToDomain(
    persistence: TPersistence,
    domainData: Partial<TDomain>,
    nestedMappings: NestedMappingConfig[],
  ): void {
    for (const mapping of nestedMappings) {
      const sourceValue = (persistence as Record<string, unknown>)[
        mapping.targetField
      ];

      if (sourceValue === undefined || sourceValue === null) {
        continue;
      }

      if (mapping.serializeAsJson) {
        // 如果嵌套实体序列化为 JSON，需要反序列化并递归映射
        try {
          const nestedData =
            typeof sourceValue === "string"
              ? JSON.parse(sourceValue)
              : sourceValue;

          if (mapping.nestedMapper) {
            // 使用嵌套映射器进行递归映射
            const mapper = mapping.nestedMapper as IEntityMapper<any, any>;
            (domainData as Record<string, unknown>)[mapping.sourceField] =
              mapper.toDomain(nestedData);
          } else {
            // 直接赋值（假设类型兼容）
            (domainData as Record<string, unknown>)[mapping.sourceField] =
              nestedData;
          }
        } catch {
          // JSON 解析失败，跳过
          continue;
        }
      } else if (mapping.storeAsReference) {
        // 如果嵌套实体存储为引用 ID，需要根据业务逻辑加载
        // 这里只存储 ID，实际加载由应用层处理
        (domainData as Record<string, unknown>)[mapping.sourceField] =
          sourceValue;
      } else {
        // 直接递归映射（假设嵌套实体在同一对象中）
        if (mapping.nestedMapper) {
          const mapper = mapping.nestedMapper as IEntityMapper<any, any>;
          (domainData as Record<string, unknown>)[mapping.sourceField] =
            mapper.toDomain(sourceValue);
        } else {
          (domainData as Record<string, unknown>)[mapping.sourceField] =
            sourceValue;
        }
      }
    }
  }

  /**
   * 映射嵌套聚合到持久化实体
   * @description 处理领域实体中的嵌套聚合根和内部实体
   * @private
   */
  private mapNestedAggregatesToPersistence(
    domain: TDomain,
    persistenceData: Partial<TPersistence>,
    nestedMappings: NestedMappingConfig[],
  ): void {
    for (const mapping of nestedMappings) {
      try {
        const sourceValue = (domain as Record<string, unknown>)[
          mapping.sourceField
        ];

        if (sourceValue === undefined || sourceValue === null) {
          continue;
        }

        if (mapping.serializeAsJson) {
          // 将嵌套实体序列化为 JSON
          if (mapping.nestedMapper) {
            const mapper = mapping.nestedMapper as IEntityMapper<any, any>;
            const persistedNested = mapper.toPersistence(sourceValue);
            (persistenceData as Record<string, unknown>)[mapping.targetField] =
              JSON.stringify(persistedNested);
          } else {
            (persistenceData as Record<string, unknown>)[mapping.targetField] =
              JSON.stringify(sourceValue);
          }
        } else if (mapping.storeAsReference) {
          // 将嵌套实体存储为引用 ID
          if (
            sourceValue &&
            typeof sourceValue === "object" &&
            "id" in sourceValue
          ) {
            const id = (sourceValue as { id: unknown }).id;
            if (id instanceof EntityId) {
              (persistenceData as Record<string, unknown>)[
                mapping.targetField
              ] = id.value;
            }
          }
        } else {
          // 直接递归映射
          if (mapping.nestedMapper) {
            const mapper = mapping.nestedMapper as IEntityMapper<any, any>;
            (persistenceData as Record<string, unknown>)[mapping.targetField] =
              mapper.toPersistence(sourceValue);
          } else {
            (persistenceData as Record<string, unknown>)[mapping.targetField] =
              sourceValue;
          }
        }
      } catch {
        // 映射失败，跳过此嵌套字段
        continue;
      }
    }
  }
}
