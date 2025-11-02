/**
 * @fileoverview 实体映射配置
 * @description 定义实体映射器的配置接口，支持自动映射和手动配置覆盖
 */

/**
 * 字段映射规则
 * @description 定义单个字段的映射规则
 */
export interface FieldMappingRule {
  /** 源字段名（领域实体中的字段名） */
  sourceField: string;
  /** 目标字段名（持久化实体中的字段名） */
  targetField: string;
  /** 字段转换函数，将源值转换为目标值 */
  transform?: (value: unknown) => unknown;
  /** 反向转换函数，将目标值转换为源值 */
  reverseTransform?: (value: unknown) => unknown;
  /** 是否忽略此字段（不进行映射） */
  ignore?: boolean;
}

/**
 * 嵌套聚合映射配置
 * @description 定义嵌套聚合根或内部实体的映射规则
 */
export interface NestedMappingConfig {
  /** 源字段名（领域实体中的嵌套字段） */
  sourceField: string;
  /** 目标字段名（持久化实体中的字段名） */
  targetField: string;
  /** 嵌套实体的映射器实例（递归映射） */
  nestedMapper?: unknown; // 使用 unknown 避免循环依赖，实际使用时需要传入 IEntityMapper 实例
  /** 是否将嵌套实体序列化为 JSON */
  serializeAsJson?: boolean;
  /** 是否将嵌套实体存储为引用 ID */
  storeAsReference?: boolean;
}

/**
 * 实体映射配置
 * @description 定义领域实体和持久化实体之间的完整映射配置
 * @template TDomain 领域实体类型
 * @template TPersistence 持久化实体类型
 */
export interface MappingConfig<TDomain, TPersistence> {
  /** 是否启用自动映射（默认 true） */
  autoMap?: boolean;
  /** 手动字段映射规则（覆盖自动映射） */
  fieldMappings?: FieldMappingRule[];
  /** 嵌套聚合映射配置 */
  nestedMappings?: NestedMappingConfig[];
  /** 创建领域实体的构造函数或工厂函数 */
  domainEntityFactory?: (data: Partial<TDomain>) => TDomain;
  /** 创建持久化实体的构造函数或工厂函数 */
  persistenceEntityFactory?: (data: Partial<TPersistence>) => TPersistence;
  /** 验证函数：验证领域实体 */
  validateDomain?: (entity: TDomain) => boolean;
  /** 验证函数：验证持久化实体 */
  validatePersistence?: (entity: TPersistence) => boolean;
}
